import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { SalesOrderSurface } from "./SalesOrderSurface";

const { mockToastError, mockToastInfo, mockCreditDialogProps } = vi.hoisted(
  () => ({
    mockToastError: vi.fn(),
    mockToastInfo: vi.fn(),
    mockCreditDialogProps: vi.fn(),
  })
);

const mockSetLocation = vi.fn();
const mockBuildDocumentRoute = vi.fn(() => "/sales?tab=create-order");
const mockUseOrderDraft = vi.fn();
let mockSearch = "?tab=create-order";
const mockCreditMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
};
const mockCalculationState = {
  totals: {
    subtotal: 0,
    totalCogs: 0,
    totalMargin: 0,
    avgMarginPercent: 0,
    adjustmentAmount: 0,
    total: 0,
  },
  warnings: [],
  isValid: false,
  calculateLineItem: vi.fn(),
};
let mockCostVisibility = { showCogs: false, showMargin: false };
let mockClientListData = [{ id: 7, name: "Acme", isBuyer: true }];
let mockClientDetailsData: {
  id: number;
  name: string;
  creditLimit: string;
  totalOwed: string;
} | null = {
  id: 7,
  name: "Acme",
  creditLimit: "1000",
  totalOwed: "200",
};
let mockInventoryData = [
  {
    id: 11,
    name: "Blue Dream",
    retailPrice: 20,
    basePrice: 10,
    quantity: 5,
    appliedRules: [],
    status: "LIVE",
  },
];
let mockSavedViewsData: Array<{
  id: number;
  name: string;
  filters: Record<string, unknown>;
  sort: { field: string; direction: "asc" | "desc" };
  columnVisibility: Record<string, boolean>;
  isDefault?: boolean;
}> = [];
const gridPropsByTitle = new Map<string, Record<string, unknown>>();

const mockDraftState = {
  clientId: null as number | null,
  setClientId: vi.fn(),
  linkedNeedId: null as number | null,
  setLinkedNeedId: vi.fn(),
  items: [] as Array<{
    batchId: number;
    quantity: number;
    cogsPerUnit: number;
    originalCogsPerUnit: number;
    marginPercent: number;
    marginDollar: number;
    unitPrice: number;
    lineTotal: number;
    isCogsOverridden: boolean;
    isMarginOverridden: boolean;
    marginSource: "DEFAULT";
    isSample: boolean;
  }>,
  setItems: vi.fn(),
  adjustment: null,
  setAdjustment: vi.fn(),
  showAdjustmentOnDocument: true,
  setShowAdjustmentOnDocument: vi.fn(),
  orderType: "SALE" as "SALE" | "QUOTE",
  setOrderType: vi.fn(),
  referredByClientId: null as number | null,
  setReferredByClientId: vi.fn(),
  notes: "",
  setNotes: vi.fn(),
  freight: 0,
  setFreight: vi.fn(),
  paymentTerms: "NET_30",
  setPaymentTerms: vi.fn(),
  activeDraftId: null as number | null,
  activeDraftVersion: null as number | null,
  isSalesSheetImport: false,
  hasUnsavedChanges: false,
  isPersistingDraft: false,
  isFinalizingDraft: false,
  saveState: { status: "saved" },
  SaveStateIndicator: <div>save-state</div>,
  ConfirmNavigationDialog: () => <div>confirm-navigation</div>,
  buildDocumentRoute: mockBuildDocumentRoute,
  buildQueueRoute: vi.fn(),
  resetComposerState: vi.fn(),
  handleSaveDraft: vi.fn(),
  confirmFinalize: vi.fn(),
  handleAddInventoryItems: vi.fn(),
};

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    columnDefs = [],
    rows = [],
  }: {
    title: string;
    columnDefs?: Array<{
      field?: string;
      headerName?: string;
      cellRenderer?: (params: { data?: unknown; value?: unknown }) => unknown;
    }>;
    rows?: Array<Record<string, unknown>>;
  }) => {
    gridPropsByTitle.set(title, { title, columnDefs, rows });
    const actionColumn = columnDefs.find(column => column.field === "inOrder");
    const firstRow = rows[0];
    const actionCell =
      actionColumn?.cellRenderer && firstRow
        ? actionColumn.cellRenderer({
            data: firstRow,
            value: firstRow.inOrder,
          })
        : null;
    return (
      <div data-testid={`grid-${title.toLowerCase()}`}>
        {title}
        {actionCell}
      </div>
    );
  },
}));

