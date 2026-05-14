import { LayoutDashboard, Settings, LogOut } from "lucide-react";
import type { Page } from "../../types";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

function NavBtn({
  label,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left",
        active
          ? "bg-constructa-primary text-white"
          : "text-white/50 hover:text-white hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

export function Sidebar({ activePage, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1C2130] flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-constructa-primary flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
            </svg>
          </div>
          <div>
            <p className="text-white font-display font-bold text-sm leading-none tracking-tight">CONSTRUCTA</p>
            <p className="text-white/40 text-[10px] mt-0.5 font-mono">Gestión de obras</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/25 px-3 mb-2">
            Workspace
          </p>
          <div className="space-y-0.5">
            <NavBtn
              label="Panel"
              icon={LayoutDashboard}
              active={activePage === "panel"}
              onClick={() => onNavigate("panel")}
            />
          </div>
        </div>

        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/25 px-3 mb-2">
            Cuenta
          </p>
          <div className="space-y-0.5">
            <NavBtn
              label="Configuración"
              icon={Settings}
              active={activePage === "configuracion"}
              onClick={() => onNavigate("configuracion")}
            />
          </div>
        </div>
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-constructa-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold font-display">PM</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Project Manager</p>
            <p className="text-white/35 text-[10px] font-mono truncate">Administrador</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all text-left"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
