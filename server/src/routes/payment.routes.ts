import { Router } from "express";
import { protect } from "../middleware/protect";
import { createCheckoutSession } from "../controllers/payment.controller";

const router = Router();

// POST /api/payments/checkout-session
// Protected — user must be logged in to initiate payment
router.post("/checkout-session", protect, createCheckoutSession);

export default router;