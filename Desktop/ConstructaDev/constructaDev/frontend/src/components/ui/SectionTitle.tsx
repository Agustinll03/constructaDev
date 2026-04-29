import type { ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
  aside?: ReactNode;
}

export function SectionTitle({ children, aside }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {/* Left orange accent bar */}
        <span className="block w-1 h-5 rounded-full bg-constructa-primary flex-shrink-0" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-constructa-text">
          {children}
        </h2>
      </div>
      {aside && <div>{aside}</div>}
    </div>
  );
}
