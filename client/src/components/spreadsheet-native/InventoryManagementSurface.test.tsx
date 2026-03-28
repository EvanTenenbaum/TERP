/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryManagementSurface } from "./InventoryManagementSurface";

const { mockSetSelectedId, viewsListQuery, filtersState } = vi.hoisted(() => ({
  mockSetSelectedId: vi.fn(),
  viewsListQuery: vi.fn(() => ({ data: { items: [] }, refetch: vi.fn() })),
  filtersState: {
    history: [] as Array<{
      isOpen: boolean;
      onOpenChange: (open: boolean) => void;
    }>,
  },
}));

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    rows = [],
    onSelectedRowChange,
    headerActions,
    selectedRowId,
  }: {
    title: string;
    rows?: Array<{ batchId?: number; identity?: { rowKey: string } }>;
    onSelectedRowChange?: (
      row: { batchId?: number; identity?: { rowKey: string } } | null
    ) => void;
    headerActions?: ReactNode;
    selectedRowId?: string | null;
  }) => (
    <div data-testid={`grid-${title}`}>
      <div>{title}</div>
      <div data-testid={`selected-${title}`}>{selectedRowId ?? "none"}</div>
      {headerActions}
      {rows.length > 0 && onSelectedRowChange ? (
        <button onClick={() => onSelectedRowChange(rows[0])}>
          Select inventory row
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("./AdjustmentContextDrawer", () => ({
  AdjustmentContextDrawer: () => <div data-testid="adjust-drawer" />,
}));

vi.mock("./InventoryAdvancedFilters", () => ({
  InventoryAdvancedFilters: (props: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    filtersState.history.push(props);
    if (!props.isOpen) return null;
    return (
      <div data-testid="advanced-filters">
        <button onClick={() => props.onOpenChange(false)}>Close filters</button>
      </div>
    );
  },
  createDefaultInventoryFilters: () => ({
    search: "",
    statuses: [],
    categories: [],
    subcategories: [],
    stockLevel: "all",
    suppliers: [],
    brands: [],
    grades: [],
    dateFrom: "",
    dateTo: "",
    location: "",
    cogsMin: "",
    cogsMax: "",
    stockStatus: "ALL",
    ageBracket: "ALL",
    batchId: "",
  }),
  hasActiveFilters: (filters: { statuses?: string[] }) =>
    Boolean(filters.statuses?.length),
  filtersToQueryInput: () => ({}),
}));

vi.mock("./InventoryGalleryView", () => ({
  InventoryGalleryView: ({
    onOpenInspector,
    onAdjustQty,
  }: {
    onOpenInspector: (id: number) => void;
    onAdjustQty: (id: number) => void;
  }) => (
    <div data-testid="gallery-view">
      <button onClick={() => onOpenInspector(7)}>Open from gallery</button>
      <button onClick={() => onAdjustQty(42)}>Adjust from gallery</button>
    </div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      getEnhanced: {
        useQuery: vi.fn(() => ({
          data: {
            items: [
              {
                id: 42,
                batchId: 42,
                sku: "BATCH-042",
                productName: "Wedding Cake",
                productSummary: "Wedding Cake · Tops",
                category: "Flower",
                subcategory: "Tops",
                vendorName: "GreenLeaf",
                brandName: "House Reserve",
                grade: "AAA",
                status: "LIVE",
                onHandQty: 100,
                reservedQty: 10,
                availableQty: 90,
                unitCogs: 2.4,
                ageLabel: "3d",
                stockStatus: "LOW",
                identity: {
                  rowKey: "batch:42",
                  entityId: 42,
                  entityType: "batch",
                  recordVersion: 1,
                },
              },
            ],
            summary: { totalItems: 1 },
            pagination: { hasMore: false },
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
      dashboardStats: {
        useQuery: vi.fn(() => ({
          data: {
            totalUnits: 500,
            totalInventoryValue: 25000,
            statusCounts: { LIVE: 12 },
          },
          refetch: vi.fn(),
        })),
      },
      views: {
        list: { useQuery: viewsListQuery },
        save: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
        delete: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
      },
      getById: {
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
      updateStatus: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      adjustQty: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      updateBatch: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      bulk: {
        updateStatus: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
        delete: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
        restore: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
      },
    },
  },
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: vi.fn(() => ({ hasPermission: () => true })),
}));

vi.mock("@/hooks/work-surface/useExport", () => ({
  useExport: vi.fn(() => ({
    exportCSV: vi.fn(),
    state: { isExporting: false },
  })),
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  useSpreadsheetSelectionParam: vi.fn(() => ({
    selectedId: null,
    setSelectedId: mockSetSelectedId,
  })),
  mapInventoryItemsToPilotRows: vi.fn((items: unknown[]) => items),
  mapInventoryDetailToPilotRow: vi.fn(() => null),
  summarizeInventoryDetail: vi.fn(() => null),
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(() => ["/operations?tab=inventory", vi.fn()]),
}));

describe("InventoryManagementSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filtersState.history = [];
    viewsListQuery.mockImplementation(() => ({
      data: { items: [] },
      refetch: vi.fn(),
    }));
  });

  it("renders toolbar with 'Inventory' title", () => {
    render(<InventoryManagementSurface />);
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("toggles the advanced filters panel from the action bar", () => {
    render(<InventoryManagementSurface />);

    expect(screen.queryByTestId("advanced-filters")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByTestId("advanced-filters")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close filters"));
    expect(screen.queryByTestId("advanced-filters")).not.toBeInTheDocument();
  });

  it("switches to gallery mode", () => {
    render(<InventoryManagementSurface />);

    fireEvent.click(screen.getByRole("button", { name: /gallery view/i }));

    expect(screen.getByTestId("gallery-view")).toBeInTheDocument();
    expect(
      screen.queryByTestId("grid-Inventory Sheet")
    ).not.toBeInTheDocument();
  });

  it("routes gallery adjust actions through batch selection instead of opening a zero-delta drawer", () => {
    render(<InventoryManagementSurface />);

    fireEvent.click(screen.getByRole("button", { name: /gallery view/i }));
    fireEvent.click(screen.getByText("Adjust from gallery"));

    expect(mockSetSelectedId).toHaveBeenCalledWith(42);
    expect(screen.queryByTestId("adjust-drawer")).not.toBeInTheDocument();
  });

  it("routes grid row selection through the workbook selection param", () => {
    render(<InventoryManagementSurface />);

    fireEvent.click(screen.getByText("Select inventory row"));

    expect(mockSetSelectedId).toHaveBeenCalledWith(42);
  });

  it("does not push a fallback detail row back into grid selection when the selected batch is outside the loaded grid", async () => {
    const { trpc } = await import("@/lib/trpc");
    const { useSpreadsheetSelectionParam, mapInventoryDetailToPilotRow } =
      await import("@/lib/spreadsheet-native");

    vi.mocked(useSpreadsheetSelectionParam).mockReturnValue({
      selectedId: 999,
      setSelectedId: mockSetSelectedId,
    });

    vi.mocked(trpc.inventory.getById.useQuery).mockReturnValue({
      data: {
        id: 999,
        batchId: 999,
        sku: "BATCH-999",
        productName: "Remote Batch",
        productSummary: "Remote Batch · Smalls",
        vendorName: "North Farm",
        brandName: "Reserve",
        grade: "AA",
        status: "LIVE",
        onHandQty: 10,
        reservedQty: 0,
        availableQty: 10,
        unitCogs: 1.5,
        ageLabel: "5d",
        stockStatus: "LOW",
        locations: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.mocked(mapInventoryDetailToPilotRow).mockReturnValue({
      batchId: 999,
      sku: "BATCH-999",
      productName: "Remote Batch",
      productSummary: "Remote Batch · Smalls",
      vendorName: "North Farm",
      brandName: "Reserve",
      grade: "AA",
      status: "LIVE",
      onHandQty: 10,
      reservedQty: 0,
      availableQty: 10,
      unitCogs: 1.5,
      ageLabel: "5d",
      stockStatus: "LOW",
      identity: {
        rowKey: "batch:999",
        entityId: 999,
        entityType: "batch",
        recordVersion: 1,
      },
    } as never);

    render(<InventoryManagementSurface />);

    expect(screen.getByTestId("selected-Inventory Sheet")).toHaveTextContent(
      "none"
    );
    expect(screen.getByText("Remote Batch · Smalls")).toBeInTheDocument();
  });
});
