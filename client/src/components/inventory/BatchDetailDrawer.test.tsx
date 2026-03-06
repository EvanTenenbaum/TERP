import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchDetailDrawer } from "./BatchDetailDrawer";
import { ThemeProvider } from "@/contexts/ThemeContext";

const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

const hoisted = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  inventoryRefetchMock: vi.fn().mockResolvedValue(undefined),
  productRefetchMock: vi.fn().mockResolvedValue(undefined),
  adjustQtyMutateMock: vi.fn(),
  updateStatusMutateMock: vi.fn(),
  updateBatchMutateAsyncMock: vi.fn().mockResolvedValue({ success: true }),
  updateProductMutateAsyncMock: vi.fn().mockResolvedValue({ success: true }),
  mockStrains: [{ id: 5, name: "Blue Dream" }],
  mockGrades: [
    { id: 1, name: "A" },
    { id: 2, name: "AA" },
  ],
  mockInventoryQueryState: {
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  },
  mockProductQueryState: {
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  },
}));

const createMockQuery = (options: {
  data?: unknown;
  isLoading?: boolean;
  error?: Error | null;
  refetch?: () => Promise<unknown>;
}) => ({
  data: options.data,
  isLoading: options.isLoading ?? false,
  error: options.error ?? null,
  refetch: options.refetch ?? vi.fn().mockResolvedValue(undefined),
});

