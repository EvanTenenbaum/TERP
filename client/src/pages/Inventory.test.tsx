/**
 * Inventory page skeleton tests
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Inventory from "./Inventory";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { setupDbMock, setupPermissionMock } from "@/test-utils";

vi.mock("wouter", () => ({
  useLocation: () => ["/inventory", vi.fn()],
  useRoute: () => [false, {}],
}));

vi.mock("@/hooks/useInventoryFilters", () => ({
  useInventoryFilters: () => ({
    filters: {
      status: [],
      category: "",
      subcategory: "",
      vendor: [],
      brand: [],
      grade: [],
      stockLevel: "all",
      cogsRange: { min: null, max: null },
    },
    updateFilter: vi.fn(),
    clearAllFilters: vi.fn(),
    hasActiveFilters: false,
    activeFilterCount: 0,
  }),
}));

vi.mock("@/hooks/useInventorySort", () => ({
  useInventorySort: () => ({
    sortState: { column: "", direction: "asc" },
    toggleSort: vi.fn(),
    sortData: (data: unknown[]) => data,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      list: { useQuery: () => ({ data: undefined, isLoading: true }) },
      getEnhanced: { useQuery: () => ({ data: undefined, isLoading: true }) },
      dashboardStats: { useQuery: () => ({ data: undefined }) },
      bulk: {
        updateStatus: { useMutation: () => ({}) },
        delete: { useMutation: () => ({}) },
      },
    },
    productCatalogue: {
      getCategories: { useQuery: () => ({ data: [] }) },
    },
    settings: {
      subcategories: {
        list: { useQuery: () => ({ data: [] }) },
      },
    },
  },
}));

vi.mock("@/components/inventory/PurchaseModal", () => ({
  PurchaseModal: () => null,
}));
vi.mock("@/components/inventory/BatchDetailDrawer", () => ({
  BatchDetailDrawer: () => null,
}));
vi.mock("@/components/inventory/EditBatchModal", () => ({
  EditBatchModal: () => null,
}));
vi.mock("@/components/inventory/AdvancedFilters", () => ({
  AdvancedFilters: () => null,
}));
vi.mock("@/components/inventory/FilterChips", () => ({
  FilterChips: () => null,
}));
vi.mock("@/components/inventory/SortControls", () => ({
  SortControls: () => null,
}));
vi.mock("@/components/inventory/InventoryCard", () => ({
  InventoryCard: () => null,
}));
vi.mock("@/components/inventory/SavedViewsDropdown", () => ({
  SavedViewsDropdown: () => null,
}));
vi.mock("@/components/inventory/SaveViewModal", () => ({
  SaveViewModal: () => null,
}));
vi.mock("@/components/inventory/BulkActionsBar", () => ({
  BulkActionsBar: () => null,
}));
vi.mock("@/components/inventory/BulkConfirmDialog", () => ({
  BulkConfirmDialog: () => null,
}));
vi.mock("@/components/audit", () => ({ AuditIcon: () => null }));
vi.mock("@/components/data-cards", () => ({ DataCardSection: () => null }));
vi.mock("@/components/inventory/StockLevelChart", () => ({
  StockLevelChart: () => null,
}));
vi.mock("@/components/inventory/SearchHighlight", () => ({
  SearchHighlight: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

describe("Inventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDbMock();
    setupPermissionMock();
  });

  it("renders skeleton while loading inventory", () => {
    render(
      <ThemeProvider>
        <Inventory />
      </ThemeProvider>
    );

    expect(screen.getByTestId("inventory-skeleton")).toBeInTheDocument();
  });
});