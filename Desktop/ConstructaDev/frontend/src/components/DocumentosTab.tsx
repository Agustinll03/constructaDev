import { useRef, useState } from "react";
import { deleteDocument, uploadDocument, updateDocument } from "../api/documents";
import type { Document, DocumentCategory, DocumentStatus, Task } from "../types";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  plano: "Plano",
  contrato: "Contrato",
  certificado: "Certificado",
  presupuesto: "Presupuesto",
  foto: "Foto",
  otro: "Otro",
};

const STATUS_CFG: Record<DocumentStatus, { label: string; bg: string; border: string; color: string }> = {
  pendiente:  { label: "Pendiente",  bg: "#FDF1DE", border: "#F0D5A0", color: "#9A5D08" },
  aprobado:   { label: "Aprobado",   bg: "#E4F3EC", border: "#BFE3CE", color: "#136E47" },
  rechazado:  { label: "Rechazado",  bg: "#FCE5E5", border: "#F0B0B0", color: "#A82B2B" },
};

const CATEGORY_COLORS: Record<DocumentCategory, { bg: string; border: string; icon: string }> = {
  plano:        { bg: "#EEF4FF", border: "#C7D9FB", icon: "#3D8BFF" },
  contrato:     { bg: "#F3EEF9", border: "#D9C7F5", icon: "#8B5CF6" },
  certificado:  { bg: "#E4F3EC", border: "#BFE3CE", icon: "#1F8A5B" },
  presupuesto:  { bg: "#FDF1DE", border: "#F0D5A0", icon: "#C97D0E" },
  foto:         { bg: "#FEF0F0", border: "#FBC3C3", icon: "#D03A3A" },
  otro:         { bg: "#F0F1EF", border: "#E0E1DF", icon: "#5B6770" },
};

function FileIcon({ category }: { category: DocumentCategory }) {
  const cfg = CATEGORY_COLORS[category];
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={cfg.icon} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    </div>
  );
}

interface UploadModalProps {
  obraId: number;
  tasks: Task[];
  onClose: () => void;
  onUploaded: (doc: Document) => void;
}

