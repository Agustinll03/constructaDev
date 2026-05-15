import { useEffect, useRef, useState } from "react";

export interface ActivityEvent {
  id: string;
  userId: number;
  userName: string;
  userInitials: string;
  userColor: string;
  action: string;
  target: string;
  detail?: string;
  timestamp: Date;
}

const USERS = [
  { id: 2, name: "Carlos López",  initials: "CL", color: "#2A6FDB" },
  { id: 3, name: "María Torres",  initials: "MT", color: "#1F8A5B" },
  { id: 4, name: "Roberto Díaz",  initials: "RD", color: "#8E97A0" },
];

const EVENT_TEMPLATES = [
  { action: "movió",          target: "Instalación eléctrica",  detail: "a En progreso" },
  { action: "actualizó",      target: "Cimientos",              detail: "al 75% de avance" },
  { action: "completó",       target: "Instalación sanitaria" },
  { action: "creó la tarea",  target: "Revisión estructural" },
  { action: "movió",          target: "Pintura exterior",        detail: "a Revisión" },
  { action: "actualizó",      target: "Mampostería",             detail: "al 40% de avance" },
  { action: "bloqueó",        target: "Techos",                  detail: "por falta de materiales" },
  { action: "completó",       target: "Excavación perimetral" },
  { action: "creó la tarea",  target: "Impermeabilización" },
  { action: "movió",          target: "Carpintería",             detail: "a Pendiente" },
];

function randomEvent(): ActivityEvent {
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const tpl  = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  return {
    id:           `evt-${Date.now()}-${Math.random()}`,
    userId:       user.id,
    userName:     user.name,
    userInitials: user.initials,
    userColor:    user.color,
    action:       tpl.action,
    target:       tpl.target,
    detail:       tpl.detail,
    timestamp:    new Date(),
  };
}

// Returns [events, latestEvent] — latestEvent triggers toasts
export function useActivityFeed(): [ActivityEvent[], ActivityEvent | null] {
  const [events, setEvents]   = useState<ActivityEvent[]>(() =>
    // Seed with 4 past events spaced out
    Array.from({ length: 4 }, (_, i) => {
      const e = randomEvent();
      e.timestamp = new Date(Date.now() - (i + 1) * 4 * 60 * 1000);
      return e;
    }).reverse()
  );
  const [latest, setLatest]   = useState<ActivityEvent | null>(null);
  const timerRef              = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function scheduleNext() {
      // Random interval between 20s and 40s
      const delay = 20000 + Math.random() * 20000;
      timerRef.current = setTimeout(() => {
        const evt = randomEvent();
        setEvents(prev => [...prev.slice(-19), evt]); // keep last 20
        setLatest(evt);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => clearTimeout(timerRef.current);
  }, []);

  return [events, latest];
}
