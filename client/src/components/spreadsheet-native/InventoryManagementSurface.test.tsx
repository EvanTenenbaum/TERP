import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InventoryManagementSurface } from "./InventoryManagementSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid={`grid-${title}`}>{title}</div>
  ),
}));

vi.mock("./AdjustmentContextDrawer", () => ({
  AdjustmentContextDrawer: () => <div data-testid="adjust-drawer" />,
}));

vi.mock("./InventoryAdvancedFilters", () => ({
  InventoryAdvancedFilters: () => <div data-testid="advanced-filters" />,
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
  hasActiveFilters: () => false,
  filtersToQueryInput: () => ({}),
}));

vi.mock("./InventoryGalleryView", () => ({
  InventoryGalleryView: () => <div data-testid="gallery-view" />,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      getEnhanced: {
        useQuery: vi.fn(() => ({
          data: {
            items: [],
            summary: { totalItems: 0 },
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
            batchCount: 12,
            totalUnits: 500,
            inventoryValue: 25000,
            statusCounts: {},
          },
          refetch: vi.fn(),
        })),
      },
      views: {
        list: { useQuery: vi.fn(() => ({ data: { items: [] } })) },
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
    setSelectedId: vi.fn(),
  })),
  mapInventoryItemsToPilotRows: vi.fn(() => []),
  mapInventoryDetailToPilotRow: vi.fn(() => null),
  summarizeInventoryDetail: vi.fn(() => null),
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(() => ["/operations?tab=inventory", vi.fn()]),
}));

describe("InventoryManagementSurface", () => {
  it("renders toolbar with 'Inventory' title", () => {
    render(<InventoryManagementSurface />);
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<InventoryManagementSurface />);
    expect(
      screen.getByPlaceholderText("Search SKU, product, supplier...")
    ).toBeInTheDocument();
  });

  it("renders Grid/Gallery toggle buttons", () => {
    render(<InventoryManagementSurface />);
    expect(screen.getByRole("button", { name: /grid/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /gallery/i })
    ).toBeInTheDocument();
  });
});
