/**
 * ProductsPage tests
 * QA-049: Integration tests for Products page data display
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const mockArchivedProduct = {
  id: 3,
  nameCanonical: "Archived Product",
  category: "Concentrate",
  subcategory: null,
  brandId: 1,
  brandName: "Brand A",
  strainId: null,
  strainName: null,
  uomSellable: "EA",
  description: null,
  deletedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

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
let listQueryMock = vi.fn();
let getBrandsMock = vi.fn();
let getStrainsMock = vi.fn();
let getCategoriesMock = vi.fn();
let createMock = vi.fn();
let updateMock = vi.fn();
let deleteMock = vi.fn();
let restoreMock = vi.fn();

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
    useContext: () => ({
      productCatalogue: {
        list: { invalidate: vi.fn() },
        getCategories: { invalidate: vi.fn() },
      },
    }),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe("ProductsPage", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementations
    listQueryMock = vi.fn().mockReturnValue({
      data: {
        items: mockProducts,
        pagination: { total: mockProducts.length, limit: 500, offset: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    getBrandsMock = vi.fn().mockReturnValue({
      data: mockBrands,
    });

    getStrainsMock = vi.fn().mockReturnValue({
      data: mockStrains,
    });

    getCategoriesMock = vi.fn().mockReturnValue({
      data: mockCategories,
    });

    createMock = vi.fn().mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    updateMock = vi.fn().mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    deleteMock = vi.fn().mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    restoreMock = vi.fn().mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Loading State", () => {
    it("shows a skeleton state while loading", () => {
      listQueryMock.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<ProductsPage />);

      expect(screen.getByTestId("products-skeleton")).toBeInTheDocument();
    });
  });

  describe("Data Display", () => {
    it("renders product rows when data is ready", () => {
      renderWithProviders(<ProductsPage />);

      expect(screen.getByText("Blue Dream")).toBeInTheDocument();
      expect(screen.getByText("OG Kush")).toBeInTheDocument();
      expect(screen.getByText("Flower")).toBeInTheDocument();
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

  describe("Empty State (QA-049)", () => {
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

      expect(screen.getByText(/No Products Found/i)).toBeInTheDocument();
      expect(screen.getByText(/No active products were found/i)).toBeInTheDocument();
    });

    it("shows option to view archived products in empty state", () => {
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

      expect(screen.getByRole("button", { name: /Show Archived Products/i })).toBeInTheDocument();
    });

    it("provides refresh button in empty state", () => {
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

      expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
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

      expect(screen.getByTestId("products-error")).toBeInTheDocument();
      expect(screen.getByText(/Error Loading Products/i)).toBeInTheDocument();
    });

    it("provides retry button on error", () => {
      const refetchMock = vi.fn();
      listQueryMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { message: "Failed to fetch products" },
        refetch: refetchMock,
      });

      renderWithProviders(<ProductsPage />);

      const retryButton = screen.getByRole("button", { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(refetchMock).toHaveBeenCalled();
    });
  });

  describe("Archived Products Toggle", () => {
    it("toggles archived products visibility", async () => {
      renderWithProviders(<ProductsPage />);

      const toggleButton = screen.getByRole("button", { name: /Show Archived/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        // Verify the query was called with includeDeleted: true
        expect(listQueryMock).toHaveBeenCalledWith(
          expect.objectContaining({ includeDeleted: true }),
          expect.anything()
        );
      });
    });
  });

  describe("Query Parameters", () => {
    it("calls list query with correct default parameters", () => {
      renderWithProviders(<ProductsPage />);

      expect(listQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 500,
          includeDeleted: false,
        }),
        expect.anything()
      );
    });
  });
});
