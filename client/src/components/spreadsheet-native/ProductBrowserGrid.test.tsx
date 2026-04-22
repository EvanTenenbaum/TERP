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
    onSelectedRowChange,
    selectedRowId,
  }: {
    title: string;
    rows?: Array<{ identity: { rowKey: string } }>;
    columnDefs?: Array<{
      cellRenderer?: (params: {
        data?: { identity: { rowKey: string } } | null;
      }) => ReactNode;
    }>;
    onSelectedRowChange?: (
      row: { identity: { rowKey: string } } | null
    ) => void;
    selectedRowId?: string | null;
  }) => (
    <div data-testid={`grid-${title}`}>
      <div>{title}</div>
      {rows.length > 0 && onSelectedRowChange ? (
        <button onClick={() => onSelectedRowChange(rows[0])}>
          Select first row
        </button>
      ) : null}
      {rows.length > 0 && columnDefs[0]?.cellRenderer
        ? columnDefs[0].cellRenderer({
            data:
              rows.find(row => row.identity.rowKey === selectedRowId) ?? null,
          })
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

  it("renders tab toggle with Quick Add, Supplier History, Low Stock, Catalog", () => {
    render(<ProductBrowserGrid {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /quick add/i })
    ).toBeInTheDocument();
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

  it("defaults to the Quick Add tab and shows the blank-row form", () => {
    render(<ProductBrowserGrid {...defaultProps} />);
    expect(
      screen.getByRole("form", { name: /quick add product/i })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/quick add product name/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/quick add sku/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quick add quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quick add unit price/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add to po/i })
    ).toBeInTheDocument();
  });

  it("submits the Quick Add form as a new blank line item", () => {
    const onAddProduct = vi.fn();
    render(
      <ProductBrowserGrid {...defaultProps} onAddProduct={onAddProduct} />
    );
    fireEvent.change(screen.getByLabelText(/quick add product name/i), {
      target: { value: "Mystery Strain" },
    });
    fireEvent.change(screen.getByLabelText(/quick add sku/i), {
      target: { value: "SKU-42" },
    });
    fireEvent.change(screen.getByLabelText(/quick add quantity/i), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/quick add unit price/i), {
      target: { value: "12.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add to po/i }));

    expect(onAddProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: null,
        productName: "Mystery Strain",
        quantityOrdered: 5,
        cogsMode: "FIXED",
        unitCost: "12.5",
        sku: "SKU-42",
        unit: "unit",
      })
    );
  });

  it("blocks the Quick Add submit when the product name is missing", () => {
    const onAddProduct = vi.fn();
    render(
      <ProductBrowserGrid {...defaultProps} onAddProduct={onAddProduct} />
    );
    fireEvent.change(screen.getByLabelText(/quick add unit price/i), {
      target: { value: "1.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add to po/i }));
    expect(onAddProduct).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /product name is required/i
    );
  });

  it("renders search input on list tabs", () => {
    render(<ProductBrowserGrid {...defaultProps} supplierId={12} />);
    fireEvent.click(screen.getByRole("button", { name: /supplier history/i }));
    expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument();
  });

  it("shows empty state when no supplier is selected on Supplier History tab", () => {
    render(<ProductBrowserGrid {...defaultProps} supplierId={null} />);
    fireEvent.click(screen.getByRole("button", { name: /supplier history/i }));
    expect(screen.getByText(/select a supplier first/i)).toBeInTheDocument();
  });

  it("adds the selected supplier-history product on row click (no second click needed)", () => {
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

    fireEvent.click(screen.getByRole("button", { name: /supplier history/i }));
    fireEvent.click(screen.getByText("Select first row"));

    expect(onAddProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 77,
        productName: "Wedding Cake",
        category: "Flower",
        subcategory: "Top Shelf",
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

    fireEvent.click(screen.getByRole("button", { name: /supplier history/i }));
    fireEvent.click(screen.getByText("Select first row"));

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
    fireEvent.click(screen.getByText("Select first row"));

    expect(onAddProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 201,
        productName: "Fallback Gelato",
        subcategory: "Smalls",
      })
    );
  });
});