vi.mock("sonner", () => ({
  toast: {
    success: hoisted.toastSuccessMock,
    error: hoisted.toastErrorMock,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      getById: {
        useQuery: () => hoisted.mockInventoryQueryState,
      },
      profitability: {
        batch: { useQuery: () => ({ data: null, isLoading: false }) },
      },
      updateCogs: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      adjustQty: {
        useMutation: () => ({
          mutate: hoisted.adjustQtyMutateMock,
          isPending: false,
        }),
      },
      updateStatus: {
        useMutation: () => ({
          mutate: hoisted.updateStatusMutateMock,
          isPending: false,
        }),
      },
      updateBatch: {
        useMutation: () => ({
          mutateAsync: hoisted.updateBatchMutateAsyncMock,
          isPending: false,
        }),
      },
    },
    productCatalogue: {
      getById: {
        useQuery: () => hoisted.mockProductQueryState,
      },
      getStrains: {
        useQuery: () => ({ data: hoisted.mockStrains, isLoading: false }),
      },
      update: {
        useMutation: () => ({
          mutateAsync: hoisted.updateProductMutateAsyncMock,
          isPending: false,
        }),
      },
    },
    settings: {
      grades: {
        list: {
          useQuery: () => ({ data: hoisted.mockGrades, isLoading: false }),
        },
      },
    },
    cogs: {
      calculateImpact: { useQuery: () => ({ data: null, isLoading: false }) },
      updateBatchCogs: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    photography: {
      getBatchImages: { useQuery: () => ({ data: [], isLoading: false }) },
      uploadImage: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      deleteImage: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    media: {
      getForEntity: { useQuery: () => ({ data: [], isLoading: false }) },
      upload: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteMedia: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    comments: {
      list: {
        useQuery: () => ({ data: { items: [], total: 0 }, isLoading: false }),
      },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
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

vi.mock("./CogsEditModal", () => ({
  CogsEditModal: () => null,
}));

vi.mock("./PotentialBuyersWidget", () => ({
  PotentialBuyersWidget: () => <div>Potential Buyers Widget</div>,
}));

vi.mock("./PriceSimulationModal", () => ({
  PriceSimulationModal: () => null,
}));

vi.mock("./BatchMediaUpload", () => ({
  BatchMediaUpload: () => <div>Batch Media Upload</div>,
}));

vi.mock("@/components/comments/CommentWidget", () => ({
  CommentWidget: () => <div>Comment Widget</div>,
}));

vi.mock("@/components/AdjustQuantityDialog", () => ({
  AdjustQuantityDialog: () => null,
}));

describe("BatchDetailDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    hoisted.inventoryRefetchMock.mockClear();
    hoisted.productRefetchMock.mockClear();
    hoisted.mockInventoryQueryState = createMockQuery({ data: null });
    hoisted.mockProductQueryState = createMockQuery({ data: null });
  });

  const renderDrawer = (batchId: number | null = 1, open: boolean = true) =>
    render(
      <ThemeProvider>
        <BatchDetailDrawer batchId={batchId} open={open} onClose={vi.fn()} />
      </ThemeProvider>
    );

  const loadBatchWithProduct = (overrides?: { productId?: number | null }) => {
    const batch = {
      id: 1,
      sku: "B-001",
      code: "LOT-001",
      batchStatus: "LIVE",
      onHandQty: "10",
      reservedQty: "1",
      quarantineQty: "0",
      grade: "A",
      isSample: false,
      cogsMode: "FIXED",
      unitCogs: "12.00",
      unitCogsMin: null,
      unitCogsMax: null,
      paymentTerms: "NET_30",
      productId: overrides?.productId === undefined ? 42 : overrides.productId,
      version: 3,
    };

    hoisted.mockInventoryQueryState = createMockQuery({
      data: {
        batch,
        locations: [],
        auditLogs: [],
        availableQty: 9,
      },
      refetch: hoisted.inventoryRefetchMock,
    });

    hoisted.mockProductQueryState = createMockQuery({
      data:
        batch.productId === null
          ? null
          : {
              id: 42,
              brandId: 7,
              brandName: "Farm Co",
              strainId: 5,
              strainName: "Blue Dream",
              nameCanonical: "Blue Dream Flower",
              category: "Flower",
              subcategory: null,
              uomSellable: "EA",
              description: null,
              deletedAt: null,
              createdAt: new Date("2026-03-01T00:00:00Z"),
              updatedAt: new Date("2026-03-01T00:00:00Z"),
            },
      refetch: hoisted.productRefetchMock,
    });
  };

  it("shows error state on API failure", async () => {
    hoisted.mockInventoryQueryState = createMockQuery({
      error: new Error("Network error"),
    });

    renderDrawer();

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load batch details")
      ).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("shows not found state when batch is null", async () => {
    hoisted.mockInventoryQueryState = createMockQuery({
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

  it("renders linked product metadata in the product details section", async () => {
    loadBatchWithProduct();

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText("Blue Dream Flower")).toBeInTheDocument();
      expect(screen.getByText("Flower")).toBeInTheDocument();
      expect(screen.getByText("Blue Dream")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /edit product metadata/i })
      ).toBeEnabled();
    });
  });

  it("shows the missing product guard when the batch is not linked to a product", async () => {
    loadBatchWithProduct({ productId: null });

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText(/missing a linked product/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /edit product metadata/i })
      ).toBeDisabled();
    });
  });

  it("saves product metadata through the product and batch mutations", async () => {
    loadBatchWithProduct();

    renderDrawer();

    fireEvent.click(
      await screen.findByRole("button", { name: /edit product metadata/i })
    );

    fireEvent.change(screen.getByLabelText("Product Name"), {
      target: { value: "Blue Dream Reserve" },
    });
    fireEvent.change(screen.getByLabelText("Grade"), {
      target: { value: "AA" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(hoisted.updateProductMutateAsyncMock).toHaveBeenCalledWith({
        id: 42,
        data: { nameCanonical: "Blue Dream Reserve" },
      });
      expect(hoisted.updateBatchMutateAsyncMock).toHaveBeenCalledWith({
        id: 1,
        version: 3,
        grade: "AA",
        reason: "Updated product metadata from batch drawer",
      });
      expect(hoisted.toastSuccessMock).toHaveBeenCalledWith(
        "Product metadata updated"
      );
    });
  });
});
