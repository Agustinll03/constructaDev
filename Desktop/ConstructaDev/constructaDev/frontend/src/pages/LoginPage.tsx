import { useEffect, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { login } from "../api/auth";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const brandRef = useRef<HTMLElement>(null);
  const formRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(brandRef.current,
        { opacity: 0, x: -18 },
        { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }
      );
      gsap.fromTo(
        formRef.current?.querySelectorAll(".lp-item") ?? [],
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.09, ease: "power2.out", delay: 0.15 }
      );
    });
    return () => ctx.revert();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      localStorage.setItem("access_token", token);
      onLogin();
    } catch {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lp-root">

      {/* ── Panel izquierdo — marca ── */}
      <aside ref={brandRef} className="lp-brand">

        {/* Grid arquitectónico de fondo */}
        <div className="lp-grid" aria-hidden="true" />

        {/* Línea de acento vertical derecha */}
        <div className="lp-accent-line" aria-hidden="true" />

        {/* Logo */}
        <header className="lp-brand-header">
          <div className="lp-logomark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-7 9 7" />
              <path d="M5 10v10h14V10" />
              <path d="M10 20v-6h4v6" />
            </svg>
          </div>
          <span className="lp-wordmark">CONSTRUCTA</span>
        </header>

        {/* Cuerpo editorial */}
        <div className="lp-brand-body">
          <p className="lp-eyebrow">
            <span className="lp-eyebrow-line" />
            Plataforma de gestión de obras
          </p>

          <h1 className="lp-headline">
            Gestión precisa<br />
            para proyectos<br />
            <span className="lp-headline-accent">que no esperan.</span>
          </h1>

          <p className="lp-lede">
            Obras, tareas y responsables centralizados
            en una plataforma diseñada para el sector.
          </p>
        </div>

        {/* SVG arquitectónico minimalista */}
        <div className="lp-arch-drawing" aria-hidden="true">
          <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Línea de suelo */}
            <line x1="0"   y1="148" x2="280" y2="148" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            {/* Edificio alto */}
            <rect x="24"  y="48"  width="72" height="100" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            {/* Grilla de ventanas edificio 1 */}
            <line x1="24"  y1="72"  x2="96"  y2="72"  stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <line x1="24"  y1="96"  x2="96"  y2="96"  stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <line x1="24"  y1="120" x2="96"  y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <line x1="48"  y1="48"  x2="48"  y2="148" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <line x1="72"  y1="48"  x2="72"  y2="148" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            {/* Edificio mediano */}
            <rect x="116" y="84"  width="56" height="64" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            <line x1="116" y1="108" x2="172" y2="108" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <line x1="116" y1="128" x2="172" y2="128" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <line x1="144" y1="84"  x2="144" y2="148" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            {/* Edificio bajo */}
            <rect x="196" y="108" width="64" height="40" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            <line x1="228" y1="108" x2="228" y2="148" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            {/* Marca de cota izquierda */}
            <line x1="12" y1="48"  x2="18" y2="48"  stroke="rgba(255,107,53,0.35)" strokeWidth="1"/>
            <line x1="12" y1="148" x2="18" y2="148" stroke="rgba(255,107,53,0.35)" strokeWidth="1"/>
            <line x1="15" y1="48"  x2="15" y2="148" stroke="rgba(255,107,53,0.2)"  strokeWidth="1"/>
          </svg>
        </div>

        {/* Footer */}
        <footer className="lp-brand-footer">
          <span>© 2026 Constructa S.A.</span>
          <div className="lp-status">
            <span className="lp-status-dot" />
            <span>Sistema operativo</span>
          </div>
        </footer>
      </aside>

      {/* ── Panel derecho — formulario ── */}
      <main className="lp-form-panel">

        {/* Guías de columna */}
        <div className="lp-col-guides" aria-hidden="true" />

        {/* Logo solo en mobile */}
        <div className="lp-mobile-brand">
          <div className="lp-logomark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.3"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-7 9 7" />
              <path d="M5 10v10h14V10" />
              <path d="M10 20v-6h4v6" />
            </svg>
          </div>
          <span className="lp-wordmark" style={{ color: "#263238" }}>CONSTRUCTA</span>
        </div>

        {/* Form */}
        <div ref={formRef} className="lp-form-wrap">

          <div className="lp-item lp-form-head">
            <h2 className="lp-form-title">Iniciá sesión</h2>
            <p className="lp-form-sub">Accedé a tu panel de gestión de obras.</p>
          </div>

          <form onSubmit={handleSubmit} className="lp-fields">

            <div className="lp-item lp-field">
              <label htmlFor="lp-email" className="lp-label">
                Correo electrónico
              </label>
              <input
                id="lp-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="lp-input"
              />
            </div>

            <div className="lp-item lp-field">
              <label htmlFor="lp-password" className="lp-label">
                Contraseña
              </label>
              <div className="lp-input-wrap">
                <input
                  id="lp-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="lp-input lp-input-padded"
                />
                <button
                  type="button"
                  className="lp-reveal"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            {error && (
              <div className="lp-item lp-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="lp-item">
              <button type="submit" disabled={loading} className="lp-btn">
                {loading ? (
                  <>
                    <span className="lp-spinner" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        <p className="lp-form-footer">CONSTRUCTA · 2026</p>
      </main>

    </div>
  );
}
