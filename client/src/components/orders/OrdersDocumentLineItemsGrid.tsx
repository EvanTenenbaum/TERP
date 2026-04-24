import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  CellSelectionDeleteStartEvent,
  CellValueChangedEvent,
  ColDef,
  FillEndEvent,
  FillOperationParams,
  FillStartEvent,
  GridApi,
  PasteEndEvent,
  PasteStartEvent,
  ProcessCellForExportParams,
  ProcessDataFromClipboardParams,
  SendToClipboardParams,
  SuppressKeyboardEventParams,
} from "ag-grid-community";
import { Trash2, CopyX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PowersheetGrid,
  type PowersheetAffordance,
} from "@/components/spreadsheet-native/PowersheetGrid";
import {
  applyFieldValueToSelectedRows,
  clearFieldValueForSelectedRows,
  createPowersheetEditRejection,
  deleteSelectedRows,
  duplicateSelectedRows,
  type PowersheetEditRejection,
  type PowersheetFieldPolicyMap,
  type PowersheetSelectionSet,
  type PowersheetSelectionSummary,
} from "@/lib/powersheet/contracts";
import {
  calculateLineItem,
  calculateLineItemFromRetailPrice,
} from "@/hooks/orders/useOrderCalculations";
import { parsePositiveInteger } from "@/lib/quantity";
import { toast } from "sonner";
import type { LineItem } from "./types";

interface OrdersDocumentLineItemsGridProps {
  items: LineItem[];
  clientId: number | null;
  onChange: (items: LineItem[]) => void;
  showCogsColumn?: boolean;
  showMarginColumn?: boolean;
  productIdentityByBatchId?: Record<
    number,
    { secondary: string | null; tertiary: string | null }
  >;
}

type OrdersDocumentEditableField =
  | "quantity"
  | "cogsPerUnit"
  | "marginPercent"
  | "unitPrice"
  | "isSample";

type OrdersDocumentGridColumnKey =
  | OrdersDocumentEditableField
  | "productDisplayName"
  | "batchSku"
  | "lineTotal";

const editableDocumentFields: OrdersDocumentEditableField[] = [
  "quantity",
  "cogsPerUnit",
  "marginPercent",
  "unitPrice",
  "isSample",
];

const documentFieldPolicies: PowersheetFieldPolicyMap<LineItem> = {
  quantity: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Orders document grid",
  },
  cogsPerUnit: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Orders document grid",
  },
  marginPercent: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Orders document grid",
  },
  unitPrice: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Orders document grid",
  },
  isSample: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Orders document grid",
  },
};

const documentAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: true },
  { label: "Fill", available: true },
  { label: "Edit", available: true },
  { label: "Undo/Redo", available: true },
  { label: "Row ops", available: true },
];

const documentGridColumnOrder: OrdersDocumentGridColumnKey[] = [
  "productDisplayName",
  "batchSku",
  "quantity",
  "cogsPerUnit",
  "marginPercent",
  "unitPrice",
  "lineTotal",
  "isSample",
];

