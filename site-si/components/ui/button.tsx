import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "default" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  default:
    "bg-brand text-brand-fg hover:bg-brand-hover shadow-sm hover:shadow-brand",
  outline:
    "border border-line bg-surface text-ink hover:bg-surface-hover hover:border-brand/40",
  secondary: "bg-accent text-accent-fg hover:bg-accent-hover",
  ghost: "text-ink-muted hover:bg-surface-hover hover:text-ink",
  destructive:
    "bg-red-600 text-white hover:bg-red-700",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  default: "h-9 px-4 text-sm",
  lg: "h-10 px-6 text-sm",
  icon: "h-9 w-9",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Renderiza como <a>/<Link> em vez de <button>. */
  href?: string;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  href,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-all duration-300",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:h-4 [&_svg]:w-4",
    VARIANTS[variant],
    SIZES[size],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {props.children}
      </Link>
    );
  }

  return <button className={classes} {...props} />;
}
