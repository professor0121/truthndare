import { Router } from "express";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomDetails,
  getPublicLobbies,
  getActiveRoom
} from "./room.controller.js";
import {
  startGame,
  spinBottle,
  chooseType,
  submitOutcome,
  endGame
} from "./game.controller.js";
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
router.route("/active").get(getActiveRoom);
router.route("/code/:code").get(getRoomDetails);

// Game Control routes
router.route("/code/:code/start").post(startGame);
router.route("/code/:code/spin").post(spinBottle);
router.route("/code/:code/choice").post(chooseType); // expects { type: "truth" | "dare" } in body
router.route("/code/:code/submit").post(submitOutcome); // expects { outcome: "completed" | "skipped" } in body
router.route("/code/:code/end").post(endGame);

export default router;
