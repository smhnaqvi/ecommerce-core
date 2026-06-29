import { Router } from "express";
import { protect } from "../middleware/protect";
import { createOrder, getMyOrders, getOrderById } from "../controllers/order.controller";

const router = Router();

router.use(protect); // every order route requires login
router.post("/", createOrder);
router.get("/mine", getMyOrders);
router.get("/:id", getOrderById);

export default router;