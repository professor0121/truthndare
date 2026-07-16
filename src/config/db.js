import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  if (process.env.USE_MOCK_DB === "true") {
    console.log("⚠️  Using Mock In-Memory Database (USE_MOCK_DB=true). MongoDB connection bypassed.");
    return;
  }
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`\nMongoDB connected successfully! Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection FAILED: ", error);
    console.log("💡 Tip: Set USE_MOCK_DB=true in your .env file to run without a local MongoDB service.");
    process.exit(1);
  }
};

export default connectDB;
