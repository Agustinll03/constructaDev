import { useRef, useState } from "react";
import { deleteDocument, uploadDocument, updateDocument } from "../api/documents";
import type { Document, DocumentCategory, DocumentStatus, Task } from "../types";

// ── Design tokens ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  plano: "Plano", contrato: "Contrato", certificado: "Certificado",
  presupuesto: "Presupuesto", foto: "Foto", otro: "Otro",
};

const STATUS_CFG: Record<DocumentStatus, { label: string; bg: string; border: string; color: string; dot: string }> = {
  pendiente:  { label: "Pendiente",  bg: "#FEF3C7", border: "#FDE68A", color: "#92400E", dot: "#D97706" },
  aprobado:   { label: "Aprobado",   bg: "#D1FAE5", border: "#6EE7B7", color: "#065F46", dot: "#10B981" },
  rechazado:  { label: "Rechazado",  bg: "#FEE2E2", border: "#FECACA", color: "#991B1B", dot: "#EF4444" },
};

const CATEGORY_CFG: Record<DocumentCategory, { bg: string; border: string; color: string }> = {
  plano:        { bg: "#DBEAFE", border: "#93C5FD", color: "#1D4ED8" },
  contrato:     { bg: "#EDE9FE", border: "#C4B5FD", color: "#6D28D9" },
  certificado:  { bg: "#D1FAE5", border: "#6EE7B7", color: "#065F46" },
  presupuesto:  { bg: "#FEF3C7", border: "#FDE68A", color: "#92400E" },
  foto:         { bg: "#FEE2E2", border: "#FECACA", color: "#991B1B" },
  otro:         { bg: "#F3F4F6", border: "#D1D5DB", color: "#374151" },
};

