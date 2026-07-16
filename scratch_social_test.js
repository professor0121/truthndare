import fetch from "node-fetch";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000/api/v1";
const SOCKET_URL = "http://localhost:5000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSocialTests() {
  console.log("🚦 Starting Social Network & Leaderboard Integration Tests...\n");

  try {
    // 1. Authenticate users
    console.log("👤 Registering and authenticating social users...");
    
    // User A
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "sociala@example.com", username: "sociala", password: "Password123" })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "sociala", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;
    const userAId = loginAData.data.user._id;

    // User B
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "socialb@example.com", username: "socialb", password: "Password123" })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "socialb", password: "Password123" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.data.accessToken;
    const userBId = loginBData.data.user._id;

    console.log("🔑 Social authentication successful.");

    // 2. User A sends friend request to User B
    console.log("\n📝 User A sending friend request to User B...");
    const reqRes = await fetch(`${BASE_URL}/friends/request`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ recipientUsername: "socialb" })
    });
    const reqData = await reqRes.json();
    console.log(`✅ Friend request result (${reqRes.status}):`, reqData.data);

    // 3. User B gets pending requests
    console.log("\n🔍 User B checking pending friend requests...");
    const pendRes = await fetch(`${BASE_URL}/friends/pending`, {
      headers: { "Authorization": `Bearer ${tokenB}` }
    });
    const pendData = await pendRes.json();
    console.log(`✅ Pending requests count: ${pendData.data.length}`);
    const hasRequest = pendData.data.some(u => u.username === "sociala");
    if (!hasRequest) {
      throw new Error("User B did not receive User A's pending request.");
    }

    // 4. User B accepts User A's friend request
    console.log("\n📝 User B accepting friend request from User A...");
    const acceptRes = await fetch(`${BASE_URL}/friends/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenB}`
      },
      body: JSON.stringify({ requesterId: userAId })
    });
    const acceptData = await acceptRes.json();
    console.log(`✅ Acceptance result (${acceptRes.status}):`, acceptData.data);

    // 5. Query friends list for both
    console.log("\n🔍 Querying friends lists...");
    const friendsARes = await fetch(`${BASE_URL}/friends`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const friendsAData = await friendsARes.json();
    console.log(`✅ User A's friends list:`, friendsAData.data.map(f => f.username));
    
    if (!friendsAData.data.some(f => f.username === "socialb")) {
      throw new Error("User B is not present in User A's accepted friends list.");
    }

    // 6. User A creates room and invites User B in real-time
    console.log("\n🏠 Host A creating room lobby...");
    const roomRes = await fetch(`${BASE_URL}/rooms/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
      body: JSON.stringify({ maxPlayers: 5, visibility: "public" })
    });
    const roomData = await roomRes.json();
    const roomCode = roomData.data.code;
    console.log(`✅ Room created. Code: ${roomCode}`);

    // Connect Sockets
    console.log("🔌 Connecting real-time user sockets...");
    const socketA = io(SOCKET_URL, { auth: { token: tokenA }, transports: ["websocket"] });
    const socketB = io(SOCKET_URL, { auth: { token: tokenB }, transports: ["websocket"] });

    let inviteReceivedPayload = null;
    socketB.on("connect", () => socketB.emit("join_room_session", { roomCode: "LOBBY" })); // join global lobby channel
    socketA.on("connect", () => socketA.emit("join_room_session", { roomCode }));

    socketB.on("room_invite", (payload) => {
      inviteReceivedPayload = payload;
      console.log(`📡 WebSocket User B received 'room_invite' from [${payload.sender.username}] for Room: ${payload.roomCode}`);
    });

    await delay(1500); // Wait for connection mapping to establish

    console.log(`\n📧 User A sending room invitation to User B...`);
    const inviteRes = await fetch(`${BASE_URL}/friends/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ friendUserId: userBId, roomCode })
    });
    const inviteData = await inviteRes.json();
    console.log(`✅ Invitation REST response (${inviteRes.status}):`, inviteData.data);

    await delay(1000);
    if (!inviteReceivedPayload || inviteReceivedPayload.roomCode !== roomCode) {
      throw new Error("User B did not receive the real-time room invite event via WebSocket!");
    }
    console.log("✅ WebSocket room invitation verified successfully.");

    // Clean up sockets
    socketA.close();
    socketB.close();

    // 7. Global Leaderboards
    console.log("\n🏆 Querying global leaderboard ranking (database fallback testing)...");
    
    // Update User A's XP to 3500 via HTTP PATCH
    console.log("- Updating sociala (User A) XP to 3500...");
    await fetch(`${BASE_URL}/auth/profile`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ xp: 3500 })
    });

    // Update User B's XP to 4200 via HTTP PATCH
    console.log("- Updating socialb (User B) XP to 4200...");
    await fetch(`${BASE_URL}/auth/profile`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenB}`
      },
      body: JSON.stringify({ xp: 4200 })
    });

    const leadRes = await fetch(`${BASE_URL}/leaderboard/global`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const leadData = await leadRes.json();
    console.log("✅ Global Leaderboard List:", leadData.data.map(item => `Rank ${item.rank}: ${item.username} (${item.xp} XP)`));
    
    // Verify sorting order
    const topUser = leadData.data[0];
    const secondUser = leadData.data[1];
    if (topUser.username !== "socialb" || secondUser.username !== "sociala") {
      throw new Error(`Global leaderboard sorting failed! Top rank should be socialb, got ${topUser.username}`);
    }
    console.log("✅ Global Leaderboard sorting verified successfully.");

    console.log("\n🎉 Social Network & Leaderboard tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Social tests failed with error:", error);
  }
}

runSocialTests();
