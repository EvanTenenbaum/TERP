import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PurchaseOrderSurface } from "./PurchaseOrderSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid={`grid-${title}`}>{title}</div>
  ),
}));

// Mock ProductBrowserGrid
vi.mock("./ProductBrowserGrid", () => ({
  ProductBrowserGrid: () => (
    <div data-testid="product-browser">Product Browser</div>
  ),
}));

// Mock SupplierCombobox
vi.mock("@/components/ui/supplier-combobox", () => ({
  SupplierCombobox: () => <div data-testid="supplier-combobox">Supplier</div>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    purchaseOrders: {
      getAll: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getById: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
      },
      create: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      update: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      updateStatus: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      submit: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      confirm: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      delete: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
    clients: {
      list: {
        useQuery: vi.fn(() => ({ data: { items: [] }, isLoading: false })),
      },
    },
  },
}));

const mockUseSearch = vi.fn(() => "");

vi.mock("wouter", () => ({
  useLocation: vi.fn(() => ["/inventory?tab=purchase-orders", vi.fn()]),
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: 1 }, isAuthenticated: true })),
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  useSpreadsheetSelectionParam: vi.fn(() => ({
    selectedId: null,
    setSelectedId: vi.fn(),
  })),
}));

describe("PurchaseOrderSurface", () => {
  it('renders "Purchase Orders" title in queue mode', () => {
    render(<PurchaseOrderSurface />);
    expect(screen.getByText("Purchase Orders")).toBeInTheDocument();
  });

  it('renders "+ New PO" button', () => {
    render(<PurchaseOrderSurface />);
    expect(screen.getByText("+ New PO")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<PurchaseOrderSurface />);
    expect(
      screen.getByPlaceholderText("Search PO number or supplier")
    ).toBeInTheDocument();
  });
});

describe("PurchaseOrderSurface — creation mode", () => {
  it("renders creation toolbar when poView=create", () => {
    mockUseSearch.mockReturnValue("poView=create");
    render(<PurchaseOrderSurface />);
    expect(screen.getByText("New Purchase Order")).toBeInTheDocument();
    expect(screen.getByText("Back to Queue")).toBeInTheDocument();
    mockUseSearch.mockReturnValue("");
  });

  it("renders product browser in creation mode", () => {
    mockUseSearch.mockReturnValue("poView=create");
    render(<PurchaseOrderSurface />);
    expect(screen.getByTestId("product-browser")).toBeInTheDocument();
    mockUseSearch.mockReturnValue("");
  });

  it("renders Submit PO button in creation mode", () => {
    mockUseSearch.mockReturnValue("poView=create");
    render(<PurchaseOrderSurface />);
    expect(screen.getByText("Submit PO")).toBeInTheDocument();
    mockUseSearch.mockReturnValue("");
  });
});
