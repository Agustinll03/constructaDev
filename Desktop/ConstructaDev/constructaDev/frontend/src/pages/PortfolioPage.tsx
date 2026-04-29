import { useCallback, useEffect, useState } from "react";
import {
  MapPin, Calendar, ArrowRight, RefreshCw, Building2, Plus,
  TrendingUp, CheckCircle2,
} from "lucide-react";
import { fetchObras } from "../api/obras";
import { SectionTitle } from "../components/ui/SectionTitle";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/Spinner";
import type { Obra, ObraStatus } from "../types";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ObraStatus, { label: string; style: string }> = {
  planificada: { label: "Planificada", style: "bg-blue-50   text-constructa-info    border-blue-200" },
  en_progreso: { label: "En progreso", style: "bg-orange-50 text-constructa-primary border-orange-200" },
  pausada:     { label: "Pausada",     style: "bg-amber-50  text-constructa-warning  border-amber-200" },
  completada:  { label: "Completada",  style: "bg-green-50  text-constructa-success  border-green-200" },
  cancelada:   { label: "Cancelada",   style: "bg-gray-50   text-constructa-secondaryText border-constructa-border" },
};

function ObraStatusBadge({ status }: { status: ObraStatus }) {
  const { label, style } = STATUS_CONFIG[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${style}`}>
      {label}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

const STATUS_PROGRESS: Partial<Record<ObraStatus, { pct: number; barClass: string }>> = {
  planificada: { pct: 0,   barClass: "bg-constructa-info" },
  en_progreso: { pct: 0,   barClass: "bg-constructa-primary" },
  pausada:     { pct: 0,   barClass: "bg-constructa-warning" },
  completada:  { pct: 100, barClass: "bg-constructa-success" },
  // cancelada: omitted — not relevant
};

function ObraProgressBar({ status }: { status: ObraStatus }) {
  const progress = STATUS_PROGRESS[status];
  if (!progress) return null;
  return (
    <div className="px-5 pb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-constructa-border">
          Avance
        </span>
        <span className="text-[10px] font-bold text-constructa-secondaryText">
          {progress.pct}%
        </span>
      </div>
      <div className="h-1 bg-constructa-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${progress.barClass}`}
          style={{ width: `${progress.pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Obra card ────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  const [year, month, day] = d.split("-");
  return `${day}/${month}/${year}`;
}

interface ObraCardProps {
  obra: Obra;
  onSelect: () => void;
}

function ObraCard({ obra, onSelect }: ObraCardProps) {
  return (
    <div
      onClick={onSelect}
      className="bg-white border border-constructa-border rounded-2xl shadow-card flex flex-col cursor-pointer hover:shadow-card-md hover:border-constructa-secondaryText/40 transition-all group"
    >
      {/* Body */}
      <div className="px-5 pt-5 pb-3 flex gap-4 flex-1">
        {/* Icon block */}
        <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Building2 className="w-7 h-7 text-constructa-info" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-constructa-border mb-0.5">#{obra.id}</p>
              <h3 className="text-sm font-bold text-constructa-text leading-snug">{obra.name}</h3>
            </div>
            <ObraStatusBadge status={obra.status} />
          </div>

          <div className="space-y-1.5">
            {obra.location && (
              <div className="flex items-center gap-1.5 text-xs text-constructa-secondaryText">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-constructa-border" />
                <span className="truncate">{obra.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-constructa-secondaryText">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-constructa-border" />
              <span>
                {formatDate(obra.start_date)}
                {" → "}
                {formatDate(obra.expected_end_date)}
              </span>
            </div>
            {obra.description && (
              <p className="text-xs text-constructa-secondaryText line-clamp-2 pt-0.5">
                {obra.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <ObraProgressBar status={obra.status} />

      {/* Footer */}
      <div className="px-5 py-3 border-t border-constructa-surface flex justify-end">
        <span className="flex items-center gap-1 text-xs font-semibold text-constructa-primary transition-colors">
          Ver obra
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}

// ─── Filter pills ─────────────────────────────────────────────────────────────

type ObraFilter = "todas" | ObraStatus;

const FILTER_OPTIONS: { id: ObraFilter; label: string; dotClass: string }[] = [
  { id: "todas",       label: "Todas",        dotClass: "bg-constructa-primary" },
  { id: "en_progreso", label: "En progreso",  dotClass: "bg-constructa-primary" },
  { id: "planificada", label: "Planificadas", dotClass: "bg-constructa-info" },
  { id: "pausada",     label: "Pausadas",     dotClass: "bg-constructa-warning" },
  { id: "completada",  label: "Completadas",  dotClass: "bg-constructa-success" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PortfolioPageProps {
  onSelectObra: (obra: Obra) => void;
  onNewObra: () => void;
}

export function PortfolioPage({ onSelectObra, onNewObra }: PortfolioPageProps) {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ObraFilter>("todas");

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      setObras(await fetchObras());
    } catch {
      setError("No se pudieron cargar las obras. Verificá que el backend esté corriendo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const byStatus = (s: ObraStatus) => obras.filter((o) => o.status === s).length;
  const filteredObras = filter === "todas" ? obras : obras.filter((o) => o.status === filter);

  return (
    <div className="space-y-6">
      {/* ── KPI cards ── */}
      {!loading && (
        <section>
          <SectionTitle
            aside={
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Actualizar"
                className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-text hover:bg-constructa-surface disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            }
          >
            Resumen general
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total obras"
              value={obras.length}
              icon={<Building2 className="w-7 h-7" />}
              helperText="Todas las obras registradas"
              accentLine
            />
            <StatCard
              label="En progreso"
              value={byStatus("en_progreso")}
              accent="primary"
              icon={<TrendingUp className="w-7 h-7" />}
              helperText="Obras en ejecución"
            />
            <StatCard
              label="Completadas"
              value={byStatus("completada")}
              accent="success"
              icon={<CheckCircle2 className="w-7 h-7" />}
              helperText="Obras finalizadas"
            />
          </div>
        </section>
      )}

      {/* ── Obra list with filters ── */}
      <section>
        <SectionTitle
          aside={
            <Button variant="primary" onClick={onNewObra} className="text-xs px-3 py-1.5">
              <Plus className="w-3.5 h-3.5" />
              Nueva obra
            </Button>
          }
        >
          Mis obras
        </SectionTitle>

        {error && (
          <div className="text-sm text-constructa-danger bg-red-50 border border-constructa-danger/30 rounded px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : obras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-constructa-secondaryText gap-4">
            <Building2 className="w-12 h-12 opacity-15" />
            <div className="text-center">
              <p className="text-sm font-semibold text-constructa-text">Sin obras registradas</p>
              <p className="text-xs mt-1">Creá tu primera obra para comenzar el seguimiento.</p>
            </div>
            <Button variant="primary" onClick={onNewObra}>
              <Plus className="w-4 h-4" />
              Crear primera obra
            </Button>
          </div>
        ) : (
          <>
            {/* Filter pills */}
            <div className="flex items-center gap-1 flex-wrap bg-constructa-surface rounded-full p-1 w-fit mb-5">
              {FILTER_OPTIONS.map(({ id, label, dotClass }) => {
                const isActive = filter === id;
                const count =
                  id === "todas"
                    ? obras.length
                    : obras.filter((o) => o.status === id).length;
                return (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                      isActive
                        ? "bg-white shadow-sm text-constructa-text border-constructa-primary/30"
                        : "text-constructa-secondaryText hover:text-constructa-text border-transparent",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-opacity",
                        dotClass,
                        isActive ? "opacity-100" : "opacity-40",
                      ].join(" ")}
                    />
                    {label}
                    <span
                      className={[
                        "text-[10px] font-bold",
                        isActive
                          ? "text-constructa-secondaryText"
                          : "text-constructa-border",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grid */}
            {filteredObras.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-constructa-secondaryText gap-2">
                <Building2 className="w-8 h-8 opacity-20" />
                <p className="text-sm">No hay obras con este filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredObras.map((obra) => (
                  <ObraCard
                    key={obra.id}
                    obra={obra}
                    onSelect={() => onSelectObra(obra)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
