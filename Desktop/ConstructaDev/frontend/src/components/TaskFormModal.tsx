import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { X, AlertTriangle, Loader2, ClipboardList } from "lucide-react";
import { createTask, updateTask } from "../api/tasks";
import { emitStartEditing, emitStopEditing } from "../hooks/useEditingSimulation";
import type { Responsible, Task } from "../types";

// ─── Design helpers ────────────────────────────────────────────────────────────


const BASE_INPUT: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  fontSize: 13,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: "#1A2329",
  background: "#fff",
  border: "1px solid #E6E7E5",
  borderRadius: 10,
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function inputStyle(err = false): React.CSSProperties {
  return {
    ...BASE_INPUT,
    borderColor: err ? "#D03A3A" : "#E6E7E5",
    boxShadow: err ? "0 0 0 3px rgba(208,58,58,0.08)" : "none",
  };
}

function onFocusInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, err = false) {
  if (err) return;
  e.currentTarget.style.borderColor = "#FF6B35";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,107,53,0.10)";
}
function onBlurInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, err = false) {
  e.currentTarget.style.borderColor = err ? "#D03A3A" : "#E6E7E5";
  e.currentTarget.style.boxShadow = err ? "0 0 0 3px rgba(208,58,58,0.08)" : "none";
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em",
        textTransform: "uppercase", color: "#5B6770",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {children}
      </span>
      {optional && (
        <span style={{ fontSize: 10.5, color: "#ADAAA4", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          (opcional)
        </span>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskFormModalProps {
  mode: "create" | "edit";
  obraId: number;
  task?: Task;
  responsibles: Responsible[];
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
  useEffect(() => {
    if (mode === "edit" && task) {
      emitStartEditing(task.id, obraId);
      return () => { emitStopEditing(task.id, obraId); };
    }
  }, [mode, task?.id, obraId]);

  const activeResponsibles = responsibles.filter(r => r.is_active);
  const previousResponsibleInactive =
    mode === "edit" &&
    task?.responsible_id != null &&
    !activeResponsibles.some(r => r.id === task.responsible_id);

  const [title,         setTitle]         = useState(task?.title ?? "");
  const [description,   setDescription]   = useState(task?.description ?? "");
  const [responsibleId, setResponsibleId] = useState<string>(
    previousResponsibleInactive ? "" : task?.responsible_id != null ? String(task.responsible_id) : ""
  );
  const [startDate, setStartDate] = useState(task?.start_date ?? "");
  const [startTime, setStartTime] = useState(task?.start_time?.slice(0, 5) ?? "");
  const [dueDate,   setDueDate]   = useState(task?.due_date ?? "");
  const [dueTime,   setDueTime]   = useState(task?.due_time?.slice(0, 5) ?? "");

  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [saving,   setSaving]   = useState(false);
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
        saved = await createTask({ ...payload, obra_id: obraId, order_index: taskCount });
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
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(15,22,28,0.50)",
      backdropFilter: "blur(3px)",
      padding: "16px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 18,
        width: "100%",
        maxWidth: 520,
        boxShadow: "0 32px 64px -16px rgba(15,22,28,0.30), 0 8px 24px -8px rgba(15,22,28,0.12)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        overflow: "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #1B2A34 0%, #243642 100%)",
          padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: "linear-gradient(135deg, #FF8856 0%, #E85A26 100%)",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px -4px rgba(232,90,38,0.55)",
            }}>
              <ClipboardList style={{ width: 17, height: 17, color: "#fff" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
                {mode === "create" ? "Nueva tarea" : "Editar tarea"}
              </p>
              <h2 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.015em", lineHeight: 1.2 }}>
                {mode === "create" ? "Agregar tarea a la obra" : task?.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, border: "none",
              background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Title */}
            <div>
              <FieldLabel>Título</FieldLabel>
              <input
                style={inputStyle(!!errors.title)}
                placeholder="Ej: Excavación y nivelación del terreno"
                value={title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                onFocus={ev => onFocusInput(ev, !!errors.title)}
                onBlur={ev => onBlurInput(ev, !!errors.title)}
                maxLength={255}
                autoFocus
              />
              {errors.title && (
                <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#D03A3A", display: "flex", alignItems: "center", gap: 5 }}>
                  <AlertTriangle style={{ width: 11, height: 11 }} />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <FieldLabel optional>Descripción</FieldLabel>
              <textarea
                style={{ ...inputStyle(), resize: "none" } as React.CSSProperties}
                placeholder="Descripción adicional de la tarea..."
                rows={3}
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                onFocus={ev => onFocusInput(ev)}
                onBlur={ev => onBlurInput(ev)}
              />
            </div>

            {/* Responsible */}
            <div>
              <FieldLabel optional>Responsable</FieldLabel>
              {previousResponsibleInactive && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  background: "#FDF1DE", border: "1px solid #E89B14",
                  borderRadius: 10, padding: "10px 12px", marginBottom: 8,
                }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: "#C97D0E", flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12, color: "#8B5E0A" }}>
                    El responsable anterior fue desactivado. Seleccioná uno activo o dejá la tarea sin asignar.
                  </p>
                </div>
              )}
              <select
                style={{ ...inputStyle(), cursor: "pointer", appearance: "none" } as React.CSSProperties}
                value={responsibleId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setResponsibleId(e.target.value)}
                onFocus={ev => onFocusInput(ev)}
                onBlur={ev => onBlurInput(ev)}
              >
                <option value="">Sin responsable</option>
                {activeResponsibles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.full_name}{r.role ? ` · ${r.role}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates + Times */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Start */}
              <div>
                <FieldLabel optional>Fecha y hora de inicio</FieldLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
                  <input
                    type="date"

                    style={inputStyle(!!errors.startDate)}
                    value={startDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                    onFocus={ev => onFocusInput(ev, !!errors.startDate)}
                    onBlur={ev => onBlurInput(ev, !!errors.startDate)}
                  />
                  <input
                    type="time"
                    style={{ ...inputStyle(), opacity: startDate ? 1 : 0.45 }}
                    value={startTime}
                    disabled={!startDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                    onFocus={ev => onFocusInput(ev)}
                    onBlur={ev => onBlurInput(ev)}
                  />
                </div>
                {errors.startDate && (
                  <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#D03A3A", display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle style={{ width: 11, height: 11 }} />
                    {errors.startDate}
                  </p>
                )}
              </div>

              {/* Due */}
              <div>
                <FieldLabel optional>Fecha y hora de vencimiento</FieldLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
                  <input
                    type="date"

                    style={inputStyle(!!errors.dueDate)}
                    value={dueDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                    onFocus={ev => onFocusInput(ev, !!errors.dueDate)}
                    onBlur={ev => onBlurInput(ev, !!errors.dueDate)}
                  />
                  <input
                    type="time"
                    style={{ ...inputStyle(!!errors.dueDate), opacity: dueDate ? 1 : 0.45 }}
                    value={dueTime}
                    disabled={!dueDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDueTime(e.target.value)}
                    onFocus={ev => onFocusInput(ev, !!errors.dueDate)}
                    onBlur={ev => onBlurInput(ev, !!errors.dueDate)}
                  />
                </div>
                {errors.dueDate && (
                  <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#D03A3A", display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertTriangle style={{ width: 11, height: 11 }} />
                    {errors.dueDate}
                  </p>
                )}
              </div>
            </div>

            {/* Info notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#F4F5F4", borderRadius: 10, padding: "10px 14px" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1, color: "#8E97A0" }}>
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                  <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <p style={{ margin: 0, fontSize: 12, color: "#5B6770", lineHeight: 1.45 }}>
                  Las fechas son opcionales, pero necesarias para visualizar la tarea en el cronograma.
                </p>
              </div>
            </div>

            {/* API error */}
            {apiError && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                background: "#FCE5E5", border: "1px solid #F0B0B0",
                borderRadius: 10, padding: "10px 14px",
              }}>
                <AlertTriangle style={{ width: 13, height: 13, color: "#D03A3A", flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, color: "#D03A3A" }}>{apiError}</p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 8,
            padding: "14px 24px 20px",
            borderTop: "1px solid #F0F1EF",
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                color: "#5B6770", background: "#fff", border: "1px solid #E6E7E5",
                cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#D03A3A"; e.currentTarget.style.color = "#D03A3A"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E6E7E5"; e.currentTarget.style.color = "#5B6770"; }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: saving ? "#F0A882" : "#FF6B35", color: "#fff",
                border: "none", cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 14px -6px rgba(255,107,53,0.5)",
                transition: "background 0.15s",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#E85A26"; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#FF6B35"; }}
            >
              {saving ? (
                <>
                  <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                  Guardando...
                </>
              ) : mode === "create" ? "Crear tarea" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