vi.mock("@/hooks/useOrderDraft", () => ({
  useOrderDraft: (options?: { surfaceVariant?: string }) =>
    mockUseOrderDraft(options),
  resolveOrderCostVisibility: () => mockCostVisibility,
  shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget: () => false,
}));

vi.mock("@/hooks/orders/useOrderCalculations", () => ({
  useOrderCalculations: () => mockCalculationState,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasAnyPermission: () => true,
  }),
}));

vi.mock("@/hooks/work-surface/useWorkSurfaceKeyboard", () => ({
  useWorkSurfaceKeyboard: () => ({
    keyboardProps: { onKeyDown: vi.fn(), tabIndex: 0 },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      list: {
        useQuery: vi.fn(() => ({
          data: { items: mockClientListData },
          isLoading: false,
        })),
      },
      getById: {
        useQuery: vi.fn(() => ({
          data: mockClientDetailsData,
        })),
      },
    },
    salesSheets: {
      getInventory: {
        useQuery: vi.fn(() => ({
          data: mockInventoryData,
          isLoading: false,
          error: null,
        })),
      },
      getViews: {
        useQuery: vi.fn(() => ({ data: mockSavedViewsData })),
      },
    },
    organizationSettings: {
      getDisplaySettings: {
        useQuery: vi.fn(() => ({ data: { display: {} } })),
      },
    },
    credit: {
      checkOrderCredit: {
        useMutation: vi.fn(() => mockCreditMutation),
      },
    },
    useUtils: vi.fn(() => ({
      salesSheets: { getViews: { invalidate: vi.fn() } },
    })),
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/sales?tab=create-order", mockSetLocation],
  useSearch: () => mockSearch,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    info: mockToastInfo,
    success: vi.fn(),
  },
}));

vi.mock("@/components/ui/client-combobox", () => ({
  ClientCombobox: ({
    onValueChange,
    selectedLabel,
  }: {
    onValueChange: (value: number | null) => void;
    selectedLabel?: string | null;
  }) => (
    <div>
      <div>Selected client: {selectedLabel ?? "none"}</div>
      <button type="button" onClick={() => onValueChange(9)}>
        Change Client
      </button>
    </div>
  ),
}));

