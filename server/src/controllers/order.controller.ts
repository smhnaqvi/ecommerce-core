import { Request, Response } from "express";
import { Types } from "mongoose";
import { IOrder, Order } from "../models/order.model";
import { Product } from "../models/product.model";

const SHIPPING_FLAT = 0; // free for v1; adjust later

// Caps on the public guest endpoint, so a scripted request can't create
// an order for 10,000 units.
const MAX_GUEST_ITEMS = 10;
const MAX_GUEST_QTY = 20;

export async function createOrder(req: Request, res: Response) {
  const { items, shippingAddress, paymentMethod } = req.body as {
    items: { product: string; qty: number }[];
    shippingAddress: IOrder['shippingAddress'];
    paymentMethod?: "COD" | "STRIPE";
  };

  if (!["COD", "STRIPE"].includes(paymentMethod as string)) {
    res.status(400);
    throw new Error("Invalid payment method");
  }

  if (!items?.length) {
    res.status(400);
    throw new Error("Cart is empty");
  }


  // Build line items from live product data.
  const lineItems = await Promise.all(
    items.map(async ({ product, qty }) => {
      const p = await Product.findById(product);
      if (!p || !p.isActive) {
        res.status(404);
        throw new Error(`Product not available: ${product}`);
      }
      if (qty < 1) {
        res.status(400);
        throw new Error("Invalid quantity");
      }
      return {
        product: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0],
        qty,
      };
    })
  );

  const itemsPrice = lineItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalPrice = itemsPrice + SHIPPING_FLAT;

  const order = await Order.create({
    user: req.user!.id,
    items: lineItems,
    shippingAddress,
    paymentMethod: paymentMethod,
    itemsPrice,
    shippingPrice: SHIPPING_FLAT,
    totalPrice,
    status: paymentMethod === "STRIPE" ? "awaiting_payment" : "pending",
  });

  res.status(201).json(order);
}

// POST /api/orders/guest  (public) — COD checkout from a landing page.
// No account, no cart, no login: the form posts straight here.
export async function createGuestOrder(req: Request, res: Response) {
  const { items, shippingAddress, source, email, website } = req.body as {
    items: { product: string; qty: number }[];
    shippingAddress: IOrder["shippingAddress"];
    source?: string;
    email?: string;
    website?: string; // honeypot — real users never see this field
  };

  // A filled honeypot means a bot. Answer 201 so it doesn't learn anything.
  if (website) {
    res.status(201).json({ ok: true });
    return;
  }

  if (!items?.length) {
    res.status(400);
    throw new Error("No items in order");
  }

  if (items.length > MAX_GUEST_ITEMS) {
    res.status(400);
    throw new Error("Too many items");
  }

  const { fullName, phone, address, city } = shippingAddress ?? {};
  if (!fullName?.trim() || !phone?.trim() || !address?.trim() || !city?.trim()) {
    res.status(400);
    throw new Error("Name, phone, address and city are required");
  }

  // Digits only, so "+93 70 123 4567" and "0701234567" both pass.
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    res.status(400);
    throw new Error("Please enter a valid phone number");
  }

  // Prices always come from the database, never from the request body.
  const lineItems = await Promise.all(
    items.map(async ({ product, qty }) => {
      if (!Types.ObjectId.isValid(product)) {
        res.status(400);
        throw new Error("Invalid product");
      }
      const p = await Product.findById(product);
      if (!p || !p.isActive) {
        res.status(404);
        throw new Error("Product not available");
      }
      const quantity = Number(qty) || 1;
      if (quantity < 1 || quantity > MAX_GUEST_QTY) {
        res.status(400);
        throw new Error("Invalid quantity");
      }
      return {
        product: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0],
        qty: quantity,
      };
    })
  );

  const itemsPrice = lineItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalPrice = itemsPrice + SHIPPING_FLAT;

  const order = await Order.create({
    isGuest: true,
    source: source?.trim() || "landing",
    guestEmail: email?.trim() || undefined,
    items: lineItems,
    shippingAddress,
    paymentMethod: "COD",
    itemsPrice,
    shippingPrice: SHIPPING_FLAT,
    totalPrice,
  });

  // Return only what the thank-you screen needs — not the whole document.
  res.status(201).json({
    orderId: order.id,
    totalPrice: order.totalPrice,
    status: order.status,
  });
}

export async function getMyOrders(req: Request, res: Response) {
  const orders = await Order.find({ user: req.user!.id }).sort({ createdAt: -1 });
  res.json(orders);
}

export async function getOrderById(req: Request, res: Response) {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  // Only the owner (or an admin) may view it. Guest orders have no owner,
  // so they stay admin-only.
  if (order.user?.toString() !== req.user!.id && !req.user!.isAdmin) {
    res.status(403);
    throw new Error("Not allowed");
  }
  res.json(order);
}

// GET /api/orders  (admin) — every order, newest first, with buyer info.
// `?source=breezr-neck-fan` narrows it to one landing; no query = all orders.
export async function listAllOrders(req: Request, res: Response) {
  const { source } = req.query as { source?: string };
  const filter = source ? { source } : {};

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(orders);
}

// GET /api/orders/sources  (admin) — distinct source values, for the
// admin filter dropdown.
export async function listOrderSources(_req: Request, res: Response) {
  const sources = await Order.distinct("source");
  res.json(sources.filter(Boolean).sort());
}

// PATCH /api/orders/:id/status  (admin)
export async function updateOrderStatus(req: Request, res: Response) {
  const { status } = req.body as { status: IOrder["status"] };
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  order.status = status;
  if (status === "delivered" && !order.isPaid) {
    order.isPaid = true; // COD considered paid on delivery
    order.paidAt = new Date();
  }
  await order.save();
  res.json(order);
}