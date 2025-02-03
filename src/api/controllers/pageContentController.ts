import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../utils/error";
import { PrismaClient } from "@prisma/client";
import redisClient from "../../utils/redis";

const prisma = new PrismaClient();

export const getContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pageId } = req.params;
    const cacheKey = redisClient.generateContentCacheKey(pageId);
    const cachedContent = await redisClient.get<Record<string, any>>(cacheKey);

    if (cachedContent) {
      res.json({
        statusCode: 200,
        message: "Content retrieved successfully (from cache)",
        data: cachedContent,
      });
      return;
    }

    const content = await prisma.pageContent.findMany({
      where: {
        pageId
      }
    });

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
  const { pageId, section } = req.params;
  const content = req.body;

  try {
    // Check if the page exists
    const page = await prisma.dynamicPage.findUnique({
      where: { id: pageId }
    });

    if (!page) {
      next(errorHandler(404, "Page not found"));
      return;
    }

    await prisma.pageContent.upsert({
      where: {
        pageId_type: {
          pageId,
          type: section
        }
      },
      update: { content },
      create: {
        pageId,
        type: section,
        content
      },
    });

    // Clear cache for this page
    await redisClient.del(redisClient.generateContentCacheKey(pageId));

    res.json({
      statusCode: 200,
      message: "Content updated successfully",
    });
  } catch (error) {
    console.error("Update content error:", error);
    next(errorHandler(500, "Failed to update content"));
  }
};