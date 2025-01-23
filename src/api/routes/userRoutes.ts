import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
} from "../controllers/userController";
import { protect, checkSuspension } from "../../middleware/authMiddleware";
import { apiLimiter } from "../../utils/rateLimiter";
import { validateProfileUpdate } from "../validators/userValidators";

const router = Router();

// Apply API rate limiter to all user routes
router.use("/user", apiLimiter);

// Routes
router.get("/user/profile", protect, checkSuspension, getUserProfile);
router.put(
  "/user/profile",
  protect,
  checkSuspension,
  validateProfileUpdate,
  updateUserProfile
);
router.delete("/user/profile", protect, checkSuspension, deleteUserAccount);
export default router;
