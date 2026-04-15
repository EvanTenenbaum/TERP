/**
 * Human-readable display labels for raw enum values used across TERP.
 * Use these maps in cell renderers, status badges, and table cells
 * instead of displaying raw enum strings to the user.
 * TER-1064
 */

/** Vendor supply item status labels */
export const VENDOR_SUPPLY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  PURCHASED: "Purchased",
  EXPIRED: "Expired",
};

/** Payment terms labels */
export const PAYMENT_TERMS_LABELS: Record<string, string> = {
  CONSIGNMENT: "Consignment",
  NET_30: "Net 30",
  NET_60: "Net 60",
  NET_90: "Net 90",
  PREPAID: "Prepaid",
  COD: "COD",
};

/** Fulfillment status labels */
export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/**
 * Generic enum label lookup — returns the label from the map, or a
 * title-cased fallback derived from the raw value.
 */
export function getEnumLabel(
  value: string,
  map: Record<string, string>
): string {
  return (
    map[value] ??
    value
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
  );
}
