import type { KeyboardEvent } from "react";

export type PowersheetCellCoordinate = {
  rowIndex: number;
  columnKey: string;
};

export interface PowersheetSelectionRange {
  anchor: PowersheetCellCoordinate;
  focus: PowersheetCellCoordinate;
}

export interface PowersheetSelectionSet {
  focusedCell: PowersheetCellCoordinate | null;
  anchorCell: PowersheetCellCoordinate | null;
  ranges: PowersheetSelectionRange[];
  selectedRowIds: Set<string>;
}

export interface PowersheetFieldPolicy {
  copyAllowed: boolean;
  pasteAllowed: boolean;
  fillAllowed: boolean;
  singleEditAllowed: boolean;
  multiEditAllowed: boolean;
  surfaceLabel: string;
}

export type PowersheetFieldPolicyMap<Row> = Partial<
  Record<keyof Row & string, PowersheetFieldPolicy>
>;

export interface PowersheetSelectionSummary {
  selectedCellCount: number;
  selectedRowCount: number;
  hasDiscontiguousSelection: boolean;
  focusedSurface:
    | "orders-queue"
    | "orders-support-grid"
    | "orders-document-grid";
}

export interface PowersheetRowSelection {
  selectedRowIds: Set<string>;
  isRowSelected: (rowId: string) => boolean;
  toggleRowSelection: (rowId: string) => void;
  clearSelection: () => void;
}

export interface PowersheetGridKeyboardContract {
  onCellKeyDown: (
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    columnIndex: number
  ) => void;
  focusCell: (rowIndex: number, columnIndex: number) => void;
}

export interface PowersheetBulkActionContract<Row> {
  fillDown: <Field extends keyof Row>(field: Field) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
}

export type PowersheetEditNavigationCommand =
  | "tab"
  | "shift-tab"
  | "enter"
  | "shift-enter"
  | "escape";

export interface PowersheetClipboardBlock {
  start: PowersheetCellCoordinate;
  values: string[][];
}

export interface PowersheetEditRejection {
  columnKey: string;
  reason:
    | "locked-cell"
    | "workflow-owned"
    | "paste-disallowed"
    | "fill-disallowed"
    | "invalid-value";
  message: string;
}

export interface ApplyFieldValueToSelectedRowsInput<
  Row,
  Field extends keyof Row,
> {
  rows: Row[];
  selectedRowIds: Set<string>;
  getRowId: (row: Row) => string;
  field: Field;
  value: Row[Field];
}

export interface ClearFieldValueForSelectedRowsInput<
  Row,
  Field extends keyof Row,
> extends ApplyFieldValueToSelectedRowsInput<Row, Field> {}

export function createPowersheetEditRejection(
  columnKey: string,
  reason: PowersheetEditRejection["reason"],
  message: string
): PowersheetEditRejection {
  return {
    columnKey,
    reason,
    message,
  };
}

export function applyFieldValueToSelectedRows<Row, Field extends keyof Row>({
  rows,
  selectedRowIds,
  getRowId,
  field,
  value,
}: ApplyFieldValueToSelectedRowsInput<Row, Field>): Row[] {
  if (selectedRowIds.size === 0) {
    return rows;
  }

  return rows.map(row =>
    selectedRowIds.has(getRowId(row)) ? { ...row, [field]: value } : row
  );
}

export function clearFieldValueForSelectedRows<Row, Field extends keyof Row>({
  rows,
  selectedRowIds,
  getRowId,
  field,
  value,
}: ClearFieldValueForSelectedRowsInput<Row, Field>): Row[] {
  return applyFieldValueToSelectedRows({
    rows,
    selectedRowIds,
    getRowId,
    field,
    value,
  });
}

export interface FillDownRowsInput<Row, Field extends keyof Row> {
  rows: Row[];
  selectedRowIds: Set<string>;
  getRowId: (row: Row) => string;
  field: Field;
}

export function fillDownSelectedRows<Row, Field extends keyof Row>({
  rows,
  selectedRowIds,
  getRowId,
  field,
}: FillDownRowsInput<Row, Field>): Row[] {
  if (selectedRowIds.size < 2) {
    return rows;
  }

  const sourceRow = rows.find(row => selectedRowIds.has(getRowId(row)));
  if (!sourceRow) {
    return rows;
  }

  const sourceValue = sourceRow[field];
  return rows.map(row =>
    selectedRowIds.has(getRowId(row)) ? { ...row, [field]: sourceValue } : row
  );
}

export interface DuplicateRowsInput<Row> {
  rows: Row[];
  selectedRowIds: Set<string>;
  getRowId: (row: Row) => string;
  duplicateRow: (row: Row) => Row;
}

export function duplicateSelectedRows<Row>({
  rows,
  selectedRowIds,
  getRowId,
  duplicateRow,
}: DuplicateRowsInput<Row>): Row[] {
  if (selectedRowIds.size === 0) {
    return rows;
  }

  const duplicates = rows
    .filter(row => selectedRowIds.has(getRowId(row)))
    .map(row => duplicateRow(row));

  return [...rows, ...duplicates];
}

export interface DeleteRowsInput<Row> {
  rows: Row[];
  selectedRowIds: Set<string>;
  getRowId: (row: Row) => string;
  minimumRows?: number;
}

export function deleteSelectedRows<Row>({
  rows,
  selectedRowIds,
  getRowId,
  minimumRows = 1,
}: DeleteRowsInput<Row>): Row[] {
  if (selectedRowIds.size === 0) {
    return rows;
  }

  const filteredRows = rows.filter(row => !selectedRowIds.has(getRowId(row)));
  if (filteredRows.length < minimumRows) {
    return rows;
  }

  return filteredRows;
}

export function calculatePowersheetTotal<Row>(
  rows: Row[],
  getLineTotal: (row: Row) => number
): number {
  return rows.reduce((sum, row) => sum + getLineTotal(row), 0);
}
