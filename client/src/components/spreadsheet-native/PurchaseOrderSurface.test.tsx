/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseOrderSurface } from "./PurchaseOrderSurface";

const mockSetLocation = vi.fn();
const mockSetSelectedId = vi.fn();
const mockUseSearch = vi.fn(() => "");
const mockInspectorPanel = vi.fn();
const mockPowersheetGrid = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutateAsync = vi.fn(() => Promise.resolve({ success: true }));
const mockAddItemMutateAsync = vi.fn(() => Promise.resolve({ success: true }));
const mockUpdateItemMutateAsync = vi.fn(() =>
  Promise.resolve({ success: true })
);
const mockDeleteItemMutateAsync = vi.fn(() =>
  Promise.resolve({ success: true })
);
const mockSubmitMutate = vi.fn();
const mockCreateProductIntakeDraftFromPO = vi.fn(input => ({
  id: "draft-123",
  ...input,
}));
const mockUpsertProductIntakeDraft = vi.fn(draft => draft);
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
    selectionMode,
  }: {
    title: string;
    rows?: Array<{ identity?: { rowKey: string } }>;
    onSelectedRowChange?: (
      row: { identity?: { rowKey: string } } | null
    ) => void;
    headerActions?: ReactNode;
    selectionMode?: string;
  }) =>
    (() => {
      mockPowersheetGrid({ title, rows, selectionMode });
      return (
        <div data-testid={`grid-${title}`}>
          <div>{title}</div>
          {headerActions}
          {rows.length > 0 && onSelectedRowChange ? (
            <button onClick={() => onSelectedRowChange(rows[0])}>
              Select first purchase order
            </button>
          ) : null}
        </div>
      );
    })(),
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

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({
    isOpen,
    trapFocus,
    children,
  }: {
    isOpen?: boolean;
    trapFocus?: boolean;
    children?: ReactNode;
  }) => {
    mockInspectorPanel({ isOpen, trapFocus });
    return isOpen ? <div data-testid="inspector-panel">{children}</div> : null;
  },
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
          mutateAsync: mockUpdateMutateAsync,
          isPending: false,
        })),
      },
      addItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: mockAddItemMutateAsync,
          isPending: false,
        })),
      },
      updateItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: mockUpdateItemMutateAsync,
          isPending: false,
        })),
      },
      deleteItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: mockDeleteItemMutateAsync,
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

vi.mock("@/lib/productIntakeDrafts", () => ({
  createProductIntakeDraftFromPO: (...args: unknown[]) =>
    mockCreateProductIntakeDraftFromPO(...args),
  upsertProductIntakeDraft: (...args: unknown[]) =>
    mockUpsertProductIntakeDraft(...args),
}));

