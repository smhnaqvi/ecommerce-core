import { Router } from "express";
import { protect } from "../middleware/protect";
import { createOrder, getMyOrders, getOrderById, listAllOrders, updateOrderStatus } from "../controllers/order.controller";
import { isAdmin } from "../middleware/isAdmin";

const router = Router();

router.use(protect);
router.post("/", createOrder);
router.get("/mine", getMyOrders);
router.get("/", isAdmin, listAllOrders);
router.patch("/:id/status", isAdmin, updateOrderStatus);
router.get("/:id", getOrderById);

export default router;