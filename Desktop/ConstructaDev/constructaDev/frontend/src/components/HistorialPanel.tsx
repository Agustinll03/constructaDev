import React, { useState } from "react";
import { Activity } from "lucide-react";
import type { HistorialEvento } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type HistorialFilter = "todos" | "tareas" | "alertas" | "obra" | "sistema";

// ─── Config ───────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  obra_created:        "Obra creada",
  obra_updated:        "Obra actualizada",
  task_created:        "Tarea creada",
  task_updated:        "Tarea actualizada",
  task_status_changed: "Cambio de estado",
  task_deleted:        "Tarea eliminada",
  alert_created:       "Alerta generada",
};

const EVENT_STYLES: Record<string, { dot: string; badge: string }> = {
  task_created:        { dot: "bg-constructa-success", badge: "bg-green-100 text-constructa-success" },
  task_updated:        { dot: "bg-constructa-warning", badge: "bg-amber-100 text-amber-700" },
  task_status_changed: { dot: "bg-constructa-info",    badge: "bg-blue-100 text-constructa-info" },
  task_deleted:        { dot: "bg-constructa-danger",  badge: "bg-red-100 text-constructa-danger" },
  alert_created:       { dot: "bg-constructa-warning", badge: "bg-amber-100 text-amber-700" },
  obra_created:        { dot: "bg-constructa-dark",    badge: "bg-constructa-surface text-constructa-dark" },
  obra_updated:        { dot: "bg-constructa-dark",    badge: "bg-constructa-surface text-constructa-secondaryText" },
};

const DEFAULT_STYLE = {
  dot:   "bg-constructa-border",
  badge: "bg-constructa-surface text-constructa-secondaryText",
};

const TRIGGERED_BY_LABEL: Record<string, string> = {
  user:    "Usuario",
  chatbot: "WhatsApp",
  system:  "Sistema",
};

const STATUS_LABELS: Record<string, string> = {
  pendiente:   "Pendiente",
  en_progreso: "En progreso",
  bloqueada:   "Bloqueada",
  en_revision: "En revisión",
  completada:  "Completada",
  cancelada:   "Cancelada",
};

const FIELD_LABELS: Record<string, string> = {
  title:              "título",
  description:        "descripción",
  responsible_id:     "responsable",
  start_date:         "fecha de inicio",
  due_date:           "fecha de vencimiento",
  estimated_progress: "avance estimado",
  depends_on_id:      "dependencia",
};

const FILTERS: { id: HistorialFilter; label: string }[] = [
  { id: "todos",   label: "Todos" },
  { id: "tareas",  label: "Tareas" },
  { id: "alertas", label: "Alertas" },
  { id: "obra",    label: "Obra" },
  { id: "sistema", label: "Chatbot / Sistema" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (field === "start_date" || field === "due_date") {
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    }
  }
  return String(value);
}

function truncateText(s: string, max = 120): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

type ChangeEntry = { from: unknown; to: unknown; from_label?: unknown; to_label?: unknown };

