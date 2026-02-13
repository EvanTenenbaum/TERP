/**
 * App Breadcrumb Component
 * UX-009: Automatic breadcrumb navigation based on current route
 *
 * Generates breadcrumbs from the current URL path and navigation config.
 */

import React from "react";
import { useLocation } from "wouter";
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

interface BreadcrumbSegment {
  name: string;
  path: string;
  isLast: boolean;
}

/**
 * Custom route name mappings for paths not in navigation config
 * or for dynamic route segments
 */
const customRouteNames: Record<string, string> = {
  create: "Create",
  edit: "Edit",
  new: "New",
  dashboard: "Dashboard",
  rules: "Rules",
  profiles: "Profiles",
  orders: "Sales", // TER-196: "Orders" → "Sales" terminology
};

/**
 * Get display name for a route segment
 */
function getSegmentName(segment: string, fullPath: string): string {
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
 * Build breadcrumb segments from current path
 */
function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  // Don't show breadcrumbs on home page
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
      name: getSegmentName(segment, currentPath),
      path: currentPath,
      isLast,
    });
  });

  return breadcrumbs;
}

interface AppBreadcrumbProps {
  /** Optional custom breadcrumbs to override automatic generation */
  customBreadcrumbs?: Array<{ name: string; path?: string }>;
  /** Optional class name for styling */
  className?: string;
}

export const AppBreadcrumb = React.memo(function AppBreadcrumb({
  customBreadcrumbs,
  className,
}: AppBreadcrumbProps) {
  const [location] = useLocation();

  // Use custom breadcrumbs if provided, otherwise generate from path
  const breadcrumbs = customBreadcrumbs
    ? customBreadcrumbs.map((crumb, index) => ({
        name: crumb.name,
        path: crumb.path || "",
        isLast: index === customBreadcrumbs.length - 1,
      }))
    : buildBreadcrumbs(location);

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
