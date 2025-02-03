import { Router } from "express";
import { protect } from "../../middleware/authMiddleware";
import { isAdmin } from "../../middleware/adminMiddleware";
import {
  getAllPages,
  createPage,
  updatePage,
  deletePage,
  getPublishedPages,
} from "../controllers/dynamicPagesController";

const router = Router();

// Public routes
router.get("/pages/published", getPublishedPages);
router.get("/pages", getAllPages);

// Admin routes
router.use("/admin/pages", protect, isAdmin);
router.post("/admin/pages", createPage);
router.put("/admin/pages/:id", updatePage);
router.delete("/admin/pages/:id", deletePage);

export default router;