/**
 * PageHeader Component
 * TER-669: Standardized page header with consistent breadcrumb + title + context pattern.
 *
 * Provides a uniform header for all module pages, replacing ad-hoc h1/h2 patterns
 * scattered across individual pages. Integrates with AppBreadcrumb for navigation context.
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Purchase Orders"
 *   description="Manage supplier purchase orders and intake"
 *   actions={<Button>New PO</Button>}
 * />
 * ```
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * TER-1295: Recursively count children in the `actions` slot that look like
 * primary buttons (i.e. our `<Button>` component rendered with the default
 * variant — explicit `variant="default"` or no variant at all).
 *
 * Handles React fragments transparently so typical JSX like
 * `actions={<>...<Button ... /></>}` is inspected correctly.
 *
 * We intentionally restrict detection to the project's `<Button>` component to
 * avoid false positives from dropdown triggers, native `<button>` elements, or
 * unrelated wrappers that happen to accept a `variant` prop.
 */
function countPrimaryActions(node: React.ReactNode): number {
  let count = 0;
  React.Children.forEach(node, child => {
    if (!React.isValidElement(child)) return;

    // Descend into fragments so `<>…</>` groupings are flattened.
    if (child.type === React.Fragment) {
      const fragmentProps = child.props as { children?: React.ReactNode };
      count += countPrimaryActions(fragmentProps.children);
      return;
    }

    if (child.type === Button) {
      const buttonProps = child.props as { variant?: string };
      // Default variant: either explicitly "default" or not specified.
      if (
        buttonProps.variant === undefined ||
        buttonProps.variant === "default"
      ) {
        count++;
      }
    }
  });
  return count;
}

interface PageHeaderProps {
  /** Primary page title — rendered as an h1 */
  title: string;
  /** Optional subtitle or contextual description */
  description?: string;
  /** Optional badge or status indicator displayed next to the title */
  badge?: React.ReactNode;
  /** Action buttons or controls aligned to the right of the header */
  actions?: React.ReactNode;
  /** Additional className applied to the root element */
  className?: string;
  /** Whether to add a bottom border (default: true) */
  divider?: boolean;
}

/**
 * PageHeader — standardized module page header.
 *
 * Layout:
 * - Left: title + optional description
 * - Right: optional action controls
 *
 * The breadcrumb lives in the AppHeader so it is not duplicated here.
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
  divider = false,
}: PageHeaderProps) {
  // TER-1295: Development-only advisory invariant — warn (never throw) when a
  // PageHeader renders more than one primary (variant="default") button in its
  // `actions` slot. The check is stripped from production builds by the
  // `process.env.NODE_ENV === "development"` guard, which Vite replaces at
  // build time.
  if (process.env.NODE_ENV === "development" && actions) {
    const primaryCount = countPrimaryActions(actions);
    if (primaryCount > 1) {
      console.error(
        `PageHeader: multiple primary actions detected on "${title}" ` +
          `(${primaryCount} found). Only one button may have variant='default'. ` +
          `Move extras to variant='outline', variant='ghost', or inside a <DropdownMenu>.`
      );
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        divider && "border-b border-border/60 mb-4",
        className
      )}
    >
      {/* Title row */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold leading-tight text-foreground truncate sm:text-2xl">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
