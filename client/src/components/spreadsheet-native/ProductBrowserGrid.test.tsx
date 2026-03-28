import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductBrowserGrid } from "./ProductBrowserGrid";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid={`grid-${title}`}>{title}</div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    purchaseOrders: {
      getRecentProductsBySupplier: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
      },
      products: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false })),
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
  },
}));

describe("ProductBrowserGrid", () => {
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
});
