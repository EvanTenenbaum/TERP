import { cn } from "@/lib/utils";

interface MonoIdProps {
  value: string;
  truncate?: number;
  className?: string;
}

export function MonoId({ value, truncate, className }: MonoIdProps) {
  const display =
    truncate && value.length > truncate
      ? value.slice(0, truncate) + "\u2026"
      : value;
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.72rem] leading-none tracking-tight text-muted-foreground",
        className
      )}
    >
      {display}
    </span>
  );
}
