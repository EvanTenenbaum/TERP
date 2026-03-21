/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesSheetsPilotSurface } from "./SalesSheetsPilotSurface";

const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/sales?tab=sheets", mockSetLocation],
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock("@/hooks/work-surface/useExport", () => ({
  useExport: () => ({
    exportCSV: vi.fn(),
    state: { isExporting: false, progress: 0 },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      list: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 1,
                name: "Acme Dispensary",
                email: "acme@example.com",
                isBuyer: true,
              },
              {
                id: 2,
                name: "Green Leaf Co",
                email: "green@example.com",
                isBuyer: true,
              },
            ],
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    salesSheets: {
      getInventory: {
        useQuery: () => ({
          data: [
            {
              id: 101,
              name: "Purple Haze Indoor",
              category: "Flower",
              vendor: "North Farm",
              retailPrice: 150.0,
              quantity: 20,
              grade: "A",
              basePrice: 120.0,
              cogsMode: "fixed",
              unitCogs: 80.0,
              unitCogsMin: null,
              unitCogsMax: null,
              effectiveCogs: 80.0,
              effectiveCogsBasis: "fixed",
            },
            {
              id: 102,
              name: "OG Kush Trim",
              category: "Trim",
              vendor: "South Growers",
              retailPrice: 45.0,
              quantity: 100,
              grade: "B",
              basePrice: 30.0,
              cogsMode: "fixed",
              unitCogs: 20.0,
              unitCogsMin: null,
              unitCogsMax: null,
              effectiveCogs: 20.0,
              effectiveCogsBasis: "fixed",
            },
          ],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      getDrafts: {
        useQuery: () => ({
          data: [
            {
              id: 10,
              name: "Spring Promo",
              clientId: 1,
              itemCount: 3,
              totalValue: 450.0,
              updatedAt: "2026-03-15T12:00:00.000Z",
              createdAt: "2026-03-10T08:00:00.000Z",
            },
          ],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      getViews: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      getHistory: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      saveDraft: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      deleteDraft: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      save: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      salesSheets: {
        getDraftById: {
          fetch: vi.fn(),
        },
      },
    }),
  },
}));

vi.mock("@/lib/spreadsheet-native", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/spreadsheet-native")
  >("@/lib/spreadsheet-native");

  return {
    ...actual,
  };
});

// Mock PowersheetGrid (renders title + description for assertion)
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/ui/client-combobox", () => ({
  ClientCombobox: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="client-combobox">{placeholder}</div>
  ),
  default: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="client-combobox">{placeholder}</div>
  ),
}));

describe("SalesSheetsPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the pilot badge", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByText("Pilot: browser + preview split")
    ).toBeInTheDocument();
  });

  it("renders the client combobox with placeholder text", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByTestId("client-combobox")).toBeInTheDocument();
    expect(screen.getByText("Choose a client...")).toBeInTheDocument();
  });

  it("renders draft name input", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByPlaceholderText("Draft name...")).toBeInTheDocument();
  });

  it("renders the Save Draft button", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /save draft/i })
    ).toBeInTheDocument();
  });

  it("renders the Delete Draft button", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /delete draft/i })
    ).toBeInTheDocument();
  });

  it("renders the Share button", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("renders the Export CSV button", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /export csv/i })
    ).toBeInTheDocument();
  });

  it("renders the Convert to Order button with item count", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /convert to order/i })
    ).toBeInTheDocument();
  });

  it("renders the Classic toggle button", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /classic/i })
    ).toBeInTheDocument();
  });

  it("renders the Refresh button", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /refresh data/i })
    ).toBeInTheDocument();
  });

  it("renders Sheet actions bar with Add to Sheet and Remove from Sheet buttons", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Sheet actions")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add to sheet/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove from sheet/i })
    ).toBeInTheDocument();
  });

  it("renders the draft quick-load buttons when drafts exist", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Drafts:")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /spring promo/i })
    ).toBeInTheDocument();
  });

  it("shows empty state when no client is selected", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByText("Select a client to start building a sales catalogue")
    ).toBeInTheDocument();
  });

  it("does not render PowersheetGrid when no client is selected", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    // The grids should not be present since no client is selected
    expect(screen.queryByText("Inventory Browser")).not.toBeInTheDocument();
    expect(screen.queryByText("Sheet Preview")).not.toBeInTheDocument();
  });

  it("renders the keyboard hint bar with expected shortcuts", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("select row")).toBeInTheDocument();
    expect(screen.getByText("extend range")).toBeInTheDocument();
    expect(screen.getByText("copy cells")).toBeInTheDocument();
    expect(screen.getByText("select all")).toBeInTheDocument();
  });

  it("renders the status bar with default center text", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Select a client to start")).toBeInTheDocument();
  });

  it("shows 'No items in sheet' in the sheet actions bar when no items are selected", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("No items in sheet")).toBeInTheDocument();
  });
});
