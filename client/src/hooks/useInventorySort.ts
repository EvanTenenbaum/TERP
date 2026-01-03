/**
 * useInventorySort Hook
 * Manages inventory table sorting state and logic
 */

import { useState } from "react";

export type SortDirection = "asc" | "desc" | null;
export type SortableColumn =
  | "sku"
  | "product"
  | "brand"
  | "vendor"
  | "grade"
  | "status"
  | "onHand"
  | "reserved"
  | "available";

interface SortState {
  column: SortableColumn | null;
  direction: SortDirection;
}

export interface InventorySortableRow {
  batch?: {
    sku?: string;
    grade?: string;
    batchStatus?: string;
    onHandQty?: string | number;
    reservedQty?: string | number;
    quarantineQty?: string | number;
    holdQty?: string | number;
  };
  product?: { nameCanonical?: string };
  brand?: { name?: string };
  vendor?: { name?: string };
}

export function useInventorySort() {
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const toNumber = (value: string | number | undefined | null) => {
    const parsed = Number.parseFloat(String(value ?? "0"));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const toggleSort = (column: SortableColumn) => {
    setSortState(prev => {
      if (prev.column !== column) {
        // New column: start with ascending
        return { column, direction: "asc" };
      }

      // Same column: cycle through asc -> desc -> null
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      } else if (prev.direction === "desc") {
        return { column: null, direction: null };
      } else {
        return { column, direction: "asc" };
      }
    });
  };

  const sortData = <T extends InventorySortableRow[]>(data: T): T => {
    if (!sortState.column || !sortState.direction) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortState.column) {
        case "sku":
          aVal = a.batch?.sku || "";
          bVal = b.batch?.sku || "";
          break;
        case "product":
          aVal = a.product?.nameCanonical || "";
          bVal = b.product?.nameCanonical || "";
          break;
        case "brand":
          aVal = a.brand?.name || "";
          bVal = b.brand?.name || "";
          break;
        case "vendor":
          aVal = a.vendor?.name || "";
          bVal = b.vendor?.name || "";
          break;
        case "grade":
          aVal = a.batch?.grade || "";
          bVal = b.batch?.grade || "";
          break;
        case "status":
          aVal = a.batch?.batchStatus || "";
          bVal = b.batch?.batchStatus || "";
          break;
        case "onHand":
          aVal = toNumber(a.batch?.onHandQty);
          bVal = toNumber(b.batch?.onHandQty);
          break;
        case "reserved":
          aVal = toNumber(a.batch?.reservedQty);
          bVal = toNumber(b.batch?.reservedQty);
          break;
        case "available":
          {
            const aOnHand = toNumber(a.batch?.onHandQty);
            const aReserved = toNumber(a.batch?.reservedQty);
            const aQuarantine = toNumber(a.batch?.quarantineQty);
            const aHold = toNumber(a.batch?.holdQty);
            aVal = aOnHand - aReserved - aQuarantine - aHold;

            const bOnHand = toNumber(b.batch?.onHandQty);
            const bReserved = toNumber(b.batch?.reservedQty);
            const bQuarantine = toNumber(b.batch?.quarantineQty);
            const bHold = toNumber(b.batch?.holdQty);
            bVal = bOnHand - bReserved - bQuarantine - bHold;
          }
          break;
        default:
          return 0;
      }

      // Handle string vs number comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortState.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortState.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

    return sorted as T;
  };

  return {
    sortState,
    toggleSort,
    sortData,
  };
}
