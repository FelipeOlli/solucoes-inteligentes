import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
};

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink",
        "transition-[color,box-shadow] outline-none",
        "focus:border-brand focus:ring-2 focus:ring-brand/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "placeholder:text-ink-muted",
        className
      )}
      {...props}
    />
  );
}
