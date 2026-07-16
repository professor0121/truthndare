import fetch from "node-fetch"; // wait, Node 18+ has native fetch. Let's use native fetch directly!
// But just in case, we will use standard global fetch.

const BASE_URL = "http://localhost:5000/api/v1/auth";

async function runTests() {
  console.log("🚦 Starting Authentication Backend Tests...\n");

  try {
    // 1. Healthcheck
    const healthRes = await fetch("http://localhost:5000/healthcheck");
    const healthData = await healthRes.json();
    console.log(`✅ Healthcheck Response (${healthRes.status}):`, healthData);

    // 2. Register new user
    const regPayload = {
      email: "testuser@example.com",
      username: "testuser",
      password: "password123"
    };
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regPayload)
    });
    const regData = await regRes.json();
    console.log(`\n✅ Register User (${regRes.status}):`, regData.success ? "SUCCESS" : "FAILED", regData);

    // 3. Try duplicate registration
    const dupRes = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regPayload)
    });
    const dupData = await dupRes.json();
    console.log(`✅ Duplicate Register Check (${dupRes.status}):`, dupData.success ? "SUCCESS" : "FAILED", dupData.message);

    // 4. Login user
    const loginPayload = {
      identifier: "testuser",
      password: "password123"
    };
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginPayload)
    });
    const loginData = await loginRes.json();
    console.log(`\n✅ Login User (${loginRes.status}):`, loginData.success ? "SUCCESS" : "FAILED", loginData.message);
    
    const accessToken = loginData.data?.accessToken;
    if (!accessToken) {
      throw new Error("Could not retrieve access token from login response.");
    }

    // 5. Get current profile (authenticated)
    const meRes = await fetch(`${BASE_URL}/me`, {
      method: "GET",
      headers: { 
        "Authorization": `Bearer ${accessToken}`
      }
    });
    const meData = await meRes.json();
    console.log(`✅ Get Profile /me (${meRes.status}):`, meData.success ? "SUCCESS" : "FAILED", meData.data);

    // 6. Guest Login
    const guestRes = await fetch(`${BASE_URL}/guest-login`, {
      method: "POST"
    });
    const guestData = await guestRes.json();
    console.log(`\n✅ Guest Login (${guestRes.status}):`, guestData.success ? "SUCCESS" : "FAILED", guestData.data);
    
    const guestToken = guestData.data?.accessToken;
    if (!guestToken) {
      throw new Error("Could not retrieve access token from guest login response.");
    }

    // 7. Get Guest Profile
    const guestMeRes = await fetch(`${BASE_URL}/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${guestToken}`
      }
    });
    const guestMeData = await guestMeRes.json();
    console.log(`✅ Get Guest Profile /me (${guestMeRes.status}):`, guestMeData.success ? "SUCCESS" : "FAILED", guestMeData.data);

    // 8. Convert Guest User to Registered User
    const convertPayload = {
      email: "convertedguest@example.com",
      username: "converted_guest",
      password: "newpassword123"
    };
    const convertRes = await fetch(`${BASE_URL}/convert-guest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${guestToken}`
      },
      body: JSON.stringify(convertPayload)
    });
    const convertData = await convertRes.json();
    console.log(`✅ Convert Guest to Registered (${convertRes.status}):`, convertData.success ? "SUCCESS" : "FAILED", convertData.data);

    const convertedToken = convertData.data?.accessToken;

    // 9. Logout
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${convertedToken}`
      }
    });
    const logoutData = await logoutRes.json();
    console.log(`\n✅ Logout User (${logoutRes.status}):`, logoutData.success ? "SUCCESS" : "FAILED", logoutData.message);

    console.log("\n🎉 All integration tests passed successfully!");
  } catch (error) {
    console.error("\n❌ Test Suite Failed with error:", error);
  }
}

runTests();
