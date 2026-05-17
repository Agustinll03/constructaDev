import { io } from "socket.io-client";
import { getToken } from "./tokenStorage";

const socket = io("http://localhost:8000", {
  auth: (cb) => {
    cb({ token: getToken() ?? "" });
  },
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1_000,
  transports: ["websocket", "polling"],
});

if (import.meta.env.DEV) {
  socket.on("connect", () => console.log("[socket] connected sid=", socket.id));
  socket.on("disconnect", (reason) => console.log("[socket] disconnected reason=", reason));
  socket.on("connect_error", (err) => console.error("[socket] connect_error", err.message));
  socket.on("online_users", (d) => console.log("[socket] online_users", d));
  socket.on("presence_update", (d) => console.log("[socket] presence_update", d));
}

export default socket;
