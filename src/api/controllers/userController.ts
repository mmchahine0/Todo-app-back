import { Request, Response, NextFunction } from "express";
import prisma from "../../database/prismaClient";
import { JwtPayload } from "jsonwebtoken";
import { errorHandler } from "../../utils/error";
import bcrypt from "bcryptjs";
import redisClient from "../../utils/redis";

const getUserId = (req: Request): string => {
  const user = req.user as JwtPayload;
  if (!user?.userId) {
    throw new Error("User ID not found in token");
  }
  return user.userId;
};

// Helper function to generate user cache key
const generateUserCacheKey = (userId: string): string => {
  return `user:${userId}:profile`;
};

// Get user profile
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const cacheKey = generateUserCacheKey(userId);

    // Try to get from cache
    const cachedUser = await redisClient.get(cacheKey);
    if (cachedUser) {
      res.json({
        statusCode: 200,
        message: "User profile retrieved successfully",
        data: cachedUser,
      });
      return;
    }

    // If not in cache, get from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      next(errorHandler(404, "User not found"));
      return;
    }

    // Cache the user data
    await redisClient.set(cacheKey, user);

    res.json({
      statusCode: 200,
      message: "User profile retrieved successfully",
      data: user,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "User ID not found in token"
    ) {
      next(errorHandler(401, "Unauthorized - User ID not found"));
      return;
    }
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to fetch user profile: ${error.message}`)
        : errorHandler(500, "Failed to fetch user profile")
    );
  }
};

// Update user profile
export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { name, email, currentPassword, newPassword } = req.body;

    // Prepare update data
    const updateData: {
      name?: string;
      email?: string;
      password?: string;
    } = {};

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      next(errorHandler(404, "User not found"));
      return;
    }

    // If email is being updated, check if it's already taken
    if (email && email !== user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        next(errorHandler(400, "Email already in use"));
        return;
      }
      updateData.email = email;
    }

    // If name is provided, update it
    if (name) {
      updateData.name = name;
    }

    // If password is being updated, verify current password
    if (newPassword) {
      if (!currentPassword) {
        next(
          errorHandler(400, "Current password is required to update password")
        );
        return;
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        next(errorHandler(400, "Current password is incorrect"));
        return;
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      next(errorHandler(400, "No valid fields provided for update"));
      return;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Invalidate cache
    await redisClient.clearCache();

    res.json({
      statusCode: 200,
      message: "User profile updated successfully",
      data: updatedUser,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "User ID not found in token"
    ) {
      next(errorHandler(401, "Unauthorized - User ID not found"));
      return;
    }
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to update user profile: ${error.message}`)
        : errorHandler(500, "Failed to update user profile")
    );
  }
};

// Delete user account
export const deleteUserAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { password } = req.body;

    if (!password) {
      next(errorHandler(400, "Password is required to delete account"));
      return;
    }

    // Check if user exists and verify password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      next(errorHandler(404, "User not found"));
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      next(errorHandler(400, "Invalid password"));
      return;
    }

    // Delete user and related todos
    await prisma.$transaction([
      prisma.todo.deleteMany({
        where: { userId },
      }),
      prisma.user.delete({
        where: { id: userId },
      }),
    ]);

    // Clear user cache
    await redisClient.clearCache();

    res.json({
      statusCode: 200,
      message: "User account deleted successfully",
      data: null,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "User ID not found in token"
    ) {
      next(errorHandler(401, "Unauthorized - User ID not found"));
      return;
    }
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to delete user account: ${error.message}`)
        : errorHandler(500, "Failed to delete user account")
    );
  }
};
