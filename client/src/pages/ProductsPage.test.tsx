/**
 * ProductsPage tests
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductsPage from "./ProductsPage";
import { ThemeProvider } from "@/contexts/ThemeContext";

const useQueryMock = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      list: {
        useQuery: (...args: unknown[]) => useQueryMock(...args),
      },
    },
  },
}));

describe("ProductsPage", () => {
  beforeEach(() => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true });
  });

  it("shows a skeleton state while loading", () => {
    render(
      <ThemeProvider>
        <ProductsPage />
      </ThemeProvider>
    );

    expect(screen.getByTestId("products-skeleton")).toBeInTheDocument();
  });

  it("renders product rows when data is ready", () => {
    useQueryMock.mockReturnValue({
      data: {
        items: [
          {
            batch: { id: 1, onHandQty: "12" },
            product: {
              id: 1,
              nameCanonical: "Widget",
              category: "Flower",
              subcategory: "Sativa",
            },
            brand: { name: "Brand A" },
            vendor: { name: "Vendor A" },
          },
        ],
      },
      isLoading: false,
    });

    render(
      <ThemeProvider>
        <ProductsPage />
      </ThemeProvider>
    );

    expect(screen.getByText(/Widget/)).toBeInTheDocument();
    expect(screen.getByText(/Flower/)).toBeInTheDocument();
  });
});
