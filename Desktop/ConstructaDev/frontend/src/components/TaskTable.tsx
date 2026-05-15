import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { Responsible, Task, TaskStatus } from "../types";
import type { Editor } from "../hooks/useEditingSimulation";

// ─── Design tokens (mirrors GanttTimeline) ────────────────────────────────────

const STATUS_STYLE: Record<TaskStatus, { bg: string; border: string; dot: string; label: string; stripe: string }> = {
  pendiente:   { bg: "#FFFAEB", border: "#E89B14", dot: "#E89B14", label: "Pendiente",   stripe: "#E89B14" },
  en_progreso: { bg: "#FFF1E9", border: "#E85A26", dot: "#E85A26", label: "En progreso", stripe: "#E85A26" },
  bloqueada:   { bg: "#FCE5E5", border: "#D03A3A", dot: "#D03A3A", label: "Bloqueada",   stripe: "#D03A3A" },
  en_revision: { bg: "#E5EEFB", border: "#2A6FDB", dot: "#2A6FDB", label: "En revisión", stripe: "#2A6FDB" },
  completada:  { bg: "#E4F3EC", border: "#1F8A5B", dot: "#1F8A5B", label: "Completada",  stripe: "#1F8A5B" },
  cancelada:   { bg: "#F4F5F4", border: "#94928D", dot: "#94928D", label: "Cancelada",   stripe: "#94928D" },
};

const AVATAR_COLORS = ["#E76A2D", "#3A6BD9", "#1F9A5A", "#9A4DC9", "#D03A3A", "#E89B14", "#0EA5A0"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function isOverdue(task: Task): boolean {
  return (
    task.due_date !== null &&
    task.due_date < TODAY &&
    task.status !== "completada" &&
    task.status !== "cancelada"
  );
}

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: TaskStatus }) {
  const { bg, border, dot, label } = STATUS_STYLE[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px 3px 7px", borderRadius: 99,
      fontSize: 11.5, fontWeight: 600, letterSpacing: "0.01em",
      background: bg, border: `1px solid ${border}`, color: border,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function ProgressPill({ value }: { value: number }) {
  const color =
    value === 100 ? "#1F8A5B" :
    value >= 60   ? "#E85A26" :
    value >= 30   ? "#E89B14" : "#94928D";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 96 }}>
      <div style={{
        flex: 1, height: 5, borderRadius: 99,
        background: "#EDEEED", overflow: "hidden",
      }}>
        <div style={{ width: `${value}%`, height: "100%", borderRadius: 99, background: color, transition: "width 0.4s ease" }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, color,
        fontFamily: "'JetBrains Mono', monospace",
        minWidth: 28, textAlign: "right",
      }}>
        {value}%
      </span>
    </div>
  );
}

function ResponsableAvatar({
  task,
  responsibles,
}: {
  task: Task;
  responsibles?: Responsible[];
}) {
  if (!task.responsible_id) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 99, flexShrink: 0,
          background: "#FDF1DE", border: "1.5px dashed #E89B14",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertTriangle style={{ width: 11, height: 11, color: "#E89B14" }} />
        </div>
        <span style={{ fontSize: 11.5, color: "#C97D0E", fontWeight: 600 }}>Sin asignar</span>
      </div>
    );
  }
  const r = responsibles?.find(r => r.id === task.responsible_id);
  const name = r?.full_name ?? `#${task.responsible_id}`;
  const color = avatarColor(name);
  const initials = getInitials(name);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 99, flexShrink: 0,
        background: color, color: "#fff",
        fontWeight: 700, fontSize: 9.5,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {initials}
      </div>
      <span style={{
        fontSize: 12.5, color: "#3E4A52", fontWeight: 500,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: 110,
      }} title={name}>
        {name}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskTableProps {
  tasks: Task[];
  responsibles?: Responsible[];
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  editingMap?: Map<number, Editor>;
  highlightedTaskId?: number | null;
}

