import { useState, useRef, type ReactNode, type ChangeEvent, type KeyboardEvent } from "react";
import {
  X,
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  ImageOff,
} from "lucide-react";
import { uploadImage } from "../api/upload";
import { createObra } from "../api/obras";
import { createResponsible } from "../api/responsibles";
import { createTask } from "../api/tasks";
import { Button } from "./ui/Button";
import type { Obra } from "../types";

// ─── Local draft types ────────────────────────────────────────────────────────

interface ObraFormData {
  name: string;
  location: string;
  description: string;
  image_url: string;
  start_date: string;
  expected_end_date: string;
}

interface DraftResponsible {
  _key: string;
  full_name: string;
  whatsapp_number: string;
  role: string;
}

interface DraftTask {
  _key: string;
  title: string;
  description: string;
  responsible_key: string;
  start_date: string;
  due_date: string;
}

type RespForm = { full_name: string; whatsapp_number: string; role: string };
type TaskForm = {
  title: string;
  description: string;
  responsible_key: string;
  start_date: string;
  due_date: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const E164 = /^\+\d{7,15}$/;
let _seq = 0;
const uid = () => String(++_seq);

const STEPS = ["Datos básicos", "Responsables", "Tareas", "Confirmación"];

function inputCls(err = false) {
  return [
    "w-full border rounded px-3 py-2.5 text-sm text-constructa-text bg-white",
    "placeholder:text-constructa-border",
    "focus:outline-none focus:ring-2 focus:ring-constructa-primary focus:border-constructa-primary transition",
    err ? "border-constructa-danger" : "border-constructa-border",
  ].join(" ");
}

function formatDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  optional,
}: {
  children: ReactNode;
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

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-constructa-danger">{msg}</p>;
}

