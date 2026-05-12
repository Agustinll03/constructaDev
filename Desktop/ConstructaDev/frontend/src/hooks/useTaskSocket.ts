import { useEffect, useRef } from "react";
import socket from "../lib/socket";
import type { TaskStatus } from "../types/index";

export interface TaskUpdatedPayload {
  taskId: number;
  obraId: number;
  responsableId: number | null;
  status: TaskStatus;
  estimatedProgress: number;
  dueDate: string | null;
  updatedAt: string;
}

/**
 * Subscribes to `task_updated` WebSocket events for the given obra.
 *
 * Uses a ref for the callback so this effect never re-runs when the
 * callback identity changes — no duplicate listeners, no stale closures.
 *
 * Connects the socket if not already connected, and disconnects on unmount
 * only if no other consumers are registered (socket is a shared singleton).
 */
export function useTaskSocket(
  obraId: number,
  onTaskUpdated: (payload: TaskUpdatedPayload) => void
): void {
  const callbackRef = useRef(onTaskUpdated);
  callbackRef.current = onTaskUpdated;

  useEffect(() => {
    if (!socket.connected) socket.connect();

    function handler(payload: TaskUpdatedPayload) {
      if (payload.obraId === obraId) {
        callbackRef.current(payload);
      }
    }

    socket.on("task_updated", handler);

    return () => {
      socket.off("task_updated", handler);
    };
  }, [obraId]);
}
