/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesSheetsPilotSurface } from "./SalesSheetsPilotSurface";

const mockSetLocation = vi.fn();
const mockSaveDraftMutate = vi.fn();
const mockDeleteDraftMutate = vi.fn();
const mockConvertToOrderMutate = vi.fn();
const mockFetchDraftById = vi.fn();
let saveDraftConfig:
  | {
      onSuccess?: (
        data: { draftId: number },
        variables: {
          draftId?: number;
          clientId: number;
          name: string;
          items: unknown[];
          totalValue: number;
        }
      ) => void;
    }
  | undefined;
let deleteDraftConfig:
  | {
      onSuccess?: (_data: undefined, variables: { draftId: number }) => void;
    }
  | undefined;

vi.mock("wouter", () => ({
  useLocation: () => ["/sales?tab=sheets", mockSetLocation],
}));

// Mock Radix DropdownMenu so items render inline in JSDOM
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    asChild,
  }: {
    children: ReactNode;
    asChild?: boolean;
  }) => <>{asChild ? children : <button>{children}</button>}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    disabled,
    onClick,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <div
      role="menuitem"
      data-disabled={disabled ? "" : undefined}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  ),
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
        useMutation: (config?: typeof saveDraftConfig) => {
          saveDraftConfig = config;
          return {
            mutate: mockSaveDraftMutate,
            isPending: false,
          };
        },
      },
      deleteDraft: {
        useMutation: (config?: typeof deleteDraftConfig) => {
          deleteDraftConfig = config;
          return {
            mutate: mockDeleteDraftMutate,
            isPending: false,
          };
        },
      },
      save: {
        useMutation: () => ({
          mutate: mockConvertToOrderMutate,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      salesSheets: {
        getDraftById: {
          fetch: mockFetchDraftById,
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
    rows,
    onSelectedRowChange,
    onSelectionSetChange,
  }: {
    title: string;
    description?: string;
    rows?: Array<{
      identity?: { rowKey?: string };
    }>;
    onSelectedRowChange?: (row: unknown) => void;
    onSelectionSetChange?: (selectionSet: {
      focusedRowId: string | null;
      focusedCell: null;
      anchorCell: null;
      ranges: [];
      selectedRowIds: Set<string>;
    }) => void;
  }) => {
    const simulateSelect = (row: { identity?: { rowKey?: string } }) => {
      const rowKey = row.identity?.rowKey ?? null;
      onSelectedRowChange?.(row);
      onSelectionSetChange?.({
        focusedRowId: rowKey,
        focusedCell: null,
        anchorCell: null,
        ranges: [],
        selectedRowIds: new Set(rowKey ? [rowKey] : []),
      });
    };
    return (
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {rows && rows.length > 0 ? (
          <>
            <button onClick={() => simulateSelect(rows[0])}>
              Select first {title} row
            </button>
            {rows[1] ? (
              <button onClick={() => simulateSelect(rows[1])}>
                Select second {title} row
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    );
  },
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    onConfirm,
    confirmLabel,
  }: {
    onConfirm: () => void;
    confirmLabel?: string;
  }) => <button onClick={onConfirm}>Confirm {confirmLabel ?? "dialog"}</button>,
}));

vi.mock("@/components/ui/client-combobox", () => ({
  ClientCombobox: ({
    placeholder,
    onValueChange,
  }: {
    placeholder?: string;
    onValueChange?: (value: number | null) => void;
  }) => (
    <div data-testid="client-combobox">
      {placeholder}
      <button onClick={() => onValueChange?.(1)}>Select client 1</button>
    </div>
  ),
  default: ({
    placeholder,
    onValueChange,
  }: {
    placeholder?: string;
    onValueChange?: (value: number | null) => void;
  }) => (
    <div data-testid="client-combobox">
      {placeholder}
      <button onClick={() => onValueChange?.(1)}>Select client 1</button>
    </div>
  ),
}));

describe("SalesSheetsPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveDraftConfig = undefined;
    deleteDraftConfig = undefined;
    mockSaveDraftMutate.mockImplementation(
      (variables: {
        draftId?: number;
        clientId: number;
        name: string;
        items: unknown[];
        totalValue: number;
      }) => {
        saveDraftConfig?.onSuccess?.(
          { draftId: variables.draftId ?? 10 },
          variables
        );
      }
    );
    mockDeleteDraftMutate.mockImplementation(
      (variables: { draftId: number }) => {
        deleteDraftConfig?.onSuccess?.(undefined, variables);
      }
    );
    mockConvertToOrderMutate.mockReset();
    mockFetchDraftById.mockReset();
  });

  it("does not render the internal pilot badge to operators", () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.queryByText("Pilot: browser + preview split")
    ).not.toBeInTheDocument();
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

  it("renders the overflow menu with Delete Draft, Share, and Export CSV", async () => {
    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    const moreBtn = screen.getByRole("button", { name: /more actions/i });
    expect(moreBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(moreBtn);
      await Promise.resolve();
    });

    expect(
      screen.getByRole("menuitem", { name: /delete draft/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /share/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /export csv/i })
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

  it("cancels pending autosave and clears dirty state when a draft is deleted", async () => {
    vi.useFakeTimers();

    mockFetchDraftById.mockResolvedValue({
      id: 10,
      clientId: 1,
      name: "Spring Promo",
      items: [
        {
          id: 999,
          name: "Existing Draft Item",
          category: "Flower",
          vendor: "Draft Vendor",
          retailPrice: 90,
          quantity: 2,
          grade: "A",
          basePrice: 75,
          cogsMode: "fixed",
          unitCogs: 50,
          unitCogsMin: null,
          unitCogsMax: null,
          effectiveCogs: 50,
          effectiveCogsBasis: "fixed",
        },
      ],
      updatedAt: "2026-03-15T12:00:00.000Z",
    });

    render(<SalesSheetsPilotSurface onOpenClassic={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /spring promo/i }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockFetchDraftById).toHaveBeenCalledWith({ draftId: 10 });

    // Open overflow menu and verify Delete Draft is enabled
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
      await Promise.resolve();
    });
    expect(
      screen.getByRole("menuitem", { name: /delete draft/i })
    ).not.toHaveAttribute("data-disabled");
    // Close the menu by pressing Escape
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, {
        key: "Escape",
      });
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /select first inventory browser row/i,
        })
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /add to sheet/i }));
      await Promise.resolve();
    });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    // Open overflow menu and click Delete Draft
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: /delete draft/i }));
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Confirm Delete Draft$/i })
      );
      await Promise.resolve();
    });

    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockSaveDraftMutate).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
