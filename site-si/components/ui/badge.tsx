import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "destructive" | "accent";

const VARIANTS: Record<Variant, string> = {
  default: "bg-brand text-brand-fg",
  accent: "bg-accent text-accent-fg",
  secondary: "bg-surface-hover text-ink-muted",
  outline: "border border-line text-ink-muted",
  destructive: "bg-red-600 text-white",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
