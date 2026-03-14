/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LiveShoppingPage from "./LiveShoppingPage";

const mockSetLocation = vi.fn();
const mockToast = vi.fn();
let mockSearch = "";

const mockSessions = [
  {
    id: 42,
    status: "ACTIVE",
    title: "West Coast Restock",
    clientName: "Test Client",
    hostName: "QA Super Admin",
    itemCount: 3,
    scheduledAt: null,
    createdAt: "2026-03-14T07:00:00.000Z",
  },
];

vi.mock("wouter", () => ({
  useLocation: () => ["/sales", mockSetLocation],
  useSearch: () => mockSearch,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("@/components/live-shopping/StaffSessionConsole", () => ({
  default: ({ sessionId }: { sessionId: number }) => (
    <div>Staff Session Console {sessionId}</div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    liveShopping: {
      listSessions: {
        useQuery: () => ({
          data: mockSessions,
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      createSession: {
        useMutation: () => ({
          isPending: false,
          mutate: vi.fn(),
        }),
      },
    },
    clients: {
      list: {
        useQuery: () => ({
          data: { items: [] },
        }),
      },
    },
  },
}));

describe("LiveShoppingPage", () => {
  beforeEach(() => {
    mockSearch = "";
    mockSetLocation.mockReset();
    mockToast.mockReset();
  });

  it("routes View Details into the canonical live shopping workspace detail", () => {
    render(<LiveShoppingPage />);

    fireEvent.click(screen.getByRole("button", { name: /view details/i }));

    expect(mockSetLocation).toHaveBeenCalledWith(
      "/sales?tab=live-shopping&session=42"
    );
  });

  it("mounts the staff console when a session query param is present", () => {
    mockSearch = "?tab=live-shopping&session=42";

    render(<LiveShoppingPage />);

    expect(screen.getByText("Staff Session Console 42")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to sessions/i }));

    expect(mockSetLocation).toHaveBeenCalledWith("/sales?tab=live-shopping");
  });
});
