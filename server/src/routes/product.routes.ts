import { Router } from "express";
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { protect } from "../middleware/protect";
import { isAdmin } from "../middleware/isAdmin";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/", listProducts);
router.get("/:slug", getProductBySlug);
router.post("/", protect, isAdmin, upload.array("images", 5), createProduct);
router.put("/:id", protect, isAdmin, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, isAdmin, deleteProduct);

export default router;



