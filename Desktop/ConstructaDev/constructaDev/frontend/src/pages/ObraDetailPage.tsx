import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
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
import type { Alert, HistorialEvento, Obra, Responsible, Task } from "../types";

type ObraTab = "resumen" | "tareas" | "responsables" | "alertas" | "historial";

const TABS: { id: ObraTab; label: string }[] = [
  { id: "resumen",      label: "Resumen" },
  { id: "tareas",       label: "Tareas" },
  { id: "responsables", label: "Responsables" },
  { id: "alertas",      label: "Alertas" },
  { id: "historial",    label: "Historial" },
];

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

  // Task modal state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        // Tasks are fetched first — the backend generates risk alerts during
        // this request. The subsequent fetches then see the committed alerts.
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
        setError(
          "No se pudo conectar con el servidor. Verificá que el backend esté corriendo."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [obra.id]
  );

  useEffect(() => {
    loadData();
    setActiveTab("resumen");
  }, [loadData]);

  async function handleMarkRead(alertId: number) {
    try {
      const updated = await markAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
    } catch {
      // silent fail
    }
  }

  async function handleMarkAllRead() {
    const unread = alerts.filter((a) => !a.is_read);
    if (unread.length === 0) return;
    try {
      const updated = await Promise.all(unread.map((a) => markAlertRead(a.id)));
      setAlerts((prev) =>
        prev.map((a) => updated.find((u) => u.id === a.id) ?? a)
      );
    } catch {
      loadData(true);
    }
  }

  function handleTaskSaved(savedTask: Task) {
    setShowCreateTask(false);
    setTaskToEdit(null);
    // Immediately reflect the returned task in local state so the UI updates
    // before the async loadData round-trip completes.
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

  const unreadAlerts = alerts.filter((a) => !a.is_read).length;

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
        const isActiveFn = (t: Task) =>
          t.status !== "completada" && t.status !== "cancelada";

        const seen = new Set<number>();
        const criticalTasks: Task[] = [];
        for (const t of [
          ...tasks.filter((t) => t.status === "bloqueada"),
          ...tasks.filter(
            (t) =>
              isActiveFn(t) &&
              !!t.due_date &&
              t.due_date < TODAY_T &&
              t.status !== "bloqueada"
          ),
          ...tasks.filter(
            (t) =>
              isActiveFn(t) &&
              !t.responsible_id &&
              t.status !== "bloqueada" &&
              !(t.due_date && t.due_date < TODAY_T)
          ),
        ]) {
          if (!seen.has(t.id) && criticalTasks.length < 5) {
            seen.add(t.id);
            criticalTasks.push(t);
          }
        }

        return (
          <div className="space-y-5">
            {/* ── Tareas críticas ── */}
            {criticalTasks.length > 0 && (
              <section>
                <SectionTitle>Tareas críticas</SectionTitle>
                <Card padding="none" className="overflow-hidden border border-constructa-danger/20">
                  <ul className="divide-y divide-constructa-surface">
                    {criticalTasks.map((t) => {
                      const isBlocked = t.status === "bloqueada";
                      const isOverdue =
                        !isBlocked &&
                        isActiveFn(t) &&
                        !!t.due_date &&
                        t.due_date < TODAY_T;
                      return (
                        <li
                          key={t.id}
                          className="flex items-center gap-3 px-4 py-3 bg-red-50/40"
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-semibold text-constructa-text truncate"
                              title={t.title}
                            >
                              {t.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isBlocked && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-constructa-danger">
                                Bloqueada
                              </span>
                            )}
                            {isOverdue && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-constructa-danger">
                                Vencida
                              </span>
                            )}
                            {!isBlocked && !isOverdue && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                Sin resp.
                              </span>
                            )}
                            <button
                              onClick={() => setTaskToEdit(t)}
                              title="Editar tarea"
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-constructa-secondaryText hover:text-constructa-primary hover:bg-constructa-surface transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </section>
            )}

            {/* ── Todas las tareas ── */}
            <section>
              <SectionTitle
                aside={
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateTask(true)}
                    className="text-xs px-3 py-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva tarea
                  </Button>
                }
              >
                Todas las tareas
              </SectionTitle>
              <Card padding="none" className="overflow-hidden">
                <TaskTable
                  tasks={tasks}
                  responsibles={responsibles}
                  onEdit={(t) => setTaskToEdit(t)}
                  onDelete={(t) => setTaskToDelete(t)}
                />
              </Card>
            </section>
          </div>
        );
      }

      case "responsables":
        return (
          <ObraResponsablesTab
            responsibles={responsibles}
            tasks={tasks}
            onRefresh={() => loadData(true)}
          />
        );

      case "alertas":
        return (
          <AlertasTab
            alerts={alerts}
            tasks={tasks}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onViewTask={(taskId) => {
              setActiveTab("tareas");
              if (taskId !== undefined) {
                const task = tasks.find((t) => t.id === taskId);
                if (task) setTaskToEdit(task);
              }
            }}
          />
        );

      case "historial":
        return (
          <section>
            <SectionTitle
              aside={
                <span className="text-xs text-constructa-secondaryText">
                  {historial.length} eventos
                </span>
              }
            >
              Historial de actividad
            </SectionTitle>
            <Card padding="md">
              <HistorialPanel events={historial} filterable />
            </Card>
          </section>
        );
    }
  }

  return (
    <>
      <div className="space-y-5">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-constructa-border pb-0">
          {TABS.map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-constructa-primary text-constructa-primary"
                    : "border-transparent text-constructa-secondaryText hover:text-constructa-text",
                ].join(" ")}
              >
                {label}
                {id === "alertas" && unreadAlerts > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-constructa-danger text-white text-[10px] font-bold">
                    {unreadAlerts}
                  </span>
                )}
              </button>
            );
          })}

          <div className="ml-auto pb-1">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Actualizar datos"
              className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-text hover:bg-constructa-surface disabled:opacity-40 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Tab content */}
        {renderTab()}
      </div>

      {/* Modals */}
      {showCreateTask && (
        <TaskFormModal
          mode="create"
          obraId={obra.id}
          responsibles={responsibles}
          taskCount={tasks.length}
          onClose={() => setShowCreateTask(false)}
          onSaved={handleTaskSaved}
        />
      )}

      {taskToEdit && (
        <TaskFormModal
          mode="edit"
          obraId={obra.id}
          task={taskToEdit}
          responsibles={responsibles}
          taskCount={tasks.length}
          onClose={() => setTaskToEdit(null)}
          onSaved={handleTaskSaved}
        />
      )}

      {taskToDelete && (
        <TaskDeleteConfirm
          task={taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onDeleted={handleTaskDeleted}
        />
      )}
    </>
  );
}
