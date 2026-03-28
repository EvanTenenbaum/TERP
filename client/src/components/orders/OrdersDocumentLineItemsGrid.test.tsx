/**
 * @vitest-environment jsdom
 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersDocumentLineItemsGrid } from "./OrdersDocumentLineItemsGrid";
import type { LineItem } from "./types";

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

const { mockToastError, mockToastWarning } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    warning: mockToastWarning,
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
    mockToastWarning.mockReset();
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
    expect(call?.columnDefs[0].cellClass).toBe("powersheet-cell--locked");
    expect(call?.columnDefs[0].suppressPaste).toBe(true);
    expect(call?.columnDefs[0].suppressFillHandle).toBe(true);
    expect(call?.columnDefs[0].sortable).toBe(false);
    expect(call?.columnDefs[0].filter).toBe(false);
    expect(call?.columnDefs[2].cellClass).toBe("powersheet-cell--editable");
    expect(call?.columnDefs[2].suppressPaste).toBe(false);
    expect(call?.columnDefs[2].suppressFillHandle).toBe(false);
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /fill price/i })).toBeEnabled();
    expect(screen.getByText(/4 selected cells/i)).toBeInTheDocument();
  });

  it("hides COGS and margin columns when cost visibility is disabled", () => {
    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={vi.fn()}
        showCogsColumn={false}
        showMarginColumn={false}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    const cogsColumn = call?.columnDefs.find(
      (column: { field?: string }) => column.field === "cogsPerUnit"
    );
    const marginColumn = call?.columnDefs.find(
      (column: { field?: string }) => column.field === "marginPercent"
    );

    expect(cogsColumn?.hide).toBe(true);
    expect(marginColumn?.hide).toBe(true);
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
          forEachNode: (iterate: (node: { data: LineItem }) => void) => {
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
    expect(nextItems[2].lineTotal).toBe(62.5);
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

  it("rejects invalid manual sample edits instead of silently coercing them to false", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, isSample: true })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "isSample" },
      oldValue: true,
      newValue: "maybe",
      data: buildLineItem({ id: 1, isSample: true }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].isSample).toBe(true);
    expect(mockToastError).toHaveBeenCalledWith(
      "Sample values must be true/false, yes/no, or 1/0."
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
    expect(mockToastWarning).toHaveBeenCalledWith(
      "Quantity must be a positive whole number."
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("dedupes repeated blocked warning toasts inside the 300ms guard window", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000);

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={vi.fn()}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    const attemptInvalidSamplePaste = () =>
      call?.processCellFromClipboard?.({
        value: "maybe",
        column: { getColId: () => "isSample" },
        node: { data: buildLineItem({ id: 1, isSample: false }) },
      });

    act(() => {
      expect(attemptInvalidSamplePaste()).toBe(false);
      expect(attemptInvalidSamplePaste()).toBe(false);
    });

    expect(mockToastWarning).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(1_401);
    act(() => {
      attemptInvalidSamplePaste();
    });

    expect(mockToastWarning).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it("rejects pasted negative numeric values before grid writeback", () => {
    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, unitPrice: 12.5 })]}
        onChange={vi.fn()}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    act(() => {
      const nextValue = call?.processCellFromClipboard?.({
        value: "-5",
        column: { getColId: () => "unitPrice" },
        node: { data: buildLineItem({ id: 1, unitPrice: 12.5 }) },
      });
      expect(nextValue).toBe(12.5);
    });

    expect(mockToastWarning).toHaveBeenCalledWith(
      "Unit price must be zero or greater."
    );
  });

  it("buffers paste-driven cell changes and writes back once when the paste finishes", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[
          buildLineItem({ id: 1, quantity: 2, lineTotal: 25 }),
          buildLineItem({
            id: 2,
            batchId: 2002,
            productId: 22,
            quantity: 2,
            unitPrice: 12.5,
            lineTotal: 25,
          }),
        ]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];

    act(() => {
      call?.onPasteStart?.({});
      call?.onCellValueChanged?.({
        rowIndex: 0,
        colDef: { field: "quantity" },
        newValue: "5",
        data: buildLineItem({ id: 1, quantity: 5, lineTotal: 62.5 }),
      });
      call?.onCellValueChanged?.({
        rowIndex: 1,
        colDef: { field: "unitPrice" },
        newValue: "20",
        data: buildLineItem({
          id: 2,
          batchId: 2002,
          productId: 22,
          quantity: 2,
          unitPrice: 20,
          lineTotal: 40,
        }),
      });
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      call?.onPasteEnd?.({});
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].quantity).toBe(5);
    expect(nextItems[0].lineTotal).toBe(62.5);
    expect(nextItems[1].unitPrice).toBe(20);
    expect(nextItems[1].lineTotal).toBe(40);
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
    expect(mockToastWarning).toHaveBeenCalledWith(
      "Paste range includes locked or workflow-owned document columns."
    );
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
    expect(mockToastWarning).toHaveBeenCalledWith(
      "Cut is only allowed in approved editable document fields."
    );
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
    expect(mockToastWarning).toHaveBeenCalledWith(
      "Clear and delete are only allowed in approved editable document fields."
    );
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
    expect(mockToastWarning).toHaveBeenCalledWith(
      "Fill is only allowed in approved editable document fields."
    );
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

  it("reverts fill-end when a filled value fails field validation", () => {
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
            iterate({ data: buildLineItem({ id: 1, quantity: 3 }) });
            iterate({
              data: buildLineItem({
                id: 2,
                batchId: 2002,
                productId: 22,
                quantity: -1,
              }),
            });
          },
        },
      });
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(/blocked: Quantity must be a positive whole number./i)
    ).toBeInTheDocument();
  });

  it("rejects invalid cogsPerUnit edit and reverts to the previous value", () => {
    const onChange = vi.fn();
    mockToastError.mockReset();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, cogsPerUnit: 10, lineTotal: 25 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "cogsPerUnit" },
      oldValue: 10,
      newValue: "0",
      data: buildLineItem({ id: 1, cogsPerUnit: 0 }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].cogsPerUnit).toBe(10);
    expect(mockToastError).toHaveBeenCalledWith(
      "COGS per unit must be greater than zero."
    );
  });

  it("allows Delete key on approved editable field without suppression", () => {
    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={vi.fn()}
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
        focusedRowId: "line:1",
        anchorCell: {
          rowIndex: 0,
          columnKey: "quantity",
        },
        ranges: [
          {
            anchor: { rowIndex: 0, columnKey: "quantity" },
            focus: { rowIndex: 0, columnKey: "quantity" },
          },
        ],
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
        column: { getColId: () => "quantity" },
      });
    });

    expect(suppressed).toBe(false);
  });

  it("allows Ctrl+X cut on approved-only selection without suppression", () => {
    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={vi.fn()}
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
        focusedRowId: "line:1",
        anchorCell: {
          rowIndex: 0,
          columnKey: "quantity",
        },
        ranges: [
          {
            anchor: { rowIndex: 0, columnKey: "quantity" },
            focus: { rowIndex: 0, columnKey: "cogsPerUnit" },
          },
        ],
        selectedRowIds: new Set(["line:1"]),
      });
    });

    const latestCall =
      mockPowersheetGrid.mock.calls[
        mockPowersheetGrid.mock.calls.length - 1
      ]?.[0];

    expect(latestCall?.suppressCutToClipboard).toBe(false);

    let suppressed: boolean | undefined;
    act(() => {
      suppressed = latestCall?.suppressKeyboardEvent?.({
        event: new KeyboardEvent("keydown", {
          key: "x",
          ctrlKey: true,
        }),
        editing: false,
        column: { getColId: () => "quantity" },
      });
    });

    expect(suppressed).toBe(false);
  });

  it("does not surface rejection for onCellSelectionDeleteStart on editable-only selection", () => {
    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1 })]}
        onChange={vi.fn()}
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
        focusedRowId: "line:1",
        anchorCell: {
          rowIndex: 0,
          columnKey: "quantity",
        },
        ranges: [
          {
            anchor: { rowIndex: 0, columnKey: "quantity" },
            focus: { rowIndex: 0, columnKey: "unitPrice" },
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
      latestCall?.onCellSelectionDeleteStart?.({});
    });

    expect(screen.queryByText(/blocked:/i)).not.toBeInTheDocument();
  });

  it("recalculates margin from retail price when unitPrice is edited through the document adapter", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, cogsPerUnit: 10, quantity: 2 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "unitPrice" },
      oldValue: 12.5,
      newValue: "20",
      data: buildLineItem({ id: 1, unitPrice: 20 }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].unitPrice).toBe(20);
    expect(nextItems[0].lineTotal).toBe(40);
    expect(nextItems[0].marginPercent).toBe(50);
    expect(nextItems[0].isMarginOverridden).toBe(true);
    expect(nextItems[0].marginSource).toBe("MANUAL");
  });

  it("recalculates unit price from margin when marginPercent is edited through the document adapter", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, cogsPerUnit: 10, quantity: 2 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "marginPercent" },
      oldValue: 25,
      newValue: "50",
      data: buildLineItem({ id: 1, marginPercent: 50 }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].marginPercent).toBe(50);
    expect(nextItems[0].unitPrice).toBe(20);
    expect(nextItems[0].lineTotal).toBe(40);
    expect(nextItems[0].isMarginOverridden).toBe(true);
    expect(nextItems[0].marginSource).toBe("MANUAL");
  });

  it("validates unitPrice rejects negative values and reverts", () => {
    const onChange = vi.fn();
    mockToastError.mockReset();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, unitPrice: 12.5 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "unitPrice" },
      oldValue: 12.5,
      newValue: "-5",
      data: buildLineItem({ id: 1, unitPrice: -5 }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].unitPrice).toBe(12.5);
    expect(mockToastError).toHaveBeenCalledWith(
      "Unit price must be zero or greater."
    );
  });

  it("validates marginPercent rejects negative values and reverts", () => {
    const onChange = vi.fn();
    mockToastError.mockReset();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, marginPercent: 25 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "marginPercent" },
      oldValue: 25,
      newValue: "-10",
      data: buildLineItem({ id: 1, marginPercent: -10 }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].marginPercent).toBe(25);
    expect(mockToastError).toHaveBeenCalledWith(
      "Margin percent must be zero or greater."
    );
  });

  it("toggles isSample through the document adapter without affecting pricing", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, isSample: false, unitPrice: 12.5 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "isSample" },
      oldValue: false,
      newValue: true,
      data: buildLineItem({ id: 1, isSample: true }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].isSample).toBe(true);
    expect(nextItems[0].unitPrice).toBe(12.5);
    expect(nextItems[0].lineTotal).toBe(25);
  });

  it("rejects edits on workflow-owned columns with a structured rejection", () => {
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
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "lineTotal" },
      oldValue: 25,
      newValue: "100",
      data: buildLineItem({ id: 1, lineTotal: 100 }),
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "This cell is derived or workflow-owned and cannot be edited directly."
    );
    expect(onChange).toHaveBeenCalled();
  });

  it("normalizes isSample consistently between inline edit and clipboard paths", () => {
    const onChange = vi.fn();

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, isSample: false })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];

    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "isSample" },
      oldValue: false,
      newValue: "yes",
      data: buildLineItem({ id: 1, isSample: false }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].isSample).toBe(true);

    onChange.mockClear();
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "isSample" },
      oldValue: true,
      newValue: "1",
      data: buildLineItem({ id: 1, isSample: true }),
    });

    const nextItems2 = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems2[0].isSample).toBe(true);

    onChange.mockClear();
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "isSample" },
      oldValue: true,
      newValue: "no",
      data: buildLineItem({ id: 1, isSample: true }),
    });

    const nextItems3 = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems3[0].isSample).toBe(false);
  });

  it("rejects marginPercent >= 100 instead of producing incorrect price", () => {
    const onChange = vi.fn();
    const nowSpy = vi.spyOn(Date, "now");
    mockToastError.mockReset();
    nowSpy.mockReturnValue(1_000);

    render(
      <OrdersDocumentLineItemsGrid
        clientId={123}
        items={[buildLineItem({ id: 1, marginPercent: 25 })]}
        onChange={onChange}
      />
    );

    const call = mockPowersheetGrid.mock.calls[0]?.[0];
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "marginPercent" },
      oldValue: 25,
      newValue: "100",
      data: buildLineItem({ id: 1, marginPercent: 100 }),
    });

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].marginPercent).toBe(25);
    expect(mockToastError).toHaveBeenCalledWith(
      "Margin percent must be less than 100."
    );

    onChange.mockClear();
    mockToastError.mockReset();
    nowSpy.mockReturnValue(1_401);
    call?.onCellValueChanged?.({
      rowIndex: 0,
      colDef: { field: "marginPercent" },
      oldValue: 25,
      newValue: "150",
      data: buildLineItem({ id: 1, marginPercent: 150 }),
    });

    const nextItems2 = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems2[0].marginPercent).toBe(25);
    expect(mockToastError).toHaveBeenCalledWith(
      "Margin percent must be less than 100."
    );
    nowSpy.mockRestore();
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
