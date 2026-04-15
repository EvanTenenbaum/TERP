import { cn } from "@/lib/utils";

interface MonoIdProps {
  value: string;
  truncate?: number;
  className?: string;
}

export function MonoId({ value, truncate, className }: MonoIdProps) {
  const display =
    truncate && value.length > truncate
      ? value.slice(0, truncate) + "…"
      : value;
  return (
    <span
      className={cn(
        "font-mono text-[0.72rem] bg-muted/60 text-muted-foreground",
        "px-1.5 py-0.5 rounded border border-border/50 tracking-tight",
        "whitespace-nowrap inline-block leading-none",
        className
      )}
    >
      {display}
    </span>
  );
}
