import React, { useState } from "react";
import { login } from "../api/auth";
import { setToken } from "../lib/tokenStorage";
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

interface LoginPageProps {
  onLogin: () => void;
}

const FEATURES = [
  "Tareas en tiempo real",
  "Alertas automáticas vía WhatsApp",
  "Trazabilidad completa de obras",
];

const blueprintGrid: React.CSSProperties = {
  backgroundImage: "radial-gradient(circle, rgba(255,107,53,0.18) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      setToken(token);
      onLogin();
    } catch {
      setError("Credenciales inválidas. Verificá tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Left panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[42%] xl:w-[40%] bg-constructa-dark flex-col justify-between p-10 xl:p-14 relative overflow-hidden flex-shrink-0"
        style={blueprintGrid}
      >
        {/* corner marks */}
        <span className="absolute top-5 left-5 w-4 h-4 border-t-2 border-l-2 border-constructa-primary/40" />
        <span className="absolute top-5 right-5 w-4 h-4 border-t-2 border-r-2 border-constructa-primary/40" />
        <span className="absolute bottom-5 left-5 w-4 h-4 border-b-2 border-l-2 border-constructa-primary/40" />
        <span className="absolute bottom-5 right-5 w-4 h-4 border-b-2 border-r-2 border-constructa-primary/40" />

        {/* Brand */}
        <div className="relative z-10 opacity-0 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Constructa" className="w-9 h-9 rounded flex-shrink-0 object-cover" />
            <span className="text-white font-display font-bold text-lg tracking-tight">CONSTRUCTA</span>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-5">
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center gap-2 mb-5">
              <svg className="w-4 h-4 text-constructa-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
              <span className="font-mono text-[11px] font-semibold tracking-widest text-constructa-primary/80 uppercase">
                Sistema v.2026
              </span>
            </div>

            <h1 className="font-display text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Gestioná obras<br />
              con <span className="text-constructa-primary">precisión.</span>
            </h1>
          </div>

          <p
            className="font-sans text-sm text-white/50 leading-relaxed max-w-xs opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.28s" }}
          >
            El sistema operativo para equipos de construcción. Control total desde cualquier lugar.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-3">
          {FEATURES.map((feat, i) => (
            <div
              key={feat}
              className="flex items-center gap-3 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.38 + i * 0.1}s` }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-constructa-primary flex-shrink-0" />
              <span className="font-mono text-[12px] text-white/60">{feat}</span>
            </div>
          ))}

          <div
            className="pt-5 border-t border-white/10 flex items-center justify-between opacity-0 animate-fade-in"
            style={{ animationDelay: "0.72s" }}
          >
            <span className="font-mono text-[11px] text-white/30 uppercase tracking-widest">
              Entorno seguro
            </span>
            <span className="font-mono text-[11px] text-white/30">AES-256</span>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-constructa-bg">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <img src="/logo.png" alt="Constructa" className="w-8 h-8 rounded object-cover" />
            <span className="font-display font-bold text-constructa-text tracking-tight">CONSTRUCTA</span>
          </div>

          {/* Heading */}
          <div
            className="mb-8 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <h2 className="font-display text-2xl xl:text-3xl font-bold text-constructa-text tracking-tight mb-1.5">
              Accedé al sistema
            </h2>
            <p className="text-sm text-constructa-secondaryText">
              Ingresá tus credenciales para continuar.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-constructa-secondaryText mb-2">
                Email
              </label>
              <div className={`relative flex items-center bg-white border rounded-lg focus-within:ring-2 transition-all duration-200 ${error ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-200" : "border-constructa-border focus-within:border-constructa-primary focus-within:ring-constructa-primary/15"}`}>
                <EnvelopeIcon className="absolute left-3.5 w-4 h-4 text-constructa-border flex-shrink-0" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="manager@constructa.com"
                  className="w-full pl-10 pr-4 py-3 bg-transparent text-sm text-constructa-text placeholder-constructa-border focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-constructa-secondaryText mb-2">
                Contraseña
              </label>
              <div className={`relative flex items-center bg-white border rounded-lg focus-within:ring-2 transition-all duration-200 ${error ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-200" : "border-constructa-border focus-within:border-constructa-primary focus-within:ring-constructa-primary/15"}`}>
                <LockClosedIcon className="absolute left-3.5 w-4 h-4 text-constructa-border flex-shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-transparent text-sm text-constructa-text placeholder-constructa-border focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 text-constructa-border hover:text-constructa-secondaryText transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 10,
                padding: "12px 14px",
                animation: "shake 0.35s ease",
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#DC2626", flexShrink: 0 }}>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 13, color: "#B91C1C", fontWeight: 500 }}>
                  {error}
                </span>
              </div>
            )}

            {/* Submit */}
            <div
              className="pt-1 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-constructa-primary hover:bg-orange-600 active:scale-[0.99] text-white font-display font-bold py-3.5 rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm uppercase tracking-widest"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Ingresando...
                  </span>
                ) : (
                  <>
                    Ingresar
                    <ArrowRightIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div
            className="mt-10 pt-6 border-t border-constructa-surface flex items-center justify-between opacity-0 animate-fade-in"
            style={{ animationDelay: "0.55s" }}
          >
            <span className="font-mono text-[10px] text-constructa-border uppercase tracking-widest">
              CONSTRUCTA
            </span>
            <span className="font-mono text-[10px] text-constructa-border uppercase tracking-widest">
              Tesis 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
