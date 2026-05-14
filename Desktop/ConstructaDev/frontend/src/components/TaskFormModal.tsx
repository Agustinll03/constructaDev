import { useState, type FormEvent, type ChangeEvent } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { createTask, updateTask } from "../api/tasks";
import { Button } from "./ui/Button";
import type { Responsible, Task } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = (err = false) =>
  [
    "w-full border rounded px-3 py-2.5 text-sm text-constructa-text bg-white",
    "placeholder:text-constructa-border",
    "focus:outline-none focus:ring-2 focus:ring-constructa-primary focus:border-constructa-primary transition",
    err ? "border-constructa-danger" : "border-constructa-border",
  ].join(" ");

function Label({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-widest text-constructa-secondaryText mb-1.5">
      {children}
      {optional && (
        <span className="ml-1.5 normal-case tracking-normal font-normal text-constructa-border">
          (opcional)
        </span>
      )}
    </label>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskFormModalProps {
  mode: "create" | "edit";
  obraId: number;
  task?: Task;
  responsibles: Responsible[];
  /** Used to set order_index on creation */
  taskCount: number;
  onClose: () => void;
  onSaved: (task: Task) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFormModal({
  mode,
  obraId,
  task,
  responsibles,
  taskCount,
  onClose,
  onSaved,
}: TaskFormModalProps) {
  const activeResponsibles = responsibles.filter((r) => r.is_active);

  const previousResponsibleInactive =
    mode === "edit" &&
    task?.responsible_id != null &&
    !activeResponsibles.some((r) => r.id === task.responsible_id);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [responsibleId, setResponsibleId] = useState<string>(
    previousResponsibleInactive
      ? ""
      : task?.responsible_id != null
      ? String(task.responsible_id)
      : ""
  );
  const [startDate, setStartDate] = useState(task?.start_date ?? "");
  const [startTime, setStartTime] = useState(task?.start_time?.slice(0, 5) ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [dueTime, setDueTime] = useState(task?.due_time?.slice(0, 5) ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 2)
      e.title = "El título es obligatorio (mínimo 2 caracteres).";
    if (startDate && dueDate && dueDate < startDate)
      e.dueDate = "La fecha de vencimiento debe ser posterior a la de inicio.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        responsible_id: responsibleId ? Number(responsibleId) : null,
        start_date: startDate || null,
        start_time: startTime || null,
        due_date: dueDate || null,
        due_time: dueTime || null,
      };

      let saved: Task;
      if (mode === "create") {
        saved = await createTask({
          ...payload,
          obra_id: obraId,
          order_index: taskCount,
        });
      } else {
        saved = await updateTask(task!.id, payload);
      }
      onSaved(saved);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error((err as any)?.response?.data || err);
      setApiError(
        mode === "create"
          ? "No se pudo crear la tarea. Verificá los datos e intentá nuevamente."
          : "No se pudo guardar los cambios. Intentá nuevamente."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded shadow-card-md w-full max-w-lg">
        {/* Header */}
        <div className="bg-constructa-dark px-6 py-4 rounded-t flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">
              {mode === "create" ? "Nueva tarea" : "Editar tarea"}
            </p>
            <h2 className="text-white font-bold text-base mt-0.5">
              {mode === "create" ? "Agregar tarea a la obra" : task?.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <Label>Título</Label>
            <input
              className={inputCls(!!errors.title)}
              placeholder="Ej: Excavación y nivelación del terreno"
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              maxLength={255}
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-xs text-constructa-danger">
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label optional>Descripción</Label>
            <textarea
              className={[inputCls(), "resize-none"].join(" ")}
              placeholder="Descripción adicional de la tarea..."
              rows={3}
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
            />
          </div>

          {/* Responsible */}
          <div>
            <Label optional>Responsable</Label>
            {previousResponsibleInactive && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded px-3 py-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  El responsable anterior fue desactivado. Seleccioná uno activo
                  o dejá la tarea sin asignar.
                </p>
              </div>
            )}
            <select
              className={[inputCls(), "cursor-pointer"].join(" ")}
              value={responsibleId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setResponsibleId(e.target.value)
              }
            >
              <option value="">Sin responsable</option>
              {activeResponsibles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                  {r.role ? ` · ${r.role}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Dates + Times */}
          <div className="space-y-3">
            <div>
              <Label optional>Fecha y hora de inicio</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="date"
                  className={inputCls()}
                  value={startDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setStartDate(e.target.value)
                  }
                />
                <input
                  type="time"
                  className={[inputCls(), "w-32"].join(" ")}
                  value={startTime}
                  disabled={!startDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setStartTime(e.target.value)
                  }
                />
              </div>
            </div>
            <div>
              <Label optional>Fecha y hora de vencimiento</Label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="date"
                  className={inputCls(!!errors.dueDate)}
                  value={dueDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setDueDate(e.target.value)
                  }
                />
                <input
                  type="time"
                  className={[inputCls(!!errors.dueDate), "w-32"].join(" ")}
                  value={dueTime}
                  disabled={!dueDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setDueTime(e.target.value)
                  }
                />
              </div>
              {errors.dueDate && (
                <p className="mt-1 text-xs text-constructa-danger">
                  {errors.dueDate}
                </p>
              )}
            </div>
          </div>

          {/* Dates helper */}
          <p className="text-xs text-constructa-secondaryText bg-constructa-surface rounded px-3 py-2">
            Las fechas son opcionales, pero necesarias para visualizar la tarea en el cronograma.
          </p>

          {/* Status note */}
          <p className="text-xs text-constructa-secondaryText bg-constructa-surface rounded px-3 py-2">
            El estado de la tarea es gestionado por el sistema de chatbot y no
            puede modificarse manualmente.
          </p>

          {/* API error */}
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 border border-constructa-danger/30 rounded px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-constructa-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-constructa-danger">{apiError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : mode === "create" ? (
                "Crear tarea"
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
