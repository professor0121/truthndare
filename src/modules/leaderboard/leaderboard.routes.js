import { Router } from "express";
import { getGlobalLeaderboard, getRoomLeaderboard } from "./leaderboard.controller.js";
import { verifyJWT } from "../../middleware/auth.middleware.js";

const router = Router();

// Require authentication for all leaderboard queries
router.use(verifyJWT);

router.route("/global").get(getGlobalLeaderboard);
router.route("/room/:code").get(getRoomLeaderboard);

export default router;
