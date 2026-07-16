import { redisClient } from "../../config/redis.js";
import { User } from "../user/user.model.js";
import { RoomService } from "../room/room.service.js";
import { UserService } from "../user/user.service.js";
import { ApiError } from "../../utils/ApiError.js";

const REDIS_LEADERBOARD_KEY = "leaderboard:global";

class LeaderboardService {
  /**
   * Updates a user's score/XP inside Redis sorted set cache.
   */
  static async updateUserScore(userObj) {
    if (process.env.USE_MOCK_DB === "true" || !redisClient) return;

    try {
      // ZADD updates score for user.username in Redis Sorted Set
      await redisClient.zAdd(REDIS_LEADERBOARD_KEY, {
        score: userObj.xp || 0,
        value: userObj.username
      });
    } catch (error) {
      console.warn("Failed to update user score in Redis leaderboard cache:", error.message);
    }
  }

  /**
   * Fetches the global leaderboard. Uses Redis Sorted Sets, with Mongo DB fallback.
   */
  static async getGlobalLeaderboard(limit = 10) {
    const parsedLimit = parseInt(limit) || 10;

    // 1. If using mock DB or Redis is offline, query DB directly
    if (process.env.USE_MOCK_DB === "true" || !redisClient) {
      return await this.getLeaderboardFromDb(parsedLimit);
    }

    try {
      // 2. Fetch top ranking from Redis Sorted Set (REV: true gets highest scores first)
      const cachedLeaderboard = await redisClient.zRangeWithScores(
        REDIS_LEADERBOARD_KEY,
        0,
        parsedLimit - 1,
        { REV: true }
      );

      if (cachedLeaderboard && cachedLeaderboard.length > 0) {
        return cachedLeaderboard.map((item, index) => ({
          rank: index + 1,
          username: item.value,
          xp: item.score
        }));
      }

      // If cache is empty, populate from DB
      const dbLeaderboard = await this.getLeaderboardFromDb(parsedLimit);
      
      // Re-seed Redis asynchronously
      this.reseedRedisLeaderboard().catch((err) =>
        console.error("Async leaderboard seeding failed:", err.message)
      );

      return dbLeaderboard;
    } catch (error) {
      console.warn("Redis leaderboard retrieval failed, falling back to DB:", error.message);
      return await this.getLeaderboardFromDb(parsedLimit);
    }
  }

  static async getRoomLeaderboard(roomCode) {
    const room = await RoomService.findByCode(roomCode);
    if (!room) {
      throw new ApiError(404, "Room not found.");
    }

    // Sort players array by score descending
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    
    return sortedPlayers.map((p, index) => ({
      rank: index + 1,
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      isOnline: p.isOnline
    }));
  }

  static async getLeaderboardFromDb(limit) {
    try {
      const topUsers = await UserService.getTopUsersByXp(limit);
      return topUsers.map((u, index) => ({
        rank: index + 1,
        username: u.username,
        xp: u.xp,
        level: u.level,
        avatar: u.avatar
      }));
    } catch (error) {
      console.error("Failed to query leaderboard from DB:", error);
      return [];
    }
  }

  static async reseedRedisLeaderboard() {
    try {
      const allUsers = await User.find({}).select("username xp");
      for (const u of allUsers) {
        await redisClient.zAdd(REDIS_LEADERBOARD_KEY, {
          score: u.xp || 0,
          value: u.username
        });
      }
      console.log("🚀 Redis global leaderboard cache re-seeded successfully.");
    } catch (error) {
      console.error("Failed to reseed Redis leaderboard:", error.message);
    }
  }
}

export { LeaderboardService };
