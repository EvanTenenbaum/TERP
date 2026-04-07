/**
 * @vitest-environment jsdom
 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersSheetPilotSurface } from "./OrdersSheetPilotSurface";

const mockSetLocation = vi.fn();
const mockSetSelectedId = vi.fn();
let mockSelectedId: number | null = 2;
const {
  mockClientsListUseQuery,
  mockOrdersGetAllUseQuery,
  mockOrderDetailUseQuery,
  mockStatusHistoryUseQuery,
  mockAuditLogUseQuery,
  mockDeleteDraftUseMutation,
  mockLedgerListUseQuery,
  mockLinkedInvoiceUseQuery,
  mockDraftsRefetch,
  mockConfirmedRefetch,
  mockDetailRefetch,
  mockStatusHistoryRefetch,
  mockAuditLogRefetch,
  mockLedgerRefetch,
} = vi.hoisted(() => ({
  mockClientsListUseQuery: vi.fn(),
  mockOrdersGetAllUseQuery: vi.fn(),
  mockOrderDetailUseQuery: vi.fn(),
  mockStatusHistoryUseQuery: vi.fn(),
  mockAuditLogUseQuery: vi.fn(),
  mockDeleteDraftUseMutation: vi.fn(),
  mockLedgerListUseQuery: vi.fn(),
  mockLinkedInvoiceUseQuery: vi.fn(),
  mockDraftsRefetch: vi.fn(),
  mockConfirmedRefetch: vi.fn(),
  mockDetailRefetch: vi.fn(),
  mockStatusHistoryRefetch: vi.fn(),
  mockAuditLogRefetch: vi.fn(),
  mockLedgerRefetch: vi.fn(),
}));
let mockSearch = "";
let mockQueueSelectionSummary: {
  selectedCellCount: number;
  selectedRowCount: number;
  hasDiscontiguousSelection: boolean;
  focusedSurface: "orders-queue";
} | null = null;
const mockPowersheetGrid = vi.fn(
  ({
    title,
    description,
    antiDriftSummary,
    summary,
    surfaceId,
    onSelectionSummaryChange,
  }: {
    title: string;
    description?: string;
    antiDriftSummary?: string;
    summary?: ReactNode;
    surfaceId?: string;
    onSelectionSummaryChange?: (summary: {
      selectedCellCount: number;
      selectedRowCount: number;
      hasDiscontiguousSelection: boolean;
      focusedSurface: "orders-queue";
    }) => void;
  }) => {
    const hasEmittedSelectionSummary = useRef(false);

    useEffect(() => {
      if (
        hasEmittedSelectionSummary.current ||
        surfaceId !== "orders-queue" ||
        !mockQueueSelectionSummary
      ) {
        return;
      }

      hasEmittedSelectionSummary.current = true;
      onSelectionSummaryChange?.(mockQueueSelectionSummary);
    }, [onSelectionSummaryChange, surfaceId]);

    return (
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {summary}
        {antiDriftSummary ? <span>{antiDriftSummary}</span> : null}
      </div>
    );
  }
);

vi.mock("wouter", () => ({
  useLocation: () => ["/sales?tab=orders", mockSetLocation],
  useSearch: () => mockSearch,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      list: {
        useQuery: mockClientsListUseQuery.mockImplementation(() => ({
          data: {
            items: [{ id: 1, name: "Atlas Labs" }],
          },
        })),
      },
    },
    orders: {
      getAll: {
        useQuery: mockOrdersGetAllUseQuery.mockImplementation(
          ({ isDraft }: { isDraft: boolean }) => ({
            data: {
              items: isDraft
                ? [
                    {
                      id: 1,
                      orderNumber: "SO-001",
                      clientId: 1,
                      orderType: "SALE",
                      total: "400",
                      items: [
                        {
                          batchId: 10,
                          quantity: 1,
                          unitPrice: 400,
                          unitCogs: 250,
                        },
                      ],
                      lineItems: [{ id: 10 }],
                      createdAt: "2026-03-10T00:00:00.000Z",
                      confirmedAt: null,
                      invoiceId: null,
                      version: 1,
                    },
                  ]
                : [
                    {
                      id: 2,
                      orderNumber: "SO-002",
                      clientId: 1,
                      orderType: "SALE",
                      fulfillmentStatus: "READY_FOR_PACKING",
                      total: "900",
                      lineItems: [{ id: 11 }, { id: 12 }],
                      createdAt: "2026-03-09T00:00:00.000Z",
                      confirmedAt: "2026-03-09T02:00:00.000Z",
                      invoiceId: 55,
                      version: 2,
                    },
                  ],
            },
            isLoading: false,
            error: null,
            refetch: isDraft ? mockDraftsRefetch : mockConfirmedRefetch,
          })
        ),
      },
      getOrderWithLineItems: {
        useQuery: mockOrderDetailUseQuery.mockImplementation(() => ({
          data: {
            order: { id: 2 },
            lineItems: [
              {
                id: 11,
                batchId: 5,
                batchSku: "BATCH-005",
                productDisplayName: "Blue Dream",
                quantity: "2",
                unitPrice: "450",
                lineTotal: "900",
                isSample: false,
              },
            ],
          },
          isLoading: false,
          error: null,
          refetch: mockDetailRefetch,
        })),
      },
      getOrderStatusHistory: {
        useQuery: mockStatusHistoryUseQuery.mockImplementation(() => ({
          data: [{ id: 1 }],
          refetch: mockStatusHistoryRefetch,
        })),
      },
      getAuditLog: {
        useQuery: mockAuditLogUseQuery.mockImplementation(() => ({
          data: [{ id: 1 }],
          refetch: mockAuditLogRefetch,
        })),
      },
      deleteDraftOrder: {
        useMutation: mockDeleteDraftUseMutation.mockImplementation(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
    },
    accounting: {
      invoices: {
        getByReference: {
          useQuery: mockLinkedInvoiceUseQuery.mockImplementation(() => ({
            data: null,
            isLoading: false,
          })),
        },
      },
      ledger: {
        list: {
          useQuery: mockLedgerListUseQuery.mockImplementation(() => ({
            data: { items: [{ id: 1 }] },
            refetch: mockLedgerRefetch,
          })),
        },
      },
    },
    invoices: {
      generateFromOrder: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("@/lib/spreadsheet-native", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/spreadsheet-native")
  >("@/lib/spreadsheet-native");

  return {
    ...actual,
    useSpreadsheetSelectionParam: () => ({
      selectedId: mockSelectedId,
      setSelectedId: mockSetSelectedId,
    }),
  };
});

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: (props: Record<string, unknown>) => mockPowersheetGrid(props),
}));

vi.mock("@/components/spreadsheet-native/SalesOrderSurface", () => ({
  default: () => <div>SalesOrderSurface</div>,
}));

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorSection: ({
    title,
    children,
  }: {
    title: string;
    children?: ReactNode;
  }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
  InspectorField: ({
    label,
    children,
  }: {
    label: string;
    children?: ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({
    left,
    center,
    right,
  }: {
    left?: ReactNode;
    center?: ReactNode;
    right?: ReactNode;
  }) => (
    <div>
      {left}
      {center}
      {right}
    </div>
  ),
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open }: { open?: boolean }) =>
    open ? <div>Confirm Dialog</div> : null,
}));

describe("OrdersSheetPilotSurface", () => {
  const getLatestGridProps = (title: string) =>
    mockPowersheetGrid.mock.calls
      .filter(([props]) => props.title === title)
      .at(-1)?.[0];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = "";
    mockQueueSelectionSummary = null;
    mockSelectedId = 2;
    mockLinkedInvoiceUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  it("renders one dominant queue with linked detail and selection actions", () => {
    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Orders Queue")).toBeInTheDocument();
    expect(screen.getByText("Selected Order Lines")).toBeInTheDocument();
    expect(screen.queryByText("Drafts")).not.toBeInTheDocument();
    expect(screen.queryByText("Confirmed")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /accounting/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /fulfillment/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new order/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new draft/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Issued #55")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /filter drafts/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /filter confirmed/i })
    ).toBeInTheDocument();

    const queueCall = getLatestGridProps("Orders Queue");
    const supportCall = getLatestGridProps("Selected Order Lines");

    expect(queueCall?.selectionMode).toBe("cell-range");
    expect(queueCall?.enableFillHandle).toBe(false);
    expect(queueCall?.enableUndoRedo).toBe(false);
    expect(supportCall?.selectionMode).toBe("cell-range");
    expect(supportCall?.enableFillHandle).toBe(false);
    expect(supportCall?.enableUndoRedo).toBe(false);
    expect(queueCall?.description).toBeUndefined();
    expect(queueCall?.columnDefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ headerName: "Created", field: "createdAt" }),
      ])
    );
    expect(queueCall?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderNumber: "SO-001",
          nextStepLabel: "Confirm",
        }),
      ])
    );
  });

  it("locks row-scoped workflow actions when queue selection spans multiple rows", () => {
    mockQueueSelectionSummary = {
      selectedCellCount: 8,
      selectedRowCount: 2,
      hasDiscontiguousSelection: false,
      focusedSurface: "orders-queue",
    };

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    // Internal "Workflow target:" and guardrail text must not be shown to operators
    expect(screen.queryByText(/workflow target:/i)).not.toBeInTheDocument();
    // Buttons are disabled when multiple rows are selected
    expect(screen.getByRole("button", { name: /new draft/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /accounting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /fulfillment/i })).toBeDisabled();
  });

  it("tolerates detail payloads that omit lineItems without crashing the queue surface", () => {
    mockOrderDetailUseQuery.mockImplementationOnce(() => ({
      data: {
        order: { id: 2 },
        lineItems: undefined,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    const supportCall = mockPowersheetGrid.mock.calls.find(
      ([props]) => props.title === "Selected Order Lines"
    )?.[0];

    expect(screen.getByText("Orders Queue")).toBeInTheDocument();
    expect(supportCall?.rows).toEqual([]);
  });

  it("enables row-scoped workflow actions when queue selection stays within one row (SALE-ORD-034)", () => {
    mockQueueSelectionSummary = {
      selectedCellCount: 4,
      selectedRowCount: 1,
      hasDiscontiguousSelection: false,
      focusedSurface: "orders-queue",
    };

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    // Internal "Workflow target:" text must not be shown to operators
    expect(screen.queryByText(/workflow target:/i)).not.toBeInTheDocument();

    const accountingBtn = screen.getByRole("button", { name: /accounting/i });
    const shippingBtn = screen.getByRole("button", { name: /fulfillment/i });

    expect(accountingBtn).not.toBeDisabled();
    expect(shippingBtn).not.toBeDisabled();
  });

  it("passes the same shared PowersheetGrid contract to queue and support grids (SALE-ORD-023)", () => {
    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    const queueCall = getLatestGridProps("Orders Queue");
    const supportCall = getLatestGridProps("Selected Order Lines");

    expect(queueCall).toBeTruthy();
    expect(supportCall).toBeTruthy();

    expect(queueCall?.selectionMode).toBe("cell-range");
    expect(supportCall?.selectionMode).toBe("cell-range");

    expect(queueCall?.enableFillHandle).toBe(false);
    expect(supportCall?.enableFillHandle).toBe(false);
    expect(queueCall?.enableUndoRedo).toBe(false);
    expect(supportCall?.enableUndoRedo).toBe(false);

    expect(queueCall?.surfaceId).toBe("orders-queue");
    expect(supportCall?.surfaceId).toBe("orders-support-grid");

    expect(typeof queueCall?.onSelectionSummaryChange).toBe("function");
    expect(typeof supportCall?.onSelectionSummaryChange).toBe("function");
  });

  it("renders queue keyboard hints and affordance visibility cues", () => {
    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    const queueCall = getLatestGridProps("Orders Queue");

    expect(screen.getByLabelText("Keyboard shortcuts")).toBeInTheDocument();
    expect(
      screen.getByText(/(?:Ctrl|\u2318)\+C$/, { selector: "kbd" })
    ).toBeInTheDocument();
    expect(queueCall?.affordances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Paste", available: false }),
        expect.objectContaining({ label: "Fill", available: false }),
        expect.objectContaining({ label: "Edit", available: false }),
      ])
    );
  });

  it("refreshes queue, detail, and inspector evidence queries together", () => {
    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /refresh orders data/i })
    );

    expect(mockDraftsRefetch).toHaveBeenCalledTimes(1);
    expect(mockConfirmedRefetch).toHaveBeenCalledTimes(1);
    expect(mockDetailRefetch).toHaveBeenCalledTimes(1);
    expect(mockStatusHistoryRefetch).toHaveBeenCalledTimes(1);
    expect(mockAuditLogRefetch).toHaveBeenCalledTimes(1);
    expect(mockLedgerRefetch).toHaveBeenCalledTimes(1);
  });

  it("enables accounting and fulfillment handoffs for confirmed orders with invoices (SALE-ORD-007)", () => {
    mockQueueSelectionSummary = {
      selectedCellCount: 4,
      selectedRowCount: 1,
      hasDiscontiguousSelection: false,
      focusedSurface: "orders-queue",
    };

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    const accountingBtn = screen.getByRole("button", { name: /accounting/i });
    const shippingBtn = screen.getByRole("button", { name: /fulfillment/i });

    expect(accountingBtn).not.toBeDisabled();
    expect(shippingBtn).not.toBeDisabled();

    expect(screen.getByText(/so-002 selected/i)).toBeInTheDocument();
    expect(screen.getByText("Issued #55")).toBeInTheDocument();
  });

  it("routes the accounting handoff through the invoice workspace payment deep link", () => {
    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /accounting/i }));

    expect(mockSetLocation).toHaveBeenCalledWith(
      "/accounting?tab=invoices&from=sales&orderId=2&invoiceId=55"
    );
  });

  it("holds invoice actions while the linked-invoice lookup is still loading", () => {
    mockOrdersGetAllUseQuery.mockImplementation(
      ({ isDraft }: { isDraft: boolean }) => ({
        data: {
          items: isDraft
            ? [
                {
                  id: 1,
                  orderNumber: "SO-001",
                  clientId: 1,
                  orderType: "SALE",
                  total: "400",
                  items: [
                    {
                      batchId: 10,
                      quantity: 1,
                      unitPrice: 400,
                      unitCogs: 250,
                    },
                  ],
                  lineItems: [{ id: 10 }],
                  createdAt: "2026-03-10T00:00:00.000Z",
                  confirmedAt: null,
                  invoiceId: null,
                  version: 1,
                },
              ]
            : [
                {
                  id: 2,
                  orderNumber: "SO-002",
                  clientId: 1,
                  orderType: "SALE",
                  fulfillmentStatus: "READY_FOR_PACKING",
                  total: "900",
                  lineItems: [{ id: 11 }, { id: 12 }],
                  createdAt: "2026-03-09T00:00:00.000Z",
                  confirmedAt: "2026-03-09T02:00:00.000Z",
                  invoiceId: null,
                  version: 2,
                },
              ],
        },
        isLoading: false,
        error: null,
        refetch: isDraft ? mockDraftsRefetch : mockConfirmedRefetch,
      })
    );
    mockLinkedInvoiceUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getAllByText("Checking invoice...").length).toBeGreaterThan(
      0
    );
    expect(
      screen.queryByRole("button", { name: /generate invoice/i })
    ).not.toBeInTheDocument();
  });

  it("can be forced into document mode without the ordersView query param", () => {
    render(
      <OrdersSheetPilotSurface onOpenClassic={vi.fn()} forceDocumentMode />
    );

    expect(screen.getByText("Orders Document Sheet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /classic surface/i })
    ).toBeInTheDocument();
  });

  it("renders the sheet-native document workflow when ordersView=document is requested", () => {
    mockSearch =
      "?tab=orders&surface=sheet-native&ordersView=document&draftId=1";

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Orders Document Sheet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^queue$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /classic surface/i })
    ).toBeInTheDocument();
    expect(mockClientsListUseQuery).toHaveBeenCalledWith(
      { limit: 1000 },
      { enabled: false }
    );
    expect(mockOrdersGetAllUseQuery).toHaveBeenNthCalledWith(
      1,
      { isDraft: true },
      { enabled: false }
    );
    expect(mockOrdersGetAllUseQuery).toHaveBeenNthCalledWith(
      2,
      { isDraft: false },
      { enabled: false }
    );
    expect(mockOrderDetailUseQuery).toHaveBeenCalledWith(
      { orderId: 0 },
      { enabled: false }
    );
  });

  it("shows create-order context when the document sheet is opened from the create-order tab", () => {
    mockSearch = "?tab=create-order&surface=sheet-native&ordersView=document";

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("New order")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^queue$/i })
    ).toBeInTheDocument();
  });
});
