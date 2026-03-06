/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InventoryWorkSurface } from "../InventoryWorkSurface";
import { setupDbMock, setupPermissionMock } from "@/test-utils";

type PurchaseModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const purchaseModalSpy = vi.fn();

// ─── Controllable mocks (vi.hoisted ensures they're ready for vi.mock factories) ───

const {
  mockUseUndo,
  mockUsePowersheetSelection,
  mockGetEnhanced,
  mockBulkDelete,
} = vi.hoisted(() => {
  return {
    mockUseUndo: vi.fn(),
    mockUsePowersheetSelection: vi.fn(),
    mockGetEnhanced: vi.fn(),
    mockBulkDelete: vi.fn(),
  };
});

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("wouter", () => ({
  useLocation: () => ["/inventory", vi.fn()],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      inventory: {
        views: { list: { invalidate: vi.fn() } },
      },
    }),
    inventory: {
      getEnhanced: { useQuery: mockGetEnhanced },
      list: {
        useQuery: () => ({
          data: { items: [], hasMore: false },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      dashboardStats: {
        useQuery: () => ({
          data: {
            totalUnits: 0,
            totalInventoryValue: 0,
            statusCounts: { LIVE: 0 },
          },
          refetch: vi.fn(),
        }),
      },
      views: {
        list: {
          useQuery: () => ({
            data: { items: [] },
            isLoading: false,
            refetch: vi.fn(),
          }),
        },
        save: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
        delete: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
      },
      updateStatus: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      adjustQty: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      bulk: {
        updateStatus: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        delete: { useMutation: mockBulkDelete },
        restore: {
          useMutation: () => ({
            mutateAsync: vi.fn().mockResolvedValue({
              success: true,
              restored: 0,
              skipped: 0,
              errors: [],
            }),
            isPending: false,
          }),
        },
      },
    },
  },
}));

vi.mock("@/hooks/work-surface/useWorkSurfaceKeyboard", () => ({
  useWorkSurfaceKeyboard: () => ({
    keyboardProps: {},
    focusState: { row: null, col: null, isEditing: false },
    setFocus: vi.fn(),
    startEditing: vi.fn(),
    stopEditing: vi.fn(),
    focusFirst: vi.fn(),
    focusLast: vi.fn(),
    resetFocus: vi.fn(),
  }),
}));

vi.mock("@/hooks/work-surface/useSaveState", () => ({
  useSaveState: () => ({
    setSaving: vi.fn(),
    setSaved: vi.fn(),
    setError: vi.fn(),
    SaveStateIndicator: <div />,
  }),
}));

vi.mock("@/hooks/work-surface/useConcurrentEditDetection", () => ({
  useConcurrentEditDetection: () => ({
    handleError: () => false,
    ConflictDialog: () => null,
    trackVersion: vi.fn(),
  }),
}));

vi.mock("@/hooks/work-surface/useUndo", () => ({
  useUndo: mockUseUndo,
  useUndoContext: vi.fn(() => ({ registerAction: vi.fn(), undoLast: vi.fn() })),
  UndoProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  UndoToast: () => null,
}));

vi.mock("@/hooks/work-surface/usePowersheetSelection", () => ({
  usePowersheetSelection: mockUsePowersheetSelection,
}));

vi.mock("../InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorField: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useInspectorPanel: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock("@/components/inventory/PurchaseModal", () => ({
  PurchaseModal: (props: PurchaseModalProps) => {
    purchaseModalSpy(props);
    return (
      <div
        data-testid="purchase-modal"
        data-open={props.open ? "true" : "false"}
      />
    );
  },
}));