vi.mock("@/lib/workspaceRoutes", () => ({
  buildOperationsWorkspacePath: (
    tab: string,
    params?: Record<string, string | number | null | undefined>
  ) => {
    const qs = new URLSearchParams();
    qs.set("tab", tab);
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        qs.set(key, String(value));
      }
    });
    return `/inventory?${qs.toString()}`;
  },
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
    mockInspectorPanel.mockClear();
    mockPowersheetGrid.mockClear();
    mockUseSearch.mockReturnValue("");
    queueData = [];
    poDetailData = null;
    poDetailIsLoading = false;
    mockSelectedPoId = null;
    mockUpdateMutateAsync.mockClear();
    mockAddItemMutateAsync.mockClear();
    mockUpdateItemMutateAsync.mockClear();
    mockDeleteItemMutateAsync.mockClear();
    mockCreateProductIntakeDraftFromPO.mockImplementation(input => ({
      id: "draft-123",
      ...input,
    }));
    mockUpsertProductIntakeDraft.mockImplementation(draft => draft);
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

  it("starts receiving by persisting a draft and navigating with draftId", () => {
    queueData = [
      {
        id: 33,
        poNumber: "PO-033",
        supplierClientId: 12,
        purchaseOrderStatus: "CONFIRMED",
        orderDate: "2026-03-27",
        expectedDeliveryDate: "2026-04-03",
        total: "250.00",
        paymentTerms: "NET_30",
      },
    ];
    poDetailData = {
      poNumber: "PO-033",
      supplier: { email: "ops@northfarm.test", phone: "555-0100" },
      items: [
        {
          id: 501,
          productId: 91,
          productName: "Wedding Cake",
          category: "Flower",
          subcategory: "Top Shelf",
          quantityOrdered: "20",
          quantityReceived: "5",
          cogsMode: "FIXED",
          unitCost: "2.40",
        },
      ],
    };
    mockSelectedPoId = 33;

    render(<PurchaseOrderSurface defaultStatusFilter={["CONFIRMED"]} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: /start receiving/i })[0]
    );
    fireEvent.click(screen.getByRole("button", { name: /go to receiving/i }));

    expect(mockCreateProductIntakeDraftFromPO).toHaveBeenCalledWith(
      expect.objectContaining({
        poId: 33,
        poNumber: "PO-033",
      })
    );
    expect(mockUpsertProductIntakeDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: "draft-123" }),
      1
    );
    expect(mockSetLocation).toHaveBeenCalledWith(
      expect.stringContaining("draftId=draft-123")
    );
  });

  it("disables focus trapping for the PO inspector so row selection does not loop focus", () => {
    queueData = [
      {
        id: 18,
        poNumber: "PO-018",
        supplierClientId: 12,
        purchaseOrderStatus: "DRAFT",
        orderDate: "2026-03-27",
        expectedDeliveryDate: "2026-04-03",
        total: "125.00",
        paymentTerms: "NET_30",
      },
    ];
    poDetailData = { items: [] };
    mockSelectedPoId = 18;

    render(<PurchaseOrderSurface />);

    expect(mockInspectorPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        trapFocus: false,
      })
    );
  });

  it("uses single-row selection for the PO queue to avoid range-selection row click loops", () => {
    queueData = [
      {
        id: 21,
        poNumber: "PO-021",
        supplierClientId: 12,
        purchaseOrderStatus: "CONFIRMED",
        orderDate: "2026-03-27",
        expectedDeliveryDate: "2026-04-03",
        total: "125.00",
        paymentTerms: "NET_30",
      },
    ];

    render(<PurchaseOrderSurface />);

    expect(mockPowersheetGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Purchase Orders Queue",
        selectionMode: "single-row",
      })
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

  it("hydrates the supplier from a creation-mode deep link", () => {
    mockUseSearch.mockReturnValue("poView=create&supplierClientId=12");
    render(<PurchaseOrderSurface />);

    expect(screen.getByText("Supplier: 12")).toBeInTheDocument();
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

  it("persists edit mode header changes and item mutations through the dedicated PO item endpoints", async () => {
    mockUseSearch.mockReturnValue("poView=edit&poId=22");
    poDetailData = {
      poNumber: "PO-022",
      items: [
        {
          id: 501,
          productId: 91,
          productName: "Wedding Cake",
          category: "Flower",
          subcategory: "Top Shelf",
          quantityOrdered: "20",
          quantityReceived: "0",
          cogsMode: "FIXED",
          unitCost: "2.40",
          notes: "keep cool",
        },
      ],
    };

    render(<PurchaseOrderSurface />);

    fireEvent.click(screen.getByText("Choose supplier"));
    fireEvent.click(screen.getByText("Add mock product"));
    fireEvent.click(screen.getByText("Select first purchase order"));
    fireEvent.click(screen.getByRole("button", { name: /remove selected/i }));
    fireEvent.click(screen.getByText("Update PO"));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 22,
          supplierClientId: 12,
        })
      );
      expect(mockAddItemMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseOrderId: 22,
          productId: 91,
        })
      );
      expect(mockDeleteItemMutateAsync).toHaveBeenCalledWith({ id: 501 });
      expect(mockUpdateItemMutateAsync).not.toHaveBeenCalled();
    });
  });
});
