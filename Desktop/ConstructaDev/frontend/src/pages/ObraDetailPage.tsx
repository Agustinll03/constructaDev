import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { fetchAlerts, markAlertRead } from "../api/alerts";
import { fetchHistorial } from "../api/historial";
import { fetchResponsibles } from "../api/responsibles";
import { fetchTasksByObra } from "../api/tasks";
import { AlertasTab } from "../components/AlertasTab";
import { HistorialPanel } from "../components/HistorialPanel";
import { ResumenTab } from "../components/ResumenTab";
import { Spinner } from "../components/Spinner";
import { TaskDeleteConfirm } from "../components/TaskDeleteConfirm";
import { TaskFormModal } from "../components/TaskFormModal";
import { TaskTable } from "../components/TaskTable";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionTitle } from "../components/ui/SectionTitle";
import { ObraResponsablesTab } from "../components/ObraResponsablesTab";
import { useTaskSocket } from "../hooks/useTaskSocket";
import type { Alert, HistorialEvento, Obra, ObraStatus, Responsible, Task } from "../types";

type ObraTab = "resumen" | "tareas" | "responsables" | "alertas" | "historial";

// ── Visual helpers ─────────────────────────────────────────────────────────────

const HERO_GRADIENTS = [
  "linear-gradient(135deg, #FF8856 0%, #E85A26 100%)",
  "linear-gradient(135deg, #3D8BFF 0%, #1A63D4 100%)",
  "linear-gradient(135deg, #2AC58A 0%, #19956B 100%)",
  "linear-gradient(135deg, #B07CF7 0%, #8350D4 100%)",
  "linear-gradient(135deg, #8FA8B5 0%, #627E8E 100%)",
  "linear-gradient(135deg, #E8B14A 0%, #C98A1F 100%)",
  "linear-gradient(135deg, #5DA8B5 0%, #3A8994 100%)",
];

const AVATAR_COLORS = ["#2A6FDB", "#1F8A5B", "#9A4DC9", "#C97D0E", "#D03A3A", "#2C6571", "#E85A26"];

const STATUS_PILL: Record<ObraStatus, { label: string; bg: string; border: string; dot: string; color: string; glow?: string }> = {
  planificada: { label: "Planificada", bg: "#F0F1EF", border: "#E6E7E5", dot: "#8E97A0", color: "#5B6770" },
  en_progreso: { label: "En progreso", bg: "#E4F3EC", border: "#BFE3CE", dot: "#1F8A5B", color: "#136E47", glow: "0 0 0 3px rgba(31,138,91,0.18)" },
  pausada:     { label: "Pausada",     bg: "#FDF1DE", border: "#F0D5A0", dot: "#C97D0E", color: "#9A5D08" },
  completada:  { label: "Completada",  bg: "#E4F3EC", border: "#BFE3CE", dot: "#1F8A5B", color: "#136E47" },
  cancelada:   { label: "Cancelada",   bg: "#FCE5E5", border: "#F0B0B0", dot: "#D03A3A", color: "#A82B2B" },
};

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ObraDetailPageProps {
  obra: Obra;
}

