import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import type { Obra, Page } from "../../types";

interface AppLayoutProps {
  children: ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  topBarRight?: ReactNode;
  pinnedObras?: Obra[];
}

export function AppLayout({
  children,
  pageTitle,
  pageSubtitle,
  activePage,
  onNavigate,
  onLogout,
  pinnedObras = [],
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-constructa-bg">
      <Sidebar activePage={activePage} onNavigate={onNavigate} onLogout={onLogout} pinnedObras={pinnedObras} />

      <div className="ml-[260px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "12px 28px",
          background: "rgba(244,245,244,0.85)",
          backdropFilter: "saturate(140%) blur(10px)",
          WebkitBackdropFilter: "saturate(140%) blur(10px)",
          borderBottom: "1px solid #E6E7E5",
          flexShrink: 0,
        }}>

          {/* ── Breadcrumb ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Home icon */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "#8E97A0", flexShrink: 0 }}>
              <path d="M2 13.5V7L8 2.5l6 4.5v6.5H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <path d="M5.5 13.5V10h5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>

            <span style={{ fontSize: 11.5, color: "#B0B8BF", fontFamily: "inherit" }}>Workspace</span>
            <span style={{ fontSize: 11.5, color: "#C9D0D5" }}>/</span>
            <span style={{ fontSize: 11.5, color: "#4D5760", fontWeight: 600 }}>{pageTitle}</span>
            {pageSubtitle && (
              <>
                <span style={{ fontSize: 11.5, color: "#C9D0D5" }}>/</span>
                <span style={{
                  fontSize: 11.5, color: "#8E97A0",
                  maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{pageSubtitle}</span>
              </>
            )}
          </div>

          {/* ── Search ── */}
          <div style={{
            flex: 1,
            maxWidth: 480,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: "1px solid #E6E7E5",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 13,
            color: "#8E97A0",
            cursor: "text",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "#C9D0D5";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "#E6E7E5";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.55 }}>
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ flex: 1, userSelect: "none" }}>Buscar obras, tareas, documentos…</span>
            <kbd style={{
              fontSize: 10.5,
              padding: "2px 6px",
              borderRadius: 5,
              background: "#F4F5F4",
              border: "1px solid #E0E3E1",
              color: "#8E97A0",
              fontFamily: "'JetBrains Mono', monospace",
              flexShrink: 0,
            }}>⌘K</kbd>
          </div>

          {/* ── Right actions ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Refresh */}
            <button
              title="Refrescar"
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: "#fff",
                border: "1px solid #E6E7E5",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "#6B767E", cursor: "pointer",
                transition: "background 0.12s, border-color 0.12s, color 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "#F4F5F4";
                (e.currentTarget as HTMLElement).style.color = "#3D4A52";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "#fff";
                (e.currentTarget as HTMLElement).style.color = "#6B767E";
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 8A5.5 5.5 0 112.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M2.5 2.5v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Bell with notification dot */}
            <button
              title="Notificaciones"
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: "#fff",
                border: "1px solid #E6E7E5",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "#6B767E", cursor: "pointer",
                position: "relative",
                transition: "background 0.12s, border-color 0.12s, color 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "#F4F5F4";
                (e.currentTarget as HTMLElement).style.color = "#3D4A52";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "#fff";
                (e.currentTarget as HTMLElement).style.color = "#6B767E";
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M3 12V8a5 5 0 0110 0v4M2 12h12M6 14a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              </svg>
              {/* Orange notification dot */}
              <span style={{
                position: "absolute", top: 7, right: 7,
                width: 7, height: 7, borderRadius: 99,
                background: "#FF6B35",
                boxShadow: "0 0 0 2px #F4F5F4",
              }} />
            </button>

            {/* PM avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: 99, flexShrink: 0,
              background: "linear-gradient(135deg, #FF8856, #E85A26)",
              color: "#fff", fontWeight: 700, fontSize: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: "pointer",
              boxShadow: "0 0 0 2px #fff, 0 0 0 3px #E6E7E5",
            }}>PM</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-7 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
