import { Router } from "express";
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { protect } from "../middleware/protect";
import { optionalAuth } from "../middleware/optionalAuth";
import { isAdmin } from "../middleware/isAdmin";
import { upload } from "../middleware/upload";

const router = Router();

// Public, but an admin session reveals unlisted products too.
router.get("/", optionalAuth, listProducts);
router.get("/:slug", optionalAuth, getProductBySlug);
router.post("/", protect, isAdmin, upload.array("images", 5), createProduct);
router.put("/:id", protect, isAdmin, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, isAdmin, deleteProduct);

export default router;



