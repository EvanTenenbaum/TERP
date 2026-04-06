import { buildRelationshipProfilePath } from "@/lib/relationshipProfile";
import {
  buildOperationsWorkspacePath,
  buildProcurementWorkspacePath,
  buildSalesWorkspacePath,
} from "@/lib/workspaceRoutes";

type NotificationMetadata = {
  clientId?: number | string;
  entityId?: number | string;
  entityType?: string;
};

function toPositiveInt(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildAccountingPath(
  tab: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  const search = new URLSearchParams();
  search.set("tab", tab);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }

  return `/accounting?${search.toString()}`;
}

function resolveLinkFromMetadata(metadata?: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const details = metadata as NotificationMetadata;
  const entityType = details.entityType;
  const entityId = toPositiveInt(details.entityId);
  const clientId = toPositiveInt(details.clientId);

  switch (entityType) {
    case "order":
      return entityId
        ? buildSalesWorkspacePath("orders", { id: entityId })
        : buildSalesWorkspacePath("orders");
    case "invoice":
      return entityId
        ? buildAccountingPath("invoices", { id: entityId })
        : buildAccountingPath("invoices");
    case "payment":
      return entityId
        ? buildAccountingPath("payments", { id: entityId })
        : buildAccountingPath("payments");
    case "batch":
    case "inventory_batch":
      return entityId
        ? buildOperationsWorkspacePath("inventory", { batchId: entityId })
        : buildOperationsWorkspacePath("inventory");
    case "appointment":
      return entityId ? `/calendar?eventId=${entityId}` : "/calendar";
    case "credit":
      return entityId
        ? "/credits?tab=adjustments&id=" + entityId
        : "/credits?tab=adjustments";
    case "interest_list":
      return clientId
        ? `/clients/${clientId}/vip-portal-config`
        : "/notifications";
    case "client":
      return clientId ? buildRelationshipProfilePath(clientId) : null;
    default:
      return null;
  }
}

export function normalizeNotificationLink(
  link?: string | null,
  metadata?: unknown
): string | null {
  if (!link) {
    return resolveLinkFromMetadata(metadata);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(link, "https://terp.local");
  } catch {
    return link;
  }

  const path = parsedUrl.pathname;
  const params = Object.fromEntries(parsedUrl.searchParams.entries());
  const pathMatch =
    /^\/(?<resource>orders|invoices|payments|inventory|tasks|credits|purchase-orders|vip-portal\/invoices|vip-portal\/interest-lists|accounting\/payables)\/(?<id>\d+)$/.exec(
      path
    );
  const resource = pathMatch?.groups?.resource;
  const resourceId = toPositiveInt(pathMatch?.groups?.id);

  switch (path) {
    case "/orders":
      return buildSalesWorkspacePath("orders", params);
    case "/invoices":
      return buildAccountingPath("invoices", params);
    case "/payments":
      return buildAccountingPath("payments", params);
    case "/credits":
      return `/credits?${new URLSearchParams({
        ...params,
        tab: "adjustments",
      }).toString()}`;
    default:
      break;
  }

  if (resource === "orders" && resourceId) {
    return buildSalesWorkspacePath("orders", { ...params, id: resourceId });
  }
  if (resource === "invoices" && resourceId) {
    return buildAccountingPath("invoices", { ...params, id: resourceId });
  }
  if (resource === "payments" && resourceId) {
    return buildAccountingPath("payments", { ...params, id: resourceId });
  }
  if (resource === "inventory" && resourceId) {
    return buildOperationsWorkspacePath("inventory", {
      ...params,
      batchId: resourceId,
    });
  }
  if (resource === "purchase-orders" && resourceId) {
    return buildProcurementWorkspacePath("purchase-orders", {
      ...params,
      id: resourceId,
    });
  }
  if (resource === "tasks") {
    return "/notifications";
  }
  if (resource === "credits" && resourceId) {
    return `/credits?${new URLSearchParams({
      ...params,
      tab: "adjustments",
      id: String(resourceId),
    }).toString()}`;
  }
  if (resource === "accounting/payables") {
    return buildAccountingPath("bills", params);
  }
  if (resource === "vip-portal/invoices" && resourceId) {
    return buildAccountingPath("invoices", { ...params, id: resourceId });
  }
  if (resource === "vip-portal/interest-lists") {
    return resolveLinkFromMetadata(metadata) ?? "/notifications";
  }

  return link;
}
