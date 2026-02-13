const STORAGE_KEY = "routeUsageEvents";
const MAX_EVENTS = 500;
export const LEGACY_ROUTE_PATHS = [
  "/orders",
  "/products",
  "/quotes",
  "/returns",
  "/clients",
  "/vendors",
  "/needs",
  "/interest-list",
  "/vendor-supply",
  "/matchmaking",
  "/credit-settings",
  "/credits/manage",
  "/invoices",
  "/client-needs",
  "/ar-ap",
  "/reports",
  "/pricing-rules",
  "/system-settings",
  "/feature-flags",
  "/todo-lists",
] as const;

export type RouteUsageEventType =
  | "legacy_route_redirect"
  | "workspace_home_visit";

export interface RouteUsageEvent {
  event: RouteUsageEventType;
  timestamp: string;
  properties: {
    from?: string;
    to?: string;
    path?: string;
    workspace?: string;
    tab?: string;
    search?: string;
  };
}

export interface LegacyRouteUsageAuditEntry {
  route: string;
  count: number;
  lastSeen?: string;
  lowUsage: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    // In restricted environments (private browsing, disabled storage), fallback.
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRouteUsageEvent(value: unknown): value is RouteUsageEvent {
  if (!isObject(value)) {
    return false;
  }

  const event = value.event;
  const timestamp = value.timestamp;
  const properties = value.properties;

  return (
    (event === "legacy_route_redirect" || event === "workspace_home_visit") &&
    typeof timestamp === "string" &&
    isObject(properties)
  );
}

function readEvents(): RouteUsageEvent[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRouteUsageEvent);
  } catch {
    return [];
  }
}

function writeEvents(events: RouteUsageEvent[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Intentionally silent: telemetry must never break user navigation.
  }
}

function appendEvent(event: RouteUsageEvent) {
  const events = readEvents();
  events.push(event);

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  writeEvents(events);
}

export function trackLegacyRouteRedirect(params: {
  from: string;
  to: string;
  tab?: string;
  search?: string;
}) {
  appendEvent({
    event: "legacy_route_redirect",
    timestamp: new Date().toISOString(),
    properties: {
      from: params.from,
      to: params.to,
      tab: params.tab,
      search: params.search,
    },
  });
}

export function trackWorkspaceHomeVisit(params: {
  workspace: string;
  path: string;
  tab?: string;
}) {
  appendEvent({
    event: "workspace_home_visit",
    timestamp: new Date().toISOString(),
    properties: {
      workspace: params.workspace,
      path: params.path,
      tab: params.tab,
    },
  });
}

export function getRouteUsageEvents(): RouteUsageEvent[] {
  return readEvents();
}

export function clearRouteUsageEvents() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Intentionally silent.
  }
}

export function getLegacyRouteUsageSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  const events = readEvents().filter(
    event => event.event === "legacy_route_redirect"
  );

  events.forEach(event => {
    const key = event.properties.from ?? "unknown";
    summary[key] = (summary[key] ?? 0) + 1;
  });

  return summary;
}

export function getLegacyRouteUsageAudit(options?: {
  lookbackDays?: number;
  lowUsageThreshold?: number;
  routes?: readonly string[];
}): LegacyRouteUsageAuditEntry[] {
  const lookbackDays = options?.lookbackDays ?? 30;
  const lowUsageThreshold = options?.lowUsageThreshold ?? 3;
  const routes = options?.routes ?? LEGACY_ROUTE_PATHS;
  const cutoffMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  const counters: Record<string, LegacyRouteUsageAuditEntry> = {};
  routes.forEach(route => {
    counters[route] = {
      route,
      count: 0,
      lowUsage: true,
    };
  });

  readEvents()
    .filter(event => event.event === "legacy_route_redirect")
    .forEach(event => {
      const route = event.properties.from;
      if (!route || !(route in counters)) {
        return;
      }

      const timestampMs = Date.parse(event.timestamp);
      if (Number.isNaN(timestampMs) || timestampMs < cutoffMs) {
        return;
      }

      const current = counters[route];
      current.count += 1;
      if (!current.lastSeen || event.timestamp > current.lastSeen) {
        current.lastSeen = event.timestamp;
      }
    });

  return Object.values(counters)
    .map(entry => ({
      ...entry,
      lowUsage: entry.count <= lowUsageThreshold,
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
}
