import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Sidebar } from "./Sidebar";
import type { Page } from "../../types";

interface AppLayoutProps {
  children: ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  /** Optional slot rendered in the top-bar right area (e.g. refresh button) */
  topBarRight?: ReactNode;
}

export function AppLayout({
  children,
  pageTitle,
  pageSubtitle,
  activePage,
  onNavigate,
  onLogout,
  topBarRight,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-constructa-bg">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-constructa-border h-14 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-constructa-text truncate">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="text-xs text-constructa-secondaryText truncate">{pageSubtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {topBarRight}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs font-medium text-constructa-secondaryText hover:text-constructa-text px-2.5 py-1.5 rounded hover:bg-constructa-surface transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
