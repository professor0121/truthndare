import { RoomService } from "./room.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getIO } from "../../config/socket.js";
import { startTurnTimer, stopTurnTimer } from "./room.timer.js";

const startGame = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const room = await RoomService.startGame(code, req.user._id);

  // Broadcast to all players in the room that the game has started
  const roomChannel = `room_${code.toUpperCase()}`;
  getIO().to(roomChannel).emit("game_started", room);

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Game started successfully."));
});

const spinBottle = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const room = await RoomService.spinBottle(code, req.user._id);

  // Broadcast to all players in the room the bottle spin result
  const roomChannel = `room_${code.toUpperCase()}`;
  getIO().to(roomChannel).emit("bottle_spun", room);

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Bottle spun successfully."));
});

const chooseType = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { type } = req.body;
  const room = await RoomService.chooseTruthOrDare(code, req.user._id, type);

  // Start turn timer (defaults to 30 seconds, configurable via env)
  const timerLimit = parseInt(process.env.TURN_TIMER_LIMIT) || 30;
  startTurnTimer(code, timerLimit);

  // Broadcast to all players in the room the selected choice and question details
  const roomChannel = `room_${code.toUpperCase()}`;
  getIO().to(roomChannel).emit("type_chosen", room);

  return res
    .status(200)
    .json(new ApiResponse(200, room, `Selected ${type} successfully.`));
});

const submitOutcome = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { outcome } = req.body;
  const room = await RoomService.submitTurnOutcome(code, req.user._id, outcome);

  // Stop active turn timer since outcome is submitted
  stopTurnTimer(code);

  // Broadcast to all players in the room the turn outcome results and score adjustments
  const roomChannel = `room_${code.toUpperCase()}`;
  getIO().to(roomChannel).emit("turn_result", room);

  return res
    .status(200)
    .json(new ApiResponse(200, room, `Turn outcome ${outcome} submitted successfully.`));
});

const endGame = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const room = await RoomService.endGame(code, req.user._id);

  // Stop timer in case it was running
  stopTurnTimer(code);

  // Broadcast to all players in the room that the game has ended
  const roomChannel = `room_${code.toUpperCase()}`;
  getIO().to(roomChannel).emit("game_finished", room);

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Game ended successfully."));
});

export {
  startGame,
  spinBottle,
  chooseType,
  submitOutcome,
  endGame
};