function getDocumentLineItemRowId(
  item: LineItem,
  fallbackIndex?: number
): string {
  return item.id
    ? `line:${item.id}`
    : (item.clientRowKey ??
        `line:${fallbackIndex ?? 0}:${item.batchId}:${item.productId ?? "unknown"}`);
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getFieldPolicy(
  columnKey: string
): PowersheetFieldPolicyMap<LineItem>[OrdersDocumentEditableField] | null {
  if (columnKey in documentFieldPolicies) {
    return (
      documentFieldPolicies[columnKey as OrdersDocumentEditableField] ?? null
    );
  }

  return null;
}

function buildDocumentCellClass(
  columnKey: OrdersDocumentGridColumnKey
): string | undefined {
  return getFieldPolicy(columnKey)
    ? "powersheet-cell--editable"
    : "powersheet-cell--locked";
}

function getSpreadsheetWriteGuards(columnKey: OrdersDocumentEditableField) {
  const fieldPolicy = getFieldPolicy(columnKey);

  return {
    suppressPaste: !(fieldPolicy?.pasteAllowed ?? false),
    suppressFillHandle: !(fieldPolicy?.fillAllowed ?? false),
  };
}

function getSelectedDocumentColumnKeys(
  selectionSet: PowersheetSelectionSet | null,
  fallbackColumnKey?: string | null
): Set<OrdersDocumentGridColumnKey> {
  const selectedColumnKeys = new Set<OrdersDocumentGridColumnKey>();

  const addColumnKey = (columnKey: string | null | undefined) => {
    if (!columnKey) {
      return;
    }

    if (
      documentGridColumnOrder.includes(columnKey as OrdersDocumentGridColumnKey)
    ) {
      selectedColumnKeys.add(columnKey as OrdersDocumentGridColumnKey);
    }
  };

  selectionSet?.ranges.forEach(range => {
    const startIndex = documentGridColumnOrder.findIndex(
      columnKey => columnKey === range.anchor.columnKey
    );
    const endIndex = documentGridColumnOrder.findIndex(
      columnKey => columnKey === range.focus.columnKey
    );

    if (startIndex < 0 || endIndex < 0) {
      addColumnKey(range.anchor.columnKey);
      addColumnKey(range.focus.columnKey);
      return;
    }

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    documentGridColumnOrder
      .slice(minIndex, maxIndex + 1)
      .forEach(columnKey => selectedColumnKeys.add(columnKey));
  });

  addColumnKey(selectionSet?.focusedCell?.columnKey);
  addColumnKey(fallbackColumnKey);

  return selectedColumnKeys;
}

function getBlockedDocumentColumnForAction(
  selectionSet: PowersheetSelectionSet | null,
  capability: "pasteAllowed" | "fillAllowed" | "singleEditAllowed",
  fallbackColumnKey?: string | null
): OrdersDocumentGridColumnKey | null {
  const selectedColumnKeys = getSelectedDocumentColumnKeys(
    selectionSet,
    fallbackColumnKey
  );

  for (const columnKey of selectedColumnKeys) {
    const fieldPolicy = getFieldPolicy(columnKey);
    if (!fieldPolicy || !fieldPolicy[capability]) {
      return columnKey;
    }
  }

  return null;
}

function normalizeSampleClipboardValue(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["true", "yes", "y", "1"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "n", "0", ""].includes(normalized)) {
    return false;
  }

  return null;
}

function normalizeDocumentFillSeedValue(
  columnKey: string,
  value: unknown
): number | boolean | null {
  if (columnKey === "isSample") {
    return normalizeSampleClipboardValue(value);
  }

  if (columnKey === "quantity") {
    return parsePositiveInteger(String(value ?? ""));
  }

  return parseFiniteNumber(value);
}

function getDocumentFillValue(
  params: FillOperationParams<LineItem>
): number | boolean | null | false {
  const columnKey = params.column.getColId();
  const fieldPolicy = getFieldPolicy(columnKey);

  if (!fieldPolicy?.fillAllowed) {
    return params.currentCellValue;
  }

  const initialValues = params.initialValues
    .map(value => normalizeDocumentFillSeedValue(columnKey, value))
    .filter(value => value !== null);

  if (initialValues.length === 0) {
    return false;
  }

  if (columnKey === "isSample") {
    return initialValues[params.currentIndex % initialValues.length] ?? false;
  }

  const numericValues = initialValues.filter(
    (value): value is number => typeof value === "number"
  );
  if (numericValues.length !== initialValues.length) {
    return false;
  }

  if (numericValues.length === 1) {
    return numericValues[0];
  }

  const lastValue = numericValues[numericValues.length - 1] ?? 0;
  const previousValue =
    numericValues[numericValues.length - 2] ?? numericValues[0] ?? 0;
  const step = lastValue - previousValue;
  const nextValue = lastValue + step * (params.currentIndex + 1);

  if (columnKey === "quantity") {
    return Math.max(1, Math.round(nextValue));
  }

  return nextValue;
}

function getClipboardFallbackValue(
  params: ProcessCellForExportParams<LineItem>
): unknown {
  const columnKey = params.column.getColId() as keyof LineItem & string;
  return params.node?.data?.[columnKey] ?? params.value;
}

function getFocusedSelectionValue(
  selectionSet: PowersheetSelectionSet | null,
  selectedRowIds: Set<string>,
  items: LineItem[],
  field: keyof LineItem
) {
  const focusedRowId = selectionSet?.focusedRowId ?? null;
  if (focusedRowId && selectedRowIds.has(focusedRowId)) {
    const focusedRow = items.find(
      item => getDocumentLineItemRowId(item) === focusedRowId
    );
    if (focusedRow) {
      return focusedRow[field];
    }
  }

  const firstSelectedItem = items.find(item =>
    selectedRowIds.has(getDocumentLineItemRowId(item))
  );
  if (firstSelectedItem) {
    return firstSelectedItem[field];
  }

  return null;
}

