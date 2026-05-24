// Funciones de formato reutilizadas en varios componentes.

const AVATAR_COLORS = ["#E76A2D", "#3A6BD9", "#1F9A5A", "#9A4DC9", "#D03A3A", "#E89B14", "#0EA5A0"];

// Extrae hasta 2 iniciales de un nombre completo. Ej: "Juan Pérez" → "JP".
export function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
}

// Asigna un color de avatar consistente a partir del nombre (hash polynomial).
export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = ((h * 31) + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Convierte "YYYY-MM-DD" a "DD/MM/YYYY". Devuelve "—" si el valor es nulo.
export function fmtDateShort(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// Convierte una fecha ISO a tiempo relativo en español.
// Ej: "hace 5 min", "ayer", "hace 3 días".
export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return "hace unos segundos";
  if (diff < 3600)   return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return "ayer";
  return `hace ${Math.floor(diff / 86400)} días`;
}
