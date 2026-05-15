import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!socket.connected) socket.connect();

    function handler({ users }: OnlineUsersPayload) {
      setOnline(users.filter(u => u.id !== user.id));
    }

    socket.on("online_users", handler);
    return () => { socket.off("online_users", handler); };
  }, [user.id]);

  return online;
}

/** Usuarios viendo activamente una obra específica (excluye al usuario actual). */
export function useViewingUsers(obraId: number): OnlineUser[] {
  const { user } = useUser();
  const [viewers, setViewers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit("join_obra", { obra_id: obraId });

    function handler({ obra_id, viewers: v }: PresencePayload) {
      if (obra_id !== obraId) return;
      setViewers(v.filter(u => u.id !== user.id));
    }

    socket.on("presence_update", handler);

    return () => {
      socket.emit("leave_obra", { obra_id: obraId });
      socket.off("presence_update", handler);
    };
  }, [obraId, user.id]);

  return viewers;
}
