import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: function () {
        return this.role === "registered";
      },
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true // Allows multiple guest users (who have no email) to bypass unique index constraint
    },
    password_hash: {
      type: String,
      required: function () {
        return this.role === "registered";
      }
    },
    role: {
      type: String,
      enum: ["registered", "guest", "admin"],
      default: "registered"
    },
    coins: {
      type: Number,
      default: 100
    },
    xp: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    avatar: {
      type: String,
      default: ""
    },
    refreshToken: {
      type: String
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    isMuted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: hashes the password before storing in DB if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password_hash") || !this.password_hash) {
    return next();
  }
  try {
    this.password_hash = await bcrypt.hash(this.password_hash, 10);
    return next();
  } catch (error) {
    return next(error);
  }
});

// Instance method to check password
userSchema.methods.isPasswordCorrect = async function (password) {
  if (!this.password_hash) return false;
  return await bcrypt.compare(password, this.password_hash);
};

// Instance method to sign a JWT access token
userSchema.methods.generateAccessToken = function () {
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
};

// Instance method to sign a JWT refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d"
    }
  );
};

export const User = mongoose.model("User", userSchema);
