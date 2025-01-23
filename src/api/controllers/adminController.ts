import { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "../../utils/error";

const prisma = new PrismaClient();
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1) {
      next(errorHandler(400, "Invalid pagination parameters"));
      return;
    }

    const skip = (page - 1) * limit;

    const [totalUsers, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          suspended: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit + 1,
      }),
    ]);

    const hasMore = users.length > limit;
    const actualUsers = hasMore ? users.slice(0, limit) : users;

    res.json({
      statusCode: 200,
      message: "Users retrieved successfully",
      data: actualUsers,
      pagination: {
        nextPage: hasMore ? page + 1 : null,
        totalItems: totalUsers,
      },
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to retrieve users: ${error.message}`)
        : errorHandler(500, "Failed to retrieve users")
    );
  }
};

export const makeAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: "ADMIN" },
    });

    res.json({
      statusCode: 200,
      message: "User role updated to admin",
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to update user role: ${error.message}`)
        : errorHandler(500, "Failed to update user role")
    );
  }
};

export const revokeAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: "USER" },
    });

    res.json({
      statusCode: 200,
      message: "Admin role revoked",
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to revoke admin role: ${error.message}`)
        : errorHandler(500, "Failed to revoke admin role")
    );
  }
};

export const suspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { suspended: true },
    });

    res.json({
      statusCode: 200,
      message: "User suspended",
      data: {
        id: user.id,
        email: user.email,
        suspended: user.suspended,
      },
    });
  } catch (error: unknown) {
    next(errorHandler(500, "Failed to suspend user"));
  }
};

export const unsuspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { suspended: false },
    });

    res.json({
      statusCode: 200,
      message: "User unsuspended",
      data: {
        id: user.id,
        email: user.email,
        suspended: user.suspended,
      },
    });
  } catch (error: unknown) {
    next(errorHandler(500, "Failed to unsuspend user"));
  }
};
