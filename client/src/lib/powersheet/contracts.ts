import type { KeyboardEvent } from "react";

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
