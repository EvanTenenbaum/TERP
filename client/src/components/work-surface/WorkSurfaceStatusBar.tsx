/**
 * WorkSurfaceStatusBar
 *
 * A consistent status bar for Work Surface components showing
 * contextual information and keyboard shortcuts.
 */

import React from 'react';
import { cn } from '@/lib/utils';

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
        'flex items-center justify-between px-4 py-2 bg-muted/50 border-t text-xs text-muted-foreground',
        className
      )}
    >
      {/* Left Section */}
      <div className="flex-1 text-left truncate">
        {left}
      </div>

      {/* Center Section */}
      <div className="flex-1 text-center">
        {center}
      </div>

      {/* Right Section */}
      <div className="flex-1 text-right truncate">
        {right}
      </div>
    </div>
  );
}

export default WorkSurfaceStatusBar;
