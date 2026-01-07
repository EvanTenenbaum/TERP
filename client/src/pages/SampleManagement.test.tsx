/**
 * SampleManagement Page Tests
 * QA-050: Integration tests for Samples page data display
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SampleManagement from "./SampleManagement";

interface SampleRequestMock {
  id: number;
  clientId: number;
  requestedBy: number;
  requestDate: string;
  products: Array<{ productId: number; quantity: string }>;
  sampleRequestStatus: string;
  notes?: string;
  location?: string;
  expirationDate?: string;
  vendorReturnTrackingNumber?: string;
}

const sampleItems: SampleRequestMock[] = [
  {
    id: 1,
    clientId: 1,
    requestedBy: 2,
    requestDate: "2026-01-02T00:00:00.000Z",
    products: [{ productId: 10, quantity: "5" }],
    sampleRequestStatus: "PENDING",
    notes: "Due Date: 2026-01-10",
  },
  {
    id: 2,
    clientId: 2,
    requestedBy: 2,
    requestDate: "2026-01-03T00:00:00.000Z",
    products: [{ productId: 11, quantity: "3" }],
    sampleRequestStatus: "FULFILLED",
    notes: null,
  },
];

let capturedStatus: string | undefined;
let capturedSearch: string | undefined;
let getAllMock = vi.fn();
let refetchMock = vi.fn();

vi.mock("@/components/samples/SampleList", () => ({
  SampleList: (props: { statusFilter: string; searchQuery: string; samples: unknown[]; isLoading: boolean }) => {
    capturedStatus = props.statusFilter;
    capturedSearch = props.searchQuery;
    return (
      <div data-testid="sample-list-mock">
        <span data-testid="sample-count">{props.samples?.length ?? 0} samples</span>
        <span data-testid="loading-state">{props.isLoading ? 'loading' : 'loaded'}</span>
      </div>
    );
  },
}));

vi.mock("@/components/samples/SampleForm", () => ({
  SampleForm: (props: { open: boolean }) =>
    props.open ? <div data-testid="sample-form">Form Open</div> : null,
}));

vi.mock("@/components/samples/SampleReturnDialog", () => ({
  SampleReturnDialog: () => null,
}));

vi.mock("@/components/samples/VendorShipDialog", () => ({
  VendorShipDialog: () => null,
}));

vi.mock("@/components/samples/LocationUpdateDialog", () => ({
  LocationUpdateDialog: () => null,
}));

vi.mock("@/components/samples/ExpiringSamplesWidget", () => ({
  ExpiringSamplesWidget: () => <div data-testid="expiring-widget">Expiring Widget</div>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Test User" },
    loading: false,
    error: null,
    isAuthenticated: true,
    refresh: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock mutation helper
const mockMutation = () => ({
  mutateAsync: vi.fn(),
  mutate: vi.fn(),
  isPending: false,
  isLoading: false,
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    samples: {
      getAll: {
        useQuery: (...args: unknown[]) => getAllMock(...args),
      },
      getPending: {
        useQuery: () => ({
          data: { items: sampleItems.filter(s => s.sampleRequestStatus === 'PENDING'), pagination: { total: 1 } },
          isLoading: false,
        }),
      },
      createRequest: {
        useMutation: () => mockMutation(),
      },
      cancelRequest: {
        useMutation: () => mockMutation(),
      },
      fulfillRequest: {
        useMutation: () => mockMutation(),
      },
      // SAMPLE-006: Sample Return Workflow
      requestReturn: {
        useMutation: () => mockMutation(),
      },
      approveReturn: {
        useMutation: () => mockMutation(),
      },
      completeReturn: {
        useMutation: () => mockMutation(),
      },
      // SAMPLE-007: Vendor Return Workflow
      requestVendorReturn: {
        useMutation: () => mockMutation(),
      },
      shipToVendor: {
        useMutation: () => mockMutation(),
      },
      confirmVendorReturn: {
        useMutation: () => mockMutation(),
      },
      // SAMPLE-008: Location Tracking
      updateLocation: {
        useMutation: () => mockMutation(),
      },
      getLocationHistory: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
      // SAMPLE-009: Expiration Tracking
      getExpiring: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
      setExpirationDate: {
        useMutation: () => mockMutation(),
      },
    },
    clients: {
      list: {
        useQuery: () => ({ data: { items: [{ id: 1, name: "Client A" }, { id: 2, name: "Client B" }] } }),
      },
    },
    search: {
      global: {
        useQuery: () => ({ data: { products: [] }, isLoading: false }),
      },
    },
    useUtils: () => ({
      samples: {
        getAll: { invalidate: vi.fn() },
        getPending: { invalidate: vi.fn() },
      },
    }),
  },
}));

describe("SampleManagement", () => {
  beforeEach(() => {
    capturedStatus = undefined;
    capturedSearch = undefined;
    refetchMock = vi.fn();

    // Default mock - samples with data
    getAllMock = vi.fn().mockReturnValue({
      data: { items: sampleItems, pagination: { total: sampleItems.length } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Data Display", () => {
    it("defaults to All tab and renders search", () => {
      render(<SampleManagement />);

      expect(screen.getByPlaceholderText(/search samples/i)).toBeInTheDocument();
      expect(capturedStatus).toBe("ALL");
    });

    it("renders sample list with data", () => {
      render(<SampleManagement />);

      expect(screen.getByTestId("sample-list-mock")).toBeInTheDocument();
      expect(screen.getByTestId("sample-count")).toHaveTextContent("2 samples");
    });

    it("displays status counts correctly", () => {
      render(<SampleManagement />);

      expect(screen.getByText(/All 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending 1/i)).toBeInTheDocument();
    });
  });

  describe("Tab Filtering", () => {
    it("updates status filter when tab clicked", async () => {
      render(<SampleManagement />);

      const pendingTab = screen.getByRole("tab", { name: /pending/i });
      fireEvent.click(pendingTab);

      await waitFor(() => expect(capturedStatus).toBe("PENDING"));
    });

    it("updates status filter to Approved when clicked", async () => {
      render(<SampleManagement />);

      const approvedTab = screen.getByRole("tab", { name: /approved/i });
      fireEvent.click(approvedTab);

      await waitFor(() => expect(capturedStatus).toBe("FULFILLED"));
    });
  });

  describe("Sample Form", () => {
    it("opens creation form from action button", () => {
      render(<SampleManagement />);

      fireEvent.click(screen.getByRole("button", { name: /new sample/i }));
      expect(screen.getByTestId("sample-form")).toBeInTheDocument();
    });
  });

  describe("Search", () => {
    it("passes search query to list", () => {
      render(<SampleManagement />);

      const searchInput = screen.getByPlaceholderText(/search samples/i);
      fireEvent.change(searchInput, { target: { value: "alpha" } });
      expect(capturedSearch).toBe("alpha");
    });
  });

  describe("Empty State (QA-050)", () => {
    it("shows empty state message when no samples exist", () => {
      getAllMock.mockReturnValue({
        data: { items: [], pagination: { total: 0 } },
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchMock,
      });

      render(<SampleManagement />);

      expect(screen.getByTestId("samples-empty")).toBeInTheDocument();
      expect(screen.getByText(/No Samples Found/i)).toBeInTheDocument();
    });

    it("provides create button in empty state", () => {
      getAllMock.mockReturnValue({
        data: { items: [], pagination: { total: 0 } },
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchMock,
      });

      render(<SampleManagement />);

      expect(screen.getByRole("button", { name: /Create New Sample Request/i })).toBeInTheDocument();
    });

    it("provides refresh button in empty state", () => {
      getAllMock.mockReturnValue({
        data: { items: [], pagination: { total: 0 } },
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchMock,
      });

      render(<SampleManagement />);

      expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("shows error state when query fails", () => {
      getAllMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { message: "Failed to fetch samples" },
        refetch: refetchMock,
      });

      render(<SampleManagement />);

      expect(screen.getByTestId("samples-error")).toBeInTheDocument();
      expect(screen.getByText(/Error Loading Samples/i)).toBeInTheDocument();
    });

    it("provides retry button on error", () => {
      getAllMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { message: "Failed to fetch samples" },
        refetch: refetchMock,
      });

      render(<SampleManagement />);

      const retryButton = screen.getByRole("button", { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(refetchMock).toHaveBeenCalled();
    });
  });

  describe("Query Parameters", () => {
    it("calls getAll query with correct parameters", () => {
      render(<SampleManagement />);

      expect(getAllMock).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 200,
        }),
        expect.anything()
      );
    });
  });

  describe("Widgets", () => {
    it("renders expiring samples widget", () => {
      render(<SampleManagement />);

      expect(screen.getByTestId("expiring-widget")).toBeInTheDocument();
    });
  });
});
