import { LeaderboardService } from "./leaderboard.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getGlobalLeaderboard = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const board = await LeaderboardService.getGlobalLeaderboard(limit || 10);

  return res
    .status(200)
    .json(new ApiResponse(200, board, "Global leaderboard retrieved successfully."));
});

const getRoomLeaderboard = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const board = await LeaderboardService.getRoomLeaderboard(code);

  return res
    .status(200)
    .json(new ApiResponse(200, board, "Room leaderboard retrieved successfully."));
});

export {
  getGlobalLeaderboard,
  getRoomLeaderboard
};