export function TaskTable({
  tasks,
  responsibles,
  onEdit,
  onDelete,
  editingMap,
  highlightedTaskId,
}: TaskTableProps) {
  const hasActions = !!(onEdit || onDelete);

  if (tasks.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "52px 24px", gap: 10,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: "#F0F1EF",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94928D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#3E4A52", margin: 0 }}>No hay tareas registradas</p>
          <p style={{ fontSize: 12, color: "#8E97A0", margin: "3px 0 0" }}>Creá la primera tarea para esta obra.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Column header row ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: hasActions
          ? "1fr 140px 120px 170px 110px 80px"
          : "1fr 140px 120px 170px 110px",
        alignItems: "center",
        padding: "8px 20px",
        borderBottom: "1px solid #F2F0EC",
        background: "#fff",
      }}>
        {[
          "Tarea", "Estado", "Avance", "Responsable", "Vencimiento",
          ...(hasActions ? [""] : []),
        ].map(label => (
          <span key={label} style={{
            fontSize: 10, fontWeight: 600, color: "#ADAAA4",
            letterSpacing: "0.09em", textTransform: "uppercase" as const,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {label}
          </span>
        ))}
      </div>

      {/* ── Task rows ── */}
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {tasks.map((task, idx) => {
          const style      = STATUS_STYLE[task.status];
          const editor     = editingMap?.get(task.id);
          const overdue    = isOverdue(task);
          const isHighlight = highlightedTaskId === task.id;
          const isDanger   = task.status === "bloqueada" || overdue;

          return (
            <li
              key={task.id}
              style={{
                display: "grid",
                gridTemplateColumns: hasActions
                  ? "1fr 140px 120px 170px 110px 80px"
                  : "1fr 140px 120px 170px 110px",
                alignItems: "center",
                padding: "0 0 0 20px",
                minHeight: 64,
                borderBottom: idx < tasks.length - 1 ? "1px solid #F2F0EC" : "none",
                background: isHighlight
                  ? "rgba(255,107,53,0.06)"
                  : "transparent",
                outline: isHighlight ? "1.5px solid rgba(255,107,53,0.2)" : "none",
                outlineOffset: -1,
                transition: "background 0.5s ease",
                position: "relative",
              }}
            >
              {/* Left stripe for critical tasks */}
              {isDanger && (
                <div style={{
                  position: "absolute", left: 0, top: 8, bottom: 8,
                  width: 3, borderRadius: "0 2px 2px 0",
                  background: style.stripe,
                }} />
              )}

              {/* ── Task name + description ── */}
              <div style={{ paddingRight: 16, paddingTop: 10, paddingBottom: 10, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 600, color: "#1A2329",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  lineHeight: 1.3,
                }} title={task.title}>
                  {task.title}
                </div>
                {task.description && (
                  <div style={{
                    fontSize: 11.5, color: "#8E97A0", marginTop: 2, fontWeight: 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    lineHeight: 1.3,
                  }} title={task.description}>
                    {task.description}
                  </div>
                )}
                {editor && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: 99,
                      background: editor.color, color: "#fff",
                      fontSize: 7, fontWeight: 700, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {editor.initials}
                    </div>
                    <span style={{ fontSize: 10.5, color: "#8E97A0", fontStyle: "italic" }}>editando…</span>
                    <span style={{
                      width: 4, height: 4, borderRadius: 99,
                      background: editor.color, display: "inline-block",
                      animation: "task-editing-pulse 1.2s ease-in-out infinite",
                    }} />
                  </div>
                )}
              </div>

              {/* ── Status pill ── */}
              <div>
                <StatusPill status={task.status} />
              </div>

              {/* ── Progress ── */}
              <div style={{ paddingRight: 12 }}>
                <ProgressPill value={task.estimated_progress} />
              </div>

              {/* ── Responsible ── */}
              <div style={{ paddingRight: 12 }}>
                <ResponsableAvatar task={task} responsibles={responsibles} />
              </div>

              {/* ── Due date ── */}
              <div style={{ paddingRight: 8 }}>
                <span style={{
                  fontSize: 12.5, color: overdue ? "#D03A3A" : "#5B6770",
                  fontWeight: overdue ? 600 : 400,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {fmtDate(task.due_date)}
                </span>
                {overdue && (
                  <div style={{
                    display: "inline-block", marginLeft: 6,
                    padding: "1px 5px", borderRadius: 4,
                    fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: "#FCE5E5", color: "#D03A3A",
                  }}>
                    Vencida
                  </div>
                )}
              </div>

              {/* ── Actions ── */}
              {hasActions && (
                <div style={{ display: "flex", alignItems: "center", gap: 2, paddingRight: 12 }}>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(task)}
                      title="Editar tarea"
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: "none",
                        background: "transparent", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#8E97A0", transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "#EAF1FB";
                        e.currentTarget.style.color = "#2A6FDB";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#8E97A0";
                      }}
                    >
                      <Pencil style={{ width: 13, height: 13 }} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(task)}
                      title="Eliminar tarea"
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: "none",
                        background: "transparent", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#8E97A0", transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "#FCE5E5";
                        e.currentTarget.style.color = "#D03A3A";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#8E97A0";
                      }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
