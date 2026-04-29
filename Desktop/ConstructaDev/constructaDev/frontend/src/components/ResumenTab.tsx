import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronRight, GripVertical, Pencil,
  ClipboardList, ArrowRight, Calendar, Activity,
} from "lucide-react";
import { GanttTimeline } from "./GanttTimeline";
import { HistorialPanel } from "./HistorialPanel";
import { SectionTitle } from "./ui/SectionTitle";
import { StatusBadge } from "./ui/StatusBadge";
import type { Alert, HistorialEvento, Responsible, Task } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function isActive(task: Task) {
  return task.status !== "completada" && task.status !== "cancelada";
}

// ─── Circular progress ────────────────────────────────────────────────────────

function CircularProgress({ pct }: { pct: number }) {
  const r    = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const strokeColor =
    pct === 100 ? "text-constructa-success"
    : pct >= 50  ? "text-constructa-primary"
    :              "text-constructa-warning";
  return (
    <svg viewBox="0 0 44 44" className="w-9 h-9 -rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3.5" stroke="currentColor" className="text-blue-100" />
      <circle
        cx="22" cy="22" r={r}
        fill="none" strokeWidth="3.5" stroke="currentColor"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        className={`${strokeColor} transition-all`}
      />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResumenTabProps {
  tasks: Task[];
  alerts: Alert[];
  historial: HistorialEvento[];
  responsibles: Responsible[];
  obraStartDate?: string | null;
  obraExpectedEndDate?: string | null;
  error: string | null;
  onMarkRead: (id: number) => void;
  onViewAlerts: () => void;
  onViewTareas: () => void;
  onViewHistorial?: () => void;
  onEditTask: (task: Task) => void;
  onTaskRescheduled: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResumenTab({
  tasks,
  alerts,
  historial,
  responsibles,
  obraStartDate,
  obraExpectedEndDate,
  error,
  onViewAlerts,
  onViewTareas,
  onViewHistorial,
  onEditTask,
  onTaskRescheduled,
}: ResumenTabProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const total          = tasks.length;
  const activeCount    = tasks.filter(isActive).length;
  const completedCount = tasks.filter((t) => t.status === "completada").length;
  const unreadAlerts   = alerts.filter((a) => !a.is_read);
  const unreadCount    = unreadAlerts.length;
  const avgProgress    = total === 0
    ? 0
    : Math.round(tasks.reduce((s, t) => s + t.estimated_progress, 0) / total);

  const tasksWithoutDates = tasks.filter((t) => !t.start_date && !t.due_date);

  const topAlert =
    unreadAlerts.find((a) => !a.task_id) ??
    unreadAlerts.find((a) => a.type === "task_blocked") ??
    unreadAlerts[0] ??
    null;

  void topAlert;

  // ── Critical tasks ───────────────────────────────────────────────────────────
  const seen = new Set<number>();
  const criticalTasks: Task[] = [];
  for (const t of [
    ...tasks.filter((t) => t.status === "bloqueada"),
    ...tasks.filter((t) => isActive(t) && !!t.due_date && t.due_date < TODAY && t.status !== "bloqueada"),
    ...tasks.filter((t) => isActive(t) && !t.responsible_id && t.status !== "bloqueada" && !(t.due_date && t.due_date < TODAY)),
  ]) {
    if (!seen.has(t.id) && criticalTasks.length < 3) {
      seen.add(t.id);
      criticalTasks.push(t);
    }
  }

  const avgProgressLabel =
    avgProgress === 0   ? "Inicio del proyecto" :
    avgProgress === 100 ? "Proyecto completado"  :
                          "Promedio de todas las tareas";

  return (
    <div className="space-y-5">
      {/* ── API error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-constructa-danger/30 text-constructa-danger text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── 3 KPI cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Avance general */}
        <div className="bg-white border border-constructa-border rounded-2xl shadow-card p-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <CircularProgress pct={avgProgress} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText">Avance general</p>
            <p className={[
              "text-3xl font-bold mt-1",
              avgProgress === 100 ? "text-constructa-success"
              : avgProgress >= 50  ? "text-constructa-primary"
              :                      "text-constructa-text",
            ].join(" ")}>{avgProgress}%</p>
            <p className="text-[11px] text-constructa-border mt-0.5">{avgProgressLabel}</p>
          </div>
        </div>

        {/* Tareas activas */}
        <div className="bg-white border border-constructa-border rounded-2xl shadow-card p-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-7 h-7 text-constructa-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText">Tareas activas</p>
            <p className="text-3xl font-bold text-constructa-primary mt-1">{activeCount}</p>
            <p className="text-[11px] text-constructa-border mt-0.5">de {total} en total</p>
          </div>
        </div>

        {/* Tareas completadas */}
        <div className="bg-white border border-constructa-border rounded-2xl shadow-card p-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-7 h-7 text-constructa-success" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText">Tareas completadas</p>
            <p className="text-3xl font-bold text-constructa-success mt-1">{completedCount}</p>
            <p className="text-[11px] text-constructa-border mt-0.5">de {total} en total</p>
          </div>
        </div>
      </div>

      {/* ── Alertas + Tareas críticas — compact horizontal cards ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Alertas — compact */}
        <div className={[
          "rounded-xl border px-4 py-3 flex items-center gap-4 transition-colors",
          unreadCount > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-constructa-border",
        ].join(" ")}>
          <div className={[
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            unreadCount > 0 ? "bg-orange-100" : "bg-green-50",
          ].join(" ")}>
            {unreadCount > 0
              ? <AlertTriangle className="w-5 h-5 text-constructa-warning" />
              : <CheckCircle2  className="w-5 h-5 text-constructa-success" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText">Alertas activas</p>
            <p className="text-xs text-constructa-secondaryText mt-0.5 truncate">
              {unreadCount > 0 ? "La obra requiere atención" : "Sin alertas pendientes"}
            </p>
          </div>
          <p className={[
            "text-2xl font-bold flex-shrink-0",
            unreadCount > 0 ? "text-constructa-primary" : "text-constructa-success",
          ].join(" ")}>{unreadCount}</p>
          <button
            onClick={onViewAlerts}
            className="flex items-center gap-0.5 text-xs font-semibold text-constructa-primary hover:text-constructa-primary/80 transition-colors flex-shrink-0"
          >
            Ver alertas
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tareas críticas — compact */}
        <div className={[
          "rounded-xl border px-4 py-3 flex items-center gap-4 transition-colors",
          criticalTasks.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-constructa-border",
        ].join(" ")}>
          <div className={[
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            criticalTasks.length > 0 ? "bg-red-100" : "bg-green-50",
          ].join(" ")}>
            {criticalTasks.length > 0
              ? <AlertTriangle className="w-5 h-5 text-constructa-danger" />
              : <CheckCircle2  className="w-5 h-5 text-constructa-success" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText">Tareas críticas</p>
            <p className="text-xs text-constructa-secondaryText mt-0.5 truncate">
              {criticalTasks.length > 0 ? "Sin responsable asignado" : "No hay tareas críticas"}
            </p>
          </div>
          <p className={[
            "text-2xl font-bold flex-shrink-0",
            criticalTasks.length > 0 ? "text-constructa-danger" : "text-constructa-success",
          ].join(" ")}>{criticalTasks.length}</p>
          {criticalTasks.length > 0 ? (
            <button
              onClick={onViewTareas}
              className="flex items-center gap-0.5 text-xs font-semibold text-constructa-primary hover:text-constructa-primary/80 transition-colors flex-shrink-0"
            >
              Ver tareas
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="w-[72px] flex-shrink-0" />
          )}
        </div>
      </div>

      {/* ── Gantt timeline ────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          aside={
            <div className="flex items-center gap-3">
              {tasksWithoutDates.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-constructa-warning">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {tasksWithoutDates.length} sin fechas
                </span>
              )}
              <span className="text-xs text-constructa-secondaryText">
                {tasks.filter((t) => t.start_date || t.due_date).length} con fechas
              </span>
            </div>
          }
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-constructa-secondaryText" />
            Cronograma de tareas
          </span>
        </SectionTitle>
        <div className="bg-white border border-constructa-border rounded-xl shadow-card p-4">
          <GanttTimeline
            tasks={tasks}
            responsibles={responsibles}
            obraStartDate={obraStartDate}
            obraExpectedEndDate={obraExpectedEndDate}
            onSaved={onTaskRescheduled}
            onEditTask={onEditTask}
          />
        </div>
      </section>

      {/* ── Lower two-column section ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tareas sin fechas */}
        <section className="flex flex-col">
          <SectionTitle
            aside={
              tasksWithoutDates.length > 0 ? (
                <span className="text-[10px] text-constructa-secondaryText bg-constructa-surface rounded px-2 py-1">
                  Arrastrá al cronograma para programar
                </span>
              ) : undefined
            }
          >
            <span className="flex items-center gap-2">
              {tasksWithoutDates.length > 0 && (
                <AlertTriangle className="w-4 h-4 text-constructa-warning" />
              )}
              Tareas sin fechas
              {tasksWithoutDates.length > 0 && (
                <span className="ml-1 text-xs font-normal text-constructa-secondaryText">
                  ({tasksWithoutDates.length})
                </span>
              )}
            </span>
          </SectionTitle>
          <div className="bg-white border border-constructa-border rounded-xl shadow-card overflow-hidden flex-1">
            {tasksWithoutDates.length === 0 ? (
              <div className="py-5 text-center text-constructa-secondaryText text-sm">
                Todas las tareas tienen fechas definidas.
              </div>
            ) : (
              <>
                <ul className="divide-y divide-constructa-surface">
                  {tasksWithoutDates.slice(0, 5).map((t) => (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggingId(t.id);
                        e.dataTransfer.setData("application/x-constructa-task", t.id.toString());
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={[
                        "flex items-center gap-3 px-4 py-2.5 transition-opacity hover:bg-constructa-bg",
                        draggingId === t.id ? "opacity-40" : "cursor-grab",
                      ].join(" ")}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-constructa-border flex-shrink-0" />
                      <span
                        className="flex-1 min-w-0 text-sm font-semibold text-constructa-text truncate"
                        title={t.title}
                      >
                        {t.title}
                      </span>
                      <StatusBadge status={t.status} />
                      <button
                        onClick={() => onEditTask(t)}
                        title="Agregar fechas"
                        className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded text-xs font-semibold text-constructa-secondaryText hover:text-constructa-primary hover:bg-constructa-surface transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Agregar fechas
                      </button>
                    </li>
                  ))}
                </ul>
                {tasksWithoutDates.length > 5 && (
                  <div className="px-4 py-2.5 border-t border-constructa-surface bg-constructa-bg flex items-center justify-between">
                    <p className="text-xs text-constructa-secondaryText">
                      Mostrando 5 de {tasksWithoutDates.length} tareas sin fechas
                    </p>
                    <button
                      onClick={onViewTareas}
                      className="flex items-center gap-0.5 text-xs font-semibold text-constructa-primary hover:text-constructa-primary/80 transition-colors"
                    >
                      Ver todas
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Actividad reciente */}
        <section className="flex flex-col">
          <SectionTitle
            aside={
              <div className="flex items-center gap-3">
                <span className="text-xs text-constructa-secondaryText">
                  {historial.length} eventos
                </span>
                {onViewHistorial && (
                  <button
                    onClick={onViewHistorial}
                    className="flex items-center gap-0.5 text-xs font-semibold text-constructa-primary hover:text-constructa-primary/80 transition-colors"
                  >
                    Ver todo
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            }
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-constructa-secondaryText" />
              Actividad reciente
            </span>
          </SectionTitle>
          <div className="bg-white border border-constructa-border rounded-xl shadow-card p-4 flex-1">
            <HistorialPanel events={historial.slice(0, 3)} />
          </div>
        </section>
      </div>
    </div>
  );
}
