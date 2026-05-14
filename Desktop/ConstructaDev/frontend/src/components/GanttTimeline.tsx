import { useState, useEffect, useRef, useCallback } from "react";
import { ReschedulingModal } from "./ReschedulingModal";
import { SchedulingModal } from "./SchedulingModal";
import type { Task, TaskStatus, Responsible } from "../types";

// ─── Layout constants ─────────────────────────────────────────────────────────

const DAY_W      = 80;   // px per day column
const ROW_H      = 48;   // px per task row
const TASK_COL_W = 248;  // px for the fixed left name column

const TODAY_STR = new Date().toISOString().slice(0, 10);
const TODAY_MS  = new Date(TODAY_STR).getTime();
const DAY_MS    = 86_400_000;
const CLICK_THRESHOLD_PX = 5;
const DND_TYPE  = "application/x-constructa-task";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ─── Status visual system (matches design) ────────────────────────────────────

const STATUS_STYLE: Record<TaskStatus, { bg: string; border: string; stripe: string; dot: string; label: string }> = {
  pendiente:   { bg: "#FEF6E4", border: "#F0C75E", stripe: "#E89B14", dot: "#E89B14", label: "Pendiente"   },
  en_progreso: { bg: "#FFEEE2", border: "#F09A66", stripe: "#E76A2D", dot: "#E76A2D", label: "En progreso" },
  bloqueada:   { bg: "#FCE5E5", border: "#EE8A8A", stripe: "#D03A3A", dot: "#D03A3A", label: "Bloqueada"   },
  en_revision: { bg: "#E8EFFD", border: "#8AA8EE", stripe: "#3A6BD9", dot: "#3A6BD9", label: "En revisión" },
  completada:  { bg: "#E2F3E9", border: "#7AC498", stripe: "#1F9A5A", dot: "#1F9A5A", label: "Completada"  },
  cancelada:   { bg: "#F4F1EB", border: "#C9C3B6", stripe: "#94928D", dot: "#94928D", label: "Cancelada"   },
};

