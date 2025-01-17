import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import connectDB from "./database";
import authRoutes from "./api/routes/authRoutes";
import todoRoutes from "./api/routes/todosRoutes";
import errorMiddleware from "../src/middleware/errorMiddleware";
import userRoutes from "./api/routes/userRoutes";

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
    ],
    credentials: true,
  })
);
connectDB();

// Routes
app.use("/api/v1", todoRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", authRoutes);

// Error handling middleware
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
