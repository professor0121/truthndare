import mongoose, { Schema } from "mongoose";

const roomPlayerSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ""
  },
  score: {
    type: Number,
    default: 0
  },
  isHost: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const roomSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    hostId: {
      type: String,
      required: true
    },
    maxPlayers: {
      type: Number,
      default: 8,
      min: 2,
      max: 20
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private"
    },
    status: {
      type: String,
      enum: ["lobby", "playing", "finished"],
      default: "lobby"
    },
    players: [roomPlayerSchema]
  },
  {
    timestamps: true
  }
);

export const Room = mongoose.model("Room", roomSchema);
export const RoomPlayer = mongoose.model("RoomPlayer", roomPlayerSchema); // Optional export
