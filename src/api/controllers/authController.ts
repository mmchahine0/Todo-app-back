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
      where: {
        email: email,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      next(errorHandler(401, "Invalid credentials"));
      return;
    }

    const accessToken = generateAccessToken(user.id.toString());
    const refreshToken = generateRefreshToken(user.id.toString());

    res.json({
      statusCode: 200,
      message: "Sign in successful",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        accessToken,
        refreshToken,
      },
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to sign in: ${error.message}`)
        : errorHandler(500, "Failed to sign in")
    );
  }
};

export const refreshAccessToken = async (
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

  const { refreshToken } = req.body;

  if (!refreshToken) {
    next(errorHandler(400, "Refresh token is required"));
    return;
  }

  if (typeof refreshToken !== "string") {
    next(errorHandler(400, "Invalid refresh token format"));
    return;
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as jwt.JwtPayload;

    const newAccessToken = generateAccessToken(decoded.userId);

    res.json({
      statusCode: 200,
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      next(errorHandler(401, "Refresh token has expired"));
      return;
    }
    next(errorHandler(401, "Invalid refresh token"));
  }
};
