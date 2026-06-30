import { Request, Response } from "express";
import { IOrder, Order } from "../models/order.model";
import { Product } from "../models/product.model";

const SHIPPING_FLAT = 0; // free for v1; adjust later

export async function createOrder(req: Request, res: Response) {
  const { items, shippingAddress, paymentMethod } = req.body as {
    items: { product: string; qty: number }[];
    shippingAddress: IOrder['shippingAddress'];
    paymentMethod?: "COD" | "STRIPE";
  };

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
    paymentMethod: paymentMethod ?? "COD",
    itemsPrice,
    shippingPrice: SHIPPING_FLAT,
    totalPrice,
  });

  res.status(201).json(order);
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
  // Only the owner (or an admin) may view it.
  if (order.user.toString() !== req.user!.id && !req.user!.isAdmin) {
    res.status(403);
    throw new Error("Not allowed");
  }
  res.json(order);
}

// GET /api/orders  (admin) — every order, newest first, with buyer info
export async function listAllOrders(_req: Request, res: Response) {
  const orders = await Order.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(orders);
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