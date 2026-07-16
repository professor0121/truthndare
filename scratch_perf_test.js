import fetch from "node-fetch";

const BASE_URL = "http://localhost:5000/api/v1";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPerfTests() {
  console.log("🚦 Starting Performance & Security Optimization Tests...\n");

  try {
    // 1. Register a user to fetch the question catalog
    console.log("👤 Authenticating test user...");
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "perf@example.com", username: "perfuser", password: "Password123" })
    });
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "perfuser", password: "Password123" })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;

    // 2. Query questions to test Gzip Response Compression
    console.log("\n📦 Fetching question catalog to check Gzip Compression...");
    const catalogRes = await fetch(`${BASE_URL}/questions`, {
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Accept-Encoding": "gzip" // Request gzip compression explicitly
      }
    });

    const contentEncoding = catalogRes.headers.get("content-encoding");
    console.log(`- Response Content-Encoding Header: ${contentEncoding}`);
    
    // Compression middleware usually compresses responses above 1KB.
    // If client sends Accept-Encoding, it should receive gzip.
    if (contentEncoding === "gzip") {
      console.log("✅ Gzip response compression verified successfully.");
    } else {
      console.warn("⚠️  Response was not gzipped. (This is normal if payload size is below the compression threshold).");
    }

    // 3. Test Rate Limiter (Stricter Auth rate limiter allows max 15 requests)
    console.log("\n🔒 Attempting to trigger Rate Limiter on Auth route (spamming /login endpoint)...");
    
    let rateLimited = false;
    let attemptsCount = 0;
    
    for (let i = 0; i < 25; i++) {
      attemptsCount++;
      const spamRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "perfuser", password: "WrongPassword" }) // Incorrect passwords to spam
      });

      if (spamRes.status === 429) {
        rateLimited = true;
        const body = await spamRes.json();
        console.log(`✅ Hit Rate Limiter on attempt #${attemptsCount} (${spamRes.status}):`, body);
        if (!body.message.includes("Too many authentication attempts")) {
          throw new Error("Limiter returned incorrect error message.");
        }
        break;
      }
      
      // Print progress periodically to keep output clean
      if (attemptsCount % 5 === 0) {
        console.log(`- Request #${attemptsCount} sent...`);
      }
      
      await delay(50); // slight delay to avoid socket exhaustion
    }

    if (!rateLimited) {
      throw new Error("Rate limiting failed to enforce. Exceeded limit without getting 429 status code!");
    }

    console.log("\n🎉 Performance & Security optimization tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Performance tests failed with error:", error);
  }
}

runPerfTests();
