/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientsWorkSurface } from "./ClientsWorkSurface";
import { RELATIONSHIP_STATUS_TOKENS } from "@/lib/statusTokens";

const mockSetLocation = vi.fn();

const CLIENT = {
  id: 1,
  name: "Acme Corp",
  email: "ops@acme.test",
  phone: "555-0100",
  isBuyer: true,
  isSeller: false,
  isBrand: false,
  isReferee: false,
  isContractor: false,
  creditLimit: "1000.00",
  currentDebt: "0.00",
  lifetimeValue: "2500.00",
  orderCount: 3,
  lastOrderDate: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  teriCode: "ACM",
  version: 1,
};

vi.mock("wouter", () => ({
  useLocation: () => ["/relationships", mockSetLocation],
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/clients/QuickCreateClient", () => ({
  QuickCreateClient: () => null,
}));

vi.mock("@/components/clients/ProfileQuickPanel", () => ({
  ProfileQuickPanel: () => null,
}));

vi.mock("@/hooks/work-surface/useWorkSurfaceKeyboard", () => ({
  useWorkSurfaceKeyboard: () => ({
    keyboardProps: {},
  }),
}));

vi.mock("@/hooks/work-surface/useSaveState", () => ({
  useSaveState: () => ({
    setSaving: vi.fn(),
    setSaved: vi.fn(),
    setError: vi.fn(),
    SaveStateIndicator: () => null,
  }),
}));

vi.mock("@/hooks/work-surface/useValidationTiming", () => ({
  useValidationTiming: () => ({
    validateAll: () => ({ isValid: true, errors: {} }),
  }),
}));

vi.mock("@/hooks/work-surface/useConcurrentEditDetection", () => ({
  useConcurrentEditDetection: () => ({
    handleError: vi.fn(() => false),
    ConflictDialog: () => null,
    trackVersion: vi.fn(),
  }),
}));

vi.mock("./InspectorPanel", () => ({
  InspectorPanel: ({
    children,
    isOpen,
  }: {
    children: ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div>{children}</div> : null),
  InspectorSection: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  InspectorField: ({
    label,
    children,
  }: {
    label: string;
    children: ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      <span>{children}</span>
    </div>
  ),
  useInspectorPanel: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useContext: () => ({
      clients: {
        list: {
          invalidate: vi.fn(),
          cancel: vi.fn(),
          getData: vi.fn(),
          setData: vi.fn(),
        },
        count: {
          invalidate: vi.fn(),
        },
      },
    }),
    clients: {
      list: {
        useQuery: () => ({
          data: { items: [CLIENT] },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      count: {
        useQuery: () => ({
          data: 1,
        }),
      },
      update: {
        useMutation: () => ({
          mutate: vi.fn(),
        }),
      },
      archive: {
        useMutation: () => ({
          mutate: vi.fn(),
        }),
      },
    },
  },
}));

describe("ClientsWorkSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
      callback(0);
      return 1;
    });
  });

  it("renders status and last-activity columns with semantic values", () => {
    render(<ClientsWorkSurface />);

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Last Activity")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(
      screen.getByText(new Date(CLIENT.lastOrderDate).toLocaleDateString())
    ).toBeInTheDocument();
    expect(screen.getByText("Active").className).toContain(
      RELATIONSHIP_STATUS_TOKENS.ACTIVE
    );
  });

  it("stores scroll position before navigating to a client profile", () => {
    render(<ClientsWorkSurface />);

    const scrollContainer = screen
      .getByTestId("clients-table")
      .closest("div.overflow-auto") as HTMLDivElement;
    scrollContainer.scrollTop = 180;

    fireEvent.click(screen.getByRole("button", { name: "Open Acme Corp" }));

    expect(
      window.sessionStorage.getItem("terp-clients-view-v2:scroll-top")
    ).toBe("180");
    expect(mockSetLocation).toHaveBeenCalledWith("/clients/1?section=overview");
  });

  it("restores table scroll position from session storage after load", async () => {
    window.sessionStorage.setItem("terp-clients-view-v2:scroll-top", "120");

    render(<ClientsWorkSurface />);

    const scrollContainer = screen
      .getByTestId("clients-table")
      .closest("div.overflow-auto") as HTMLDivElement;

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(120);
    });
  });

  it("retries scroll restoration when the first restore attempt lands before rows are ready", async () => {
    vi.useFakeTimers();
    try {
      window.sessionStorage.setItem("terp-clients-view-v2:scroll-top", "120");

      render(<ClientsWorkSurface />);

      const scrollContainer = screen
        .getByTestId("clients-table")
        .closest("div.overflow-auto") as HTMLDivElement;

      let internalScrollTop = 0;
      let attemptedWrites = 0;
      Object.defineProperty(scrollContainer, "scrollTop", {
        configurable: true,
        get() {
          return internalScrollTop;
        },
        set(value: number) {
          attemptedWrites += 1;
          if (attemptedWrites >= 2) {
            internalScrollTop = value;
          }
        },
      });

      window.dispatchEvent(new window.PopStateEvent("popstate"));
      vi.advanceTimersByTime(150);

      expect(scrollContainer.scrollTop).toBe(120);
      expect(attemptedWrites).toBeGreaterThanOrEqual(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores active search filters after navigating to a client profile and back", () => {
    const { unmount } = render(<ClientsWorkSurface />);

    const searchInput = screen.getByTestId(
      "clients-search-input"
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "Acme" } });

    fireEvent.click(screen.getByRole("button", { name: "Open Acme Corp" }));

    expect(
      JSON.parse(
        window.localStorage.getItem("terp-clients-view-v2") ?? "{}"
      ).search
    ).toBe("Acme");

    unmount();
    render(<ClientsWorkSurface />);

    expect(
      (screen.getByTestId("clients-search-input") as HTMLInputElement).value
    ).toBe("Acme");
  });
});
