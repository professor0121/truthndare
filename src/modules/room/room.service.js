import { Room } from "./room.model.js";
import { ApiError } from "../../utils/ApiError.js";

// Local in-memory store for rooms fallback in mock mode
const mockRooms = [];

const createMockRoomInstance = (roomData) => {
  const room = {
    _id: roomData._id || Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11),
    code: roomData.code,
    hostId: roomData.hostId,
    maxPlayers: roomData.maxPlayers || 8,
    visibility: roomData.visibility || "private",
    status: roomData.status || "lobby",
    players: roomData.players || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return {
    ...room,
    toObject: function () {
      const copy = { ...this };
      delete copy.toObject;
      delete copy.save;
      return copy;
    },
    save: async function () {
      const idx = mockRooms.findIndex((r) => r._id === this._id);
      if (idx !== -1) {
        this.updatedAt = new Date();
        mockRooms[idx] = this;
      }
      return this;
    }
  };
};

class RoomService {
  /**
   * Generates a unique 6-character uppercase alphanumeric room code.
   */
  static async generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789"; // O and 0 omitted to prevent human confusion
    let isUnique = false;
    let code = "";

    while (!isUnique) {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existingRoom = await this.findByCode(code);
      if (!existingRoom) {
        isUnique = true;
      }
    }
    return code;
  }

  static async findByCode(code) {
    if (!code) return null;
    const normalizedCode = code.toUpperCase();

    if (process.env.USE_MOCK_DB === "true") {
      const room = mockRooms.find((r) => r.code === normalizedCode && r.status !== "finished");
      return room ? room : null;
    }

    return await Room.findOne({ code: normalizedCode, status: { $ne: "finished" } });
  }

  static async findActiveRoomByUserId(userId) {
    if (!userId) return null;
    const userIdStr = userId.toString();

    if (process.env.USE_MOCK_DB === "true") {
      const room = mockRooms.find(
        (r) => r.status !== "finished" && r.players.some((p) => p.userId === userIdStr)
      );
      return room ? room : null;
    }

    return await Room.findOne({
      status: { $ne: "finished" },
      "players.userId": userIdStr
    });
  }

  static async createRoom(hostUser, options = {}) {
    const { maxPlayers = 8, visibility = "private" } = options;
    const userIdStr = hostUser._id.toString();

    // Check if user is already in an active room
    const alreadyInRoom = await this.findActiveRoomByUserId(userIdStr);
    if (alreadyInRoom) {
      throw new ApiError(400, `You are already inside an active room: ${alreadyInRoom.code}. Leave it first.`);
    }

    const roomCode = await this.generateRoomCode();
    const hostPlayer = {
      userId: userIdStr,
      username: hostUser.username,
      avatar: hostUser.avatar,
      score: 0,
      isHost: true,
      isOnline: true,
      joinedAt: new Date()
    };

    if (process.env.USE_MOCK_DB === "true") {
      const newRoom = createMockRoomInstance({
        code: roomCode,
        hostId: userIdStr,
        maxPlayers,
        visibility,
        status: "lobby",
        players: [hostPlayer]
      });
      mockRooms.push(newRoom);
      return newRoom;
    }

    return await Room.create({
      code: roomCode,
      hostId: userIdStr,
      maxPlayers,
      visibility,
      status: "lobby",
      players: [hostPlayer]
    });
  }

  static async joinRoom(user, code) {
    const userIdStr = user._id.toString();
    const room = await this.findByCode(code);

    if (!room) {
      throw new ApiError(404, "Room not found or game has already finished.");
    }

    if (room.status !== "lobby") {
      throw new ApiError(400, "Cannot join this room. Game is already in progress.");
    }

    // Check if player is already inside this specific room
    const existingPlayer = room.players.find((p) => p.userId === userIdStr);
    if (existingPlayer) {
      // If they were offline, set online
      if (!existingPlayer.isOnline) {
        existingPlayer.isOnline = true;
        await room.save();
      }
      return room;
    }

    // Check if user is inside ANY OTHER active room
    const otherRoom = await this.findActiveRoomByUserId(userIdStr);
    if (otherRoom) {
      throw new ApiError(400, `You are already in another active room: ${otherRoom.code}. Leave it first.`);
    }

    // Check player capacity limit
    if (room.players.length >= room.maxPlayers) {
      throw new ApiError(400, "Room is full.");
    }

    // Append user to players array
    const newPlayer = {
      userId: userIdStr,
      username: user.username,
      avatar: user.avatar,
      score: 0,
      isHost: false,
      isOnline: true,
      joinedAt: new Date()
    };

    room.players.push(newPlayer);
    await room.save();
    return room;
  }

  static async leaveRoom(userId, code) {
    const userIdStr = userId.toString();
    const room = await this.findByCode(code);

    if (!room) {
      throw new ApiError(404, "Room not found.");
    }

    const playerIndex = room.players.findIndex((p) => p.userId === userIdStr);
    if (playerIndex === -1) {
      throw new ApiError(400, "You are not a player in this room.");
    }

    const leavingPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);

    // If room is now empty, set status to finished (or delete it in mock DB)
    if (room.players.length === 0) {
      room.status = "finished";
      await room.save();
      
      // Clean up mock store
      if (process.env.USE_MOCK_DB === "true") {
        const idx = mockRooms.findIndex((r) => r._id === room._id);
        if (idx !== -1) mockRooms.splice(idx, 1);
      }
      return null;
    }

    // If host leaves, promote another player
    if (leavingPlayer.isHost) {
      const nextHost = room.players[0];
      nextHost.isHost = true;
      room.hostId = nextHost.userId;
    }

    await room.save();
    return room;
  }

  static async listPublicLobbies() {
    if (process.env.USE_MOCK_DB === "true") {
      return mockRooms.filter((r) => r.visibility === "public" && r.status === "lobby");
    }
    return await Room.find({ visibility: "public", status: "lobby" });
  }

  /**
   * Updates player connection presence status.
   */
  static async updatePlayerPresence(code, userId, isOnline) {
    const room = await this.findByCode(code);
    if (!room) return null;

    const player = room.players.find((p) => p.userId === userId.toString());
    if (player) {
      player.isOnline = isOnline;
      await room.save();
    }
    return room;
  }
}

export { RoomService };
export { mockRooms }; // Exported for test verification
