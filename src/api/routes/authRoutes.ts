import { Router } from "express";
import {
  signUp,
  signIn,
  refreshAccessToken,
} from "../controllers/authController";
import {
  signupValidation,
  signinValidation,
} from "../validators/authValidator";
import { authLimiter, refreshTokenLimiter } from "../../utils/rateLimiter";

const router = Router();

// Apply stricter rate limiting to auth endpoints
router.use("/auth/signin", authLimiter);
router.use("/auth/signup", authLimiter);
router.use("/auth/refresh", refreshTokenLimiter);

router.post("/auth/signup", signupValidation(), signUp);
router.post("/auth/signin", signinValidation(), signIn);
router.post("/auth/refresh", refreshAccessToken);

export default router;
