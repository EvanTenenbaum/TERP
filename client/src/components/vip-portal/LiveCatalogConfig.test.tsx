import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveCatalogConfig } from "./LiveCatalogConfig";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    vipPortalAdmin: {
      liveCatalog: {
        getConfiguration: {
          useQuery: () => ({
            data: {
              moduleLiveCatalogEnabled: true,
              featuresConfig: { liveCatalog: { enablePriceAlerts: true } },
            },
            isLoading: false,
            refetch: vi.fn(),
          }),
        },
        interestLists: {
          getByClient: {
            useQuery: () => ({
              data: {
                total: 2,
                lists: [
                  {
                    id: 101,
                    submittedAt: "2026-04-09T12:00:00.000Z",
                    totalItems: 3,
                    totalValue: "125.00",
                    status: "NEW",
                  },
                  {
                    id: 102,
                    submittedAt: "2026-04-09T12:00:00.000Z",
                    totalItems: 1,
                    totalValue: "75.00",
                    status: "CONVERTED",
                  },
                ],
              },
              isLoading: false,
              refetch: vi.fn(),
            }),
          },
          updateStatus: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
          getById: {
            useQuery: () => ({
              data: null,
              isLoading: false,
              refetch: vi.fn(),
            }),
          },
          addToNewOrder: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
          addToDraftOrder: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
        },
        draftInterests: {
          getByClient: {
            useQuery: () => ({
              data: { items: [], totalItems: 0, totalValue: "0.00" },
              isLoading: false,
              refetch: vi.fn(),
            }),
          },
        },
        saveConfiguration: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        priceAlerts: {
          list: {
            useQuery: () => ({
              data: [],
              isLoading: false,
              refetch: vi.fn(),
            }),
          },
          deactivate: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
        },
      },
    },
  },
}));

describe("LiveCatalogConfig", () => {
  it("renders submitted interest-list statuses with semantic badge variants", async () => {
    render(<LiveCatalogConfig clientId={77} />);

    const interestListsTab = screen.getByRole("tab", {
      name: /Interest Lists/i,
    });
    fireEvent.mouseDown(interestListsTab);
    fireEvent.click(interestListsTab);

    await waitFor(() => {
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    const newBadge = screen.getByText("New");
    const convertedBadge = screen.getByText("Converted");

    expect(newBadge).toHaveClass("bg-secondary");
    expect(convertedBadge).toHaveClass("text-foreground");
    expect(convertedBadge).not.toHaveClass("bg-primary");
  });
});
