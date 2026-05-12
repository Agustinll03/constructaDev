import { useState } from "react";
import { Activity, ArrowRight } from "lucide-react";
import type { HistorialEvento, Task, TaskStatus } from "../types/index";
import { StatusBadge } from "./ui/StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

type HistorialFilter = "todos" | "tareas" | "alertas" | "obra" | "sistema";
type ChangeEntry = { from: unknown; to: unknown; from_label?: unknown; to_label?: unknown };

// ─── Config ───────────────────────────────────────────────────────────────────

const FILTERS: { id: HistorialFilter; label: string }[] = [
  { id: "todos",   label: "Todos" },
  { id: "tareas",  label: "Tareas" },
  { id: "alertas", label: "Alertas" },
  { id: "obra",    label: "Obra" },
  { id: "sistema", label: "Chatbot / Sistema" },
];

const FIELD_LABELS: Record<string, string> = {
  title:              "título",
  description:        "descripción",
  responsible_id:     "responsable",
  start_date:         "fecha de inicio",
  due_date:           "fecha de vencimiento",
  estimated_progress: "avance",
  depends_on_id:      "dependencia",
  order_index:        "orden",
};

const VALID_STATUSES = new Set([
  "pendiente", "en_progreso", "bloqueada", "en_revision", "completada", "cancelada",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (field === "start_date" || field === "due_date") {
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    }
  }
  if (field === "estimated_progress") return `${value}%`;
  return String(value);
}

function getActionLabel(ev: HistorialEvento): string {
  switch (ev.event_type) {
    case "task_created":        return "Tarea creada";
    case "task_deleted":        return "Tarea eliminada";
    case "task_status_changed": return "Estado actualizado";
    case "task_rescheduled":    return "Fecha reprogramada";
    case "alert_created":       return "Alerta generada";
    case "obra_created":        return "Obra creada";
    case "obra_updated":        return "Obra actualizada";
    case "task_updated": {
      const changes = ev.payload?.changes as Record<string, unknown> | undefined;
      if (changes) {
        const fields = Object.keys(changes);
        if (fields.length === 1) {
          switch (fields[0]) {
            case "due_date":            return "Fecha reprogramada";
            case "responsible_id":      return "Responsable actualizado";
            case "title":               return "Título actualizado";
            case "description":         return "Descripción actualizada";
            case "estimated_progress":  return "Avance actualizado";
            case "start_date":          return "Fecha de inicio actualizada";
          }
        }
      }
      return "Tarea actualizada";
    }
    default:
      return ev.event_type;
  }
}

function getDotColor(ev: HistorialEvento): string {
  switch (ev.event_type) {
    case "task_created":        return "bg-constructa-success";
    case "task_updated":        return "bg-constructa-warning";
    case "task_status_changed": return "bg-constructa-info";
    case "task_rescheduled":    return "bg-constructa-info";
    case "task_deleted":        return "bg-constructa-danger";
    case "alert_created":       return "bg-constructa-warning";
    default:                    return "bg-constructa-border";
  }
}

