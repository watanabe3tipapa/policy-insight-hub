import type { ReactNode } from "react";
import { Braces, ChevronRight } from "lucide-react";

export function PageFrame({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="blueprint-page">
      <header className="page-header blueprint-panel">
        <div className="absolute left-0 top-0 h-14 w-14 border-b border-r border-white/25" />
        <div className="absolute right-6 top-6 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/70 md:flex">
          <Braces className="h-3 w-3" /> NODE / POLICY-OPS
        </div>
        <div className="relative max-w-3xl px-6 py-7 md:px-9 md:py-9">
          <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.19em] text-cyan-200/80">
            <span className="h-px w-7 bg-cyan-200/70" />
            {eyebrow}
            <ChevronRight className="h-3 w-3" />
            v1.0
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-white md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/75">{description}</p>
        </div>
        {actions ? <div className="relative z-10 flex flex-wrap items-center gap-2 px-6 pb-7 md:absolute md:bottom-0 md:right-0 md:px-9 md:py-8">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
