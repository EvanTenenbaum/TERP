/**
 * WorkspaceFilterBar — UX v2 standardized filter surface slot (TER-1310)
 *
 * A thin, styled container that is designed to be rendered in the
 * `filterStrip` slot of `LinearWorkspaceShell`. It provides the consistent
 * padding, border, and background that every workspace-level filter surface
 * should share, so individual surfaces no longer declare their own ad-hoc
 * filter bars.
 *
 * Callers supply the actual filter inputs (chips, search fields, dropdowns,
 * etc.) as children. Actual filter state should be driven through
 * `useWorkspaceFilter()` so that filters deep-link via URL search params.
 *
 * See: docs/ux-review/02-Implementation_Strategy.md §4.3
 * Linear: TER-1310 (epic TER-1283)
 *
 * @example
 * ```tsx
 * import { WorkspaceFilterBar } from "@/components/layout/WorkspaceFilterBar";
 * import { useWorkspaceFilter } from "@/hooks/useWorkspaceFilter";
 *
 * function OrdersShell() {
 *   const { filter, setFilter } = useWorkspaceFilter();
 *   return (
 *     <LinearWorkspaceShell
 *       title="Orders"
 *       activeTab={tab}
 *       tabs={tabs}
 *       onTabChange={setTab}
 *       filterStrip={
 *         <WorkspaceFilterBar>
 *           <StatusChips
 *             value={filter.status ?? "all"}
 *             onChange={next => setFilter({ status: next })}
 *           />
 *         </WorkspaceFilterBar>
 *       }
 *     >
 *       {…}
 *     </LinearWorkspaceShell>
 *   );
 * }
 * ```
 */

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WorkspaceFilterBarProps {
  /**
   * Filter inputs to render inside the bar — chips, search fields, dropdowns,
   * date range pickers, etc. The bar itself is unopinionated about the
   * controls; it only provides the shared chrome.
   */
  children?: ReactNode;
  /**
   * Optional extra class names to merge with the default chrome. Prefer
   * leaving this unset — the point of the primitive is shared styling.
   */
  className?: string;
  /**
   * Optional ARIA label. Defaults to "Filters" so assistive tech can
   * distinguish the filter strip from the tab row above it.
   */
  "aria-label"?: string;
}

export function WorkspaceFilterBar({
  children,
  className,
  "aria-label": ariaLabel = "Filters",
}: WorkspaceFilterBarProps) {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      data-slot="workspace-filter-bar"
      className={cn("linear-workspace-filter-strip", className)}
    >
      {children}
    </div>
  );
}

export default WorkspaceFilterBar;
