import { PushSubscription } from "./subscription.model.js";
import { webpush, getPublicKey } from "../../config/webpush.js";
import { ApiError } from "../../utils/ApiError.js";

// Local in-memory subscriptions for mock mode fallback
const mockSubscriptions = [];

class NotificationService {
  /**
   * Registers a new web push subscription for a user.
   */
  static async subscribe(userId, subscriptionObj) {
    const { endpoint, keys } = subscriptionObj;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      throw new ApiError(400, "Invalid subscription object. Missing endpoint or auth keys.");
    }

    const userIdStr = userId.toString();

    if (process.env.USE_MOCK_DB === "true") {
      // Prevent duplicates
      const existingIdx = mockSubscriptions.findIndex((s) => s.endpoint === endpoint);
      const newSubObj = {
        _id: `sub_${Math.random().toString(36).substring(2, 9)}`,
        userId: userIdStr,
        endpoint,
        keys,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (existingIdx !== -1) {
        mockSubscriptions[existingIdx] = newSubObj;
      } else {
        mockSubscriptions.push(newSubObj);
      }
      return newSubObj;
    }

    // Mongoose persist (upsert by endpoint)
    return await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: userIdStr, endpoint, keys },
      { new: true, upsert: true }
    );
  }

  /**
   * Dispatches push notification alert payload to all subscriptions mapped to a user.
   */
  static async sendNotification(userId, payload) {
    const userIdStr = userId.toString();
    let subscriptions = [];

    // Initialize VAPID config keys in case they haven't been loaded yet
    getPublicKey();

    if (process.env.USE_MOCK_DB === "true") {
      subscriptions = mockSubscriptions.filter((s) => s.userId === userIdStr);
    } else {
      subscriptions = await PushSubscription.find({ userId: userIdStr });
    }

    if (subscriptions.length === 0) {
      console.log(`🔔 Notifications: No subscriptions found for user [${userIdStr}]. Logging fallback:`, payload);
      return { success: true, sentCount: 0 };
    }

    const stringifiedPayload = JSON.stringify(payload);
    let sentCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          stringifiedPayload
        );
        sentCount++;
      } catch (error) {
        console.warn(`🔔 Notifications: Push delivery failed for user [${userIdStr}]. Status: ${error.statusCode}`);
        
        // If subscription is expired or revoked (404 / 410), delete it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`🔔 Notifications: Deleting expired subscription for user [${userIdStr}]`);
          if (process.env.USE_MOCK_DB === "true") {
            const idx = mockSubscriptions.findIndex((s) => s._id === sub._id);
            if (idx !== -1) mockSubscriptions.splice(idx, 1);
          } else {
            await PushSubscription.findByIdAndDelete(sub._id);
          }
        }
      }
    }

    return { success: true, sentCount };
  }
}

export { NotificationService, mockSubscriptions };
