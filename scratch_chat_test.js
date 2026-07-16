import fetch from "node-fetch";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000/api/v1";
const SOCKET_URL = "http://localhost:5000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runChatTests() {
  console.log("🚦 Starting Chat & Emoji Real-Time Integration Tests...\n");

  try {
    // 1. Authenticate users
    console.log("👤 Authenticating User A (Host) & User B...");
    
    // User A
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "chathost@example.com", username: "chathost", password: "Password123" })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "chathost", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;

    // User B
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "chatplayer@example.com", username: "chatplayer", password: "Password123" })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "chatplayer", password: "Password123" })
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
    console.log("✅ Player B joined.");

    // 3. Connect Sockets
    console.log("\n🔌 Connecting Sockets...");
    const socketA = io(SOCKET_URL, { auth: { token: tokenA }, transports: ["websocket"] });
    const socketB = io(SOCKET_URL, { auth: { token: tokenB }, transports: ["websocket"] });

    // Event capture vars
    const receivedMessagesA = [];
    const receivedMessagesB = [];
    const receivedEmojisA = [];
    const receivedEmojisB = [];

    socketA.on("connect", () => socketA.emit("join_room_session", { roomCode }));
    socketB.on("connect", () => socketB.emit("join_room_session", { roomCode }));

    socketA.on("chat_message", (msg) => {
      receivedMessagesA.push(msg);
      console.log(`📡 Socket A received chat message from [${msg.sender.username}]: "${msg.message}"`);
    });

    socketB.on("chat_message", (msg) => {
      receivedMessagesB.push(msg);
      console.log(`📡 Socket B received chat message from [${msg.sender.username}]: "${msg.message}"`);
    });

    socketA.on("emoji_reaction", (emoji) => {
      receivedEmojisA.push(emoji);
      console.log(`📡 Socket A received emoji reaction from [${emoji.sender.username}]: "${emoji.emoji}"`);
    });

    socketB.on("emoji_reaction", (emoji) => {
      receivedEmojisB.push(emoji);
      console.log(`📡 Socket B received emoji reaction from [${emoji.sender.username}]: "${emoji.emoji}"`);
    });

    await delay(1500); // Wait for sockets to connect & join session

    // 4. Send Normal Message
    console.log("\n💬 User A sending message: 'Hello players!'");
    socketA.emit("send_message", { roomCode, message: "Hello players!" });
    await delay(1000);

    // 5. Send Toxic Message (test moderation filter)
    console.log("\n💬 User B sending toxic message: 'Get lost you asshole dick!'");
    socketB.emit("send_message", { roomCode, message: "Get lost you asshole dick!" });
    await delay(1000);

    // 6. Send Emoji Reaction
    console.log("\n💬 User A sending emoji reaction: '🔥'");
    socketA.emit("send_emoji", { roomCode, emoji: "🔥" });
    await delay(1000);

    // Assertions
    console.log("\n🧪 Running validations...");
    
    // Check message counts
    if (receivedMessagesA.length !== 2 || receivedMessagesB.length !== 2) {
      throw new Error(`Expected both clients to receive 2 messages. Received A: ${receivedMessagesA.length}, B: ${receivedMessagesB.length}`);
    }

    // Check moderation cleaning
    const toxicMsg = receivedMessagesA.find(m => m.sender.username === "chatplayer");
    if (!toxicMsg || toxicMsg.message !== "Get lost you ******* ****!") {
      throw new Error(`Content moderation failed! Expected clean string. Received: "${toxicMsg?.message}"`);
    }
    console.log("✅ Moderation filter checked and passed: Toxic words were masked correctly.");

    // Check emoji counts
    if (receivedEmojisA.length !== 1 || receivedEmojisB.length !== 1) {
      throw new Error(`Expected both clients to receive 1 emoji reaction. Received A: ${receivedEmojisA.length}, B: ${receivedEmojisB.length}`);
    }
    console.log("✅ Emoji reaction checked and passed.");

    // Clean up
    console.log("\n🔌 Cleaning up socket connections...");
    socketA.close();
    socketB.close();

    console.log("\n🎉 Chat & Social Interaction integration tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Chat tests failed with error:", error);
  }
}

runChatTests();
