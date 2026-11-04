import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink",
        "transition-[color,box-shadow] outline-none",
        "focus:border-brand focus:ring-2 focus:ring-brand/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
