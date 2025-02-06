import { Router } from "express";
import { protect } from "../../../middleware/authMiddleware";
import { isAdmin } from "../../../middleware/adminMiddleware";
import { getContent, updateContent } from "./content.controller";

const router = Router();

router.get("/content", getContent);
router.put("/admin/content/:section", protect, isAdmin, updateContent);

export default router;
