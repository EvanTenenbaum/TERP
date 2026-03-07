type WorkspaceParamValue = string | number | boolean | null | undefined;

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

export function buildProcurementWorkspacePath(
  tab?: string,
  params?: Record<string, WorkspaceParamValue>
) {
  return buildWorkspacePath("/purchase-orders", tab, params);
}
