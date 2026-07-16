import fetch from "node-fetch";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000/api/v1";
const SOCKET_URL = "http://localhost:5000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAITests() {
  console.log("🚦 Starting Question Catalog & AI Generation Integration Tests...\n");

  try {
    // 1. Authenticate users
    console.log("👤 Authenticating User A (Host) & User B...");
    
    // User A
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "aihost@example.com", username: "aihost", password: "Password123" })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "aihost", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;
    const userAId = loginAData.data.user._id;

    // User B
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "aiplayer@example.com", username: "aiplayer", password: "Password123" })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "aiplayer", password: "Password123" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.data.accessToken;

    console.log("🔑 Authentication successful.");

    // 2. User A adds a custom question
    console.log("\n📝 User A submitting a custom Truth question...");
    const customPayload = {
      text: "Have you ever cheated on a test?",
      type: "truth",
      difficulty: "easy",
      category: "funny"
    };
    const addRes = await fetch(`${BASE_URL}/questions`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify(customPayload)
    });
    const addData = await addRes.json();
    console.log(`✅ Custom question created (${addRes.status}):`, addData.data);
    
    if (addData.data.createdBy !== userAId) {
      throw new Error("Custom question createdBy field does not match the user ID!");
    }

    // 3. User B queries the catalog
    console.log("\n🔍 User B fetching all questions from catalog...");
    const allRes = await fetch(`${BASE_URL}/questions`, {
      headers: { "Authorization": `Bearer ${tokenB}` }
    });
    const allData = await allRes.json();
    console.log(`✅ Total questions in catalog: ${allData.data.length}`);
    
    // Check if custom question is present in list
    const hasCustom = allData.data.some(q => q.text === "Have you ever cheated on a test?");
    console.log(`- Catalog contains User A's custom question? ${hasCustom}`);
    if (!hasCustom) throw new Error("Catalog query failed to return custom user questions.");

    console.log("🔍 User B filtering catalog for custom questions only...");
    const customOnlyRes = await fetch(`${BASE_URL}/questions?customOnly=true`, {
      headers: { "Authorization": `Bearer ${tokenB}` }
    });
    const customOnlyData = await customOnlyRes.json();
    console.log(`✅ Custom-only question list count: ${customOnlyData.data.length}`);
    const allAreCustom = customOnlyData.data.every(q => q.createdBy !== null);
    if (!allAreCustom || customOnlyData.data.length === 0) {
      throw new Error("Custom-only filter returned system/pre-saved questions or was empty.");
    }

    // 4. Test AI Generation endpoint (on-demand)
    console.log("\n🤖 Triggering AI question generation (on-demand)...");
    const aiRes = await fetch(`${BASE_URL}/questions/generate`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}` 
      },
      body: JSON.stringify({ type: "dare", difficulty: "medium", category: "funny" })
    });
    const aiData = await aiRes.json();
    console.log(`✅ On-demand AI question result:`, aiData.data);
    if (!aiData.data.text) throw new Error("AI Generation did not return text!");

    // 5. Test Room gameplay integration (dynmamically chooses question using QuestionService)
    console.log("\n🏠 Host creating room for game loop testing...");
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
    
    // Connect Sockets
    const socketA = io(SOCKET_URL, { auth: { token: tokenA }, transports: ["websocket"] });
    socketA.on("connect", () => socketA.emit("join_room_session", { roomCode }));

    let questionSelectedBroadcast = null;
    socketA.on("type_chosen", (room) => {
      questionSelectedBroadcast = room;
      console.log(`📡 WebSocket received 'type_chosen' event. Turn Question: "${room.game.currentQuestion.text}"`);
    });

    await delay(1500); // Wait to connect

    console.log("🎮 Host starting game...");
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

    console.log(`🎮 Active player choosing choice...`);
    const choiceRes = await fetch(`${BASE_URL}/rooms/code/${roomCode}/choice`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activePlayerToken}` 
      },
      body: JSON.stringify({ type: "dare" })
    });
    const choiceData = await choiceRes.json();
    console.log(`✅ REST response: selected question text: "${choiceData.data.game.currentQuestion.text}"`);

    await delay(1500);
    if (!questionSelectedBroadcast || questionSelectedBroadcast.game.currentQuestion.text !== choiceData.data.game.currentQuestion.text) {
      throw new Error("Room socket broadcast and REST state question text do not match!");
    }

    // Clean up
    console.log("\n🔌 Cleaning up socket connections...");
    socketA.close();

    console.log("\n🎉 Question Catalog & AI Generation tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Tests failed with error:", error);
  }
}

runAITests();
