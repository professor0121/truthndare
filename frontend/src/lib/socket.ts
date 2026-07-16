import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (socketInstance) {
    if (token && socketInstance.auth && (socketInstance.auth as any).token !== token) {
      // If token changed, disconnect and reconnect with the new token
      socketInstance.disconnect();
      socketInstance.auth = { token };
      socketInstance.connect();
    }
    return socketInstance;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
  
  socketInstance = io(socketUrl, {
    auth: {
      token,
    },
    autoConnect: false,
    withCredentials: true,
  });

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
