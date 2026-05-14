import { useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { ObraSetupWizard } from "./components/ObraSetupWizard";
import { ConfiguracionPage } from "./pages/ConfiguracionPage";
import { LoginPage } from "./pages/LoginPage";
import { ObraDetailPage } from "./pages/ObraDetailPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import type { Obra, Page } from "./types";

function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("access_token"));
  const [activePage, setActivePage] = useState<Page>("panel");
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [pinnedObras, setPinnedObras] = useState<Obra[]>(() => {
    try { return JSON.parse(localStorage.getItem("pinned_obras") || "[]"); }
    catch { return []; }
  });

  function handleTogglePin(obra: Obra) {
    setPinnedObras(prev => {
      const next = prev.some(o => o.id === obra.id)
        ? prev.filter(o => o.id !== obra.id)
        : [...prev, obra];
      localStorage.setItem("pinned_obras", JSON.stringify(next));
      return next;
    });
  }

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  function handleNavigate(page: Page) {
    setActivePage(page);
    if (page === "panel") setSelectedObra(null);
  }

  function handleSelectObra(obra: Obra) {
    setSelectedObra(obra);
    setActivePage("panel");
  }

  function handleBack() {
    setSelectedObra(null);
  }

  function handleObraCreated(obra: Obra) {
    setShowWizard(false);
    setSelectedObra(obra);
    setActivePage("panel");
  }

  // ── Derive top-bar content ────────────────────────────────────────────────
  let pageTitle: string;
  let pageSubtitle: string | undefined;

  if (activePage === "panel") {
    if (selectedObra) {
      pageTitle = selectedObra.name;
      pageSubtitle = selectedObra.location ?? undefined;
    } else {
      pageTitle = "Panel";
      pageSubtitle = "Vista general de obras";
    }
  } else {
    pageTitle = "Configuración";
    pageSubtitle = "Ajustes del sistema";
  }

  // ── Render page content ───────────────────────────────────────────────────
  function renderPage() {
    if (activePage === "panel") {
      return selectedObra ? (
        <ObraDetailPage obra={selectedObra} />
      ) : (
        <PortfolioPage
          onSelectObra={handleSelectObra}
          onNewObra={() => setShowWizard(true)}
          pinnedObras={pinnedObras}
          onTogglePin={handleTogglePin}
        />
      );
    }
    return <ConfiguracionPage />;
  }

  return (
    <>
      <AppLayout
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        activePage={activePage}
        onNavigate={handleNavigate}
        pinnedObras={pinnedObras}
        onLogout={() => {
          localStorage.removeItem("access_token");
          setAuthed(false);
        }}
      >
        {renderPage()}
      </AppLayout>

      {showWizard && (
        <ObraSetupWizard
          onClose={() => setShowWizard(false)}
          onCreated={handleObraCreated}
        />
      )}
    </>
  );
}

export default App;
