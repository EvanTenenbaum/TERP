import React from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface BreadcrumbItem {
  path: string;
  label: string;
}

interface BreadcrumbProps {
  className?: string;
  /** Maximum visible segments before collapsing (default: 4) */
  maxVisibleSegments?: number;
}

// ============================================================================
// ROUTE TO LABEL CONFIGURATION
// ============================================================================

/**
 * Map of route paths to human-readable labels.
 * Supports dynamic segments with :param notation.
 */
const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/accounting": "Accounting",
  "/accounting/invoices": "Invoices",
  "/accounting/bills": "Bills",
  "/accounting/payments": "Payments",
  "/accounting/expenses": "Expenses",
  "/accounting/chart-of-accounts": "Chart of Accounts",
  "/accounting/journal-entries": "Journal Entries",
  "/accounting/reports": "Reports",
  "/clients": "Clients",
  "/pricing": "Pricing",
  "/pricing/rules": "Pricing Rules",
  "/pricing/profiles": "Pricing Profiles",
  "/sales-sheets": "Sales Sheets",
  "/orders": "Orders",
  "/orders/create": "Create Order",
  "/quotes": "Quotes",
  "/settings": "Settings",
  "/settings/cogs": "COGS Settings",
  "/credit-settings": "Credit Settings",
  "/needs": "Needs Management",
  "/vendor-supply": "Vendor Supply",
  "/vendors": "Vendors",
  "/purchase-orders": "Purchase Orders",
  "/returns": "Returns",
  "/locations": "Locations",
  "/matchmaking": "Matchmaking",
  "/help": "Help",
  "/todo": "Todo Lists",
  "/todos": "Todo Lists",
  "/inbox": "Inbox",
  "/calendar": "Calendar",
  "/workflow-queue": "Workflow Queue",
  "/analytics": "Analytics",
  "/search": "Search Results",
  "/login": "Login",
  "/vip-portal": "VIP Portal",
  "/vip-portal/login": "VIP Login",
  "/vip-portal/dashboard": "VIP Dashboard",
};

/**
 * Patterns for dynamic route segments.
 * Maps parent paths to label generators for dynamic children.
 */
const dynamicRoutePatterns: Record<string, string> = {
  "/inventory/:id": "Batch Details",
  "/clients/:id": "Client Details",
  "/vendors/:id": "Vendor Details",
  "/todos/:listId": "List Details",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the label for a given path.
 * Handles both static routes and dynamic route segments.
 */
function getLabelForPath(path: string, segment: string): string {
  // First check for exact match in static routes
  if (routeLabels[path]) {
    return routeLabels[path];
  }

  // Check for dynamic route patterns
  for (const [pattern, label] of Object.entries(dynamicRoutePatterns)) {
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length === pathParts.length) {
      let matches = true;
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(":")) {
          // Dynamic segment - skip matching
          continue;
        }
        if (patternParts[i] !== pathParts[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return label;
      }
    }
  }

  // Fallback: capitalize the segment
  return segment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Parse the current path into breadcrumb items.
 */
function parsePath(pathname: string): BreadcrumbItem[] {
  if (pathname === "/" || pathname === "/dashboard") {
    return [];
  }

  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    items.push({
      path: currentPath,
      label: getLabelForPath(currentPath, segment),
    });
  }

  return items;
}

/**
 * Collapse breadcrumb items if there are more than maxVisible.
 * Shows first item, ellipsis, and last (maxVisible - 2) items.
 */
function collapseBreadcrumbs(
  items: BreadcrumbItem[],
  maxVisible: number
): { items: BreadcrumbItem[]; hasCollapsed: boolean; collapsedItems: BreadcrumbItem[] } {
  if (items.length <= maxVisible) {
    return { items, hasCollapsed: false, collapsedItems: [] };
  }

  const firstItem = items[0];
  const lastItems = items.slice(-(maxVisible - 1));
  const collapsedItems = items.slice(1, -(maxVisible - 1));

  return {
    items: [firstItem, ...lastItems],
    hasCollapsed: true,
    collapsedItems,
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Single breadcrumb item component.
 */
function BreadcrumbItemComponent({
  item,
  isLast,
}: {
  item: BreadcrumbItem;
  isLast: boolean;
}): React.ReactElement {
  return (
    <li className="flex items-center">
      {isLast ? (
        <span className="text-sm font-medium text-foreground" aria-current="page">
          {item.label}
        </span>
      ) : (
        <>
          <Link
            href={item.path}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {item.label}
          </Link>
          <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
        </>
      )}
    </li>
  );
}

/**
 * Collapsed items indicator with dropdown.
 */
function CollapsedIndicator({
  collapsedItems,
}: {
  collapsedItems: BreadcrumbItem[];
}): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <li className="flex items-center relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
        aria-label={`Show ${collapsedItems.length} hidden breadcrumbs`}
        title={collapsedItems.map(item => item.label).join(" / ")}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-lg py-1 z-50 min-w-[150px]"
          onMouseLeave={() => setIsOpen(false)}
        >
          {collapsedItems.map((item, index) => (
            <Link
              key={item.path}
              href={item.path}
              className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Breadcrumb navigation component.
 *
 * Features:
 * - Automatic route-to-label mapping
 * - Click navigation to any level
 * - Path collapsing for deep routes (> maxVisibleSegments)
 * - Responsive design with mobile-friendly sizing
 *
 * @example
 * ```tsx
 * <Breadcrumb />
 * <Breadcrumb maxVisibleSegments={3} />
 * ```
 */
export function Breadcrumb({
  className,
  maxVisibleSegments = 4,
}: BreadcrumbProps): React.ReactElement | null {
  const [location] = useLocation();

  const rawItems = parsePath(location);

  // Don't render breadcrumb for root routes
  if (rawItems.length === 0) {
    return null;
  }

  const { items, hasCollapsed, collapsedItems } = collapseBreadcrumbs(
    rawItems,
    maxVisibleSegments
  );

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex items-center flex-wrap gap-y-1">
        {/* Home link */}
        <li className="flex items-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
          <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
        </li>

        {/* Collapsed indicator */}
        {hasCollapsed && <CollapsedIndicator collapsedItems={collapsedItems} />}

        {/* Visible items */}
        {items.map((item, index) => (
          <BreadcrumbItemComponent
            key={item.path}
            item={item}
            isLast={index === items.length - 1}
          />
        ))}
      </ol>
    </nav>
  );
}

// Export types for testing
export type { BreadcrumbItem, BreadcrumbProps };
export { parsePath, getLabelForPath, collapseBreadcrumbs, routeLabels };
