import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import connectDB from "./database";
import authRoutes from "./api/routes/authRoutes";
import todoRoutes from "./api/routes/todosRoutes";
import errorMiddleware from "../src/middleware/errorMiddleware";
import userRoutes from "./api/routes/userRoutes";
import adminRoutes from "./api/routes/adminRoutes";
import contentRoutes from "./api/routes/contentRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 3500;

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:2500",
      "http://localhost:5173",
      "http://localhost:3500",
      "https://todo-1njtqu236-izcool337-gmailcoms-projects.vercel.app",
      "https://todo-app-iota-plum-65.vercel.app",
      "*",
    ],
    credentials: true,
  })
);
connectDB();

// Routes
app.use("/api/v1", todoRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", contentRoutes);

// Error handling middleware
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