function InlineError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-constructa-danger flex items-center gap-1.5">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      {msg}
    </p>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-between mb-8">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={n} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={[
                  "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors",
                  active || done
                    ? "bg-constructa-primary border-constructa-primary text-white"
                    : "bg-white border-constructa-border text-constructa-secondaryText",
                ].join(" ")}
              >
                {done ? "✓" : n}
              </div>
              <span
                className={[
                  "mt-1.5 text-[10px] font-semibold text-center leading-tight px-1",
                  active || done
                    ? "text-constructa-primary"
                    : "text-constructa-secondaryText",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  "flex-1 h-0.5 mt-3.5 mx-1 transition-colors",
                  done ? "bg-constructa-primary" : "bg-constructa-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Datos básicos ───────────────────────────────────────────────────

function Step1({
  data,
  onChange,
  errors,
}: {
  data: ObraFormData;
  onChange: (d: ObraFormData) => void;
  errors: Record<string, string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(data.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imgLoadError, setImgLoadError] = useState(false);

  function set(field: keyof ObraFormData) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...data, [field]: e.target.value });
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Solo se aceptan imágenes (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("La imagen no puede superar 5 MB.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setImgLoadError(false);
    setUploadError(null);
    setUploading(true);

    try {
      const url = await uploadImage(file);
      onChange({ ...data, image_url: url });
    } catch {
      setUploadError("Error al subir la imagen. Intentá de nuevo.");
      setPreview(null);
      onChange({ ...data, image_url: "" });
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function clearImage() {
    setPreview(null);
    setUploadError(null);
    onChange({ ...data, image_url: "" });
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Nombre de la obra</FieldLabel>
        <input
          className={inputCls(!!errors.name)}
          placeholder="Ej: Edificio Palermo III"
          value={data.name}
          onChange={set("name")}
          maxLength={255}
          autoFocus
        />
        <FieldError msg={errors.name} />
      </div>

      <div>
        <FieldLabel>Ubicación</FieldLabel>
        <input
          className={inputCls(!!errors.location)}
          placeholder="Ej: Av. Santa Fe 1500, CABA"
          value={data.location}
          onChange={set("location")}
          maxLength={255}
        />
        <FieldError msg={errors.location} />
      </div>

      <div>
        <FieldLabel optional>Descripción</FieldLabel>
        <textarea
          className={[inputCls(), "resize-none"].join(" ")}
          placeholder="Descripción breve del proyecto..."
          rows={2}
          value={data.description}
          onChange={set("description")}
        />
      </div>

      {/* Image upload */}
      <div>
        <FieldLabel optional>Foto de la obra</FieldLabel>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        {preview && !imgLoadError ? (
          <div className="relative h-36 rounded overflow-hidden border border-constructa-border group">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setImgLoadError(true)}
            />
            {uploading ? (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span className="text-white text-xs font-mono">Subiendo...</span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-white bg-black/60 hover:bg-black/80 px-3 py-1.5 rounded transition-colors font-mono"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={clearImage}
                  className="p-1.5 bg-black/60 hover:bg-constructa-danger/80 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="h-36 rounded border-2 border-dashed border-constructa-border hover:border-constructa-primary cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors group bg-constructa-surface/40"
          >
            {imgLoadError ? (
              <ImageOff className="w-6 h-6 text-constructa-border" />
            ) : (
              <Upload className="w-6 h-6 text-constructa-border group-hover:text-constructa-primary transition-colors" />
            )}
            <div className="text-center">
              <p className="text-xs text-constructa-text font-semibold">
                Hacé click o arrastrá una foto
              </p>
              <p className="text-[10px] text-constructa-border mt-0.5 font-mono">
                JPG · PNG · WebP — máx. 5 MB
              </p>
            </div>
          </div>
        )}

        {uploadError && <FieldError msg={uploadError} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel optional>Fecha de inicio</FieldLabel>
          <input
            type="date"
            className={inputCls()}
            value={data.start_date}
            onChange={set("start_date")}
          />
        </div>
        <div>
          <FieldLabel optional>Fecha estimada de fin</FieldLabel>
          <input
            type="date"
            className={inputCls(!!errors.expected_end_date)}
            value={data.expected_end_date}
            onChange={set("expected_end_date")}
          />
          <FieldError msg={errors.expected_end_date} />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 — Responsables ────────────────────────────────────────────────────

function Step2({
  responsibles,
  form,
  onFormChange,
  error,
  onAdd,
  onRemove,
  onEdit,
}: {
  responsibles: DraftResponsible[];
  form: RespForm;
  onFormChange: (f: RespForm) => void;
  error: string | null;
  onAdd: () => void;
  onRemove: (k: string) => void;
  onEdit: (k: string) => void;
}) {
  function set(field: keyof RespForm) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      onFormChange({ ...form, [field]: e.target.value });
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-constructa-secondaryText">
        Agregá las personas responsables de esta obra. Podés omitir este paso y
        agregarlos después.
      </p>

      {/* Add form */}
      <div className="bg-white border border-constructa-border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <input
              className={inputCls()}
              placeholder="Juan Pérez"
              value={form.full_name}
              onChange={set("full_name")}
              onKeyDown={handleKey}
              maxLength={255}
            />
          </div>
          <div>
            <FieldLabel>WhatsApp</FieldLabel>
            <input
              className={inputCls()}
              placeholder="+5491112345678"
              value={form.whatsapp_number}
              onChange={set("whatsapp_number")}
              onKeyDown={handleKey}
            />
          </div>
          <div>
            <FieldLabel optional>Rol</FieldLabel>
            <input
              className={inputCls()}
              placeholder="Capataz, Electricista..."
              value={form.role}
              onChange={set("role")}
              onKeyDown={handleKey}
              maxLength={100}
            />
          </div>
        </div>

        <InlineError msg={error} />

        <div className="flex justify-end">
          <Button variant="primary" type="button" onClick={onAdd}>
            <Plus className="w-4 h-4" />
            Agregar responsable
          </Button>
        </div>
      </div>

      {/* List — fixed height so modal never resizes */}
      <div className="min-h-[220px] max-h-[220px] overflow-y-auto pr-1">
        {responsibles.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText">
              {responsibles.length} responsable
              {responsibles.length !== 1 ? "s" : ""} agregado
              {responsibles.length !== 1 ? "s" : ""}
            </p>
            {responsibles.map((r) => (
            <div
              key={r._key}
              className="flex items-center gap-3 bg-white border border-constructa-border rounded px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-constructa-surface flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-constructa-secondaryText">
                  {r.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-constructa-text truncate">
                  {r.full_name}
                </p>
                <p className="text-xs text-constructa-secondaryText font-mono">
                  {r.whatsapp_number}
                </p>
              </div>
              {r.role && (
                <span className="hidden sm:block text-xs text-constructa-secondaryText bg-constructa-surface px-2 py-0.5 rounded">
                  {r.role}
                </span>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(r._key)}
                  title="Editar"
                  className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-info hover:bg-blue-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRemove(r._key)}
                  title="Quitar"
                  className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-danger hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-constructa-secondaryText text-center">
              Sin responsables todavía — podés continuar y agregarlos después.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3 — Tareas ──────────────────────────────────────────────────────────

function Step3({
  tasks,
  responsibles,
  form,
  onFormChange,
  error,
  onAdd,
  onRemove,
  onEdit,
}: {
  tasks: DraftTask[];
  responsibles: DraftResponsible[];
  form: TaskForm;
  onFormChange: (f: TaskForm) => void;
  error: string | null;
  onAdd: () => void;
  onRemove: (k: string) => void;
  onEdit: (k: string) => void;
}) {
  function set(field: keyof TaskForm) {
    return (
      e: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => onFormChange({ ...form, [field]: e.target.value });
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-constructa-secondaryText">
        Definí las tareas iniciales. Las tareas sin responsable asignado
        mostrarán una advertencia — podés asignarlos después.
      </p>

      {/* Add form */}
      <div className="bg-white border border-constructa-border rounded p-4 space-y-3">
        <div>
          <FieldLabel>Título de la tarea</FieldLabel>
          <input
            className={inputCls()}
            placeholder="Ej: Excavación y nivelación del terreno"
            value={form.title}
            onChange={set("title")}
            onKeyDown={handleKey}
            maxLength={255}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel optional>Responsable</FieldLabel>
            <select
              className={[inputCls(), "cursor-pointer"].join(" ")}
              value={form.responsible_key}
              onChange={set("responsible_key")}
            >
              <option value="">Sin responsable</option>
              {responsibles.map((r) => (
                <option key={r._key} value={r._key}>
                  {r.full_name}
                  {r.role ? ` · ${r.role}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel optional>Fecha inicio</FieldLabel>
            <input
              type="date"
              className={inputCls()}
              value={form.start_date}
              onChange={set("start_date")}
            />
          </div>
          <div>
            <FieldLabel optional>Fecha vencimiento</FieldLabel>
            <input
              type="date"
              className={inputCls()}
              value={form.due_date}
              onChange={set("due_date")}
            />
          </div>
        </div>

        <div>
          <FieldLabel optional>Descripción</FieldLabel>
          <textarea
            className={[inputCls(), "resize-none"].join(" ")}
            placeholder="Descripción adicional..."
            rows={2}
            value={form.description}
            onChange={set("description")}
          />
        </div>

        <InlineError msg={error} />

        <div className="flex justify-end">
          <Button variant="primary" type="button" onClick={onAdd}>
            <Plus className="w-4 h-4" />
            Agregar tarea
          </Button>
        </div>
      </div>

      {/* List — fixed height so modal never resizes */}
      <div className="min-h-[220px] max-h-[220px] overflow-y-auto pr-1">
        {tasks.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText">
              {tasks.length} tarea{tasks.length !== 1 ? "s" : ""} agregada
              {tasks.length !== 1 ? "s" : ""}
            </p>
            {tasks.map((t, i) => {
            const resp = responsibles.find((r) => r._key === t.responsible_key);
            return (
              <div
                key={t._key}
                className="flex items-start gap-3 bg-white border border-constructa-border rounded px-4 py-3"
              >
                <span className="text-xs font-mono text-constructa-border mt-0.5 w-5 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-constructa-text">
                    {t.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {resp ? (
                      <span className="text-xs text-constructa-secondaryText">
                        {resp.full_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-constructa-warning">
                        <AlertTriangle className="w-3 h-3" />
                        Sin responsable
                      </span>
                    )}
                    {(t.start_date || t.due_date) && (
                      <span className="text-xs text-constructa-secondaryText">
                        {t.start_date && t.due_date
                          ? `${formatDate(t.start_date)} → ${formatDate(t.due_date)}`
                          : t.due_date
                          ? `Vence: ${formatDate(t.due_date)}`
                          : `Inicio: ${formatDate(t.start_date)}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onEdit(t._key)}
                    title="Editar"
                    className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-info hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRemove(t._key)}
                    title="Quitar"
                    className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-danger hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-constructa-secondaryText text-center">
              Sin tareas todavía — podés continuar y agregarlas desde la obra.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 4 — Confirmación ────────────────────────────────────────────────────

function Step4({
  obraData,
  responsibles,
  tasks,
  tasksWithoutResp,
  error,
}: {
  obraData: ObraFormData;
  responsibles: DraftResponsible[];
  tasks: DraftTask[];
  tasksWithoutResp: number;
  error: string | null;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-constructa-secondaryText">
        Revisá el resumen antes de crear la obra.
      </p>

      {/* Summary */}
      <div className="bg-white border-l-4 border-l-constructa-primary border border-constructa-border rounded p-5 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText mb-1">
            Obra
          </p>
          <p className="text-xl font-bold text-constructa-text leading-snug">
            {obraData.name}
          </p>
          {obraData.location && (
            <p className="text-sm text-constructa-secondaryText mt-0.5">
              {obraData.location}
            </p>
          )}
          {obraData.description && (
            <p className="text-xs text-constructa-secondaryText mt-1.5 line-clamp-2">
              {obraData.description}
            </p>
          )}
        </div>

        {(obraData.start_date || obraData.expected_end_date) && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText mb-1">
              Período
            </p>
            <p className="text-sm text-constructa-text">
              {formatDate(obraData.start_date)} →{" "}
              {formatDate(obraData.expected_end_date)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-0 pt-3 border-t border-constructa-surface">
          {[
            {
              value: responsibles.length,
              label: "Responsables",
              color: "text-constructa-text",
            },
            {
              value: tasks.length,
              label: "Tareas",
              color: "text-constructa-text",
            },
            {
              value: tasksWithoutResp,
              label: "Sin responsable",
              color:
                tasksWithoutResp > 0
                  ? "text-constructa-warning"
                  : "text-constructa-success",
            },
          ].map(({ value, label, color }) => (
            <div key={label} className="text-center">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-constructa-secondaryText mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {tasksWithoutResp > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-constructa-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <span className="font-bold">
              {tasksWithoutResp} tarea{tasksWithoutResp > 1 ? "s" : ""} sin
              responsable.
            </span>{" "}
            Podés asignarlos después desde el detalle de la obra.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-constructa-danger/30 rounded px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-constructa-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-constructa-danger">{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Success view ─────────────────────────────────────────────────────────────

function SuccessView({
  obra,
  onNavigate,
}: {
  obra: Obra;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-5">
      <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-constructa-success" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText mb-1">
          Obra creada exitosamente
        </p>
        <h3 className="text-xl font-bold text-constructa-text">{obra.name}</h3>
        {obra.location && (
          <p className="text-sm text-constructa-secondaryText mt-0.5">
            {obra.location}
          </p>
        )}
      </div>
      <Button variant="primary" onClick={onNavigate} className="px-8 mt-2">
        Ir a la obra
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface ObraSetupWizardProps {
  onClose: () => void;
  onCreated: (obra: Obra) => void;
}

export function ObraSetupWizard({ onClose, onCreated }: ObraSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [createdObra, setCreatedObra] = useState<Obra | null>(null);

  // Step 1
  const [obraData, setObraData] = useState<ObraFormData>({
    name: "",
    location: "",
    description: "",
    image_url: "",
    start_date: "",
    expected_end_date: "",
  });
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2
  const [responsibles, setResponsibles] = useState<DraftResponsible[]>([]);
  const [respForm, setRespForm] = useState<RespForm>({
    full_name: "",
    whatsapp_number: "",
    role: "",
  });
  const [respError, setRespError] = useState<string | null>(null);

  // Step 3
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    title: "",
    description: "",
    responsible_key: "",
    start_date: "",
    due_date: "",
  });
  const [taskError, setTaskError] = useState<string | null>(null);

  // Step 4
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Step 1 ────────────────────────────────────────────────────────────────

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (!obraData.name.trim() || obraData.name.trim().length < 2)
      errs.name = "El nombre es obligatorio (mínimo 2 caracteres).";
    if (!obraData.location.trim())
      errs.location = "La ubicación es obligatoria.";
    if (
      obraData.start_date &&
      obraData.expected_end_date &&
      obraData.expected_end_date < obraData.start_date
    )
      errs.expected_end_date =
        "La fecha de fin debe ser posterior a la de inicio.";
    setStep1Errors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => s - 1);
  }

  // ── Step 2 handlers ───────────────────────────────────────────────────────

  function addResponsible() {
    const { full_name, whatsapp_number, role } = respForm;
    if (!full_name.trim() || full_name.trim().length < 2)
      return setRespError("El nombre es obligatorio (mínimo 2 caracteres).");
    if (!whatsapp_number.trim())
      return setRespError("El número de WhatsApp es obligatorio.");
    if (!E164.test(whatsapp_number.trim()))
      return setRespError("Formato inválido — usá E.164: +5491112345678");
    if (responsibles.some((r) => r.whatsapp_number === whatsapp_number.trim()))
      return setRespError("Ya existe un responsable con ese número.");

    setResponsibles((prev) => [
      ...prev,
      {
        _key: uid(),
        full_name: full_name.trim(),
        whatsapp_number: whatsapp_number.trim(),
        role: role.trim(),
      },
    ]);
    setRespForm({ full_name: "", whatsapp_number: "", role: "" });
    setRespError(null);
  }

  function removeResponsible(k: string) {
    setResponsibles((prev) => prev.filter((r) => r._key !== k));
    // clear reference in tasks
    setTasks((prev) =>
      prev.map((t) =>
        t.responsible_key === k ? { ...t, responsible_key: "" } : t
      )
    );
  }

  function editResponsible(k: string) {
    const r = responsibles.find((r) => r._key === k);
    if (!r) return;
    setRespForm({
      full_name: r.full_name,
      whatsapp_number: r.whatsapp_number,
      role: r.role,
    });
    removeResponsible(k);
    setRespError(null);
  }

  // ── Step 3 handlers ───────────────────────────────────────────────────────

  function addTask() {
    const { title, description, responsible_key, start_date, due_date } =
      taskForm;
    if (!title.trim() || title.trim().length < 2)
      return setTaskError("El título es obligatorio (mínimo 2 caracteres).");
    if (start_date && due_date && due_date < start_date)
      return setTaskError(
        "La fecha de vencimiento debe ser posterior a la de inicio."
      );

    setTasks((prev) => [
      ...prev,
      {
        _key: uid(),
        title: title.trim(),
        description: description.trim(),
        responsible_key,
        start_date,
        due_date,
      },
    ]);
    setTaskForm({
      title: "",
      description: "",
      responsible_key: "",
      start_date: "",
      due_date: "",
    });
    setTaskError(null);
  }

  function removeTask(k: string) {
    setTasks((prev) => prev.filter((t) => t._key !== k));
  }

  function editTask(k: string) {
    const t = tasks.find((t) => t._key === k);
    if (!t) return;
    setTaskForm({
      title: t.title,
      description: t.description,
      responsible_key: t.responsible_key,
      start_date: t.start_date,
      due_date: t.due_date,
    });
    removeTask(k);
    setTaskError(null);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const obra = await createObra({
        name: obraData.name.trim(),
        location: obraData.location.trim() || null,
        description: obraData.description.trim() || null,
        image_url: obraData.image_url.trim() || null,
        start_date: obraData.start_date || null,
        expected_end_date: obraData.expected_end_date || null,
      });

      const keyToId = new Map<string, number>();
      for (const r of responsibles) {
        const created = await createResponsible({
          full_name: r.full_name,
          whatsapp_number: r.whatsapp_number,
          role: r.role || null,
        });
        keyToId.set(r._key, created.id);
      }

      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        await createTask({
          obra_id: obra.id,
          title: t.title,
          description: t.description || null,
          responsible_id: t.responsible_key
            ? (keyToId.get(t.responsible_key) ?? null)
            : null,
          start_date: t.start_date || null,
          due_date: t.due_date || null,
          order_index: i,
        });
      }

      setCreatedObra(obra);
      setDone(true);
    } catch {
      setSubmitError(
        "Error al crear la obra. Verificá los datos e intentá nuevamente."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const tasksWithoutResp = tasks.filter((t) => !t.responsible_key).length;

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-constructa-bg w-full max-w-2xl rounded-lg shadow-card-md flex flex-col h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-constructa-dark px-6 py-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">
              {done ? "Obra creada" : `Paso ${step} de 4`}
            </p>
            <h2 className="text-white font-bold text-base mt-0.5">
              {done ? "¡Listo!" : STEPS[step - 1]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 flex-1 overflow-y-auto min-h-0">
          {!done && <StepBar current={step} />}

          {!done && step === 1 && (
            <Step1
              data={obraData}
              onChange={setObraData}
              errors={step1Errors}
            />
          )}
          {!done && step === 2 && (
            <Step2
              responsibles={responsibles}
              form={respForm}
              onFormChange={setRespForm}
              error={respError}
              onAdd={addResponsible}
              onRemove={removeResponsible}
              onEdit={editResponsible}
            />
          )}
          {!done && step === 3 && (
            <Step3
              tasks={tasks}
              responsibles={responsibles}
              form={taskForm}
              onFormChange={setTaskForm}
              error={taskError}
              onAdd={addTask}
              onRemove={removeTask}
              onEdit={editTask}
            />
          )}
          {!done && step === 4 && (
            <Step4
              obraData={obraData}
              responsibles={responsibles}
              tasks={tasks}
              tasksWithoutResp={tasksWithoutResp}
              error={submitError}
            />
          )}
          {done && createdObra && (
            <SuccessView
              obra={createdObra}
              onNavigate={() => onCreated(createdObra)}
            />
          )}
        </div>

        {/* Footer — all steps while wizard is active */}
        {!done && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-constructa-border flex-shrink-0 bg-constructa-bg">
            <div>
              {step > 1 && (
                <Button
                  variant="secondary"
                  onClick={goBack}
                  disabled={step === 4 && submitting}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
              )}
            </div>
            {step < 4 ? (
              <Button variant="primary" onClick={goNext}>
                {step === 3 ? "Revisar y confirmar" : "Siguiente"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando obra...
                  </>
                ) : (
                  <>
                    Crear obra y comenzar seguimiento
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
