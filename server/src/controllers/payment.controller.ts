import { Request, Response } from "express";
import { stripe, CURRENCY, toMinorUnits } from "../config/stripe";
import { Order } from "../models/order.model";
import Stripe from "stripe";


export async function createCheckoutSession(
  req: Request,
  res: Response
) {
  const { orderId } = req.body as { orderId: string };

  if (!orderId) {
    res.status(400);
    throw new Error("orderId is required");
  }

  // Load order and verify ownership
  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.user.toString() !== req.user!._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to pay for this order");
  }

  if (order.paymentMethod !== "STRIPE") {
    res.status(400);
    throw new Error("This order is not a Stripe order");
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error("Order is already paid");
  }

  const clientUrl = process.env.CLIENT_URL;

  // Build line_items from snapshotted order items — never from client body
  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: CURRENCY,
      unit_amount: toMinorUnits(item.price),
      product_data: {
        name: item.name,
        ...(item.image ? { images: [item.image] } : {}),
      },
    },
    quantity: item.qty,
  }));

  // Create the Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    metadata: {
      orderId: order.id, // ← webhook uses this to find the order
    },
    success_url: `${clientUrl}/orders/${order.id}?paid=1`,
    cancel_url: `${clientUrl}/checkout?cancelled=1`,
    // Pre-fill customer email if available
    customer_email: req.user!.email,
  });

  res.json({ url: session.url });
}

export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    res.status(400).json({ message: "Missing stripe signature or webhook secret" });
    return;
  }

  let event: Stripe.Event;

  // Signature verification — req.body must be raw Buffer here
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).json({ message: "Invalid webhook signature" });
    return;
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.error("Webhook: no orderId in session metadata");
      res.status(400).json({ message: "Missing orderId in metadata" });
      return;
    }

    const order = await Order.findById(orderId);

    if (!order) {
      console.error(`Webhook: order ${orderId} not found`);
      res.status(404).json({ message: "Order not found" });
      return;
    }

    // Idempotency — Stripe retries webhooks, don't process twice
    if (order.isPaid) {
      console.log(`Webhook: order ${orderId} already paid, skipping`);
      res.status(200).json({ received: true });
      return;
    }

    // Mark as paid — only trusted signal
    order.isPaid = true;
    order.paidAt = new Date();
    order.status = "processing";

    // Store payment intent for future refund traceability
    if (session.payment_intent) {
      order.paymentResult = {
        id: session.payment_intent as string,
        status: "paid",
        updateTime: new Date().toISOString(),
      };
    }

    await order.save();
    console.log(`Webhook: order ${orderId} marked as paid`);
  }

  // Return 200 for all events — even ones we don't handle
  // Otherwise Stripe keeps retrying them
  res.status(200).json({ received: true });
}