const AVATAR_COLORS = ["#E76A2D", "#3A6BD9", "#1F9A5A", "#9A4DC9", "#D03A3A", "#E89B14", "#0EA5A0"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ms(d: string): number { return new Date(d).getTime(); }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateToOffset(dateStr: string): number {
  return Math.round((ms(dateStr) - TODAY_MS) / DAY_MS);
}

function offsetToDate(offset: number): string {
  return new Date(TODAY_MS + offset * DAY_MS).toISOString().slice(0, 10);
}

function fmtShort(dateStr: string): string {
  const [, m, day] = dateStr.split("-");
  return `${day}/${m}`;
}

function isWeekend(d: Date): boolean { return d.getDay() === 0 || d.getDay() === 6; }

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// ─── Status icon (Linear-style SVGs) ─────────────────────────────────────────

function StatusIcon({ status, size = 13 }: { status: TaskStatus; size?: number }) {
  const { dot } = STATUS_STYLE[status];
  if (status === "completada") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" fill={dot}/>
      <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (status === "en_progreso") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke={dot} strokeWidth="1.5"/>
      <path d="M8 1.5a6.5 6.5 0 016.5 6.5h-6.5z" fill={dot} transform="rotate(-30 8 8)"/>
    </svg>
  );
  if (status === "bloqueada") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" fill={dot}/>
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
  if (status === "en_revision") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke={dot} strokeWidth="1.5"/>
      <circle cx="8" cy="8" r="2.5" fill={dot}/>
    </svg>
  );
  if (status === "cancelada") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke={dot} strokeWidth="1.5" strokeDasharray="3 2"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke={dot} strokeWidth="1.5" strokeDasharray="2 2"/>
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DragState    { taskId: number; startClientX: number; currentDeltaPx: number; }
interface ResizeState  { taskId: number; edge: "start" | "end"; startClientX: number; currentDeltaPx: number; }
interface PendingReschedule { task: Task; newStartDate: string | null; newDueDate: string | null; nearbyCount: number; mode: "move" | "resize-start" | "resize-end"; }
interface PendingSchedule   { task: Task; dropDate: string; }

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
  const [drag,            setDrag]            = useState<DragState | null>(null);
  const [resize,          setResize]          = useState<ResizeState | null>(null);
  const [pending,         setPending]         = useState<PendingReschedule | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<PendingSchedule | null>(null);
  const [selectedId,      setSelectedId]      = useState<number | null>(null);
  const [highlightedId,   setHighlightedId]   = useState<number | null>(null);
  const [isDragOver,      setIsDragOver]      = useState(false);

  const dragRef       = useRef<DragState | null>(null);
  const resizeRef     = useRef<ResizeState | null>(null);
  const onEditRef     = useRef(onEditTask);
  const railRef       = useRef<HTMLDivElement>(null);
  const stateRef      = useRef<{ visible: Task[]; rangeStart: number }>({ visible: [], rangeStart: 0 });

  useEffect(() => { onEditRef.current = onEditTask; }, [onEditTask]);

  // ── Date range ──────────────────────────────────────────────────────────────

  const visible = tasks.filter(t => t.start_date || t.due_date);

  let rangeStart: number;
  let rangeEnd: number;

  if (visible.length > 0) {
    const offsets: number[] = [0];
    for (const t of visible) {
      if (t.start_date) offsets.push(dateToOffset(t.start_date));
      if (t.due_date)   offsets.push(dateToOffset(t.due_date));
    }
    rangeStart = Math.min(...offsets) - 4;
    rangeEnd   = Math.max(...offsets) + 8;
  } else {
    const s = obraStartDate ? dateToOffset(obraStartDate) : 0;
    const e = obraExpectedEndDate ? dateToOffset(obraExpectedEndDate) : 30;
    rangeStart = Math.min(s, 0) - 4;
    rangeEnd   = Math.max(e, s + 30) + 8;
  }

  const totalDays = rangeEnd - rangeStart + 1;
  const gridWidth = totalDays * DAY_W;

  stateRef.current = { visible, rangeStart };

  function offsetToLeft(offset: number): number {
    return (offset - rangeStart) * DAY_W;
  }

  function getEffectiveDates(task: Task, deltaDays: number, resizeEdge?: "start" | "end") {
    let start = task.start_date;
    let due   = task.due_date;
    if (deltaDays === 0) return { start, due };
    if (resizeEdge === "start" && start) {
      start = addDays(start, deltaDays);
      if (due && start >= due) start = addDays(due, -1);
    } else if (resizeEdge === "end" && due) {
      due = addDays(due, deltaDays);
      if (start && due <= start) due = addDays(start, 1);
    } else {
      if (start) start = addDays(start, deltaDays);
      if (due)   due   = addDays(due,   deltaDays);
    }
    return { start, due };
  }

  // ── Mouse drag ──────────────────────────────────────────────────────────────

  function startBarDrag(taskId: number, clientX: number) {
    const s: DragState = { taskId, startClientX: clientX, currentDeltaPx: 0 };
    dragRef.current = s;
    setDrag(s);
    setSelectedId(taskId);
  }

  function startEdgeResize(taskId: number, edge: "start" | "end", clientX: number) {
    const s: ResizeState = { taskId, edge, startClientX: clientX, currentDeltaPx: 0 };
    resizeRef.current = s;
    setResize(s);
    setSelectedId(taskId);
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragRef.current) {
      const u: DragState = { ...dragRef.current, currentDeltaPx: e.clientX - dragRef.current.startClientX };
      dragRef.current = u; setDrag(u);
    } else if (resizeRef.current) {
      const u: ResizeState = { ...resizeRef.current, currentDeltaPx: e.clientX - resizeRef.current.startClientX };
      resizeRef.current = u; setResize(u);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    const curDrag   = dragRef.current;
    const curResize = resizeRef.current;
    dragRef.current = resizeRef.current = null;
    setDrag(null); setResize(null);

    const { visible: vis } = stateRef.current;

    if (curDrag) {
      if (Math.abs(curDrag.currentDeltaPx) < CLICK_THRESHOLD_PX) {
        const task = vis.find(t => t.id === curDrag.taskId);
        if (task) onEditRef.current(task);
        return;
      }
      const deltaDays = Math.round(curDrag.currentDeltaPx / DAY_W);
      if (Math.abs(deltaDays) < 1) return;
      const task = vis.find(t => t.id === curDrag.taskId);
      if (!task) return;
      const newStart = task.start_date ? addDays(task.start_date, deltaDays) : null;
      const newDue   = task.due_date   ? addDays(task.due_date,   deltaDays) : null;
      const eps = [newStart, newDue].filter(Boolean).map(d => ms(d!));
      const nearbyCount = vis.filter(t => t.id !== task.id && [t.start_date, t.due_date]
        .filter(Boolean).some(d => eps.some(ep => Math.abs(ms(d!) - ep) <= 3 * DAY_MS))).length;
      setPending({ task, newStartDate: newStart, newDueDate: newDue, nearbyCount, mode: "move" });
      return;
    }

    if (curResize) {
      const deltaDays = Math.round(curResize.currentDeltaPx / DAY_W);
      if (Math.abs(deltaDays) < 1) return;
      const task = vis.find(t => t.id === curResize.taskId);
      if (!task || !task.start_date || !task.due_date) return;
      let newStart = task.start_date;
      let newDue   = task.due_date;
      if (curResize.edge === "start") {
        newStart = addDays(task.start_date, deltaDays);
        if (newStart >= task.due_date) newStart = addDays(task.due_date, -1);
      } else {
        newDue = addDays(task.due_date, deltaDays);
        if (newDue <= task.start_date) newDue = addDays(task.start_date, 1);
      }
      const eps = [ms(newStart), ms(newDue)];
      const nearbyCount = vis.filter(t => t.id !== task.id && [t.start_date, t.due_date]
        .filter(Boolean).some(d => eps.some(ep => Math.abs(ms(d!) - ep) <= 3 * DAY_MS))).length;
      const mode: PendingReschedule["mode"] = curResize.edge === "start" ? "resize-start" : "resize-end";
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

  // ── HTML5 DnD ──────────────────────────────────────────────────────────────

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
    const rawId  = e.dataTransfer.getData(DND_TYPE);
    const taskId = parseInt(rawId, 10);
    if (!rawId || isNaN(taskId)) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.start_date || task.due_date) return;
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPx    = e.clientX - rect.left;
    const offset = rangeStart + Math.floor(xPx / DAY_W);
    setPendingSchedule({ task, dropDate: offsetToDate(offset) });
  }

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

      <div style={{ background: "#fff", border: "1px solid #ECE7DD", borderRadius: 14, overflow: "hidden" }}>

        {/* ── Section header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F0EBE2" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", color: "#1B1B1A" }}>
              Cronograma de tareas
            </h2>
            <span style={{ fontSize: 12, color: "#94928D", fontFamily: "'JetBrains Mono', monospace" }}>
              {visible.length} {visible.length === 1 ? "tarea" : "tareas"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#94928D" }}>
            {(["Arrastrá", "Bordes", "Clic"] as const).map(k => (
              <span key={k} style={{ padding: "1px 6px", borderRadius: 4, background: "#F4F1EB", border: "1px solid #ECE7DD", color: "#3A3936", fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5 }}>
                {k}
              </span>
            ))}
            <span style={{ color: "#94928D" }}>para mover · duración · editar</span>
          </div>
        </div>

        {/* ── Body: sticky name col + scrollable grid ── */}
        <div style={{ display: "flex", overflow: "hidden" }}>

          {/* Left name column */}
          <div style={{ width: TASK_COL_W, flexShrink: 0, borderRight: "1px solid #F0EBE2", background: "#FAF8F4", display: "flex", flexDirection: "column" }}>
            {/* Column header */}
            <div style={{ height: 40, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid #F0EBE2" }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: "#94928D", textTransform: "uppercase" }}>Tarea</span>
            </div>
            {/* Task rows */}
            {visible.length === 0 ? (
              <div style={{ padding: "24px 16px", color: "#94928D", fontSize: 12.5, textAlign: "center" }}>
                Sin tareas programadas
              </div>
            ) : (
              visible.map(task => {
                const isSel  = selectedId === task.id;
                const resp   = task.responsible_id ? responsibles.find(r => r.id === task.responsible_id) : null;
                return (
                  <div
                    key={task.id}
                    onClick={() => { setSelectedId(task.id); onEditTask(task); }}
                    style={{
                      height: ROW_H,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "0 12px 0 8px",
                      borderBottom: "1px solid #F4F1EB",
                      cursor: "pointer",
                      background: isSel ? "#F4F1EB" : "transparent",
                      transition: "background 0.12s",
                    }}
                  >
                    {/* Grip dots */}
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{ flexShrink: 0, color: "#C9C3B6" }}>
                      <circle cx="3" cy="3" r="1.1" fill="currentColor"/><circle cx="3" cy="7" r="1.1" fill="currentColor"/>
                      <circle cx="3" cy="11" r="1.1" fill="currentColor"/><circle cx="7" cy="3" r="1.1" fill="currentColor"/>
                      <circle cx="7" cy="7" r="1.1" fill="currentColor"/><circle cx="7" cy="11" r="1.1" fill="currentColor"/>
                    </svg>
                    <StatusIcon status={task.status} size={13} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: "#1B1B1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {task.title}
                      </span>
                      {resp && (
                        <span style={{ fontSize: 10.5, color: "#94928D", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {resp.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: scrollable date grid */}
          <div style={{ flex: 1, overflowX: "auto" }}>
            <div style={{ width: gridWidth, minWidth: "100%" }}>

              {/* Day header row */}
              <div style={{ display: "flex", height: 40, borderBottom: "1px solid #F0EBE2", background: "#FAF8F4", position: "sticky", top: 0, zIndex: 6 }}>
                {Array.from({ length: totalDays }).map((_, i) => {
                  const offset  = rangeStart + i;
                  const d       = new Date(TODAY_MS + offset * DAY_MS);
                  const isToday = offset === 0;
                  const we      = isWeekend(d);
                  return (
                    <div
                      key={i}
                      style={{
                        width: DAY_W,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        borderLeft: i === 0 ? "none" : "1px solid #F0EBE2",
                        background: we ? "#F7F4EF" : "transparent",
                      }}
                    >
                      <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: isToday ? "#E76A2D" : "#94928D" }}>
                        {DAY_NAMES[d.getDay()]}
                      </div>
                      {isToday ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#E76A2D", borderRadius: 99, padding: "2px 8px", lineHeight: 1.3 }}>
                          Hoy
                        </span>
                      ) : (
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "#3A3936" }}>{d.getDate()}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bar rows */}
              <div
                ref={railRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  position: "relative",
                  outline: isDragOver ? "2px solid #E76A2D" : "none",
                  outlineOffset: -2,
                  minHeight: visible.length === 0 ? ROW_H * 3 : ROW_H * visible.length,
                }}
              >
                {/* Weekend background layer */}
                <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", zIndex: 0 }}>
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const offset = rangeStart + i;
                    const d = new Date(TODAY_MS + offset * DAY_MS);
                    return (
                      <div
                        key={i}
                        style={{
                          width: DAY_W,
                          flexShrink: 0,
                          height: "100%",
                          borderLeft: i === 0 ? "none" : "1px solid #F0EBE2",
                          background: isWeekend(d) ? "#F7F4EF" : "transparent",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Today orange line */}
                {0 >= rangeStart && 0 <= rangeEnd && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: offsetToLeft(0),
                      width: 1.5,
                      background: "#E76A2D",
                      pointerEvents: "none",
                      zIndex: 4,
                    }}
                  />
                )}

                {/* Empty state */}
                {visible.length === 0 && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                    <p style={{ fontSize: 12.5, color: "#94928D" }}>
                      {isDragOver ? "Soltá acá para programar la tarea" : "Sin tareas programadas. Arrastrá tareas desde abajo para programarlas."}
                    </p>
                  </div>
                )}

                {/* Task bar rows */}
                {visible.map((task, idx) => {
                  const isThisDrag   = drag?.taskId   === task.id;
                  const isThisResize = resize?.taskId === task.id;
                  const isSel  = selectedId    === task.id;
                  const isHL   = highlightedId === task.id;
                  const st     = STATUS_STYLE[task.status];

                  // Live delta
                  let deltaDays  = 0;
                  let resizeEdge: "start" | "end" | undefined;
                  if (isThisDrag   && drag)   deltaDays = Math.round(drag.currentDeltaPx   / DAY_W);
                  if (isThisResize && resize) { deltaDays = Math.round(resize.currentDeltaPx / DAY_W); resizeEdge = resize.edge; }

                  const { start, due } = getEffectiveDates(task, deltaDays, resizeEdge);

                  const hasBoth    = !!(start && due);
                  const startOff   = start ? dateToOffset(start) : null;
                  const dueOff     = due   ? dateToOffset(due)   : null;
                  const barLeftPx  = startOff !== null ? offsetToLeft(startOff) + 4 : (dueOff !== null ? offsetToLeft(dueOff) - 6 : 0);
                  const barWidthPx = hasBoth ? Math.max(8, (dueOff! - startOff!) * DAY_W - 8) : 12;

                  const resp       = task.responsible_id ? responsibles.find(r => r.id === task.responsible_id) : null;
                  const initials   = resp ? getInitials(resp.full_name) : null;
                  const avatarBg   = resp ? avatarColor(resp.full_name) : "#94928D";
                  const isOverdue  = task.status !== "completada" && task.status !== "cancelada" && !!task.due_date && task.due_date < TODAY_STR;

                  const barBoxShadow = isHL
                    ? "0 0 0 2px #E76A2D"
                    : isSel
                      ? `0 0 0 1.5px ${st.stripe}, 0 4px 14px -4px ${st.stripe}55`
                      : "0 1px 2px rgba(20,20,20,0.06)";

                  return (
                    <div
                      key={task.id}
                      style={{
                        position: "relative",
                        height: ROW_H,
                        borderBottom: "1px solid #F4F1EB",
                        background: isSel ? "rgba(231,106,45,0.04)" : (idx % 2 === 1 ? "#FDFCFA" : "transparent"),
                        zIndex: 1,
                      }}
                    >
                      {/* Bar */}
                      {(startOff !== null || dueOff !== null) && (
                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            bottom: 6,
                            left: barLeftPx,
                            width: barWidthPx,
                            zIndex: isThisDrag || isThisResize ? 5 : (isSel ? 3 : 1),
                          }}
                        >
                          {/* Bar body */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              borderRadius: 8,
                              background: st.bg,
                              border: `1px solid ${isOverdue ? "#D03A3A" : st.border}`,
                              boxShadow: barBoxShadow,
                              cursor: isThisDrag ? "grabbing" : "grab",
                              transform: isThisDrag ? "translateY(-1px) scale(1.004)" : "none",
                              transition: isThisDrag || isThisResize ? "none" : "box-shadow 0.15s, transform 0.15s",
                              display: "flex",
                              alignItems: "center",
                              overflow: "hidden",
                              userSelect: "none",
                            }}
                            onMouseDown={(e) => {
                              if ((e.target as HTMLElement).closest(".edge-handle")) return;
                              e.preventDefault();
                              startBarDrag(task.id, e.clientX);
                            }}
                          >
                            {/* Left status stripe */}
                            <div style={{ position: "absolute", left: 0, top: 5, bottom: 5, width: 3, borderRadius: 99, background: isOverdue ? "#D03A3A" : st.stripe }} />

                            {/* Task name inside bar (if enough space) */}
                            {hasBoth && barWidthPx > 52 && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 14, paddingRight: 4, flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 11.5, fontWeight: 500, color: "#1B1B1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {task.title}
                                </span>
                                {isOverdue && (
                                  <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: "#D03A3A", color: "#fff" }}>
                                    Vencida
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Assignee avatar */}
                            {initials && hasBoth && barWidthPx > 80 && (
                              <div style={{
                                flexShrink: 0,
                                width: 22,
                                height: 22,
                                borderRadius: 99,
                                background: avatarBg,
                                color: "#fff",
                                fontSize: 9.5,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "2px solid #fff",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                                marginRight: 6,
                              }}>
                                {initials}
                              </div>
                            )}
                          </div>

                          {/* Left resize handle */}
                          <div
                            className="edge-handle"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startEdgeResize(task.id, "start", e.clientX); }}
                            style={{ position: "absolute", top: 0, bottom: 0, left: -4, width: 12, cursor: "ew-resize", display: "flex", alignItems: "center" }}
                          >
                            <div style={{ width: 3, height: 14, borderRadius: 99, background: "rgba(20,20,20,0.16)" }} />
                          </div>

                          {/* Right resize handle */}
                          <div
                            className="edge-handle"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startEdgeResize(task.id, "end", e.clientX); }}
                            style={{ position: "absolute", top: 0, bottom: 0, right: -4, width: 12, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "flex-end" }}
                          >
                            <div style={{ width: 3, height: 14, borderRadius: 99, background: "rgba(20,20,20,0.16)" }} />
                          </div>

                          {/* Delta label (floating tooltip above bar during drag) */}
                          {(isThisDrag || isThisResize) && deltaDays !== 0 && start && due && (
                            <div style={{
                              position: "absolute",
                              top: -28,
                              left: "50%",
                              transform: "translateX(-50%)",
                              whiteSpace: "nowrap",
                              background: "#1B1B1A",
                              color: "#fff",
                              fontSize: 10.5,
                              fontWeight: 500,
                              fontFamily: "'JetBrains Mono', monospace",
                              padding: "3px 10px",
                              borderRadius: 99,
                              pointerEvents: "none",
                              zIndex: 20,
                              boxShadow: "0 4px 12px -2px rgba(0,0,0,0.22)",
                            }}>
                              {deltaDays > 0 ? "+" : ""}{deltaDays}d · {fmtShort(start)} → {fmtShort(due)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Drop zone strip when dragging unscheduled tasks */}
                {isDragOver && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0", borderTop: "2px dashed #E76A2D", background: "rgba(231,106,45,0.05)", zIndex: 10, position: "relative" }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: "#E76A2D", margin: 0 }}>
                      Soltá acá para programar la tarea
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", borderTop: "1px solid #F0EBE2", background: "#FAF8F4", flexWrap: "wrap" }}>
          {(Object.entries(STATUS_STYLE) as [TaskStatus, (typeof STATUS_STYLE)[TaskStatus]][]).map(([, st]) => (
            <div key={st.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 11, borderRadius: 4, background: st.bg, border: `1px solid ${st.border}`, position: "relative", overflow: "hidden", flexShrink: 0 }}>
                <div style={{ position: "absolute", left: 0, top: 1, bottom: 1, width: 2.5, borderRadius: 99, background: st.stripe }} />
              </div>
              <span style={{ fontSize: 11.5, color: "#6B6A66" }}>{st.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 1.5, height: 14, borderRadius: 99, background: "#E76A2D" }} />
            <span style={{ fontSize: 11.5, color: "#E76A2D", fontWeight: 500 }}>Hoy</span>
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
