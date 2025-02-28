import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import prisma from '../database/prismaClient';
import jwt from 'jsonwebtoken';

class SocketService {
  private io: SocketServer;

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
      }
    });

    this.setupSocketAuth();
    this.setupEventHandlers();
  }

  private setupSocketAuth() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
        
        // Store user information in socket
        socket.data.userId = decoded.userId;
        
        // Register this connection in database
        await prisma.connection.create({
          data: {
            socketId: socket.id,
            userId: decoded.userId,
          }
        });

        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      console.log(`User connected: ${socket.data.userId} (Socket ID: ${socket.id})`);
      
      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          await prisma.connection.deleteMany({
            where: { socketId: socket.id }
          });
          console.log(`User disconnected: ${socket.data.userId}`);
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });

      // Join rooms for todos the user is collaborating on
      try {
        const userTodos = await prisma.todo.findMany({
          where: { userId: socket.data.userId }
        });
        
        const collaborations = await prisma.todoCollaborator.findMany({
          where: { userId: socket.data.userId }
        });
        
        // Join socket rooms for all todos the user owns or collaborates on
        const allTodoIds = [
          ...userTodos.map(todo => todo.id),
          ...collaborations.map(collab => collab.todoId)
        ];
        
        allTodoIds.forEach(todoId => {
          socket.join(`todo:${todoId}`);
        });
      } catch (error) {
        console.error('Error setting up user rooms:', error);
      }
    });
  }

  // Emit updates to all clients watching a specific todo
  public emitTodoUpdate(todoId: string, data: any) {
    this.io.to(`todo:${todoId}`).emit('todo:updated', data);
  }

  // Emit todo creation to all connected clients
  public emitTodoCreated(data: any) {
    this.io.emit('todo:created', data);
  }

  // Emit todo deletion to all clients watching that todo
  public emitTodoDeleted(todoId: string) {
    this.io.to(`todo:${todoId}`).emit('todo:deleted', { id: todoId });
  }

  public getIo(){
    if (!this.io){
        throw new Error('Socket service io not initialized');
    }
    return this.io
  }
  // Create and send notification
  public async sendNotification(userId: string, message: string, todoId?: string) {
    try {
      const notification = await prisma.notification.create({
        data: {
          message,
          userId,
          todoId
        }
      });

      // Find all socket connections for this user
      const connections = await prisma.connection.findMany({
        where: { userId }
      });

      // Emit to all user's connections
      connections.forEach(connection => {
        this.io.to(connection.socketId).emit('notification', notification);
      });

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  
}

let socketService: SocketService;

export const initSocketService = (server: Server) => {
  socketService = new SocketService(server);
  return socketService;
};

export const getSocketService = () => {
  if (!socketService) {
    throw new Error('Socket service not initialized');
  }
  return socketService;
};

export const getSocketServiceIo = () => {
    if (!socketService) {
      throw new Error('Socket service not initialized');
    }
    return socketService.getIo();
};