function getRevertedEditableFieldValue(
  currentItem: LineItem,
  field: OrdersDocumentEditableField,
  oldValue: unknown
): LineItem[OrdersDocumentEditableField] {
  switch (field) {
    case "quantity": {
      const normalized = parsePositiveInteger(String(oldValue ?? ""));
      return normalized ?? currentItem.quantity;
    }
    case "isSample": {
      if (typeof oldValue === "boolean") {
        return oldValue;
      }

      const normalized = normalizeSampleClipboardValue(oldValue);
      return normalized ?? currentItem.isSample;
    }
    case "cogsPerUnit":
    case "marginPercent":
    case "unitPrice": {
      const normalized = parseFiniteNumber(oldValue);
      return normalized ?? currentItem[field];
    }
  }
}

function normalizeDocumentLineItemEdit(
  item: LineItem,
  columnKey: OrdersDocumentEditableField | (keyof LineItem & string),
  rawValue: unknown
): {
  nextItem: LineItem | null;
  rejection: PowersheetEditRejection | null;
} {
  switch (columnKey) {
    case "quantity": {
      const quantity = parsePositiveInteger(
        typeof rawValue === "number" ? rawValue : String(rawValue ?? "")
      );
      if (quantity === null) {
        return {
          nextItem: null,
          rejection: createPowersheetEditRejection(
            columnKey,
            "invalid-value",
            "Quantity must be a positive whole number."
          ),
        };
      }

      return {
        nextItem: {
          ...item,
          ...calculateLineItemFromRetailPrice(
            item.batchId,
            quantity,
            item.cogsPerUnit,
            item.unitPrice
          ),
        },
        rejection: null,
      };
    }
    case "cogsPerUnit": {
      const cogsPerUnit = parseFiniteNumber(rawValue);
      if (cogsPerUnit === null || cogsPerUnit <= 0) {
        return {
          nextItem: null,
          rejection: createPowersheetEditRejection(
            columnKey,
            "invalid-value",
            "COGS per unit must be greater than zero."
          ),
        };
      }

      return {
        nextItem: {
          ...item,
          ...calculateLineItemFromRetailPrice(
            item.batchId,
            item.quantity,
            cogsPerUnit,
            item.unitPrice
          ),
          cogsPerUnit,
          effectiveCogsBasis: "MANUAL",
          isCogsOverridden: cogsPerUnit !== item.originalCogsPerUnit,
          cogsOverrideReason:
            cogsPerUnit !== item.originalCogsPerUnit
              ? "Spreadsheet edit"
              : undefined,
          isBelowVendorRange:
            typeof item.originalRangeMin === "number"
              ? cogsPerUnit < item.originalRangeMin
              : false,
        },
        rejection: null,
      };
    }
    case "marginPercent": {
      const marginPercent = parseFiniteNumber(rawValue);
      if (marginPercent === null || marginPercent < 0 || marginPercent >= 100) {
        return {
          nextItem: null,
          rejection: createPowersheetEditRejection(
            columnKey,
            "invalid-value",
            marginPercent !== null && marginPercent >= 100
              ? "Margin percent must be less than 100."
              : "Margin percent must be zero or greater."
          ),
        };
      }

      const recalculated = calculateLineItem(
        item.batchId,
        item.quantity,
        item.cogsPerUnit,
        marginPercent
      );

      return {
        nextItem: {
          ...item,
          ...recalculated,
          marginPercent,
          isMarginOverridden: true,
          marginSource: "MANUAL",
        },
        rejection: null,
      };
    }
    case "unitPrice": {
      const unitPrice = parseFiniteNumber(rawValue);
      if (unitPrice === null || unitPrice < 0) {
        return {
          nextItem: null,
          rejection: createPowersheetEditRejection(
            columnKey,
            "invalid-value",
            "Unit price must be zero or greater."
          ),
        };
      }

      const recalculated = calculateLineItemFromRetailPrice(
        item.batchId,
        item.quantity,
        item.cogsPerUnit,
        unitPrice
      );

      return {
        nextItem: {
          ...item,
          ...recalculated,
          unitPrice,
          isMarginOverridden: true,
          marginSource: "MANUAL",
        },
        rejection: null,
      };
    }
    case "isSample": {
      const nextSample =
        typeof rawValue === "boolean"
          ? rawValue
          : normalizeSampleClipboardValue(rawValue);
      if (nextSample === null) {
        return {
          nextItem: null,
          rejection: createPowersheetEditRejection(
            columnKey,
            "invalid-value",
            "Sample values must be true/false, yes/no, or 1/0."
          ),
        };
      }
      return {
        nextItem: {
          ...item,
          isSample: nextSample,
        },
        rejection: null,
      };
    }
    default:
      return {
        nextItem: null,
        rejection: createPowersheetEditRejection(
          columnKey,
          "workflow-owned",
          "This cell is derived or workflow-owned and cannot be edited directly."
        ),
      };
  }
}

