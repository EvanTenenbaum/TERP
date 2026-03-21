type WorkspaceParamValue = string | number | boolean | null | undefined;
export type OrdersSheetView = "queue" | "document";
export type OperationsTab =
  | "inventory"
  | "intake"
  | "receiving"
  | "shipping"
  | "photography"
  | "samples";

function buildWorkspacePath(
  basePath: string,
  tab?: string,
  params?: Record<string, WorkspaceParamValue>
) {
  const search = new URLSearchParams();

  if (tab) {
    search.set("tab", tab);
  }

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return `${basePath}${query ? `?${query}` : ""}`;
}

export function buildSalesWorkspacePath(
  tab?: string,
  params?: Record<string, WorkspaceParamValue>
) {
  return buildWorkspacePath("/sales", tab, params);
}

export function buildSheetNativeOrdersPath(
  params?: Record<string, WorkspaceParamValue>
) {
  return buildSalesWorkspacePath("orders", {
    surface: "sheet-native",
    ...params,
  });
}

export function buildSheetNativeOrdersDocumentPath(
  params?: Record<string, WorkspaceParamValue>
) {
  return buildSheetNativeOrdersPath({
    ordersView: "document",
    ...params,
  });
}

export function normalizeOperationsTab(
  tab?: string | null
): OperationsTab | undefined {
  switch (tab) {
    case "inventory":
    case "intake":
    case "receiving":
    case "shipping":
    case "photography":
    case "samples":
      return tab;
    case "pick-pack":
      return "shipping";
    default:
      return undefined;
  }
}

export function buildOperationsWorkspacePath(
  tab?: string | null,
  params?: Record<string, WorkspaceParamValue>
) {
  return buildWorkspacePath("/inventory", normalizeOperationsTab(tab), params);
}

export function buildProcurementWorkspacePath(
  tab?: string,
  params?: Record<string, WorkspaceParamValue>
) {
  return buildWorkspacePath("/purchase-orders", tab, params);
}
