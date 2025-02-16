import { Router } from "express";
import {
  signUp,
  signIn,
  refreshAccessToken,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  resendVerificationCode,
} from "./auth.controller";
import {
  signupValidation,
  signinValidation,
  verifyEmailValidation,
  resetPasswordValidation,
  requestPasswordResetValidation,
  resendCodeValidation,
} from "./auth.validation";
import {
  authLimiter,
  refreshTokenLimiter,
  emailVerificationLimiter,
  passwordResetRequestLimiter,
} from "../../utils/rateLimiter";

const router = Router();

// Apply rate limiting to auth endpoints
router.use("/auth/signin", authLimiter);
router.use("/auth/signup", authLimiter);
router.use("/auth/refresh", refreshTokenLimiter);
router.use("/auth/verify-email", emailVerificationLimiter);
router.use("/auth/resend-code", emailVerificationLimiter);
router.use("/auth/forgot-password", passwordResetRequestLimiter);
router.use("/auth/reset-password", passwordResetRequestLimiter);

// Routes
router.post("/auth/signup", signupValidation(), signUp);
router.post("/auth/signin", signinValidation(), signIn);
router.post("/auth/refresh", refreshAccessToken);
router.post("/auth/verify-email", verifyEmailValidation(), verifyEmail);
router.post(
  "/auth/resend-code",
  resendCodeValidation(),
  resendVerificationCode
);
router.post(
  "/auth/forgot-password",
  requestPasswordResetValidation(),
  requestPasswordReset
);
router.post("/auth/reset-password", resetPasswordValidation(), resetPassword);

export default router;