function readGridLineItemsByRowId(api: GridApi<LineItem>) {
  const rows = new Map<string, LineItem>();
  api.forEachNode(node => {
    if (node.data) {
      rows.set(getDocumentLineItemRowId(node.data), node.data);
    }
  });
  return rows;
}

export function OrdersDocumentLineItemsGrid({
  items,
  clientId,
  onChange,
  showCogsColumn = true,
  showMarginColumn = true,
  productIdentityByBatchId = {},
}: OrdersDocumentLineItemsGridProps) {
  const [selectionSet, setSelectionSet] =
    useState<PowersheetSelectionSet | null>(null);
  const [, setSelectionSummary] = useState<PowersheetSelectionSummary | null>(
    null
  );
  const [lastEditRejection, setLastEditRejection] =
    useState<PowersheetEditRejection | null>(null);
  const draftRowKeyCounterRef = useRef(0);
  const fillSnapshotRef = useRef<Map<string, LineItem> | null>(null);
  const pasteBufferRef = useRef<LineItem[] | null>(null);
  const pasteDirtyRef = useRef(false);
  const pasteInProgressRef = useRef(false);
  const lastToastKeyRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef(0);

  const normalizedItems = useMemo(
    () =>
      items.map(item =>
        item.id || item.clientRowKey
          ? item
          : {
              ...item,
              clientRowKey: `line:draft:${(draftRowKeyCounterRef.current += 1)}`,
            }
      ),
    [items]
  );

  const selectedRowIds = selectionSet?.selectedRowIds ?? new Set<string>();
  const selectedCount = selectedRowIds.size;
  const rowIds = useMemo(
    () =>
      normalizedItems.map((item, index) =>
        getDocumentLineItemRowId(item, index)
      ),
    [normalizedItems]
  );

  const columnDefs = useMemo<ColDef<LineItem>[]>(
    () => [
      {
        field: "productDisplayName",
        headerName: "Product",
        minWidth: 180,
        flex: 1.2,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data?: LineItem }) => {
          const row = params.data;
          if (!row) {
            return "";
          }

          const identity = productIdentityByBatchId[row.batchId];

          return (
            <div className="flex min-w-0 flex-col py-0.5">
              <span className="truncate font-medium">
                {row.productDisplayName || "Unknown Product"}
              </span>
              {identity?.secondary ? (
                <span className="truncate text-[10px] text-muted-foreground">
                  {identity.secondary}
                </span>
              ) : null}
              {identity?.tertiary ? (
                <span className="truncate text-[10px] text-muted-foreground/80">
                  {identity.tertiary}
                </span>
              ) : null}
            </div>
          );
        },
        cellClass: buildDocumentCellClass("productDisplayName"),
        suppressPaste: true,
        suppressFillHandle: true,
        headerTooltip: "Locked: derived from the selected inventory item.",
      },
      {
        field: "batchSku",
        headerName: "Batch",
        minWidth: 120,
        sortable: false,
        filter: false,
        cellClass: buildDocumentCellClass("batchSku"),
        suppressPaste: true,
        suppressFillHandle: true,
        headerTooltip: "Locked: use the inventory browser to change batch.",
      },
      {
        field: "quantity",
        headerName: "Qty",
        minWidth: 90,
        editable: true,
        singleClickEdit: true,
        sortable: false,
        filter: false,
        cellClass: buildDocumentCellClass("quantity"),
        ...getSpreadsheetWriteGuards("quantity"),
        headerTooltip: "Editable: spreadsheet-safe quantity input.",
      },
      {
        field: "cogsPerUnit",
        headerName: "COGS / Unit",
        minWidth: 120,
        hide: !showCogsColumn,
        editable: true,
        singleClickEdit: true,
        sortable: false,
        filter: false,
        cellClass: buildDocumentCellClass("cogsPerUnit"),
        ...getSpreadsheetWriteGuards("cogsPerUnit"),
        headerTooltip: "Editable: spreadsheet-safe COGS override input.",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "marginPercent",
        headerName: "Margin %",
        minWidth: 110,
        hide: !showMarginColumn,
        editable: true,
        singleClickEdit: true,
        sortable: false,
        filter: false,
        cellClass: buildDocumentCellClass("marginPercent"),
        ...getSpreadsheetWriteGuards("marginPercent"),
        headerTooltip: "Editable: spreadsheet-safe margin input.",
        valueFormatter: params => formatPercent(Number(params.value ?? 0)),
      },
      {
        field: "unitPrice",
        headerName: "Price / Unit",
        minWidth: 120,
        editable: true,
        singleClickEdit: true,
        sortable: false,
        filter: false,
        cellClass: buildDocumentCellClass("unitPrice"),
        ...getSpreadsheetWriteGuards("unitPrice"),
        headerTooltip: "Editable: spreadsheet-safe unit price input.",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "lineTotal",
        headerName: "Line Total",
        minWidth: 120,
        sortable: false,
        filter: false,
        cellClass: buildDocumentCellClass("lineTotal"),
        suppressPaste: true,
        suppressFillHandle: true,
        headerTooltip: "Locked: recalculated from quantity, COGS, and pricing.",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "isSample",
        headerName: "Sample",
        minWidth: 95,
        editable: true,
        singleClickEdit: true,
        sortable: false,
        filter: false,
        cellClass: buildDocumentCellClass("isSample"),
        ...getSpreadsheetWriteGuards("isSample"),
        headerTooltip: "Editable: spreadsheet-safe sample flag.",
        valueFormatter: params => (params.value ? "Yes" : "No"),
      },
    ],
    [productIdentityByBatchId, showCogsColumn, showMarginColumn]
  );

  const notifyEditToast = (level: "warning" | "error", message: string) => {
    const now = Date.now();
    const toastKey = `${level}:${message}`;
    if (
      toastKey !== lastToastKeyRef.current ||
      now - lastToastTimeRef.current > 300
    ) {
      if (level === "warning") {
        toast.warning(message);
      } else {
        toast.error(message);
      }
      lastToastKeyRef.current = toastKey;
      lastToastTimeRef.current = now;
    }
  };

  const updateBlockedEdit = (rejection: PowersheetEditRejection) => {
    setLastEditRejection(rejection);
    notifyEditToast("warning", rejection.message);
  };

  const handleCellValueChanged = (event: CellValueChangedEvent<LineItem>) => {
    const rowIndex = event.rowIndex;
    const columnKey = event.colDef.field;
    if (rowIndex === null || rowIndex === undefined || !columnKey) {
      return;
    }

    const currentRowId = getDocumentLineItemRowId(
      event.data ?? normalizedItems[rowIndex] ?? items[rowIndex],
      rowIndex
    );
    const targetIndex = rowIds.findIndex(rowId => rowId === currentRowId);
    const currentItem =
      pasteBufferRef.current?.[targetIndex] ?? normalizedItems[targetIndex];
    if (!currentItem) {
      return;
    }

    const editableField = columnKey as OrdersDocumentEditableField;
    const { nextItem, rejection } = normalizeDocumentLineItemEdit(
      currentItem,
      editableField as OrdersDocumentEditableField | (keyof LineItem & string),
      event.newValue
    );

    if (rejection || !nextItem) {
      setLastEditRejection(rejection);
      if (rejection) {
        notifyEditToast("error", rejection.message);
      }
      if (pasteInProgressRef.current) {
        return;
      }
      const revertedItems = [...normalizedItems];
      revertedItems[targetIndex] = {
        ...currentItem,
        [editableField]: getRevertedEditableFieldValue(
          currentItem,
          editableField,
          event.oldValue
        ),
      };
      onChange(revertedItems);
      return;
    }

    if (pasteInProgressRef.current && pasteBufferRef.current) {
      const nextBufferedItems = [...pasteBufferRef.current];
      nextBufferedItems[targetIndex] = nextItem;
      pasteBufferRef.current = nextBufferedItems;
      pasteDirtyRef.current = true;
      setLastEditRejection(null);
      return;
    }

    const nextItems = [...normalizedItems];
    nextItems[targetIndex] = nextItem;
    setLastEditRejection(null);
    onChange(nextItems);
  };

  const handleProcessCellFromClipboard = (
    params: ProcessCellForExportParams<LineItem>
  ) => {
    const columnKey = params.column.getColId();
    const fieldPolicy = getFieldPolicy(columnKey);

    if (!fieldPolicy || !fieldPolicy.pasteAllowed) {
      updateBlockedEdit(
        createPowersheetEditRejection(
          columnKey,
          "paste-disallowed",
          "Paste is only allowed into approved editable document fields."
        )
      );
      return getClipboardFallbackValue(params);
    }

    if (columnKey === "isSample") {
      const normalized = normalizeSampleClipboardValue(params.value);
      if (normalized === null) {
        updateBlockedEdit(
          createPowersheetEditRejection(
            columnKey,
            "invalid-value",
            "Sample values must be true/false, yes/no, or 1/0."
          )
        );
        return getClipboardFallbackValue(params);
      }

      return normalized;
    }

    if (columnKey === "quantity") {
      const normalized = parsePositiveInteger(String(params.value ?? ""));
      if (normalized === null) {
        updateBlockedEdit(
          createPowersheetEditRejection(
            columnKey,
            "invalid-value",
            "Quantity must be a positive whole number."
          )
        );
        return getClipboardFallbackValue(params);
      }

      return normalized;
    }

    const normalizedNumber = parseFiniteNumber(params.value);
    if (normalizedNumber === null) {
      updateBlockedEdit(
        createPowersheetEditRejection(
          columnKey,
          "invalid-value",
          "Pasted values must be valid numbers for this field."
        )
      );
      return getClipboardFallbackValue(params);
    }

    const currentItem = params.node?.data;
    if (currentItem) {
      const validation = normalizeDocumentLineItemEdit(
        currentItem,
        columnKey as OrdersDocumentEditableField,
        normalizedNumber
      );
      if (validation.rejection) {
        updateBlockedEdit(validation.rejection);
        return getClipboardFallbackValue(params);
      }
    }

    return normalizedNumber;
  };

  const handleProcessDataFromClipboard = (
    params: ProcessDataFromClipboardParams<LineItem>
  ) => {
    const focusedColumnKey = selectionSet?.focusedCell?.columnKey;
    if (!focusedColumnKey) {
      updateBlockedEdit(
        createPowersheetEditRejection(
          "clipboard",
          "paste-disallowed",
          "Select an editable document cell before pasting."
        )
      );
      return null;
    }

    const fieldPolicy = getFieldPolicy(focusedColumnKey);
    if (!fieldPolicy || !fieldPolicy.pasteAllowed) {
      updateBlockedEdit(
        createPowersheetEditRejection(
          focusedColumnKey,
          "paste-disallowed",
          "Paste is only allowed into approved editable document fields."
        )
      );
      return null;
    }

    const focusedColumnIndex = documentGridColumnOrder.findIndex(
      columnKey => columnKey === focusedColumnKey
    );
    const pasteWidth = Math.max(...params.data.map(row => row.length), 0);
    if (focusedColumnIndex < 0 || pasteWidth === 0) {
      return null;
    }

    const targetColumns = documentGridColumnOrder.slice(
      focusedColumnIndex,
      focusedColumnIndex + pasteWidth
    );
    if (targetColumns.length < pasteWidth) {
      updateBlockedEdit(
        createPowersheetEditRejection(
          focusedColumnKey,
          "paste-disallowed",
          "Paste range extends beyond the editable document columns."
        )
      );
      return null;
    }

    const blockedTargetColumn = targetColumns.find(columnKey => {
      const policy = getFieldPolicy(columnKey);
      return !policy || !policy.pasteAllowed;
    });
    if (blockedTargetColumn) {
      updateBlockedEdit(
        createPowersheetEditRejection(
          blockedTargetColumn,
          "paste-disallowed",
          "Paste range includes locked or workflow-owned document columns."
        )
      );
      return null;
    }

    setLastEditRejection(null);
    return params.data;
  };

  const handleSendToClipboard = (_params: SendToClipboardParams<LineItem>) => {
    setLastEditRejection(null);
  };

  const handlePasteStart = (_event: PasteStartEvent<LineItem>) => {
    pasteInProgressRef.current = true;
    pasteDirtyRef.current = false;
    pasteBufferRef.current = normalizedItems.map(item => ({ ...item }));
    setLastEditRejection(null);
  };

  const handlePasteEnd = (_event: PasteEndEvent<LineItem>) => {
    const bufferedItems = pasteBufferRef.current;
    const shouldWriteBufferedPaste =
      pasteInProgressRef.current && pasteDirtyRef.current && bufferedItems;

    pasteInProgressRef.current = false;
    pasteDirtyRef.current = false;
    pasteBufferRef.current = null;

    if (shouldWriteBufferedPaste) {
      onChange(bufferedItems);
    }
  };

  const handleSuppressKeyboardEvent = (
    params: SuppressKeyboardEventParams<LineItem>
  ) => {
    const key = params.event.key;
    const isDeleteShortcut = key === "Backspace" || key === "Delete";
    const isCutShortcut =
      (params.event.metaKey || params.event.ctrlKey) &&
      key.toLowerCase() === "x";

    if (!isDeleteShortcut && !isCutShortcut) {
      if (key === "Escape") {
        setLastEditRejection(null);
      }
      return false;
    }

    if (params.editing) {
      return false;
    }

    const blockedColumnKey = getBlockedDocumentColumnForAction(
      selectionSet,
      "singleEditAllowed",
      params.column.getColId()
    );
    if (!blockedColumnKey) {
      return false;
    }

    updateBlockedEdit(
      createPowersheetEditRejection(
        blockedColumnKey,
        "workflow-owned",
        isCutShortcut
          ? "Cut is only allowed in approved editable document fields."
          : "Clear and delete are only allowed in approved editable document fields."
      )
    );
    return true;
  };

  const handleFillStart = (_event: FillStartEvent<LineItem>) => {
    const blockedColumnKey = getBlockedDocumentColumnForAction(
      selectionSet,
      "fillAllowed"
    );
    if (!blockedColumnKey) {
      fillSnapshotRef.current = new Map(
        normalizedItems.map((item, index) => [
          getDocumentLineItemRowId(item, index),
          { ...item },
        ])
      );
      setLastEditRejection(null);
      return;
    }

    updateBlockedEdit(
      createPowersheetEditRejection(
        blockedColumnKey,
        "fill-disallowed",
        "Fill is only allowed in approved editable document fields."
      )
    );
  };

  const handleFillEnd = (event: FillEndEvent<LineItem>) => {
    const fillSnapshot = fillSnapshotRef.current;
    fillSnapshotRef.current = null;

    if (!fillSnapshot) {
      return;
    }

    const filledRowsById = readGridLineItemsByRowId(event.api);
    if (filledRowsById.size === 0) {
      return;
    }

    let rejection: PowersheetEditRejection | null = null;

    const nextItems = normalizedItems.map((item, rowIndex) => {
      const rowId = getDocumentLineItemRowId(item, rowIndex);
      const previousRow = fillSnapshot.get(rowId) ?? item;
      const currentRow = filledRowsById.get(rowId) ?? previousRow;

      let nextRow = { ...currentRow };
      for (const field of editableDocumentFields) {
        if (nextRow[field] === previousRow[field]) {
          continue;
        }

        const normalized = normalizeDocumentLineItemEdit(
          nextRow,
          field,
          nextRow[field]
        );
        if (normalized.rejection || !normalized.nextItem) {
          rejection = normalized.rejection;
          return previousRow;
        }
        nextRow = normalized.nextItem;
      }

      return nextRow;
    });

    setLastEditRejection(rejection);
    if (!rejection) {
      onChange(nextItems);
    }
  };

  const handleCellSelectionDeleteStart = (
    _event: CellSelectionDeleteStartEvent<LineItem>
  ) => {
    const blockedColumnKey = getBlockedDocumentColumnForAction(
      selectionSet,
      "singleEditAllowed"
    );
    if (!blockedColumnKey) {
      return;
    }

    updateBlockedEdit(
      createPowersheetEditRejection(
        blockedColumnKey,
        "workflow-owned",
        "Clear and delete are only allowed in approved editable document fields."
      )
    );
  };

  const suppressCutToClipboard = Boolean(
    getBlockedDocumentColumnForAction(selectionSet, "singleEditAllowed")
  );

  const handleDuplicateSelected = () => {
    const nextItems = duplicateSelectedRows({
      rows: normalizedItems,
      selectedRowIds,
      getRowId: row => getDocumentLineItemRowId(row),
      duplicateRow: row => ({
        ...row,
        id: undefined,
        clientRowKey: `line:draft:${(draftRowKeyCounterRef.current += 1)}`,
      }),
    });
    onChange(nextItems);
  };

  const handleDeleteSelected = () => {
    const nextItems = deleteSelectedRows({
      rows: normalizedItems,
      selectedRowIds,
      getRowId: row => getDocumentLineItemRowId(row),
      minimumRows: 0,
    });
    onChange(nextItems);
  };

  const handleClearSamples = () => {
    const nextItems = clearFieldValueForSelectedRows({
      rows: normalizedItems,
      selectedRowIds,
      getRowId: row => getDocumentLineItemRowId(row),
      field: "isSample",
      value: false,
    });
    onChange(nextItems);
  };

  const handleFillPriceDown = () => {
    if (selectedRowIds.size < 2) {
      return;
    }

    const sourceUnitPrice = getFocusedSelectionValue(
      selectionSet,
      selectedRowIds,
      normalizedItems,
      "unitPrice"
    );

    const rowsWithFilledPrice = applyFieldValueToSelectedRows({
      rows: normalizedItems,
      selectedRowIds,
      getRowId: row => getDocumentLineItemRowId(row),
      field: "unitPrice",
      value: typeof sourceUnitPrice === "number" ? sourceUnitPrice : 0,
    });

    const recalculatedRows = rowsWithFilledPrice.map((item, index) =>
      selectedRowIds.has(rowIds[index] ?? "")
        ? {
            ...item,
            ...calculateLineItemFromRetailPrice(
              item.batchId,
              item.quantity,
              item.cogsPerUnit,
              item.unitPrice
            ),
            isMarginOverridden: true,
            marginSource: "MANUAL" as const,
          }
        : item
    );

    onChange(recalculatedRows);
  };

  const headerActions: ReactNode = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleFillPriceDown}
        disabled={selectedCount < 2}
      >
        Fill Price
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleClearSamples}
        disabled={selectedCount === 0}
      >
        <CopyX className="mr-2 h-4 w-4" />
        Clear Samples
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDuplicateSelected}
        disabled={selectedCount === 0}
      >
        Duplicate
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDeleteSelected}
        disabled={selectedCount === 0}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    </div>
  );

  const summary = lastEditRejection ? (
    <span>Blocked: {lastEditRejection.message}</span>
  ) : undefined;

  return (
    <PowersheetGrid
      surfaceId="orders-document-grid"
      requirementIds={[
        "ORD-WF-003",
        "ORD-WF-004",
        "ORD-WF-005",
        "ORD-WF-006",
        "ORD-WF-009",
      ]}
      affordances={documentAffordances}
      releaseGateIds={[
        "SALE-ORD-020",
        "SALE-ORD-021",
        "SALE-ORD-022",
        "SALE-ORD-029",
        "SALE-ORD-030",
        "SALE-ORD-032",
        "SALE-ORD-035",
      ]}
      title="Line Items"
      rows={normalizedItems}
      columnDefs={columnDefs}
      getRowId={row => getDocumentLineItemRowId(row)}
      selectionMode="cell-range"
      onSelectionSetChange={setSelectionSet}
      onSelectionSummaryChange={setSelectionSummary}
      onCellValueChanged={handleCellValueChanged}
      processCellFromClipboard={handleProcessCellFromClipboard}
      processDataFromClipboard={handleProcessDataFromClipboard}
      sendToClipboard={handleSendToClipboard}
      onPasteStart={handlePasteStart}
      onPasteEnd={handlePasteEnd}
      suppressCutToClipboard={suppressCutToClipboard}
      suppressKeyboardEvent={handleSuppressKeyboardEvent}
      onFillStart={handleFillStart}
      fillHandleOptions={{
        direction: "y",
        setFillValue: getDocumentFillValue,
      }}
      onFillEnd={handleFillEnd}
      onCellSelectionDeleteStart={handleCellSelectionDeleteStart}
      enableFillHandle
      enableUndoRedo
      allowColumnReorder={false}
      enterNavigatesVertically
      enterNavigatesVerticallyAfterEdit
      stopEditingWhenCellsLoseFocus
      headerActions={headerActions}
      summary={summary}
      antiDriftSummary={`Editable fields: ${Object.keys(documentFieldPolicies).join(", ")}. Locked fields stay derived or workflow-owned.`}
      emptyTitle="No line items yet"
      emptyDescription={
        clientId
          ? "Add items from the inventory browser to start spreadsheet editing."
          : "Select a client first, then add items from the inventory browser."
      }
      minHeight={320}
    />
  );
}

export default OrdersDocumentLineItemsGrid;
