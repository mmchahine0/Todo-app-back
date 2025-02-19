import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import connectDB from "./database";
import authRoutes from "./features/auth/auth.route";
import todoRoutes from "./features/todos/todos.route";
import errorMiddleware from "../src/middleware/errorMiddleware";
import userRoutes from "./features/user/user.route";
import adminRoutes from "./features/admin/admin.route";
import pageContentRoutes from "./features/admin/pages/pageContent.route";
import contentRoutes from "./features/admin/content/content.route";
import dynamicpagesRoutes from "./features/admin/pages/dynamic/dynamicPages.route";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
app.set("trust proxy", 1);

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
connectDB();

// Routes
app.use("/api/v1", todoRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", pageContentRoutes);
app.use("/api/v1", contentRoutes);
app.use("/api/v1", dynamicpagesRoutes);

// Error handling middleware
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
