import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../utils/error";
import { PrismaClient } from "@prisma/client";
import redisClient from "../../utils/redis";

const prisma = new PrismaClient();

type NavItem = {
  path: string;
  label: string;
  visibility?: string;
};

const checkPathExists = async (path: string): Promise<boolean> => {
  try {
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    
    const existingPage = await prisma.dynamicPage.findUnique({
      where: { path: formattedPath },
    });

    return !!existingPage;
  } catch (error) {
    console.error("Error checking path:", error);
    throw error;
  }
};

export const getContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cacheKey = redisClient.generateContentCacheKey();
    const cachedContent = await redisClient.get<Record<string, any>>(cacheKey);

    if (cachedContent) {
      res.json({
        statusCode: 200,
        message: "Content retrieved successfully (from cache)",
        data: cachedContent,
      });
      return;
    }

    const content = await prisma.contentSection.findMany();
    const formattedContent = content.reduce((acc, item) => {
      acc[item.type] = item.content;
      return acc;
    }, {} as Record<string, any>);

    await redisClient.set(cacheKey, formattedContent);

    res.json({
      statusCode: 200,
      message: "Content retrieved successfully",
      data: formattedContent,
    });
  } catch (error) {
    next(errorHandler(500, "Failed to retrieve content"));
  }
};

export const updateContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { section } = req.params;
  const content = req.body;

  try {
    // Validate paths for navigation items
    if (section === "navbar") {
      const navItems = Array.isArray(content) ? content : [content];
      for (const item of navItems) {
        if (item.path) {
          const pathExists = await checkPathExists(item.path);
          if (!pathExists) {
            next(errorHandler(400, `Path ${item.path} doesn't exist as a page`));
            return;
          }
        }
      }
    }

    // Validate features content
    if (section === "features") {
      if (!content.title || !Array.isArray(content.items)) {
        next(errorHandler(400, "Invalid features content structure"));
        return;
      }
    }

    // Validate statistics content
    if (section === "statistics") {
      if (!Array.isArray(content.items)) {
        next(errorHandler(400, "Invalid statistics content structure"));
        return;
      }
    }

    // Update or create the content section
    await prisma.contentSection.upsert({
      where: { type: section },
      update: { content },
      create: {
        type: section,
        content,
      },
    });

    await redisClient.clearCache();

    res.json({
      statusCode: 200,
      message: "Content updated successfully",
    });
  } catch (error) {
    console.error("Update content error:", error);
    next(errorHandler(500, "Failed to update content"));
  }
};