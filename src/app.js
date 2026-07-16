import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// Import Routes
import authRouter from "./modules/auth/auth.routes.js";
import roomRouter from "./modules/room/room.routes.js";

// Declare Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/rooms", roomRouter);

// Base Route Healthcheck
app.get("/healthcheck", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Centralized Error Handling Middleware (MUST be declared after all other routes & middlewares)
app.use(errorMiddleware);

export { app };