vi.mock("@/components/orders", () => ({
  OrdersDocumentLineItemsGrid: () => (
    <div data-testid="document-grid">Document Grid</div>
  ),
  InvoiceBottom: () => <div data-testid="invoice-bottom">Invoice Bottom</div>,
  OrderAdjustmentsBar: ({
    onSaveDraft,
    onFinalize,
    saveDraftDisabled,
    finalizeDisabled,
    orderType,
  }: {
    onSaveDraft: () => void;
    onFinalize: () => void;
    saveDraftDisabled?: boolean;
    finalizeDisabled?: boolean;
    orderType: "SALE" | "QUOTE";
  }) => (
    <div data-testid="order-adjustments">
      <button type="button" disabled={saveDraftDisabled} onClick={onSaveDraft}>
        Save Draft
      </button>
      <button type="button" disabled={finalizeDisabled} onClick={onFinalize}>
        {orderType === "QUOTE" ? "Confirm Quote" : "Confirm Order"}
      </button>
    </div>
  ),
  CreditWarningDialog: (props: {
    open: boolean;
    creditCheck: object | null;
    onViewPaymentHistory?: () => void;
    onRecordPayment?: () => void;
  }) => {
    mockCreditDialogProps(props);
    if (!props.open || !props.creditCheck) {
      return null;
    }

    return (
      <div data-testid="credit-warning-dialog">
        <button type="button" onClick={props.onViewPaymentHistory}>
          View payment history
        </button>
        <button type="button" onClick={props.onRecordPayment}>
          Record payment
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/orders/ClientCommitContextCard", () => ({
  ClientCommitContextCard: ({
    onOpenOverview,
    onOpenMoney,
    onOpenPricing,
  }: {
    onOpenOverview: () => void;
    onOpenMoney: () => void;
    onOpenPricing: () => void;
  }) => (
    <div data-testid="client-commit-context">
      <button type="button" onClick={onOpenOverview}>
        Overview
      </button>
      <button type="button" onClick={onOpenMoney}>
        Money
      </button>
      <button type="button" onClick={onOpenPricing}>
        Pricing
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

vi.mock("@/components/inventory/SavedViewsDropdown", () => ({
  SavedViewsDropdown: () => <div>Inventory Saved Views</div>,
}));

describe("SalesOrderSurface", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    gridPropsByTitle.clear();
    mockInventoryData = [
      {
        id: 11,
        name: "Blue Dream",
        retailPrice: 20,
        basePrice: 10,
        quantity: 5,
        appliedRules: [],
        status: "LIVE",
      },
    ];
    mockSavedViewsData = [];
    mockDraftState.clientId = null;
    mockDraftState.items = [];
    mockDraftState.orderType = "SALE";
    mockDraftState.isSalesSheetImport = false;
    mockDraftState.activeDraftId = null;
    mockDraftState.freight = 0;
    mockCreditMutation.isPending = false;
    mockCreditMutation.mutateAsync.mockReset();
    mockCalculationState.isValid = false;
    mockCostVisibility = { showCogs: false, showMargin: false };
    mockClientListData = [{ id: 7, name: "Acme", isBuyer: true }];
    mockClientDetailsData = {
      id: 7,
      name: "Acme",
      creditLimit: "1000",
      totalOwed: "200",
    };
    mockSetLocation.mockReset();
    mockBuildDocumentRoute.mockReset();
    mockUseOrderDraft.mockReset();
    mockCreditDialogProps.mockReset();
    mockToastInfo.mockReset();
    mockUseOrderDraft.mockImplementation(
      (options?: { surfaceVariant?: string }) => {
        const surfaceVariant =
          options?.surfaceVariant ?? "classic-create-order";
        mockBuildDocumentRoute.mockImplementation(
          (
            params?: Record<
              string,
              string | number | boolean | null | undefined
            >
          ) => {
            const searchParams = new URLSearchParams(
              surfaceVariant === "sheet-native-orders"
                ? "tab=orders&surface=sheet-native&ordersView=document"
                : "tab=create-order"
            );

            if (params?.clientId !== null && params?.clientId !== undefined) {
              searchParams.set("clientId", String(params.clientId));
            }
            if (params?.mode !== null && params?.mode !== undefined) {
              searchParams.set("mode", String(params.mode));
            }

            return `/sales?${searchParams.toString()}`;
          }
        );

        return {
          ...mockDraftState,
          buildDocumentRoute: mockBuildDocumentRoute,
        };
      }
    );
    mockToastError.mockReset();
    mockDraftState.handleAddInventoryItems.mockReset();
    mockSearch = "?tab=create-order";
  });

  it("renders the unified sales order toolbar", () => {
    render(<SalesOrderSurface />);
    expect(screen.getByText("New order")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Queue" })).toBeInTheDocument();
    expect(screen.queryByText("Classic Composer")).not.toBeInTheDocument();
  });

  it("routes back to the orders queue from the toolbar", () => {
    render(<SalesOrderSurface />);

    fireEvent.click(screen.getByRole("button", { name: "Queue" }));

    expect(mockSetLocation).toHaveBeenCalledWith("/sales?tab=orders");
  });

  it("renders empty state when no customer is selected", () => {
    render(<SalesOrderSurface />);
    expect(
      screen.getByText(/select a customer to start this order/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/begin a new order without leaving the sales workspace/i)
    ).toBeInTheDocument();
  });

  it("uses quote-specific entry copy when the create-order tab is opened in quote mode", () => {
    mockSearch = "?tab=create-order&mode=quote";

    render(<SalesOrderSurface />);

    expect(screen.getByText("New quote")).toBeInTheDocument();
    expect(
      screen.getByText(/select a customer to start this quote/i)
    ).toBeInTheDocument();
  });

  // TODO: ClientCommitContextCard removed from SalesOrderSurface in 420-fork; restore when card is re-integrated
  it.skip("renders inventory and document sections when a customer is selected", () => {
    mockDraftState.clientId = 7;
    const { container } = render(<SalesOrderSurface />);
    expect(screen.getByText("Selected client: Acme")).toBeInTheDocument();
    expect(screen.getByTestId("client-commit-context")).toBeInTheDocument();
    expect(screen.getByTestId("grid-inventory")).toBeInTheDocument();
    expect(screen.getByTestId("document-grid")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-bottom")).toBeInTheDocument();
    expect(screen.getByTestId("order-adjustments")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add selected/i })
    ).not.toBeInTheDocument();

    const panels = container.querySelectorAll("[data-panel]");
    expect(panels).toHaveLength(2);
    expect(
      within(panels[1] as HTMLElement).getByTestId("document-grid")
    ).toBeInTheDocument();
    expect(
      within(panels[1] as HTMLElement).queryByTestId("invoice-bottom")
    ).not.toBeInTheDocument();
    expect(
      within(panels[1] as HTMLElement).queryByTestId("order-adjustments")
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Save Draft" })).toHaveLength(
      1
    );
    expect(
      screen.getAllByRole("button", { name: "Confirm Order" })
    ).toHaveLength(1);
  });

  // TODO: quarantine filter and include-unavailable toggle removed from SalesOrderSurface in 420-fork; restore if inventory visibility UX is revisited
  it.skip("defaults the order inventory browser to sellable rows only", async () => {
    mockDraftState.clientId = 7;
    mockInventoryData = [
      {
        id: 11,
        name: "Blue Dream",
        retailPrice: 20,
        basePrice: 10,
        quantity: 5,
        appliedRules: [],
        brand: "Andy Rhan",
        subcategory: "Indoor",
        batchSku: "BD-11",
        status: "LIVE",
      },
      {
        id: 12,
        name: "Quarantined Cut",
        retailPrice: 18,
        basePrice: 9,
        quantity: 4,
        appliedRules: [],
        brand: "Andy Rhan",
        subcategory: "Indoor",
        batchSku: "QC-12",
        status: "QUARANTINED",
      },
    ];

    render(<SalesOrderSurface />);

    await waitFor(() => {
      expect(
        (
          gridPropsByTitle.get("Inventory")?.rows as
            | Array<{ name: string }>
            | undefined
        )?.map(row => row.name)
      ).toEqual(["Blue Dream"]);
    });

    expect(
      screen.getByRole("button", { name: "Available now" })
    ).toBeInTheDocument();
  });

  // TODO: portable cut import flow (sessionStorage hydration, toast.info, include-unavailable carryover) removed in 420-fork; restore if cut-sharing UX is revisited
  it.skip("applies imported portable cuts and preserves include-unavailable carryover", async () => {
    mockDraftState.clientId = 7;
    mockInventoryData = [
      {
        id: 11,
        name: "Blue Dream",
        retailPrice: 20,
        basePrice: 10,
        quantity: 5,
        appliedRules: [],
        brand: "Andy Rhan",
        subcategory: "Indoor",
        batchSku: "BD-11",
        status: "LIVE",
      },
      {
        id: 12,
        name: "Quarantined Cut",
        retailPrice: 18,
        basePrice: 9,
        quantity: 4,
        appliedRules: [],
        brand: "Andy Rhan",
        subcategory: "Indoor",
        batchSku: "QC-12",
        status: "QUARANTINED",
      },
      {
        id: 13,
        name: "Outdoor Value",
        retailPrice: 14,
        basePrice: 7,
        quantity: 10,
        appliedRules: [],
        brand: "Westside Farms",
        subcategory: "Outdoor",
        batchSku: "OV-13",
        status: "LIVE",
      },
    ];
    mockSavedViewsData = [
      {
        id: 3,
        name: "Andy Indoor",
        filters: {
          search: "",
          categories: [],
          brands: ["Andy Rhan"],
          grades: [],
          priceMin: null,
          priceMax: null,
          strainFamilies: [],
          vendors: [],
          inStockOnly: false,
          includeUnavailable: true,
        },
        sort: { field: "name", direction: "asc" },
        columnVisibility: {
          category: true,
          quantity: true,
          basePrice: true,
          retailPrice: true,
          markup: true,
          grade: false,
          vendor: true,
          strain: false,
        },
      },
    ];
    window.sessionStorage.setItem(
      "salesCataloguePortableCut",
      JSON.stringify({
        clientId: 7,
        viewId: 3,
        viewName: "Andy Indoor",
        filters: {
          search: "",
          categories: [],
          brands: ["Andy Rhan"],
          grades: [],
          priceMin: null,
          priceMax: null,
          strainFamilies: [],
          vendors: [],
          inStockOnly: false,
          includeUnavailable: true,
        },
      })
    );

    render(<SalesOrderSurface />);

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith("Imported cut: Andy Indoor");
      expect(
        (
          gridPropsByTitle.get("Inventory")?.rows as
            | Array<{ name: string }>
            | undefined
        )?.map(row => row.name)
      ).toEqual(["Blue Dream", "Quarantined Cut"]);
    });

    expect(screen.getByText("Saved cut: Andy Indoor")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Including unavailable" })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Including unavailable" })
    );

    await waitFor(() => {
      expect(
        (
          gridPropsByTitle.get("Inventory")?.rows as
            | Array<{ name: string }>
            | undefined
        )?.map(row => row.name)
      ).toEqual(["Blue Dream"]);
    });

    expect(
      screen.getByRole("button", { name: "Available now" })
    ).toBeInTheDocument();
    expect(screen.getByText("Include unavailable")).toBeInTheDocument();
  });

  it("clears route hydration params before switching clients", () => {
    mockDraftState.clientId = 7;
    mockDraftState.activeDraftId = 42;

    render(<SalesOrderSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Change Client" }));

    expect(mockUseOrderDraft).toHaveBeenCalledWith({
      surfaceVariant: "classic-create-order",
    });
    expect(mockBuildDocumentRoute).toHaveBeenCalledWith({
      clientId: 9,
      mode: undefined,
    });
    expect(mockSetLocation).toHaveBeenCalledWith(
      "/sales?tab=create-order&clientId=9"
    );
    expect(mockDraftState.resetComposerState).toHaveBeenCalled();
    expect(mockDraftState.setClientId).toHaveBeenCalledWith(9);
  });

  it("keeps client changes inside the orders document route when opened from the orders surface", () => {
    mockSearch = "?tab=orders&surface=sheet-native&ordersView=document";
    mockDraftState.clientId = 7;

    render(<SalesOrderSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Change Client" }));

    expect(mockUseOrderDraft).toHaveBeenCalledWith({
      surfaceVariant: "sheet-native-orders",
    });
    expect(mockSetLocation).toHaveBeenCalledWith(
      "/sales?tab=orders&surface=sheet-native&ordersView=document&clientId=9"
    );
    expect(mockDraftState.setClientId).toHaveBeenCalledWith(9);
  });

  it("preserves quote mode in the route when changing clients from a quote", () => {
    mockSearch = "?tab=create-order&mode=quote";
    mockDraftState.clientId = 7;
    mockDraftState.orderType = "QUOTE";

    render(<SalesOrderSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Change Client" }));

    expect(mockBuildDocumentRoute).toHaveBeenCalledWith({
      clientId: 9,
      mode: "quote",
    });
    expect(mockSetLocation).toHaveBeenCalledWith(
      "/sales?tab=create-order&clientId=9&mode=quote"
    );
  });

  it("passes the hydrated customer label even when the client list is stale", () => {
    mockDraftState.clientId = 7;
    mockClientListData = [{ id: 99, name: "Other Buyer", isBuyer: true }];
    mockClientDetailsData = {
      id: 7,
      name: "Hydrated Acme",
      creditLimit: "1000",
      totalOwed: "200",
    };

    render(<SalesOrderSurface />);

    expect(
      screen.getByText("Selected client: Hydrated Acme")
    ).toBeInTheDocument();
  });

  it("shows an unavailable-customer warning when the route client cannot hydrate", () => {
    mockDraftState.clientId = 7;
    mockClientListData = [{ id: 99, name: "Other Buyer", isBuyer: true }];
    mockClientDetailsData = null;

    render(<SalesOrderSurface />);

    expect(
      screen.getByText("Selected client: Unavailable customer #7")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/customer record that is no longer in active clients/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("grid-inventory")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save Draft" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirm Order" })
    ).not.toBeInTheDocument();
  });

  // TODO: include-unavailable toggle and non-sellable row blocking removed from SalesOrderSurface in 420-fork; restore if inventory visibility UX is revisited
  it.skip("keeps non-sellable rows blocked even when unavailable inventory is shown", async () => {
    mockDraftState.clientId = 7;
    mockInventoryData = [
      {
        id: 11,
        name: "Blue Dream",
        retailPrice: 20,
        basePrice: 10,
        quantity: 5,
        appliedRules: [],
        status: "QUARANTINED",
      },
    ];

    render(<SalesOrderSurface />);

    expect(
      (gridPropsByTitle.get("Inventory")?.rows as Array<{ name: string }>)
        .length
    ).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Available now" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
    });
  });

  // TODO: ClientCommitContextCard (and its quick-action buttons) removed from SalesOrderSurface in 420-fork; restore when card is re-integrated
  it.skip("routes commit-context quick actions into the relationship profile", () => {
    mockDraftState.clientId = 7;

    render(<SalesOrderSurface />);

    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Money" }));
    fireEvent.click(screen.getByRole("button", { name: "Pricing" }));

    expect(mockSetLocation).toHaveBeenNthCalledWith(
      1,
      "/clients/7?section=overview"
    );
    expect(mockSetLocation).toHaveBeenNthCalledWith(
      2,
      "/clients/7?section=money"
    );
    expect(mockSetLocation).toHaveBeenNthCalledWith(
      3,
      "/clients/7?section=sales-pricing"
    );
  });

  it("applies staged quantity and markup before adding a row", () => {
    mockDraftState.clientId = 7;
    mockCostVisibility = { showCogs: false, showMargin: true };

    render(<SalesOrderSurface />);

    fireEvent.change(screen.getByLabelText(/quantity for blue dream/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/markup for blue dream/i), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /\+ add/i }));

    expect(mockDraftState.handleAddInventoryItems).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 11,
        orderQuantity: 3,
        retailPrice: 15,
        priceMarkup: 50,
      }),
    ]);
  });

  it("disables finalize while credit check is in flight", () => {
    mockDraftState.clientId = 7;
    mockDraftState.items = [
      {
        batchId: 11,
        quantity: 1,
        cogsPerUnit: 10,
        originalCogsPerUnit: 10,
        marginPercent: 25,
        marginDollar: 2.5,
        unitPrice: 12.5,
        lineTotal: 12.5,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        isSample: false,
      },
    ];
    mockCalculationState.isValid = true;
    mockCreditMutation.isPending = true;

    render(<SalesOrderSurface />);

    expect(
      screen.getByRole("button", { name: "Confirm Order" })
    ).toBeDisabled();
  });

  it("renders a single quote action stack for quote mode", () => {
    mockDraftState.clientId = 7;
    mockDraftState.orderType = "QUOTE";

    render(<SalesOrderSurface />);

    expect(screen.getAllByRole("button", { name: "Save Draft" })).toHaveLength(
      1
    );
    expect(
      screen.getAllByRole("button", { name: "Confirm Quote" })
    ).toHaveLength(1);
  });

  it("does not open finalize confirmation when the credit check errors", async () => {
    mockDraftState.clientId = 7;
    mockDraftState.items = [
      {
        batchId: 11,
        quantity: 1,
        cogsPerUnit: 10,
        originalCogsPerUnit: 10,
        marginPercent: 25,
        marginDollar: 2.5,
        unitPrice: 12.5,
        lineTotal: 12.5,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        isSample: false,
      },
    ];
    mockCalculationState.isValid = true;
    mockCreditMutation.mutateAsync.mockRejectedValueOnce(new Error("boom"));

    render(<SalesOrderSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Order" }));

    await waitFor(() => {
      expect(mockCreditMutation.mutateAsync).toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith(
        "Credit could not be verified. Please try again."
      );
    });
    expect(screen.queryByText("Confirm order?")).not.toBeInTheDocument();
  });

  // TODO: draft-line availability blocking logic (all-unavailable/all-unresolved guard) removed from SalesOrderSurface in 420-fork; restore when line-status validation is revisited
  it.skip("disables confirmation when every tracked draft line is unavailable", async () => {
    mockDraftState.clientId = 7;
    mockDraftState.items = [
      {
        batchId: 11,
        quantity: 1,
        cogsPerUnit: 10,
        originalCogsPerUnit: 10,
        marginPercent: 25,
        marginDollar: 2.5,
        unitPrice: 12.5,
        lineTotal: 12.5,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        isSample: false,
      },
    ];
    mockCalculationState.isValid = true;
    mockInventoryData = [
      {
        id: 11,
        name: "Blue Dream",
        retailPrice: 20,
        basePrice: 10,
        quantity: 5,
        appliedRules: [],
        status: "QUARANTINED",
      },
    ];

    render(<SalesOrderSurface />);

    expect(
      screen.getByRole("button", { name: "Confirm Order" })
    ).toBeDisabled();
    expect(
      screen.getByText(
        "This draft only contains unavailable, blocked, or unresolved lines. Replace, recheck, or remove them before confirming the order."
      )
    ).toBeInTheDocument();
    expect(mockCreditMutation.mutateAsync).not.toHaveBeenCalled();
  });

  // TODO: mixed sellable/blocked draft-line warning removed from SalesOrderSurface in 420-fork; restore when line-status validation is revisited
  it.skip("keeps confirmation available when sellable and blocked draft lines are mixed", () => {
    mockDraftState.clientId = 7;
    mockDraftState.items = [
      {
        batchId: 11,
        quantity: 1,
        cogsPerUnit: 10,
        originalCogsPerUnit: 10,
        marginPercent: 25,
        marginDollar: 2.5,
        unitPrice: 12.5,
        lineTotal: 12.5,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        isSample: false,
      },
      {
        batchId: 12,
        quantity: 1,
        cogsPerUnit: 12,
        originalCogsPerUnit: 12,
        marginPercent: 30,
        marginDollar: 4,
        unitPrice: 16,
        lineTotal: 16,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        isSample: false,
      },
    ];
    mockCalculationState.isValid = true;
    mockInventoryData = [
      {
        id: 11,
        name: "Blue Dream",
        retailPrice: 20,
        basePrice: 10,
        quantity: 5,
        appliedRules: [],
        status: "QUARANTINED",
      },
      {
        id: 12,
        name: "Gelato",
        retailPrice: 24,
        basePrice: 12,
        quantity: 5,
        appliedRules: [],
        status: "LIVE",
      },
    ];

    render(<SalesOrderSurface />);

    expect(
      screen.getByText(
        "1 draft line still needs live availability confirmation before final confirmation."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("1 blocked line")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Order" })).toBeEnabled();
  });

  // TODO: draft-line availability blocking logic (all-unresolved guard) removed from SalesOrderSurface in 420-fork; restore when line-status validation is revisited
  it.skip("disables confirmation when every tracked draft line is unresolved from live inventory", () => {
    mockDraftState.clientId = 7;
    mockDraftState.items = [
      {
        batchId: 99,
        quantity: 1,
        cogsPerUnit: 10,
        originalCogsPerUnit: 10,
        marginPercent: 25,
        marginDollar: 2.5,
        unitPrice: 12.5,
        lineTotal: 12.5,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        isSample: false,
      },
    ];
    mockCalculationState.isValid = true;
    mockInventoryData = [
      {
        id: 11,
        name: "Blue Dream",
        retailPrice: 20,
        basePrice: 10,
        quantity: 5,
        appliedRules: [],
        status: "LIVE",
      },
    ];

    render(<SalesOrderSurface />);

    expect(
      screen.getByRole("button", { name: "Confirm Order" })
    ).toBeDisabled();
    expect(
      screen.getByText(
        "This draft only contains unavailable, blocked, or unresolved lines. Replace, recheck, or remove them before confirming the order."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("1 unresolved line")).toBeInTheDocument();
    expect(mockCreditMutation.mutateAsync).not.toHaveBeenCalled();
  });

  // TODO: onViewPaymentHistory callback removed from CreditWarningDialog usage in SalesOrderSurface in 420-fork; restore when accounting deep-links are re-wired
  it.skip("routes the credit warning payment-history next step into accounting", async () => {
    mockDraftState.clientId = 7;
    mockDraftState.items = [
      {
        batchId: 11,
        quantity: 1,
        cogsPerUnit: 10,
        originalCogsPerUnit: 10,
        marginPercent: 25,
        marginDollar: 2.5,
        unitPrice: 12.5,
        lineTotal: 12.5,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        isSample: false,
      },
    ];
    mockCalculationState.isValid = true;
    mockCreditMutation.mutateAsync.mockResolvedValueOnce({
      allowed: false,
      warning: "Credit limit exceeded",
      requiresOverride: true,
      creditLimit: 1000,
      currentExposure: 900,
      newExposure: 1100,
      availableCredit: 100,
      utilizationPercent: 110,
      enforcementMode: "SOFT_BLOCK",
    });

    render(<SalesOrderSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Order" }));

    await waitFor(() => {
      expect(screen.getByTestId("credit-warning-dialog")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "View payment history" })
    );

    expect(mockSetLocation).toHaveBeenCalledWith("/accounting?tab=invoices");
  });

  // TODO: onRecordPayment callback removed from CreditWarningDialog usage in SalesOrderSurface in 420-fork; restore when accounting deep-links are re-wired
  it.skip("routes the credit warning record-payment next step into accounting", async () => {
    mockDraftState.clientId = 7;
    mockDraftState.items = [
      {
        batchId: 11,
        quantity: 1,
        cogsPerUnit: 10,
        originalCogsPerUnit: 10,
        marginPercent: 25,
        marginDollar: 2.5,
        unitPrice: 12.5,
        lineTotal: 12.5,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        isSample: false,
      },
    ];
    mockCalculationState.isValid = true;
    mockCreditMutation.mutateAsync.mockResolvedValueOnce({
      allowed: false,
      warning: "Credit limit exceeded",
      requiresOverride: true,
      creditLimit: 1000,
      currentExposure: 900,
      newExposure: 1100,
      availableCredit: 100,
      utilizationPercent: 110,
      enforcementMode: "SOFT_BLOCK",
    });

    render(<SalesOrderSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Order" }));

    await waitFor(() => {
      expect(screen.getByTestId("credit-warning-dialog")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));

    expect(mockSetLocation).toHaveBeenCalledWith("/accounting?tab=payments");
  });
});
