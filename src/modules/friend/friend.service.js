import { Friendship } from "./friendship.model.js";
import { UserService } from "../user/user.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { getIO } from "../../config/socket.js";

// Local in-memory store for friendships fallback in mock mode
const mockFriendships = [];

class FriendService {
  static async sendFriendRequest(requesterId, recipientUsername) {
    const requesterIdStr = requesterId.toString();
    const recipient = await UserService.findByUsername(recipientUsername);
    
    if (!recipient) {
      throw new ApiError(404, "Recipient user not found.");
    }
    
    const recipientIdStr = recipient._id.toString();

    if (requesterIdStr === recipientIdStr) {
      throw new ApiError(400, "You cannot send a friend request to yourself.");
    }

    // Check if friendship already exists in either direction
    const existing = await this.findFriendship(requesterIdStr, recipientIdStr);
    if (existing) {
      if (existing.status === "accepted") {
        throw new ApiError(400, "You are already friends with this user.");
      }
      throw new ApiError(400, "A friend request is already pending between you.");
    }

    let friendship = null;

    if (process.env.USE_MOCK_DB === "true") {
      friendship = {
        _id: `f_${Math.random().toString(36).substring(2, 9)}`,
        requesterId: requesterIdStr,
        recipientId: recipientIdStr,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockFriendships.push(friendship);
    } else {
      friendship = await Friendship.create({
        requesterId: requesterIdStr,
        recipientId: recipientIdStr,
        status: "pending"
      });
    }

    // Send push notification asynchronously to recipient
    const requester = await UserService.findById(requesterId);
    const { NotificationService } = await import("../notification/notification.service.js");
    NotificationService.sendNotification(recipientIdStr, {
      title: "New Friend Request",
      body: `${requester?.username || "Someone"} sent you a friend request.`,
      icon: "/assets/icons/icon-192x192.png",
      tag: "friend_request"
    }).catch((err) => console.error("Async push friend request failed:", err.message));

    return friendship;
  }

  static async acceptFriendRequest(recipientId, requesterId) {
    const recipientIdStr = recipientId.toString();
    const requesterIdStr = requesterId.toString();

    if (process.env.USE_MOCK_DB === "true") {
      const friendship = mockFriendships.find(
        (f) => f.requesterId === requesterIdStr && f.recipientId === recipientIdStr && f.status === "pending"
      );
      if (!friendship) {
        throw new ApiError(404, "Pending friend request not found.");
      }
      friendship.status = "accepted";
      friendship.updatedAt = new Date();
      return friendship;
    }

    const friendship = await Friendship.findOne({
      requesterId: requesterIdStr,
      recipientId: recipientIdStr,
      status: "pending"
    });

    if (!friendship) {
      throw new ApiError(404, "Pending friend request not found.");
    }

    friendship.status = "accepted";
    await friendship.save();
    return friendship;
  }

  static async declineFriendRequest(recipientId, requesterId) {
    const recipientIdStr = recipientId.toString();
    const requesterIdStr = requesterId.toString();

    if (process.env.USE_MOCK_DB === "true") {
      const idx = mockFriendships.findIndex(
        (f) => f.requesterId === requesterIdStr && f.recipientId === recipientIdStr && f.status === "pending"
      );
      if (idx === -1) {
        throw new ApiError(404, "Pending friend request not found.");
      }
      mockFriendships.splice(idx, 1);
      return { success: true };
    }

    const result = await Friendship.findOneAndDelete({
      requesterId: requesterIdStr,
      recipientId: recipientIdStr,
      status: "pending"
    });

    if (!result) {
      throw new ApiError(404, "Pending friend request not found.");
    }

    return { success: true };
  }

  static async removeFriend(userId, friendId) {
    const userIdStr = userId.toString();
    const friendIdStr = friendId.toString();

    if (process.env.USE_MOCK_DB === "true") {
      const idx = mockFriendships.findIndex(
        (f) =>
          f.status === "accepted" &&
          ((f.requesterId === userIdStr && f.recipientId === friendIdStr) ||
            (f.requesterId === friendIdStr && f.recipientId === userIdStr))
      );
      if (idx === -1) {
        throw new ApiError(400, "Friendship not found.");
      }
      mockFriendships.splice(idx, 1);
      return { success: true };
    }

    const result = await Friendship.findOneAndDelete({
      status: "accepted",
      $or: [
        { requesterId: userIdStr, recipientId: friendIdStr },
        { requesterId: friendIdStr, recipientId: userIdStr }
      ]
    });

    if (!result) {
      throw new ApiError(400, "Friendship not found.");
    }

    return { success: true };
  }

  static async getFriendsList(userId) {
    const userIdStr = userId.toString();
    let friendships = [];

    if (process.env.USE_MOCK_DB === "true") {
      friendships = mockFriendships.filter(
        (f) => f.status === "accepted" && (f.requesterId === userIdStr || f.recipientId === userIdStr)
      );
    } else {
      friendships = await Friendship.find({
        status: "accepted",
        $or: [{ requesterId: userIdStr }, { recipientId: userIdStr }]
      });
    }

    const friendsList = [];
    for (const f of friendships) {
      const targetId = f.requesterId === userIdStr ? f.recipientId : f.requesterId;
      const friendProfile = await UserService.findById(targetId);
      if (friendProfile) {
        const obj = typeof friendProfile.toObject === "function" ? friendProfile.toObject() : { ...friendProfile };
        delete obj.password_hash;
        delete obj.refreshToken;
        friendsList.push(obj);
      }
    }
    return friendsList;
  }

  static async getPendingRequests(userId) {
    const userIdStr = userId.toString();
    let pending = [];

    if (process.env.USE_MOCK_DB === "true") {
      pending = mockFriendships.filter((f) => f.recipientId === userIdStr && f.status === "pending");
    } else {
      pending = await Friendship.find({ recipientId: userIdStr, status: "pending" });
    }

    const requestsList = [];
    for (const p of pending) {
      const requesterProfile = await UserService.findById(p.requesterId);
      if (requesterProfile) {
        const obj = typeof requesterProfile.toObject === "function" ? requesterProfile.toObject() : { ...requesterProfile };
        delete obj.password_hash;
        delete obj.refreshToken;
        requestsList.push(obj);
      }
    }
    return requestsList;
  }

  static async sendRoomInvite(sender, targetFriendId, roomCode) {
    const senderIdStr = sender._id.toString();
    const targetIdStr = targetFriendId.toString();

    // Verify friendship exists and is accepted
    const friendship = await this.findFriendship(senderIdStr, targetIdStr);
    if (!friendship || friendship.status !== "accepted") {
      throw new ApiError(400, "You can only invite accepted friends.");
    }

    // Trigger push notification asynchronously to target friend
    const { NotificationService } = await import("../notification/notification.service.js");
    NotificationService.sendNotification(targetIdStr, {
      title: "Game Invitation",
      body: `${sender.username} invited you to join room ${roomCode}.`,
      icon: "/assets/icons/icon-192x192.png",
      tag: "room_invite",
      data: { roomCode }
    }).catch((err) => console.error("Async push room invite failed:", err.message));

    // Retrieve active socket mapping
    const { userSocketMap } = await import("../../config/socket.js");
    const targetSocketId = userSocketMap.get(targetIdStr);

    if (targetSocketId) {
      // Emit real-time room invite notification via Socket.io
      getIO().to(targetSocketId).emit("room_invite", {
        roomCode,
        sender: {
          userId: senderIdStr,
          username: sender.username,
          avatar: sender.avatar
        },
        timestamp: new Date()
      });
      return { sent: true };
    }

    return { sent: false, message: "Friend is currently offline. Push notification dispatched." };
  }

  // Helper: Locates friendship in either direction
  static async findFriendship(userAId, userBId) {
    if (process.env.USE_MOCK_DB === "true") {
      return mockFriendships.find(
        (f) =>
          (f.requesterId === userAId && f.recipientId === userBId) ||
          (f.requesterId === userBId && f.recipientId === userAId)
      );
    }
    return await Friendship.findOne({
      $or: [
        { requesterId: userAId, recipientId: userBId },
        { requesterId: userBId, recipientId: userAId }
      ]
    });
  }
}

export { FriendService, mockFriendships };
