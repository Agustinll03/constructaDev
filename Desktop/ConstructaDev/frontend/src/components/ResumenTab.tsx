import { useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertTriangle, ChevronRight, GripVertical, Pencil,
  ArrowRight, Calendar, Activity,
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

// ─── Progress ring ────────────────────────────────────────────────────────────

const RING_R    = 26;
const RING_CIRC = 2 * Math.PI * RING_R;

function ProgressRing({ pct }: { pct: number }) {
  const offset = (1 - pct / 100) * RING_CIRC;
  return (
    <div style={{ width: 64, height: 64, position: "relative", flexShrink: 0 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r={RING_R} stroke="#F0F1EF" strokeWidth="7" fill="none"/>
        <circle
          cx="32" cy="32" r={RING_R}
          stroke="url(#kpi-ring-grad)" strokeWidth="7" fill="none"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="kpi-ring-grad" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0%" stopColor="#FF8856"/>
            <stop offset="100%" stopColor="#E85A26"/>
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", color: "#1A2329",
      }}>
        {pct}%
      </div>
    </div>
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

  // ── Distribution bars by status ──────────────────────────────────────────────
  const statusDist = total === 0 ? null : {
    completada:  tasks.filter(t => t.status === "completada").length  / total * 100,
    en_progreso: tasks.filter(t => t.status === "en_progreso").length / total * 100,
    en_revision: tasks.filter(t => t.status === "en_revision").length / total * 100,
    pendiente:   tasks.filter(t => t.status === "pendiente").length   / total * 100,
    bloqueada:   tasks.filter(t => t.status === "bloqueada").length   / total * 100,
  };

  const avgProgressLabel =
    avgProgress === 0   ? "Sin tareas aún" :
    avgProgress === 100 ? "Proyecto completado" :
                          `Promedio de ${total} tareas`;

  const kpiTileStyle: CSSProperties = {
    background: "#fff",
    border: "1px solid #E6E7E5",
    borderRadius: 14,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div className="space-y-5">
      {/* ── API error ── */}
      {error && (
        <div className="bg-red-50 border border-constructa-danger/30 text-constructa-danger text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── 5-tile KPI strip ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr",
        gap: 14,
      }}>

        {/* ── KPI 1: Avance general (hero) ── */}
        <div style={kpiTileStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0" }}>Avance general</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FFF1E9", color: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1 8h3l2-5 3 10 2-5 4-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ProgressRing pct={avgProgress} />
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "#1A2329", lineHeight: 1 }}>
                {total} tareas
              </div>
              <div style={{ fontSize: 11.5, color: "#5B6770", marginTop: 4 }}>{avgProgressLabel}</div>
            </div>
          </div>
          {statusDist && (
            <div style={{ display: "flex", height: 6, borderRadius: 99, overflow: "hidden", background: "#F0F1EF" }} title="Distribución por estado">
              {statusDist.completada  > 0 && <span style={{ background: "#1F8A5B", width: statusDist.completada  + "%" }} />}
              {statusDist.en_progreso > 0 && <span style={{ background: "#E85A26", width: statusDist.en_progreso + "%" }} />}
              {statusDist.en_revision > 0 && <span style={{ background: "#2A6FDB", width: statusDist.en_revision + "%" }} />}
              {statusDist.pendiente   > 0 && <span style={{ background: "#E89B14", width: statusDist.pendiente   + "%" }} />}
              {statusDist.bloqueada   > 0 && <span style={{ background: "#D03A3A", width: statusDist.bloqueada   + "%" }} />}
            </div>
          )}
        </div>

        {/* ── KPI 2: Tareas activas ── */}
        <div style={kpiTileStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0" }}>Tareas activas</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#E5EEFB", color: "#2A6FDB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M8 4.5V8l2.4 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/></svg>
            </div>
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: "#1A2329", lineHeight: 1 }}>
            {String(activeCount).padStart(2, "0")}
          </div>
          <div style={{ fontSize: 11.5, color: "#5B6770" }}>de <b style={{ color: "#1A2329" }}>{total}</b> en total</div>
        </div>

        {/* ── KPI 3: Completadas ── */}
        <div style={kpiTileStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0" }}>Completadas</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#E4F3EC", color: "#1F8A5B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M5 8.2l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </div>
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: "#1F8A5B", lineHeight: 1 }}>
            {String(completedCount).padStart(2, "0")}
          </div>
          <div style={{ fontSize: 11.5, color: "#5B6770" }}>de <b style={{ color: "#1A2329" }}>{total}</b> en total</div>
        </div>

        {/* ── KPI 4: Alertas activas ── */}
        <div style={kpiTileStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0" }}>Alertas activas</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FDF1DE", color: "#C97D0E", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2.5L14 13H2L8 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/><path d="M8 6.5V9.5M8 11.4v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </div>
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: unreadCount > 0 ? "#C97D0E" : "#1A2329", lineHeight: 1 }}>
            {String(unreadCount).padStart(2, "0")}
          </div>
          {unreadCount > 0 ? (
            <button onClick={onViewAlerts} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: "#C97D0E", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Ver alertas <ArrowRight style={{ width: 11, height: 11 }} />
            </button>
          ) : (
            <div style={{ fontSize: 11.5, color: "#1F8A5B" }}>Sin alertas</div>
          )}
        </div>

        {/* ── KPI 5: Tareas críticas ── */}
        <div style={kpiTileStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0" }}>Críticas</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FCE5E5", color: "#D03A3A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 14c2.5 0 4.5-1.7 4.5-4.4 0-2-1.6-2.9-2.5-3.6.5-2 0-3.5-2-4 .5 2.5-2 4-3.7 5.4-.8.7-1.3 1.6-1.3 2.7C3 12.4 5.4 14 8 14z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/></svg>
            </div>
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: criticalTasks.length > 0 ? "#D03A3A" : "#1A2329", lineHeight: 1 }}>
            {String(criticalTasks.length).padStart(2, "0")}
          </div>
          {criticalTasks.length > 0 ? (
            <button onClick={onViewTareas} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: "#D03A3A", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Ver tareas <ArrowRight style={{ width: 11, height: 11 }} />
            </button>
          ) : (
            <div style={{ fontSize: 11.5, color: "#1F8A5B" }}>Sin tareas críticas</div>
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
            <HistorialPanel events={historial.slice(0, 3)} tasks={tasks} />
          </div>
        </section>
      </div>
    </div>
  );
}
