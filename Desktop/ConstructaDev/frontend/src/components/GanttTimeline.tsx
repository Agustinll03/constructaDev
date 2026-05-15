import { useState, useEffect, useRef, useCallback } from "react";
import { ReschedulingModal } from "./ReschedulingModal";
import { SchedulingModal } from "./SchedulingModal";
import type { Task, TaskStatus, Responsible } from "../types";

// ─── Layout constants ─────────────────────────────────────────────────────────

const ROW_H      = 60;   // px per task row
const TASK_COL_W = 280;  // px for the fixed left name column
const BAR_H      = 34;   // px bar height

const TODAY_STR = new Date().toISOString().slice(0, 10);
const TODAY_MS  = new Date(TODAY_STR).getTime();
const DAY_MS    = 86_400_000;
const CLICK_THRESHOLD_PX = 5;
const DND_TYPE  = "application/x-constructa-task";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const NOW = new Date();
const currentMonthLabel = `${MONTH_NAMES[NOW.getMonth()]} · ${NOW.getFullYear()}`;

// ─── Status visual system ─────────────────────────────────────────────────────

const STATUS_STYLE: Record<TaskStatus, { bg: string; border: string; stripe: string; dot: string; label: string; badge: string | null }> = {
  pendiente:   { bg: "#FFFAEB", border: "#E89B14", stripe: "#E89B14", dot: "#E89B14", label: "Pendiente",   badge: null },
  en_progreso: { bg: "#FFF1E9", border: "#E85A26", stripe: "#E85A26", dot: "#E85A26", label: "En progreso", badge: null },
  bloqueada:   { bg: "#FCE5E5", border: "#D03A3A", stripe: "#D03A3A", dot: "#D03A3A", label: "Bloqueada",   badge: "Vencida" },
  en_revision: { bg: "#E5EEFB", border: "#2A6FDB", stripe: "#2A6FDB", dot: "#2A6FDB", label: "En revisión", badge: "Revisión" },
  completada:  { bg: "#E4F3EC", border: "#1F8A5B", stripe: "#1F8A5B", dot: "#1F8A5B", label: "Completada",  badge: "Completada" },
  cancelada:   { bg: "#F4F5F4", border: "#94928D", stripe: "#94928D", dot: "#94928D", label: "Cancelada",   badge: "Cancelada" },
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

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: TaskStatus }) {
  const { dot } = STATUS_STYLE[status];
  const base = { width: 16, height: 16, borderRadius: 99, flexShrink: 0 } as const;
  if (status === "completada")
    return (
      <div style={{ ...base, background: dot, border: `2px solid ${dot}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  if (status === "en_progreso")
    return <div style={{ ...base, border: `2px solid ${dot}`, background: `radial-gradient(circle, ${dot} 0% 30%, transparent 30%)` }} />;
  if (status === "cancelada")
    return <div style={{ ...base, border: "2px dashed #94928D", background: "repeating-linear-gradient(45deg,transparent 0 2px,#D5D7D3 2px 3px)" }} />;
  if (status === "pendiente")
    return <div style={{ ...base, border: `2px dashed ${dot}` }} />;
  // bloqueada, en_revision
  return <div style={{ ...base, border: `2px solid ${dot}` }} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DragState    { taskId: number; startClientX: number; currentDeltaPx: number; }
interface ResizeState  { taskId: number; edge: "start" | "end"; startClientX: number; currentDeltaPx: number; }
interface PendingReschedule { task: Task; newStartDate: string | null; newDueDate: string | null; nearbyCount: number; mode: "move" | "resize-start" | "resize-end"; }
interface PendingSchedule   { task: Task; dropDate: string; }
interface RowDragState { taskId: number; startY: number; currentDeltaY: number; }

interface GanttTimelineProps {
  tasks: Task[];
  responsibles: Responsible[];
  obraStartDate?: string | null;
  obraExpectedEndDate?: string | null;
  onSaved: () => void;
  onEditTask: (task: Task) => void;
  tasksWithoutDates?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GanttTimeline({
  tasks,
  responsibles,
  obraStartDate,
  obraExpectedEndDate,
  onSaved,
  onEditTask,
  tasksWithoutDates = 0,
}: GanttTimelineProps) {
  // ── View switcher state ──────────────────────────────────────────────────────
  const [view, setView] = useState<"semana" | "mes" | "trim">("semana");
  const dayW = view === "semana" ? 90 : view === "mes" ? 45 : 22;
  const dayWRef = useRef(dayW);
  dayWRef.current = dayW;

  // ── Existing state ───────────────────────────────────────────────────────────
  const [drag,            setDrag]            = useState<DragState | null>(null);
  const [resize,          setResize]          = useState<ResizeState | null>(null);
  const [pending,         setPending]         = useState<PendingReschedule | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<PendingSchedule | null>(null);
  const [selectedId,      setSelectedId]      = useState<number | null>(null);
  const [highlightedId,   setHighlightedId]   = useState<number | null>(null);
  const [isDragOver,      setIsDragOver]      = useState(false);
  const [hoveredRowId,    setHoveredRowId]    = useState<number | null>(null);

  // ── Row reorder state ────────────────────────────────────────────────────────
  const [rowOrder,   setRowOrder]   = useState<number[]>([]);
  const [rowDrag,    setRowDrag]    = useState<RowDragState | null>(null);
  const rowDragRef   = useRef<RowDragState | null>(null);
  const orderedVisRef = useRef<Task[]>([]);

  const dragRef       = useRef<DragState | null>(null);
  const resizeRef     = useRef<ResizeState | null>(null);
  const onEditRef     = useRef(onEditTask);
  const railRef       = useRef<HTMLDivElement>(null);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const stateRef      = useRef<{ visible: Task[]; rangeStart: number }>({ visible: [], rangeStart: 0 });

  useEffect(() => { onEditRef.current = onEditTask; }, [onEditTask]);

  // ── Date range ──────────────────────────────────────────────────────────────

  const visible = tasks.filter(t => t.start_date || t.due_date);

  // ── Ordered visible (for row reorder) ───────────────────────────────────────
  const visibleById = new Map(visible.map(t => [t.id, t]));
  const orderedVisible: Task[] = [
    ...rowOrder.filter(id => visibleById.has(id)).map(id => visibleById.get(id)!),
    ...visible.filter(t => !rowOrder.includes(t.id)),
  ];
  orderedVisRef.current = orderedVisible;

  // Sync rowOrder when visible tasks change
  useEffect(() => {
    setRowOrder(prev => {
      const prevSet = new Set(prev);
      const newIds = visible.filter(t => !prevSet.has(t.id)).map(t => t.id);
      const removed = prev.filter(id => visibleById.has(id));
      return [...removed, ...newIds];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map(t => t.id).join(",")]);

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
  const gridWidth = totalDays * dayW;

  stateRef.current = { visible, rangeStart };

  function offsetToLeft(offset: number): number {
    return (offset - rangeStart) * dayW;
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
    const currentDayW = dayWRef.current;

    if (curDrag) {
      if (Math.abs(curDrag.currentDeltaPx) < CLICK_THRESHOLD_PX) {
        const task = vis.find(t => t.id === curDrag.taskId);
        if (task) onEditRef.current(task);
        return;
      }
      const deltaDays = Math.round(curDrag.currentDeltaPx / currentDayW);
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
      const deltaDays = Math.round(curResize.currentDeltaPx / currentDayW);
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

  // ── Scroll to today on mount ────────────────────────────────────────────────

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const todayCol = (-rangeStart) * dayW;
      const target = todayCol - scrollRef.current.clientWidth / 3;
      scrollRef.current.scrollLeft = Math.max(0, target);
    });
    return () => cancelAnimationFrame(frame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Row reorder drag handlers ────────────────────────────────────────────────

  function startRowDrag(e: React.PointerEvent, taskId: number) {
    e.preventDefault();
    e.stopPropagation();
    const s: RowDragState = { taskId, startY: e.clientY, currentDeltaY: 0 };
    rowDragRef.current = s;
    setRowDrag(s);
  }

  useEffect(() => {
    if (!rowDrag) return;
    function onMove(e: PointerEvent) {
      if (!rowDragRef.current) return;
      const u = { ...rowDragRef.current, currentDeltaY: e.clientY - rowDragRef.current.startY };
      rowDragRef.current = u;
      setRowDrag(u);
    }
    function onUp() {
      const cur = rowDragRef.current;
      rowDragRef.current = null;
      setRowDrag(null);
      if (!cur) return;
      const ord = orderedVisRef.current;
      const origIdx = ord.findIndex(t => t.id === cur.taskId);
      const targetIdx = Math.max(0, Math.min(ord.length - 1, origIdx + Math.round(cur.currentDeltaY / ROW_H)));
      if (origIdx !== targetIdx) {
        const newOrder = ord.map(t => t.id);
        const [moved] = newOrder.splice(origIdx, 1);
        newOrder.splice(targetIdx, 0, moved);
        setRowOrder(newOrder);
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
  }, [rowDrag]);

  function getRowTranslate(taskId: number): number {
    if (!rowDrag) return 0;
    const ord = orderedVisRef.current;
    const origIdx = ord.findIndex(t => t.id === rowDrag.taskId);
    const thisIdx = ord.findIndex(t => t.id === taskId);
    const targetIdx = Math.max(0, Math.min(ord.length - 1, origIdx + Math.round(rowDrag.currentDeltaY / ROW_H)));
    if (taskId === rowDrag.taskId) return rowDrag.currentDeltaY;
    if (origIdx < targetIdx && thisIdx > origIdx && thisIdx <= targetIdx) return -ROW_H;
    if (origIdx > targetIdx && thisIdx >= targetIdx && thisIdx < origIdx) return ROW_H;
    return 0;
  }

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
    const offset = rangeStart + Math.floor(xPx / dayWRef.current);
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

      <div style={{ background: "#fff", border: "1px solid #ECE7DD", borderRadius: 14, overflow: "hidden", cursor: rowDrag ? "grabbing" : undefined }}>

        {/* ── Section header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F0EBE2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Calendar icon square */}
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: "linear-gradient(135deg, #FFF0E8 0%, #FFE0CC 100%)",
              border: "1px solid #F5D5C0",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="#E76A2D" strokeWidth="1.4" fill="none"/>
                <path d="M5 1.5v2M11 1.5v2M1.5 6h13" stroke="#E76A2D" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M4.5 9h1M7.5 9h1M10.5 9h1M4.5 11.5h1M7.5 11.5h1M10.5 11.5h1" stroke="#E76A2D" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "-0.015em", color: "#1A2329", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Cronograma de tareas
            </h2>
            <span style={{
              display: "inline-flex", alignItems: "center",
              padding: "2px 9px", borderRadius: 99,
              fontSize: 11.5, fontWeight: 600, color: "#5B6770",
              background: "#F0F1EF", border: "1px solid #E6E7E5",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>
              {visible.length} {visible.length === 1 ? "tarea" : "tareas"}
            </span>
            {tasksWithoutDates > 0 && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 99,
                fontSize: 11.5, fontWeight: 600, color: "#C97D0E",
                background: "#FDF1DE", border: "1px solid #F0D5A0",
              }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 14H2L8 2Z" stroke="#E89B14" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                  <path d="M8 7v3M8 11.5v.5" stroke="#E89B14" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {tasksWithoutDates} sin fecha
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Semana/Mes/Trim segmented control */}
            <div style={{ display: "flex", background: "#F4F1EB", borderRadius: 7, padding: 2, border: "1px solid #ECE7DD" }}>
              {(["semana", "mes", "trim"] as const).map((v, i) => {
                const lbl = ["Semana", "Mes", "Trim."][i];
                const isActive = view === v;
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      background: isActive ? "#fff" : "transparent",
                      border: "none", cursor: "pointer",
                      padding: "4px 10px", fontSize: 11.5, fontWeight: 500,
                      color: isActive ? "#1B1B1A" : "#6B6A66", borderRadius: 5,
                      boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    }}
                  >{lbl}</button>
                );
              })}
            </div>
            {/* Filter */}
            <button title="Filtrar" style={{ width: 28, height: 28, borderRadius: 6, background: "#fff", border: "1px solid #ECE7DD", display: "flex", alignItems: "center", justifyContent: "center", color: "#3A3936", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Go to today */}
            <button
              title="Ir a hoy"
              onClick={() => {
                if (!scrollRef.current) return;
                const currentDayW = dayWRef.current;
                const todayCol = (-rangeStart) * currentDayW;
                scrollRef.current.scrollTo({ left: Math.max(0, todayCol - scrollRef.current.clientWidth / 3), behavior: "smooth" });
              }}
              style={{ width: 28, height: 28, borderRadius: 6, background: "#fff", border: "1px solid #ECE7DD", display: "flex", alignItems: "center", justifyContent: "center", color: "#3A3936", cursor: "pointer" }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2" fill="#E76A2D"/>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body: sticky name col + scrollable grid ── */}
        <div style={{ display: "flex", overflow: "hidden" }}>

          {/* ── Left task column ── */}
          <div style={{ width: TASK_COL_W, flexShrink: 0, borderRight: "1px solid #F0EBE2", background: "#FAF8F4", display: "flex", flexDirection: "column" }}>

            {/* Column header */}
            <div style={{ height: 40, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid #F0EBE2", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: "#94928D", textTransform: "uppercase" }}>Tarea</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#8E97A0" }}>{currentMonthLabel}</span>
            </div>

            {/* Task rows */}
            {orderedVisible.length === 0 ? (
              <div style={{ padding: "24px 16px", color: "#94928D", fontSize: 12.5, textAlign: "center" }}>Sin tareas programadas</div>
            ) : (
              orderedVisible.map(task => {
                const isSel = selectedId === task.id;
                const isHov = hoveredRowId === task.id;
                const resp  = task.responsible_id ? responsibles.find(r => r.id === task.responsible_id) : null;
                const isDraggingThis = rowDrag?.taskId === task.id;
                return (
                  <div
                    key={task.id}
                    onMouseEnter={() => setHoveredRowId(task.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    onClick={() => { setSelectedId(task.id); onEditTask(task); }}
                    style={{
                      height: ROW_H, display: "grid",
                      gridTemplateColumns: "18px 18px 1fr auto",
                      alignItems: "center", gap: 8,
                      padding: "0 12px 0 8px",
                      borderBottom: "1px solid #F4F1EB",
                      cursor: "pointer",
                      background: isSel ? "#F4F1EB" : (isHov ? "#FCFBF9" : "transparent"),
                      transition: isDraggingThis ? "background 0.12s" : "background 0.12s, transform 0.22s cubic-bezier(.22,.61,.36,1)",
                      transform: `translateY(${getRowTranslate(task.id)}px)`,
                      zIndex: isDraggingThis ? 10 : "auto" as unknown as number,
                      boxShadow: isDraggingThis ? "0 8px 24px -6px rgba(24,34,42,0.18), 0 0 0 1px #D5D7D3" : "none",
                      position: "relative",
                    }}
                  >
                    {/* Grip */}
                    <GripHandle onPointerDown={(e) => startRowDrag(e, task.id)} />

                    {/* Status dot */}
                    <StatusDot status={task.status} />

                    {/* Name + owner */}
                    <div style={{ minWidth: 0, lineHeight: 1.2 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2329", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {task.title}
                      </div>
                      {resp && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: 99, flexShrink: 0,
                            background: avatarColor(resp.full_name),
                            color: "#fff", fontSize: 8, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                          }}>
                            {getInitials(resp.full_name)[0]}
                          </div>
                          <span style={{ fontSize: 11, color: "#94928D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {resp.full_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hover actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 3, opacity: isHov ? 1 : 0, transition: "opacity 0.15s" }}>
                      <button
                        onClick={e => { e.stopPropagation(); onEditTask(task); }}
                        title="Editar"
                        style={{ width: 24, height: 24, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#8E97A0", background: "none", border: "none", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F4F5F4")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M11.5 2.5l2 2-8 8H3.5v-2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={e => e.stopPropagation()}
                        title="Más"
                        style={{ width: 24, height: 24, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#8E97A0", background: "none", border: "none", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F4F5F4")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="3.5" cy="8" r="1.2"/>
                          <circle cx="8" cy="8" r="1.2"/>
                          <circle cx="12.5" cy="8" r="1.2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Right scrollable grid ── */}
          <div ref={scrollRef} style={{ flex: 1, overflowX: "auto" }}>
            <div style={{ width: gridWidth, minWidth: "100%" }}>

              {/* Day header row */}
              <div style={{ display: "flex", height: 40, borderBottom: "1px solid #F0EBE2", position: "sticky", top: 0, zIndex: 6 }}>
                {Array.from({ length: totalDays }).map((_, i) => {
                  const offset  = rangeStart + i;
                  const d       = new Date(TODAY_MS + offset * DAY_MS);
                  const isToday = offset === 0;
                  const we      = isWeekend(d);
                  return (
                    <div key={i} style={{
                      width: dayW, flexShrink: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: view === "semana" ? 2 : 1, padding: "6px 0",
                      borderLeft: i === 0 ? "none" : "1px solid #F0EBE2",
                      background: isToday ? "#E85A26" : (we ? "#F4F5F4" : "#FAFAF9"),
                    }}>
                      {/* Day name label — semana: always shown; mes: shown small; trim: hidden */}
                      {view !== "trim" && (
                        <div style={{
                          fontSize: view === "semana" ? 9.5 : 9,
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: isToday ? "rgba(255,255,255,0.85)" : "#94928D",
                        }}>
                          {DAY_NAMES[d.getDay()]}
                        </div>
                      )}
                      {/* Date number */}
                      <div style={{
                        fontSize: view === "semana" ? 18 : view === "mes" ? 13 : 10,
                        fontWeight: view === "semana" ? 700 : 600,
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        color: isToday ? "#fff" : (we ? "#5B6770" : "#1A2329"),
                      }}>
                        {d.getDate()}
                      </div>
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
                  minHeight: orderedVisible.length === 0 ? ROW_H * 3 : ROW_H * orderedVisible.length,
                }}
              >
                {/* Weekend background columns */}
                <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", zIndex: 0 }}>
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const offset = rangeStart + i;
                    const d = new Date(TODAY_MS + offset * DAY_MS);
                    return (
                      <div key={i} style={{
                        width: dayW, flexShrink: 0, height: "100%",
                        borderLeft: i === 0 ? "none" : "1px solid #F0EBE2",
                        background: isWeekend(d) ? "#F7F4EF" : "transparent",
                      }} />
                    );
                  })}
                </div>

                {/* Today vertical line */}
                {0 >= rangeStart && 0 <= rangeEnd && (
                  <div style={{
                    position: "absolute", top: 0, bottom: 0,
                    left: offsetToLeft(0),
                    width: 2,
                    background: "linear-gradient(180deg,#E76A2D 0%,rgba(231,106,45,0.35) 100%)",
                    boxShadow: "0 0 0 4px rgba(231,106,45,0.06)",
                    pointerEvents: "none", zIndex: 4,
                  }} />
                )}

                {/* Empty state */}
                {orderedVisible.length === 0 && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                    <p style={{ fontSize: 12.5, color: "#94928D" }}>
                      {isDragOver ? "Soltá acá para programar la tarea" : "Sin tareas programadas. Arrastrá tareas desde abajo para programarlas."}
                    </p>
                  </div>
                )}

                {/* Task bar rows */}
                {orderedVisible.map((task) => {
                  const isThisDrag   = drag?.taskId   === task.id;
                  const isThisResize = resize?.taskId === task.id;
                  const isSel  = selectedId    === task.id;
                  const isHL   = highlightedId === task.id;
                  const st     = STATUS_STYLE[task.status];
                  const isDraggingThisRow = rowDrag?.taskId === task.id;

                  let deltaDays = 0;
                  let resizeEdge: "start" | "end" | undefined;
                  if (isThisDrag   && drag)   deltaDays = Math.round(drag.currentDeltaPx   / dayW);
                  if (isThisResize && resize) { deltaDays = Math.round(resize.currentDeltaPx / dayW); resizeEdge = resize.edge; }

                  const { start, due } = getEffectiveDates(task, deltaDays, resizeEdge);
                  const hasBoth    = !!(start && due);
                  const startOff   = start ? dateToOffset(start) : null;
                  const dueOff     = due   ? dateToOffset(due)   : null;
                  const barLeftPx  = startOff !== null ? offsetToLeft(startOff) + 4 : (dueOff !== null ? offsetToLeft(dueOff) - 6 : 0);
                  const barWidthPx = hasBoth ? Math.max(8, (dueOff! - startOff!) * dayW - 8) : 12;

                  const resp     = task.responsible_id ? responsibles.find(r => r.id === task.responsible_id) : null;
                  const initials = resp ? getInitials(resp.full_name) : null;
                  const avatarBg = resp ? avatarColor(resp.full_name) : "#94928D";
                  const isOverdue = task.status !== "completada" && task.status !== "cancelada" && !!task.due_date && task.due_date < TODAY_STR;
                  const pct = task.estimated_progress ?? 0;

                  const barBoxShadow = isHL
                    ? "0 0 0 2px #E76A2D"
                    : isSel
                      ? `0 0 0 1.5px ${st.stripe}, 0 4px 14px -4px ${st.stripe}55`
                      : "0 1px 2px rgba(20,20,20,0.06)";

                  return (
                    <div
                      key={task.id}
                      style={{
                        position: "relative", height: ROW_H,
                        borderBottom: "1px solid #F4F1EB",
                        background: isSel ? "rgba(231,106,45,0.04)" : "transparent",
                        zIndex: isDraggingThisRow ? 10 : 1,
                        transform: `translateY(${getRowTranslate(task.id)}px)`,
                        transition: isDraggingThisRow ? "none" : "transform 0.22s cubic-bezier(.22,.61,.36,1)",
                      }}
                    >
                      {/* Bar */}
                      {(startOff !== null || dueOff !== null) && (
                        <div style={{
                          position: "absolute",
                          top: (ROW_H - BAR_H) / 2,
                          height: BAR_H,
                          left: barLeftPx,
                          width: barWidthPx,
                          zIndex: isThisDrag || isThisResize ? 5 : (isSel ? 3 : 1),
                        }}>
                          {/* Bar body */}
                          <div
                            style={{
                              position: "absolute", inset: 0,
                              borderRadius: 99,
                              background: isOverdue ? "#FCE5E5" : st.bg,
                              border: `1.5px solid ${isOverdue ? "#D03A3A" : st.border}`,
                              boxShadow: barBoxShadow,
                              cursor: isThisDrag ? "grabbing" : "grab",
                              transform: isThisDrag ? "translateY(-1px)" : "none",
                              transition: isThisDrag || isThisResize ? "none" : "box-shadow 0.15s, transform 0.15s",
                              userSelect: "none",
                            }}
                            onMouseDown={e => {
                              if ((e.target as HTMLElement).closest(".edge-handle")) return;
                              e.preventDefault();
                              startBarDrag(task.id, e.clientX);
                            }}
                          >
                            {/* Left stripe */}
                            <div style={{
                              position: "absolute", left: 0, top: 6, bottom: 6, width: 6,
                              borderRadius: 99,
                              background: isOverdue ? "#D03A3A" : st.stripe,
                            }} />

                            {/* Progress fill */}
                            {hasBoth && pct > 0 && (
                              <div style={{
                                position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
                                height: 4, borderRadius: 99,
                                width: `${Math.min(pct, 100)}%`,
                                maxWidth: "calc(100% - 36px)",
                                background: isOverdue ? "#D03A3A" : st.stripe,
                                opacity: 0.18,
                                pointerEvents: "none",
                              }} />
                            )}

                            {/* Text content area — clipped */}
                            {hasBoth && barWidthPx > 40 && (
                              <div style={{
                                position: "absolute",
                                left: 14,
                                right: initials ? 34 : 8,
                                top: 0, bottom: 0,
                                display: "flex", alignItems: "center", gap: 5,
                                overflow: "hidden",
                              }}>
                                <span style={{
                                  fontSize: 12, fontWeight: 600, color: "#1A2329",
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                  flexShrink: 1, minWidth: 0,
                                }}>
                                  {task.title}
                                </span>
                                {/* Status badge */}
                                {(isOverdue || st.badge) && barWidthPx > 90 && (
                                  <span style={{
                                    flexShrink: 0, fontSize: 10, fontWeight: 600,
                                    padding: "2px 7px", borderRadius: 99,
                                    background: isOverdue ? "#D03A3A" : st.stripe,
                                    color: "#fff", lineHeight: 1,
                                  }}>
                                    {isOverdue ? "Vencida" : st.badge}
                                  </span>
                                )}
                                {/* Progress % — only for pendiente/en_progreso with no badge, when there's room */}
                                {!isOverdue && !st.badge && pct > 0 && barWidthPx > 130 && (
                                  <span style={{
                                    flexShrink: 0,
                                    fontFamily: "'JetBrains Mono',monospace",
                                    fontSize: 10, fontWeight: 500,
                                    color: "#8E97A0", padding: "2px 6px", borderRadius: 99, background: "#F4F5F4",
                                  }}>
                                    {pct}%
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Assignee avatar — always at right edge */}
                            {initials && hasBoth && barWidthPx > 50 && (
                              <div style={{
                                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                                width: 22, height: 22, borderRadius: 99,
                                background: avatarBg, color: "#fff", fontSize: 9.5, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: "2px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                                flexShrink: 0,
                              }}>
                                {initials}
                              </div>
                            )}
                          </div>

                          {/* Left resize handle */}
                          <div
                            className="edge-handle"
                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); startEdgeResize(task.id, "start", e.clientX); }}
                            style={{ position: "absolute", top: 0, bottom: 0, left: -4, width: 12, cursor: "ew-resize", display: "flex", alignItems: "center" }}
                          >
                            <div style={{ width: 3, height: 14, borderRadius: 99, background: "rgba(20,20,20,0.16)" }} />
                          </div>

                          {/* Right resize handle */}
                          <div
                            className="edge-handle"
                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); startEdgeResize(task.id, "end", e.clientX); }}
                            style={{ position: "absolute", top: 0, bottom: 0, right: -4, width: 12, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "flex-end" }}
                          >
                            <div style={{ width: 3, height: 14, borderRadius: 99, background: "rgba(20,20,20,0.16)" }} />
                          </div>

                          {/* Delta tooltip */}
                          {(isThisDrag || isThisResize) && deltaDays !== 0 && start && due && (
                            <div style={{
                              position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)",
                              whiteSpace: "nowrap", background: "#1B1B1A", color: "#fff",
                              fontSize: 10.5, fontWeight: 500, fontFamily: "'JetBrains Mono',monospace",
                              padding: "3px 10px", borderRadius: 99, pointerEvents: "none", zIndex: 20,
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

                {/* Drop zone */}
                {isDragOver && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0", borderTop: "2px dashed #E76A2D", background: "rgba(231,106,45,0.05)", zIndex: 10, position: "relative" }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: "#E76A2D", margin: 0 }}>Soltá acá para programar la tarea</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", borderTop: "1px solid #F0EBE2", background: "#FAF8F4", flexWrap: "wrap" }}>
          {(Object.entries(STATUS_STYLE) as [TaskStatus, typeof STATUS_STYLE[TaskStatus]][]).map(([, st]) => (
            <div key={st.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 22, height: 12, borderRadius: 99, background: st.bg, border: `1.5px solid ${st.border}`, position: "relative", overflow: "hidden", flexShrink: 0 }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: st.stripe, borderRadius: "99px 0 0 99px" }} />
              </div>
              <span style={{ fontSize: 11.5, color: "#6B6A66" }}>{st.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 2, height: 14, borderRadius: 99, background: "#E76A2D" }} />
            <span style={{ fontSize: 11.5, color: "#E76A2D", fontWeight: 500, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Hoy</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#94928D", fontSize: 11, marginLeft: 8 }}>
            {["Arrastrá", "Bordes", "Clic"].map(k => (
              <span key={k} style={{ padding: "1px 6px", borderRadius: 4, background: "#fff", border: "1px solid #ECE7DD", color: "#3A3936", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5 }}>{k}</span>
            ))}
            <span>para mover · duración · editar</span>
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

// ─── Grip handle sub-component (hover color change) ──────────────────────────

function GripHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <svg
      width="10" height="14" viewBox="0 0 10 14" fill="none"
      style={{ color: hovered ? "#8E97A0" : "#C9C3B6", flexShrink: 0, cursor: "grab", transition: "color 0.15s" }}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <circle cx="3" cy="2.5" r="1.2" fill="currentColor"/>
      <circle cx="7" cy="2.5" r="1.2" fill="currentColor"/>
      <circle cx="3" cy="7"   r="1.2" fill="currentColor"/>
      <circle cx="7" cy="7"   r="1.2" fill="currentColor"/>
      <circle cx="3" cy="11.5" r="1.2" fill="currentColor"/>
      <circle cx="7" cy="11.5" r="1.2" fill="currentColor"/>
    </svg>
  );
}
