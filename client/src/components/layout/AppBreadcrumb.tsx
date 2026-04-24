/**
 * App Breadcrumb Component
 * UX-009: Automatic breadcrumb navigation based on current route.
 * TER-1297: Registry-driven breadcrumbs with async entity name resolution.
 *
 * - When the `ux.v2.breadcrumb-registry` feature flag is enabled, segment
 *   titles come from the shared `@/config/routes` registry, and dynamic
 *   detail segments (e.g. `/clients/:id`) resolve to a human-friendly name
 *   via tRPC. Failed/unknown resolutions fall back to `#<rawId>`.
 * - When the flag is disabled, the component preserves the legacy
 *   `navigationItems` + `customRouteNames` lookup behaviour.
 */

import React from "react";
import { useLocation, useSearch } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { navigationItems } from "@/config/navigation";
import {
  buildBreadcrumbTrail,
  type BreadcrumbTrailEntry,
  type RouteEntityType,
} from "@/config/routes";
import {
  useBreadcrumbResolvedNamesMap,
  type BreadcrumbResolvedNames,
} from "@/contexts/BreadcrumbContext";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FEATURE_FLAGS } from "@/lib/constants/featureFlags";
import { trpc } from "@/lib/trpc";

interface BreadcrumbSegment {
  name: string;
  path: string;
  isLast: boolean;
}

/**
 * Custom route name mappings for paths not in navigation config
 * or for dynamic route segments. Preserved for the legacy (flag-off) path.
 */
const customRouteNames: Record<string, string> = {
  create: "Create",
  edit: "Edit",
  new: "New",
  dashboard: "Dashboard",
  intake: "Direct Intake",
  receiving: "Product Intake",
  "direct-intake": "Direct Intake",
  "pick-pack": "Shipping",
  rules: "Rules",
  profiles: "Profiles",
};

/**
 * Get display name for a route segment (legacy path only).
 */
function getLegacySegmentName(segment: string, fullPath: string): string {
  // Check if full path matches a navigation item
  const navItem = navigationItems.find(item => item.path === fullPath);
  if (navItem) {
    return navItem.name;
  }

  // Check custom route names
  if (customRouteNames[segment]) {
    return customRouteNames[segment];
  }

  // Check if it's a numeric ID (for detail pages)
  if (/^\d+$/.test(segment)) {
    return `#${segment}`;
  }

  // Convert kebab-case or snake_case to Title Case
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Legacy (flag-off) breadcrumb builder, preserved 1:1 from the pre-TER-1297
 * implementation so we can safely roll the flag back.
 */
function buildLegacyBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  if (pathname === "/") {
    return [];
  }

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbSegment[] = [];

  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    breadcrumbs.push({
      name: getLegacySegmentName(segment, currentPath),
      path: currentPath,
      isLast,
    });
  });

  return breadcrumbs;
}

/**
 * Attempt to resolve a single entity id to a human-friendly display name.
 *
 * Important: all of the tRPC `useQuery` hooks below are mounted on every
 * render to keep hook order stable, but only the one matching `entityType`
 * has `enabled: true`. The rest are inert. This keeps the breadcrumb free
 * from network chatter when there is no entity segment in the current path.
 */
