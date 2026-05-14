import { useCallback, useEffect, useState } from "react";
import {
  MapPin, Calendar, RefreshCw, Building2, Plus,
  TrendingUp, CheckCircle2, ImageOff, ChevronRight, Search,
} from "lucide-react";
import { fetchObras } from "../api/obras";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/Spinner";
import type { Obra, ObraStatus } from "../types";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ObraStatus, { label: string; badge: string }> = {
  planificada: { label: "Planificada", badge: "bg-blue-100 text-blue-700" },
  en_progreso: { label: "En progreso", badge: "bg-orange-100 text-constructa-primary" },
  pausada:     { label: "Pausada",     badge: "bg-amber-100 text-amber-700" },
  completada:  { label: "Completada",  badge: "bg-green-100 text-constructa-success" },
  cancelada:   { label: "Cancelada",   badge: "bg-gray-100 text-gray-500" },
};

const STATUS_GRADIENT: Record<ObraStatus, string> = {
  planificada: "from-blue-100 to-blue-50",
  en_progreso: "from-orange-100 to-orange-50",
  pausada:     "from-amber-100 to-amber-50",
  completada:  "from-green-100 to-green-50",
  cancelada:   "from-gray-100 to-gray-50",
};

const STATUS_PCT: Partial<Record<ObraStatus, number>> = {
  planificada: 5,
  en_progreso: 50,
  pausada:     30,
  completada:  100,
  cancelada:   0,
};

