import fetch from "node-fetch";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000/api/v1";
const SOCKET_URL = "http://localhost:5000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runRTCTests() {
  console.log("🚦 Starting WebRTC Socket.io Signaling Integration Tests...\n");

  try {
    // 1. Authenticate users
    console.log("👤 Authenticating User A (Host) & User B...");
    
    // User A
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rtchost@example.com", username: "rtchost", password: "Password123" })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "rtchost", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;
    const userAId = loginAData.data.user._id;

    // User B
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rtcplayer@example.com", username: "rtcplayer", password: "Password123" })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "rtcplayer", password: "Password123" })
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

    // 3. Connect Sockets
    console.log("\n🔌 Connecting Sockets...");
    const socketA = io(SOCKET_URL, { auth: { token: tokenA }, transports: ["websocket"] });
    const socketB = io(SOCKET_URL, { auth: { token: tokenB }, transports: ["websocket"] });

    // Event capture vars
    let signalReceivedByB = null;
    let signalReceivedByA = null;

    socketA.on("connect", () => socketA.emit("join_room_session", { roomCode }));
    socketB.on("connect", () => socketB.emit("join_room_session", { roomCode }));

    socketA.on("webrtc_signal", (data) => {
      signalReceivedByA = data;
      console.log(`📡 Socket A received 'webrtc_signal' event from [${data.senderUserId}]:`, data.signalData);
    });

    socketB.on("webrtc_signal", (data) => {
      signalReceivedByB = data;
      console.log(`📡 Socket B received 'webrtc_signal' event from [${data.senderUserId}]:`, data.signalData);
    });

    await delay(1500); // Wait for connection & room join

    // 4. User A sends WebRTC Offer targeting User B
    console.log(`\n📡 User A sending WebRTC Offer targetting User B (${userBId})...`);
    socketA.emit("webrtc_signal", {
      roomCode,
      targetUserId: userBId,
      signalData: { type: "offer", sdp: "v=0\no=alice 2890844526..." }
    });
    await delay(1000);

    // 5. User B sends WebRTC Answer targeting User A
    console.log(`📡 User B sending WebRTC Answer targetting User A (${userAId})...`);
    socketB.emit("webrtc_signal", {
      roomCode,
      targetUserId: userAId,
      signalData: { type: "answer", sdp: "v=0\no=bob 2890844527..." }
    });
    await delay(1000);

    // 6. Assertions
    console.log("\n🧪 Running validations...");
    
    if (!signalReceivedByB || signalReceivedByB.senderUserId !== userAId) {
      throw new Error("User B failed to receive the WebRTC Offer from User A!");
    }
    if (signalReceivedByB.signalData.type !== "offer" || !signalReceivedByB.signalData.sdp.startsWith("v=0")) {
      throw new Error("User B received incorrect Offer data!");
    }
    console.log("✅ User B successfully received valid WebRTC Offer.");

    if (!signalReceivedByA || signalReceivedByA.senderUserId !== userBId) {
      throw new Error("User A failed to receive the WebRTC Answer from User B!");
    }
    if (signalReceivedByA.signalData.type !== "answer" || !signalReceivedByA.signalData.sdp.startsWith("v=0")) {
      throw new Error("User A received incorrect Answer data!");
    }
    console.log("✅ User A successfully received valid WebRTC Answer.");

    // Clean up
    console.log("\n🔌 Cleaning up socket connections...");
    socketA.close();
    socketB.close();

    console.log("\n🎉 WebRTC Socket.io signaling tests completed successfully!");
  } catch (error) {
    console.error("\n❌ WebRTC tests failed with error:", error);
  }
}

runRTCTests();
