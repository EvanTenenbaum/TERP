import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  SalesCatalogueSurface,
  buildCatalogueCsv,
  buildCatalogueChatText,
} from "./SalesCatalogueSurface";

const setLocation = vi.fn();
let mockSearch = "?tab=sales-sheets";
const deleteDraftById = vi.fn();
const saveDraft = vi.fn();
const saveSheet = vi.fn(async () => 202);
const generateShareLink = vi.fn();
const handleConvertToOrder = vi.fn(async () => true);
const gridPropsByTitle = new Map<string, Record<string, unknown>>();
const clipboardWriteText = vi.fn();
const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const draftState = {
  currentDraftId: null,
  draftName: "",
  setDraftName: vi.fn(),
  hasUnsavedChanges: false,
  lastSaveTime: null,
  isSaving: false,
  isDeleting: false,
  isFinalizing: false,
  lastShareUrl: null,
  canShare: false,
  canConvert: false,
  canGoLive: false,
  lastSavedSheetId: null,
  isConverting: false,
  saveDraft,
  saveSheet,
  loadDraft: vi.fn(async () => []),
  deleteDraft: vi.fn(),
  deleteDraftById,
  handleConvertToOrder,
  markSheetAsLoaded: vi.fn(),
  generateShareLink,
  drafts: [],
  draftsLoading: false,
  resetDraft: vi.fn(),
};

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: (
    props: Record<string, unknown> & {
      title: string;
      onSelectedRowChange?: (
        row: { identity: { rowKey: string } } | null
      ) => void;
    }
  ) => {
    gridPropsByTitle.set(props.title, props);
    return (
      <button
        data-testid={`grid-${props.title}`}
        onClick={() =>
          props.onSelectedRowChange?.({ identity: { rowKey: "inventory:1" } })
        }
      >
        {props.title}
      </button>
    );
  },
}));

vi.mock("@/hooks/useCatalogueDraft", () => ({
  useCatalogueDraft: () => draftState,
}));

vi.mock("@/components/ui/client-combobox", () => ({
  ClientCombobox: ({
    onValueChange,
  }: {
    onValueChange: (value: number | null) => void;
  }) => (
    <div>
      <button onClick={() => onValueChange(1)} type="button">
        Select Client 1
      </button>
      <button onClick={() => onValueChange(2)} type="button">
        Select Client 2
      </button>
    </div>
  ),
}));

vi.mock("@/components/sales/QuickViewSelector", () => ({
  QuickViewSelector: () => <div>Quick View</div>,
}));

vi.mock("@/components/sales/SaveViewDialog", () => ({
  SaveViewDialog: () => null,
}));

vi.mock("@/components/sales/AdvancedFilters", () => ({
  AdvancedFilters: () => <div>Advanced Filters</div>,
}));

vi.mock("@/components/sales/DraftDialog", () => ({
  DraftDialog: ({
    onDeleteDraft,
  }: {
    onDeleteDraft: (draftId: number) => void;
  }) => (
    <button onClick={() => onDeleteDraft(42)} type="button">
      Delete Draft 42
    </button>
  ),
}));

vi.mock("@/components/sales/SavedSheetsDialog", () => ({
  SavedSheetsDialog: () => null,
}));

vi.mock("@/components/common/UnifiedExportMenu", () => ({
  UnifiedExportMenu: ({
    onExportCSV,
    disabled,
  }: {
    onExportCSV?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onExportCSV} type="button">
      Export CSV
    </button>
  ),
}));

vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => <div>Keyboard Hints</div>,
}));

vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({
    left,
    right,
  }: {
    left: ReactNode;
    right: ReactNode;
  }) => (
    <div>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  ),
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: ReactNode;
    confirmLabel?: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div>
        <div>{title}</div>
        <div>{description}</div>
        <button onClick={onConfirm} type="button">
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(() => ["/sales?tab=sales-sheets", setLocation]),
  useSearch: vi.fn(() => mockSearch),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
    info: vi.fn(),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      getInventory: {
        useQuery: vi.fn(() => ({
          data: [
            {
              id: 1,
              name: '3.5g "Loud" Pack',
              category: 'Flower "Top Shelf"',
              subcategory: "Indoor",
              batchSku: "BT-100",
              brand: "Andy Rhan",
              vendor: "Andy Rhan",
              basePrice: 10,
              retailPrice: 20,
              quantity: 2,
              priceMarkup: 0,
              appliedRules: [],
              status: "LIVE",
            },
            {
              id: 2,
              name: "Sunset Shake",
              category: "Flower",
              subcategory: "Outdoor",
              batchSku: "BT-200",
              brand: "NorCal Farms",
              vendor: "NorCal Farms",
              basePrice: 8,
              retailPrice: 12,
              quantity: 5,
              priceMarkup: 0,
              appliedRules: [],
              status: "AWAITING_INTAKE",
            },
          ],
          isLoading: false,
          refetch: vi.fn(),
        })),
      },
      getDrafts: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getDraftById: { useQuery: vi.fn(() => ({ data: null })) },
      getViews: { useQuery: vi.fn(() => ({ data: [] })) },
      getHistory: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      convertToLiveSession: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
    clients: {
      list: {
        useQuery: vi.fn(() => ({
          data: { items: [{ id: 1, name: "Golden State", isBuyer: true }] },
          isLoading: false,
        })),
      },
    },
    organizationSettings: {
      getDisplaySettings: {
        useQuery: vi.fn(() => ({
          data: { display: { showCogsInOrders: false } },
        })),
      },
    },
    useUtils: vi.fn(() => ({
      salesSheets: {
        getDrafts: { invalidate: vi.fn() },
        getDraftById: { fetch: vi.fn() },
        getById: { fetch: vi.fn() },
      },
    })),
  },
}));

