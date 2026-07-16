import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { UserService } from "../modules/user/user.service.js";
import { registerRoomHandlers } from "../modules/room/room.socket.js";

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true
    }
  });

  // Authentication handshake middleware for sockets
  io.use(async (socket, next) => {
    try {
      // Retrieve token from connection auth details, authorization headers, or cookies
      let token = socket.handshake.auth?.token || 
                  socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token && socket.handshake.headers?.cookie) {
        token = parseCookie(socket.handshake.headers.cookie)?.accessToken;
      }

      if (!token) {
        return next(new Error("Authentication failed: Access token missing."));
      }

      // Verify Access Token
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await UserService.findById(decodedToken?._id);

      if (!user) {
        return next(new Error("Authentication failed: User not found."));
      }

      // Convert user mongoose document to plain object
      const userObj = typeof user.toObject === "function" ? user.toObject() : { ...user };
      delete userObj.password_hash;
      delete userObj.refreshToken;

      socket.user = userObj;
      return next();
    } catch (error) {
      return next(new Error("Authentication failed: Invalid access token."));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.user.username})`);

    // Register handlers from room feature module
    registerRoomHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id} (User: ${socket.user?.username})`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};

/**
 * Utility function to parse cookies from headers.
 */
function parseCookie(cookieStr) {
  return cookieStr
    .split(";")
    .reduce((res, c) => {
      const [key, val] = c.trim().split("=");
      if (key && val) res[key] = decodeURIComponent(val);
      return res;
    }, {});
}

export { initSocket, getIO };
