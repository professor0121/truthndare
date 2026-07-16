import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokens,
  guestLoginUser,
  convertGuestUser,
  getCurrentUser
} from "./auth.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import {
  registerSchema,
  loginSchema,
  convertGuestSchema
} from "./auth.validator.js";

const router = Router();

// Public routes
router.route("/register").post(validate(registerSchema), registerUser);
router.route("/login").post(validate(loginSchema), loginUser);
router.route("/refresh-token").post(refreshTokens);
router.route("/guest-login").post(guestLoginUser);

// Protected routes (JWT verification required)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/convert-guest").post(verifyJWT, validate(convertGuestSchema), convertGuestUser);
router.route("/me").get(verifyJWT, getCurrentUser);

export default router;
