import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number;
  accent?: "default" | "primary" | "info" | "danger" | "success" | "warning";
  icon?: ReactNode;
  helperText?: string;
  accentLine?: boolean;
}

const accentConfig = {
  default: {
    value:     "text-constructa-text",
    iconBg:    "bg-blue-50",
    iconColor: "text-constructa-info",
    line:      "border-l-constructa-info",
  },
  primary: {
    value:     "text-constructa-primary",
    iconBg:    "bg-orange-50",
    iconColor: "text-constructa-primary",
    line:      "border-l-constructa-primary",
  },
  info: {
    value:     "text-constructa-info",
    iconBg:    "bg-blue-50",
    iconColor: "text-constructa-info",
    line:      "border-l-constructa-info",
  },
  danger: {
    value:     "text-constructa-danger",
    iconBg:    "bg-red-50",
    iconColor: "text-constructa-danger",
    line:      "border-l-constructa-danger",
  },
  success: {
    value:     "text-constructa-success",
    iconBg:    "bg-green-50",
    iconColor: "text-constructa-success",
    line:      "border-l-constructa-success",
  },
  warning: {
    value:     "text-constructa-warning",
    iconBg:    "bg-amber-50",
    iconColor: "text-constructa-warning",
    line:      "border-l-constructa-warning",
  },
};

export function StatCard({ label, value, accent = "default", icon, helperText, accentLine = false }: StatCardProps) {
  const cfg = accentConfig[accent];
  return (
    <div
      className={[
        "bg-white border border-constructa-border rounded-2xl shadow-card p-5 flex items-center gap-5",
        accentLine ? `border-l-4 ${cfg.line}` : "",
      ].filter(Boolean).join(" ")}
    >
      {icon && (
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
          <div className={cfg.iconColor}>{icon}</div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-constructa-secondaryText">
          {label}
        </p>
        <p className={`mt-1 text-3xl font-bold ${cfg.value}`}>{value}</p>
        {helperText && (
          <p className="text-[11px] text-constructa-border mt-0.5">{helperText}</p>
        )}
      </div>
    </div>
  );
}
