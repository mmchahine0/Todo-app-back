// contentController.ts
import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../utils/error";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const content = await prisma.contentSection.findMany();
    const formattedContent = content.reduce((acc, item) => {
      acc[item.type] = item.content;
      return acc;
    }, {} as Record<string, any>);

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
    await prisma.contentSection.upsert({
      where: { type: section },
      update: { content },
      create: {
        type: section,
        content,
      },
    });

    res.json({
      statusCode: 200,
      message: "Content updated successfully",
    });
  } catch (error) {
    console.error("Update content error:", error);
    next(errorHandler(500, "Failed to update content"));
  }
};
