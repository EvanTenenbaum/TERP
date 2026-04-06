/**
 * useRecentPages - TER-619
 *
 * Tracks the last N visited pages using localStorage so the command palette
 * can surface "Recent pages" for quick navigation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";

const STORAGE_KEY = "terp-recent-pages";
const MAX_RECENT = 5;

export interface RecentPage {
  path: string;
  label: string;
  visitedAt: number;
}

// Human-readable labels for common paths
const PATH_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/sales": "Sales Workspace",
  "/sales?tab=orders": "Orders",
  "/sales?tab=quotes": "Quotes",
  "/sales?tab=returns": "Returns",
  "/sales?tab=sales-sheets": "Sales Catalogues",
  "/sales?tab=live-shopping": "Live Shopping",
  "/sales?tab=create-order": "New Sales Order",
  "/inventory": "Inventory Workspace",
  "/inventory?tab=intake": "Direct Intake",
  "/inventory?tab=receiving": "Product Intake",
  "/inventory?tab=shipping": "Shipping",
  "/inventory?tab=photography": "Photography",
  "/inventory?tab=samples": "Samples",
  "/procurement": "Procurement Workspace",
  "/purchase-orders": "Purchase Orders",
  "/accounting": "Accounting Workspace",
  "/accounting?tab=invoices": "Invoices",
  "/accounting?tab=bills": "Bills",
  "/accounting?tab=payments": "Payments",
  "/accounting?tab=credits": "Credits",
  "/relationships": "Relationships",
  "/calendar": "Calendar",
  "/notifications": "Notifications",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/help": "Help",
  "/workflow-queue": "Workflow Queue",
  "/scheduling": "Scheduling",
  "/time-clock": "Time Clock",
  "/live-shopping": "Live Shopping",
  "/photography": "Photography",
};

function getLabelForPath(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path];

  const [pathname] = path.split("?");
  if (PATH_LABELS[pathname]) return PATH_LABELS[pathname];

  // Client profile: /clients/123
  const clientMatch = path.match(/^\/clients\/(\d+)/);
  if (clientMatch) return `Client #${clientMatch[1]}`;

  // Capitalize the last segment as a fallback
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    return last
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return path;
}

function loadRecentPages(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentPage =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentPage).path === "string" &&
        typeof (item as RecentPage).label === "string" &&
        typeof (item as RecentPage).visitedAt === "number"
    );
  } catch {
    return [];
  }
}

function saveRecentPages(pages: RecentPage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // Ignore storage failures
  }
}

function addPage(pages: RecentPage[], path: string): RecentPage[] {
  // Ignore non-navigable or trivial paths
  if (!path || path.startsWith("/vip-portal") || path === "/login") {
    return pages;
  }

  const label = getLabelForPath(path);
  const entry: RecentPage = { path, label, visitedAt: Date.now() };

  // Remove existing entry for same path (dedup), prepend new entry
  const filtered = pages.filter(p => p.path !== path);
  const next = [entry, ...filtered].slice(0, MAX_RECENT);
  return next;
}

function buildTrackedPath(pathname: string, search: string): string {
  if (!search) {
    return pathname;
  }
  return `${pathname}${search}`;
}

export function useRecentPages(): {
  recentPages: RecentPage[];
  recordPage: (path: string) => void;
} {
  const [recentPages, setRecentPages] = useState<RecentPage[]>(loadRecentPages);
  const [location] = useLocation();
  const search = useSearch();
  const prevLocationRef = useRef<string | null>(null);

  // Record page visits on location change
  useEffect(() => {
    const trackedPath = buildTrackedPath(location, search);
    if (trackedPath === prevLocationRef.current) return;
    prevLocationRef.current = trackedPath;

    setRecentPages(prev => {
      const next = addPage(prev, trackedPath);
      saveRecentPages(next);
      return next;
    });
  }, [location, search]);

  const recordPage = useCallback((path: string) => {
    setRecentPages(prev => {
      const next = addPage(prev, path);
      saveRecentPages(next);
      return next;
    });
  }, []);

  return { recentPages, recordPage };
}
