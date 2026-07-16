import mongoose, { Schema } from "mongoose";

const questionSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["truth", "dare"],
      required: true
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
    category: {
      type: String,
      enum: ["funny", "personal", "embarrassing", "18+"],
      default: "funny"
    },
    language: {
      type: String,
      default: "en"
    },
    isAI: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: String,
      default: null // null indicates pre-saved system questions
    }
  },
  {
    timestamps: true
  }
);

export const Question = mongoose.model("Question", questionSchema);
