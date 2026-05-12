import { useState, useEffect, useRef, useCallback } from "react";
import { ReschedulingModal } from "./ReschedulingModal";
import { SchedulingModal } from "./SchedulingModal";
import type { Task, TaskStatus, Responsible } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY              = new Date().toISOString().slice(0, 10);
const DAY_MS             = 86_400_000;
const CLICK_THRESHOLD_PX = 5;

const DND_TYPE = "application/x-constructa-task";

// Row layout (px)
const ROW_H        = 56;   // 3.5rem
const BAR_TOP      = 10;
const BAR_H        = 16;
const LABEL_TOP    = 30;   // below bar


const STATUS_BAR: Record<TaskStatus, string> = {
  pendiente:   "bg-constructa-warning",
  en_progreso: "bg-constructa-primary",
  bloqueada:   "bg-constructa-danger",
  completada:  "bg-constructa-success",
  en_revision: "bg-constructa-info",
  cancelada:   "bg-constructa-border",
};

const STATUS_BORDER: Record<TaskStatus, string> = {
  pendiente:   "border-constructa-warning",
  en_progreso: "border-constructa-primary",
  bloqueada:   "border-constructa-danger",
  completada:  "border-constructa-success",
  en_revision: "border-constructa-info",
  cancelada:   "border-constructa-border",
};

const STATUS_EXTRA: Record<TaskStatus, string> = {
  pendiente:   "opacity-90",
  en_progreso: "opacity-95",
  bloqueada:   "opacity-100",
  completada:  "opacity-50",
  en_revision: "opacity-90",
  cancelada:   "opacity-30",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente:   "Pendiente",
  en_progreso: "En progreso",
  bloqueada:   "Bloqueada",
  completada:  "Completada",
  en_revision: "En revisión",
  cancelada:   "Cancelada",
};