function renderChangesDetail(ev: HistorialEvento): React.ReactElement | null {
  if (ev.event_type !== "task_updated") return null;
  const raw = ev.payload?.changes;
  if (!raw || typeof raw !== "object") return null;
  const changes = raw as Record<string, ChangeEntry>;
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1 min-w-0 max-w-full overflow-hidden">
      {entries.map(([field, entry]) => {
        const rawFrom = entry.from_label !== undefined
          ? String(entry.from_label)
          : formatChangeValue(field, entry.from);
        const rawTo = entry.to_label !== undefined
          ? String(entry.to_label)
          : formatChangeValue(field, entry.to);
        const fromDisplay = truncateText(rawFrom);
        const toDisplay   = truncateText(rawTo);
        return (
          <li key={field} className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 text-xs min-w-0 overflow-hidden">
            <span className="font-semibold text-constructa-secondaryText flex-shrink-0">
              {FIELD_LABELS[field] ?? field}:
            </span>
            <span
              className="text-constructa-border line-through break-all"
              title={rawFrom}
            >
              {fromDisplay}
            </span>
            <span className="text-constructa-border flex-shrink-0">→</span>
            <span
              className="text-constructa-text font-medium break-all"
              title={rawTo}
            >
              {toDisplay}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function humanizeDescription(ev: HistorialEvento): string {
  const { event_type, description, payload } = ev;
  switch (event_type) {
    case "task_created": {
      // Backend produces: "Task 'X' created"
      const m = description.match(/Task '(.+)' created/);
      return m ? `Tarea «${m[1]}» creada` : description;
    }
    case "task_updated": {
      // New structured payload: { changes: { field: { from, to } } }
      if (payload?.changes && typeof payload.changes === "object") {
        const keys = Object.keys(payload.changes as Record<string, unknown>);
        if (keys.length > 0) {
          const labels = keys.map((k) => FIELD_LABELS[k] ?? k);
          return `Tarea actualizada: ${labels.join(", ")}`;
        }
      }
      // Backward compat: old flat payload
      if (payload) {
        const keys = Object.keys(payload);
        if (keys.length > 0) {
          const labels = keys.map((k) => FIELD_LABELS[k] ?? k);
          return `Campos actualizados: ${labels.join(", ")}`;
        }
      }
      return "Tarea actualizada";
    }
    case "task_status_changed": {
      if (payload?.from && payload?.to) {
        const from = STATUS_LABELS[String(payload.from)] ?? String(payload.from);
        const to   = STATUS_LABELS[String(payload.to)]   ?? String(payload.to);
        const prog = payload.progress !== undefined ? ` · ${payload.progress}%` : "";
        return `${from} → ${to}${prog}`;
      }
      return description;
    }
    case "task_deleted":
      // Already in Spanish from backend: "La tarea 'X' fue eliminada."
      return description;
    case "alert_created":
      return "Alerta generada por el sistema";
    case "obra_created":
      return "Obra registrada en el sistema";
    case "obra_updated":
      return description || "Datos de la obra actualizados";
    default:
      return description;
  }
}

function matchesFilter(ev: HistorialEvento, filter: HistorialFilter): boolean {
  switch (filter) {
    case "todos":   return true;
    case "tareas":  return ev.event_type.startsWith("task_");
    case "alertas": return ev.event_type === "alert_created";
    case "obra":    return ev.event_type.startsWith("obra_");
    case "sistema": return ev.triggered_by === "chatbot" || ev.triggered_by === "system";
    default:        return true;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HistorialPanelProps {
  events: HistorialEvento[];
  filterable?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistorialPanel({ events, filterable = false }: HistorialPanelProps) {
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
      {/* ── Filter pills — full tab only ── */}
      {filterable && (
        <div className="flex items-center gap-1 flex-wrap bg-constructa-surface rounded p-1 w-fit">
          {FILTERS.map(({ id, label }) => {
            const isActive = filter === id;
            const count =
              id === "todos"
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

      {/* ── Timeline ── */}
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
              const style          = EVENT_STYLES[ev.event_type] ?? DEFAULT_STYLE;
              const label          = EVENT_LABELS[ev.event_type] ?? ev.event_type;
              const triggeredLabel = TRIGGERED_BY_LABEL[ev.triggered_by] ?? ev.triggered_by;

              return (
                <li key={ev.id} className="flex gap-3 pb-4 last:pb-0">
                  <span
                    className={`mt-1.5 w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-white ${style.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    {/* Event type badge */}
                    <div className="mb-0.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
                        {label}
                      </span>
                    </div>
                    {/* Human-readable description */}
                    <p className="text-sm text-constructa-text leading-snug break-words">
                      {humanizeDescription(ev)}
                    </p>
                    {renderChangesDetail(ev)}
                    {/* Origin + date */}
                    <p className="text-xs text-constructa-border mt-0.5">
                      {triggeredLabel} · {formatDate(ev.created_at)}
                    </p>
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
