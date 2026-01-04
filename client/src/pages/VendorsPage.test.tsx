/**
 * VendorsPage tests
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VendorsPage from "./VendorsPage";
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

describe("VendorsPage", () => {
  beforeEach(() => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true });
  });

  it("shows a skeleton state while loading", () => {
    render(
      <ThemeProvider>
        <VendorsPage />
      </ThemeProvider>
    );

    expect(screen.getByTestId("vendors-skeleton")).toBeInTheDocument();
  });

  it("renders vendor rows when data is ready", () => {
    useQueryMock.mockReturnValue({
      data: {
        items: [
          {
            batch: { id: 1, onHandQty: "8" },
            product: { id: 1, nameCanonical: "Widget" },
            brand: { name: "Brand A" },
            vendor: { id: 2, name: "Vendor B" },
          },
        ],
      },
      isLoading: false,
    });

    render(
      <ThemeProvider>
        <VendorsPage />
      </ThemeProvider>
    );

    expect(screen.getByText(/Vendor B/)).toBeInTheDocument();
  });
});
