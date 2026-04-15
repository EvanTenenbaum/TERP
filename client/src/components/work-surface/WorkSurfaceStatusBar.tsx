/**
 * WorkSurfaceStatusBar
 *
 * A consistent status bar for Work Surface components showing
 * contextual information and keyboard shortcuts.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface WorkSurfaceStatusBarProps {
  /** Left-aligned content (e.g., context info) */
  left?: React.ReactNode;
  /** Center-aligned content (e.g., selection info) */
  center?: React.ReactNode;
  /** Right-aligned content (e.g., keyboard hints) */
  right?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function WorkSurfaceStatusBar({
  left,
  center,
  right,
  className,
}: WorkSurfaceStatusBarProps) {
  return (
    <div
      className={cn(
        "grid gap-2 border-t border-border/70 bg-card/90 px-3 py-2 text-[11px] leading-5 text-muted-foreground shadow-[0_-1px_0_rgba(0,0,0,0.03)] md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.2fr)] md:items-center md:gap-3 md:px-4",
        className
      )}
    >
      <div className="min-w-0 truncate text-left md:text-left">{left}</div>

      <div className="min-w-0 text-left md:justify-self-center md:text-center">
        {center}
      </div>

      <div className="min-w-0 truncate text-left md:text-right">{right}</div>
    </div>
  );
}

export default WorkSurfaceStatusBar;