describe("SalesCatalogueSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = "?tab=sales-sheets";
    gridPropsByTitle.clear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    draftState.currentDraftId = null;
    draftState.draftName = "";
    draftState.hasUnsavedChanges = false;
    draftState.lastSaveTime = null;
    draftState.isSaving = false;
    draftState.isDeleting = false;
    draftState.isFinalizing = false;
    draftState.lastShareUrl = null;
    draftState.canShare = false;
    draftState.canConvert = false;
    draftState.canGoLive = false;
    draftState.lastSavedSheetId = null;
    draftState.isConverting = false;
    draftState.drafts = [];
    draftState.draftsLoading = false;
  });

  it("renders toolbar with Sales Catalogue badge", () => {
    render(<SalesCatalogueSurface />);
    expect(screen.getByText("Sales Catalogue")).toBeInTheDocument();
  });

  it("hydrates the selected client from the workspace query string", async () => {
    mockSearch = "?tab=sales-sheets&clientId=1";

    render(<SalesCatalogueSurface />);

    await waitFor(() => {
      expect(gridPropsByTitle.get("Inventory")?.rows).toHaveLength(1);
    });
  });

  it("gives the inventory powersheet a taller viewport-aware height", () => {
    render(<SalesCatalogueSurface />);

    fireEvent.click(screen.getByText("Select Client 1"));

    expect(gridPropsByTitle.get("Inventory")?.minHeight).toBe(
      "clamp(30rem, calc(100vh - 14rem), 52rem)"
    );
  });

  it("defaults the catalogue cut to sellable inventory until unavailable rows are explicitly included", async () => {
    render(<SalesCatalogueSurface />);

    fireEvent.click(screen.getByText("Select Client 1"));

    await waitFor(() => {
      expect(gridPropsByTitle.get("Inventory")).toBeDefined();
    });

    const inventoryGrid = gridPropsByTitle.get("Inventory");
    expect(inventoryGrid?.rows).toHaveLength(1);
    expect(
      (inventoryGrid?.rows as Array<{ name: string }>).map(row => row.name)
    ).toEqual(['3.5g "Loud" Pack']);

    fireEvent.click(
      screen.getByRole("button", { name: "Include unavailable" })
    );

    await waitFor(() => {
      expect(
        (gridPropsByTitle.get("Inventory")?.rows as Array<{ name: string }>)
          ?.length
      ).toBe(2);
    });

    const updatedGrid = gridPropsByTitle.get("Inventory");
    expect(updatedGrid?.rows).toHaveLength(2);
    expect(
      (updatedGrid?.rows as Array<{ name: string }>).map(row => row.name)
    ).toContain("Sunset Shake");
  });

  it("opens advanced filters from the catalogue toolbar", async () => {
    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));

    await waitFor(() => {
      expect(gridPropsByTitle.get("Inventory")).toBeDefined();
    });

    expect(screen.queryByText("Advanced Filters")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(screen.getByText("Advanced Filters")).toBeInTheDocument();
  });

  it("renders plain-language unavailable status copy in the catalogue grid", async () => {
    render(<SalesCatalogueSurface />);

    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(
      screen.getByRole("button", { name: "Include unavailable" })
    );

    await waitFor(() => {
      expect(
        (gridPropsByTitle.get("Inventory")?.rows as Array<{ name: string }>)
          ?.length
      ).toBe(2);
    });

    const inventoryGrid = gridPropsByTitle.get("Inventory") as {
      columnDefs?: Array<{
        field?: string;
        cellRenderer?: (params: {
          data?: Record<string, unknown>;
          value?: unknown;
        }) => ReactNode;
      }>;
      rows?: Array<Record<string, unknown>>;
    };
    const productColumn = inventoryGrid.columnDefs?.find(
      column => column.field === "name"
    );
    const unavailableRow = inventoryGrid.rows?.find(
      row => row.status === "AWAITING_INTAKE"
    );
    const renderedCell = productColumn?.cellRenderer?.({
      data: unavailableRow,
      value: unavailableRow?.name,
    });

    const statusCell = render(<>{renderedCell}</>);
    expect(statusCell.getByText("Incoming")).toBeInTheDocument();
    expect(
      statusCell.getByText("Still incoming and not ready to sell")
    ).toBeInTheDocument();
  });

  it("shows a draft-name validation hint when work is unsaved", () => {
    draftState.hasUnsavedChanges = true;

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));

    expect(screen.getByText("Draft name required to save")).toBeInTheDocument();
  });

  it("keeps Live disabled until a finalized sheet id exists", () => {
    draftState.canConvert = true;
    draftState.canGoLive = false;

    render(<SalesCatalogueSurface />);

    expect(
      screen
        .getAllByRole("button", { name: "Live" })
        .every(button => button.disabled)
    ).toBe(true);
    expect(
      screen
        .getAllByRole("button", { name: "→ Sales Order" })
        .every(button => !button.disabled)
    ).toBe(true);
  });

  it("clears stale inventory selection when filters hide the selected row", async () => {
    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));

    const addButton = screen.getByRole("button", { name: "Add Row" });
    expect(addButton).not.toBeDisabled();

    fireEvent.change(
      screen.getByPlaceholderText("Search product, vendor, category..."),
      { target: { value: "no-match" } }
    );

    await waitFor(() => expect(addButton).toBeDisabled());
  });

  it("escapes quoted text when building CSV export content", () => {
    const csvText = buildCatalogueCsv([
      {
        id: 1,
        name: '3.5g "Loud"\nPack',
        category: 'Flower "Top Shelf"',
        basePrice: 10,
        retailPrice: 20,
        quantity: 2,
        priceMarkup: 0,
        appliedRules: [],
        status: "LIVE",
      },
    ]);

    expect(csvText).toContain('"3.5g ""Loud"" Pack","Flower ""Top Shelf"""');
    expect(csvText).not.toContain("\nPack");
  });

  it("builds a chat-friendly cut summary from visible rows", () => {
    const chatText = buildCatalogueChatText([
      {
        name: "Blue Dream",
        quantity: 12,
        retailPrice: 1200,
        brand: "Andy Rhan",
        category: "Flower",
        subcategory: "Indoor",
        batchSku: "BT-42",
      },
    ]);

    expect(chatText).toContain("Available Now (1)");
    expect(chatText).toContain("Blue Dream");
    expect(chatText).toContain("Andy Rhan · Indoor · BT-42");
    expect(chatText).toContain("$1,200.00");
  });

  it("omits placeholder descriptors from the chat summary", () => {
    const chatText = buildCatalogueChatText([
      {
        name: "Blue Dream",
        quantity: 12,
        retailPrice: 1200,
        vendor: "-",
        category: "-",
      },
    ]);

    expect(chatText).toContain("Blue Dream");
    expect(chatText).not.toContain("- · -");
  });

  it("disables both save affordances while a save is in flight", async () => {
    draftState.isSaving = true;

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));

    expect(
      screen
        .getAllByRole("button", { name: /^Saving\.\.\.$/ })
        .every(button => button.disabled)
    ).toBe(true);
  });

  it("still exports through a blob download flow", async () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it("copies the selected catalogue cut for chat", async () => {
    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));

    fireEvent.click(screen.getByRole("button", { name: "Copy for Chat" }));

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining(
          '3.5g "Loud" Pack — Andy Rhan · Indoor · BT-100'
        )
      );
    });
  });

  it("shows a toast when copy-for-chat fails", async () => {
    clipboardWriteText.mockRejectedValueOnce(new Error("denied"));

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy for Chat" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Could not copy this cut for chat"
      );
    });
  });

  it("confirms before switching clients with unsaved work", () => {
    draftState.hasUnsavedChanges = true;

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
    draftState.resetDraft.mockClear();
    fireEvent.click(screen.getByText("Select Client 2"));

    expect(
      screen.getByText("Discard current catalogue changes?")
    ).toBeInTheDocument();
    expect(draftState.resetDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Switch client" }));

    expect(draftState.resetDraft).toHaveBeenCalled();
  });

  it("wires draft deletion from the dialog to the hook", () => {
    draftState.drafts = [
      {
        id: 42,
        name: "Test Draft",
        clientId: 1,
        itemCount: 1,
        totalValue: "20",
        updatedAt: new Date(),
        createdAt: new Date(),
      },
    ];

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Delete Draft 42"));

    expect(deleteDraftById).toHaveBeenCalledWith(42);
  });
});
