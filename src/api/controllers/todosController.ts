import { Request, Response, NextFunction } from "express";
import prisma from "../../database/prismaClient";
import { JwtPayload } from "jsonwebtoken";
import { errorHandler } from "../../utils/error";

const getUserId = (req: Request): string => {
  const user = req.user as JwtPayload;
  if (!user?.userId) {
    throw new Error("User ID not found in token");
  }
  return user.userId;
};

export const getTodoByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const Todos = await prisma.todo.findMany({
      where: {
        userId: String(userId),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      statusCode: 200,
      message: "Todos retrieved successfully",
      data: Todos,
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
        ? errorHandler(500, `Failed to fetch Todo: ${error.message}`)
        : errorHandler(500, "Failed to fetch Todo")
    );
  }
};

export const createTodo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { title, content } = req.body;

    if (!title || !content) {
      next(errorHandler(400, "Title and content are required"));
      return;
    }

    const newTodo = await prisma.todo.create({
      data: {
        title,
        content,
        completed: false,
        userId: String(userId),
      },
    });

    res.status(201).json({
      statusCode: 201,
      message: "Todo created successfully",
      data: newTodo,
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
        ? errorHandler(500, `Failed to create Todo: ${error.message}`)
        : errorHandler(500, "Failed to create Todo")
    );
  }
};
export const updateTodo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, content, completed } = req.body;

    // Check if the todo exists and belongs to the user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: String(id),
        userId: String(userId),
      },
    });

    if (!existingTodo) {
      next(errorHandler(404, "Todo not found or unauthorized"));
      return;
    }

    // Prepare update data using existing todo as fallback
    const updateData: {
      title?: string;
      content?: string;
      completed?: boolean;
    } = {};

    // Only include fields that are provided in the request
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (completed !== undefined) updateData.completed = completed;

    // If no fields to update, return early
    if (Object.keys(updateData).length === 0) {
      next(errorHandler(400, "No valid fields provided for update"));
      return;
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: String(id) },
      data: updateData,
    });

    res.json({
      statusCode: 200,
      message: "Todo updated successfully",
      data: updatedTodo,
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
        ? errorHandler(500, `Failed to update Todo: ${error.message}`)
        : errorHandler(500, "Failed to update Todo")
    );
  }
};
export const deleteTodo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const Todo = await prisma.todo.findFirst({
      where: {
        id: String(id),
        userId: String(userId),
      },
    });

    if (!Todo) {
      next(errorHandler(404, "Todo not found or unauthorized"));
      return;
    }

    await prisma.todo.delete({
      where: { id: String(id) },
    });

    res.status(200).json({
      statusCode: 200,
      message: "Todo deleted successfully",
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
        ? errorHandler(500, `Failed to delete Todo: ${error.message}`)
        : errorHandler(500, "Failed to delete Todo")
    );
  }
};
