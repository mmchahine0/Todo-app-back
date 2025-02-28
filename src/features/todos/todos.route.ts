import { Router } from "express";
import {
  getTodoByUserId,
  createTodo,
  updateTodo,
  deleteTodo,
  addCollaborator,
  addComment,
  getTodoComments,
  getUserNotifications,
  markNotificationAsRead,
} from "./todos.controller";
import { protect } from "../../middleware/authMiddleware";
import {
  createTodoValidation,
  updateTodoValidation,
  paginationValidation,
  collaboratorValidation,
  commentValidation,
} from "./todos.validation";
import { apiLimiter } from "../../utils/rateLimiter";

const router = Router();

// Apply API rate limiter to all Todos routes
router.use("/todos", apiLimiter);

// Main Todo routes
router.get("/todos", protect, paginationValidation(), getTodoByUserId);
router.post("/todos", protect, createTodoValidation(), createTodo);
router.put("/todos/:id", protect, updateTodoValidation(), updateTodo);
router.delete("/todos/:id", protect, deleteTodo);

// Collaboration routes
router.post("/todos/:id/collaborators", protect, collaboratorValidation(), addCollaborator);

// Comments routes
router.get("/todos/:id/comments", protect, getTodoComments);
router.post("/todos/:id/comments", protect, commentValidation(), addComment);

// Notification routes
router.get("/notifications", protect, getUserNotifications);
router.put("/notifications/:id/read", protect, markNotificationAsRead);

export default router;