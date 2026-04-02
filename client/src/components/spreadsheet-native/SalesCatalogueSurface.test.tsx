import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  SalesCatalogueSurface,
  applyCatalogueLineMarkup,
  applyCatalogueLineRetail,
  buildCatalogueCsv,
  buildPrintableCatalogueHtml,
  sanitizePrintableImageUrl,
} from "./SalesCatalogueSurface";
import { toast } from "sonner";

const setLocation = vi.fn();
const deleteDraftById = vi.fn();
const saveDraft = vi.fn();
const saveSheet = vi.fn(async () => 202);
const generateShareLink = vi.fn();
const handleConvertToOrder = vi.fn(async () => true);
const defaultInventoryItem = {
  id: 1,
  name: '3.5g "Loud" Pack',
  category: 'Flower "Top Shelf"',
  basePrice: 10,
  retailPrice: 20,
  quantity: 2,
  priceMarkup: 0,
  appliedRules: [],
  status: "LIVE",
};
let inventoryItems = [defaultInventoryItem];

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
  PowersheetGrid: ({
    title,
    onSelectedRowChange,
  }: {
    title: string;
    onSelectedRowChange?: (
      row: { identity: { rowKey: string } } | null
    ) => void;
  }) => (
    <button
      data-testid={`grid-${title}`}
      onClick={() =>
        onSelectedRowChange?.({ identity: { rowKey: "inventory:1" } })
      }
    >
      {title}
    </button>
  ),
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
    onExportPDF,
    disabled,
  }: {
    onExportCSV?: () => void;
    onExportPDF?: () => void;
    disabled?: boolean;
  }) => (
    <div>
      <button disabled={disabled} onClick={onExportCSV} type="button">
        Export CSV
      </button>
      <button disabled={disabled} onClick={onExportPDF} type="button">
        Export PDF
      </button>
    </div>
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
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      getInventory: {
        useQuery: vi.fn(() => ({
          data: inventoryItems,
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
    inventoryItems = [{ ...defaultInventoryItem }];
  });

  it("renders toolbar with Sales Catalogue badge", () => {
    render(<SalesCatalogueSurface />);
    expect(screen.getByText("Sales Catalogue")).toBeInTheDocument();
  });

  it("shows a draft-name validation hint when work is unsaved", () => {
    draftState.hasUnsavedChanges = true;

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));

    expect(screen.getByText("Draft name required to save")).toBeInTheDocument();
  });

  it("keeps handoff actions disabled until a finalized sheet id exists", () => {
    draftState.canConvert = true;
    draftState.canGoLive = false;

    render(<SalesCatalogueSurface />);

    expect(screen.getByRole("button", { name: "Live" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "→ Sales Order" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "→ Quote" })).toBeDisabled();
  });

  it("preserves loaded retail when a zero-base row is repriced by markup", () => {
    const repriced = applyCatalogueLineMarkup(
      {
        ...defaultInventoryItem,
        basePrice: 0,
        retailPrice: 36,
        priceMarkup: 18,
      },
      24
    );

    expect(repriced.priceMarkup).toBe(24);
    expect(repriced.retailPrice).toBe(36);
  });

  it("preserves loaded markup when a zero-base row is repriced by retail", () => {
    const repriced = applyCatalogueLineRetail(
      {
        ...defaultInventoryItem,
        basePrice: 0,
        retailPrice: 36,
        priceMarkup: 18,
      },
      42
    );

    expect(repriced.retailPrice).toBe(42);
    expect(repriced.priceMarkup).toBe(18);
  });

  it("sanitizes printable image urls before writing the print document", () => {
    expect(sanitizePrintableImageUrl("/catalogue/item.png")).toBe(
      "http://localhost:3000/catalogue/item.png"
    );
    expect(sanitizePrintableImageUrl("javascript:alert(1)")).toBeNull();

    const html = buildPrintableCatalogueHtml({
      title: "Spring Menu",
      clientName: "Golden State",
      includeImages: true,
      totalValue: 20,
      items: [
        {
          ...defaultInventoryItem,
          imageUrl: "javascript:alert(1)",
        },
      ],
    });

    expect(html).not.toContain("javascript:alert(1)");
    expect(html).toContain("No image");
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

  it("disables both save affordances while a save is in flight", async () => {
    draftState.isSaving = true;

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));

    expect(
      screen.getByRole("button", { name: /^Saving\.\.\.$/ })
    ).toBeDisabled();
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

  it("only reports PDF export success when the print window opens", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    expect(toast.error).toHaveBeenCalledWith(
      "Allow pop-ups to print the catalogue"
    );
    expect(toast.success).not.toHaveBeenCalledWith(
      "Print dialog opened. Use Save as PDF to export."
    );

    openSpy.mockRestore();
  });

  it("fails loudly when opening the shared view is blocked", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    draftState.canShare = true;
    draftState.lastSavedSheetId = 202;
    draftState.lastShareUrl = "http://localhost:3000/shared/sales-sheet/test";

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Shared View" }));

    expect(toast.error).toHaveBeenCalledWith(
      "Allow pop-ups to open the shared view"
    );

    openSpy.mockRestore();
  });

  it("opens the shared view after generating a share link asynchronously", async () => {
    const mockWindow = {
      location: { href: "" },
      close: vi.fn(),
      opener: window,
    };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(mockWindow);
    generateShareLink.mockResolvedValue(
      "http://localhost:3000/shared/sales-sheet/generated"
    );
    draftState.canShare = true;
    draftState.lastSavedSheetId = 202;
    draftState.lastShareUrl = null;

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Shared View" }));

    await waitFor(() => {
      expect(generateShareLink).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith("", "_blank");
      expect(mockWindow.location.href).toBe(
        "http://localhost:3000/shared/sales-sheet/generated"
      );
    });

    expect(mockWindow.close).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalledWith(
      "Could not open the shared view"
    );

    openSpy.mockRestore();
  });

  it("closes the pre-opened window when shared view generation fails", async () => {
    const mockWindow = {
      location: { href: "" },
      close: vi.fn(),
      opener: window,
    };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(mockWindow);
    generateShareLink.mockResolvedValue(null);
    draftState.canShare = true;
    draftState.lastSavedSheetId = 202;
    draftState.lastShareUrl = null;

    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Shared View" }));

    await waitFor(() => {
      expect(generateShareLink).toHaveBeenCalled();
      expect(mockWindow.close).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        "Could not open the shared view"
      );
    });

    openSpy.mockRestore();
  });

  it("proactively warns that share and export actions open a new browser tab or window", () => {
    render(<SalesCatalogueSurface />);
    fireEvent.click(screen.getByText("Select Client 1"));
    fireEvent.click(screen.getByTestId("grid-Inventory"));
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));

    expect(
      screen.getByText(
        "Shared view, PDF export, and print open a new browser tab or window."
      )
    ).toBeInTheDocument();
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
