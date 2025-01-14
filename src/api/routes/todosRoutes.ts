import { Router } from "express";
import {
  getTodoByUserId,
  createTodo,
  updateTodo,
  deleteTodo,
} from "../controllers/todosController";
import { protect } from "../../middleware/authMiddleware"
import {
  createTodoValidation,
  updateTodoValidation,
} from "../validators/todoValidation";
import { apiLimiter } from "../../utils/rateLimiter";

const router = Router();

// Apply API rate limiter to all Todos routes
router.use("/todos", apiLimiter);

router.get("/todos", protect, getTodoByUserId);
router.post("/todos", protect, createTodoValidation(), createTodo);
router.put("/todos/:id", protect, updateTodoValidation(), updateTodo);
router.delete("/todos/:id", protect, deleteTodo);

export default router;
