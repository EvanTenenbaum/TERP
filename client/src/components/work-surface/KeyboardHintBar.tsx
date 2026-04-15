import React from "react";
import { cn } from "@/lib/utils";

export interface KeyboardHint {
  key: string;
  label: string;
}

interface KeyboardHintBarProps {
  hints: KeyboardHint[];
  className?: string;
}

export function KeyboardHintBar({ hints, className }: KeyboardHintBarProps) {
  if (hints.length === 0) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Keyboard shortcuts"
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground shadow-sm",
        className
      )}
    >
      {hints.map((hint, index) => (
        <React.Fragment key={`${hint.key}-${hint.label}`}>
          {index > 0 && (
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5">
            <kbd className="inline-flex items-center rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              {hint.key}
            </kbd>
            <span>{hint.label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

export default KeyboardHintBar;
