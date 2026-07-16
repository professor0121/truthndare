import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserService } from "../modules/user/user.service.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get token from cookies or authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Access denied. Token missing.");
    }

    // Verify token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Get user via UserService
    const user = await UserService.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid access token. User not found.");
    }

    // Convert to plain object and remove sensitive fields
    const userObj = typeof user.toObject === "function" ? user.toObject() : { ...user };
    delete userObj.password_hash;
    delete userObj.refreshToken;

    // Attach user information to request
    req.user = userObj;
    return next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token.");
  }
});

export { verifyJWT };
