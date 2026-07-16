import { createClient } from "redis";

let redisClient = null;

const connectRedis = async () => {
  if (process.env.USE_MOCK_DB === "true") {
    console.log("⚠️  Using Mock Redis Client (USE_MOCK_DB=true). Redis connection bypassed.");
    redisClient = {
      get: async (key) => null,
      set: async (key, val, options) => "OK",
      del: async (key) => 1,
      on: () => {}
    };
    return;
  }
  try {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = createClient({ url });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis client connecting...");
    });

    redisClient.on("ready", () => {
      console.log("Redis client connected successfully and ready!");
    });

    await redisClient.connect();
  } catch (error) {
    console.error("Redis connection FAILED: ", error);
    // Graceful degradation: we don't crash the server, just log.
  }
};

export { connectRedis, redisClient };
