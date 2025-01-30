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

    // Get navbar content
    const navContent = await prisma.contentSection.findUnique({
      where: { type: "navbar" },
    });

    // Get dynamic page
    const existingPage = await prisma.dynamicPage.findUnique({
      where: { path: formattedPath },
    });
    // If no page exists for this path, return false
    if (existingPage == null) {
      return false;
    }

    // If navbar doesn't exist yet, but page exists, return true
    if (!navContent) {
      return true;
    }

    return true;
  } catch (error) {
    console.error("Error checking path in navbar:", error);
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

    // Cache the formatted content
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
    if (section === "navbar") {
      // If it's a single item being added
      if (content.path) {
        const canAddPath = await checkPathExists(content.path);

        if (!canAddPath) {
          next(errorHandler(400, "Path doesn't exist as a page"));
          return;
        }
      }

      // If it's an array of items
      else if (Array.isArray(content)) {
        // Check any new items being added
        const currentNav = await prisma.contentSection.findUnique({
          where: { type: "navbar" },
        });
        const currentItems = (currentNav?.content as NavItem[]) || [];
        // Check each item
        for (const item of currentItems) {
          const canAddPath = await checkPathExists(item.path);
          if (!canAddPath) {
            next(
              errorHandler(400, `Path ${item.path} doesn't exist as a page`)
            );
            return;
          }
        }
      }
    }

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
