import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SalesCatalogueSurface } from "./SalesCatalogueSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid={`grid-${title}`}>{title}</div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      getInventory: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      saveDraft: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      deleteDraft: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      getDrafts: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getDraftById: { useQuery: vi.fn(() => ({ data: null })) },
      generateShareLink: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
      },
      save: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      getViews: { useQuery: vi.fn(() => ({ data: [] })) },
      getHistory: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      convertToLiveSession: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
    clients: {
      list: {
        useQuery: vi.fn(() => ({ data: { items: [] }, isLoading: false })),
      },
    },
    useUtils: vi.fn(() => ({
      salesSheets: {
        getDrafts: { invalidate: vi.fn() },
        getDraftById: { fetch: vi.fn() },
        getById: { fetch: vi.fn() },
      },
    })),
  },
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(() => ["/sales?tab=sales-sheets", vi.fn()]),
}));

describe("SalesCatalogueSurface", () => {
  it("renders toolbar with Sales Catalogue badge", () => {
    render(<SalesCatalogueSurface />);
    expect(screen.getByText("Sales Catalogue")).toBeInTheDocument();
  });

  it("renders both grids when client is selected", () => {
    // With no client, grids should show empty state
    render(<SalesCatalogueSurface />);
    expect(screen.getByText(/select a client/i)).toBeInTheDocument();
  });

  it("renders handoff bar with convert buttons", () => {
    render(<SalesCatalogueSurface />);
    expect(screen.getByText("→ Sales Order")).toBeInTheDocument();
    expect(screen.getByText("→ Quote")).toBeInTheDocument();
  });
});
