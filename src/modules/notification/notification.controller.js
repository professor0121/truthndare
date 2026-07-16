import { NotificationService } from "./notification.service.js";
import { getPublicKey } from "../../config/webpush.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getVapidPublicKey = asyncHandler(async (req, res) => {
  const publicKey = getPublicKey();
  return res
    .status(200)
    .json(new ApiResponse(200, { publicKey }, "VAPID public key retrieved successfully."));
});

const registerSubscription = asyncHandler(async (req, res) => {
  const subscription = await NotificationService.subscribe(req.user._id, req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, subscription, "Push subscription registered successfully."));
});

export {
  getVapidPublicKey,
  registerSubscription
};
