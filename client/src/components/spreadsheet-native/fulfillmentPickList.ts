import type { ExportOptions } from "@/hooks/work-surface/useExport";

export interface PickListRow extends Record<string, unknown> {
  orderNumber: string;
  clientName: string;
  productName: string;
  quantity: number;
  batchLocation: string;
  bagIdentifier: string;
  packed: string;
  packedAt: string;
}

export function buildPickListExportOptions(
  orderNumber: string
): ExportOptions<PickListRow> {
  const safeOrderNumber = orderNumber.replace(/\s+/g, "_");

  return {
    filename: `pick_list_${safeOrderNumber}`,
    addTimestamp: true,
    columns: [
      { key: "orderNumber", label: "Order Number" },
      { key: "clientName", label: "Client" },
      { key: "productName", label: "Product" },
      { key: "quantity", label: "Quantity" },
      { key: "batchLocation", label: "Batch Location" },
      { key: "bagIdentifier", label: "Bag" },
      { key: "packed", label: "Packed" },
      { key: "packedAt", label: "Packed At" },
    ],
  };
}
