import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "../../utils/error";

const prisma = new PrismaClient();

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
    });

    if (!user || user.role !== "ADMIN") {
      next(errorHandler(403, "Access denied: Admin privileges required"));
      return;
    }

    next();
  } catch (error) {
    next(errorHandler(500, "Failed to verify admin status"));
  }
};
