import { Router } from "express";
import { getVapidPublicKey, registerSubscription } from "./notification.controller.js";
import { verifyJWT } from "../../middleware/auth.middleware.js";

const router = Router();

// Protect all notification routes
router.use(verifyJWT);

router.route("/vapid-key").get(getVapidPublicKey);
router.route("/subscribe").post(registerSubscription);

export default router;
