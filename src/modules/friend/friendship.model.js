import mongoose, { Schema } from "mongoose";

const friendshipSchema = new Schema(
  {
    requesterId: {
      type: String,
      required: true,
      index: true
    },
    recipientId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate friendships
friendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

export const Friendship = mongoose.model("Friendship", friendshipSchema);
