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
