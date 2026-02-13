/**
 * SortControls Component
 * Sortable table header with visual indicators
 */

import * as React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortDirection, SortableColumn } from "@/hooks/useInventorySort";

interface SortControlsProps {
  column: SortableColumn;
  currentColumn: SortableColumn | null;
  direction: SortDirection;
  onSort: (column: SortableColumn) => void;
  children: React.ReactNode;
  align?: "left" | "right";
}

export function SortControls({
  column,
  currentColumn,
  direction,
  onSort,
  children,
  align = "left",
}: SortControlsProps) {
  const isActive = currentColumn === column;
  
  return (
    <button
      onClick={() => onSort(column)}
      className={`flex items-center gap-2 font-medium hover:text-foreground transition-colors ${
        align === "right" ? "ml-auto" : ""
      } ${isActive ? "text-foreground" : "text-muted-foreground"}`}
    >
      {children}
      {isActive && direction === "asc" && <ArrowUp className="h-4 w-4" />}
      {isActive && direction === "desc" && <ArrowDown className="h-4 w-4" />}
      {!isActive && <ArrowUpDown className="h-4 w-4 opacity-30" />}
    </button>
  );
}

