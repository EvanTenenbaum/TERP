/**
 * @vitest-environment jsdom
 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersSheetPilotSurface } from "./OrdersSheetPilotSurface";

const mockSetLocation = vi.fn();
const mockSetSelectedId = vi.fn();
const {
  mockClientsListUseQuery,
  mockOrdersGetAllUseQuery,
  mockOrderDetailUseQuery,
  mockStatusHistoryUseQuery,
  mockAuditLogUseQuery,
  mockDeleteDraftUseMutation,
  mockLedgerListUseQuery,
} = vi.hoisted(() => ({
  mockClientsListUseQuery: vi.fn(),
  mockOrdersGetAllUseQuery: vi.fn(),
  mockOrderDetailUseQuery: vi.fn(),
  mockStatusHistoryUseQuery: vi.fn(),
  mockAuditLogUseQuery: vi.fn(),
  mockDeleteDraftUseMutation: vi.fn(),
  mockLedgerListUseQuery: vi.fn(),
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
    surfaceId,
    onSelectionSummaryChange,
  }: {
    title: string;
    description?: string;
    antiDriftSummary?: string;
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
            refetch: vi.fn(),
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
          refetch: vi.fn(),
        })),
      },
      getOrderStatusHistory: {
        useQuery: mockStatusHistoryUseQuery.mockImplementation(() => ({
          data: [{ id: 1 }],
        })),
      },
      getAuditLog: {
        useQuery: mockAuditLogUseQuery.mockImplementation(() => ({
          data: [{ id: 1 }],
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
      ledger: {
        list: {
          useQuery: mockLedgerListUseQuery.mockImplementation(() => ({
            data: { items: [{ id: 1 }] },
          })),
        },
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
      selectedId: 2,
      setSelectedId: mockSetSelectedId,
    }),
  };
});

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: (props: Record<string, unknown>) => mockPowersheetGrid(props),
}));

vi.mock("@/pages/OrderCreatorPage", () => ({
  default: () => <div>Orders Document Sheet</div>,
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
  ConfirmDialog: ({ isOpen }: { isOpen?: boolean }) =>
    isOpen ? <div>Confirm Dialog</div> : null,
}));

describe("OrdersSheetPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = "";
    mockQueueSelectionSummary = null;
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
      screen.getByRole("button", { name: /shipping/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new draft/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Issued #55")).toBeInTheDocument();
    expect(
      screen.getByText(/Queue release gates: spreadsheet selection parity/i)
    ).toBeInTheDocument();

    const queueCall = mockPowersheetGrid.mock.calls.find(
      ([props]) => props.title === "Orders Queue"
    )?.[0];
    const supportCall = mockPowersheetGrid.mock.calls.find(
      ([props]) => props.title === "Selected Order Lines"
    )?.[0];

    expect(queueCall?.selectionMode).toBe("cell-range");
    expect(queueCall?.enableFillHandle).toBe(false);
    expect(queueCall?.enableUndoRedo).toBe(false);
    expect(supportCall?.selectionMode).toBe("cell-range");
    expect(supportCall?.enableFillHandle).toBe(false);
    expect(supportCall?.enableUndoRedo).toBe(false);
  });

  it("locks row-scoped workflow actions when queue selection spans multiple rows", () => {
    mockQueueSelectionSummary = {
      selectedCellCount: 8,
      selectedRowCount: 2,
      hasDiscontiguousSelection: false,
      focusedSurface: "orders-queue",
    };

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByText(/workflow target: focused order so-002/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /selection spans multiple rows\. workflow actions stay locked/i
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new draft/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /accounting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /shipping/i })).toBeDisabled();
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

  it("renders the sheet-native document workflow when ordersView=document is requested", () => {
    mockSearch =
      "?tab=orders&surface=sheet-native&ordersView=document&draftId=1";

    render(<OrdersSheetPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Orders Document Sheet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to queue/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /classic composer/i })
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
});
