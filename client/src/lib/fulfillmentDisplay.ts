export type FulfillmentDisplayStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PENDING"
  | "READY"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "RESTOCKED"
  | "RETURNED_TO_VENDOR"
  | "CANCELLED";

const DISPLAY_LABELS: Record<FulfillmentDisplayStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  READY: "Ready",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  RESTOCKED: "Restocked",
  RETURNED_TO_VENDOR: "Returned to Supplier",
  CANCELLED: "Cancelled",
};

const normalizeStatus = (status?: string | null): string =>
  String(status ?? "").trim().toUpperCase();

export function mapToFulfillmentDisplayStatus(
  status?: string | null
): FulfillmentDisplayStatus | null {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case "DRAFT":
      return "DRAFT";
    case "CONFIRMED":
      return "CONFIRMED";
    case "PENDING":
    case "READY_FOR_PACKING":
      return "PENDING";
    case "READY":
    case "PACKED":
      return "READY";
    case "SHIPPED":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "RETURNED":
      return "RETURNED";
    case "RESTOCKED":
      return "RESTOCKED";
    case "RETURNED_TO_VENDOR":
      return "RETURNED_TO_VENDOR";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return normalized ? null : null;
  }
}

export function getFulfillmentDisplayLabel(status?: string | null): string {
  const displayStatus = mapToFulfillmentDisplayStatus(status);
  if (!displayStatus) {
    return normalizeStatus(status) || "-";
  }
  return DISPLAY_LABELS[displayStatus];
}
