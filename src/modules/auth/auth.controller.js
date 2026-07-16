import { AuthService } from "./auth.service.js";
import { UserService } from "../user/user.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax"
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const createdUser = await AuthService.register(email, username, password);

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully."));
});

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const { user, accessToken, refreshToken } = await AuthService.login(identifier, password);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        "User logged in successfully."
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await AuthService.logout(req.user._id);

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully."));
});

const refreshTokens = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  const { accessToken, newRefreshToken } = await AuthService.refreshAccessToken(incomingRefreshToken);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", newRefreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Tokens refreshed successfully."
      )
    );
});

const guestLoginUser = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await AuthService.guestLogin();

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        "Guest user logged in successfully."
      )
    );
});

const convertGuestUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const { user, accessToken, refreshToken } = await AuthService.convertGuest(
    req.user._id,
    email,
    username,
    password
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        "Guest account converted to registered account successfully."
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user profile retrieved."));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { xp, avatar, role } = req.body;
  const user = await UserService.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (xp !== undefined) user.xp = xp;
  if (avatar !== undefined) user.avatar = avatar;
  if (role !== undefined) user.role = role;

  await user.save();

  // If Redis is active, update their score in the leaderboard cache
  const { LeaderboardService } = await import("../leaderboard/leaderboard.service.js");
  await LeaderboardService.updateUserScore(user);

  const cleanUser = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete cleanUser.password_hash;
  delete cleanUser.refreshToken;

  return res
    .status(200)
    .json(new ApiResponse(200, cleanUser, "User profile updated successfully."));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokens,
  guestLoginUser,
  convertGuestUser,
  getCurrentUser,
  updateProfile
};