const LEGEND: { label: string; bar: string; extra: string }[] = [
  { label: "Pendiente",   bar: "bg-constructa-warning", extra: "opacity-90"  },
  { label: "En progreso", bar: "bg-constructa-primary", extra: "opacity-95"  },
  { label: "Bloqueada",   bar: "bg-constructa-danger",  extra: "opacity-100" },
  { label: "En revisión", bar: "bg-constructa-info",    extra: "opacity-90"  },
  { label: "Completada",  bar: "bg-constructa-success", extra: "opacity-50"  },
  { label: "Cancelada",   bar: "bg-constructa-border",  extra: "opacity-30"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ms(d: string): number {
  return new Date(d).getTime();
}

/** DD/MM/YY — used in tooltips */
function fmtLabel(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
}

/** DD/MM — used in bar labels and header ticks */
function fmtShort(d: string): string {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

function msToDateStr(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

function pct(dateMs: number, minMs: number, rangeMs: number): number {
  if (rangeMs === 0) return 50;
  return Math.max(0, Math.min(100, ((dateMs - minMs) / rangeMs) * 100));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((ms(b) - ms(a)) / DAY_MS);
}

function isActive(task: Task): boolean {
  return task.status !== "completada" && task.status !== "cancelada";
}

function isDraggable(task: Task): boolean {
  return !!(task.start_date || task.due_date);
}

// ─── Tick generation ──────────────────────────────────────────────────────────

interface Tick {
  t: number;
  strong: boolean;
}

function computeTicks(minMs: number, maxMs: number): { ticks: Tick[]; tickDays: number } {
  const totalDays = (maxMs - minMs) / DAY_MS;
  let tickDays: number;
  if      (totalDays <= 14)  tickDays = 2;
  else if (totalDays <= 30)  tickDays = 5;
  else if (totalDays <= 90)  tickDays = 7;
  else if (totalDays <= 180) tickDays = 14;
  else                       tickDays = 30;

  const strongEvery = tickDays >= 7 ? 1 : Math.round(7 / tickDays);
  const ticks: Tick[] = [];
  const firstT = Math.ceil(minMs / (tickDays * DAY_MS)) * (tickDays * DAY_MS);
  let cur = firstT;
  let idx = 0;
  while (cur <= maxMs) {
    ticks.push({ t: cur, strong: idx % strongEvery === 0 });
    cur += tickDays * DAY_MS;
    idx++;
  }
  return { ticks, tickDays };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RowBadge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-block px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider border ${color}`}>
      {children}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DragState {
  taskId: number;
  startClientX: number;
  currentDeltaPx: number;
}

interface ResizeState {
  taskId: number;
  edge: "start" | "end";
  startClientX: number;
  currentDeltaPx: number;
}

interface PendingReschedule {
  task: Task;
  newStartDate: string | null;
  newDueDate: string | null;
  nearbyCount: number;
  mode: "move" | "resize-start" | "resize-end";
}

interface PendingSchedule {
  task: Task;
  dropDate: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GanttTimelineProps {
  tasks: Task[];
  responsibles: Responsible[];
  obraStartDate?: string | null;
  obraExpectedEndDate?: string | null;
  onSaved: () => void;
  onEditTask: (task: Task) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GanttTimeline({
  tasks,
  responsibles,
  obraStartDate,
  obraExpectedEndDate,
  onSaved,
  onEditTask,
}: GanttTimelineProps) {
  const [drag, setDrag]                       = useState<DragState | null>(null);
  const [resize, setResize]                   = useState<ResizeState | null>(null);
  const [pending, setPending]                 = useState<PendingReschedule | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<PendingSchedule | null>(null);
  const [highlightedId, setHighlightedId]     = useState<number | null>(null);
  const [isDragOver, setIsDragOver]           = useState(false);

  const dragRef       = useRef<DragState | null>(null);
  const resizeRef     = useRef<ResizeState | null>(null);
  const onEditTaskRef = useRef(onEditTask);
  const timelineRef   = useRef<HTMLDivElement>(null);
  const stateRef      = useRef<{ rangeMs: number; minMs: number; visible: Task[] }>({
    rangeMs: 0, minMs: 0, visible: [],
  });

  useEffect(() => { onEditTaskRef.current = onEditTask; }, [onEditTask]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const visible = tasks.filter((t) => t.start_date || t.due_date);

  // ── Date range ──────────────────────────────────────────────────────────────
  let rangeMinMs: number;
  let rangeMaxMs: number;

  if (visible.length > 0) {
    const allDates: number[] = [ms(TODAY)];
    for (const t of visible) {
      if (t.start_date) allDates.push(ms(t.start_date));
      if (t.due_date)   allDates.push(ms(t.due_date));
    }
    rangeMinMs = Math.min(...allDates);
    rangeMaxMs = Math.max(...allDates);
  } else {
    rangeMinMs = obraStartDate ? ms(obraStartDate) : ms(TODAY);
    rangeMaxMs = obraExpectedEndDate
      ? Math.max(ms(obraExpectedEndDate), rangeMinMs + 30 * DAY_MS)
      : rangeMinMs + 30 * DAY_MS;
  }

  const padding  = Math.max((rangeMaxMs - rangeMinMs) * 0.05, 3 * DAY_MS);
  const minMs    = rangeMinMs - padding;
  const maxMs    = rangeMaxMs + padding;
  const rangeMs  = maxMs - minMs;
  const todayPct = pct(ms(TODAY), minMs, rangeMs);
  const todayInRange = todayPct > 1 && todayPct < 99;

  stateRef.current = { rangeMs, minMs, visible };

  // ── Ticks ───────────────────────────────────────────────────────────────────
  const { ticks } = computeTicks(minMs, maxMs);

  // Filter tick labels that would overlap "Hoy" (within 3% of today)
  const tickLabels = ticks.filter(
    ({ t }) => !todayInRange || Math.abs(pct(t, minMs, rangeMs) - todayPct) > 3
  );

  // ── Tooltip ─────────────────────────────────────────────────────────────────

  function buildTooltip(
    task: Task,
    effectiveStart: string | null,
    effectiveDue: string | null,
    canDrag: boolean
  ): string {
    const resp = task.responsible_id
      ? responsibles.find((r) => r.id === task.responsible_id)
      : null;
    const dur =
      effectiveStart && effectiveDue
        ? diffDays(effectiveStart, effectiveDue)
        : null;
    const lines: (string | null)[] = [
      task.title,
      `Estado: ${STATUS_LABEL[task.status]}`,
      effectiveStart ? `Inicio: ${fmtLabel(effectiveStart)}` : null,
      effectiveDue   ? `Vence: ${fmtLabel(effectiveDue)}`   : null,
      dur !== null   ? `Duración: ${dur} día${dur !== 1 ? "s" : ""}` : null,
      `Responsable: ${resp ? resp.full_name : "Sin responsable"}`,
      canDrag ? "---" : null,
      canDrag ? "Arrastrá la barra para mover · Arrastrá los bordes para cambiar duración · Clic para editar" : null,
    ];
    return lines.filter(Boolean).join("\n");
  }

  // ── Mouse drag (rescheduling dated tasks) ────────────────────────────────────

  function startDrag(taskId: number, clientX: number) {
    const s: DragState = { taskId, startClientX: clientX, currentDeltaPx: 0 };
    dragRef.current = s;
    setDrag(s);
  }

  function startResize(taskId: number, edge: "start" | "end", clientX: number) {
    const s: ResizeState = { taskId, edge, startClientX: clientX, currentDeltaPx: 0 };
    resizeRef.current = s;
    setResize(s);
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    if (d) {
      const updated: DragState = { ...d, currentDeltaPx: e.clientX - d.startClientX };
      dragRef.current = updated;
      setDrag(updated);
      return;
    }
    const r = resizeRef.current;
    if (r) {
      const updated: ResizeState = { ...r, currentDeltaPx: e.clientX - r.startClientX };
      resizeRef.current = updated;
      setResize(updated);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    const currentDrag   = dragRef.current;
    const currentResize = resizeRef.current;
    dragRef.current   = null;
    resizeRef.current = null;
    setDrag(null);
    setResize(null);

    const { rangeMs: rMs, minMs: rMinMs, visible: vis } = stateRef.current;
    void rMinMs;

    if (currentDrag) {
      if (Math.abs(currentDrag.currentDeltaPx) < CLICK_THRESHOLD_PX) {
        const task = vis.find((t) => t.id === currentDrag.taskId);
        if (task) onEditTaskRef.current(task);
        return;
      }

      const timelineEl = timelineRef.current;
      if (!timelineEl || rMs === 0) return;
      const timelineWidth = timelineEl.getBoundingClientRect().width;
      if (timelineWidth === 0) return;

      const deltaDays = Math.round(
        (currentDrag.currentDeltaPx / timelineWidth) * (rMs / DAY_MS)
      );
      if (Math.abs(deltaDays) < 1) return;

      const task = vis.find((t) => t.id === currentDrag.taskId);
      if (!task) return;

      const newStart = task.start_date ? addDays(task.start_date, deltaDays) : null;
      const newDue   = task.due_date   ? addDays(task.due_date,   deltaDays) : null;

      const newEndpoints: number[] = [];
      if (newStart) newEndpoints.push(ms(newStart));
      if (newDue)   newEndpoints.push(ms(newDue));

      const nearbyCount = vis.filter((t) => {
        if (t.id === task.id) return false;
        const dates = [t.start_date, t.due_date].filter(Boolean) as string[];
        return dates.some((d) =>
          newEndpoints.some((ep) => Math.abs(ms(d) - ep) <= 3 * DAY_MS)
        );
      }).length;

      setPending({ task, newStartDate: newStart, newDueDate: newDue, nearbyCount, mode: "move" });
      return;
    }

    if (currentResize) {
      const timelineEl = timelineRef.current;
      if (!timelineEl || rMs === 0) return;
      const timelineWidth = timelineEl.getBoundingClientRect().width;
      if (timelineWidth === 0) return;

      const deltaDays = Math.round(
        (currentResize.currentDeltaPx / timelineWidth) * (rMs / DAY_MS)
      );
      if (Math.abs(deltaDays) < 1) return;

      const task = vis.find((t) => t.id === currentResize.taskId);
      if (!task || !task.start_date || !task.due_date) return;

      let newStart = task.start_date;
      let newDue   = task.due_date;

      if (currentResize.edge === "start") {
        newStart = addDays(task.start_date, deltaDays);
        if (newStart >= task.due_date) newStart = addDays(task.due_date, -1);
      } else {
        newDue = addDays(task.due_date, deltaDays);
        if (newDue <= task.start_date) newDue = addDays(task.start_date, 1);
      }

      const newEndpoints = [ms(newStart), ms(newDue)];
      const nearbyCount = vis.filter((t) => {
        if (t.id === task.id) return false;
        const dates = [t.start_date, t.due_date].filter(Boolean) as string[];
        return dates.some((d) =>
          newEndpoints.some((ep) => Math.abs(ms(d) - ep) <= 3 * DAY_MS)
        );
      }).length;

      const mode: PendingReschedule["mode"] =
        currentResize.edge === "start" ? "resize-start" : "resize-end";
      setPending({ task, newStartDate: newStart, newDueDate: newDue, nearbyCount, mode });
    }
  }, []);

  useEffect(() => {
    if (!drag && !resize) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drag, resize, handleMouseMove, handleMouseUp]);

  // ── HTML5 DnD (scheduling unplanned tasks) ────────────────────────────────

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes(DND_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);

    const rawId = e.dataTransfer.getData(DND_TYPE);
    const taskId = parseInt(rawId, 10);
    if (!rawId || isNaN(taskId)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.start_date || task.due_date) return;

    const timelineEl = timelineRef.current;
    if (!timelineEl || rangeMs === 0) return;
    const rect = timelineEl.getBoundingClientRect();
    const xFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dropDate = msToDateStr(
      Math.round((minMs + xFraction * rangeMs) / DAY_MS) * DAY_MS
    );

    setPendingSchedule({ task, dropDate });
  }

  // ── Saved callbacks ──────────────────────────────────────────────────────────

  function handleRescheduleSaved(task: Task) {
    setPending(null);
    setHighlightedId(task.id);
    setTimeout(() => setHighlightedId(null), 1500);
    onSaved();
  }

  function handleScheduleSaved(task: Task) {
    setPendingSchedule(null);
    setHighlightedId(task.id);
    setTimeout(() => setHighlightedId(null), 1500);
    onSaved();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {drag   && <div className="fixed inset-0 z-40 cursor-grabbing select-none" />}
      {resize && <div className="fixed inset-0 z-40 cursor-ew-resize select-none" />}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">

          {/* ── UX note ─────────────────────────────────────────────────────── */}
          <p className="text-[11px] text-constructa-secondaryText bg-constructa-surface rounded px-3 py-1.5 mb-2">
            Arrastrá la barra para mover la tarea · Arrastrá sus bordes para cambiar la duración · Clic para editar · Arrastrá tareas sin fechas desde abajo para programarlas.
          </p>

          {/* ── Tick header ─────────────────────────────────────────────────── */}
          <div className="flex mb-0">
            <div className="w-48 flex-shrink-0" />
            {/* h-7 = 28px: enough for tick labels + "Hoy" badge */}
            <div className="flex-1 relative" style={{ height: "28px" }}>
              {tickLabels.map(({ t }) => {
                const tPct = pct(t, minMs, rangeMs);
                return (
                  <span
                    key={t}
                    className="absolute bottom-0 -translate-x-1/2 text-[10px] text-constructa-secondaryText font-mono select-none"
                    style={{ left: `${tPct}%` }}
                  >
                    {fmtShort(msToDateStr(t))}
                  </span>
                );
              })}
              {/* "Hoy" badge above the today line */}
              {todayInRange && (
                <span
                  className="absolute bottom-0 -translate-x-1/2 text-[9px] font-bold text-white bg-constructa-danger rounded px-1.5 py-0.5 select-none whitespace-nowrap"
                  style={{ left: `${todayPct}%` }}
                >
                  Hoy {fmtShort(TODAY)}
                </span>
              )}
            </div>
          </div>

          {/* ── Grid (drop target) ──────────────────────────────────────────── */}
          <div
            className={[
              "border rounded overflow-hidden transition-all",
              isDragOver
                ? "border-constructa-primary ring-2 ring-constructa-primary ring-offset-1"
                : "border-constructa-border",
            ].join(" ")}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Column header */}
            <div className="flex border-b border-constructa-border bg-constructa-surface">
              <div className="w-48 flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-constructa-secondaryText">
                Tarea
              </div>
              <div className="flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-constructa-secondaryText">
                Cronograma
              </div>
            </div>

            {/* Rows or empty drop zone */}
            <div ref={timelineRef}>
              {visible.length === 0 ? (
                <div
                  className={[
                    "flex items-center justify-center text-center transition-colors",
                    isDragOver ? "bg-constructa-primary/5" : "",
                  ].join(" ")}
                  style={{ minHeight: "80px" }}
                >
                  {isDragOver ? (
                    <p className="text-sm font-semibold text-constructa-primary">
                      Soltá acá para programar la tarea
                    </p>
                  ) : (
                    <p className="text-sm text-constructa-secondaryText">
                      Sin fechas cargadas.{" "}
                      <span className="text-constructa-primary font-medium">
                        Arrastrá tareas desde abajo
                      </span>{" "}
                      para programarlas.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {visible.map((task, i) => {
                    const isDragging  = drag?.taskId === task.id;
                    const isResizing  = resize?.taskId === task.id;
                    const isHighlight = highlightedId === task.id;
                    const canDrag     = isDraggable(task);

                    const hasBoth   = !!(task.start_date && task.due_date);
                    const onlyDue   = !task.start_date && !!task.due_date;
                    const onlyStart = !!task.start_date && !task.due_date;

                    let effectiveStart = task.start_date;
                    let effectiveDue   = task.due_date;

                    if (isDragging && drag && timelineRef.current) {
                      const w = timelineRef.current.getBoundingClientRect().width;
                      if (w > 0) {
                        const deltaDays = Math.round(
                          (drag.currentDeltaPx / w) * (rangeMs / DAY_MS)
                        );
                        if (task.start_date) effectiveStart = addDays(task.start_date, deltaDays);
                        if (task.due_date)   effectiveDue   = addDays(task.due_date,   deltaDays);
                      }
                    }

                    if (isResizing && resize && timelineRef.current) {
                      const w = timelineRef.current.getBoundingClientRect().width;
                      if (w > 0) {
                        const deltaDays = Math.round(
                          (resize.currentDeltaPx / w) * (rangeMs / DAY_MS)
                        );
                        if (resize.edge === "start" && task.start_date) {
                          let ns = addDays(task.start_date, deltaDays);
                          if (task.due_date && ns >= task.due_date) ns = addDays(task.due_date, -1);
                          effectiveStart = ns;
                        } else if (resize.edge === "end" && task.due_date) {
                          let nd = addDays(task.due_date, deltaDays);
                          if (task.start_date && nd <= task.start_date) nd = addDays(task.start_date, 1);
                          effectiveDue = nd;
                        }
                      }
                    }

                    const startPct = effectiveStart ? pct(ms(effectiveStart), minMs, rangeMs) : null;
                    const duePct   = effectiveDue   ? pct(ms(effectiveDue),   minMs, rangeMs) : null;
                    const barLeft  = hasBoth ? startPct! : (onlyDue ? duePct! : startPct!);
                    const barWidth = hasBoth
                      ? Math.max(0.5, (duePct ?? 0) - (startPct ?? 0))
                      : 1;

                    const overdue = isActive(task) && !!task.due_date && task.due_date < TODAY;
                    const noResp  = isActive(task) && !task.responsible_id;
                    const blocked = task.status === "bloqueada";

                    const overdueRing = overdue && !blocked
                      ? "ring-1 ring-constructa-danger/50 ring-inset"
                      : "";

                    const grabCls = canDrag ? "cursor-grab active:cursor-grabbing" : "";

                    const tooltip = buildTooltip(task, effectiveStart, effectiveDue, canDrag);

                    const mouseDownHandler = canDrag
                      ? (e: React.MouseEvent) => {
                          e.preventDefault();
                          startDrag(task.id, e.clientX);
                        }
                      : undefined;

                    // Duration in days (for bar label)
                    const durDays =
                      hasBoth && effectiveStart && effectiveDue
                        ? diffDays(effectiveStart, effectiveDue)
                        : null;

                    return (
                      <div
                        key={task.id}
                        className={[
                          "flex border-b border-constructa-surface last:border-b-0 transition-all",
                          i % 2 === 0 ? "bg-white" : "bg-constructa-bg",
                          isDragging  ? "opacity-60" : "",
                          isHighlight ? "ring-2 ring-constructa-primary ring-inset" : "",
                        ].join(" ")}
                        style={{ minHeight: `${ROW_H}px` }}
                      >
                        {/* Title column */}
                        <div className="w-48 flex-shrink-0 px-3 py-2 flex flex-col justify-center gap-0.5">
                          <button
                            type="button"
                            className="text-xs font-semibold text-constructa-text truncate block text-left hover:text-constructa-primary hover:underline transition-colors"
                            title={task.title}
                            onClick={() => onEditTask(task)}
                          >
                            {task.title}
                          </button>
                          <div className="flex items-center gap-1 flex-wrap">
                            {blocked && (
                              <RowBadge color="border-constructa-danger text-constructa-danger">
                                Bloqueada
                              </RowBadge>
                            )}
                            {overdue && (
                              <RowBadge color="border-constructa-danger text-constructa-danger">
                                Vencida
                              </RowBadge>
                            )}
                            {noResp && (
                              <RowBadge color="border-constructa-warning text-amber-700">
                                Sin resp.
                              </RowBadge>
                            )}
                          </div>
                        </div>

                        {/* Timeline column */}
                        <div
                          className="flex-1 px-1 relative overflow-hidden"
                          style={{ height: `${ROW_H}px` }}
                        >
                          {/* ── Vertical grid lines ──────────────────────── */}
                          {ticks.map(({ t, strong }) => {
                            const tPct = pct(t, minMs, rangeMs);
                            return (
                              <div
                                key={t}
                                className={`absolute top-0 bottom-0 w-px pointer-events-none ${
                                  strong
                                    ? "bg-constructa-border/35"
                                    : "bg-constructa-border/18"
                                }`}
                                style={{ left: `${tPct}%` }}
                              />
                            );
                          })}

                          {/* ── Today: light band + line ──────────────────── */}
                          {todayInRange && (
                            <>
                              <div
                                className="absolute top-0 bottom-0 pointer-events-none"
                                style={{
                                  left: `calc(${todayPct}% - 4px)`,
                                  width: "9px",
                                  background: "rgba(229,57,53,0.10)",
                                }}
                              />
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-constructa-danger/80 pointer-events-none z-10"
                                style={{ left: `${todayPct}%` }}
                              />
                            </>
                          )}

                          {/* ── hasBoth bar ───────────────────────────────── */}
                          {hasBoth && (
                            <>
                              {/* Bar wrapper: positions bar + resize handles together */}
                              <div
                                className="absolute"
                                style={{
                                  top: `${BAR_TOP}px`,
                                  height: `${BAR_H}px`,
                                  left: `${barLeft}%`,
                                  width: `${barWidth}%`,
                                }}
                              >
                                {/* Main bar */}
                                <div
                                  className={`absolute inset-0 rounded-md ${STATUS_BAR[task.status]} ${STATUS_EXTRA[task.status]} ${overdueRing} ${grabCls} overflow-hidden flex items-center`}
                                  title={tooltip}
                                  onMouseDown={mouseDownHandler}
                                >
                                  {durDays !== null && durDays >= 2 && (
                                    <span className="w-full text-center text-white/90 text-[8px] font-bold leading-none pointer-events-none select-none whitespace-nowrap px-1 truncate">
                                      {durDays}d
                                    </span>
                                  )}
                                </div>
                                {/* Left resize handle */}
                                <div
                                  className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize z-10 rounded-l hover:bg-white/25 transition-colors"
                                  onMouseDown={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    startResize(task.id, "start", e.clientX);
                                  }}
                                />
                                {/* Right resize handle */}
                                <div
                                  className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize z-10 rounded-r hover:bg-white/25 transition-colors"
                                  onMouseDown={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    startResize(task.id, "end", e.clientX);
                                  }}
                                />
                              </div>
                              {/* Outside duration label for 1-day tasks */}
                              {durDays === 1 && (
                                <span
                                  className="absolute pointer-events-none select-none text-[9px] text-constructa-secondaryText font-mono whitespace-nowrap"
                                  style={{
                                    top: `${BAR_TOP + 3}px`,
                                    left: `calc(${barLeft + barWidth}% + 3px)`,
                                  }}
                                >
                                  {durDays}d
                                </span>
                              )}
                              {/* Date range label below bar */}
                              <span
                                className="absolute pointer-events-none select-none text-[9px] text-constructa-text/70 font-mono whitespace-nowrap"
                                style={{ top: `${LABEL_TOP}px`, left: `${barLeft}%` }}
                              >
                                {fmtShort(effectiveStart!)} → {fmtShort(effectiveDue!)}
                              </span>
                            </>
                          )}

                          {/* ── onlyDue milestone diamond ─────────────────── */}
                          {onlyDue && (
                            <>
                              <div
                                className={[
                                  "absolute -translate-x-1/2 rotate-45 border-2 bg-white",
                                  STATUS_BORDER[task.status],
                                  STATUS_EXTRA[task.status],
                                  grabCls,
                                ].filter(Boolean).join(" ")}
                                style={{
                                  top: `${BAR_TOP + 1}px`,
                                  width: `${BAR_H - 2}px`,
                                  height: `${BAR_H - 2}px`,
                                  left: `${duePct}%`,
                                }}
                                title={tooltip}
                                onMouseDown={mouseDownHandler}
                              />
                              <span
                                className="absolute pointer-events-none select-none text-[9px] text-constructa-text/70 font-mono whitespace-nowrap"
                                style={{
                                  top: `${LABEL_TOP}px`,
                                  left: `${duePct!}%`,
                                  paddingLeft: "10px",
                                }}
                              >
                                ◆ {fmtShort(effectiveDue!)}
                              </span>
                            </>
                          )}

                          {/* ── onlyStart stub ────────────────────────────── */}
                          {onlyStart && (
                            <>
                              <div
                                className={`absolute rounded-r ${STATUS_BAR[task.status]} ${STATUS_EXTRA[task.status]} ${overdueRing} ${grabCls}`}
                                style={{
                                  top: `${BAR_TOP}px`,
                                  height: `${BAR_H}px`,
                                  left: `${startPct}%`,
                                  width: "12px",
                                }}
                                title={tooltip}
                                onMouseDown={mouseDownHandler}
                              />
                              <span
                                className="absolute pointer-events-none select-none text-[9px] text-constructa-text/70 font-mono whitespace-nowrap"
                                style={{
                                  top: `${LABEL_TOP}px`,
                                  left: `${startPct!}%`,
                                  paddingLeft: "2px",
                                }}
                              >
                                {fmtShort(effectiveStart!)} →
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Drop zone strip when dragging unplanned task */}
                  {isDragOver && (
                    <div className="flex items-center justify-center py-2.5 bg-constructa-primary/5 border-t border-dashed border-constructa-primary">
                      <p className="text-xs font-semibold text-constructa-primary">
                        Soltá acá para programar la tarea
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Legend ──────────────────────────────────────────────────────── */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {LEGEND.map(({ label, bar, extra }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3 h-2 rounded-sm flex-shrink-0 ${bar} ${extra}`} />
                <span className="text-[10px] text-constructa-secondaryText">{label}</span>
              </div>
            ))}
            {todayInRange && (
              <div className="flex items-center gap-1.5">
                <div className="w-px h-3 bg-constructa-danger/55 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-constructa-danger">
                  Hoy ({fmtLabel(TODAY)})
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-3 h-2 rounded-sm bg-constructa-danger/30 ring-1 ring-constructa-danger/50 ring-inset flex-shrink-0" />
              <span className="text-[10px] text-constructa-secondaryText">Vencida</span>
            </div>
          </div>

        </div>
      </div>

      {pending && (
        <ReschedulingModal
          task={pending.task}
          newStartDate={pending.newStartDate}
          newDueDate={pending.newDueDate}
          nearbyCount={pending.nearbyCount}
          mode={pending.mode}
          onClose={() => setPending(null)}
          onSaved={handleRescheduleSaved}
        />
      )}

      {pendingSchedule && (
        <SchedulingModal
          task={pendingSchedule.task}
          dropDate={pendingSchedule.dropDate}
          responsibles={responsibles}
          onClose={() => setPendingSchedule(null)}
          onSaved={handleScheduleSaved}
        />
      )}
    </>
  );
}
