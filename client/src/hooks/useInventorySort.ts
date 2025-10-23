/**
 * useInventorySort Hook
 * Manages inventory table sorting state and logic
 */

import { useState, useMemo } from "react";

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

export function useInventorySort() {
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const toggleSort = (column: SortableColumn) => {
    setSortState((prev) => {
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

  const sortData = <T extends any[]>(data: T): T => {
    if (!sortState.column || !sortState.direction) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      let aVal: any;
      let bVal: any;

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
          aVal = a.batch?.status || "";
          bVal = b.batch?.status || "";
          break;
        case "onHand":
          aVal = parseFloat(a.batch?.onHandQty || "0");
          bVal = parseFloat(b.batch?.onHandQty || "0");
          break;
        case "reserved":
          aVal = parseFloat(a.batch?.reservedQty || "0");
          bVal = parseFloat(b.batch?.reservedQty || "0");
          break;
        case "available":
          const aOnHand = parseFloat(a.batch?.onHandQty || "0");
          const aReserved = parseFloat(a.batch?.reservedQty || "0");
          const aQuarantine = parseFloat(a.batch?.quarantineQty || "0");
          const aHold = parseFloat(a.batch?.holdQty || "0");
          aVal = aOnHand - aReserved - aQuarantine - aHold;
          
          const bOnHand = parseFloat(b.batch?.onHandQty || "0");
          const bReserved = parseFloat(b.batch?.reservedQty || "0");
          const bQuarantine = parseFloat(b.batch?.quarantineQty || "0");
          const bHold = parseFloat(b.batch?.holdQty || "0");
          bVal = bOnHand - bReserved - bQuarantine - bHold;
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

