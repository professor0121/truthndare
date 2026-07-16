import { Router } from "express";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomDetails,
  getPublicLobbies
} from "./room.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { createRoomSchema, joinRoomSchema } from "./room.validator.js";

const router = Router();

// All room routes are protected by JWT authentication
router.use(verifyJWT);

router.route("/create").post(validate(createRoomSchema), createRoom);
router.route("/join").post(validate(joinRoomSchema), joinRoom);
router.route("/leave").post(leaveRoom); // expects { code } in body
router.route("/public").get(getPublicLobbies);
router.route("/code/:code").get(getRoomDetails);

export default router;