function UploadModal({ obraId, tasks, onClose, onUploaded }: UploadModalProps) {
  const [category, setCategory] = useState<DocumentCategory>("plano");
  const [taskId, setTaskId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) { setError("Seleccioná un archivo."); return; }
    setError(null);
    setLoading(true);
    try {
      const doc = await uploadDocument({
        obraId,
        category,
        taskId: taskId ? Number(taskId) : null,
        notes: notes || null,
        file,
      });
      onUploaded(doc);
      onClose();
    } catch {
      setError("Error al subir el archivo. Verificá el formato y tamaño.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
        width: "100%", maxWidth: 460,
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.25)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1A2329", letterSpacing: "-0.02em" }}>
            Subir documento
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8E97A0", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Categoría */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0", marginBottom: 7 }}>
              Categoría
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as DocumentCategory)}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 9,
                border: "1px solid #E0E1DF", fontSize: 13.5, color: "#1A2329",
                background: "#fff", outline: "none", cursor: "pointer",
              }}
            >
              {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Tarea asociada */}
          {tasks.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0", marginBottom: 7 }}>
                Tarea asociada (opcional)
              </label>
              <select
                value={taskId}
                onChange={e => setTaskId(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 9,
                  border: "1px solid #E0E1DF", fontSize: 13.5, color: "#1A2329",
                  background: "#fff", outline: "none", cursor: "pointer",
                }}
              >
                <option value="">Sin tarea</option>
                {tasks.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0", marginBottom: 7 }}>
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Descripción o comentario..."
              rows={2}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 9,
                border: "1px solid #E0E1DF", fontSize: 13.5, color: "#1A2329",
                background: "#fff", resize: "vertical", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Archivo */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8E97A0", marginBottom: 7 }}>
              Archivo
            </label>
            <div
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${file ? "#FF6B35" : "#D5D7D3"}`,
                borderRadius: 10, padding: "18px 16px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                background: file ? "#FFF6F2" : "#FAFAFA",
                textAlign: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={file ? "#FF6B35" : "#8E97A0"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
              {file ? (
                <span style={{ fontSize: 13, fontWeight: 600, color: "#FF6B35" }}>{file.name}</span>
              ) : (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#5B6770" }}>Seleccionar archivo</span>
                  <span style={{ fontSize: 11.5, color: "#8E97A0" }}>PDF, imágenes, DWG, Excel, Word · máx 20 MB</span>
                </>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.xlsx,.docx"
              style={{ display: "none" }}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: "#D03A3A", background: "#FCE5E5", borderRadius: 8, padding: "8px 12px" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #E0E1DF",
              fontSize: 13.5, fontWeight: 600, color: "#5B6770", background: "#fff", cursor: "pointer",
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !file} style={{
              flex: 2, padding: "10px 0", borderRadius: 9, border: "none",
              fontSize: 13.5, fontWeight: 700, color: "#fff",
              background: loading || !file ? "#F0AB8A" : "#FF6B35", cursor: loading || !file ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}>
              {loading ? "Subiendo..." : "Subir documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DocumentosTabProps {
  obraId: number;
  tasks: Task[];
  documents: Document[];
  onDocumentAdded: (doc: Document) => void;
  onDocumentDeleted: (id: number) => void;
  onDocumentUpdated: (doc: Document) => void;
}

export function DocumentosTab({ obraId, tasks, documents, onDocumentAdded, onDocumentDeleted, onDocumentUpdated }: DocumentosTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const grouped = documents.reduce<Partial<Record<DocumentCategory, Document[]>>>((acc, doc) => {
    (acc[doc.category] ??= []).push(doc);
    return acc;
  }, {});

  async function handleDelete(doc: Document) {
    if (!confirm(`¿Eliminar "${doc.original_name}" v${doc.version}?`)) return;
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
      onDocumentDeleted(doc.id);
    } catch { /* silent */ }
    setDeletingId(null);
  }

  async function handleStatusChange(doc: Document, status: DocumentStatus) {
    try {
      const updated = await updateDocument(doc.id, { status });
      onDocumentUpdated(updated);
    } catch { /* silent */ }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", border: "1px solid #E6E7E5", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #F0F1EF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: "linear-gradient(135deg, #FFF0E8 0%, #FFE0CC 100%)",
              border: "1px solid #F5D5C0",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E76A2D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1A2329", letterSpacing: "-0.015em" }}>
              Documentos
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: 99,
              fontSize: 11.5, fontWeight: 600, color: "#5B6770", background: "#F0F1EF", border: "1px solid #E6E7E5",
            }}>
              {documents.length}
            </span>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "8px 14px", borderRadius: 9,
              fontSize: 13, fontWeight: 600,
              background: "#FF6B35", color: "#fff", border: "none", cursor: "pointer",
              boxShadow: "0 4px 12px -4px rgba(255,107,53,0.5)",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#E85A26")}
            onMouseLeave={e => (e.currentTarget.style.background = "#FF6B35")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Subir documento
          </button>
        </div>

        {/* Empty state */}
        {documents.length === 0 && (
          <div style={{ padding: "44px 20px", textAlign: "center", color: "#8E97A0" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D5D7D3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#5B6770" }}>Sin documentos todavía</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8E97A0" }}>Subí planos, contratos y más usando el botón de arriba.</p>
          </div>
        )}
      </div>

      {/* Grouped by category */}
      {(Object.keys(grouped) as DocumentCategory[]).map(cat => {
        const docs = grouped[cat]!;
        const cfg = CATEGORY_COLORS[cat];
        return (
          <div key={cat} style={{ background: "#fff", border: "1px solid #E6E7E5", borderRadius: 14, overflow: "hidden" }}>
            {/* Category header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 20px", borderBottom: "1px solid #F0F1EF",
              background: cfg.bg,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cfg.icon} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.icon, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {CATEGORY_LABELS[cat]}
              </span>
              <span style={{
                marginLeft: 2, padding: "1px 7px", borderRadius: 99,
                fontSize: 11, fontWeight: 600, color: cfg.icon,
                background: "rgba(0,0,0,0.06)",
              }}>{docs.length}</span>
            </div>

            {/* Document rows */}
            {docs.map((doc, idx) => {
              const stCfg = STATUS_CFG[doc.status];
              const taskTitle = tasks.find(t => t.id === doc.task_id)?.title;
              return (
                <div key={doc.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "13px 20px",
                  borderBottom: idx < docs.length - 1 ? "1px solid #F5F5F4" : "none",
                  transition: "background 0.12s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFAF9")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <FileIcon category={doc.category} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1A2329", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doc.original_name}
                      </span>
                      {doc.version > 1 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#8E97A0", background: "#F0F1EF", border: "1px solid #E0E1DF", borderRadius: 4, padding: "1px 5px" }}>
                          v{doc.version}
                        </span>
                      )}
                      <span style={{
                        padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: stCfg.bg, border: `1px solid ${stCfg.border}`, color: stCfg.color,
                      }}>
                        {stCfg.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: 12, color: "#8E97A0", flexWrap: "wrap" }}>
                      <span>{formatDate(doc.created_at)}</span>
                      {doc.uploader_name && <><span>·</span><span>{doc.uploader_name}</span></>}
                      {taskTitle && <><span>·</span><span style={{ color: "#5B6770" }}>→ {taskTitle}</span></>}
                      {doc.notes && <><span>·</span><span style={{ color: "#5B6770", fontStyle: "italic" }}>{doc.notes}</span></>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {/* Status toggle */}
                    {doc.status === "pendiente" && (
                      <button
                        onClick={() => handleStatusChange(doc, "aprobado")}
                        title="Aprobar"
                        style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #BFE3CE", fontSize: 12, fontWeight: 600, color: "#136E47", background: "#E4F3EC", cursor: "pointer" }}
                      >
                        Aprobar
                      </button>
                    )}
                    {doc.status === "aprobado" && (
                      <button
                        onClick={() => handleStatusChange(doc, "rechazado")}
                        title="Rechazar"
                        style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #F0B0B0", fontSize: 12, fontWeight: 600, color: "#A82B2B", background: "#FCE5E5", cursor: "pointer" }}
                      >
                        Rechazar
                      </button>
                    )}
                    {doc.status === "rechazado" && (
                      <button
                        onClick={() => handleStatusChange(doc, "pendiente")}
                        title="Pendiente"
                        style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #F0D5A0", fontSize: 12, fontWeight: 600, color: "#9A5D08", background: "#FDF1DE", cursor: "pointer" }}
                      >
                        Pendiente
                      </button>
                    )}
                    {/* Download */}
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Descargar"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 30, height: 30, borderRadius: 7, border: "1px solid #E0E1DF",
                        color: "#5B6770", background: "#fff", textDecoration: "none",
                        transition: "border-color 0.12s, color 0.12s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#FF6B35"; (e.currentTarget as HTMLAnchorElement).style.color = "#FF6B35"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#E0E1DF"; (e.currentTarget as HTMLAnchorElement).style.color = "#5B6770"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </a>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      title="Eliminar"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 30, height: 30, borderRadius: 7, border: "1px solid #E0E1DF",
                        color: "#8E97A0", background: "#fff", cursor: "pointer",
                        transition: "border-color 0.12s, color 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#D03A3A"; e.currentTarget.style.color = "#D03A3A"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E1DF"; e.currentTarget.style.color = "#8E97A0"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {showUpload && (
        <UploadModal
          obraId={obraId}
          tasks={tasks}
          onClose={() => setShowUpload(false)}
          onUploaded={onDocumentAdded}
        />
      )}
    </div>
  );
}
