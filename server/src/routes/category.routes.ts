import { Router } from "express";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { protect } from "../middleware/protect";
import { isAdmin } from "../middleware/isAdmin";

const router = Router();

router.get("/", listCategories);
router.get("/:id", getCategory);
router.post("/", protect, isAdmin, createCategory);
router.put("/:id", protect, isAdmin, updateCategory);
router.delete("/:id", protect, isAdmin, deleteCategory);

export default router;