import { Router } from "express";
import {
  sendRequest,
  acceptRequest,
  declineRequest,
  removeFriend,
  getFriendsList,
  getPendingRequests,
  sendInvite
} from "./friend.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import {
  friendRequestSchema,
  acceptDeclineRequestSchema,
  inviteFriendSchema
} from "./friend.validator.js";

const router = Router();

// Require authentication for all friend endpoints
router.use(verifyJWT);

router.route("/").get(getFriendsList);
router.route("/pending").get(getPendingRequests);
router.route("/request").post(validate(friendRequestSchema), sendRequest);
router.route("/accept").post(validate(acceptDeclineRequestSchema), acceptRequest);
router.route("/decline").post(validate(acceptDeclineRequestSchema), declineRequest);
router.route("/invite").post(validate(inviteFriendSchema), sendInvite);
router.route("/:friendId").delete(removeFriend);

export default router;
