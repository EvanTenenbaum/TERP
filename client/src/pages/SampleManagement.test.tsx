/**
 * SampleManagement Page Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
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
];

let capturedStatus: string | undefined;
let capturedSearch: string | undefined;

vi.mock("@/components/samples/SampleList", () => ({
  SampleList: (props: { statusFilter: string; searchQuery: string }) => {
    capturedStatus = props.statusFilter;
    capturedSearch = props.searchQuery;
    return <div data-testid="sample-list-mock">List</div>;
  },
}));

vi.mock("@/components/samples/SampleForm", () => ({
  SampleForm: (props: { open: boolean }) =>
    props.open ? <div data-testid="sample-form">Form Open</div> : null,
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
        useQuery: () => ({
          data: { items: sampleItems, pagination: { total: 1 } },
          isLoading: false,
        }),
      },
      getPending: {
        useQuery: () => ({
          data: { items: sampleItems, pagination: { total: 1 } },
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
        useQuery: () => ({ data: { items: [{ id: 1, name: "Client A" }] } }),
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

beforeEach(() => {
  capturedStatus = undefined;
  capturedSearch = undefined;
});

describe("SampleManagement", () => {
  it("defaults to All tab and renders search", () => {
    render(<SampleManagement />);

    expect(screen.getByPlaceholderText(/search samples/i)).toBeInTheDocument();
    expect(capturedStatus).toBe("ALL");
  });

  it("updates status filter when tab clicked", async () => {
    render(<SampleManagement />);

    const pendingTab = screen.getByRole("tab", { name: /pending/i });
    fireEvent.click(pendingTab);

    await waitFor(() => expect(capturedStatus).toBe("PENDING"));
  });

  it("opens creation form from action button", () => {
    render(<SampleManagement />);

    fireEvent.click(screen.getByRole("button", { name: /new sample/i }));
    expect(screen.getByTestId("sample-form")).toBeInTheDocument();
  });

  it("passes search query to list", () => {
    render(<SampleManagement />);

    const searchInput = screen.getByPlaceholderText(/search samples/i);
    fireEvent.change(searchInput, { target: { value: "alpha" } });
    expect(capturedSearch).toBe("alpha");
  });
});
