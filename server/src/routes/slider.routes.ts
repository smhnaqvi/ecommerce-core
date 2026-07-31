import { Router } from "express";
import {
  listSliders,
  listAllSliders,
  getSlider,
  createSlider,
  updateSlider,
  deleteSlider,
} from "../controllers/slider.controller";
import { protect } from "../middleware/protect";
import { isAdmin } from "../middleware/isAdmin";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/", listSliders);
router.get("/admin", protect, isAdmin, listAllSliders);
router.get("/:id", getSlider);
router.post("/", protect, isAdmin, upload.single("image"), createSlider);
router.put("/:id", protect, isAdmin, upload.single("image"), updateSlider);
router.delete("/:id", protect, isAdmin, deleteSlider);

export default router;
