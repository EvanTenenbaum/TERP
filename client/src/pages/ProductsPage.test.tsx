/**
 * ProductsPage tests
 * TER-642: Updated for Strains management UI at /products
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductsPage from "./ProductsPage";
import { ThemeProvider } from "@/contexts/ThemeContext";

const mockStrains = [
  {
    id: 1,
    name: "Blue Dream",
    category: "hybrid",
    description: "A great hybrid strain",
    standardizedName: "Blue Dream",
    aliases: null,
    openthcId: null,
    openthcStub: null,
    parentStrainId: null,
    baseStrainName: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "OG Kush",
    category: "indica",
    description: null,
    standardizedName: "OG Kush",
    aliases: null,
    openthcId: null,
    openthcStub: null,
    parentStrainId: null,
    baseStrainName: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const listQueryMock = vi.fn();
const createMutationMock = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    strains: {
      list: {
        useQuery: (...args: unknown[]) => listQueryMock(...args),
      },
      create: {
        useMutation: (...args: unknown[]) => createMutationMock(...args),
      },
    },
    useUtils: () => ({
      strains: {
        list: { invalidate: vi.fn() },
      },
    }),
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/products", vi.fn()],
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe("ProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listQueryMock.mockReturnValue({
      data: {
        items: mockStrains,
        total: mockStrains.length,
        hasMore: false,
        limit: 500,
        offset: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    createMutationMock.mockReturnValue({
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

      const { container } = renderWithProviders(<ProductsPage />);
      expect(container).toBeTruthy();
    });
  });

  describe("Data Display", () => {
    it("renders strain rows when data is ready", () => {
      renderWithProviders(<ProductsPage />);

      expect(screen.getAllByText("Blue Dream").length).toBeGreaterThan(0);
      expect(screen.getAllByText("OG Kush").length).toBeGreaterThan(0);
    });

    it("displays page heading with Products and Strains text", () => {
      renderWithProviders(<ProductsPage />);

      expect(screen.getAllByText(/Products/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Strains/i).length).toBeGreaterThan(0);
    });

    it("displays strain category correctly", () => {
      renderWithProviders(<ProductsPage />);

      expect(screen.getByText("Hybrid")).toBeInTheDocument();
      expect(screen.getByText("Indica")).toBeInTheDocument();
    });

    it("has a Create Strain button", () => {
      renderWithProviders(<ProductsPage />);

      expect(
        screen.getByRole("button", { name: /Create Strain/i })
      ).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows empty state message when no strains exist", () => {
      listQueryMock.mockReturnValue({
        data: {
          items: [],
          total: 0,
          hasMore: false,
          limit: 500,
          offset: 0,
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<ProductsPage />);

      expect(screen.getByText(/No strains found/i)).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("shows error state when query fails", () => {
      listQueryMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { message: "Failed to fetch strains" },
        refetch: vi.fn(),
      });

      renderWithProviders(<ProductsPage />);

      expect(screen.getByText(/Error Loading Strains/i)).toBeInTheDocument();
    });
  });
});
