import { Router } from "express";
import { signUp, signIn, refreshAccessToken } from "./auth.controller";
import { signupValidation, signinValidation } from "./auth.validation";
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
