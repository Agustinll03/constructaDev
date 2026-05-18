import { LogOut } from "lucide-react";
import type { Obra, ObraStatus, ObraTab, Page } from "../../types";

const HERO_DOT_COLORS = ["#FF8856","#3D8BFF","#2AC58A","#B07CF7","#8FA8B5","#E8B14A","#5DA8B5"];
const STATUS_PCT: Record<ObraStatus, number> = {
  planificada: 5, en_progreso: 50, pausada: 30, completada: 100, cancelada: 0,
};

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  pinnedObras?: Obra[];
  selectedObra?: Obra | null;
  activeTab?: ObraTab;
  onTabChange?: (tab: ObraTab) => void;
  obraCounts?: { tasks: number; alerts: number; responsibles: number };
  currentUser?: { name: string; initials: string; color: string; roleLabel: string };
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  label,
  icon,
  active = false,
  disabled = false,
  count,
  countOrange,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  count?: number;
  countOrange?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "7px 10px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        border: "none",
        transition: "background 0.12s, color 0.12s",
        background: active
          ? "linear-gradient(180deg, rgba(255,107,53,0.18), rgba(255,107,53,0.08))"
          : "transparent",
        boxShadow: active ? "inset 0 0 0 1px rgba(255,107,53,0.25)" : "none",
        color: active ? "#fff" : disabled ? "rgba(207,212,215,0.35)" : "#CFD4D7",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => {
        if (!active && !disabled) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={e => {
        if (!active && !disabled) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <span style={{ width: 16, display: "inline-flex", justifyContent: "center", color: active ? "#FF6B35" : "inherit", opacity: active ? 1 : 0.65, flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10.5,
          padding: "1px 6px",
          borderRadius: 99,
          background: countOrange ? "#FF6B35" : "rgba(255,255,255,0.08)",
          color: countOrange ? "#fff" : "#CFD4D7",
          flexShrink: 0,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ activePage, onNavigate, onLogout, pinnedObras = [], selectedObra, activeTab, onTabChange, obraCounts, currentUser }: SidebarProps) {
  return (
    <aside style={{
      position: "fixed",
      left: 0,
      top: 0,
      height: "100vh",
      width: 260,
      background: "#2F3A40",
      display: "flex",
      flexDirection: "column",
      padding: "14px 12px 12px",
      zIndex: 50,
      overflowY: "auto",
    }}>

      {/* ── Brand ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 14px" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: "linear-gradient(160deg, #FF6B35 0%, #E85A26 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 14px -6px rgba(255,107,53,0.6)",
        }}>
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
            <path d="M3 19V8.5L11 3l8 5.5V19H3z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round"/>
            <path d="M8 19v-6h5v6" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: "0.04em" }}>
            CONSTRUCTA
          </div>
          <div style={{ fontSize: 11, color: "#8C969C", marginTop: 1 }}>Gestión de obras</div>
        </div>
      </div>

      {/* ── Workspace switcher ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 9,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10, padding: "8px 10px",
        margin: "0 2px 14px", cursor: "pointer",
        transition: "background 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      >
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: "linear-gradient(135deg, #FF8856, #FF6B35)",
          color: "#fff", fontWeight: 700, fontSize: 11,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>EV</div>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <div style={{ color: "#fff", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Estudio Velar</div>
          <div style={{ fontSize: 10.5, color: "#8C969C", letterSpacing: "0.04em" }}>Workspace</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "#6B767E", flexShrink: 0 }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ── WORKSPACE section ── */}
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", color: "#6B767E", textTransform: "uppercase", padding: "8px 10px 6px" }}>
        Workspace
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <NavItem
          label="Panel"
          active={activePage === "panel" && !selectedObra}
          onClick={() => onNavigate("panel")}
          icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="9" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/></svg>}
        />

        {selectedObra && onTabChange && (
          <>
            {/* obra context header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 10px 4px",
              marginTop: 4,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: 99,
                background: HERO_DOT_COLORS[selectedObra.id % HERO_DOT_COLORS.length],
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 600, color: "#8C969C",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                flex: 1,
              }}>
                {selectedObra.name}
              </span>
            </div>

            <NavItem
              label="Resumen"
              active={activeTab === "resumen"}
              onClick={() => onTabChange("resumen")}
              icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="9" width="3" height="5" rx="0.8" fill="currentColor" opacity="0.85"/><rect x="6.5" y="6" width="3" height="8" rx="0.8" fill="currentColor" opacity="0.85"/><rect x="11" y="3" width="3" height="11" rx="0.8" fill="currentColor" opacity="0.85"/></svg>}
            />
            <NavItem
              label="Tareas"
              active={activeTab === "tareas"}
              count={obraCounts?.tasks}
              onClick={() => onTabChange("tareas")}
              icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 4.5h7M6 8h7M6 11.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M3 4l.6.6L4.8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7.5l.6.6 1.2-1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 11l.6.6 1.2-1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            />
            <NavItem
              label="Responsables"
              active={activeTab === "responsables"}
              count={obraCounts?.responsibles}
              onClick={() => onTabChange("responsables")}
              icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M1.5 13.5c.4-2.2 2.2-3.8 4.5-3.8s4.1 1.6 4.5 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M11 9.5v3.5M9.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
            />
            <NavItem
              label="Alertas"
              active={activeTab === "alertas"}
              count={obraCounts?.alerts}
              countOrange={(obraCounts?.alerts ?? 0) > 0}
              onClick={() => onTabChange("alertas")}
              icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 12V8a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/><path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M6 14a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
            />
            <NavItem
              label="Historial"
              active={activeTab === "historial"}
              onClick={() => onTabChange("historial")}
              icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5.5V8l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            />
          </>
        )}
      </nav>

      {/* ── ORGANIZACIÓN section ── */}
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", color: "#6B767E", textTransform: "uppercase", padding: "14px 10px 6px" }}>
        Organización
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <NavItem
          label="Gestión de equipo"
          active={activePage === "equipo"}
          onClick={() => onNavigate("equipo")}
          icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M2.5 13c.4-2 1.8-3.3 3.5-3.3S9.1 11 9.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/><path d="M10.5 4.5a2.2 2.2 0 010 4.3M11.5 9.7c1.5.3 2.5 1.6 2.8 3.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/></svg>}
        />
      </nav>

      {/* ── CUENTA section ── */}
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", color: "#6B767E", textTransform: "uppercase", padding: "14px 10px 6px" }}>
        Cuenta
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <NavItem
          label="Configuración"
          active={activePage === "configuracion"}
          onClick={() => onNavigate("configuracion")}
          icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M8 1.8v1.8M8 12.4v1.8M14.2 8h-1.8M3.6 8H1.8M12.4 3.6l-1.3 1.3M4.9 11.1l-1.3 1.3M12.4 12.4l-1.3-1.3M4.9 4.9L3.6 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
        />
      </nav>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Fijadas ── */}
      {pinnedObras.length > 0 && (
        <div style={{
          margin: "0 2px 10px",
          padding: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 11,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", color: "#6B767E", textTransform: "uppercase", marginBottom: 8 }}>
            Fijadas
          </div>
          {pinnedObras.map(obra => (
            <div
              key={obra.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", fontSize: 12, color: "#CFD4D7", borderRadius: 6, cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ width: 7, height: 7, borderRadius: 99, background: HERO_DOT_COLORS[obra.id % HERO_DOT_COLORS.length], flexShrink: 0 }} />
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{obra.name}</span>
              <span style={{ fontSize: 10.5, color: "#8C969C", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{STATUS_PCT[obra.status]}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── User + logout ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: 8, borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 99, flexShrink: 0,
          background: currentUser?.color ?? "#8E97A0",
          color: "#fff", fontWeight: 700, fontSize: 11,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>{currentUser?.initials ?? "?"}</div>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser?.name || "Usuario"}</div>
          <div style={{ fontSize: 10.5, color: "#8C969C" }}>{currentUser?.roleLabel ?? "—"}</div>
        </div>
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6B767E", padding: 4, display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#CFD4D7")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6B767E")}
        >
          <LogOut style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </aside>
  );
}