function useResolvedEntityLabel(
  entityType: RouteEntityType | undefined,
  rawEntityId: string | undefined
): string | null {
  const numericId =
    rawEntityId !== undefined ? Number.parseInt(rawEntityId, 10) : Number.NaN;
  const hasValidId = Number.isFinite(numericId) && numericId > 0;
  const queryId = hasValidId ? numericId : 0;

  const clientQuery = trpc.clients.getById.useQuery(
    { clientId: queryId },
    {
      enabled:
        hasValidId && (entityType === "client" || entityType === "supplier"),
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );
  const orderQuery = trpc.orders.getById.useQuery(
    { id: queryId },
    {
      enabled: hasValidId && entityType === "order",
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );
  const invoiceQuery = trpc.accounting.invoices.getById.useQuery(
    { id: queryId },
    {
      enabled: hasValidId && entityType === "invoice",
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );
  const billQuery = trpc.accounting.bills.getById.useQuery(
    { id: queryId },
    {
      enabled: hasValidId && entityType === "bill",
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );
  const productQuery = trpc.productCatalogue.getById.useQuery(
    { id: queryId },
    {
      enabled: hasValidId && entityType === "product",
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );

  if (!entityType || !hasValidId) return null;

  switch (entityType) {
    case "client":
    case "supplier": {
      const name = clientQuery.data?.name;
      return typeof name === "string" && name.length > 0 ? name : null;
    }
    case "order": {
      const orderNumber = orderQuery.data?.orderNumber;
      return typeof orderNumber === "string" && orderNumber.length > 0
        ? orderNumber
        : null;
    }
    case "invoice": {
      const invoiceData = invoiceQuery.data as
        | { invoiceNumber?: string | null }
        | null
        | undefined;
      const invoiceNumber = invoiceData?.invoiceNumber;
      return typeof invoiceNumber === "string" && invoiceNumber.length > 0
        ? invoiceNumber
        : null;
    }
    case "bill": {
      const billData = billQuery.data as
        | { billNumber?: string | null }
        | null
        | undefined;
      const billNumber = billData?.billNumber;
      return typeof billNumber === "string" && billNumber.length > 0
        ? billNumber
        : null;
    }
    case "product": {
      const productData = productQuery.data as
        | { nameCanonical?: string | null }
        | null
        | undefined;
      const productName = productData?.nameCanonical;
      return typeof productName === "string" && productName.length > 0
        ? productName
        : null;
    }
    default:
      return null;
  }
}

/**
 * Look up an entry in the merged `resolvedNames` map (TER-1362). Accepts
 * several candidate keys because page-level code tends to index by the
 * entity id (`"105"`), but workspace-tab crumbs (`/sales?tab=create-order`)
 * are only identifiable by the tab value. Returns the first non-empty match.
 */
function lookupResolvedName(
  resolvedNames: BreadcrumbResolvedNames,
  crumb: BreadcrumbTrailEntry
): string | null {
  const candidates: string[] = [];
  if (crumb.entityId) candidates.push(crumb.entityId);

  // Last path segment (e.g. `"create-order"` for `/sales?tab=create-order`).
  const lastSegment = crumb.path
    .split(/[?#]/, 1)[0]
    ?.split("/")
    .filter(Boolean)
    .pop();
  if (lastSegment) candidates.push(lastSegment);

  for (const key of candidates) {
    const value = resolvedNames[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

/**
 * Map a registry-derived trail to the flat `BreadcrumbSegment[]` used by the
 * renderer.
 *
 * Precedence for each crumb's display name (highest first):
 *  1. Caller-supplied `resolvedNames` (prop + context, TER-1362).
 *  2. Async tRPC entity resolution (for the shallowest entity-bearing crumb).
 *  3. Literal registry title + `#<id>` fallback so users still see the id.
 */
function trailToSegments(
  trail: readonly BreadcrumbTrailEntry[],
  resolvedFor: BreadcrumbTrailEntry | undefined,
  resolvedLabel: string | null,
  resolvedNames: BreadcrumbResolvedNames
): BreadcrumbSegment[] {
  return trail.map(crumb => {
    const callerResolved = lookupResolvedName(resolvedNames, crumb);
    if (callerResolved) {
      return { name: callerResolved, path: crumb.path, isLast: crumb.isLast };
    }
    if (
      resolvedFor &&
      resolvedLabel &&
      crumb.path === resolvedFor.path &&
      crumb.entityType === resolvedFor.entityType
    ) {
      return { name: resolvedLabel, path: crumb.path, isLast: crumb.isLast };
    }
    if (crumb.entityType && crumb.entityId) {
      return {
        name: `${crumb.title} #${crumb.entityId}`,
        path: crumb.path,
        isLast: crumb.isLast,
      };
    }
    return { name: crumb.title, path: crumb.path, isLast: crumb.isLast };
  });
}

interface AppBreadcrumbProps {
  /** Optional custom breadcrumbs to override automatic generation */
  customBreadcrumbs?: Array<{ name: string; path?: string }>;
  /** Optional class name for styling */
  className?: string;
  /**
   * TER-1362: Optional map from a raw route segment / tab value to a
   * human-friendly display name. Useful for pages that want to supply an
   * entity name directly rather than relying on the built-in tRPC resolver
   * (or for query-param-driven sub-views such as `?tab=create-order`).
   *
   * Keys are matched against the crumb's entity id (e.g. `"105"`) and the
   * last path segment (e.g. `"create-order"` for `/sales?tab=create-order`).
   * Merged on top of any values registered via `BreadcrumbProvider`, with
   * props winning on collision.
   */
  resolvedNames?: BreadcrumbResolvedNames;
}

export const AppBreadcrumb = React.memo(function AppBreadcrumb({
  customBreadcrumbs,
  className,
  resolvedNames: resolvedNamesProp,
}: AppBreadcrumbProps) {
  const [location] = useLocation();
  const search = useSearch();
  const { enabled: registryEnabled } = useFeatureFlag(
    FEATURE_FLAGS.uxV2BreadcrumbRegistry
  );
  const resolvedNamesFromContext = useBreadcrumbResolvedNamesMap();

  // TER-1362: prop values win over context values on key collision so
  // direct callers retain full control.
  const mergedResolvedNames = React.useMemo<BreadcrumbResolvedNames>(
    () => ({ ...resolvedNamesFromContext, ...(resolvedNamesProp ?? {}) }),
    [resolvedNamesFromContext, resolvedNamesProp]
  );

  // Derive the registry-backed trail (only used when the flag is on).
  const trail = React.useMemo<BreadcrumbTrailEntry[]>(() => {
    if (!registryEnabled || customBreadcrumbs) return [];
    return buildBreadcrumbTrail(location, search);
  }, [registryEnabled, customBreadcrumbs, location, search]);

  // Resolve the shallowest entity-bearing crumb so parents like
  // `/clients/:id/ledger` still show the client name at the intermediate
  // crumb rather than a raw id.
  const resolvableEntry = React.useMemo(
    () => trail.find(t => Boolean(t.entityType && t.entityId)),
    [trail]
  );
  const resolvedLabel = useResolvedEntityLabel(
    resolvableEntry?.entityType,
    resolvableEntry?.entityId
  );

  // Compose the breadcrumb list for rendering.
  const breadcrumbs: BreadcrumbSegment[] = customBreadcrumbs
    ? customBreadcrumbs.map((crumb, index) => ({
        name: crumb.name,
        path: crumb.path || "",
        isLast: index === customBreadcrumbs.length - 1,
      }))
    : registryEnabled
      ? trailToSegments(
          trail,
          resolvableEntry,
          resolvedLabel,
          mergedResolvedNames
        )
      : buildLegacyBreadcrumbs(location);

  // Don't render if no breadcrumbs (home page)
  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {/* Home link */}
        <BreadcrumbItem>
          <BreadcrumbLink href="/" className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path || index}>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.path}>{crumb.name}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
});

export default AppBreadcrumb;
