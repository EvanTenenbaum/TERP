/**
 * KeyboardHintBadge — Conditional keyboard shortcut overlay
 * Part of TERP UI Evolution Wave 3
 *
 * Wraps an action button and conditionally renders a <Kbd> badge
 * when keyboard hints are enabled. The badge appears as a small
 * overlay in the top-right corner of the wrapped element.
 *
 * Usage:
 * ```tsx
 * <KeyboardHintBadge keys={["C"]}>
 *   <Button onClick={handleCreate}>Create Order</Button>
 * </KeyboardHintBadge>
 *
 * <KeyboardHintBadge keys={["⌘", "↵"]}>
 *   <Button onClick={handleSubmit}>Submit</Button>
 * </KeyboardHintBadge>
 * ```
 */
import React from "react";
import { Kbd } from "@/components/ui/kbd";
import { useKeyboardHints } from "@/hooks/useKeyboardHints";

interface KeyboardHintBadgeProps {
  keys: string[];
  children: React.ReactNode;
  /** Position of the badge relative to the child */
  position?: "top-right" | "right" | "bottom";
}

export function KeyboardHintBadge({
  keys,
  children,
  position = "right",
}: KeyboardHintBadgeProps) {
  const { showHints } = useKeyboardHints();

  if (!showHints) {
    return <>{children}</>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <Kbd keys={keys} size="sm" />
    </span>
  );
}
