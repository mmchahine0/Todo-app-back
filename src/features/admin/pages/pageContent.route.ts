import { Router } from "express";
import { protect } from "../../../middleware/authMiddleware";
import { isAdmin } from "../../../middleware/adminMiddleware";
import { getContent, updateContent } from "./pageContent.controller";

const router = Router();

router.get("/pages/:pageId/content", getContent);
router.put(
  "/admin/pages/:pageId/content/:section",
  protect,
  isAdmin,
  updateContent
);

export default router;