const STATUS_BAR: Partial<Record<ObraStatus, string>> = {
  planificada: "bg-blue-400",
  en_progreso: "bg-constructa-primary",
  pausada:     "bg-amber-400",
  completada:  "bg-constructa-success",
  cancelada:   "bg-constructa-border",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(d: string | null): string | null {
  if (!d) return null;
  const [, month, day] = d.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
}

// ─── Obra row (table) ─────────────────────────────────────────────────────────

interface ObraRowProps {
  obra: Obra;
  onSelect: () => void;
}

function ObraRow({ obra, onSelect }: ObraRowProps) {
  const cfg = STATUS_CONFIG[obra.status];
  const pct = STATUS_PCT[obra.status] ?? 0;
  const bar = STATUS_BAR[obra.status] ?? "bg-constructa-border";
  const [imgError, setImgError] = useState(false);
  const hasImage = obra.image_url && !imgError;

  const startShort = formatDateShort(obra.start_date);
  const endShort = formatDateShort(obra.expected_end_date);

  return (
    <div
      onClick={onSelect}
      className="flex items-center px-5 py-5 gap-4 hover:bg-constructa-surface/40 cursor-pointer transition-colors group border-b border-constructa-surface/60 last:border-0"
    >
      {/* ID */}
      <div className="w-14 flex-shrink-0 text-[11px] font-mono text-constructa-border">
        #{String(obra.id).padStart(3, "0")}
      </div>

      {/* Thumbnail + name */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <div className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br ${STATUS_GRADIENT[obra.status]}`}>
          {hasImage ? (
            <img
              src={obra.image_url!}
              alt={obra.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : imgError ? (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-4 h-4 text-constructa-border/50" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-constructa-border/35" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-constructa-text group-hover:text-constructa-primary transition-colors font-display truncate">
            {obra.name}
          </p>
          {obra.location && (
            <p className="text-xs text-constructa-secondaryText truncate mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {obra.location}
            </p>
          )}
        </div>
      </div>

      {/* Estado */}
      <div className="w-32 flex-shrink-0">
        <span className={`inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Avance */}
      <div className="w-40 flex-shrink-0 flex items-center gap-2.5">
        <div className="flex-1 h-1.5 bg-constructa-surface rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-mono font-bold text-constructa-secondaryText w-8 text-right flex-shrink-0">
          {pct}%
        </span>
      </div>

      {/* Período */}
      <div className="w-36 flex-shrink-0 text-xs font-mono text-constructa-secondaryText flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-constructa-border flex-shrink-0" />
        {startShort ?? "—"} → {endShort ?? "—"}
      </div>

      {/* Chevron */}
      <div className="w-8 flex-shrink-0 flex justify-end">
        <ChevronRight className="w-5 h-5 text-constructa-border group-hover:text-constructa-primary transition-colors" />
      </div>
    </div>
  );
}

// ─── Filter options ───────────────────────────────────────────────────────────

type ObraFilter = "todas" | ObraStatus;

const FILTER_OPTIONS: { id: ObraFilter; label: string }[] = [
  { id: "todas",       label: "Todas"       },
  { id: "en_progreso", label: "Activas"     },
  { id: "planificada", label: "Planificadas"},
  { id: "pausada",     label: "Pausadas"    },
  { id: "completada",  label: "Completadas" },
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

  useEffect(() => { loadData(); }, [loadData]);

  const byStatus = (s: ObraStatus) => obras.filter((o) => o.status === s).length;
  const filteredObras = filter === "todas" ? obras : obras.filter((o) => o.status === filter);

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).toUpperCase();

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-[10px] font-mono tracking-[0.18em] text-constructa-border mb-1.5">
            {today}
          </p>
          <h1 className="text-[26px] font-black font-display text-constructa-text leading-none tracking-tight">
            Operación
            {!loading && obras.length > 0 && (
              <span className="text-constructa-secondaryText font-bold text-xl ml-2.5">
                · {byStatus("en_progreso")} obras activas
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-constructa-border pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar obras..."
              readOnly
              className="pl-9 pr-10 py-2 text-[11px] bg-white border border-constructa-border rounded-lg text-constructa-secondaryText placeholder:text-constructa-border focus:outline-none cursor-default w-48"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-constructa-border bg-constructa-surface px-1.5 py-0.5 rounded border border-constructa-border/50">
              ⌘K
            </kbd>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Actualizar"
            className="p-2 rounded-lg border border-constructa-border bg-white text-constructa-secondaryText hover:text-constructa-text hover:border-constructa-text/20 disabled:opacity-40 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Button variant="primary" onClick={onNewObra}>
            <Plus className="w-4 h-4" />
            Nueva obra
          </Button>
        </div>
      </div>

      {/* ── Horizontal stats bar ── */}
      {!loading && obras.length > 0 && (
        <div className="bg-white border border-constructa-border rounded-xl flex divide-x divide-constructa-surface mb-6">
          {[
            {
              label: "Obras activas",
              value: byStatus("en_progreso"),
              sub: `${obras.length} totales`,
              icon: <TrendingUp className="w-4 h-4" />,
              color: "text-constructa-primary",
            },
            {
              label: "Completadas",
              value: byStatus("completada"),
              sub: "Finalizadas",
              icon: <CheckCircle2 className="w-4 h-4" />,
              color: "text-constructa-success",
            },
            {
              label: "Planificadas",
              value: byStatus("planificada"),
              sub: "En espera",
              icon: <Building2 className="w-4 h-4" />,
              color: "text-constructa-info",
            },
            {
              label: "Pausadas",
              value: byStatus("pausada"),
              sub: "En pausa",
              icon: null,
              color: "text-constructa-warning",
            },
            {
              label: "Total",
              value: obras.length,
              sub: "Registradas",
              icon: null,
              color: "text-constructa-text",
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="flex-1 px-5 py-4 min-w-0">
              <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-constructa-border mb-2">
                {label}
              </p>
              <p className={`text-4xl font-black font-display leading-none tracking-tight ${color}`}>
                {value}
              </p>
              <p className="text-[10px] font-mono text-constructa-border mt-1.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="text-sm text-constructa-danger bg-red-50 border border-constructa-danger/30 rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* ── Obras table ── */}
      {loading ? (
        <Spinner />
      ) : obras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white border border-constructa-border rounded-xl">
          <Building2 className="w-12 h-12 text-constructa-border/30" />
          <div className="text-center">
            <p className="text-base font-bold text-constructa-text font-display">Sin obras registradas</p>
            <p className="text-xs mt-1 font-mono text-constructa-secondaryText">
              Creá tu primera obra para comenzar el seguimiento.
            </p>
          </div>
          <Button variant="primary" onClick={onNewObra}>
            <Plus className="w-4 h-4" />
            Crear primera obra
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-constructa-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-constructa-surface">
            <div>
              <h2 className="text-sm font-bold text-constructa-text font-display">Mis obras</h2>
              <p className="text-[10px] font-mono text-constructa-border mt-0.5">
                {obras.length} proyectos · actualizado hace un momento
              </p>
            </div>
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {FILTER_OPTIONS.map(({ id, label }) => {
                const isActive = filter === id;
                const count = id === "todas"
                  ? obras.length
                  : obras.filter((o) => o.status === id).length;
                return (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={[
                      "px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-constructa-text text-white"
                        : "text-constructa-secondaryText hover:text-constructa-text hover:bg-constructa-surface",
                    ].join(" ")}
                  >
                    {label} <span className="font-mono opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column labels */}
          <div className="flex items-center px-5 py-2.5 gap-4 bg-constructa-surface/40 border-b border-constructa-surface text-[9px] font-mono uppercase tracking-[0.18em] text-constructa-border">
            <div className="w-14 flex-shrink-0">#</div>
            <div className="flex-1">Obra</div>
            <div className="w-32 flex-shrink-0">Estado</div>
            <div className="w-40 flex-shrink-0">Avance</div>
            <div className="w-36 flex-shrink-0">Período</div>
            <div className="w-8 flex-shrink-0" />
          </div>

          {/* Rows */}
          {filteredObras.length === 0 ? (
            <div className="flex items-center justify-center py-12 gap-2 text-constructa-secondaryText">
              <Building2 className="w-5 h-5 opacity-20" />
              <p className="text-xs font-mono">No hay obras con este filtro.</p>
            </div>
          ) : (
            <div>
              {filteredObras.map((obra) => (
                <ObraRow key={obra.id} obra={obra} onSelect={() => onSelectObra(obra)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
