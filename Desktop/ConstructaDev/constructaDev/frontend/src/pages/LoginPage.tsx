import { useState, type FormEvent } from "react";
import { login } from "../api/auth";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      localStorage.setItem("access_token", token);
      onLogin();
    } catch {
      setError("Credenciales inválidas. Verificá tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-constructa-bg">
      {/* Left panel — industrial dark */}
      <div className="hidden lg:flex w-96 bg-constructa-dark flex-col justify-between p-10 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded bg-constructa-primary flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">CONSTRUCTA</span>
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Gestión de obras<br />
            <span className="text-constructa-primary">inteligente</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Control en tiempo real de tareas, responsables y alertas en tus proyectos de construcción.
          </p>
        </div>

        <div className="space-y-3">
          {["Tareas en tiempo real", "Alertas automáticas", "Trazabilidad completa"].map(
            (feature) => (
              <div key={feature} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-constructa-primary flex-shrink-0" />
                <span className="text-white/60 text-sm">{feature}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded bg-constructa-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 4l9 5.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
              </svg>
            </div>
            <span className="font-bold text-constructa-text tracking-tight">CONSTRUCTA</span>
          </div>

          <h1 className="text-2xl font-bold text-constructa-text mb-1">Iniciar sesión</h1>
          <p className="text-sm text-constructa-secondaryText mb-8">
            Accedé a tu panel de control.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-constructa-secondaryText mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-constructa-border bg-white rounded px-3 py-2.5 text-sm text-constructa-text placeholder-constructa-border focus:outline-none focus:ring-2 focus:ring-constructa-primary focus:border-transparent transition"
                placeholder="manager@constructa.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-constructa-secondaryText mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-constructa-border bg-white rounded px-3 py-2.5 text-sm text-constructa-text placeholder-constructa-border focus:outline-none focus:ring-2 focus:ring-constructa-primary focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-constructa-danger bg-red-50 border border-constructa-danger/30 rounded px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-constructa-primary hover:bg-orange-600 text-white font-bold py-3 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="text-center text-xs text-constructa-border mt-8">
            CONSTRUCTA — Proyecto de tesis 2026
          </p>
        </div>
      </div>
    </div>
  );
}
