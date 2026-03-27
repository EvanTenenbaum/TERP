/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";

const mockSetLocation = vi.fn();
let mockSpreadsheetEnabled = true;
const { mockGlobalSearchUseQuery } = vi.hoisted(() => ({
  mockGlobalSearchUseQuery: vi.fn(),
}));

// Track the current mock query return value so tests can override it
let mockSearchQueryResult: {
  data?: {
    quotes: Array<{
      id: number;
      title: string;
      description?: string;
      url: string;
      type: string;
      metadata?: Record<string, unknown>;
    }>;
    customers: Array<{
      id: number;
      title: string;
      description?: string;
      url: string;
      type: string;
      metadata?: Record<string, unknown>;
    }>;
    products: Array<{
      id: number;
      title: string;
      description?: string;
      url: string;
      type: string;
      metadata?: Record<string, unknown>;
    }>;
  };
  isLoading: boolean;
} = { data: undefined, isLoading: false };

vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation] as const,
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlags: () => ({
    flags: { "spreadsheet-view": mockSpreadsheetEnabled },
    isLoading: false,
    error: null,
    isEnabled: (key: string) =>
      key === "spreadsheet-view" && mockSpreadsheetEnabled,
    isModuleEnabled: () => true,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    search: {
      global: {
        useQuery: mockGlobalSearchUseQuery,
      },
    },
  },
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    mockSpreadsheetEnabled = true;
    mockSetLocation.mockClear();
    mockSearchQueryResult = { data: undefined, isLoading: false };
    mockGlobalSearchUseQuery.mockReset();
    mockGlobalSearchUseQuery.mockImplementation(() => mockSearchQueryResult);
  });

  it("omits feature-flagged navigation entries when disabled", () => {
    mockSpreadsheetEnabled = false;
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.queryByText("Spreadsheet View")).not.toBeInTheDocument();
  });

  it("does not surface absorbed spreadsheet navigation even when enabled", () => {
    mockSpreadsheetEnabled = true;
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.queryByText("Spreadsheet View")).not.toBeInTheDocument();
  });

  it("uses the renamed receiving action and inventory navigation label", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.getByText("Record Receiving")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("shows loading indicator while searching", async () => {
    mockSearchQueryResult = { data: undefined, isLoading: true };
    vi.useFakeTimers();
    render(<CommandPalette open onOpenChange={() => {}} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "test" } });
    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText("Searching...")).toBeInTheDocument();
    });
  });

  it("renders search results for quotes when returned from API", async () => {
    mockSearchQueryResult = {
      isLoading: false,
      data: {
        quotes: [
          {
            id: 1,
            title: "Quote #Q-001",
            description: "Test quote",
            url: "/quotes?selected=1",
            type: "quote",
            metadata: {},
          },
        ],
        customers: [],
        products: [],
      },
    };

    render(<CommandPalette open onOpenChange={() => {}} />);

    // The debounced value only fires after 300ms and > 2 chars.
    // We bypass the debounce by directly verifying the mock data renders
    // when the component's debouncedQuery would be set. To do that we
    // manipulate the input and use fake timers.
    vi.useFakeTimers();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "test query" } });

    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText("Quote #Q-001")).toBeInTheDocument();
    });
  });

  it("renders search results for customers when returned from API", async () => {
    mockSearchQueryResult = {
      isLoading: false,
      data: {
        quotes: [],
        customers: [
          {
            id: 2,
            title: "Acme Corp",
            description: "acme@example.com",
            url: "/clients/2?section=overview",
            type: "customer",
            metadata: { relationshipLabel: "Customer" },
          },
        ],
        products: [],
      },
    };

    render(<CommandPalette open onOpenChange={() => {}} />);

    vi.useFakeTimers();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "acme" } });

    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });

  it("renders search results for products when returned from API", async () => {
    mockSearchQueryResult = {
      isLoading: false,
      data: {
        quotes: [],
        customers: [],
        products: [
          {
            id: 3,
            title: "Blue Dream Flower",
            description: "Sativa",
            url: "/products/3",
            type: "product",
            metadata: {},
          },
        ],
      },
    };

    render(<CommandPalette open onOpenChange={() => {}} />);

    vi.useFakeTimers();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "blue" } });

    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText("Blue Dream Flower")).toBeInTheDocument();
    });
  });

  it("does not fire search query when input is 2 chars or fewer", () => {
    vi.useFakeTimers();
    render(<CommandPalette open onOpenChange={() => {}} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "ab" } });
    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    // With <= 2 chars, the search group never renders
    expect(screen.queryByText("Searching...")).not.toBeInTheDocument();
    expect(screen.queryByText("Quotes")).not.toBeInTheDocument();
    expect(mockGlobalSearchUseQuery).toHaveBeenLastCalledWith(
      { query: "" },
      { enabled: false }
    );
  });

  it("trims whitespace-only input so global search never enables", () => {
    vi.useFakeTimers();
    render(<CommandPalette open onOpenChange={() => {}} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "   " } });
    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    expect(mockGlobalSearchUseQuery).toHaveBeenLastCalledWith(
      { query: "" },
      { enabled: false }
    );
  });

  it("passes a trimmed query to search results", async () => {
    mockSearchQueryResult = {
      isLoading: false,
      data: {
        quotes: [],
        customers: [],
        products: [],
      },
    };

    vi.useFakeTimers();
    render(<CommandPalette open onOpenChange={() => {}} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "  quote  " } });
    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockGlobalSearchUseQuery).toHaveBeenLastCalledWith(
        { query: "quote" },
        { enabled: true }
      );
    });
  });
});
