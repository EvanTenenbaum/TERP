import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { SalesOrderSurface } from "./SalesOrderSurface";

const { mockToastError } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
}));

const mockSetLocation = vi.fn();
const mockBuildDocumentRoute = vi.fn(() => "/sales?tab=create-order");
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
  useOrderDraft: () => mockDraftState,
  resolveOrderCostVisibility: () => mockCostVisibility,
  shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget: () => false,
}));

vi.mock("@/hooks/orders/useOrderCalculations", () => ({
  useOrderCalculations: () => mockCalculationState,
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
        useQuery: vi.fn(() => ({ data: [] })),
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
  CreditWarningDialog: () => null,
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

describe("SalesOrderSurface", () => {
  beforeEach(() => {
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
    mockBuildDocumentRoute.mockClear();
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

  it("renders inventory and document sections when a customer is selected", () => {
    mockDraftState.clientId = 7;
    const { container } = render(<SalesOrderSurface />);
    expect(screen.getByText("Selected client: Acme")).toBeInTheDocument();
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

  it("clears route hydration params before switching clients", () => {
    mockDraftState.clientId = 7;
    mockDraftState.activeDraftId = 42;

    render(<SalesOrderSurface />);
    fireEvent.click(screen.getByRole("button", { name: "Change Client" }));

    expect(mockBuildDocumentRoute).toHaveBeenCalled();
    expect(mockSetLocation).toHaveBeenCalledWith("/sales?tab=create-order");
    expect(mockDraftState.resetComposerState).toHaveBeenCalled();
    expect(mockDraftState.setClientId).toHaveBeenCalledWith(9);
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

  it("disables add for non-sellable inventory rows", () => {
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

    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
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
});