// Mock InventoryCard to avoid full item rendering in unit tests (mobile-view card)
vi.mock("@/components/inventory/InventoryCard", () => ({
  InventoryCard: ({ batch }: { batch: { id: number; sku: string } }) => (
    <div data-testid={`inventory-card-${batch?.id ?? "unknown"}`}>
      {batch?.sku}
    </div>
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns flat format matching the getEnhanced API — normalizedItems in the
// component transforms this into the nested InventoryItem shape internally.
function makeEnhancedItem(id: number, onHandQty: string) {
  return {
    id,
    sku: `SKU-${id}`,
    status: "LIVE",
    onHandQty,
    reservedQty: "0",
    quarantineQty: "0",
    holdQty: "0",
    grade: "A",
    ageDays: 5,
    productName: `Product ${id}`,
    category: "Flower",
    vendorName: "Test Supplier",
    brandName: "Test Brand",
    stockStatus: parseFloat(onHandQty) <= 0 ? "outOfStock" : "optimal",
  };
}

function makeSelectionReturn(ids: number[]) {
  return {
    activeId: ids[0] ?? null,
    setActiveId: vi.fn(),
    activeIndex: ids.length > 0 ? 0 : -1,
    setActiveIndex: vi.fn(),
    selectedIds: new Set(ids),
    allSelected: false,
    someSelected: ids.length > 0,
    toggle: vi.fn(),
    toggleAll: vi.fn(),
    isSelected: vi.fn((id: number) => ids.includes(id)),
    clear: vi.fn(),
    selectedArray: ids,
  };
}

function makeDefaultSelectionReturn() {
  return makeSelectionReturn([]);
}

function makeDefaultUndoReturn() {
  return {
    state: { canUndo: false },
    registerAction: vi.fn(),
    undoLast: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDefaultInventoryReturn() {
  return {
    data: {
      items: [],
      pagination: { hasMore: false },
      summary: {
        totalItems: 0,
        byStockStatus: { critical: 0, low: 0, optimal: 0, outOfStock: 0 },
      },
    },
    isLoading: false,
    refetch: vi.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("InventoryWorkSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDbMock();
    setupPermissionMock();

    mockUseUndo.mockReturnValue(makeDefaultUndoReturn());
    mockUsePowersheetSelection.mockReturnValue(makeDefaultSelectionReturn());
    mockGetEnhanced.mockReturnValue(makeDefaultInventoryReturn());
    mockBulkDelete.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("renders the Product Intake button", async () => {
    render(<InventoryWorkSurface />);
    expect(
      screen.getByRole("button", { name: /product intake/i })
    ).toBeInTheDocument();
  });

  // ─── H1: Pre-click eligibility gate (TER-525) ────────────────────────────

  describe("H1: Pre-click eligibility gate (TER-525)", () => {
    it("enables Delete Selected when all selected rows are eligible (onHandQty = 0)", () => {
      const batchId = 10;
      mockGetEnhanced.mockReturnValue({
        data: {
          items: [makeEnhancedItem(batchId, "0")],
          pagination: { hasMore: false },
          summary: {
            totalItems: 1,
            byStockStatus: { critical: 0, low: 0, optimal: 0, outOfStock: 1 },
          },
        },
        isLoading: false,
        refetch: vi.fn(),
      });
      mockUsePowersheetSelection.mockReturnValue(
        makeSelectionReturn([batchId])
      );

      render(<InventoryWorkSurface />);

      // With eligible-only selection, delete button should be enabled
      // The aria-label shows "Delete N selected batches" (not "Cannot delete")
      const deleteBtn = screen.queryByRole("button", {
        name: /delete 1 selected batch/i,
      });
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn).not.toBeDisabled();
    });

    it("disables Delete Selected when any selected batch has remaining inventory", () => {
      const blockedBatchId = 20;
      mockGetEnhanced.mockReturnValue({
        data: {
          items: [makeEnhancedItem(blockedBatchId, "5.5")],
          pagination: { hasMore: false },
          summary: {
            totalItems: 1,
            byStockStatus: { critical: 0, low: 0, optimal: 1, outOfStock: 0 },
          },
        },
        isLoading: false,
        refetch: vi.fn(),
      });
      mockUsePowersheetSelection.mockReturnValue(
        makeSelectionReturn([blockedBatchId])
      );

      render(<InventoryWorkSurface />);

      // Delete button must be disabled — aria-label says "Cannot delete: 1 batch has remaining inventory"
      const deleteBtn = screen.getByRole("button", {
        name: /cannot delete/i,
      });
      expect(deleteBtn).toBeDisabled();
    });

    it("shows blocked-inventory alert when blocked batches are in the selection", () => {
      const blockedBatchId = 30;
      mockGetEnhanced.mockReturnValue({
        data: {
          items: [makeEnhancedItem(blockedBatchId, "10.0")],
          pagination: { hasMore: false },
          summary: {
            totalItems: 1,
            byStockStatus: { critical: 1, low: 0, optimal: 0, outOfStock: 0 },
          },
        },
        isLoading: false,
        refetch: vi.fn(),
      });
      mockUsePowersheetSelection.mockReturnValue(
        makeSelectionReturn([blockedBatchId])
      );

      render(<InventoryWorkSurface />);

      // Component renders a role="alert" span: "1 batch has remaining inventory"
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/remaining inventory/i);
    });
  });

  // ─── H2: Single error banner (TER-526) ───────────────────────────────────

  describe("H2: Single error banner for blocked delete (TER-526)", () => {
    it("captures onError handler from useMutation and can be called", () => {
      let capturedOnError: ((error: { message: string }) => void) | null = null;

      mockBulkDelete.mockImplementation(
        (opts?: { onError?: (e: { message: string }) => void }) => {
          if (opts?.onError) capturedOnError = opts.onError;
          return { mutate: vi.fn(), isPending: false };
        }
      );

      const batchId = 40;
      mockGetEnhanced.mockReturnValue({
        data: {
          items: [makeEnhancedItem(batchId, "0")],
          pagination: { hasMore: false },
          summary: {
            totalItems: 1,
            byStockStatus: { critical: 0, low: 0, optimal: 0, outOfStock: 1 },
          },
        },
        isLoading: false,
        refetch: vi.fn(),
      });
      mockUsePowersheetSelection.mockReturnValue(
        makeSelectionReturn([batchId])
      );

      render(<InventoryWorkSurface />);

      // The component registers an onError callback — verify we captured it
      expect(capturedOnError).not.toBeNull();
    });
  });

  // ─── H3: Focused selection mode (TER-527) ────────────────────────────────

  describe("H3: Focused selection mode (TER-527)", () => {
    it("shows selection badge when rows are selected", () => {
      mockUsePowersheetSelection.mockReturnValue(makeSelectionReturn([1]));

      render(<InventoryWorkSurface />);

      // Status bar + badge both show "1 selected" — verify at least one instance
      const allSelected = screen.getAllByText("1 selected");
      expect(allSelected.length).toBeGreaterThanOrEqual(1);
    });

    it("hides stats grid when rows are selected", () => {
      mockGetEnhanced.mockReturnValue({
        data: {
          items: [],
          pagination: { hasMore: false },
          summary: {
            totalItems: 5,
            byStockStatus: { critical: 2, low: 1, optimal: 1, outOfStock: 1 },
          },
        },
        isLoading: false,
        refetch: vi.fn(),
      });

      // With selection active, stats grid (Critical/Low/Optimal/Out Of Stock) should be hidden
      mockUsePowersheetSelection.mockReturnValue(makeSelectionReturn([1]));

      render(<InventoryWorkSurface />);

      // H3: stats labels are hidden during selection mode
      expect(screen.queryByText("Critical")).not.toBeInTheDocument();
    });

    it("shows stats grid when no rows are selected (normal mode)", () => {
      mockGetEnhanced.mockReturnValue({
        data: {
          items: [],
          pagination: { hasMore: false },
          summary: {
            totalItems: 5,
            byStockStatus: { critical: 2, low: 1, optimal: 1, outOfStock: 1 },
          },
        },
        isLoading: false,
        refetch: vi.fn(),
      });

      // No selection — stats grid should render
      render(<InventoryWorkSurface />);

      expect(screen.getByText("Critical")).toBeInTheDocument();
    });

    it("does not show selection badge when no rows are selected", () => {
      // Default: empty selection
      render(<InventoryWorkSurface />);

      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  // ─── H4: Persistent undo button (TER-529) ─────────────────────────────────

  describe("H4: Persistent undo button (TER-529)", () => {
    it("does NOT show 'Undo last delete' button when canUndo is false", () => {
      mockUseUndo.mockReturnValue({
        state: { canUndo: false },
        registerAction: vi.fn(),
        undoLast: vi.fn().mockResolvedValue(undefined),
      });

      render(<InventoryWorkSurface />);

      expect(
        screen.queryByRole("button", { name: /undo last delete/i })
      ).not.toBeInTheDocument();
    });

    it("shows 'Undo last delete' button when canUndo is true", () => {
      mockUseUndo.mockReturnValue({
        state: { canUndo: true },
        registerAction: vi.fn(),
        undoLast: vi.fn().mockResolvedValue(undefined),
      });

      render(<InventoryWorkSurface />);

      expect(
        screen.getByRole("button", { name: /undo last delete/i })
      ).toBeInTheDocument();
    });

    it("calls undoLast when 'Undo last delete' button is clicked", () => {
      const mockUndoLast = vi.fn().mockResolvedValue(undefined);
      mockUseUndo.mockReturnValue({
        state: { canUndo: true },
        registerAction: vi.fn(),
        undoLast: mockUndoLast,
      });

      render(<InventoryWorkSurface />);

      const undoBtn = screen.getByRole("button", { name: /undo last delete/i });
      fireEvent.click(undoBtn);

      expect(mockUndoLast).toHaveBeenCalledTimes(1);
    });
  });
});
