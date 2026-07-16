import { FriendService } from "./friend.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const sendRequest = asyncHandler(async (req, res) => {
  const { recipientUsername } = req.body;
  const friendship = await FriendService.sendFriendRequest(req.user._id, recipientUsername);

  return res
    .status(201)
    .json(new ApiResponse(201, friendship, "Friend request sent successfully."));
});

const acceptRequest = asyncHandler(async (req, res) => {
  const { requesterId } = req.body;
  const friendship = await FriendService.acceptFriendRequest(req.user._id, requesterId);

  return res
    .status(200)
    .json(new ApiResponse(200, friendship, "Friend request accepted."));
});

const declineRequest = asyncHandler(async (req, res) => {
  const { requesterId } = req.body;
  const result = await FriendService.declineFriendRequest(req.user._id, requesterId);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Friend request declined."));
});

const removeFriend = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const result = await FriendService.removeFriend(req.user._id, friendId);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Friend removed successfully."));
});

const getFriendsList = asyncHandler(async (req, res) => {
  const friends = await FriendService.getFriendsList(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, friends, "Friends list retrieved."));
});

const getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await FriendService.getPendingRequests(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, requests, "Pending friend requests retrieved."));
});

const sendInvite = asyncHandler(async (req, res) => {
  const { friendUserId, roomCode } = req.body;
  const result = await FriendService.sendRoomInvite(req.user, friendUserId, roomCode);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.sent ? "Room invitation sent successfully." : "Room invitation failed: friend is offline."
      )
    );
});

export {
  sendRequest,
  acceptRequest,
  declineRequest,
  removeFriend,
  getFriendsList,
  getPendingRequests,
  sendInvite
};
