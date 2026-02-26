export type PowersheetRowId = string | number;

export interface PowersheetRowSelection<TRowId extends PowersheetRowId> {
  selectedRowIds: TRowId[];
  selectedCount: number;
  isSelected: (rowId: TRowId) => boolean;
  setSelection: (rowIds: TRowId[]) => void;
  toggleRow: (rowId: TRowId) => void;
  toggleAll: (rowIds: TRowId[]) => void;
  clearSelection: () => void;
}

export interface PowersheetGridKeyboardContract {
  onRowCommit: () => void;
  onRowCreate: () => void;
  onCancel: () => void;
  onMoveNextRow?: () => void;
  onMovePreviousRow?: () => void;
}

export interface PowersheetBulkActionContract<TRow> {
  selectedCount: number;
  applyToSelected: (updater: (row: TRow) => TRow) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
}
