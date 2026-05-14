import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import type { Page } from "../../types";

interface AppLayoutProps {
  children: ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
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
    <div className="min-h-screen bg-constructa-bg">
      <Sidebar activePage={activePage} onNavigate={onNavigate} onLogout={onLogout} />

      <div className="ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-[#F5F3EF] border-b border-constructa-border h-12 flex items-center px-6 gap-4 flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-constructa-secondaryText flex-shrink-0">
            <span className="text-constructa-border">Workspace</span>
            <span className="text-constructa-border">/</span>
            <span className="text-constructa-text font-semibold">{pageTitle}</span>
            {pageSubtitle && (
              <>
                <span className="text-constructa-border">/</span>
                <span className="text-constructa-secondaryText truncate max-w-[200px]">{pageSubtitle}</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Right slot */}
          {topBarRight && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {topBarRight}
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-7 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
