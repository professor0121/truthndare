import fetch from "node-fetch";

const BASE_URL = "http://localhost:5000/api/v1";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runModerationTests() {
  console.log("🚦 Starting Moderation & Trust/Safety Integration Tests...\n");

  try {
    // 1. Authenticate users
    console.log("👤 Registering and authenticating players...");
    
    // User A (Reporter / future Admin)
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "adminreporter@example.com", username: "adminreporter", password: "Password123" })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "adminreporter", password: "Password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.data.accessToken;
    const userAId = loginAData.data.user._id;

    // User B (Reported User)
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "violator@example.com", username: "violator", password: "Password123" })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "violator", password: "Password123" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.data.accessToken;
    const userBId = loginBData.data.user._id;

    console.log("🔑 Authentication successful.");

    // 2. User B adds a toxic custom question
    console.log("\n📝 User B submitting a custom question...");
    const questionRes = await fetch(`${BASE_URL}/questions`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        text: "This is an inappropriate toxic custom question!",
        type: "truth",
        difficulty: "easy",
        category: "funny"
      })
    });
    const questionData = await questionRes.json();
    const questionId = questionData.data._id;
    console.log(`✅ Custom question created by User B. ID: ${questionId}`);

    // 3. User A submits a report against User B's question
    console.log("\n📝 User A submitting a report against User B's question...");
    const reportRes = await fetch(`${BASE_URL}/moderation/reports`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        reportedUserId: userBId,
        contentType: "question",
        contentId: questionId,
        contentPreview: "This is an inappropriate toxic custom question!",
        reason: "inappropriate content"
      })
    });
    const reportData = await reportRes.json();
    const reportId = reportData.data._id;
    console.log(`✅ Report submitted. Report ID: ${reportId}, Status: ${reportData.data.status}`);

    // 4. User A attempts to view the pending queue as standard user
    console.log("\n🔒 User A attempting to view pending admin queue (should fail)...");
    const failQueueRes = await fetch(`${BASE_URL}/moderation/reports/pending`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    console.log(`- Request returned status code: ${failQueueRes.status}`);
    if (failQueueRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, but received status ${failQueueRes.status}`);
    }
    console.log("✅ Access successfully denied (403 Forbidden).");

    // 5. Elevate User A to admin
    console.log("\n👑 Elevating User A's role to 'admin'...");
    const updateRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ role: "admin" })
    });
    const updateData = await updateRes.json();
    console.log(`✅ Role successfully elevated to: ${updateData.data.role}`);

    // 6. User A views the pending queue as admin
    console.log("\n🔓 User A attempting to view pending queue as admin...");
    const successQueueRes = await fetch(`${BASE_URL}/moderation/reports/pending`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const successQueueData = await successQueueRes.json();
    console.log(`✅ Pending queue retrieved (${successQueueRes.status}). Count: ${successQueueData.data.length}`);
    const containsReport = successQueueData.data.some(r => r._id === reportId);
    if (!containsReport) {
      throw new Error("Report not found in admin pending reports list.");
    }

    // 7. User A resolves report with action "delete_content"
    console.log(`\n⚖️ Admin resolving report ${reportId} with action 'delete_content'...`);
    const resolveRes = await fetch(`${BASE_URL}/moderation/reports/${reportId}/resolve`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ action: "delete_content" })
    });
    const resolveData = await resolveRes.json();
    console.log(`✅ Resolution response (${resolveRes.status}):`, resolveData.data);
    if (resolveData.data.status !== "resolved" || resolveData.data.actionTaken !== "deleted") {
      throw new Error(`Resolution fields mismatch! Status: ${resolveData.data.status}, Action: ${resolveData.data.actionTaken}`);
    }

    // 8. Verify question is deleted from catalog
    console.log("\n🔍 Checking question catalog to confirm question was deleted...");
    const catalogRes = await fetch(`${BASE_URL}/questions`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const catalogData = await catalogRes.json();
    const hasQuestion = catalogData.data.some(q => q._id === questionId);
    console.log(`- Question catalog contains the reported question? ${hasQuestion}`);
    if (hasQuestion) {
      throw new Error("Reported custom question was not deleted from catalog!");
    }
    console.log("✅ Confirmed question has been deleted successfully.");

    // 9. Submit a second report for User B chat violations
    console.log("\n📝 Admin submitting a second report against User B for chat spam...");
    const report2Res = await fetch(`${BASE_URL}/moderation/reports`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        reportedUserId: userBId,
        contentType: "chat",
        contentPreview: "spamming messages in room",
        reason: "spamming"
      })
    });
    const report2Data = await report2Res.json();
    const report2Id = report2Data.data._id;
    console.log(`✅ Second report submitted. ID: ${report2Id}`);

    // 10. Admin resolves report with "ban" action
    console.log(`⚖️ Admin resolving second report with action 'ban'...`);
    const resolve2Res = await fetch(`${BASE_URL}/moderation/reports/${report2Id}/resolve`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ action: "ban" })
    });
    const resolve2Data = await resolve2Res.json();
    console.log(`✅ Resolution response (${resolve2Res.status}):`, resolve2Data.data);
    
    // 11. Verify User B is banned
    console.log("\n🔍 Verifying User B status in the system...");
    // Let's verify by retrieving User B's profile details.
    // In our test, since User B is logged in, User B can query `/me`
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { "Authorization": `Bearer ${tokenB}` }
    });
    const meData = await meRes.json();
    console.log(`✅ User B status -> isBanned: ${meData.data.isBanned}, isMuted: ${meData.data.isMuted}`);
    if (!meData.data.isBanned) {
      throw new Error("Target user B was not banned after resolving the report!");
    }
    console.log("✅ User B successfully flagged as banned.");

    console.log("\n🎉 Moderation & Trust/Safety tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Moderation tests failed with error:", error);
  }
}

runModerationTests();
