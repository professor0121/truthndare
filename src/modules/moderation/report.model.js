import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
  {
    reporterId: {
      type: String,
      required: true,
      index: true
    },
    reportedUserId: {
      type: String,
      required: true,
      index: true
    },
    contentType: {
      type: String,
      enum: ["chat", "question"],
      required: true
    },
    contentId: {
      type: String,
      default: null
    },
    contentPreview: {
      type: String,
      required: true,
      trim: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
      required: true
    },
    actionTaken: {
      type: String,
      enum: ["none", "mute", "ban", "deleted"],
      default: "none",
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const Report = mongoose.model("Report", reportSchema);
