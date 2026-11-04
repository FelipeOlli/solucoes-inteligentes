"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = false,
  delay = 0,
  className,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Primeiro card da faixa recebe destaque de marca (padrão do design system). */
  accent?: boolean;
  delay?: number;
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "group cursor-default rounded-card border p-4 transition-all duration-500 ease-out animate-slide-in-up",
        accent
          ? "border-transparent bg-brand text-brand-fg shadow-brand"
          : "border-line bg-surface text-ink shadow-card hover:shadow-card-hover",
        className
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className={cn("text-xs font-medium", accent ? "opacity-90" : "text-ink-muted")}>
          {title}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform duration-300",
              accent ? "bg-brand-fg/20" : "bg-brand",
              hovered && "rotate-45"
            )}
          >
            <Icon className={cn("h-3 w-3", accent ? "text-brand-fg" : "text-brand-fg")} />
          </span>
        )}
      </div>
      <p className="font-heading text-2xl font-bold leading-tight">{value}</p>
      {hint && (
        <p className={cn("mt-1 text-xs", accent ? "opacity-80" : "text-ink-muted")}>{hint}</p>
      )}
    </div>
  );
}

/** Indicador de tendência usado junto ao StatCard. */
export function StatTrend({
  icon: Icon = ArrowUpRight,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}
