import { useCallback, useMemo, useState } from "react";
import type {
  PowersheetRowId,
  PowersheetRowSelection,
} from "@/types/powersheet";

interface UsePowersheetSelectionOptions<TRowId extends PowersheetRowId> {
  initialSelectedRowIds?: TRowId[];
}

export function usePowersheetSelection<TRowId extends PowersheetRowId>(
  options: UsePowersheetSelectionOptions<TRowId> = {}
): PowersheetRowSelection<TRowId> {
  const [selectedRowIds, setSelectedRowIds] = useState<TRowId[]>(
    options.initialSelectedRowIds ?? []
  );

  const isSelected = useCallback(
    (rowId: TRowId) => selectedRowIds.includes(rowId),
    [selectedRowIds]
  );

  const setSelection = useCallback((rowIds: TRowId[]) => {
    setSelectedRowIds(Array.from(new Set(rowIds)));
  }, []);

  const toggleRow = useCallback((rowId: TRowId) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  }, []);

  const toggleAll = useCallback((rowIds: TRowId[]) => {
    setSelectedRowIds(prev => {
      const targetIds = Array.from(new Set(rowIds));
      if (targetIds.length === 0) {
        return [];
      }
      const allSelected = targetIds.every(id => prev.includes(id));
      return allSelected ? [] : targetIds;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowIds([]);
  }, []);

  return useMemo(
    () => ({
      selectedRowIds,
      selectedCount: selectedRowIds.length,
      isSelected,
      setSelection,
      toggleRow,
      toggleAll,
      clearSelection,
    }),
    [
      clearSelection,
      isSelected,
      selectedRowIds,
      setSelection,
      toggleAll,
      toggleRow,
    ]
  );
}
