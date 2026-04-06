/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockDisplaySettings = {
  display: {
    canViewCogsData: false,
    showCogsInOrders: false,
    showMarginInOrders: false,
  },
};

const mockSetLocation = vi.fn();
let mockSearch = "?clientId=1";

vi.mock("wouter", () => ({
  useLocation: () => ["/sales/create-order", mockSetLocation],
  useSearch: () => mockSearch,
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
    useUtils: () => ({
      orders: {
        getAll: { invalidate: vi.fn() },
        getOrderWithLineItems: { invalidate: vi.fn() },
        getOrderStatusHistory: { invalidate: vi.fn() },
        getAuditLog: { invalidate: vi.fn() },
      },
    }),
    organizationSettings: {
      getDisplaySettings: {
        useQuery: () => ({
          data: mockDisplaySettings,
        }),
      },
    },
    clients: {
      list: {
        useQuery: () => ({
          data: [],
          isLoading: false,
        }),
      },
      getById: {
        useQuery: () => ({
          data: { id: 1, name: "Acme" },
          isLoading: false,
        }),
      },
    },
    orders: {
      getOrderWithLineItems: {
        useQuery: () => ({
          data: null,
          isLoading: false,
        }),
      },
      createDraftEnhanced: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
      updateDraftEnhanced: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
      finalizeDraft: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
    salesSheets: {
      getInventory: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          error: null,
        }),
      },
    },
    credit: {
      checkOrderCredit: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
    pricing: {
      requestCreditOverride: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasAnyPermission: () => false,
  }),
}));

vi.mock("@/hooks/useUnsavedChangesWarning", () => ({
  useUnsavedChangesWarning: () => ({
    setHasUnsavedChanges: vi.fn(),
    ConfirmNavigationDialog: () => null,
  }),
}));

vi.mock("@/hooks/useDebounceCallback", () => ({
  useDebounceCallback: () => vi.fn(),
}));

vi.mock("@/hooks/useRetryableQuery", () => ({
  useRetryableQuery: (query: unknown) => query,
}));

vi.mock("@/hooks/work-surface", () => ({
  useSaveState: () => ({
    saveState: "saved",
    setSaving: vi.fn(),
    setSaved: vi.fn(),
    setError: vi.fn(),
    SaveStateIndicator: null,
  }),
  useUndo: () => ({
    undoLast: vi.fn(),
    registerAction: vi.fn(),
  }),
  useValidationTiming: () => ({
    getFieldState: () => ({
      showSuccess: false,
      showError: false,
      error: null,
    }),
    handleChange: vi.fn(),
    handleBlur: vi.fn(),
    setValues: vi.fn(),
  }),
  useWorkSurfaceKeyboard: () => ({
    keyboardProps: {
      onKeyDown: vi.fn(),
    },
  }),
}));

vi.mock("@/hooks/orders/useOrderCalculations", () => ({
  useOrderCalculations: () => ({
    totals: {
      subtotal: 0,
      adjustmentAmount: 0,
      total: 0,
    },
    warnings: [],
    isValid: true,
  }),
  calculateLineItemFromRetailPrice: vi.fn(),
}));

vi.mock("@/components/common/PageErrorBoundary", () => ({
  PageErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder ?? "selected"}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/client-combobox", () => ({
  ClientCombobox: () => <div>Client combobox</div>,
}));

vi.mock("@/components/clients/QuickCreateClient", () => ({
  QuickCreateClient: ({
    open,
    title,
  }: {
    open?: boolean;
    title?: string;
  }) => (
    <div data-testid="quick-create-client" data-open={open ? "true" : "false"}>
      {title ?? "Quick Create Client"}
    </div>
  ),
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/orders/LineItemTable", () => ({
  LineItemTable: ({
    showCogs,
    showMargin,
  }: {
    showCogs: boolean;
    showMargin: boolean;
  }) => <div>{`line-item-table:${showCogs}:${showMargin}`}</div>,
}));

vi.mock("@/components/orders/OrdersDocumentLineItemsGrid", () => ({
  OrdersDocumentLineItemsGrid: ({
    showCogsColumn,
    showMarginColumn,
  }: {
    showCogsColumn: boolean;
    showMarginColumn: boolean;
  }) => <div>{`document-grid:${showCogsColumn}:${showMarginColumn}`}</div>,
}));

vi.mock("@/components/orders/OrderAdjustmentPanel", () => ({
  OrderAdjustmentPanel: () => <div>Adjustment panel</div>,
}));

