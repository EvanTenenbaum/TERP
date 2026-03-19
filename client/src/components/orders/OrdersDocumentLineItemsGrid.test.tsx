/**
 * @vitest-environment jsdom
 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersDocumentLineItemsGrid } from "./OrdersDocumentLineItemsGrid";
import type { LineItem } from "./LineItemTable";

const mockPowersheetGrid = vi.fn(
  ({
    title,
    description,
    summary,
    headerActions,
    onSelectionSetChange,
    onSelectionSummaryChange,
  }: Record<string, unknown>) => {
    const hasEmittedSelection = useRef(false);

    useEffect(() => {
      if (hasEmittedSelection.current) {
        return;
      }

      hasEmittedSelection.current = true;
      onSelectionSetChange?.({
        focusedCell: {
          rowIndex: 1,
          columnKey: "quantity",
        },
        focusedRowId: "line:2",
        anchorCell: {
          rowIndex: 0,
          columnKey: "quantity",
        },
        ranges: [
          {
            anchor: { rowIndex: 0, columnKey: "quantity" },
            focus: { rowIndex: 1, columnKey: "unitPrice" },
          },
        ],
        selectedRowIds: new Set(["line:1", "line:2"]),
      });
      onSelectionSummaryChange?.({
        selectedCellCount: 4,
        selectedRowCount: 2,
        hasDiscontiguousSelection: false,
        focusedSurface: "orders-document-grid",
      });
    }, [onSelectionSetChange, onSelectionSummaryChange]);

    return (
      <div>
        <h2>{title as string}</h2>
        <p>{description as string}</p>
        <div>{summary as ReactNode}</div>
        <div>{headerActions as ReactNode}</div>
      </div>
    );
  }
);

vi.mock("@/components/spreadsheet-native/PowersheetGrid", () => ({
  PowersheetGrid: (props: Record<string, unknown>) => mockPowersheetGrid(props),
}));

const { mockToastError } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

const buildLineItem = (overrides: Partial<LineItem> = {}): LineItem => ({
  id: overrides.id,
  batchId: 1001,
  batchSku: "LOT-001",
  productId: 11,
  productDisplayName: "Blue Dream 3.5g",
  quantity: 2,
  cogsPerUnit: 10,
  originalCogsPerUnit: 10,
  isCogsOverridden: false,
  marginPercent: 25,
  marginDollar: 2.5,
  isMarginOverridden: false,
  marginSource: "DEFAULT",
  appliedRules: [],
  unitPrice: 12.5,
  lineTotal: 25,
  isSample: false,
  ...overrides,
});

describe("OrdersDocumentLineItemsGrid", () => {
  beforeEach(() => {
    mockPowersheetGrid.mockClear();
    mockToastError.mockReset();
  });

  it("arms the document grid with spreadsheet runtime behaviors and row actions", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1 }),
          buildLineItem({ id: 2, batchId: 2002, productId: 22 }),
        ]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    expect(call?.surfaceId).toBe("orders-document-grid");
    expect(call?.selectionMode).toBe("cell-range");
    expect(call?.enableFillHandle).toBe(true);
    expect(call?.enableUndoRedo).toBe(true);
    expect(call?.allowColumnReorder).toBe(false);
    expect(call?.enterNavigatesVertically).toBe(true);
    expect(call?.enterNavigatesVerticallyAfterEdit).toBe(true);
    expect(call?.processCellFromClipboard).toBeTypeOf("function");
    expect(call?.processDataFromClipboard).toBeTypeOf("function");
    expect(call?.sendToClipboard).toBeTypeOf("function");
    expect(call?.suppressKeyboardEvent).toBeTypeOf("function");
    expect(call?.fillHandleOptions).toMatchObject({
      direction: "y",
    });
    expect(call?.fillHandleOptions.setFillValue).toBeTypeOf("function");
    expect(call?.suppressCutToClipboard).toBe(false);
    expect(call?.releaseGateIds).toContain("SALE-ORD-020");
    expect(call?.releaseGateIds).toContain("SALE-ORD-021");
    expect(call?.releaseGateIds).toContain("SALE-ORD-035");
    expect(call?.columnDefs[0].cellClass).toBe(
      "orders-document-grid__locked-cell"
    );
    expect(call?.columnDefs[0].suppressPaste).toBe(true);
    expect(call?.columnDefs[0].suppressFillHandle).toBe(true);
    expect(call?.columnDefs[0].sortable).toBe(false);
    expect(call?.columnDefs[0].filter).toBe(false);
    expect(call?.columnDefs[2].cellClass).toBe(
      "orders-document-grid__editable-cell"
    );
    expect(call?.columnDefs[2].suppressPaste).toBe(false);
    expect(call?.columnDefs[2].suppressFillHandle).toBe(false);
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /fill price/i })).toBeEnabled();
    expect(screen.getByText(/4 selected cells/i)).toBeInTheDocument();
  });

  it("uses a deterministic vertical fill callback for approved document fields", () => {
    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1 }),
          buildLineItem({ id: 2, batchId: 2002, productId: 22 }),
        ]}
        onChange={vi.fn()}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    const setFillValue = call?.fillHandleOptions?.setFillValue as (
      params: Record<string, unknown>
    ) => unknown;

    expect(
      setFillValue({
        column: { getColId: () => "quantity" },
        initialValues: [3, 4],
        currentIndex: 0,
        currentCellValue: 1,
      })
    ).toBe(5);
    expect(
      setFillValue({
        column: { getColId: () => "quantity" },
        initialValues: [3, 4],
        currentIndex: 1,
        currentCellValue: 1,
      })
    ).toBe(6);
    expect(
      setFillValue({
        column: { getColId: () => "isSample" },
        initialValues: [true, false],
        currentIndex: 0,
        currentCellValue: false,
      })
    ).toBe(true);
    expect(
      setFillValue({
        column: { getColId: () => "productDisplayName" },
        initialValues: ["Locked"],
        currentIndex: 0,
        currentCellValue: "Locked",
      })
    ).toBe("Locked");
  });

  it("uses the focused selected row as the fill source for price propagation", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1, unitPrice: 12.5, lineTotal: 25 }),
          buildLineItem({
            id: 2,
            batchId: 2002,
            productId: 22,
            unitPrice: 30,
            lineTotal: 60,
          }),
        ]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /fill price/i }));

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].unitPrice).toBe(30);
    expect(nextItems[1].unitPrice).toBe(30);
    expect(nextItems[0].lineTotal).toBe(60);
  });

  it("uses the focused row id instead of display index when filling prices", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1, unitPrice: 12.5, lineTotal: 25 }),
          buildLineItem({
            id: 2,
            batchId: 2002,
            productId: 22,
            unitPrice: 30,
            lineTotal: 60,
          }),
        ]}
        onChange={onChange}
      />
    );

    const initialCall =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];

    act(() => {
      initialCall?.onSelectionSetChange?.({
        focusedCell: {
          rowIndex: 0,
          columnKey: "quantity",
        },
        focusedRowId: "line:2",
        anchorCell: {
          rowIndex: 0,
          columnKey: "quantity",
        },
        ranges: [
          {
            anchor: { rowIndex: 0, columnKey: "quantity" },
            focus: { rowIndex: 1, columnKey: "unitPrice" },
          },
        ],
        selectedRowIds: new Set(["line:1", "line:2"]),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /fill price/i }));

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].unitPrice).toBe(30);
    expect(nextItems[1].unitPrice).toBe(30);
  });

  it("recalculates line items when spreadsheet edits change an approved field", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1 }),
          buildLineItem({ id: 2, batchId: 2002, productId: 22 }),
        ]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "quantity" },
      newValue: "5",
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].quantity).toBe(5);
    expect(nextItems[0].lineTotal).toBe(62.5);
    expect(nextItems[1].quantity).toBe(2);
  });

  it("persists fill-handle edits back into document state on fill end", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1, quantity: 3, lineTotal: 37.5 }),
          buildLineItem({
            id: 2,
            batchId: 2002,
            productId: 22,
            quantity: 4,
            lineTotal: 50,
          }),
          buildLineItem({
            id: 3,
            batchId: 3003,
            productId: 33,
            quantity: 1,
            lineTotal: 12.5,
          }),
        ]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    act(() => {
      call?.onFillStart?.({});
      call?.onFillEnd?.({
        api: {
          forEachNode: (
            iterate: (node: { data: LineItem }) => void
          ) => {
            iterate({ data: buildLineItem({ id: 1, quantity: 3 }) });
            iterate({
              data: buildLineItem({
                id: 2,
                batchId: 2002,
                productId: 22,
                quantity: 4,
              }),
            });
            iterate({
              data: buildLineItem({
                id: 3,
                batchId: 3003,
                productId: 33,
                quantity: 5,
              }),
            });
          },
        },
      });
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[2].quantity).toBe(5);
    expect(nextItems[2].unitPrice).toBe(12.5);
    expect(nextItems[2].lineTotal).toBe(62.5);
  });

  it("preserves row pricing when multi-row quantity writeback lands through fill end", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1, quantity: 2, unitPrice: 12.5, lineTotal: 25 }),
          buildLineItem({
            id: 2,
            batchId: 2002,
            productId: 22,
            quantity: 3,
            unitPrice: 18.75,
            lineTotal: 56.25,
          }),
          buildLineItem({
            id: 3,
            batchId: 3003,
            productId: 33,
            quantity: 4,
            unitPrice: 21.5,
            lineTotal: 86,
          }),
        ]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    act(() => {
      call?.onFillStart?.({});
      call?.onFillEnd?.({
        api: {
          forEachNode: (iterate: (node: { data: LineItem }) => void) => {
            iterate({
              data: buildLineItem({
                id: 1,
                quantity: 5,
                unitPrice: 12.5,
                lineTotal: 62.5,
              }),
            });
            iterate({
              data: buildLineItem({
                id: 2,
                batchId: 2002,
                productId: 22,
                quantity: 6,
                unitPrice: 18.75,
                lineTotal: 112.5,
              }),
            });
            iterate({
              data: buildLineItem({
                id: 3,
                batchId: 3003,
                productId: 33,
                quantity: 4,
                unitPrice: 21.5,
                lineTotal: 86,
              }),
            });
          },
        },
      });
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].quantity).toBe(5);
    expect(nextItems[0].unitPrice).toBe(12.5);
    expect(nextItems[0].lineTotal).toBe(62.5);
    expect(nextItems[1].quantity).toBe(6);
    expect(nextItems[1].unitPrice).toBe(18.75);
    expect(nextItems[1].lineTotal).toBe(112.5);
    expect(nextItems[2].quantity).toBe(4);
    expect(nextItems[2].unitPrice).toBe(21.5);
    expect(nextItems[2].lineTotal).toBe(86);
  });

  it("keeps hidden rows and original order stable when fill writeback follows grid display order", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1, quantity: 3, lineTotal: 37.5 }),
          buildLineItem({
            id: 2,
            batchId: 2002,
            productId: 22,
            quantity: 4,
            lineTotal: 50,
          }),
          buildLineItem({
            id: 3,
            batchId: 3003,
            productId: 33,
            quantity: 1,
            lineTotal: 12.5,
          }),
        ]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    act(() => {
      call?.onFillStart?.({});
      call?.onFillEnd?.({
        api: {
          forEachNode: (iterate: (node: { data: LineItem }) => void) => {
            iterate({
              data: buildLineItem({
                id: 3,
                batchId: 3003,
                productId: 33,
                quantity: 5,
              }),
            });
            iterate({ data: buildLineItem({ id: 1, quantity: 3 }) });
          },
        },
      });
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems.map(item => item.id)).toEqual([1, 2, 3]);
    expect(nextItems[1].quantity).toBe(4);
    expect(nextItems[2].quantity).toBe(5);
    expect(nextItems[2].lineTotal).toBe(62.5);
  });

  it("reverts rejected inline edits back to the last valid line-item state", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, quantity: 2, lineTotal: 25 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "quantity" },
      oldValue: 2,
      newValue: "-2",
      data: buildLineItem({ id: 1, quantity: -2, lineTotal: -25 }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].quantity).toBe(2);
    expect(nextItems[0].lineTotal).toBe(25);
    expect(mockToastError).toHaveBeenCalledWith(
      "Quantity must be a positive whole number."
    );
  });

  it("blocks invalid clipboard edits on approved fields and surfaces the rejection", () => {
    const onChange = vi.fn();
    mockToastError.mockReset();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    act(() => {
      const nextValue = call?.processCellFromClipboard?.({
        value: "-2",
        column: { getColId: () => "quantity" },
        node: { data: buildLineItem({ id: 1, quantity: 2 }) },
      });
      expect(nextValue).toBe(2);
    });

    expect(
      screen.getByText(/blocked: Quantity must be a positive whole number./i)
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects paste rectangles that spill into locked document columns", async () => {
    const onChange = vi.fn();
    mockToastError.mockReset();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={onChange}
      />
    );

    await act(async () => {});
    const call =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];
    act(() => {
      const result = call?.processDataFromClipboard?.({
        data: [["12", "13", "14", "15", "16"]],
      });
      expect(result).toBeNull();
    });

    expect(
      screen.getByText(
        /blocked: Paste range includes locked or workflow-owned document columns./i
      )
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("suppresses cut shortcuts when the current selection includes locked document columns", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={onChange}
      />
    );

    const initialCall =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];

    act(() => {
      initialCall?.onSelectionSetChange?.({
        focusedCell: {
          rowIndex: 0,
          columnKey: "lineTotal",
        },
        focusedRowId: "line:1",
        anchorCell: {
          rowIndex: 0,
          columnKey: "quantity",
        },
        ranges: [
          {
            anchor: { rowIndex: 0, columnKey: "quantity" },
            focus: { rowIndex: 0, columnKey: "lineTotal" },
          },
        ],
        selectedRowIds: new Set(["line:1"]),
      });
    });

    const latestCall =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];
    expect(latestCall?.suppressCutToClipboard).toBe(true);

    let suppressed: boolean | undefined;
    act(() => {
      suppressed = latestCall?.suppressKeyboardEvent?.({
        event: new KeyboardEvent("keydown", {
          key: "x",
          ctrlKey: true,
        }),
        editing: false,
        column: { getColId: () => "lineTotal" },
      });
    });

    expect(suppressed).toBe(true);
    expect(
      screen.getByText(/blocked: Cut is only allowed in approved editable/i)
    ).toBeInTheDocument();
  });

  it("suppresses delete shortcuts when the current selection includes locked document columns", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={onChange}
      />
    );

    const initialCall =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];

    act(() => {
      initialCall?.onSelectionSetChange?.({
        focusedCell: {
          rowIndex: 0,
          columnKey: "productDisplayName",
        },
        focusedRowId: "line:1",
        anchorCell: {
          rowIndex: 0,
          columnKey: "productDisplayName",
        },
        ranges: [],
        selectedRowIds: new Set(["line:1"]),
      });
    });

    const latestCall =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];
    let suppressed: boolean | undefined;
    act(() => {
      suppressed = latestCall?.suppressKeyboardEvent?.({
        event: new KeyboardEvent("keydown", {
          key: "Delete",
        }),
        editing: false,
        column: { getColId: () => "productDisplayName" },
      });
    });

    expect(suppressed).toBe(true);
    expect(
      screen.getByText(
        /blocked: Clear and delete are only allowed in approved editable/i
      )
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("surfaces a blocked fill message when selection reaches locked document columns", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={onChange}
      />
    );

    const initialCall =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];

    act(() => {
      initialCall?.onSelectionSetChange?.({
        focusedCell: {
          rowIndex: 0,
          columnKey: "lineTotal",
        },
        focusedRowId: "line:1",
        anchorCell: {
          rowIndex: 0,
          columnKey: "quantity",
        },
        ranges: [
          {
            anchor: { rowIndex: 0, columnKey: "quantity" },
            focus: { rowIndex: 0, columnKey: "lineTotal" },
          },
        ],
        selectedRowIds: new Set(["line:1"]),
      });
    });

    const latestCall =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];

    act(() => {
      latestCall?.onFillStart?.({});
    });

    expect(
      screen.getByText(/blocked: Fill is only allowed in approved editable/i)
    ).toBeInTheDocument();
  });

  it("fills price, clears samples, and delegates add-item insertion without replacing orchestration", () => {
    const onChange = vi.fn();
    const onAddItem = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1, isSample: true, unitPrice: 14 }),
          buildLineItem({
            id: 2,
            batchId: 2002,
            productId: 22,
            isSample: true,
            unitPrice: 18,
          }),
        ]}
        onChange={onChange}
        onAddItem={onAddItem}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /fill price/i }));
    const filled = onChange.mock.calls[0][0] as LineItem[];
    expect(filled[0].unitPrice).toBe(18);
    expect(filled[1].unitPrice).toBe(18);

    fireEvent.click(screen.getByRole("button", { name: /clear samples/i }));
    const cleared = onChange.mock.calls[1][0] as LineItem[];
    expect(cleared.every(item => item.isSample === false)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    expect(onAddItem).toHaveBeenCalledTimes(1);
  });

  it("duplicates and deletes selected rows through the shared row operations", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1 }),
          buildLineItem({ id: 2, batchId: 2002, productId: 22 }),
        ]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    const duplicated = onChange.mock.calls[0][0] as LineItem[];
    expect(duplicated).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    const deleted = onChange.mock.calls[1][0] as LineItem[];
    expect(deleted).toHaveLength(0);
  });
});
