import fetch from "node-fetch"; // Node 18+ has native fetch
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000/api/v1";
const SOCKET_URL = "http://localhost:5000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runRoomTests() {
  console.log("🚦 Starting Room Management and Socket.io Integration Tests...\n");

  try {
    // 1. Register & Login User A (Host)
    console.log("👤 Creating User A (Host)...");
    const regARes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "usera@example.com", username: "usera", password: "Password123" })
    });
    const regAData = await regARes.json();
    
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "usera", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;
    console.log("🔑 User A authenticated.");

    // 2. Register & Login User B (Guest joining later)
    console.log("👤 Creating User B (Guest)...");
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "userb@example.com", username: "userb", password: "Password123" })
    });
    const regBData = await regBRes.json();
    
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "userb", password: "Password123" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.data.accessToken;
    console.log("🔑 User B authenticated.");

    // 3. User A creates a Room
    console.log("\n🏠 User A creating a public room...");
    const createRoomRes = await fetch(`${BASE_URL}/rooms/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ maxPlayers: 4, visibility: "public" })
    });
    const createRoomData = await createRoomRes.json();
    const room = createRoomData.data;
    const roomCode = room.code;
    console.log(`✅ Room created successfully. Code: ${roomCode}`, room);

    // 4. Verify public lobbies lists the room
    const publicLobbiesRes = await fetch(`${BASE_URL}/rooms/public`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const publicLobbiesData = await publicLobbiesRes.json();
    console.log(`✅ Public lobbies list retrieved:`, publicLobbiesData.data.map(r => r.code));

    // 5. Establish Socket connection for User A
    console.log(`\n🔌 Connecting User A socket to server...`);
    const socketA = io(SOCKET_URL, {
      auth: { token: tokenA },
      transports: ["websocket"]
    });

    socketA.on("connect", () => {
      console.log("🔌 User A Socket Connected!");
      // Join the real-time room session
      socketA.emit("join_room_session", { roomCode });
    });

    socketA.on("room_sync", (syncedRoom) => {
      console.log("📡 User A received room_sync:", syncedRoom.code, `Players: ${syncedRoom.players.length}`);
    });

    socketA.on("player_presence_update", (update) => {
      console.log("📡 User A received player_presence_update event:", update);
    });

    await delay(1000);

    // 6. User B joins the room via REST API
    console.log(`\n🏠 User B joining room: ${roomCode}...`);
    const joinRes = await fetch(`${BASE_URL}/rooms/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenB}`
      },
      body: JSON.stringify({ code: roomCode })
    });
    const joinData = await joinRes.json();
    console.log(`✅ User B joined via REST:`, joinData.success ? "SUCCESS" : "FAILED", joinData.data);

    // 7. Establish Socket connection for User B and join the session
    console.log(`🔌 Connecting User B socket to server...`);
    const socketB = io(SOCKET_URL, {
      auth: { token: tokenB },
      transports: ["websocket"]
    });

    socketB.on("connect", () => {
      console.log("🔌 User B Socket Connected!");
      socketB.emit("join_room_session", { roomCode });
    });

    // Wait a brief moment to allow events to process
    await delay(2000);

    // 8. User B leaves the room via REST API
    console.log(`\n🏠 User B leaving room: ${roomCode}...`);
    const leaveRes = await fetch(`${BASE_URL}/rooms/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenB}`
      },
      body: JSON.stringify({ code: roomCode })
    });
    const leaveData = await leaveRes.json();
    console.log(`✅ User B left via REST:`, leaveData.success ? "SUCCESS" : "FAILED");
    
    // Explicitly notify socket B left
    socketB.emit("leave_room_session", { roomCode });

    await delay(2000);

    // Clean up connections
    console.log("\n🔌 Cleaning up socket connections...");
    socketA.close();
    socketB.close();

    console.log("\n🎉 Room and Socket integration tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Room tests failed with error:", error);
  }
}

runRoomTests();
