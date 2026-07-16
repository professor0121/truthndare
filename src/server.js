import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { app } from "./app.js";
import { initSocket } from "./config/socket.js";

// Load environment variables as early as possible
dotenv.config({
  path: "./.env"
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB (Strict constraint: If MongoDB fails, we crash)
    await connectDB();

    // 2. Connect to Redis (Graceful: If Redis fails, we log it but still run the server)
    await connectRedis();

    // Create HTTP server wrapping the Express app instance
    const server = http.createServer(app);

    // Initialize Socket.io real-time engine
    initSocket(server);

    // 3. Start Server listener
    server.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`👉 Health check URL: http://localhost:${PORT}/healthcheck`);
    });
  } catch (error) {
    console.error("CRITICAL: Server initialization failed:", error);
    process.exit(1);
  }
};

startServer();
