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
    game: roomData.game || {
      status: "lobby",
      currentRound: 0,
      currentPlayerId: "",
      turnState: "selecting",
      selectedType: null,
      currentQuestion: { id: null, text: null, type: null },
      winnerId: null
    },
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

    if (room.status !== "lobby") {
      throw new ApiError(400, "Cannot join this room. Game is already in progress.");
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
      
      // Clear active turn timer for this closed room
      const { stopTurnTimer } = await import("./room.timer.js");
      stopTurnTimer(code);
      
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

  static async startGame(code, hostUserId) {
    const room = await this.findByCode(code);
    if (!room) {
      throw new ApiError(404, "Room not found.");
    }

    if (room.hostId !== hostUserId.toString()) {
      throw new ApiError(403, "Only the host can start the game.");
    }

    if (room.players.length < 2) {
      throw new ApiError(400, "At least 2 players are required to start the game.");
    }

    // Initialize game state
    room.status = "playing";
    room.game = {
      status: "playing",
      currentRound: 1,
      currentPlayerId: "",
      turnState: "selecting",
      selectedType: null,
      currentQuestion: { id: null, text: null, type: null },
      winnerId: null
    };

    // Reset scores
    room.players.forEach((p) => {
      p.score = 0;
    });

    await room.save();
    return room;
  }

  static async spinBottle(code, hostUserId) {
    const room = await this.findByCode(code);
    if (!room) {
      throw new ApiError(404, "Room not found.");
    }

    if (room.hostId !== hostUserId.toString()) {
      throw new ApiError(403, "Only the host can spin the bottle.");
    }

    if (room.game.status !== "playing") {
      throw new ApiError(400, "Game has not started or is already finished.");
    }

    if (room.game.turnState !== "selecting") {
      throw new ApiError(400, "Cannot spin the bottle. A turn is currently in progress.");
    }

    // Select a random player from players list
    const playersCount = room.players.length;
    const randomIndex = Math.floor(Math.random() * playersCount);
    const selectedPlayer = room.players[randomIndex];

    room.game.currentPlayerId = selectedPlayer.userId;
    room.game.turnState = "choosing_type";
    room.game.selectedType = null;
    room.game.currentQuestion = { id: null, text: null, type: null };

    await room.save();
    return room;
  }

  static async chooseTruthOrDare(code, userId, type) {
    const room = await this.findByCode(code);
    if (!room) {
      throw new ApiError(404, "Room not found.");
    }

    if (room.game.status !== "playing") {
      throw new ApiError(400, "Game is not in progress.");
    }

    if (room.game.currentPlayerId !== userId.toString()) {
      throw new ApiError(403, "It is not your turn to choose.");
    }

    if (room.game.turnState !== "choosing_type") {
      throw new ApiError(400, "You cannot choose Truth/Dare at this point in the game.");
    }

    if (type !== "truth" && type !== "dare") {
      throw new ApiError(400, "Invalid type. Must be 'truth' or 'dare'.");
    }

    const { QuestionService } = await import("../question/question.service.js");
    
    // Call QuestionService to generate an AI question (which falls back to catalog automatically if needed)
    const question = await QuestionService.generateAIQuestion(type, "medium", "funny");

    if (!question) {
      throw new ApiError(500, "Failed to retrieve a question for the turn.");
    }

    room.game.selectedType = type;
    room.game.currentQuestion = {
      id: question._id || question.id,
      text: question.text,
      type
    };
    room.game.turnState = "answering";

    await room.save();
    return room;
  }

  static async submitTurnOutcome(code, userId, outcome) {
    const room = await this.findByCode(code);
    if (!room) {
      throw new ApiError(404, "Room not found.");
    }

    if (room.game.status !== "playing") {
      throw new ApiError(400, "Game is not in progress.");
    }

    if (room.game.currentPlayerId !== userId.toString()) {
      throw new ApiError(403, "It is not your turn to submit.");
    }

    if (room.game.turnState !== "answering") {
      throw new ApiError(400, "Cannot submit turn outcome at this point in the game.");
    }

    if (outcome !== "completed" && outcome !== "skipped") {
      throw new ApiError(400, "Invalid outcome. Must be 'completed' or 'skipped'.");
    }

    // Award score if completed
    if (outcome === "completed") {
      const activePlayer = room.players.find((p) => p.userId === userId.toString());
      if (activePlayer) {
        activePlayer.score += 10;
      }
    }

    // Move to next turn
    room.game.currentRound += 1;
    room.game.turnState = "selecting";
    room.game.currentPlayerId = "";
    room.game.selectedType = null;
    room.game.currentQuestion = { id: null, text: null, type: null };

    await room.save();
    return room;
  }

  static async endGame(code, hostUserId) {
    const room = await this.findByCode(code);
    if (!room) {
      throw new ApiError(404, "Room not found.");
    }

    if (room.hostId !== hostUserId.toString()) {
      throw new ApiError(403, "Only the host can end the game.");
    }

    if (room.status !== "playing") {
      throw new ApiError(400, "Game is not currently active.");
    }

    // Determine winner
    let highestScore = -1;
    let winnerId = null;

    room.players.forEach((p) => {
      if (p.score > highestScore) {
        highestScore = p.score;
        winnerId = p.userId;
      }
    });

    room.status = "finished";
    room.game.status = "finished";
    room.game.winnerId = winnerId;

    await room.save();
    return room;
  }
}

export { RoomService };
export { mockRooms }; // Exported for test verification
