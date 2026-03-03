export type SalesBusinessMode = "non-shipping" | "shipping-enabled";

export const DEFAULT_SALES_BUSINESS_MODE: SalesBusinessMode = "non-shipping";

const SHIPPING_PARAM_VALUES = new Set(["shipping", "ship", "shipping-enabled"]);

export function resolveSalesBusinessMode(
  locationPath: string | null | undefined
): SalesBusinessMode {
  if (!locationPath) {
    return DEFAULT_SALES_BUSINESS_MODE;
  }

  const query = locationPath.includes("?")
    ? (locationPath.split("?")[1] ?? "")
    : "";
  const params = new URLSearchParams(query);
  const requestedMode = params.get("salesMode")?.toLowerCase();

  if (requestedMode && SHIPPING_PARAM_VALUES.has(requestedMode)) {
    return "shipping-enabled";
  }

  return DEFAULT_SALES_BUSINESS_MODE;
}

export function isShippingEnabledMode(mode: SalesBusinessMode): boolean {
  return mode === "shipping-enabled";
}
