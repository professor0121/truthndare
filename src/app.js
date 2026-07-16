import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

// Configure Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 150, // Limit each IP to 150 requests per windowMs
  message: {
    status: 429,
    message: "Too many requests from this IP, please try again after 15 minutes."
  },
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15, // Stricter limit of 15 attempts for onboarding and auth endpoints
  message: {
    status: 429,
    message: "Too many authentication attempts, please try again after 15 minutes."
  },
  standardHeaders: "draft-7",
  legacyHeaders: false
});

// Global Middlewares
app.use(compression());
app.use(morgan("dev"));

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
import questionRouter from "./modules/question/question.routes.js";
import friendRouter from "./modules/friend/friend.routes.js";
import leaderboardRouter from "./modules/leaderboard/leaderboard.routes.js";
import moderationRouter from "./modules/moderation/moderation.routes.js";
import notificationRouter from "./modules/notification/notification.routes.js";

// Declare Routes with Rate Limiters
app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/rooms", apiLimiter, roomRouter);
app.use("/api/v1/questions", apiLimiter, questionRouter);
app.use("/api/v1/friends", apiLimiter, friendRouter);
app.use("/api/v1/leaderboard", apiLimiter, leaderboardRouter);
app.use("/api/v1/moderation", apiLimiter, moderationRouter);
app.use("/api/v1/notifications", apiLimiter, notificationRouter);

// Base Route Healthcheck
app.get("/healthcheck", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Centralized Error Handling Middleware (MUST be declared after all other routes & middlewares)
app.use(errorMiddleware);

export { app };
