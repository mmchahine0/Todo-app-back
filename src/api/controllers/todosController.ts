import { Request, Response, NextFunction } from "express";
import prisma from "../../database/prismaClient";
import { JwtPayload } from "jsonwebtoken";
import { errorHandler } from "../../utils/error";
// import redisClient from "../../utils/redis";

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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;
    const status = req.query.status as string | undefined;

    if (page < 1 || limit < 1) {
      next(errorHandler(400, "Invalid pagination parameters"));
      return;
    }

    // // Generate cache key
    // const cacheKey = redisClient.generateTodosCacheKey(
    //   userId,
    //   page,
    //   limit,
    //   status
    // );

    // // Try to get data from cache first
    // const cachedData = await redisClient.get(cacheKey);
    // if (cachedData) {
    //   res.json(cachedData);
    //   return;
    // }

    // If not in cache, fetch from database
    const skip = (page - 1) * limit;
    const whereClause: any = {
      userId: String(userId),
    };

    if (status === "completed") {
      whereClause.completed = true;
    } else if (status === "active") {
      whereClause.completed = false;
    }

    const [totalTodos, todos] = await Promise.all([
      prisma.todo.count({
        where: whereClause,
      }),
      prisma.todo.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit + 1,
      }),
    ]);

    const hasMore = todos.length > limit;
    const actualTodos = hasMore ? todos.slice(0, limit) : todos;

    const response = {
      statusCode: 200,
      message: "Todos retrieved successfully",
      data: actualTodos,
      pagination: {
        nextPage: hasMore ? page + 1 : null,
        totalItems: totalTodos,
      },
    };

    // Cache the response
    // await redisClient.set(cacheKey, response);

    res.json(response);
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

    // await redisClient.clearCache();

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

    const updateData: {
      title?: string;
      content?: string;
      completed?: boolean;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (completed !== undefined) updateData.completed = completed;

    if (Object.keys(updateData).length === 0) {
      next(errorHandler(400, "No valid fields provided for update"));
      return;
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: String(id) },
      data: updateData,
    });

    // await redisClient.clearCache();

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

    // await redisClient.clearCache();

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
