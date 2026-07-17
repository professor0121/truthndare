import { RoomService } from "./room.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const createRoom = asyncHandler(async (req, res) => {
  const { maxPlayers, visibility } = req.body;
  const room = await RoomService.createRoom(req.user, { maxPlayers, visibility });

  return res
    .status(201)
    .json(new ApiResponse(201, room, "Room created successfully."));
});

const joinRoom = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const room = await RoomService.joinRoom(req.user, code);

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Joined room successfully."));
});

const leaveRoom = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const room = await RoomService.leaveRoom(req.user._id, code);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        room || {},
        room ? "Left room successfully." : "Left room. Room has been closed because it is now empty."
      )
    );
});

const getRoomDetails = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const room = await RoomService.findByCode(code);

  if (!room) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "Room not found."));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room details retrieved."));
});

const getPublicLobbies = asyncHandler(async (req, res) => {
  const lobbies = await RoomService.listPublicLobbies();

  return res
    .status(200)
    .json(new ApiResponse(200, lobbies, "Public lobbies list retrieved."));
});

const getActiveRoom = asyncHandler(async (req, res) => {
  const room = await RoomService.findActiveRoomByUserId(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, room || null, "Active room retrieved successfully."));
});

export {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomDetails,
  getPublicLobbies,
  getActiveRoom
};
