import express from "express";
import { getRobotsTxt } from "../seo/controllers/robots.contoller";
const router = express.Router();

router.get("/robots.txt", getRobotsTxt);
export default router;
