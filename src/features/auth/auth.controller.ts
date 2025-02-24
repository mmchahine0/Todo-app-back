import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "../../utils/error";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateToken";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { OTPService } from "../../emails/otp/otp";

const prisma = new PrismaClient();
const otpService = new OTPService();

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(
      errorHandler(
        400,
        errors
          .array()
          .map((err) => err.msg)
          .join(", ")
      )
    );
    return;
  }

  const { email, password, name } = req.body;

  try {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      next(errorHandler(400, "User already exists"));
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: "USER",
        password: hashedPassword,
      },
    });

    // Send verification email right after user creation
    try {
      await otpService.generateAndSendOTP(email, "VERIFICATION");
    } catch (emailError) {
      // If email fails, we'll log it but won't fail the signup
      console.error("Failed to send verification email:", emailError);
    }

    res.status(201).json({
      statusCode: 201,
      message:
        "User created successfully. Please check your email for verification.",
      data: {
        name: user.name,
        id: user.id,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to create user: ${error.message}`)
        : errorHandler(500, "Failed to create user")
    );
  }
};

export const signIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      next(errorHandler(401, "Invalid credentials"));
      return;
    }

    if (!user.isVerified) {
      next(
        errorHandler(403, "Email not verified. Please verify your email first.")
      );
      return;
    }

    if (user.suspended) {
      next(errorHandler(403, "Account suspended"));
      return;
    }

    const accessToken = generateAccessToken(
      user.id.toString(),
      user.role.toString(),
      user.suspended
    );
    const refreshToken = generateRefreshToken(
      user.id.toString(),
      user.role.toString(),
      user.suspended
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 5 * 60 * 60 * 1000,
    });

    res.json({
      statusCode: 200,
      message: "Sign in successful",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        suspended: user.suspended,
        accessToken,
      },
    });
  } catch (error) {
    next(errorHandler(500, "Failed to sign in"));
  }
};
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, code } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { verificationCode: true },
    });

    if (!user) {
      next(errorHandler(404, "User not found"));
      return;
    }

    if (user.isVerified) {
      next(errorHandler(400, "Email is already verified"));
      return;
    }

    if (
      !user.verificationCode ||
      user.verificationCode.code !== code ||
      user.verificationCode.expiresAt < new Date()
    ) {
      next(errorHandler(400, "Invalid or expired verification code"));
      return;
    }

    // Start a transaction to update user and delete verification code
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Delete the verification code
      await tx.verificationCode.delete({
        where: { userId: user.id },
      });
    });

    res.json({
      statusCode: 200,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verification error:", error);
    next(errorHandler(500, "Failed to verify email"));
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      await otpService.generateAndSendOTP(email, "PASSWORD_RESET");
    }

    // Return same response regardless of whether user exists
    res.json({
      statusCode: 200,
      message:
        "If your email is registered, you will receive a password reset code.",
    });
  } catch (error) {
    next(errorHandler(500, "Failed to process password reset request"));
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, code, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { passwordReset: true },
    });

    if (!user) {
      next(errorHandler(404, "User not found"));
      return;
    }

    if (
      !user.passwordReset ||
      user.passwordReset.code !== code ||
      user.passwordReset.expiresAt < new Date()
    ) {
      next(errorHandler(400, "Invalid or expired reset code"));
      return;
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      next(
        errorHandler(400, "New password cannot be the same as current password")
      );
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Start a transaction to update password and delete reset code
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      // Delete the password reset code
      await tx.passwordReset.delete({
        where: { userId: user.id },
      });
    });

    res.json({
      statusCode: 200,
      message: "Password reset successful",
    });
  } catch (error) {
    next(errorHandler(500, "Failed to reset password"));
  }
};
export const resendVerificationCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      res.json({
        statusCode: 200,
        message:
          "If your email is registered, a new verification code will be sent.",
      });
      return;
    }

    if (user.isVerified) {
      next(errorHandler(400, "Email is already verified"));
      return;
    }

    // Generate and send new OTP
    await otpService.generateAndSendOTP(email, "VERIFICATION");

    res.json({
      statusCode: 200,
      message:
        "If your email is registered, a new verification code will be sent.",
    });
  } catch (error) {
    next(errorHandler(500, "Failed to resend verification code"));
  }
};
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      next(errorHandler(401, "No refresh token"));
      return;
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as jwt.JwtPayload;

    const newAccessToken = generateAccessToken(
      decoded.userId,
      decoded.role,
      decoded.suspended
    );

    // Optionally: Rotate refresh token for added security
    const newRefreshToken = generateRefreshToken(
      decoded.userId,
      decoded.role,
      decoded.suspended
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 5 * 60 * 60 * 1000,
    });

    res.json({
      statusCode: 200,
      message: "Token refreshed",
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.clearCookie("refreshToken");
      next(errorHandler(401, "Refresh token expired"));
      return;
    }
    next(errorHandler(401, "Invalid refresh token"));
  }
};