export function ObraDetailPage({ obra }: ObraDetailPageProps) {
  const [activeTab, setActiveTab] = useState<ObraTab>("resumen");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [historial, setHistorial] = useState<HistorialEvento[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const tasksData = await fetchTasksByObra(obra.id);
      const [allAlerts, historialData, responsiblesData] = await Promise.all([
        fetchAlerts(),
        fetchHistorial(obra.id),
        fetchResponsibles(),
      ]);
      setTasks(tasksData);
      setAlerts(allAlerts.filter((a) => a.obra_id === obra.id));
      setHistorial(historialData);
      setResponsibles(responsiblesData);
    } catch {
      setError("No se pudo conectar con el servidor. Verificá que el backend esté corriendo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [obra.id]);

  useEffect(() => {
    loadData();
    setActiveTab("resumen");
  }, [loadData]);

  const refreshTasks = useCallback(async () => {
    try {
      const fresh = await fetchTasksByObra(obra.id);
      setTasks((prev) => {
        const hasChanges =
          fresh.length !== prev.length ||
          fresh.some((t) => {
            const old = prev.find((p) => p.id === t.id);
            return !old || old.status !== t.status || old.estimated_progress !== t.estimated_progress || old.due_date !== t.due_date;
          });
        return hasChanges ? fresh : prev;
      });
    } catch { /* silent */ }
  }, [obra.id]);

  useEffect(() => {
    window.addEventListener("focus", refreshTasks);
    return () => window.removeEventListener("focus", refreshTasks);
  }, [refreshTasks]);

  useEffect(() => { refreshTasks(); }, [activeTab, refreshTasks]);

  useTaskSocket(
    obra.id,
    useCallback((payload) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.taskId
            ? { ...t, status: payload.status, estimated_progress: payload.estimatedProgress, due_date: payload.dueDate, updated_at: payload.updatedAt }
            : t
        )
      );
    }, [])
  );

  async function handleMarkRead(alertId: number) {
    try {
      const updated = await markAlertRead(alertId);
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch { /* silent */ }
  }

  async function handleMarkAllRead() {
    const unread = alerts.filter((a) => !a.is_read);
    if (unread.length === 0) return;
    try {
      const updated = await Promise.all(unread.map((a) => markAlertRead(a.id)));
      setAlerts((prev) => prev.map((a) => updated.find((u) => u.id === a.id) ?? a));
    } catch { loadData(true); }
  }

  function handleTaskSaved(savedTask: Task) {
    setShowCreateTask(false);
    setTaskToEdit(null);
    setTasks((prev) =>
      prev.some((t) => t.id === savedTask.id)
        ? prev.map((t) => (t.id === savedTask.id ? savedTask : t))
        : [...prev, savedTask]
    );
    loadData(true);
  }

  function handleTaskDeleted() {
    setTaskToDelete(null);
    loadData(true);
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const unreadAlerts = alerts.filter((a) => !a.is_read).length;
  const initials = getInitials(obra.name);
  const badgeGradient = HERO_GRADIENTS[obra.id % HERO_GRADIENTS.length];
  const statusCfg = STATUS_PILL[obra.status];

  const TABS: Array<{ id: ObraTab; label: string; count?: number; isAlert?: boolean }> = [
    { id: "resumen",      label: "Resumen" },
    { id: "tareas",       label: "Tareas",       count: tasks.length },
    { id: "responsables", label: "Responsables", count: responsibles.length },
    { id: "alertas",      label: "Alertas",      count: unreadAlerts, isAlert: true },
    { id: "historial",    label: "Historial" },
  ];

  // ── Tab content ─────────────────────────────────────────────────────────────
  function renderTab() {
    if (loading) return <Spinner />;

    switch (activeTab) {
      case "resumen":
        return (
          <ResumenTab
            tasks={tasks}
            alerts={alerts}
            historial={historial}
            responsibles={responsibles}
            obraStartDate={obra.start_date}
            obraExpectedEndDate={obra.expected_end_date}
            error={error}
            onMarkRead={handleMarkRead}
            onViewAlerts={() => setActiveTab("alertas")}
            onViewTareas={() => setActiveTab("tareas")}
            onViewHistorial={() => setActiveTab("historial")}
            onEditTask={(t) => setTaskToEdit(t)}
            onTaskRescheduled={() => loadData(true)}
          />
        );

      case "tareas": {
        const TODAY_T = new Date().toISOString().slice(0, 10);
        const isActiveFn = (t: Task) => t.status !== "completada" && t.status !== "cancelada";
        const seen = new Set<number>();
        const criticalTasks: Task[] = [];
        for (const t of [
          ...tasks.filter((t) => t.status === "bloqueada"),
          ...tasks.filter((t) => isActiveFn(t) && !!t.due_date && t.due_date < TODAY_T && t.status !== "bloqueada"),
          ...tasks.filter((t) => isActiveFn(t) && !t.responsible_id && t.status !== "bloqueada" && !(t.due_date && t.due_date < TODAY_T)),
        ]) {
          if (!seen.has(t.id) && criticalTasks.length < 5) { seen.add(t.id); criticalTasks.push(t); }
        }
        return (
          <div className="space-y-5">
            {criticalTasks.length > 0 && (
              <section>
                <SectionTitle>Tareas críticas</SectionTitle>
                <Card padding="none" className="overflow-hidden border border-constructa-danger/20">
                  <ul className="divide-y divide-constructa-surface">
                    {criticalTasks.map((t) => {
                      const isBlocked = t.status === "bloqueada";
                      const isOverdue = !isBlocked && isActiveFn(t) && !!t.due_date && t.due_date < TODAY_T;
                      return (
                        <li key={t.id} className="flex items-center gap-3 px-4 py-3 bg-red-50/40">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-constructa-text truncate" title={t.title}>{t.title}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isBlocked && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-constructa-danger">Bloqueada</span>}
                            {isOverdue && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-constructa-danger">Vencida</span>}
                            {!isBlocked && !isOverdue && <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Sin resp.</span>}
                            <button onClick={() => setTaskToEdit(t)} title="Editar tarea" className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-constructa-secondaryText hover:text-constructa-primary hover:bg-constructa-surface transition-colors">Editar</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </section>
            )}
            <section>
              <SectionTitle aside={<Button variant="primary" onClick={() => setShowCreateTask(true)} className="text-xs px-3 py-1.5"><Plus className="w-3.5 h-3.5" />Nueva tarea</Button>}>
                Todas las tareas
              </SectionTitle>
              <Card padding="none" className="overflow-hidden">
                <TaskTable tasks={tasks} responsibles={responsibles} onEdit={(t) => setTaskToEdit(t)} onDelete={(t) => setTaskToDelete(t)} />
              </Card>
            </section>
          </div>
        );
      }

      case "responsables":
        return <ObraResponsablesTab responsibles={responsibles} tasks={tasks} onRefresh={() => loadData(true)} />;

      case "alertas":
        return (
          <AlertasTab
            alerts={alerts} tasks={tasks}
            onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead}
            onViewTask={(taskId) => {
              setActiveTab("tareas");
              if (taskId !== undefined) { const task = tasks.find((t) => t.id === taskId); if (task) setTaskToEdit(task); }
            }}
          />
        );

      case "historial":
        return (
          <section>
            <SectionTitle aside={<span className="text-xs text-constructa-secondaryText">{historial.length} eventos</span>}>
              Historial de actividad
            </SectionTitle>
            <Card padding="md"><HistorialPanel events={historial} tasks={tasks} filterable /></Card>
          </section>
        );
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── Project header card ── */}
        <header style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          padding: "18px 20px",
          background: "#fff",
          border: "1px solid #E6E7E5",
          borderRadius: 14,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle gradient overlay */}
          <div style={{
            position: "absolute",
            top: 0, bottom: 0, left: 0,
            width: "30%",
            background: "linear-gradient(135deg, rgba(255,107,53,0.055), transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Left: badge + info */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", position: "relative", minWidth: 0 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, flexShrink: 0,
              background: badgeGradient,
              color: "#fff",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 18, letterSpacing: "0.02em",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 18px -8px rgba(232,90,38,0.5)",
            }}>{initials}</div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10.5, color: "#8E97A0",
                letterSpacing: "0.1em", marginBottom: 3,
              }}>
                #{obra.id.toString().padStart(3, "0")} · OBRA
              </div>
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 24, fontWeight: 700, color: "#1A2329",
                margin: 0, letterSpacing: "-0.025em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{obra.name}</h1>

              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginTop: 7, fontSize: 12.5, color: "#5B6770", flexWrap: "wrap",
              }}>
                {/* Status pill */}
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "3px 9px 3px 8px", borderRadius: 99,
                  fontSize: 11.5, fontWeight: 600,
                  background: statusCfg.bg,
                  border: `1px solid ${statusCfg.border}`,
                  color: statusCfg.color,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 99,
                    background: statusCfg.dot,
                    boxShadow: statusCfg.glow,
                    display: "inline-block", flexShrink: 0,
                  }} />
                  {statusCfg.label}
                </span>

                {obra.location && (
                  <>
                    <span style={{ color: "#D5D7D3" }}>·</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ color: "#8E97A0", flexShrink: 0 }}>
                        <path d="M8 2.5a3.8 3.8 0 013.8 3.8c0 2.8-3.8 7.2-3.8 7.2S4.2 9.1 4.2 6.3A3.8 3.8 0 018 2.5z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
                        <circle cx="8" cy="6.3" r="1.3" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                      </svg>
                      {obra.location}
                    </span>
                  </>
                )}

                {obra.expected_end_date && (
                  <>
                    <span style={{ color: "#D5D7D3" }}>·</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ color: "#8E97A0", flexShrink: 0 }}>
                        <rect x="2.5" y="3.5" width="11" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                        <path d="M5.5 2v3M10.5 2v3M2.5 7h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      Entrega {formatDate(obra.expected_end_date)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: avatars + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, position: "relative" }}>
            {/* Avatar stack */}
            {responsibles.length > 0 && (
              <div style={{ display: "flex", marginRight: 6 }}>
                {responsibles.slice(0, 4).map((r, i) => (
                  <div
                    key={r.id}
                    title={r.full_name}
                    style={{
                      width: 28, height: 28, borderRadius: 99,
                      background: AVATAR_COLORS[r.id % AVATAR_COLORS.length],
                      color: "#fff", fontWeight: 600, fontSize: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      border: "2px solid #fff",
                      marginLeft: i > 0 ? -8 : 0,
                      zIndex: 4 - i,
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(r.full_name)}
                  </div>
                ))}
                {responsibles.length > 4 && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 99,
                    background: "#F0F1EF", color: "#5B6770",
                    fontWeight: 600, fontSize: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid #fff",
                    marginLeft: -8, position: "relative", flexShrink: 0,
                  }}>
                    +{responsibles.length - 4}
                  </div>
                )}
              </div>
            )}

            {/* Nueva tarea */}
            <button
              onClick={() => setShowCreateTask(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 14px", borderRadius: 10,
                fontSize: 13, fontWeight: 500,
                background: "#FF6B35", color: "#fff",
                border: "none", cursor: "pointer",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 14px -6px rgba(255,107,53,0.5)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#E85A26")}
              onMouseLeave={e => (e.currentTarget.style.background = "#FF6B35")}
            >
              <Plus style={{ width: 13, height: 13 }} />
              Nueva tarea
            </button>
          </div>
        </header>

        {/* ── Tabs (segment pill) ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{
            display: "inline-flex", gap: 2,
            background: "#fff",
            border: "1px solid #E6E7E5",
            padding: 4, borderRadius: 11,
          }}>
            {TABS.map(({ id, label, count, isAlert }) => {
              const isActive = activeTab === id;
              const alertActive = isAlert && isActive;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    padding: "7px 14px", borderRadius: 8,
                    fontSize: 12.5, fontWeight: 500,
                    display: "inline-flex", alignItems: "center", gap: 7,
                    border: "none", cursor: "pointer",
                    transition: "background 0.15s, color 0.15s",
                    background: alertActive ? "#FF6B35" : isActive ? "#2F3A40" : "transparent",
                    color: isActive ? "#fff" : "#5B6770",
                  }}
                >
                  {label}
                  {count !== undefined && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10.5, padding: "1px 6px", borderRadius: 99,
                      background: isActive
                        ? "rgba(255,255,255,0.18)"
                        : (isAlert && count > 0 ? "#FFF1E9" : "#F0F1EF"),
                      color: isActive
                        ? "#fff"
                        : (isAlert && count > 0 ? "#FF6B35" : "#8E97A0"),
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right tools */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 14px", borderRadius: 10,
                fontSize: 13, fontWeight: 500, cursor: refreshing ? "default" : "pointer",
                background: "#fff", border: "1px solid #E6E7E5", color: "#1A2329",
                opacity: refreshing ? 0.55 : 1,
                transition: "border-color 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}>
                <path d="M3 8a5 5 0 018.5-3.5L13 6M13 3v3h-3M13 8a5 5 0 01-8.5 3.5L3 10M3 13v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Actualizar
            </button>
          </div>
        </div>

        {/* ── Tab content ── */}
        {renderTab()}
      </div>

      {/* ── Modals ── */}
      {showCreateTask && (
        <TaskFormModal
          mode="create" obraId={obra.id} responsibles={responsibles} taskCount={tasks.length}
          onClose={() => setShowCreateTask(false)} onSaved={handleTaskSaved}
        />
      )}
      {taskToEdit && (
        <TaskFormModal
          mode="edit" obraId={obra.id} task={taskToEdit} responsibles={responsibles} taskCount={tasks.length}
          onClose={() => setTaskToEdit(null)} onSaved={handleTaskSaved}
        />
      )}
      {taskToDelete && (
        <TaskDeleteConfirm task={taskToDelete} onClose={() => setTaskToDelete(null)} onDeleted={handleTaskDeleted} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
