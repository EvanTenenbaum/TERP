/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventorySheetPilotSurface } from "./InventorySheetPilotSurface";

const mockSetSelectedId = vi.fn();
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/operations?tab=inventory", mockSetLocation],
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      getEnhanced: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 1,
                sku: "BATCH-001",
                productName: "On Page Batch",
                category: "Flower",
                subcategory: "Indoor",
                vendorName: "North Farm",
                brandName: "North Brand",
                grade: "A",
                status: "LIVE",
                onHandQty: "8",
                reservedQty: "1",
                quarantineQty: "0",
                holdQty: "0",
                unitCogs: "50",
                receivedDate: "2026-03-01T00:00:00.000Z",
                stockStatus: "OPTIMAL",
              },
            ],
            summary: {
              totalItems: 1,
            },
            pagination: {
              hasMore: false,
            },
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      dashboardStats: {
        useQuery: () => ({
          data: {
            totalUnits: 8,
            statusCounts: {
              AWAITING_INTAKE: 0,
              LIVE: 1,
              ON_HOLD: 0,
              QUARANTINED: 0,
              SOLD_OUT: 0,
              CLOSED: 0,
            },
          },
          refetch: vi.fn(),
        }),
      },
      views: {
        list: {
          useQuery: () => ({
            data: { items: [] },
          }),
        },
      },
      getById: {
        useQuery: () => ({
          data: {
            batch: {
              id: 999,
              version: 4,
              sku: "BATCH-999",
              grade: "B",
              batchStatus: "LIVE",
              onHandQty: "15",
              reservedQty: "3",
              unitCogs: "220.5",
              createdAt: "2026-03-02T00:00:00.000Z",
            },
            locations: [{ site: "Vault A" }],
            auditLogs: [{ id: 1 }],
            availableQty: "12",
          },
          refetch: vi.fn(),
        }),
      },
      updateStatus: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      adjustQty: {
        useMutation: () => ({
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
      selectedId: 999,
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

vi.mock("@/components/AdjustQuantityDialog", () => ({
  AdjustQuantityDialog: () => null,
}));

describe("InventorySheetPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the inspector open for deep-linked batches outside the current page", () => {
    render(<InventorySheetPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Selected Batch Locations")).toBeInTheDocument();
    expect(screen.getByText("BATCH-999")).toBeInTheDocument();
    expect(
      screen.getByText(/This inspector was loaded from the workbook URL/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Loaded via batchId outside the current loaded rows/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Vault A")).toBeInTheDocument();
  });
});
