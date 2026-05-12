import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle,
  Clock,
  MessageCircle,
  RefreshCw,
  Send,
  Server,
  Triangle,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import socket from "../lib/socket";
import {
  fetchSettings,
  fetchSystemHealth,
  patchSettings,
  simulateOverdue,
  testWhatsApp,
  type SystemHealth,
  type SystemSettings,
} from "../api/settings";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionTitle } from "../components/ui/SectionTitle";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StatusLevel = "ok" | "warning" | "error";

function StatusDot({ level }: { level: StatusLevel }) {
  const cls = {
    ok:      "bg-constructa-success",
    warning: "bg-constructa-warning",
    error:   "bg-constructa-danger",
  }[level];
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cls}`} />;
}

function StatusIcon({ level }: { level: StatusLevel }) {
  if (level === "ok")      return <CheckCircle className="w-4 h-4 text-constructa-success" />;
  if (level === "warning") return <Triangle className="w-4 h-4 text-constructa-warning" />;
  return <XCircle className="w-4 h-4 text-constructa-danger" />;
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={[
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0",
        checked ? "bg-constructa-success" : "bg-constructa-border",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        ].join(" ")}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-constructa-surface last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-constructa-text">{label}</p>
        {description && (
          <p className="text-xs text-constructa-secondaryText mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-constructa-secondaryText uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-constructa-border rounded px-3 py-2 text-sm text-constructa-text placeholder-constructa-border bg-white focus:outline-none focus:ring-1 focus:ring-constructa-primary focus:border-constructa-primary transition-colors"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SystemSettings = {
  chatbot_enabled: true,
  send_hour_from: 8,
  send_hour_to: 20,
  max_response_hours: 24,
  auto_reminders: true,
  reminder_3days: true,
  reminder_1day: true,
  alert_overdue: true,
  alert_no_response: true,
  retry_failed: true,
  notify_task_overdue: true,
  notify_task_blocked: true,
  notify_no_response: true,
  notify_rescheduled: true,
  company_name: null,
  main_responsible: null,
  company_email: null,
  company_phone: null,
};

export function ConfiguracionPage() {
  const [form, setForm]         = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [health, setHealth]     = useState<SystemHealth | null>(null);
  const [wsConnected, setWsConnected]       = useState(socket.connected);
  const [lastSync, setLastSync]             = useState<Date | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveOk, setSaveOk]     = useState(false);
  const [dirty, setDirty]       = useState(false);
  const [healthLoading, setHealthLoading]   = useState(false);

  // Test WhatsApp state
  const [testPhone, setTestPhone]     = useState("");
  const [testResult, setTestResult]   = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Simulate overdue state
  const [simResult, setSimResult]   = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // ── Load initial data ────────────────────────────────────────────────────

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const h = await fetchSystemHealth();
      setHealth(h);
      setLastSync(new Date());
    } catch {
      // silent
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s] = await Promise.all([fetchSettings(), loadHealth()]);
        setForm(s);
      } catch {
        // silent — form keeps defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [loadHealth]);

  // ── WebSocket status ─────────────────────────────────────────────────────

  useEffect(() => {
    function onConnect()    { setWsConnected(true);  setLastSync(new Date()); }
    function onDisconnect() { setWsConnected(false); }
    socket.on("connect",    onConnect);
    socket.on("disconnect", onDisconnect);

    // Connect if needed, then sync current state (connect event won't fire
    // if the socket was already connected before this component mounted).
    if (!socket.connected) {
      socket.connect();
    } else {
      setWsConnected(true);
    }
    return () => {
      socket.off("connect",    onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // ── Form helpers ─────────────────────────────────────────────────────────

  function set<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaveOk(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await patchSettings(form);
      setForm(saved);
      setDirty(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWhatsApp() {
    if (!testPhone.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testWhatsApp(testPhone.trim());
      setTestResult(res.success ? "Mensaje enviado correctamente." : (res.detail ?? "Error al enviar."));
    } catch {
      setTestResult("Error al conectar con el servidor.");
    } finally {
      setTestLoading(false);
    }
  }

  async function handleSimulateOverdue() {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await simulateOverdue();
      setSimResult(
        res.alerts_created > 0
          ? `Se crearon ${res.alerts_created} alerta${res.alerts_created > 1 ? "s" : ""} de tareas vencidas.`
          : "No hay tareas vencidas en este momento."
      );
    } catch {
      setSimResult("Error al ejecutar la simulación.");
    } finally {
      setSimLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-constructa-secondaryText text-sm">
        Cargando configuración...
      </div>
    );
  }

  // ── Derived status levels ─────────────────────────────────────────────────

  const wsLevel: StatusLevel        = wsConnected ? "ok" : "error";
  const backendLevel: StatusLevel   = health?.backend ? "ok" : "error";
  const dbLevel: StatusLevel        = health?.database ? "ok" : "error";
  const waLevel: StatusLevel        = health?.whatsapp_configured ? "ok" : "warning";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* ── Estado del sistema ─────────────────────────────────────────── */}
      <section>
        <SectionTitle
          aside={
            <button
              onClick={loadHealth}
              disabled={healthLoading}
              className="p-1.5 rounded text-constructa-secondaryText hover:text-constructa-text hover:bg-constructa-surface disabled:opacity-40 transition-colors"
              title="Verificar estado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} />
            </button>
          }
        >
          Estado del sistema
        </SectionTitle>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Server className="w-4 h-4" />, label: "Backend", sub: "API online", level: backendLevel },
            { icon: <Wifi className={`w-4 h-4 ${wsConnected ? "" : "opacity-50"}`} />, label: "WebSocket", sub: wsConnected ? "Conectado" : "Desconectado", level: wsLevel },
            { icon: <Server className="w-4 h-4" />, label: "Base de datos", sub: health?.database ? "Online" : "Error", level: dbLevel },
            {
              icon: <MessageCircle className="w-4 h-4" />,
              label: "WhatsApp",
              sub: health?.whatsapp_configured
                ? (health.whatsapp_number ?? "Configurado")
                : "Sin configurar",
              level: waLevel,
            },
          ].map(({ icon, label, sub, level }) => (
            <Card key={label} padding="sm">
              <div className="flex items-start justify-between gap-2">
                <div className="text-constructa-secondaryText">{icon}</div>
                <StatusIcon level={level} />
              </div>
              <p className="mt-2 text-sm font-semibold text-constructa-text">{label}</p>
              <p className="text-xs text-constructa-secondaryText truncate">{sub}</p>
            </Card>
          ))}
        </div>

        {lastSync && (
          <p className="text-[11px] text-constructa-border mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Última verificación: {lastSync.toLocaleTimeString("es-AR")}
          </p>
        )}
      </section>

      {/* ── Datos generales ────────────────────────────────────────────── */}
      <section>
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-constructa-secondaryText" />
            Datos generales
          </span>
        </SectionTitle>
        <Card padding="md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Nombre de la empresa"
              value={form.company_name ?? ""}
              onChange={(v) => set("company_name", v || null)}
              placeholder="Constructora XYZ"
            />
            <FieldRow
              label="Responsable principal"
              value={form.main_responsible ?? ""}
              onChange={(v) => set("main_responsible", v || null)}
              placeholder="Juan García"
            />
            <FieldRow
              label="Email de contacto"
              value={form.company_email ?? ""}
              onChange={(v) => set("company_email", v || null)}
              type="email"
              placeholder="contacto@empresa.com"
            />
            <FieldRow
              label="Teléfono"
              value={form.company_phone ?? ""}
              onChange={(v) => set("company_phone", v || null)}
              placeholder="+54 9 11 1234-5678"
            />
          </div>
        </Card>
      </section>

      {/* ── Chatbot ────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-constructa-secondaryText" />
            Configuración del Chatbot
          </span>
        </SectionTitle>
        <Card padding="md">
          {/* WhatsApp number display */}
          {health?.whatsapp_number && (
            <div className="flex items-center gap-2 mb-4 p-2.5 rounded bg-green-50 border border-green-200">
              <StatusDot level="ok" />
              <span className="text-xs text-green-800 font-medium">
                Número conectado: <span className="font-bold">{health.whatsapp_number}</span>
              </span>
            </div>
          )}
          {!health?.whatsapp_configured && (
            <div className="flex items-center gap-2 mb-4 p-2.5 rounded bg-amber-50 border border-amber-200">
              <StatusDot level="warning" />
              <span className="text-xs text-amber-800 font-medium">
                WhatsApp no configurado. Completá las variables TWILIO_* en el servidor.
              </span>
            </div>
          )}

          <ToggleRow
            label="Chatbot habilitado"
            description="Activa o desactiva el procesamiento de mensajes entrantes"
            checked={form.chatbot_enabled}
            onChange={(v) => set("chatbot_enabled", v)}
          />
          <ToggleRow
            label="Recordatorios automáticos"
            description="Envía recordatorios proactivos antes del vencimiento"
            checked={form.auto_reminders}
            onChange={(v) => set("auto_reminders", v)}
            disabled={!form.chatbot_enabled}
          />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-constructa-secondaryText uppercase tracking-wide">
                Horario desde
              </label>
              <select
                value={form.send_hour_from}
                onChange={(e) => set("send_hour_from", Number(e.target.value))}
                className="border border-constructa-border rounded px-3 py-2 text-sm text-constructa-text bg-white focus:outline-none focus:ring-1 focus:ring-constructa-primary"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-constructa-secondaryText uppercase tracking-wide">
                Horario hasta
              </label>
              <select
                value={form.send_hour_to}
                onChange={(e) => set("send_hour_to", Number(e.target.value))}
                className="border border-constructa-border rounded px-3 py-2 text-sm text-constructa-text bg-white focus:outline-none focus:ring-1 focus:ring-constructa-primary"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-constructa-secondaryText uppercase tracking-wide">
                Tiempo máx. sin respuesta
              </label>
              <select
                value={form.max_response_hours}
                onChange={(e) => set("max_response_hours", Number(e.target.value))}
                className="border border-constructa-border rounded px-3 py-2 text-sm text-constructa-text bg-white focus:outline-none focus:ring-1 focus:ring-constructa-primary"
              >
                {[6, 12, 24, 48, 72].map((h) => (
                  <option key={h} value={h}>{h} horas</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </section>

      {/* ── Automatizaciones + Alertas (2-col en desktop) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Automatizaciones */}
        <section>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-constructa-secondaryText" />
              Automatizaciones
            </span>
          </SectionTitle>
          <Card padding="md">
            <ToggleRow
              label="Recordatorio 3 días antes"
              checked={form.reminder_3days}
              onChange={(v) => set("reminder_3days", v)}
              disabled={!form.auto_reminders}
            />
            <ToggleRow
              label="Recordatorio 1 día antes"
              checked={form.reminder_1day}
              onChange={(v) => set("reminder_1day", v)}
              disabled={!form.auto_reminders}
            />
            <ToggleRow
              label="Alertar tareas vencidas"
              checked={form.alert_overdue}
              onChange={(v) => set("alert_overdue", v)}
            />
            <ToggleRow
              label="Alertar sin respuesta"
              checked={form.alert_no_response}
              onChange={(v) => set("alert_no_response", v)}
            />
            <ToggleRow
              label="Reintentar envío fallido"
              checked={form.retry_failed}
              onChange={(v) => set("retry_failed", v)}
            />
          </Card>
        </section>

        {/* Alertas */}
        <section>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-constructa-secondaryText" />
              Configuración de Alertas
            </span>
          </SectionTitle>
          <Card padding="md">
            <ToggleRow
              label="Tarea vencida"
              description="Mostrar alerta cuando una tarea pasa su fecha límite"
              checked={form.notify_task_overdue}
              onChange={(v) => set("notify_task_overdue", v)}
            />
            <ToggleRow
              label="Tarea demorada / bloqueada"
              description="Mostrar alerta cuando se marca una tarea como demorada"
              checked={form.notify_task_blocked}
              onChange={(v) => set("notify_task_blocked", v)}
            />
            <ToggleRow
              label="Responsable sin respuesta"
              description="Mostrar alerta si no hay respuesta tras el tiempo máximo"
              checked={form.notify_no_response}
              onChange={(v) => set("notify_no_response", v)}
            />
            <ToggleRow
              label="Fecha reprogramada"
              description="Mostrar alerta cuando se reprograma una tarea vía WhatsApp"
              checked={form.notify_rescheduled}
              onChange={(v) => set("notify_rescheduled", v)}
            />
          </Card>
        </section>
      </div>

      {/* ── Tiempo Real ────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            {wsConnected
              ? <Wifi className="w-4 h-4 text-constructa-secondaryText" />
              : <WifiOff className="w-4 h-4 text-constructa-secondaryText" />
            }
            Tiempo Real
          </span>
        </SectionTitle>
        <Card padding="md">
          <div className="flex items-center justify-between py-2.5 border-b border-constructa-surface">
            <div>
              <p className="text-sm font-medium text-constructa-text">Estado WebSocket</p>
              <p className="text-xs text-constructa-secondaryText mt-0.5">
                Canal de actualización en tiempo real
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot level={wsLevel} />
              <span className={`text-xs font-semibold ${wsConnected ? "text-constructa-success" : "text-constructa-danger"}`}>
                {wsConnected ? "Conectado" : "Desconectado"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2.5 border-b border-constructa-surface">
            <div>
              <p className="text-sm font-medium text-constructa-text">Actualización automática</p>
              <p className="text-xs text-constructa-secondaryText mt-0.5">
                El panel se actualiza cuando el chatbot modifica una tarea
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot level={wsConnected ? "ok" : "warning"} />
              <span className="text-xs font-semibold text-constructa-secondaryText">
                {wsConnected ? "Habilitada" : "Inactiva"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <p className="text-sm font-medium text-constructa-text">Última sincronización</p>
            <span className="text-xs text-constructa-secondaryText">
              {lastSync ? lastSync.toLocaleTimeString("es-AR") : "—"}
            </span>
          </div>
        </Card>
      </section>

      {/* ── Acciones de testing ────────────────────────────────────────── */}
      <section>
        <SectionTitle>Acciones de testing</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Test WhatsApp */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Send className="w-4 h-4 text-constructa-primary flex-shrink-0" />
              <p className="text-sm font-semibold text-constructa-text">Probar mensaje WhatsApp</p>
            </div>
            <p className="text-xs text-constructa-secondaryText mb-3">
              Envía un mensaje de prueba al número indicado para verificar la integración con Twilio.
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => { setTestPhone(e.target.value); setTestResult(null); }}
                placeholder="+54 9 11 1234-5678"
                className="flex-1 min-w-0 border border-constructa-border rounded px-3 py-1.5 text-sm text-constructa-text placeholder-constructa-border bg-white focus:outline-none focus:ring-1 focus:ring-constructa-primary"
              />
              <Button
                variant="primary"
                onClick={handleTestWhatsApp}
                disabled={testLoading || !testPhone.trim()}
                className="text-xs px-3 py-1.5 flex-shrink-0"
              >
                {testLoading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
            {testResult && (
              <p className={`text-xs mt-2 font-medium ${testResult.includes("correctamente") ? "text-constructa-success" : "text-constructa-danger"}`}>
                {testResult}
              </p>
            )}
          </Card>

          {/* Simulate overdue */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-constructa-warning flex-shrink-0" />
              <p className="text-sm font-semibold text-constructa-text">Simular tarea vencida</p>
            </div>
            <p className="text-xs text-constructa-secondaryText mb-3">
              Fuerza la generación de alertas para todas las tareas que ya superaron su fecha de vencimiento.
            </p>
            <Button
              variant="warning"
              onClick={handleSimulateOverdue}
              disabled={simLoading}
              className="text-xs px-3 py-1.5 w-full"
            >
              {simLoading ? "Procesando..." : "Ejecutar simulación"}
            </Button>
            {simResult && (
              <p className="text-xs mt-2 font-medium text-constructa-secondaryText">{simResult}</p>
            )}
          </Card>
        </div>
      </section>

      {/* ── Save bar ───────────────────────────────────────────────────── */}
      <div
        className={[
          "sticky bottom-4 flex items-center justify-between gap-4 px-4 py-3 rounded-lg border shadow-card-md transition-all",
          dirty
            ? "bg-white border-constructa-border opacity-100 translate-y-0"
            : "bg-white border-transparent opacity-0 pointer-events-none translate-y-2",
        ].join(" ")}
      >
        <p className="text-sm text-constructa-secondaryText">Tenés cambios sin guardar.</p>
        <div className="flex items-center gap-2">
          {saveOk && (
            <span className="text-xs font-semibold text-constructa-success flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Guardado
            </span>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-4 py-2"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
