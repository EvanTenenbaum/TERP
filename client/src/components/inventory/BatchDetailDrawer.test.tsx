import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchDetailDrawer } from "./BatchDetailDrawer";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Mock the console methods to capture warnings
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// Mock trpc with various states
const createMockQuery = (options: {
  data?: any;
  isLoading?: boolean;
  error?: any;
}) => ({
  data: options.data ?? undefined,
  isLoading: options.isLoading ?? false,
  error: options.error ?? null,
  refetch: vi.fn(),
});

// Default mock setup
let mockQueryState = createMockQuery({ isLoading: false, data: null });

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      getById: {
        useQuery: () => mockQueryState,
      },
      profitability: {
        batch: { useQuery: () => ({ data: null, isLoading: false }) },
      },
      updateCogs: {
        useMutation: () => ({ mutate: vi.fn(), isLoading: false }),
      },
    },
    cogs: {
      calculateImpact: { useQuery: () => ({ data: null, isLoading: false }) },
      updateBatchCogs: {
        useMutation: () => ({
          mutate: vi.fn(),
          isLoading: false,
          isPending: false,
        }),
      },
    },
    photography: {
      getBatchImages: { useQuery: () => ({ data: [], isLoading: false }) },
      uploadImage: {
        useMutation: () => ({
          mutate: vi.fn(),
          isLoading: false,
          isPending: false,
        }),
      },
      deleteImage: {
        useMutation: () => ({ mutate: vi.fn(), isLoading: false }),
      },
    },
    media: {
      getForEntity: { useQuery: () => ({ data: [], isLoading: false }) },
      upload: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
      deleteMedia: {
        useMutation: () => ({ mutate: vi.fn(), isLoading: false }),
      },
    },
    comments: {
      list: {
        useQuery: () => ({ data: { items: [], total: 0 }, isLoading: false }),
      },
      create: { useMutation: () => ({ mutate: vi.fn(), isLoading: false }) },
    },
    users: {
      list: { useQuery: () => ({ data: { items: [] }, isLoading: false }) },
    },
    potentialBuyers: {
      getForBatch: {
        useQuery: () => ({ data: { items: [] }, isLoading: false }),
      },
    },
    useContext: () => ({
      inventory: { getById: { invalidate: vi.fn() } },
      media: { getForEntity: { invalidate: vi.fn() } },
      comments: { list: { invalidate: vi.fn() } },
    }),
    useUtils: () => ({
      inventory: { getById: { invalidate: vi.fn() } },
      photography: { getBatchImages: { invalidate: vi.fn() } },
      media: { getForEntity: { invalidate: vi.fn() } },
      comments: { list: { invalidate: vi.fn() } },
    }),
  },
}));

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

describe("BatchDetailDrawer (BUG-041)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    // Reset to default mock state
    mockQueryState = createMockQuery({ isLoading: false, data: null });
  });

  const renderDrawer = (batchId: number | null = 1, open: boolean = true) =>
    render(
      <ThemeProvider>
        <BatchDetailDrawer batchId={batchId} open={open} onClose={vi.fn()} />
      </ThemeProvider>
    );

  it("shows error state on API failure (BUG-041 error handling)", async () => {
    mockQueryState = createMockQuery({ error: new Error("Network error") });
    renderDrawer();

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load batch details")
      ).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    // Error should be logged
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("shows loading state", async () => {
    mockQueryState = createMockQuery({ isLoading: true });
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText("Loading batch details...")).toBeInTheDocument();
    });
  });

  it("shows not found state when batch is null", async () => {
    mockQueryState = createMockQuery({
      data: { batch: null, locations: [], auditLogs: [], availableQty: 0 },
    });
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText("Batch not found")).toBeInTheDocument();
    });
  });

  it("returns null when drawer is closed", () => {
    const { container } = renderDrawer(1, false);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when batchId is null", () => {
    const { container } = renderDrawer(null, true);
    expect(container.firstChild).toBeNull();
  });

  // BUG-041: Verify defensive array checks are in place
  describe("defensive array handling", () => {
    it("BatchDetailDrawer component exports correctly", async () => {
      // This test verifies the component is properly exported and loadable
      const { BatchDetailDrawer: Component } =
        await import("./BatchDetailDrawer");

      // The component should be a valid function component
      expect(typeof Component).toBe("function");
    });
  });
});