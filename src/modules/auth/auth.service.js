import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";
import { UserService } from "../user/user.service.js";

class AuthService {
  /**
   * Helper function to generate and save access and refresh tokens.
   */
  static async generateAccessAndRefreshTokens(userId) {
    try {
      const user = await UserService.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      // Save refresh token to user document
      await UserService.updateRefreshToken(userId, refreshToken);

      return { accessToken, refreshToken };
    } catch (error) {
      throw new ApiError(500, "Error generating access and refresh tokens.");
    }
  }

  static async register(email, username, password) {
    const existingUser = await UserService.findByUsernameOrEmail(username);
    if (existingUser) {
      throw new ApiError(409, "Username or email is already registered.");
    }

    const existingEmail = await UserService.findByEmail(email);
    if (existingEmail) {
      throw new ApiError(409, "Email is already registered.");
    }

    const user = await UserService.createUser({
      email,
      username,
      password_hash: password, // pre-save hook in user model will hash this
      role: "registered"
    });

    // Remove password hash from response object
    const createdUser = user.toObject();
    delete createdUser.password_hash;

    return createdUser;
  }

  static async login(identifier, password) {
    const user = await UserService.findByUsernameOrEmail(identifier);
    if (!user) {
      throw new ApiError(401, "Invalid username/email or password.");
    }

    if (user.role === "guest") {
      throw new ApiError(400, "Guest accounts cannot log in with a password. Please register or convert your account.");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid username/email or password.");
    }

    const { accessToken, refreshToken } = await this.generateAccessAndRefreshTokens(user._id);

    const loggedInUser = user.toObject();
    delete loggedInUser.password_hash;
    delete loggedInUser.refreshToken;

    return { user: loggedInUser, accessToken, refreshToken };
  }

  static async logout(userId) {
    await UserService.clearRefreshToken(userId);
  }

  static async refreshAccessToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is missing.");
    }

    try {
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await UserService.findById(decodedToken?._id);

      if (!user) {
        throw new ApiError(401, "Invalid refresh token. User not found.");
      }

      if (user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is expired or has been reuse-detected.");
      }

      const { accessToken, refreshToken: newRefreshToken } = await this.generateAccessAndRefreshTokens(user._id);

      return { accessToken, newRefreshToken };
    } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token.");
    }
  }

  static async guestLogin() {
    let isUnique = false;
    let username = "";

    // Generate unique guest username
    while (!isUnique) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      username = `guest_${randomSuffix}`;
      const existing = await UserService.findByUsername(username);
      if (!existing) {
        isUnique = true;
      }
    }

    const user = await UserService.createUser({
      username,
      role: "guest",
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
    });

    const { accessToken, refreshToken } = await this.generateAccessAndRefreshTokens(user._id);

    const guestUser = user.toObject();
    delete guestUser.refreshToken;

    return { user: guestUser, accessToken, refreshToken };
  }

  static async convertGuest(userId, email, username, password) {
    const user = await UserService.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    if (user.role !== "guest") {
      throw new ApiError(400, "Account is already registered.");
    }

    // Check if new username or email is already taken
    const existingUsername = await UserService.findByUsername(username);
    if (existingUsername && existingUsername._id.toString() !== userId) {
      throw new ApiError(409, "Username is already taken.");
    }

    const existingEmail = await UserService.findByEmail(email);
    if (existingEmail && existingEmail._id.toString() !== userId) {
      throw new ApiError(409, "Email is already taken.");
    }

    // Convert guest user fields
    user.email = email;
    user.username = username;
    user.password_hash = password; // pre-save hook hashes this
    user.role = "registered";

    await user.save();

    const { accessToken, refreshToken } = await this.generateAccessAndRefreshTokens(user._id);

    const updatedUser = user.toObject();
    delete updatedUser.password_hash;
    delete updatedUser.refreshToken;

    return { user: updatedUser, accessToken, refreshToken };
  }
}

export { AuthService };
