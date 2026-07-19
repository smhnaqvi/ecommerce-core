import { Router } from "express";
import { protect } from "../middleware/protect";
import { rateLimit } from "../middleware/rateLimit";
import {
  createGuestOrder,
  createOrder,
  getMyOrders,
  getOrderById,
  listAllOrders,
  listOrderSources,
  updateOrderStatus,
} from "../controllers/order.controller";
import { isAdmin } from "../middleware/isAdmin";

const router = Router();

// Public COD checkout for landing pages. MUST stay above `router.use(protect)`
// below — everything registered after it requires a logged-in user.
router.post(
  "/guest",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }),
  createGuestOrder
);

router.use(protect);
router.post("/", createOrder);
router.get("/mine", getMyOrders);
router.get("/sources", isAdmin, listOrderSources);
router.get("/", isAdmin, listAllOrders);
router.patch("/:id/status", isAdmin, updateOrderStatus);
router.get("/:id", getOrderById);

export default router;
