"use client";

import { cn } from "@/lib/utils";

type Variant = "underline" | "segmented";

export function Tabs({
  value,
  onChange,
  items,
  variant = "underline",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
  variant?: Variant;
  className?: string;
}) {
  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "inline-flex overflow-hidden rounded-control border border-line bg-surface",
          className
        )}
      >
        {items.map((item, i) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                i > 0 && "border-l border-line",
                active
                  ? "bg-brand text-brand-fg"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-1 border-b border-line", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
              active
                ? "border-brand font-medium text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
