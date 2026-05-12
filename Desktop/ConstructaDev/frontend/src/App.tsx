import { useState } from "react";
import { ChevronLeft } from "lucide-react";
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
  let topBarRight: React.ReactNode;

  if (activePage === "panel") {
    if (selectedObra) {
      pageTitle = selectedObra.name;
      pageSubtitle = selectedObra.location ?? undefined;
      topBarRight = (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-xs font-medium text-constructa-secondaryText hover:text-constructa-text px-2.5 py-1.5 rounded hover:bg-constructa-surface transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Volver al panel
        </button>
      );
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
        topBarRight={topBarRight}
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
