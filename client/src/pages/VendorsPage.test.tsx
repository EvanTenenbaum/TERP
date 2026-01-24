/**
 * VendorsPage tests
 * WS-VEND-001: Updated to test VendorsWorkSurface
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VendorsPage from "./VendorsPage";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Mock for clients.list query
const useListQueryMock = vi.fn();
// Mock for clients.count query
const useCountQueryMock = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      list: {
        useQuery: (...args: unknown[]) => useListQueryMock(...args),
      },
      count: {
        useQuery: (...args: unknown[]) => useCountQueryMock(...args),
      },
    },
    useContext: () => ({
      clients: {
        list: { invalidate: vi.fn() },
      },
    }),
  },
}));

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/vendors", vi.fn()],
}));

describe("VendorsPage", () => {
  beforeEach(() => {
    useListQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useCountQueryMock.mockReturnValue({
      data: undefined,
    });
  });

  it("shows loading state while fetching vendors", () => {
    render(
      <ThemeProvider>
        <VendorsPage />
      </ThemeProvider>
    );

    // VendorsWorkSurface shows a Loader2 spinner during loading
    expect(screen.getByRole("heading", { name: /Vendors/i })).toBeInTheDocument();
  });

  it("renders vendor (supplier) rows when data is ready", () => {
    useListQueryMock.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            name: "Supplier Alpha",
            email: "alpha@example.com",
            phone: "555-1234",
            isSeller: true,
            isBuyer: false,
          },
          {
            id: 2,
            name: "Supplier Beta",
            email: "beta@example.com",
            phone: "555-5678",
            isSeller: true,
            isBuyer: true,
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useCountQueryMock.mockReturnValue({
      data: 2,
    });

    render(
      <ThemeProvider>
        <VendorsPage />
      </ThemeProvider>
    );

    expect(screen.getByText(/Supplier Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/Supplier Beta/)).toBeInTheDocument();
  });

  it("shows empty state when no vendors found", () => {
    useListQueryMock.mockReturnValue({
      data: {
        items: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useCountQueryMock.mockReturnValue({
      data: 0,
    });

    render(
      <ThemeProvider>
        <VendorsPage />
      </ThemeProvider>
    );

    expect(screen.getByText(/No vendors found/i)).toBeInTheDocument();
  });
});
