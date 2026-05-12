import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { Responsible, Task } from "../types";
import { StatusBadge } from "./ui/StatusBadge";

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

function ProgressBar({ value }: { value: number }) {
  const color =
    value === 100
      ? "bg-constructa-success"
      : value >= 50
      ? "bg-constructa-primary/60"
      : "bg-constructa-border";

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-constructa-surface rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] text-constructa-secondaryText w-7 text-right tabular-nums">
        {value}%
      </span>
    </div>
  );
}

function ResponsableCell({
  task,
  responsibles,
}: {
  task: Task;
  responsibles?: Responsible[];
}) {
  if (!task.responsible_id) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-constructa-warning">
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        Sin responsable
      </span>
    );
  }
  if (responsibles) {
    const r = responsibles.find((r) => r.id === task.responsible_id);
    const name = r?.full_name ?? `#${task.responsible_id}`;
    return (
      <span className="block truncate max-w-[12rem] text-constructa-secondaryText" title={name}>
        {name}
      </span>
    );
  }
  return (
    <span className="text-constructa-secondaryText">
      #{task.responsible_id}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskTableProps {
  tasks: Task[];
  responsibles?: Responsible[];
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export function TaskTable({
  tasks,
  responsibles,
  onEdit,
  onDelete,
}: TaskTableProps) {
  const hasActions = !!(onEdit || onDelete);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-constructa-secondaryText text-sm">
        No hay tareas registradas para esta obra.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-constructa-border bg-constructa-surface text-left">
            {[
              "Tarea",
              "Estado",
              "Avance",
              "Responsable",
              "Vencimiento",
              ...(hasActions ? ["Acciones"] : []),
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-constructa-secondaryText whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-constructa-surface">
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="hover:bg-constructa-bg transition-colors"
            >
              <td className="px-4 py-3 font-semibold text-constructa-text max-w-xs overflow-hidden">
                <span className="block truncate" title={task.title}>
                  {task.title}
                </span>
                {task.description && (
                  <span
                    className="block text-xs text-constructa-secondaryText font-normal truncate mt-0.5"
                    title={task.description}
                  >
                    {task.description}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={task.status} />
              </td>
              <td className="px-4 py-3 w-36">
                <ProgressBar value={task.estimated_progress} />
              </td>
              <td className="px-4 py-3">
                <ResponsableCell task={task} responsibles={responsibles} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-constructa-secondaryText">
                  {fmtDate(task.due_date)}
                </span>
                {isOverdue(task) && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-constructa-danger">
                    Vencida
                  </span>
                )}
              </td>
              {hasActions && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(task)}
                        title="Editar tarea"
                        className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-info hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(task)}
                        title="Eliminar tarea"
                        className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-danger hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
