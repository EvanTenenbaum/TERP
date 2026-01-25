/**
 * ProductsPage tests
 * QA-049: Integration tests for Products page data display
 * WS-PROD-001: Updated for ProductsWorkSurface
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductsPage from "./ProductsPage";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Mock data for products
const mockProducts = [
  {
    id: 1,
    nameCanonical: "Blue Dream",
    category: "Flower",
    subcategory: "Sativa",
    brandId: 1,
    brandName: "Brand A",
    strainId: 1,
    strainName: "Blue Dream",
    uomSellable: "G",
    description: "A great hybrid strain",
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    nameCanonical: "OG Kush",
    category: "Flower",
    subcategory: "Indica",
    brandId: 2,
    brandName: "Brand B",
    strainId: 2,
    strainName: "OG Kush",
    uomSellable: "G",
    description: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockBrands = [
  { id: 1, name: "Brand A" },
  { id: 2, name: "Brand B" },
];

const mockStrains = [
  { id: 1, name: "Blue Dream", category: "Sativa" },
  { id: 2, name: "OG Kush", category: "Indica" },
];

const mockCategories = ["Flower", "Concentrate", "Edible"];

// Mock functions
const listQueryMock = vi.fn();
const getBrandsMock = vi.fn();
const getStrainsMock = vi.fn();
const getCategoriesMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const restoreMock = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    productCatalogue: {
      list: {
        useQuery: (...args: unknown[]) => listQueryMock(...args),
      },
      getBrands: {
        useQuery: () => getBrandsMock(),
      },
      getStrains: {
        useQuery: () => getStrainsMock(),
      },
      getCategories: {
        useQuery: () => getCategoriesMock(),
      },
      create: {
        useMutation: () => createMock(),
      },
      update: {
        useMutation: () => updateMock(),
      },
      delete: {
        useMutation: () => deleteMock(),
      },
      restore: {
        useMutation: () => restoreMock(),
      },
    },
    settings: {
      categories: {
        list: { useQuery: () => ({ data: [], isLoading: false }) },
      },
      subcategories: {
        list: { useQuery: () => ({ data: [], isLoading: false }) },
      },
    },
    useContext: () => ({
      productCatalogue: {
        list: { invalidate: vi.fn() },
        getCategories: { invalidate: vi.fn() },
      },
    }),
  },
}));

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/products", vi.fn()],
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe("ProductsPage", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementations
    listQueryMock.mockReturnValue({
      data: {
        items: mockProducts,
        pagination: { total: mockProducts.length, limit: 500, offset: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    getBrandsMock.mockReturnValue({
      data: mockBrands,
    });

    getStrainsMock.mockReturnValue({
      data: mockStrains,
    });

    getCategoriesMock.mockReturnValue({
      data: mockCategories,
    });

    createMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });

    updateMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });

    deleteMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });

    restoreMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Loading State", () => {
    it("renders without error while loading", () => {
      listQueryMock.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      // Should render without throwing
      const { container } = renderWithProviders(<ProductsPage />);
      expect(container).toBeTruthy();
    });
  });

  describe("Data Display", () => {
    it("renders product rows when data is ready", () => {
      renderWithProviders(<ProductsPage />);

      // Use getAllByText since product name appears in multiple places
      expect(screen.getAllByText("Blue Dream").length).toBeGreaterThan(0);
      expect(screen.getAllByText("OG Kush").length).toBeGreaterThan(0);
    });

    it("displays product category correctly", () => {
      renderWithProviders(<ProductsPage />);

      const flowerCells = screen.getAllByText("Flower");
      expect(flowerCells.length).toBeGreaterThan(0);
    });

    it("displays brand names correctly", () => {
      renderWithProviders(<ProductsPage />);

      expect(screen.getByText("Brand A")).toBeInTheDocument();
      expect(screen.getByText("Brand B")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows empty state message when no products exist", () => {
      listQueryMock.mockReturnValue({
        data: {
          items: [],
          pagination: { total: 0, limit: 500, offset: 0 },
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<ProductsPage />);

      // ProductsWorkSurface shows "No products found" in empty state
      expect(screen.getByText(/No products found/i)).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("shows error state when query fails", () => {
      listQueryMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { message: "Failed to fetch products" },
        refetch: vi.fn(),
      });

      renderWithProviders(<ProductsPage />);

      expect(screen.getByText(/Error Loading Products/i)).toBeInTheDocument();
    });
  });
});
