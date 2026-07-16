import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { app } from "./app.js";

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

    // 3. Start Express server listener
    app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`👉 Health check URL: http://localhost:${PORT}/healthcheck`);
    });
  } catch (error) {
    console.error("CRITICAL: Server initialization failed:", error);
    process.exit(1);
  }
};

startServer();
