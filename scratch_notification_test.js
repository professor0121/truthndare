import fetch from "node-fetch";

const BASE_URL = "http://localhost:5000/api/v1";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runNotificationTests() {
  console.log("🚦 Starting Push Notifications Integration Tests...\n");

  try {
    // 1. Authenticate users
    console.log("👤 Authenticating players...");
    
    // User A
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pusha@example.com", username: "pusha", password: "Password123" })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "pusha", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;
    const userAId = loginAData.data.user._id;

    // User B
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pushb@example.com", username: "pushb", password: "Password123" })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "pushb", password: "Password123" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.data.accessToken;
    const userBId = loginBData.data.user._id;

    console.log("🔑 Authentication successful.");

    // 2. Fetch public VAPID Key
    console.log("\n🔑 Fetching public VAPID key...");
    const vapidRes = await fetch(`${BASE_URL}/notifications/vapid-key`, {
      headers: { "Authorization": `Bearer ${tokenB}` }
    });
    const vapidData = await vapidRes.json();
    console.log(`✅ Public VAPID Key: ${vapidData.data.publicKey}`);
    if (!vapidData.data.publicKey || vapidData.data.publicKey.length < 50) {
      throw new Error("Invalid VAPID public key string returned!");
    }

    // 3. Register mock push subscription for User B
    console.log("\n📝 Registering push subscription for User B...");
    const mockSubscription = {
      endpoint: `https://fcm.googleapis.com/fcm/send/mock_endpoint_${userBId}`,
      keys: {
        p256dh: "BLc4x8q5_k00cPL1s9YtWc3oE1v...mock_dh_key...",
        auth: "mock_auth_salt_123"
      }
    };
    const subRes = await fetch(`${BASE_URL}/notifications/subscribe`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenB}`
      },
      body: JSON.stringify(mockSubscription)
    });
    const subData = await subRes.json();
    console.log(`✅ Subscription response (${subRes.status}):`, subData.data);
    if (subData.data.endpoint !== mockSubscription.endpoint) {
      throw new Error("Push subscription endpoint mismatch!");
    }

    // 4. Establish friendship (so User A can invite User B)
    console.log("\n🤝 Establishing friendship...");
    await fetch(`${BASE_URL}/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
      body: JSON.stringify({ recipientUsername: "pushb" })
    });
    await fetch(`${BASE_URL}/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenB}` },
      body: JSON.stringify({ requesterId: userAId })
    });

    // 5. User A creates a room and invites User B (which triggers a push notification)
    console.log("\n🏠 Host A creating room...");
    const roomRes = await fetch(`${BASE_URL}/rooms/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
      body: JSON.stringify({ maxPlayers: 5, visibility: "public" })
    });
    const roomData = await roomRes.json();
    const roomCode = roomData.data.code;

    console.log(`📧 User A sending room invitation to User B (this triggers a push notification)...`);
    const inviteRes = await fetch(`${BASE_URL}/friends/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ friendUserId: userBId, roomCode })
    });
    const inviteData = await inviteRes.json();
    console.log(`✅ REST response:`, inviteData.data);

    // Wait slightly to let async push delivery finish
    await delay(1000);

    console.log("\n🎉 Push Notifications tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Push tests failed with error:", error);
  }
}

runNotificationTests();
