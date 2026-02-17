/**
 * Kbd — Keyboard shortcut badge component
 * Part of TERP UI Evolution Wave 3
 *
 * Renders individual key badges in the brushed gunmetal style.
 * Uses IBM Plex Mono for the key labels.
 *
 * Usage:
 * ```tsx
 * <Kbd keys={["⌘", "K"]} />        // Renders: [⌘] [K]
 * <Kbd keys={["↵"]} />              // Renders: [↵]
 * <Kbd keys={["Esc"]} size="sm" />  // Renders smaller: [Esc]
 * ```
 */
import React from "react";
import { cn } from "@/lib/utils";

interface KbdProps {
  keys: string[];
  size?: "sm" | "md";
  className?: string;
}

export function Kbd({ keys, size = "md", className }: KbdProps) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className={cn(
            "inline-flex items-center justify-center font-mono font-medium",
            "border border-border/60 rounded-[3px]",
            "bg-muted/40 text-muted-foreground",
            "select-none pointer-events-none",
            size === "sm"
              ? "min-w-[16px] h-[16px] px-1 text-[10px]"
              : "min-w-[20px] h-[20px] px-1.5 text-[11px]"
          )}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
