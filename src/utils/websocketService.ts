import { Server as SocketServer } from "socket.io";
import { Server } from "http";
import prisma from "../database/prismaClient";
import jwt from "jsonwebtoken";

class SocketService {
  private io: SocketServer;

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST"],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ["websocket", "polling"],
      allowEIO3: true,
    });

    this.setupSocketAuth();
    this.setupEventHandlers();
  }

  private setupSocketAuth() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
          userId: string;
        };

        if (!decoded.userId) {
          return next(new Error("Invalid authentication token"));
        }

        socket.data.userId = decoded.userId;

        // Clean up any existing connections for this socket ID
        await prisma.connection.deleteMany({
          where: { socketId: socket.id },
        });

        // Register new connection
        await prisma.connection.create({
          data: {
            socketId: socket.id,
            userId: decoded.userId,
          },
        });

        next();
      } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", async (socket) => {
      console.log(
        `User connected: ${socket.data.userId} (Socket ID: ${socket.id})`
      );

      socket.on("join:todo", async (todoId: string) => {
        try {
          const canAccess = await this.verifyTodoAccess(
            todoId,
            socket.data.userId
          );
          if (canAccess) {
            socket.join(`todo:${todoId}`);
            console.log(
              `User ${socket.data.userId} joined todo room ${todoId}`
            );
          }
        } catch (error) {
          console.error("Error joining todo room:", error);
        }
      });

      socket.on("leave:todo", (todoId: string) => {
        socket.leave(`todo:${todoId}`);
        console.log(`User ${socket.data.userId} left todo room ${todoId}`);
      });

      socket.on("disconnect", async () => {
        try {
          await prisma.connection.deleteMany({
            where: { socketId: socket.id },
          });
          console.log(`User disconnected: ${socket.data.userId}`);
        } catch (error) {
          console.error("Error handling disconnect:", error);
        }
      });
    });
  }

  private async verifyTodoAccess(
    todoId: string,
    userId: string
  ): Promise<boolean> {
    const todo = await prisma.todo.findFirst({
      where: { id: todoId, userId },
    });

    if (todo) return true;

    const collaborator = await prisma.todoCollaborator.findFirst({
      where: { todoId, userId },
    });

    return !!collaborator;
  }

  public emitTodoUpdate(todoId: string, data: any) {
    this.io.to(`todo:${todoId}`).emit("todo:updated", data);
  }
  private async sendTodoToCollaborator(collaboratorId: string, todoData: any) {
    try {
      // Find all active connections for this collaborator
      const connections = await prisma.connection.findMany({
        where: { userId: collaboratorId },
      });

      // Send the todo directly to all of the collaborator's active connections
      connections.forEach((connection) => {
        this.io.to(connection.socketId).emit("todo:shared", {
          ...todoData,
          isCollaborator: true,
        });
      });
    } catch (error) {
      console.error("Error sending todo to collaborator:", error);
    }
  }
  public emitTodoCreated(data: any) {
    this.io.emit("todo:created", data);

    if (data.collaboratorId) {
      this.sendTodoToCollaborator(data.collaboratorId, data);
    }
  }

  public emitTodoDeleted(todoId: string) {
    this.io.to(`todo:${todoId}`).emit("todo:deleted", { id: todoId });
  }

  public async sendNotification(
    userId: string,
    message: string,
    todoId?: string
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          message,
          userId,
          todoId,
        },
      });

      const connections = await prisma.connection.findMany({
        where: { userId },
      });

      connections.forEach((connection) => {
        this.io.to(connection.socketId).emit("notification", notification);
      });

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  public getIo() {
    if (!this.io) {
      throw new Error("Socket.IO instance not initialized");
    }
    return this.io;
  }
}

let socketService: SocketService;

export const initSocketService = (server: Server) => {
  socketService = new SocketService(server);
  return socketService;
};

export const getSocketService = () => {
  if (!socketService) {
    throw new Error("Socket service not initialized");
  }
  return socketService;
};

export const getSocketServiceIo = () => {
  if (!socketService) {
    throw new Error("Socket service not initialized");
  }
  return socketService.getIo();
};