vi.mock("@/components/orders/OrderTotalsPanel", () => ({
  OrderTotalsPanel: ({
    showCogs,
    showMargin,
  }: {
    showCogs: boolean;
    showMargin: boolean;
  }) => <div>{`totals-panel:${showCogs}:${showMargin}`}</div>,
}));

vi.mock("@/components/orders/FloatingOrderPreview", () => ({
  FloatingOrderPreview: ({
    showCogs,
    showMargin,
  }: {
    showCogs: boolean;
    showMargin: boolean;
  }) => <div>{`floating-preview:${showCogs}:${showMargin}`}</div>,
}));

vi.mock("@/components/orders/CreditLimitBanner", () => ({
  CreditLimitBanner: () => <div>Credit limit banner</div>,
}));

vi.mock("@/components/orders/CreditWarningDialog", () => ({
  CreditWarningDialog: () => null,
}));

vi.mock("@/components/orders/ReferredBySelector", () => ({
  ReferredBySelector: () => <div>Referred by selector</div>,
}));

vi.mock("@/components/orders/ReferralCreditsPanel", () => ({
  ReferralCreditsPanel: () => <div>Referral credits panel</div>,
}));

vi.mock("@/components/credit/CreditLimitWidget", () => ({
  CreditLimitWidget: () => <div>Credit widget</div>,
}));

vi.mock("@/components/pricing/PricingConfigTab", () => ({
  PricingConfigTab: () => <div>Pricing config</div>,
}));

vi.mock("@/components/pricing/PricingContextPanel", () => ({
  PricingContextPanel: () => <div>Pricing context</div>,
}));

vi.mock("@/components/sales/InventoryBrowser", () => ({
  InventoryBrowser: () => <div>Inventory browser</div>,
}));

vi.mock("@/components/clients/ProfileQuickPanel", () => ({
  ProfileQuickPanel: () => <div>Profile quick panel</div>,
}));

vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => <div>Keyboard hints</div>,
}));

vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: () => <div>Status bar</div>,
}));

vi.mock("@/lib/orders/inventoryBrowserFocus", () => ({
  queueInventoryBrowserSearchFocus: vi.fn(),
}));

vi.mock("@/lib/workspaceRoutes", () => ({
  buildSalesWorkspacePath: () => "/sales/orders",
  buildSheetNativeOrdersDocumentPath: () => "/sheet-native/orders/document",
  buildSheetNativeOrdersPath: () => "/sheet-native/orders",
  buildAccountingWorkspacePath: () => "/accounting",
  buildOperationsWorkspacePath: () => "/operations",
}));

vi.mock("@/lib/quantity", () => ({
  normalizePositiveIntegerWithin: (value: number) => value,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" "),
}));

import OrderCreatorPageV2 from "./OrderCreatorPage";

describe("OrderCreatorPage wave 5 visibility wiring", () => {
  beforeEach(() => {
    mockSearch = "?clientId=1";
    mockDisplaySettings = {
      display: {
        canViewCogsData: false,
        showCogsInOrders: false,
        showMarginInOrders: false,
      },
    };
  });

  it("suppresses cost columns across the sheet-native order composer when access is denied", async () => {
    render(<OrderCreatorPageV2 surfaceVariant="sheet-native-orders" />);

    await waitFor(() => {
      expect(screen.getByText("document-grid:false:false")).toBeInTheDocument();
    });
    expect(
      screen.getByText("floating-preview:false:false")
    ).toBeInTheDocument();
    expect(screen.getByText("totals-panel:false:false")).toBeInTheDocument();
  });

  it("passes cost visibility through when display settings allow it", async () => {
    mockDisplaySettings = {
      display: {
        canViewCogsData: true,
        showCogsInOrders: true,
        showMarginInOrders: true,
      },
    };

    render(<OrderCreatorPageV2 surfaceVariant="sheet-native-orders" />);

    await waitFor(() => {
      expect(screen.getByText("document-grid:true:true")).toBeInTheDocument();
    });
    expect(screen.getByText("floating-preview:true:true")).toBeInTheDocument();
    expect(screen.getByText("totals-panel:true:true")).toBeInTheDocument();
  });

  it("keeps quick add on the order page with an inline modal trigger", async () => {
    render(<OrderCreatorPageV2 surfaceVariant="sheet-native-orders" />);

    expect(
      screen.getByRole("button", { name: /quick add/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("quick-create-client")).toHaveAttribute(
      "data-open",
      "false"
    );
    expect(screen.getByText("Quick Add Customer")).toBeInTheDocument();
  });
});
