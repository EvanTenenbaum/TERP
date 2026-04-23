/**
 * MatchmakingServicePage Tests
 *
 * Tests for the Matchmaking Service page, specifically testing that
 * the Add Need and Add Supply buttons open modals (TER-888).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchmakingServicePage, {
  buildQuoteMatchComposerPath,
} from "./MatchmakingServicePage";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";

let mockSupplyItems = [
  {
    id: 77,
    vendorName: "",
    category: "Flower",
    grade: "A",
    productName: "Blue Dream",
    buyerCount: 0,
    quantityAvailable: "5",
    unitPrice: "1200",
  },
];

// Mock wouter's useLocation hook
const mockSetLocation = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["", mockSetLocation],
}));

// Mock BackButton component
vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => <div data-testid="back-button">Back Button</div>,
}));

// Mock MatchBadge component
vi.mock("@/components/needs/MatchBadge", () => ({
  MatchBadge: () => <div data-testid="match-badge">Match Badge</div>,
}));

// Mock display helpers
vi.mock("@/lib/displayHelpers", () => ({
  getProductDisplayName: (item: { productName?: string }) =>
    item.productName || "Unknown Product",
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// BUG-108: Mock tRPC with all required hooks including useUtils
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      clientNeeds: {
        getAllWithMatches: { invalidate: vi.fn() },
      },
      vendorSupply: {
        getAllWithMatches: { invalidate: vi.fn() },
        getAll: { invalidate: vi.fn() },
      },
      matching: {
        getAllActiveNeedsWithMatches: { invalidate: vi.fn() },
      },
      clients: {
        list: { invalidate: vi.fn() },
      },
    }),
    vendorSupply: {
      getAllWithMatches: {
        useQuery: () => ({
          data: { data: mockSupplyItems },
          isLoading: false,
          error: null,
        }),
      },
      getAll: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
      },
      reserve: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
    clients: {
      list: {
        useQuery: () => ({
          data: { items: [] },
          isLoading: false,
          error: null,
        }),
      },
    },
    clientNeeds: {
      getAllWithMatches: {
        useQuery: () => ({
          data: { needs: [], totalCount: 0 },
          isLoading: false,
          error: null,
        }),
      },
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
    matching: {
      getAllActiveNeedsWithMatches: {
        useQuery: () => ({
          data: {
            data: [
              {
                needId: 12,
                supplyId: 44,
                clientId: 7,
                confidence: 90,
                type: "DIRECT",
                source: "Need match",
                reasons: ["Fits requested quantity"],
              },
            ],
          },
          isLoading: false,
          error: null,
        }),
      },
      findMatchesForVendorSupply: {
        useQuery: () => ({
          data: { matches: [] },
          isLoading: false,
          error: null,
        }),
      },
      reserveVendorSupply: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
      dismissMatch: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

describe("MatchmakingServicePage - Button Navigation", () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
    mockSupplyItems = [
      {
        id: 77,
        vendorName: "",
        category: "Flower",
        grade: "A",
        productName: "Blue Dream",
        buyerCount: 0,
        quantityAvailable: "5",
        unitPrice: "1200",
      },
    ];
  });

  it("should render the page with Add Need and Add Supply buttons", () => {
    render(<MatchmakingServicePage />);

    expect(
      screen.getByRole("button", { name: /add need/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add supply/i })
    ).toBeInTheDocument();
  });

  it("should open Add Need modal when Add Need button is clicked (TER-888)", () => {
    render(<MatchmakingServicePage />);

    const addNeedButton = screen.getByRole("button", { name: /add need/i });
    fireEvent.click(addNeedButton);

    // Modal should open instead of navigating away
    expect(mockSetLocation).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should open Add Supply modal when Add Supply button is clicked (TER-888)", () => {
    render(<MatchmakingServicePage />);

    const addSupplyButton = screen.getByRole("button", { name: /add supply/i });
    fireEvent.click(addSupplyButton);

    // Modal should open instead of navigating away
    expect(mockSetLocation).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should not navigate away when Add Need or Add Supply is clicked", () => {
    render(<MatchmakingServicePage />);

    const addNeedButton = screen.getByRole("button", { name: /add need/i });
    fireEvent.click(addNeedButton);
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("builds Create Quote routes against the quote composer instead of the registry", () => {
    expect(
      buildQuoteMatchComposerPath({
        needId: 12,
        supplyId: 44,
        clientId: 7,
        confidence: 90,
        reasons: [],
      })
    ).toBe(
      buildSalesWorkspacePath("create-order", {
        mode: "quote",
        needId: 12,
        supplyId: 44,
        clientId: 7,
      })
    );
  });

  it("routes the visible Create Quote action into the quote composer", () => {
    render(<MatchmakingServicePage />);

    fireEvent.click(screen.getByRole("button", { name: /create quote/i }));

    expect(mockSetLocation).toHaveBeenCalledWith(
      buildSalesWorkspacePath("create-order", {
        mode: "quote",
        needId: 12,
        supplyId: 44,
        clientId: 7,
      })
    );
  });

  it("shows fallback supplier text plus quantity context on supply cards", () => {
    render(<MatchmakingServicePage />);

    expect(screen.getByText("Supplier: Unknown supplier")).toBeInTheDocument();
    expect(screen.getAllByText(/5 lbs available/i).length).toBeGreaterThan(0);
  });

  it("shows supplier name when vendorName is provided (TER-973)", () => {
    // Update mock to include a supplier with a name
    mockSupplyItems = [
      {
        id: 88,
        vendorName: "Green Valley Farms",
        category: "Flower",
        grade: "A+",
        productName: "Wedding Cake",
        buyerCount: 2,
        quantityAvailable: "10",
        unitPrice: "1500",
      },
    ];

    render(<MatchmakingServicePage />);

    expect(screen.getByText("Supplier: Green Valley Farms")).toBeInTheDocument();
  });

  it("disables Reserve when no active buyer needs exist", () => {
    render(<MatchmakingServicePage />);

    expect(screen.getByRole("button", { name: /reserve/i })).toBeDisabled();
  });
});
