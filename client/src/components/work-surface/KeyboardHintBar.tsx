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
    <span className={cn("inline-flex items-center gap-1", className)}>
      {hints.map((hint, index) => (
        <React.Fragment key={`${hint.key}-${hint.label}`}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border bg-background px-1 py-0.5 font-mono text-[10px] font-medium text-foreground">
              {hint.key}
            </kbd>
            <span>{hint.label}</span>
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

export default KeyboardHintBar;
