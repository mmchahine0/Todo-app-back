import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../utils/error";
import { JwtPayload } from "jsonwebtoken";


const getRole = (req: Request): string => {
    const user = req.user as JwtPayload;
    if (!user) {
      throw new Error("User not found in token");
    }
    return user?.role;
};
  
export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role = getRole(req);
    if (!role || role !== "ADMIN") {
      next(errorHandler(403, "Access denied: Admin privileges required"));
      return;
    }

    next();
  } catch (error) {
    next(errorHandler(500, "Failed to verify admin status"));
  }
};
