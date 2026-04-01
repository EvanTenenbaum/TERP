import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductBrowserGrid } from "./ProductBrowserGrid";

let supplierHistoryData: Array<{
  productId: number | null;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  cogsMode: "FIXED" | "RANGE";
  unitCost: string | null;
  unitCostMin: string | null;
  unitCostMax: string | null;
  poNumber: string;
  orderDate: string;
}> = [];
let catalogData: Array<{
  id: number;
  productName?: string | null;
  nameCanonical?: string | null;
  category?: string | null;
  subcategory?: string | null;
}> = [];

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    rows = [],
    columnDefs = [],
  }: {
    title: string;
    rows?: Array<Record<string, unknown>>;
    columnDefs?: Array<{
      headerName?: string;
      cellRenderer?: (params: { data?: Record<string, unknown> }) => ReactNode;
    }>;
  }) => (
    <div data-testid={`grid-${title}`}>
      <div>{title}</div>
      {rows.length > 0
        ? columnDefs
            .find(column => column.headerName === "Add")
            ?.cellRenderer?.({ data: rows[0] })
        : null}
    </div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    purchaseOrders: {
      getRecentProductsBySupplier: {
        useQuery: vi.fn(() => ({
          data: supplierHistoryData,
          isLoading: false,
        })),
      },
      products: {
        useQuery: vi.fn(() => ({ data: { items: [] }, isLoading: false })),
      },
    },
    inventory: {
      getEnhanced: {
        useQuery: vi.fn(() => ({
          data: { items: [], pagination: { hasMore: false } },
          isLoading: false,
        })),
      },
    },
    productCatalogue: {
      list: {
        useQuery: vi.fn(() => ({
          data: { items: catalogData },
          isLoading: false,
        })),
      },
    },
  },
}));

describe("ProductBrowserGrid", () => {
  beforeEach(() => {
    supplierHistoryData = [];
    catalogData = [];
  });

  const defaultProps = {
    supplierId: null,
    addedProductIds: new Set<number>(),
    onAddProduct: vi.fn(),
  };

  it("renders tab toggle with Supplier History, Low Stock, Catalog", () => {
    render(<ProductBrowserGrid {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /supplier history/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /low stock/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /catalog/i })
    ).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<ProductBrowserGrid {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument();
  });

  it("shows empty state when no supplier is selected", () => {
    render(<ProductBrowserGrid {...defaultProps} supplierId={null} />);
    expect(screen.getByText(/select a supplier first/i)).toBeInTheDocument();
  });

  it("adds the selected supplier-history product", () => {
    const onAddProduct = vi.fn();
    supplierHistoryData = [
      {
        productId: 77,
        productName: "Wedding Cake",
        category: "Flower",
        subcategory: "Top Shelf",
        cogsMode: "FIXED",
        unitCost: "2.40",
        unitCostMin: null,
        unitCostMax: null,
        poNumber: "PO-123",
        orderDate: "2026-03-27",
      },
    ];

    render(
      <ProductBrowserGrid
        {...defaultProps}
        supplierId={12}
        onAddProduct={onAddProduct}
      />
    );

    fireEvent.change(screen.getByLabelText(/quantity for wedding cake/i), {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByRole("button", { name: /\+ add/i }));

    expect(onAddProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 77,
        productName: "Wedding Cake",
        category: "Flower",
        subcategory: "Top Shelf",
        quantityOrdered: 6,
        cogsMode: "FIXED",
        unitCost: "2.40",
      })
    );
  });

  it("shows Added state when the selected product is already in the document", () => {
    supplierHistoryData = [
      {
        productId: 77,
        productName: "Wedding Cake",
        category: "Flower",
        subcategory: "Top Shelf",
        cogsMode: "FIXED",
        unitCost: "2.40",
        unitCostMin: null,
        unitCostMax: null,
        poNumber: "PO-123",
        orderDate: "2026-03-27",
      },
    ];

    render(
      <ProductBrowserGrid
        {...defaultProps}
        supplierId={12}
        addedProductIds={new Set([77])}
      />
    );

    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /added/i })).toBeDisabled();
  });

  it("falls back to product catalogue results on the catalog tab when PO products are empty", () => {
    const onAddProduct = vi.fn();
    catalogData = [
      {
        id: 201,
        productName: "Fallback Gelato",
        category: "Flower",
        subcategory: "Smalls",
      },
    ];

    render(
      <ProductBrowserGrid
        {...defaultProps}
        supplierId={12}
        onAddProduct={onAddProduct}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /catalog/i }));
    fireEvent.click(screen.getByRole("button", { name: /\+ add/i }));

    expect(onAddProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 201,
        productName: "Fallback Gelato",
        subcategory: "Smalls",
      })
    );
  });
});
