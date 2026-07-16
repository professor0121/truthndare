import { User } from "./user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Local in-memory storage for mock mode fallback
const mockUsers = [];

const createMockUserInstance = (userData) => {
  const userObj = {
    _id: userData._id || Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11),
    username: userData.username.toLowerCase(),
    email: userData.email ? userData.email.toLowerCase() : undefined,
    password_hash: userData.password_hash || undefined,
    role: userData.role || "registered",
    coins: userData.coins !== undefined ? userData.coins : 100,
    xp: userData.xp !== undefined ? userData.xp : 0,
    level: userData.level !== undefined ? userData.level : 1,
    avatar: userData.avatar || "",
    refreshToken: userData.refreshToken || undefined,
    createdAt: userData.createdAt || new Date(),
    updatedAt: userData.updatedAt || new Date()
  };

  // Define helper methods to mirror mongoose document behavior
  const instance = {
    ...userObj,
    toObject: function () {
      const copy = { ...this };
      delete copy.toObject;
      delete copy.save;
      delete copy.isPasswordCorrect;
      delete copy.generateAccessToken;
      delete copy.generateRefreshToken;
      return copy;
    },
    save: async function () {
      const idx = mockUsers.findIndex((u) => u._id === this._id);
      if (idx !== -1) {
        // Hash password if modified (and not already hashed)
        if (this.password_hash && this.password_hash !== mockUsers[idx].password_hash && !this.password_hash.startsWith("$2a$")) {
          this.password_hash = await bcrypt.hash(this.password_hash, 10);
        }
        this.updatedAt = new Date();
        mockUsers[idx] = this; // Update reference in local store
      }
      return this;
    },
    isPasswordCorrect: async function (password) {
      if (!this.password_hash) return false;
      return await bcrypt.compare(password, this.password_hash);
    },
    generateAccessToken: function () {
      return jwt.sign(
        {
          _id: this._id,
          email: this.email,
          username: this.username,
          role: this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m"
        }
      );
    },
    generateRefreshToken: function () {
      return jwt.sign(
        {
          _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d"
        }
      );
    }
  };

  return instance;
};

class UserService {
  static async findById(id) {
    if (process.env.USE_MOCK_DB === "true") {
      const user = mockUsers.find((u) => u._id === id);
      return user ? user : null;
    }
    return await User.findById(id);
  }

  static async findByUsernameOrEmail(identifier) {
    if (!identifier) return null;
    const normalized = identifier.toLowerCase();
    
    if (process.env.USE_MOCK_DB === "true") {
      const user = mockUsers.find(
        (u) => u.username === normalized || u.email === normalized
      );
      return user ? user : null;
    }
    
    return await User.findOne({
      $or: [
        { email: normalized },
        { username: normalized }
      ]
    });
  }

  static async findByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase();

    if (process.env.USE_MOCK_DB === "true") {
      const user = mockUsers.find((u) => u.email === normalized);
      return user ? user : null;
    }

    return await User.findOne({ email: normalized });
  }

  static async findByUsername(username) {
    if (!username) return null;
    const normalized = username.toLowerCase();

    if (process.env.USE_MOCK_DB === "true") {
      const user = mockUsers.find((u) => u.username === normalized);
      return user ? user : null;
    }

    return await User.findOne({ username: normalized });
  }

  static async createUser(userData) {
    if (process.env.USE_MOCK_DB === "true") {
      // Hash password if registering a new user with password
      let passwordHash = undefined;
      if (userData.password_hash) {
        passwordHash = await bcrypt.hash(userData.password_hash, 10);
      }
      
      const newUserInstance = createMockUserInstance({
        ...userData,
        password_hash: passwordHash
      });
      mockUsers.push(newUserInstance);
      return newUserInstance;
    }
    return await User.create(userData);
  }

  static async updateRefreshToken(userId, refreshToken) {
    if (process.env.USE_MOCK_DB === "true") {
      const user = await this.findById(userId);
      if (user) {
        user.refreshToken = refreshToken;
        await user.save();
      }
      return user;
    }
    return await User.findByIdAndUpdate(
      userId,
      { $set: { refreshToken } },
      { new: true }
    );
  }

  static async clearRefreshToken(userId) {
    if (process.env.USE_MOCK_DB === "true") {
      const user = await this.findById(userId);
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
      return user;
    }
    return await User.findByIdAndUpdate(
      userId,
      { $unset: { refreshToken: 1 } },
      { new: true }
    );
  }
}

export { UserService };
