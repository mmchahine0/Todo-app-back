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

const prisma = new PrismaClient();

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
      where: {
        email,
      },
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

    res.status(201).json({
      statusCode: 201,
      message: "User created",
      data: {
        name: user.name,
        id: user.id,
        email: user.email,
        role: user.role,
        suspended: user.suspended,
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
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      next(errorHandler(401, "Invalid credentials"));
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

    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 5 * 60 * 60 * 1000, // 5 hours
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
