import { Router } from "express";
import { protect } from "../../middleware/authMiddleware";
import { isAdmin } from "../validators/adminValidator";
import { getContent, updateContent } from "../controllers/contentController";

const router = Router();

router.get("/content", getContent);
router.put("/admin/content/:section", protect, isAdmin, updateContent);

export default router;
