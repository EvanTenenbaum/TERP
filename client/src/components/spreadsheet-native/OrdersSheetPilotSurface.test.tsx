/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersSheetPilotSurface } from "./OrdersSheetPilotSurface";

const mockSetLocation = vi.fn();
const mockSetSelectedId = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/sales?tab=orders", mockSetLocation],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      list: {
        useQuery: () => ({
          data: {
            items: [{ id: 1, name: "Atlas Labs" }],
          },
        }),
      },
    },
    orders: {
      getAll: {
        useQuery: ({ isDraft }: { isDraft: boolean }) => ({
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
        }),
      },
      getOrderWithLineItems: {
        useQuery: () => ({
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
        }),
      },
      getOrderStatusHistory: {
        useQuery: () => ({
          data: [{ id: 1 }],
        }),
      },
      getAuditLog: {
        useQuery: () => ({
          data: [{ id: 1 }],
        }),
      },
    },
    accounting: {
      ledger: {
        list: {
          useQuery: () => ({
            data: { items: [{ id: 1 }] },
          }),
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

vi.mock("./SpreadsheetPilotGrid", () => ({
  SpreadsheetPilotGrid: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

describe("OrdersSheetPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText("Issued #55")).toBeInTheDocument();
  });
});
