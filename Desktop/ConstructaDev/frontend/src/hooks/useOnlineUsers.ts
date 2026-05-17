import { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";
import { useUser } from "../context/UserContext";

export interface OnlineUser {
  id: number;
  name: string;
  initials: string;
  color: string;
}

interface OnlineUsersPayload {
  users: OnlineUser[];
}

interface PresencePayload {
  obra_id: number;
  viewers: OnlineUser[];
  editing: Record<string, OnlineUser>;
}

/** Usuarios conectados globalmente (excluye al usuario actual). */
export function useOnlineUsers(): OnlineUser[] {
  const { user } = useUser();
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const userIdRef = useRef(user.id);
  userIdRef.current = user.id;

  useEffect(() => {
    if (!socket.connected) socket.connect();

    function handler({ users }: OnlineUsersPayload) {
      setOnline(users.filter(u => u.id !== userIdRef.current));
    }

    function onConnect() {
      socket.emit("request_online_users");
    }

    socket.on("online_users", handler);
    socket.on("connect", onConnect);

    // If already connected, request immediately (might have missed the initial broadcast)
    if (socket.connected) socket.emit("request_online_users");

    return () => {
      socket.off("online_users", handler);
      socket.off("connect", onConnect);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return online;
}

/** Usuarios viendo activamente una obra específica (excluye al usuario actual). */
export function useViewingUsers(obraId: number): OnlineUser[] {
  const { user } = useUser();
  const [viewers, setViewers] = useState<OnlineUser[]>([]);
  const obraIdRef = useRef(obraId);
  const userIdRef = useRef(user.id);
  obraIdRef.current = obraId;
  userIdRef.current = user.id;

  useEffect(() => {
    if (!socket.connected) socket.connect();

    function emitJoin() {
      socket.emit("join_obra", { obra_id: obraIdRef.current });
    }

    function handlePresence({ obra_id, viewers: v }: PresencePayload) {
      if (obra_id !== obraIdRef.current) return;
      setViewers(v.filter(u => u.id !== userIdRef.current));
    }

    emitJoin();
    socket.on("presence_update", handlePresence);
    socket.on("connect", emitJoin);

    return () => {
      socket.emit("leave_obra", { obra_id: obraIdRef.current });
      socket.off("presence_update", handlePresence);
      socket.off("connect", emitJoin);
      setViewers([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId]);

  return viewers;
}