const EXT_CFG: Record<string, { bg: string; color: string }> = {
  pdf:  { bg: "#FEE2E2", color: "#DC2626" },
  dwg:  { bg: "#DBEAFE", color: "#2563EB" },
  dxf:  { bg: "#DBEAFE", color: "#2563EB" },
  xlsx: { bg: "#D1FAE5", color: "#059669" },
  docx: { bg: "#EDE9FE", color: "#7C3AED" },
  jpg:  { bg: "#FEF3C7", color: "#D97706" },
  jpeg: { bg: "#FEF3C7", color: "#D97706" },
  png:  { bg: "#FEF3C7", color: "#D97706" },
  webp: { bg: "#FEF3C7", color: "#D97706" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtFull(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
    + " · " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

type DocGroup = { key: string; original_name: string; category: DocumentCategory; versions: Document[] };

function buildGroups(documents: Document[]): Record<DocumentCategory, DocGroup[]> {
  const map: Record<string, DocGroup> = {};
  for (const doc of documents) {
    const key = `${doc.category}||${doc.original_name}`;
    if (!map[key]) map[key] = { key, original_name: doc.original_name, category: doc.category, versions: [] };
    map[key].versions.push(doc);
  }
  for (const g of Object.values(map)) g.versions.sort((a, b) => a.version - b.version);
  const result: Partial<Record<DocumentCategory, DocGroup[]>> = {};
  for (const g of Object.values(map)) (result[g.category] ??= []).push(g);
  for (const cat of Object.keys(result) as DocumentCategory[])
    result[cat]!.sort((a, b) => a.original_name.localeCompare(b.original_name));
  return result as Record<DocumentCategory, DocGroup[]>;
}

// ── File badge ────────────────────────────────────────────────────────────────

function FileBadge({ name, size = 32 }: { name: string; size?: number }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cfg = EXT_CFG[ext] ?? { bg: "#F3F4F6", color: "#374151" };
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontSize: 8.5, fontWeight: 800, color: cfg.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
        {(ext || "DOC").toUpperCase().slice(0, 3)}
      </span>
    </div>
  );
}

// ── Document group card ───────────────────────────────────────────────────────

function DocumentCard({
  group, tasks, obraId, onStatusChange, onDelete, onAdded, deletingId,
}: {
  group: DocGroup; tasks: Task[]; obraId: number;
  onStatusChange: (doc: Document, s: DocumentStatus) => void;
  onDelete: (doc: Document) => void;
  onAdded: (doc: Document) => void;
  deletingId: number | null;
}) {
  const latestIdx = group.versions.length - 1;
  const [selectedIdx, setSelectedIdx] = useState(latestIdx);
  const [uploading, setUploading] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const clampedIdx = Math.min(selectedIdx, group.versions.length - 1);
  const doc = group.versions[clampedIdx];
  const isViewingPast = clampedIdx !== group.versions.length - 1;
  const stCfg = STATUS_CFG[doc.status];
  const taskTitle = tasks.find(t => t.id === doc.task_id)?.title;
  const hasVersions = group.versions.length > 1;

  function selectVersion(idx: number) {
    setSelectedIdx(idx);
    setAnimKey(k => k + 1);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const newDoc = await uploadDocument({ obraId, category: group.category, originalName: group.original_name, file });
      onAdded(newDoc);
      setSelectedIdx(group.versions.length); // latest after update
      setAnimKey(k => k + 1);
    } catch { /* silent */ } finally { setUploading(false); }
  }

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${isViewingPast ? "#FDE68A" : "#EAECF0"}`,
      borderRadius: 12,
      overflow: "hidden",
      transition: "box-shadow 0.15s, border-color 0.2s",
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px -4px rgba(0,0,0,0.08)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}
    >
      {/* ── "Viendo versión anterior" banner ── */}
      {isViewingPast && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "7px 14px",
          background: "linear-gradient(to right, #FFFBEB, #FEF9E0)",
          borderBottom: "1px solid #FDE68A",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#92400E" }}>
              Viendo versión anterior — <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>v{doc.version}</span> de {group.versions.length}
            </span>
          </div>
          <button
            onClick={() => selectVersion(group.versions.length - 1)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 5,
              border: "1px solid #FCD34D",
              fontSize: 11, fontWeight: 600, color: "#92400E",
              background: "#fff", cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#FEF3C7"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Volver a versión actual
          </button>
        </div>
      )}

      {/* ── Animated content zone ── */}
      <div key={animKey} style={{ animation: "fadeSlideIn 0.18s ease" }}>

        {/* ── Top: filename + actions ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 10px" }}>
          <FileBadge name={doc.display_name ?? doc.original_name} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 13, fontWeight: 600, color: "#111827",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 280,
              }} title={doc.display_name ?? doc.original_name}>
                {doc.display_name ?? doc.original_name}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                color: isViewingPast ? "#92400E" : "#FF6B35",
                background: isViewingPast ? "#FEF3C7" : "#FFF4EE",
                border: `1px solid ${isViewingPast ? "#FDE68A" : "#FFD5BF"}`,
                borderRadius: 4, padding: "1px 5px", flexShrink: 0, letterSpacing: "0.03em",
              }}>
                v{doc.version}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
              {fmt(doc.created_at)}
              {doc.uploader_name && <> · <span style={{ color: "#6B7280", fontWeight: 500 }}>{doc.uploader_name}</span></>}
              {taskTitle && <> · <span style={{ color: "#6B7280" }}>→ {taskTitle}</span></>}
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 600,
              background: stCfg.bg, border: `1px solid ${stCfg.border}`, color: stCfg.color,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: stCfg.dot, flexShrink: 0 }} />
              {stCfg.label}
            </span>

            {doc.status === "pendiente" && (
              <button onClick={() => onStatusChange(doc, "aprobado")} style={actionBtn("#065F46", "#D1FAE5", "#6EE7B7")}>Aprobar</button>
            )}
            {doc.status === "aprobado" && (
              <button onClick={() => onStatusChange(doc, "rechazado")} style={actionBtn("#991B1B", "#FEE2E2", "#FECACA")}>Rechazar</button>
            )}
            {doc.status === "rechazado" && (
              <button onClick={() => onStatusChange(doc, "pendiente")} style={actionBtn("#92400E", "#FEF3C7", "#FDE68A")}>Pendiente</button>
            )}

            <a href={doc.file_url} target="_blank" rel="noreferrer" style={iconBtn}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#FF6B35"; (e.currentTarget as HTMLAnchorElement).style.color = "#FF6B35"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#E5E7EB"; (e.currentTarget as HTMLAnchorElement).style.color = "#9CA3AF"; }}
              title={`Descargar ${doc.display_name ?? doc.original_name} (v${doc.version})`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>

            <button onClick={() => !deletingId && onDelete(doc)} disabled={deletingId === doc.id} style={{ ...iconBtn as React.CSSProperties, cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#9CA3AF"; }}
              title="Eliminar esta versión"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Notes ── */}
        {doc.notes && (
          <div style={{ margin: "0 14px 10px", padding: "7px 10px", background: "#FAFAFA", borderRadius: 7, border: "1px solid #F3F4F6" }}>
            <p style={{ margin: 0, fontSize: 11.5, color: "#6B7280", fontStyle: "italic", lineHeight: 1.5 }}>"{doc.notes}"</p>
          </div>
        )}

      </div>{/* /animated zone */}

      {/* ── Version timeline + upload button ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 14px 11px",
        borderTop: "1px solid #F3F4F6",
        background: "#FAFAFA",
      }}>
        {/* Timeline */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1 }}>
          {group.versions.map((v, idx) => {
            const isSelected = idx === selectedIdx;
            const isPast = idx < selectedIdx;
            const isLatest = idx === latestIdx;
            return (
              <div key={v.id} style={{ display: "flex", alignItems: "center" }}>
                {/* Connector */}
                {idx > 0 && (
                  <div style={{
                    width: 24, height: 2, flexShrink: 0,
                    background: isPast || isSelected
                      ? "linear-gradient(to right, #FB923C, #FF6B35)"
                      : "#E5E7EB",
                    transition: "background 0.2s",
                  }} />
                )}

                {/* Node */}
                <button
                  onClick={() => selectVersion(idx)}
                  title={`v${v.version}: ${v.display_name ?? v.original_name} — ${fmtFull(v.created_at)}`}
                  style={{
                    position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
                    background: "none", border: "none", cursor: "pointer", padding: "2px 4px", gap: 3,
                  }}
                >
                  {/* Circle */}
                  <div style={{
                    width: isSelected ? 16 : 10,
                    height: isSelected ? 16 : 10,
                    borderRadius: 99, flexShrink: 0,
                    background: isSelected ? "#FF6B35" : isPast ? "#FDBA74" : "#D1D5DB",
                    boxShadow: isSelected ? "0 0 0 3px rgba(255,107,53,0.18), 0 2px 6px rgba(255,107,53,0.3)" : "none",
                    border: isSelected ? "2.5px solid #fff" : "none",
                    transition: "all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSelected && <div style={{ width: 4, height: 4, borderRadius: 99, background: "#fff" }} />}
                  </div>

                  {/* Labels */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    <span style={{
                      fontSize: 9, fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "#FF6B35" : "#9CA3AF",
                      fontFamily: "'JetBrains Mono', monospace",
                      transition: "color 0.15s",
                    }}>
                      v{v.version}
                    </span>
                    {isLatest && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#10B981", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        actual
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Upload new version button */}
        <>
          <div style={{ width: 1, height: 20, background: "#E5E7EB", flexShrink: 0 }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 6,
              border: "1px solid #E5E7EB",
              fontSize: 11, fontWeight: 600, color: "#6B7280",
              background: "#fff", cursor: uploading ? "wait" : "pointer",
              transition: "all 0.15s", flexShrink: 0,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#FF6B35"; e.currentTarget.style.color = "#FF6B35"; e.currentTarget.style.background = "#FFF4EE"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#6B7280"; e.currentTarget.style.background = "#fff"; }}
            title="Subir nueva versión de este documento"
          >
            {uploading ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
            )}
            {uploading ? "Subiendo…" : "Nueva versión"}
            {hasVersions && !uploading && (
              <span style={{
                fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                color: "#9CA3AF", background: "#F3F4F6", borderRadius: 3, padding: "0 4px",
              }}>
                v{group.versions.length + 1}
              </span>
            )}
          </button>
          <input
            ref={fileRef} type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.xlsx,.docx"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { handleUpload(f); e.target.value = ""; } }}
          />
        </>
      </div>
    </div>
  );
}

function actionBtn(color: string, bg: string, border: string): React.CSSProperties {
  return { padding: "4px 10px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 11.5, fontWeight: 600, color, background: bg, cursor: "pointer", whiteSpace: "nowrap" };
}

const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 7, border: "1px solid #E5E7EB",
  color: "#9CA3AF", background: "#fff", textDecoration: "none", flexShrink: 0,
  transition: "all 0.12s",
};

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ obraId, tasks, onClose, onUploaded }: {
  obraId: number; tasks: Task[];
  onClose: () => void; onUploaded: (doc: Document) => void;
}) {
  const [category, setCategory] = useState<DocumentCategory>("plano");
  const [taskId, setTaskId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) { setError("Seleccioná un archivo."); return; }
    setError(null); setLoading(true);
    try {
      const doc = await uploadDocument({ obraId, category, taskId: taskId ? Number(taskId) : null, notes: notes || null, file });
      onUploaded(doc); onClose();
    } catch { setError("Error al subir el archivo."); } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "26px 26px 22px", width: "100%", maxWidth: 440, boxShadow: "0 24px 48px -12px rgba(0,0,0,0.28)", fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>Subir documento</h3>
            <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#9CA3AF" }}>Si el nombre ya existe en la categoría, se crea una nueva versión automáticamente.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value as DocumentCategory)} style={inp}>
                {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            {tasks.length > 0 && (
              <div>
                <label style={lbl}>Tarea</label>
                <select value={taskId} onChange={e => setTaskId(e.target.value)} style={inp}>
                  <option value="">Sin tarea</option>
                  {tasks.map(t => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label style={lbl}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describí los cambios…" rows={2} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          </div>

          {/* Drop zone */}
          <div onClick={() => inputRef.current?.click()} style={{
            border: `1.5px dashed ${file ? "#FF6B35" : "#D1D5DB"}`,
            borderRadius: 10, padding: "18px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
            cursor: "pointer", background: file ? "#FFF4EE" : "#FAFAFA",
            transition: "all 0.15s", textAlign: "center",
          }}>
            {file ? (
              <><FileBadge name={file.name} size={28} /><span style={{ fontSize: 12.5, fontWeight: 600, color: "#FF6B35", marginTop: 2 }}>{file.name}</span><span style={{ fontSize: 11, color: "#9CA3AF" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span></>
            ) : (
              <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C5C8CC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg><span style={{ fontSize: 12.5, fontWeight: 600, color: "#6B7280" }}>Seleccionar archivo</span><span style={{ fontSize: 11, color: "#9CA3AF" }}>PDF, DWG, DXF, Excel, Word, imágenes · máx 20 MB</span></>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.xlsx,.docx" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />

          {error && <p style={{ margin: 0, fontSize: 12.5, color: "#DC2626", background: "#FEE2E2", borderRadius: 7, padding: "7px 11px" }}>{error}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, fontWeight: 600, color: "#6B7280", background: "#fff", cursor: "pointer" }}>Cancelar</button>
            <button type="submit" disabled={loading || !file} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, color: "#fff", background: loading || !file ? "#FCA882" : "#FF6B35", cursor: loading || !file ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
              {loading ? "Subiendo…" : "Subir documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 11px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: "#111827", background: "#fff", outline: "none", cursor: "pointer", boxSizing: "border-box" };

// ── Main component ────────────────────────────────────────────────────────────

interface DocumentosTabProps {
  obraId: number; tasks: Task[]; documents: Document[];
  onDocumentAdded: (doc: Document) => void;
  onDocumentDeleted: (id: number) => void;
  onDocumentUpdated: (doc: Document) => void;
}

export function DocumentosTab({ obraId, tasks, documents, onDocumentAdded, onDocumentDeleted, onDocumentUpdated }: DocumentosTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const grouped = buildGroups(documents);
  const categories = Object.keys(grouped) as DocumentCategory[];
  const totalGroups = Object.values(grouped).reduce((s, g) => s + g.length, 0);

  async function handleDelete(doc: Document) {
    if (!confirm(`¿Eliminar "${doc.original_name}" v${doc.version}?`)) return;
    setDeletingId(doc.id);
    try { await deleteDocument(doc.id); onDocumentDeleted(doc.id); } catch { /* silent */ }
    setDeletingId(null);
  }

  async function handleStatusChange(doc: Document, s: DocumentStatus) {
    try { const u = await updateDocument(doc.id, { status: s }); onDocumentUpdated(u); } catch { /* silent */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>Documentos</h2>
          {documents.length > 0 && (
            <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11.5, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
              {totalGroups} archivo{totalGroups !== 1 ? "s" : ""} · {documents.length} versión{documents.length !== 1 ? "es" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, color: "#fff", background: "#FF6B35", cursor: "pointer", boxShadow: "0 2px 8px -2px rgba(255,107,53,0.5)", transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#EA5A22")}
          onMouseLeave={e => (e.currentTarget.style.background = "#FF6B35")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Subir documento
        </button>
      </div>

      {/* ── Empty state ── */}
      {documents.length === 0 && (
        <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#FFF4EE", border: "1px solid #FFD5BF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#374151" }}>Sin documentos todavía</p>
          <p style={{ margin: 0, fontSize: 12.5, color: "#9CA3AF" }}>Subí planos, contratos y más. Cada nueva carga se registra como versión automáticamente.</p>
        </div>
      )}

      {/* ── Categories ── */}
      {categories.map(cat => {
        const groups = grouped[cat];
        const cfg = CATEGORY_CFG[cat];
        return (
          <div key={cat}>
            {/* Category label */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px 3px 8px", borderRadius: 6,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                {CATEGORY_LABELS[cat].toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
                {groups.length} archivo{groups.length !== 1 ? "s" : ""}
              </span>
              <div style={{ flex: 1, height: 1, background: "#F3F4F6" }} />
            </div>

            {/* Document cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.map(group => (
                <DocumentCard
                  key={group.key}
                  group={group}
                  tasks={tasks}
                  obraId={obraId}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onAdded={onDocumentAdded}
                  deletingId={deletingId}
                />
              ))}
            </div>
          </div>
        );
      })}

      {showUpload && <UploadModal obraId={obraId} tasks={tasks} onClose={() => setShowUpload(false)} onUploaded={onDocumentAdded} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
