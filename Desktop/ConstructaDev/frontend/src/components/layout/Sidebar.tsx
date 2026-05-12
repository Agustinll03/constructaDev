import { LayoutDashboard, Settings } from "lucide-react";
import type { Page } from "../../types";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: "panel",         label: "Panel",         icon: LayoutDashboard },
  { page: "configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-60 min-h-screen bg-constructa-dark flex flex-col flex-shrink-0">
      {/* Logo block */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-constructa-primary flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold tracking-tight text-sm leading-none">
              CONSTRUCTA
            </p>
            <p className="text-white/40 text-xs mt-0.5">Gestión de obras</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => {
          const isActive = activePage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors text-left",
                isActive
                  ? "bg-constructa-primary text-white"
                  : "text-white/60 hover:text-white hover:bg-white/8",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-white/25 text-xs">Tesis 2026</p>
      </div>
    </aside>
  );
}
