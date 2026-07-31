import { Router } from "express";
import {
  getSiteSettings,
  updateSiteSettings,
} from "../controllers/siteSettings.controller";
import { protect } from "../middleware/protect";
import { isAdmin } from "../middleware/isAdmin";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/", getSiteSettings);
router.put(
  "/",
  protect,
  isAdmin,
  upload.fields([{ name: "logo", maxCount: 1 }]),
  updateSiteSettings
);

export default router;
