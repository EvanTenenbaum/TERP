/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseOrderSurface } from "./PurchaseOrderSurface";

const mockSetLocation = vi.fn();
const mockSetSelectedId = vi.fn();
const mockUseSearch = vi.fn(() => "");
const mockCreateMutate = vi.fn();
const mockSubmitMutate = vi.fn();
let mockSelectedPoId: number | null = null;

let queueData: Array<{
  id: number;
  poNumber: string;
  supplierClientId: number | null;
  purchaseOrderStatus: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  total: string;
  paymentTerms?: string | null;
}> = [];

let poDetailData: {
  poNumber?: string;
  supplier?: { email?: string; phone?: string };
  items?: Array<{
    id: number;
    productId: number;
    productName: string;
    category: string;
    subcategory: string;
    quantityOrdered: string;
    quantityReceived?: string;
    cogsMode?: "FIXED" | "RANGE";
    unitCost: string;
    unitCostMin?: string | null;
    unitCostMax?: string | null;
  }>;
} | null = null;

let poDetailIsLoading = false;

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    rows = [],
    onSelectedRowChange,
    headerActions,
  }: {
    title: string;
    rows?: Array<{ identity?: { rowKey: string } }>;
    onSelectedRowChange?: (
      row: { identity?: { rowKey: string } } | null
    ) => void;
    headerActions?: ReactNode;
  }) => (
    <div data-testid={`grid-${title}`}>
      <div>{title}</div>
      {headerActions}
      {rows.length > 0 && onSelectedRowChange ? (
        <button onClick={() => onSelectedRowChange(rows[0])}>
          Select first purchase order
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("./ProductBrowserGrid", () => ({
  ProductBrowserGrid: ({
    onAddProduct,
  }: {
    onAddProduct: (payload: {
      productId: number | null;
      productName: string | null;
      category: string | null;
      subcategory: string | null;
      cogsMode: "FIXED" | "RANGE";
      unitCost: string | null;
      unitCostMin: string | null;
      unitCostMax: string | null;
    }) => void;
  }) => (
    <div data-testid="product-browser">
      <button
        onClick={() =>
          onAddProduct({
            productId: 91,
            productName: "Wedding Cake",
            category: "Flower",
            subcategory: "Top Shelf",
            cogsMode: "FIXED",
            unitCost: "2.40",
            unitCostMin: null,
            unitCostMax: null,
          })
        }
      >
        Add mock product
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/supplier-combobox", () => ({
  SupplierCombobox: ({
    value,
    onValueChange,
  }: {
    value: number | null;
    onValueChange: (value: number | null) => void;
  }) => (
    <div data-testid="supplier-combobox">
      <div>Supplier: {value ?? "none"}</div>
      <button onClick={() => onValueChange(12)}>Choose supplier</button>
    </div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    purchaseOrders: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: queueData,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
      getById: {
        useQuery: vi.fn(() => ({
          data: poDetailData,
          isLoading: poDetailIsLoading,
          error: null,
          refetch: vi.fn(),
        })),
      },
      create: {
        useMutation: vi.fn(() => ({
          mutate: mockCreateMutate,
          isPending: false,
        })),
      },
      update: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      updateStatus: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      submit: {
        useMutation: vi.fn(() => ({
          mutate: mockSubmitMutate,
          isPending: false,
        })),
      },
      confirm: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      delete: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      products: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
      getRecentProductsBySupplier: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
      getBySupplier: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
    },
    clients: {
      list: {
        useQuery: vi.fn(() => ({
          data: { items: [{ id: 12, name: "North Farm" }] },
          isLoading: false,
        })),
      },
    },
    inventory: {
      getEnhanced: {
        useQuery: vi.fn(() => ({
          data: { items: [] },
          isLoading: false,
        })),
      },
    },
  },
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(() => [
    "/procurement?tab=purchase-orders",
    mockSetLocation,
  ]),
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: 1 }, isAuthenticated: true })),
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  useSpreadsheetSelectionParam: vi.fn(() => ({
    selectedId: mockSelectedPoId,
    setSelectedId: mockSetSelectedId,
  })),
}));

vi.mock("@/hooks/work-surface/useExport", () => ({
  useExport: vi.fn(() => ({
    exportCSV: vi.fn(),
    state: { isExporting: false },
  })),
}));

describe("PurchaseOrderSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue("");
    queueData = [];
    poDetailData = null;
    poDetailIsLoading = false;
    mockSelectedPoId = null;
  });

  it('renders "Purchase Orders" title in queue mode', () => {
    render(<PurchaseOrderSurface />);
    expect(screen.getByText("Purchase Orders")).toBeInTheDocument();
  });

  it('navigates to creation mode when "+ New PO" is clicked', () => {
    render(<PurchaseOrderSurface />);

    fireEvent.click(screen.getByText("+ New PO"));

    expect(mockSetLocation).toHaveBeenCalledWith(
      expect.stringContaining("poView=create")
    );
  });

  it("shows an Edit action for selected draft rows and navigates to edit mode", () => {
    queueData = [
      {
        id: 14,
        poNumber: "PO-014",
        supplierClientId: 12,
        purchaseOrderStatus: "DRAFT",
        orderDate: "2026-03-27",
        expectedDeliveryDate: "2026-04-03",
        total: "125.00",
        paymentTerms: "NET_30",
      },
    ];
    poDetailData = { items: [] };
    mockSelectedPoId = 14;

    render(<PurchaseOrderSurface />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(mockSetLocation).toHaveBeenCalledWith(
      expect.stringContaining("poView=edit")
    );
    expect(mockSetLocation).toHaveBeenCalledWith(
      expect.stringContaining("poId=14")
    );
  });
});

describe("PurchaseOrderSurface — creation mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueData = [];
    poDetailData = null;
    poDetailIsLoading = false;
  });

  it("renders creation toolbar when poView=create", () => {
    mockUseSearch.mockReturnValue("poView=create");
    render(<PurchaseOrderSurface />);

    expect(screen.getByText("New Purchase Order")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to queue/i })
    ).toBeInTheDocument();
  });

  it("navigates back to the queue from creation mode", () => {
    mockUseSearch.mockReturnValue("poView=create");
    render(<PurchaseOrderSurface />);

    fireEvent.click(screen.getByRole("button", { name: /back to queue/i }));

    expect(mockSetLocation).toHaveBeenCalled();
  });

  it("shows a loading state while an existing PO is loading for edit mode", () => {
    mockUseSearch.mockReturnValue("poView=edit&poId=22");
    poDetailIsLoading = true;

    render(<PurchaseOrderSurface />);

    expect(screen.getByText("Loading purchase order...")).toBeInTheDocument();
  });

  it("submits a new PO through create when the form is valid", () => {
    mockUseSearch.mockReturnValue("poView=create");
    render(<PurchaseOrderSurface />);

    fireEvent.click(screen.getByText("Choose supplier"));
    fireEvent.click(screen.getByText("Add mock product"));
    fireEvent.click(screen.getByText("Submit PO"));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierClientId: 12,
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 91,
            productName: "Wedding Cake",
          }),
        ]),
      })
    );
  });
});