function getTaskTitle(ev: HistorialEvento, tasks?: Task[]): string | null {
  if (!ev.event_type.startsWith("task_")) return null;

  if (ev.task_id && tasks) {
    const t = tasks.find((t) => t.id === ev.task_id);
    if (t) return t.title;
  }

  if (ev.event_type === "task_deleted" && ev.payload?.title) {
    return String(ev.payload.title);
  }

  for (const re of [/Task '(.+?)' created/, /[«'"](.+?)[»'"]/, /tarea «(.+?)»/i, /tarea '(.+?)'/i]) {
    const m = ev.description.match(re);
    if (m) return m[1];
  }

  return null;
}

function matchesFilter(ev: HistorialEvento, filter: HistorialFilter): boolean {
  switch (filter) {
    case "tareas":  return ev.event_type.startsWith("task_");
    case "alertas": return ev.event_type === "alert_created";
    case "obra":    return ev.event_type.startsWith("obra_");
    case "sistema": return ev.triggered_by === "chatbot" || ev.triggered_by === "system";
    default:        return true;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActorPill({ triggeredBy }: { triggeredBy: string }) {
  if (triggeredBy === "chatbot") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 border border-green-200 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
        WhatsApp
      </span>
    );
  }
  if (triggeredBy === "user") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
        Jefe de obra · Panel web
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
      Sistema
    </span>
  );
}

function ChangeDetail({ ev }: { ev: HistorialEvento }) {
  if (ev.event_type === "task_status_changed" && ev.payload?.from && ev.payload?.to) {
    const from = String(ev.payload.from);
    const to   = String(ev.payload.to);
    if (VALID_STATUSES.has(from) && VALID_STATUSES.has(to)) {
      return (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge status={from as TaskStatus} />
          <ArrowRight className="w-3.5 h-3.5 text-constructa-border flex-shrink-0" />
          <StatusBadge status={to as TaskStatus} />
        </div>
      );
    }
  }

  if (ev.event_type === "task_rescheduled") {
    const from = ev.payload?.from
      ? formatFieldValue("due_date", ev.payload.from)
      : "Sin fecha";
    const to = ev.payload?.to
      ? formatFieldValue("due_date", ev.payload.to)
      : "Sin fecha";
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-constructa-border line-through">{from}</span>
        <ArrowRight className="w-3 h-3 text-constructa-border flex-shrink-0" />
        <span className="text-xs font-semibold text-constructa-text">{to}</span>
      </div>
    );
  }

  if (ev.event_type === "task_updated" && ev.payload?.changes) {
    const changes = ev.payload.changes as Record<string, ChangeEntry>;
    const entries = Object.entries(changes);
    if (entries.length === 0) return null;

    if (entries.length === 1) {
      const [field, entry] = entries[0];
      const from = entry.from_label !== undefined
        ? String(entry.from_label)
        : formatFieldValue(field, entry.from);
      const to = entry.to_label !== undefined
        ? String(entry.to_label)
        : formatFieldValue(field, entry.to);
      return (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-constructa-border line-through">{from}</span>
          <ArrowRight className="w-3 h-3 text-constructa-border flex-shrink-0" />
          <span className="text-xs font-semibold text-constructa-text">{to}</span>
        </div>
      );
    }

    return (
      <ul className="mt-2 space-y-1">
        {entries.map(([field, entry]) => {
          const from = entry.from_label !== undefined
            ? String(entry.from_label)
            : formatFieldValue(field, entry.from);
          const to = entry.to_label !== undefined
            ? String(entry.to_label)
            : formatFieldValue(field, entry.to);
          return (
            <li key={field} className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="text-constructa-secondaryText font-medium flex-shrink-0">
                {FIELD_LABELS[field] ?? field}:
              </span>
              <span className="text-constructa-border line-through">{from}</span>
              <ArrowRight className="w-2.5 h-2.5 text-constructa-border flex-shrink-0" />
              <span className="font-semibold text-constructa-text">{to}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HistorialPanelProps {
  events: HistorialEvento[];
  tasks?: Task[];
  filterable?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistorialPanel({ events, tasks, filterable = false }: HistorialPanelProps) {
  const [filter, setFilter] = useState<HistorialFilter>("todos");

  const displayed = filterable
    ? events.filter((ev) => matchesFilter(ev, filter))
    : events;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-constructa-secondaryText text-sm gap-2">
        <Activity className="w-7 h-7 opacity-30" />
        <span>No hay eventos registrados.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Filter pills ── */}
      {filterable && (
        <div className="flex items-center gap-1 flex-wrap bg-constructa-surface rounded p-1 w-fit">
          {FILTERS.map(({ id, label }) => {
            const isActive = filter === id;
            const count = id === "todos"
              ? events.length
              : events.filter((ev) => matchesFilter(ev, id)).length;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={[
                  "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-white shadow-sm text-constructa-text"
                    : "text-constructa-secondaryText hover:text-constructa-text",
                ].join(" ")}
              >
                {label}
                <span
                  className={[
                    "ml-1.5 text-[10px] font-bold",
                    isActive ? "text-constructa-secondaryText" : "text-constructa-border",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty filtered state ── */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-constructa-secondaryText text-sm gap-2">
          <Activity className="w-7 h-7 opacity-30" />
          <span>No hay eventos con este filtro.</span>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-constructa-surface" />
          <ol className="space-y-0">
            {displayed.map((ev) => {
              const taskTitle   = getTaskTitle(ev, tasks);
              const actionLabel = getActionLabel(ev);
              const dotColor    = getDotColor(ev);

              return (
                <li key={ev.id} className="flex gap-3 pb-5 last:pb-0">
                  {/* Timeline dot */}
                  <span
                    className={`mt-1.5 w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-white ${dotColor}`}
                  />

                  {/* Card */}
                  <div className="flex-1 min-w-0 bg-white border border-constructa-border rounded-lg px-3 py-2.5 shadow-sm">
                    {/* Row 1: actor + datetime */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <ActorPill triggeredBy={ev.triggered_by} />
                      <time className="text-[11px] text-constructa-border whitespace-nowrap flex-shrink-0 leading-4 mt-0.5">
                        {formatDateTime(ev.created_at)}
                      </time>
                    </div>

                    {/* Row 2: action */}
                    <p className="text-sm font-semibold text-constructa-text leading-tight">
                      {actionLabel}
                    </p>

                    {/* Row 3: task name */}
                    {taskTitle && (
                      <p className="text-xs text-constructa-secondaryText mt-0.5">
                        Tarea:{" "}
                        <span className="font-medium text-constructa-text">{taskTitle}</span>
                      </p>
                    )}

                    {/* Row 4: change detail */}
                    <ChangeDetail ev={ev} />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
