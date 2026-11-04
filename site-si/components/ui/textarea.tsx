import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink",
        "transition-[color,box-shadow] outline-none resize-y",
        "focus:border-brand focus:ring-2 focus:ring-brand/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "placeholder:text-ink-muted",
        className
      )}
      {...props}
    />
  );
}
