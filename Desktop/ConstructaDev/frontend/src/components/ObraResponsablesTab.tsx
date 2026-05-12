import { useState } from "react";
import { Plus, Pencil, UserX, UserCheck, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { SectionTitle } from "./ui/SectionTitle";
import { ResponsibleFormModal } from "./ResponsibleFormModal";
import { ResponsibleDeactivateConfirm } from "./ResponsibleDeactivateConfirm";
import { ResponsibleReactivateConfirm } from "./ResponsibleReactivateConfirm";
import type { Responsible, Task } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InactivoBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-constructa-surface text-constructa-secondaryText border border-constructa-border">
      Inactivo
    </span>
  );
}

function WorkloadBadge({ count }: { count: number }) {
  if (count === 0)
    return (
      <span className="text-xs text-constructa-secondaryText">Sin tareas</span>
    );
  if (count >= 3)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-constructa-danger">
        Alta carga · {count}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
      Con tareas · {count}
    </span>
  );
}

function TaskCountBadge({ count }: { count: number }) {
  if (count === 0)
    return <span className="text-constructa-border text-xs">0</span>;
  return (
    <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded bg-constructa-surface text-xs font-semibold text-constructa-text">
      {count}
    </span>
  );
}

const TH_CLS =
  "px-4 py-3 text-xs font-bold uppercase tracking-widest text-constructa-secondaryText whitespace-nowrap";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ObraResponsablesTabProps {
  responsibles: Responsible[];
  tasks: Task[];
  onRefresh: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ObraResponsablesTab({
  responsibles,
  tasks,
  onRefresh,
}: ObraResponsablesTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [toEdit, setToEdit] = useState<Responsible | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Responsible | null>(null);
  const [toReactivate, setToReactivate] = useState<Responsible | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const active = responsibles.filter((r) => r.is_active);
  const inactive = responsibles.filter((r) => !r.is_active);

  function activeTaskCount(id: number) {
    return tasks.filter(
      (t) =>
        t.responsible_id === id &&
        t.status !== "completada" &&
        t.status !== "cancelada"
    ).length;
  }

  function totalTaskCount(id: number) {
    return tasks.filter((t) => t.responsible_id === id).length;
  }

  function handleSaved() {
    setShowCreate(false);
    setToEdit(null);
    onRefresh();
  }

  function handleDeactivated() {
    setToDeactivate(null);
    onRefresh();
  }

  function handleReactivated() {
    setToReactivate(null);
    onRefresh();
  }

  return (
    <>
      <div className="space-y-6">
        {/* ── Activos ── */}
        <section>
          <SectionTitle
            aside={
              <Button
                variant="primary"
                onClick={() => setShowCreate(true)}
                className="text-xs px-3 py-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo responsable
              </Button>
            }
          >
            Responsables activos
            {active.length > 0 && (
              <span className="ml-2 text-xs font-normal text-constructa-secondaryText">
                ({active.length})
              </span>
            )}
          </SectionTitle>

          <Card padding="none" className="overflow-hidden">
            {active.length === 0 ? (
              <div className="text-center py-12 text-constructa-secondaryText text-sm">
                No hay responsables activos. Agregá uno con el botón de arriba.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-constructa-border bg-constructa-surface text-left">
                      {["Nombre", "Rol", "WhatsApp", "Carga actual", "Acciones"].map(
                        (h) => (
                          <th key={h} className={TH_CLS}>
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-constructa-surface">
                    {active.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-constructa-bg transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-constructa-text">
                          {r.full_name}
                        </td>
                        <td className="px-4 py-3 text-constructa-secondaryText">
                          {r.role ?? (
                            <span className="text-constructa-border">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-constructa-secondaryText font-mono text-xs">
                          {r.whatsapp_number}
                        </td>
                        <td className="px-4 py-3">
                          <WorkloadBadge count={activeTaskCount(r.id)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setToEdit(r)}
                              title="Editar responsable"
                              className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-info hover:bg-blue-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setToDeactivate(r)}
                              title="Desactivar responsable"
                              className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-danger hover:bg-red-50 transition-colors"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        {/* ── Desactivados (collapsible) ── */}
        {inactive.length > 0 && (
          <div className="border-t border-constructa-border pt-4">
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="flex items-center gap-2 text-sm text-constructa-secondaryText hover:text-constructa-text transition-colors select-none"
            >
              {showInactive ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Ver responsables desactivados ({inactive.length})
            </button>

            {showInactive && (
              <div className="mt-3">
                <Card padding="none" className="overflow-hidden bg-constructa-surface/50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-constructa-border bg-constructa-surface text-left">
                          {["Nombre", "Rol", "WhatsApp", "Tareas históricas", "Estado", "Acciones"].map(
                            (h, i) => (
                              <th key={i} className={TH_CLS}>
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-constructa-surface">
                        {inactive.map((r) => (
                          <tr
                            key={r.id}
                            className="opacity-50 hover:opacity-75 transition-opacity"
                          >
                            <td className="px-4 py-3 font-semibold text-constructa-text line-through">
                              {r.full_name}
                            </td>
                            <td className="px-4 py-3 text-constructa-secondaryText">
                              {r.role ?? (
                                <span className="text-constructa-border">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-constructa-secondaryText font-mono text-xs">
                              {r.whatsapp_number}
                            </td>
                            <td className="px-4 py-3">
                              <TaskCountBadge count={totalTaskCount(r.id)} />
                            </td>
                            <td className="px-4 py-3">
                              <InactivoBadge />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setToReactivate(r)}
                                  title="Reactivar responsable"
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-constructa-success hover:bg-green-50 transition-colors"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Reactivar
                                </button>
                                <button
                                  onClick={() => setToEdit(r)}
                                  title="Editar datos del responsable"
                                  className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-info hover:bg-blue-50 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showCreate && (
        <ResponsibleFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {toEdit && (
        <ResponsibleFormModal
          mode="edit"
          responsible={toEdit}
          onClose={() => setToEdit(null)}
          onSaved={handleSaved}
        />
      )}

      {toDeactivate && (
        <ResponsibleDeactivateConfirm
          responsible={toDeactivate}
          obraTasks={tasks}
          onClose={() => setToDeactivate(null)}
          onDeactivated={handleDeactivated}
        />
      )}

      {toReactivate && (
        <ResponsibleReactivateConfirm
          responsible={toReactivate}
          onClose={() => setToReactivate(null)}
          onReactivated={handleReactivated}
        />
      )}
    </>
  );
}
