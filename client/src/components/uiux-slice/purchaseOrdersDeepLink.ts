export interface PurchaseOrderDeepLink {
  poId: number | null;
  supplierClientId: number | null;
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parsePurchaseOrderDeepLink(
  search: string
): PurchaseOrderDeepLink {
  const params = new URLSearchParams(search);

  return {
    poId: parsePositiveInt(params.get("id") ?? params.get("poId")),
    supplierClientId: parsePositiveInt(params.get("supplierClientId")),
  };
}
