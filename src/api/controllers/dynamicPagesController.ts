// src/controllers/dynamicPagesController.ts
import { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "../../utils/error";
import { JwtPayload } from "jsonwebtoken";
import redisClient from "../../utils/redis";

const prisma = new PrismaClient();

export const getAllPages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cacheKey = 'dynamic_pages_all';
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      res.json(cachedData);
      return;
    }

    const pages = await prisma.dynamicPage.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const responseData = {
      statusCode: 200,
      message: "Pages retrieved successfully",
      data: pages,
    };

    await redisClient.set(cacheKey, responseData);
    res.json(responseData);
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to retrieve pages: ${error.message}`)
        : errorHandler(500, "Failed to retrieve pages")
    );
  }
};

export const createPage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, path, content } = req.body;
    const user = req.user as JwtPayload;

    if (!user?.userId) {
      next(errorHandler(401, "User ID is required"));
      return;
    }

    // Check if path already exists
    const existingPage = await prisma.dynamicPage.findUnique({
      where: { path },
    });

    if (existingPage) {
      next(errorHandler(400, "Path already exists"));
      return;
    }

    const formattedPath = path.startsWith('/') ? path : `/${path}`;

    const page = await prisma.dynamicPage.create({
      data: {
        title,
        path: formattedPath,
        content,
        userId: user.userId,
        isPublished: false,
      },
    });

    // Invalidate cache
    await redisClient.del('dynamic_pages_all');

    res.status(201).json({
      statusCode: 201,
      message: "Page created successfully",
      data: page,
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to create page: ${error.message}`)
        : errorHandler(500, "Failed to create page")
    );
  }
};

export const updatePage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, path, content, isPublished } = req.body;

    // Check if new path already exists (if path is being updated)
    if (path) {
      const existingPage = await prisma.dynamicPage.findFirst({
        where: {
          path,
          NOT: {
            id,
          },
        },
      });

      if (existingPage) {
        next(errorHandler(400, "Path already exists"));
        return;
      }
    }

    const page = await prisma.dynamicPage.update({
      where: { id },
      data: {
        title,
        path,
        content,
        isPublished,
      },
    });

    // Invalidate cache
    await redisClient.del('dynamic_pages_all');

    res.json({
      statusCode: 200,
      message: "Page updated successfully",
      data: page,
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to update page: ${error.message}`)
        : errorHandler(500, "Failed to update page")
    );
  }
};

export const deletePage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.dynamicPage.delete({
      where: { id },
    });

    // Invalidate cache
    await redisClient.del('dynamic_pages_all');

    res.json({
      statusCode: 200,
      message: "Page deleted successfully",
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to delete page: ${error.message}`)
        : errorHandler(500, "Failed to delete page")
    );
  }
};

export const getPublishedPages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cacheKey = 'dynamic_pages_published';
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      res.json(cachedData);
      return;
    }

    const pages = await prisma.dynamicPage.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const responseData = {
      statusCode: 200,
      message: "Published pages retrieved successfully",
      data: pages,
    };

    await redisClient.set(cacheKey, responseData);
    res.json(responseData);
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to retrieve published pages: ${error.message}`)
        : errorHandler(500, "Failed to retrieve published pages")
    );
  }
};