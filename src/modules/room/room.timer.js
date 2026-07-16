import { getIO } from "../../config/socket.js";
import { RoomService } from "./room.service.js";

// Active timers stored in memory: key = RoomCode, value = setInterval instance ID
const activeTimers = new Map();

/**
 * Starts a 1-second interval countdown for a room's active turn.
 */
const startTurnTimer = (roomCode, seconds = 30) => {
  const roomCodeUpper = roomCode.toUpperCase();
  const roomChannel = `room_${roomCodeUpper}`;

  // Clear any pre-existing timer for this room
  stopTurnTimer(roomCodeUpper);

  let secondsLeft = seconds;
  console.log(`⏱️ Timer: Starting ${secondsLeft}s countdown for room ${roomCodeUpper}`);

  // Broadcast initial tick
  getIO().to(roomChannel).emit("timer_tick", { secondsLeft });

  const intervalId = setInterval(async () => {
    secondsLeft -= 1;

    // Broadcast tick updates to the room
    getIO().to(roomChannel).emit("timer_tick", { secondsLeft });

    if (secondsLeft <= 0) {
      clearInterval(intervalId);
      activeTimers.delete(roomCodeUpper);
      console.log(`⏱️ Timer: Expired for room ${roomCodeUpper}. Processing auto-skip.`);

      try {
        const room = await RoomService.findByCode(roomCodeUpper);
        if (!room || room.game.status !== "playing") return;

        const activePlayerId = room.game.currentPlayerId;
        if (!activePlayerId) return;

        // Auto-skip the turn by submitting a "skipped" outcome
        const updatedRoom = await RoomService.submitTurnOutcome(roomCodeUpper, activePlayerId, "skipped");

        // Broadcast updates to clients
        getIO().to(roomChannel).emit("turn_result", updatedRoom);
        getIO().to(roomChannel).emit("timer_expired", { 
          message: "Turn skipped because time ran out!",
          currentPlayerId: activePlayerId
        });
      } catch (error) {
        console.error(`Error executing auto-skip on timer expiration for room ${roomCodeUpper}:`, error);
      }
    }
  }, 1000);

  activeTimers.set(roomCodeUpper, intervalId);
};

/**
 * Cancels and cleans up the active timer for a room.
 */
const stopTurnTimer = (roomCode) => {
  const roomCodeUpper = roomCode.toUpperCase();
  const intervalId = activeTimers.get(roomCodeUpper);
  if (intervalId) {
    clearInterval(intervalId);
    activeTimers.delete(roomCodeUpper);
    console.log(`⏱️ Timer: Stopped and cleaned up for room ${roomCodeUpper}`);
  }
};

export { startTurnTimer, stopTurnTimer, activeTimers };
