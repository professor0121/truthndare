import fetch from "node-fetch";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000/api/v1";
const SOCKET_URL = "http://localhost:5000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTimerTests() {
  console.log("🚦 Starting Turn Timer & Real-Time Sync Integration Tests...\n");

  try {
    // 1. Authenticate users
    console.log("👤 Authenticating User A (Host) & User B...");
    
    // User A
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "timerhost@example.com", username: "timerhost", password: "Password123" })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "timerhost", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;
    const userAId = loginAData.data.user._id;

    // User B
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "timerplayer@example.com", username: "timerplayer", password: "Password123" })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "timerplayer", password: "Password123" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.data.accessToken;

    console.log("🔑 Authentication successful.");

    // 2. Create room & Join
    console.log("\n🏠 Host creating room...");
    const createRes = await fetch(`${BASE_URL}/rooms/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
      body: JSON.stringify({ maxPlayers: 5, visibility: "public" })
    });
    const createData = await createRes.json();
    const roomCode = createData.data.code;
    console.log(`✅ Room created. Code: ${roomCode}`);

    console.log(`🏠 Player B joining room...`);
    await fetch(`${BASE_URL}/rooms/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenB}` },
      body: JSON.stringify({ code: roomCode })
    });

    // 3. Connect Sockets
    console.log("\n🔌 Connecting Sockets...");
    const socketA = io(SOCKET_URL, { auth: { token: tokenA }, transports: ["websocket"] });
    
    // Capture events
    const ticksReceived = [];
    let timerExpiredReceived = null;
    let turnResultReceived = null;

    socketA.on("connect", () => socketA.emit("join_room_session", { roomCode }));

    socketA.on("timer_tick", (data) => {
      ticksReceived.push(data.secondsLeft);
      console.log(`📡 WebSocket received 'timer_tick': ${data.secondsLeft}s remaining`);
    });

    socketA.on("timer_expired", (data) => {
      timerExpiredReceived = data;
      console.log(`📡 WebSocket received 'timer_expired' event! Message: "${data.message}"`);
    });

    socketA.on("turn_result", (room) => {
      turnResultReceived = room;
      console.log(`📡 WebSocket received 'turn_result' event. Round: ${room.game.currentRound}, State: ${room.game.turnState}`);
    });

    await delay(1500); // Wait for connection

    // 4. Start Game & Spin
    console.log("\n🎮 Host starting game...");
    await fetch(`${BASE_URL}/rooms/code/${roomCode}/start`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${tokenA}` }
    });

    console.log("🎮 Host spinning bottle...");
    const spinRes = await fetch(`${BASE_URL}/rooms/code/${roomCode}/spin`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const spinData = await spinRes.json();
    const activePlayerId = spinData.data.game.currentPlayerId;
    const activePlayerToken = activePlayerId === userAId ? tokenA : tokenB;

    // 5. Active Player chooses type (starts the turn timer - TURN_TIMER_LIMIT will be configured to 3s)
    console.log("\n🎮 Active player choosing choice 'dare' (this starts the turn timer)...");
    await fetch(`${BASE_URL}/rooms/code/${roomCode}/choice`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activePlayerToken}` 
      },
      body: JSON.stringify({ type: "dare" })
    });

    // 6. Wait for timer to expire (TURN_TIMER_LIMIT=3, so we wait 5 seconds)
    console.log("\n⏱️ Waiting 5 seconds for timer to expire...");
    await delay(5000);

    // 7. Assertions
    console.log("\n🧪 Running validations...");
    
    // Check ticks
    console.log(`- Ticks captured: [${ticksReceived.join(", ")}]`);
    if (ticksReceived.length === 0) {
      throw new Error("No timer ticks were received!");
    }

    // Check expiration event
    if (!timerExpiredReceived) {
      throw new Error("Did not receive timer_expired event after 3 seconds!");
    }
    console.log("✅ Received expiration event successfully.");

    // Check round increments and auto-skip in DB state
    if (!turnResultReceived) {
      throw new Error("Did not receive turn_result event containing the skipped state!");
    }
    
    if (turnResultReceived.game.currentRound !== 2 || turnResultReceived.game.turnState !== "selecting") {
      throw new Error(`Auto-skip failed to cycle state! Expected Round 2 / selecting. Got Round: ${turnResultReceived.game.currentRound}, State: ${turnResultReceived.game.turnState}`);
    }
    console.log("✅ Auto-skip successfully updated game state (advanced round to 2 and set status back to selecting).");

    // Clean up
    console.log("\n🔌 Cleaning up socket connections...");
    socketA.close();

    console.log("\n🎉 Turn Timer & Sync tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Timer tests failed with error:", error);
  }
}

runTimerTests();
