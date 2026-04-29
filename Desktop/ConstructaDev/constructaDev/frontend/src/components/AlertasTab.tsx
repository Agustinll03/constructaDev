import { useState } from "react";
import { Bell, CheckCheck, CheckSquare, ArrowRight } from "lucide-react";
import { Button } from "./ui/Button";
import type { Alert, AlertType, Task } from "../types";

// ─── Config ───────────────────────────────────────────────────────────────────

type Filter = "todas" | "no_leidas" | "leidas";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "no_leidas", label: "No leídas" },
  { id: "todas",     label: "Todas" },
  { id: "leidas",    label: "Leídas" },
];

function getAlertLabel(alert: Alert): string {
  if (alert.type === "task_blocked") return "Tarea bloqueada";
  const msg = alert.message.toLowerCase();
  if (msg.includes("responsable"))  return "Sin responsable";
  if (msg.includes("vencida"))      return "Tarea vencida";
  if (msg.includes("avance"))       return "Avance inconsistente";
  return "Riesgo de demora";
}

const TYPE_STYLE: Record<AlertType, { bar: string; badge: string }> = {
  task_blocked: {
    bar:   "bg-constructa-danger",
    badge: "bg-red-100 text-constructa-danger",
  },
  delay_risk: {
    bar:   "bg-constructa-warning",
    badge: "bg-amber-100 text-amber-700",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AlertasTabProps {
  alerts: Alert[];
  tasks: Task[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onViewTask: (taskId?: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertasTab({
  alerts,
  tasks,
  onMarkRead,
  onMarkAllRead,
  onViewTask,
}: AlertasTabProps) {
  const [filter, setFilter] = useState<Filter>("no_leidas");

  const unreadAlerts  = alerts.filter((a) => !a.is_read);
  const unreadCount   = unreadAlerts.length;

  const filtered = alerts.filter((a) => {
    if (filter === "no_leidas") return !a.is_read;
    if (filter === "leidas")    return a.is_read;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Filter pills */}
        <div className="flex items-center gap-1 bg-constructa-surface rounded p-1">
          {FILTERS.map(({ id, label }) => {
            const active = filter === id;
            const count =
              id === "no_leidas"
                ? unreadCount
                : id === "leidas"
                ? alerts.length - unreadCount
                : alerts.length;

            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={[
                  "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                  active
                    ? "bg-white shadow-sm text-constructa-text"
                    : "text-constructa-secondaryText hover:text-constructa-text",
                ].join(" ")}
              >
                {label}
                <span
                  className={[
                    "ml-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold w-4 h-4",
                    active
                      ? id === "no_leidas"
                        ? "bg-constructa-danger text-white"
                        : "bg-constructa-surface text-constructa-secondaryText"
                      : "bg-transparent text-constructa-border",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mark all read */}
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            onClick={onMarkAllRead}
            className="text-xs px-3 py-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* ── Individual alert list ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-constructa-secondaryText text-sm gap-2">
          <Bell className="w-8 h-8 opacity-25" />
          <span>
            {alerts.length === 0
              ? "No hay alertas para esta obra."
              : filter === "no_leidas"
              ? "No hay alertas pendientes."
              : "No hay alertas con este filtro."}
          </span>
        </div>
      ) : (
        <div>
          <ul className="divide-y divide-constructa-surface border border-constructa-border rounded overflow-hidden bg-white">
            {filtered.map((alert) => {
              const style      = TYPE_STYLE[alert.type];
              const isRead     = alert.is_read;
              const taskExists = alert.task_id != null && tasks.some((t) => t.id === alert.task_id);
              // "Ver tarea" only for unread alerts where the linked task still exists
              const canNavigate = !isRead && taskExists;

              return (
                <li
                  key={alert.id}
                  className={[
                    "flex items-stretch gap-0 transition-opacity bg-white",
                    isRead ? "opacity-50" : "",
                  ].join(" ")}
                >
                  {/* left accent bar */}
                  <div
                    className={[
                      "w-1 flex-shrink-0",
                      isRead ? "bg-constructa-border" : style.bar,
                    ].join(" ")}
                  />

                  <div className="flex-1 px-4 py-2.5 flex items-center gap-3 min-w-0">
                    {/* Badge */}
                    <span
                      className={[
                        "hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0",
                        style.badge,
                      ].join(" ")}
                    >
                      {getAlertLabel(alert)}
                    </span>

                    {/* Message */}
                    <p className="flex-1 text-xs text-constructa-text leading-snug min-w-0">
                      {alert.message}
                    </p>

                    {/* Date */}
                    <span className="hidden md:block text-[10px] text-constructa-secondaryText flex-shrink-0 whitespace-nowrap">
                      {fmtDate(alert.created_at)}
                    </span>

                    {/* Actions — only for unread alerts */}
                    {!isRead && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canNavigate && (
                          <button
                            onClick={() => onViewTask(alert.task_id ?? undefined)}
                            title="Ver tarea"
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-constructa-secondaryText hover:text-constructa-primary hover:bg-constructa-surface transition-colors"
                          >
                            Ver tarea
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {alert.task_id != null && !taskExists && (
                          <span className="text-[10px] text-constructa-secondaryText italic px-1">
                            Tarea eliminada
                          </span>
                        )}
                        <button
                          onClick={() => onMarkRead(alert.id)}
                          title="Marcar como leída"
                          className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-text hover:bg-constructa-surface transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
