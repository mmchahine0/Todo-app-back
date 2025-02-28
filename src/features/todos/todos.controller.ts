import { Request, Response, NextFunction } from "express";
import prisma from "../../database/prismaClient";
import { JwtPayload } from "jsonwebtoken";
import { errorHandler } from "../../utils/error";
import redisClient from "../../utils/redis";
import { getSocketService,getSocketServiceIo } from "../../utils/websocketService";

const getUserId = (req: Request): string => {
  const user = req.user as JwtPayload;
  if (!user?.userId) {
    throw new Error("User ID not found in token");
  }
  return user.userId;
};
const validateTodoAccess = async (todoId: string, userId: string): Promise<boolean> => {
  // Check if user is the owner
  const todo = await prisma.todo.findFirst({
    where: { id: todoId, userId },
  });
  
  if (todo) return true;
  
  // Check if user is a collaborator
  const collaborator = await prisma.todoCollaborator.findFirst({
    where: { todoId, userId },
  });
  
  return !!collaborator;
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
    const cacheKey = redisClient.generateTodosCacheKey(
      userId,
      page,
      limit,
      status
    );

    // Try to get data from cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      res.json(cachedData);
      return;
    }
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

    //Cache the response
    await redisClient.set(cacheKey, response);

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
    const { title, content, collaborators } = req.body;

    if (!title || !content) {
      next(errorHandler(400, "Title and content are required"));
      return;
    }

    // Create the todo
    const newTodo = await prisma.todo.create({
      data: {
        title,
        content,
        completed: false,
        userId: String(userId),
      },
    });

    // Add collaborators if provided
    if (collaborators && Array.isArray(collaborators) && collaborators.length > 0) {
      const collaboratorRecords = collaborators.map(collaboratorId => ({
        todoId: newTodo.id,
        userId: collaboratorId,
      }));

      await prisma.todoCollaborator.createMany({
        data: collaboratorRecords,
      });

      // Send notifications to collaborators
      const socketService = getSocketService();
      for (const collaboratorId of collaborators) {
        await socketService.sendNotification(
          collaboratorId,
          `You were added as a collaborator on "${title}"`,
          newTodo.id
        );
      }
    }

    // Emit via WebSocket
    getSocketService().emitTodoCreated(newTodo);

    // Clear cache
    await redisClient.clearCache();

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

    // Check if user has access to this todo
    const hasAccess = await validateTodoAccess(id, userId);
    if (!hasAccess) {
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

    // Get the todo owner to notify them if they're not the one making the update
    if (updatedTodo.userId !== userId) {
      const socketService = getSocketService();
      await socketService.sendNotification(
        updatedTodo.userId,
        `A collaborator updated your todo "${updatedTodo.title}"`,
        updatedTodo.id
      );
    }

    // Emit WebSocket event for real-time updates
    getSocketService().emitTodoUpdate(id, updatedTodo);

    // Clear cache
    await redisClient.clearCache();

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

    const todo = await prisma.todo.findFirst({
      where: {
        id: String(id),
        userId: String(userId),
      },
    });

    if (!todo) {
      next(errorHandler(404, "Todo not found or unauthorized"));
      return;
    }

    // Get collaborators to notify them
    const collaborators = await prisma.todoCollaborator.findMany({
      where: { todoId: id }
    });

    // Delete the todo
    await prisma.todo.delete({
      where: { id: String(id) },
    });

    // Notify collaborators
    const socketService = getSocketService();
    for (const collaborator of collaborators) {
      await socketService.sendNotification(
        collaborator.userId,
        `Todo "${todo.title}" has been deleted`,
        undefined
      );
    }

    // Emit WebSocket event
    socketService.emitTodoDeleted(id);

    // Clear cache
    await redisClient.clearCache();

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

export const addCollaborator = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { collaboratorId } = req.body;

    // Check if todo exists and user is the owner
    const todo = await prisma.todo.findFirst({
      where: {
        id: String(id),
        userId: String(userId),
      },
    });

    if (!todo) {
      next(errorHandler(404, "Todo not found or unauthorized"));
      return;
    }

    // Check if collaborator exists
    const collaborator = await prisma.user.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator) {
      next(errorHandler(404, "Collaborator not found"));
      return;
    }

    // Check if already a collaborator
    const existingCollaboration = await prisma.todoCollaborator.findFirst({
      where: {
        todoId: id,
        userId: collaboratorId,
      },
    });

    if (existingCollaboration) {
      next(errorHandler(400, "User is already a collaborator"));
      return;
    }

    // Add collaborator
    const collaboration = await prisma.todoCollaborator.create({
      data: {
        todoId: id,
        userId: collaboratorId,
      },
    });

    // Notify the collaborator
    const socketService = getSocketService();
    await socketService.sendNotification(
      collaboratorId,
      `You were added as a collaborator on "${todo.title}"`,
      id
    );

    res.status(201).json({
      statusCode: 201,
      message: "Collaborator added successfully",
      data: collaboration,
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to add collaborator: ${error.message}`)
        : errorHandler(500, "Failed to add collaborator")
    );
  }
};

// New endpoint to add a comment to a todo
export const addComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { content } = req.body;

    // Check if user has access to this todo
    const hasAccess = await validateTodoAccess(id, userId);
    if (!hasAccess) {
      next(errorHandler(404, "Todo not found or unauthorized"));
      return;
    }

    // Add comment
    const comment = await prisma.todoComment.create({
      data: {
        todoId: id,
        userId,
        content,
      },
    });

    // Get the todo to use its title in notification
    const todo = await prisma.todo.findUnique({
      where: { id },
    });

    if (todo && todo.userId !== userId) {
      // Notify the todo owner if they're not the one commenting
      const socketService = getSocketService();
      await socketService.sendNotification(
        todo.userId,
        `New comment on your todo "${todo.title}"`,
        id
      );
    }

    // Emit a socket event with the new comment
    getSocketServiceIo().to(`todo:${id}`).emit('todo:comment', comment);

    res.status(201).json({
      statusCode: 201,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to add comment: ${error.message}`)
        : errorHandler(500, "Failed to add comment")
    );
  }
};

// New endpoint to get comments for a todo
export const getTodoComments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    // Check if user has access to this todo
    const hasAccess = await validateTodoAccess(id, userId);
    if (!hasAccess) {
      next(errorHandler(404, "Todo not found or unauthorized"));
      return;
    }

    // Get comments
    const comments = await prisma.todoComment.findMany({
      where: { todoId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      statusCode: 200,
      message: "Comments retrieved successfully",
      data: comments,
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to get comments: ${error.message}`)
        : errorHandler(500, "Failed to get comments")
    );
  }
};

// New endpoint to get user notifications
export const getUserNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      statusCode: 200,
      message: "Notifications retrieved successfully",
      data: notifications,
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to get notifications: ${error.message}`)
        : errorHandler(500, "Failed to get notifications")
    );
  }
};

// New endpoint to mark notifications as read
export const markNotificationAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      next(errorHandler(404, "Notification not found"));
      return;
    }

    // Mark as read
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({
      statusCode: 200,
      message: "Notification marked as read",
      data: updatedNotification,
    });
  } catch (error: unknown) {
    next(
      error instanceof Error
        ? errorHandler(500, `Failed to update notification: ${error.message}`)
        : errorHandler(500, "Failed to update notification")
    );
  }
};
