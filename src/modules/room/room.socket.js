import { RoomService } from "./room.service.js";
import { cleanMessage } from "../../utils/moderation.js";

const registerRoomHandlers = (io, socket) => {
  // 1. Join Socket Session for a Room
  socket.on("join_room_session", async ({ roomCode }) => {
    try {
      if (!roomCode) {
        return socket.emit("error", { message: "Room code is required." });
      }

      const roomCodeUpper = roomCode.toUpperCase();
      const room = await RoomService.findByCode(roomCodeUpper);

      if (!room) {
        return socket.emit("error", { message: "Room not found or already finished." });
      }

      // Check if the user is actually added to this room in the database
      const isMember = room.players.some((p) => p.userId === socket.user._id.toString());
      if (!isMember) {
        return socket.emit("error", { message: "You are not a member of this room." });
      }

      const roomChannel = `room_${roomCodeUpper}`;
      socket.join(roomChannel);
      socket.activeRoomCode = roomCodeUpper; // store on socket instance for disconnect handling

      // Set user's presence to online in the DB
      const updatedRoom = await RoomService.updatePlayerPresence(roomCodeUpper, socket.user._id, true);

      if (updatedRoom) {
        // Sync full room data back to the client that just joined
        socket.emit("room_sync", updatedRoom);

        // Broadcast to other members in the room that this user is online
        socket.to(roomChannel).emit("player_presence_update", {
          userId: socket.user._id,
          username: socket.user.username,
          isOnline: true,
          players: updatedRoom.players
        });
        
        console.log(`📡 User ${socket.user.username} joined real-time channel for room: ${roomCodeUpper}`);
      }
    } catch (error) {
      socket.emit("error", { message: error.message || "Failed to join room socket session." });
    }
  });

  // 2. Leave Socket Session (Explicit Leave)
  socket.on("leave_room_session", async ({ roomCode }) => {
    if (!roomCode) return;
    const roomCodeUpper = roomCode.toUpperCase();
    const roomChannel = `room_${roomCodeUpper}`;

    socket.leave(roomChannel);
    socket.activeRoomCode = null;
    console.log(`📡 User ${socket.user.username} explicitly left real-time channel for room: ${roomCodeUpper}`);
  });

  // 3. Handle Unexpected Disconnection
  socket.on("disconnect", async () => {
    if (socket.activeRoomCode) {
      const roomCode = socket.activeRoomCode;
      const roomChannel = `room_${roomCode}`;

      // Update presence to offline in DB
      const updatedRoom = await RoomService.updatePlayerPresence(roomCode, socket.user._id, false);

      if (updatedRoom) {
        // Notify other room members that this user went offline
        io.to(roomChannel).emit("player_presence_update", {
          userId: socket.user._id,
          username: socket.user.username,
          isOnline: false,
          players: updatedRoom.players
        });
        
        console.log(`📡 User ${socket.user.username} went offline in room: ${roomCode}`);
      }
    }
  });

  // 4. Send Chat Message
  socket.on("send_message", async ({ roomCode, message }) => {
    try {
      if (!roomCode || !message) return;
      const roomCodeUpper = roomCode.toUpperCase();
      const roomChannel = `room_${roomCodeUpper}`;

      // Moderate chat message content
      const cleanedMessage = cleanMessage(message);

      // Broadcast cleaned message to the room channel
      io.to(roomChannel).emit("chat_message", {
        sender: {
          userId: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar
        },
        message: cleanedMessage,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit("error", { message: "Failed to broadcast message." });
    }
  });

  // 5. Send Emoji Reaction
  socket.on("send_emoji", async ({ roomCode, emoji }) => {
    try {
      if (!roomCode || !emoji) return;
      const roomCodeUpper = roomCode.toUpperCase();
      const roomChannel = `room_${roomCodeUpper}`;

      // Broadcast emoji reaction to the room channel
      io.to(roomChannel).emit("emoji_reaction", {
        sender: {
          userId: socket.user._id,
          username: socket.user.username
        },
        emoji,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit("error", { message: "Failed to broadcast emoji." });
    }
  });
};

export { registerRoomHandlers };
