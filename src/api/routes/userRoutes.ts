import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
} from "../controllers/userController";
import { protect } from "../../middleware/authMiddleware";
import { apiLimiter } from "../../utils/rateLimiter";
import { validateProfileUpdate } from "../validators/userValidators";

const router = Router();

// Apply API rate limiter to all user routes
router.use("/user", apiLimiter);

// Routes
router.get("/user/profile", protect, getUserProfile);
router.put("/user/profile", protect, validateProfileUpdate, updateUserProfile);
router.delete("/user/profile", protect, deleteUserAccount);

export default router;
