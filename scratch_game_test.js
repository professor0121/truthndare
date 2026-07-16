import fetch from "node-fetch";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000/api/v1";
const SOCKET_URL = "http://localhost:5000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runGameTests() {
  console.log("🚦 Starting Game Engine Real-Time Integration Tests...\n");

  try {
    // 1. Authenticate users
    console.log("👤 Authenticating User A (Host) & User B...");
    
    // User A
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "host@example.com", username: "hostplayer", password: "Password123" })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "hostplayer", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;
    const userAId = loginAData.data.user._id;

    // User B
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "playerb@example.com", username: "playerb", password: "Password123" })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "playerb", password: "Password123" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.data.accessToken;
    const userBId = loginBData.data.user._id;

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
    console.log("✅ Player B joined.");

    // 3. Connect Sockets
    console.log("\n🔌 Connecting Sockets...");
    const socketA = io(SOCKET_URL, { auth: { token: tokenA }, transports: ["websocket"] });
    const socketB = io(SOCKET_URL, { auth: { token: tokenB }, transports: ["websocket"] });

    // State capturing variables
    let gameStartedBroadcast = null;
    let bottleSpunBroadcast = null;
    let typeChosenBroadcast = null;
    let turnResultBroadcast = null;
    let gameFinishedBroadcast = null;

    socketA.on("connect", () => {
      socketA.emit("join_room_session", { roomCode });
    });
    socketB.on("connect", () => {
      socketB.emit("join_room_session", { roomCode });
    });

    socketA.on("game_started", (room) => {
      gameStartedBroadcast = room;
      console.log("📡 User A received 'game_started' event.");
    });
    socketB.on("game_started", (room) => {
      console.log("📡 User B received 'game_started' event.");
    });

    socketA.on("bottle_spun", (room) => {
      bottleSpunBroadcast = room;
      console.log(`📡 User A received 'bottle_spun' event. Target Player: ${room.game.currentPlayerId}`);
    });

    socketA.on("type_chosen", (room) => {
      typeChosenBroadcast = room;
      console.log(`📡 User A received 'type_chosen' event. Question: "${room.game.currentQuestion.text}"`);
    });

    socketA.on("turn_result", (room) => {
      turnResultBroadcast = room;
      console.log("📡 User A received 'turn_result' event.");
    });

    socketA.on("game_finished", (room) => {
      gameFinishedBroadcast = room;
      console.log("📡 User A received 'game_finished' event. Winner:", room.game.winnerId);
    });

    await delay(1500); // Wait for sockets to connect & join session

    // 4. Start Game
    console.log("\n🎮 Host starting game...");
    const startRes = await fetch(`${BASE_URL}/rooms/code/${roomCode}/start`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const startData = await startRes.json();
    console.log(`✅ REST response status: ${startRes.status}. Game status: ${startData.data.game.status}`);

    await delay(1000);
    if (!gameStartedBroadcast) throw new Error("Did not receive game_started event!");

    // 5. Spin Bottle
    console.log("\n🎮 Host spinning bottle...");
    const spinRes = await fetch(`${BASE_URL}/rooms/code/${roomCode}/spin`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const spinData = await spinRes.json();
    console.log(`✅ REST response status: ${spinRes.status}. Selected player: ${spinData.data.game.currentPlayerId}`);

    await delay(1000);
    if (!bottleSpunBroadcast) throw new Error("Did not receive bottle_spun event!");

    const activePlayerId = bottleSpunBroadcast.game.currentPlayerId;
    const activePlayerToken = activePlayerId === userAId ? tokenA : tokenB;
    const activePlayerName = activePlayerId === userAId ? "User A" : "User B";
    console.log(`👉 Active turn belongs to: ${activePlayerName}`);

    // 6. Active Player chooses choice (e.g. truth)
    console.log(`\n🎮 ${activePlayerName} choosing Truth...`);
    const choiceRes = await fetch(`${BASE_URL}/rooms/code/${roomCode}/choice`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activePlayerToken}` 
      },
      body: JSON.stringify({ type: "truth" })
    });
    const choiceData = await choiceRes.json();
    console.log(`✅ REST response status: ${choiceRes.status}. Question selected: "${choiceData.data.game.currentQuestion.text}"`);

    await delay(1000);
    if (!typeChosenBroadcast) throw new Error("Did not receive type_chosen event!");

    // 7. Active Player submits completion
    console.log(`\n🎮 ${activePlayerName} submitting outcome 'completed'...`);
    const submitRes = await fetch(`${BASE_URL}/rooms/code/${roomCode}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activePlayerToken}`
      },
      body: JSON.stringify({ outcome: "completed" })
    });
    const submitData = await submitRes.json();
    console.log(`✅ REST response status: ${submitRes.status}. Player score updated.`);

    await delay(1000);
    if (!turnResultBroadcast) throw new Error("Did not receive turn_result event!");

    // Validate score increase
    const playerRecord = turnResultBroadcast.players.find(p => p.userId === activePlayerId);
    console.log(`📈 Active player score is now: ${playerRecord.score}`);
    if (playerRecord.score !== 10) throw new Error("Score did not increase by 10!");

    // 8. Host ends the game
    console.log("\n🎮 Host ending game...");
    const endRes = await fetch(`${BASE_URL}/rooms/code/${roomCode}/end`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const endData = await endRes.json();
    console.log(`✅ REST response status: ${endRes.status}. Final room status: ${endData.data.status}`);

    await delay(1000);
    if (!gameFinishedBroadcast) throw new Error("Did not receive game_finished event!");
    console.log(`🏆 Winner declared: ${gameFinishedBroadcast.game.winnerId}`);

    // Clean up
    console.log("\n🔌 Cleaning up socket connections...");
    socketA.close();
    socketB.close();

    console.log("\n🎉 Game Engine integration tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Game tests failed with error:", error);
  }
}

runGameTests();
