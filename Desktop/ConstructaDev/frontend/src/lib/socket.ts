import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
  // Token is read fresh on every connect/reconnect attempt
  auth: (cb) => {
    cb({ token: localStorage.getItem("access_token") ?? "" });
  },
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2_000,
  transports: ["websocket"],
});

export default socket;
