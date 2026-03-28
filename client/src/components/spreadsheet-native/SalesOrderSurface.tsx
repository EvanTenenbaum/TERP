import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { ColDef } from "ag-grid-community";
import { AlertTriangle, ArrowLeft, Save } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { useOrderCalculations } from "@/hooks/orders/useOrderCalculations";
import {
  type CreditCheckResult,
  resolveOrderCostVisibility,
  shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget,
  useOrderDraft,
} from "@/hooks/useOrderDraft";
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClientCombobox } from "@/components/ui/client-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OrdersDocumentLineItemsGrid,
  InvoiceBottom,
  OrderAdjustmentsBar,
  CreditWarningDialog,
} from "@/components/orders";
import type { OrderAdjustment } from "@/components/orders/types";
import { QuickViewSelector } from "@/components/sales/QuickViewSelector";
import { SaveViewDialog } from "@/components/sales/SaveViewDialog";
import { AdvancedFilters } from "@/components/sales/AdvancedFilters";
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  NON_SELLABLE_STATUSES,
  type ColumnVisibility,
  type InventoryFilters,
  type InventorySortConfig,
  type PricedInventoryItem,
} from "@/components/sales/types";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { PowersheetGrid } from "./PowersheetGrid";

interface InventoryBrowserRow {
  identity: { rowKey: string };
  inventoryId: number;
  sku: string;
  name: string;
  batchLabel: string;
  category: string;
  vendor: string;
  retailPrice: number;
  quantity: number;
  grade: string;
  status: string;
  inOrder: boolean;
  _raw: PricedInventoryItem;
}

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const keyboardHints: KeyboardHint[] = [
  { key: `${mod}+S`, label: "save draft" },
  { key: `${mod}+Enter`, label: "finalize" },
  { key: `${mod}+Z`, label: "undo in grid" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const getInventorySku = (item: PricedInventoryItem) => {
  const raw = item as PricedInventoryItem & {
    batchSku?: string | null;
    sku?: string | null;
  };
  return raw.batchSku || raw.sku || `SKU-${item.id}`;
};

const getInventoryBatchLabel = (item: PricedInventoryItem) => {
  const raw = item as PricedInventoryItem & {
    batchNumber?: string | number | null;
    batchLabel?: string | null;
  };
  return raw.batchLabel || raw.batchNumber?.toString() || `Batch #${item.id}`;
};

function sortInventory(
  items: PricedInventoryItem[],
  sort: InventorySortConfig
): PricedInventoryItem[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const read = (item: PricedInventoryItem) => {
      switch (sort.field) {
        case "category":
          return item.category ?? "";
        case "retailPrice":
          return item.retailPrice;
        case "quantity":
          return item.quantity;
        case "basePrice":
          return item.basePrice;
        case "grade":
          return item.grade ?? "";
        case "name":
        default:
          return item.name;
      }
    };

    const leftValue = read(left);
    const rightValue = read(right);

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor;
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor;
  });
}

function mapInventoryToRows(
  items: PricedInventoryItem[],
  selectedBatchIds: Set<number>
): InventoryBrowserRow[] {
  return items.map(item => ({
    identity: { rowKey: `inventory:${item.id}` },
    inventoryId: item.id,
    sku: getInventorySku(item),
    name: item.name,
    batchLabel: getInventoryBatchLabel(item),
    category: item.category ?? "-",
    vendor: item.vendor ?? "-",
    retailPrice: item.retailPrice,
    quantity: item.quantity,
    grade: item.grade ?? "-",
    status: item.status ?? "LIVE",
    inOrder: selectedBatchIds.has(item.id),
    _raw: item,
  }));
}

export function SalesOrderSurface() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const draft = useOrderDraft({ surfaceVariant: "sheet-native-orders" });
  const handleAddInventoryItems = draft.handleAddInventoryItems;
  const resetComposerState = draft.resetComposerState;
  const setClientId = draft.setClientId;
  const confirmFinalizeDraft = draft.confirmFinalize;
  const buildDocumentRoute = draft.buildDocumentRoute;

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<InventorySortConfig>(DEFAULT_SORT);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY
  );
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [selectedInventoryRowId, setSelectedInventoryRowId] = useState<
    string | null
  >(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [creditCheckResult, setCreditCheckResult] =
    useState<CreditCheckResult | null>(null);
  const [pendingCreditOverrideReason, setPendingCreditOverrideReason] =
    useState<string | undefined>();
  const [isCheckingCredit, setIsCheckingCredit] = useState(false);
  const defaultViewAppliedClientRef = useRef<number | null>(null);
  const skipNextDefaultViewApplyRef = useRef(false);

  const clientsQuery = trpc.clients.list.useQuery({ limit: 1000 });
  const clientList = useMemo(() => {
    const data = clientsQuery.data;
    const items = Array.isArray(data) ? data : (data?.items ?? []);
    return items
      .filter((client: { isBuyer?: boolean | null }) => client.isBuyer)
      .map((client: { id: number; name: string; email?: string | null }) => ({
        id: client.id,
        name: client.name,
        email: client.email,
      }));
  }, [clientsQuery.data]);

  const clientDetailsQuery = trpc.clients.getById.useQuery(
    { clientId: draft.clientId ?? 0 },
    { enabled: draft.clientId !== null }
  );
  const inventoryQuery = trpc.salesSheets.getInventory.useQuery(
    { clientId: draft.clientId ?? 0 },
    { enabled: draft.clientId !== null }
  );
  const savedViewsQuery = trpc.salesSheets.getViews.useQuery(
    { clientId: draft.clientId ?? undefined },
    { enabled: draft.clientId !== null }
  );
  const displaySettingsQuery =
    trpc.organizationSettings.getDisplaySettings.useQuery();
  const creditCheckMutation = trpc.credit.checkOrderCredit.useMutation();

  const { showCogs, showMargin } = useMemo(
    () => resolveOrderCostVisibility(displaySettingsQuery.data),
    [displaySettingsQuery.data]
  );

  const selectedBatchIds = useMemo(
    () => new Set(draft.items.map(item => item.batchId)),
    [draft.items]
  );

  const filteredInventory = useMemo(() => {
    let items = inventoryQuery.data ?? [];
    const lower = searchTerm.trim().toLowerCase();

    if (lower) {
      items = items.filter(item => {
        const batchLabel = getInventoryBatchLabel(item).toLowerCase();
        return (
          item.name.toLowerCase().includes(lower) ||
          (item.category ?? "").toLowerCase().includes(lower) ||
          (item.vendor ?? "").toLowerCase().includes(lower) ||
          getInventorySku(item).toLowerCase().includes(lower) ||
          batchLabel.includes(lower)
        );
      });
    }

    if (filters.search) {
      const filterSearch = filters.search.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(filterSearch)
      );
    }
    if (filters.categories.length > 0) {
      items = items.filter(item =>
        filters.categories.includes(item.category ?? "")
      );
    }
    if (filters.grades.length > 0) {
      items = items.filter(item => filters.grades.includes(item.grade ?? ""));
    }
    if (filters.vendors.length > 0) {
      items = items.filter(item => filters.vendors.includes(item.vendor ?? ""));
    }
    if (filters.priceMin !== null) {
      const priceMin = filters.priceMin;
      items = items.filter(item => item.retailPrice >= priceMin);
    }
    if (filters.priceMax !== null) {
      const priceMax = filters.priceMax;
      items = items.filter(item => item.retailPrice <= priceMax);
    }
    if (filters.inStockOnly) {
      items = items.filter(item => item.quantity > 0);
    }

    return sortInventory(items, sort);
  }, [filters, inventoryQuery.data, searchTerm, sort]);

  const inventoryRows = useMemo(
    () => mapInventoryToRows(filteredInventory, selectedBatchIds),
    [filteredInventory, selectedBatchIds]
  );

  const calculationState = useOrderCalculations(draft.items, draft.adjustment);
  const orderTotals = calculationState.totals;
  const grandTotal = orderTotals.total + draft.freight;

  const selectedClientName = useMemo(() => {
    if (!draft.clientId) return undefined;
    return (
      clientDetailsQuery.data?.name ??
      clientList.find(client => client.id === draft.clientId)?.name
    );
  }, [clientDetailsQuery.data?.name, clientList, draft.clientId]);

  const creditSummary = useMemo(() => {
    const client = clientDetailsQuery.data;
    const creditLimit = Number(client?.creditLimit || 0);
    const currentExposure = Number(client?.totalOwed || 0);
    if (!client || creditLimit <= 0) {
      return {
        creditAvailable: null,
        utilizationPercent: null,
        warning: null,
      };
    }

    const projectedExposure = currentExposure + grandTotal;
    const availableCredit = creditLimit - currentExposure;
    const utilizationPercent = (projectedExposure / creditLimit) * 100;
    const warning =
      projectedExposure > creditLimit
        ? `Projected exposure exceeds limit by ${formatCurrency(projectedExposure - creditLimit)}`
        : utilizationPercent >= 90
          ? "Projected utilization is above 90%"
          : utilizationPercent >= 75
            ? "Projected utilization is above 75%"
            : null;

    return {
      creditAvailable: availableCredit,
      utilizationPercent,
      warning,
    };
  }, [clientDetailsQuery.data, grandTotal]);

  const isFinalizeBusy =
    draft.isFinalizingDraft || isCheckingCredit || creditCheckMutation.isPending;

  const inventoryColumnDefs = useMemo<ColDef<InventoryBrowserRow>[]>(() => {
    const cols: ColDef<InventoryBrowserRow>[] = [
      {
        field: "status",
        headerName: "",
        maxWidth: 28,
        cellRenderer: (params: { value: string }) =>
          NON_SELLABLE_STATUSES.includes(
            params.value as (typeof NON_SELLABLE_STATUSES)[number]
          )
            ? "\u26a0"
            : "",
        cellStyle: (params: { value: string }) =>
          NON_SELLABLE_STATUSES.includes(
            params.value as (typeof NON_SELLABLE_STATUSES)[number]
          )
            ? { color: "var(--color-amber-500)", fontWeight: "bold" }
            : null,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 90,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked font-mono text-xs",
      },
      {
        field: "name",
        headerName: "Product",
        flex: 1.3,
        minWidth: 180,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "batchLabel",
        headerName: "Batch",
        minWidth: 96,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked font-mono text-xs",
      },
    ];

    if (columnVisibility.quantity) {
      cols.push({
        field: "quantity",
        headerName: "Avail",
        minWidth: 70,
        maxWidth: 88,
        cellClass: "powersheet-cell--locked",
      });
    }

    if (columnVisibility.retailPrice) {
      cols.push({
        field: "retailPrice",
        headerName: "Price",
        minWidth: 86,
        maxWidth: 106,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      });
    }

    if (showCogs && columnVisibility.basePrice) {
      cols.push({
        headerName: "COGS",
        minWidth: 86,
        maxWidth: 106,
        valueGetter: params =>
          params.data?._raw.effectiveCogs ?? params.data?._raw.unitCogs ?? 0,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      });
    }

    if (columnVisibility.category) {
      cols.push({
        field: "category",
        headerName: "Category",
        minWidth: 92,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
      });
    }

    if (columnVisibility.vendor) {
      cols.push({
        field: "vendor",
        headerName: "Vendor",
        minWidth: 92,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
      });
    }

    if (columnVisibility.grade) {
      cols.push({
        field: "grade",
        headerName: "Grade",
        minWidth: 72,
        maxWidth: 90,
        cellClass: "powersheet-cell--locked",
      });
    }

    cols.push({
      field: "inOrder",
      headerName: "Action",
      minWidth: 90,
      maxWidth: 110,
      suppressNavigable: true,
      sortable: false,
      cellRenderer: (params: { data?: InventoryBrowserRow }) => {
        const row = params.data;
        if (!row) return null;
        const isNonSellable = NON_SELLABLE_STATUSES.includes(
          row.status as (typeof NON_SELLABLE_STATUSES)[number]
        );
        return (
          <Button
            type="button"
            size="sm"
            variant={row.inOrder ? "secondary" : "outline"}
            className="h-6 px-2 text-[10px]"
            disabled={row.inOrder || isNonSellable}
            onClick={event => {
              event.stopPropagation();
              handleAddInventoryItems([row._raw]);
            }}
          >
            {row.inOrder ? "Added" : "Add"}
          </Button>
        );
      },
      cellClass: "powersheet-cell--locked",
    });

    return cols;
  }, [columnVisibility, handleAddInventoryItems, showCogs]);

  const handleClientChange = useCallback(
    (clientId: number | null) => {
      setLocation(buildDocumentRoute());
      resetComposerState();
      setClientId(clientId);
      setSelectedInventoryRowId(null);
      setSearchTerm("");
      setFilters(DEFAULT_FILTERS);
      setSort(DEFAULT_SORT);
      setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
      setCurrentViewId(null);
      defaultViewAppliedClientRef.current = null;
      skipNextDefaultViewApplyRef.current = false;
      setPendingCreditOverrideReason(undefined);
    },
    [buildDocumentRoute, resetComposerState, setClientId, setLocation]
  );

  const handleAddSelectedInventory = useCallback(() => {
    if (!selectedInventoryRowId) return;
    const selectedRow = inventoryRows.find(
      row => row.identity.rowKey === selectedInventoryRowId
    );
    if (!selectedRow) return;
    if (
      NON_SELLABLE_STATUSES.includes(
        selectedRow.status as (typeof NON_SELLABLE_STATUSES)[number]
      )
    ) {
      toast.error("This inventory item cannot be added to an order");
      return;
    }
    handleAddInventoryItems([selectedRow._raw]);
  }, [handleAddInventoryItems, inventoryRows, selectedInventoryRowId]);

  const selectedInventoryRow = useMemo(
    () =>
      selectedInventoryRowId
        ? inventoryRows.find(row => row.identity.rowKey === selectedInventoryRowId)
        : null,
    [inventoryRows, selectedInventoryRowId]
  );

  const selectedInventoryBlocked = Boolean(
    selectedInventoryRow &&
      NON_SELLABLE_STATUSES.includes(
        selectedInventoryRow.status as (typeof NON_SELLABLE_STATUSES)[number]
      )
  );

  const handleLoadView = useCallback(
    (view: {
      id?: number | null;
      filters: InventoryFilters;
      sort: InventorySortConfig;
      columnVisibility: ColumnVisibility;
    }) => {
      skipNextDefaultViewApplyRef.current = true;
      setFilters(view.filters);
      setSort(view.sort);
      setColumnVisibility(view.columnVisibility);
      setCurrentViewId(view.id ?? null);
    },
    []
  );

  useEffect(() => {
    if (!draft.clientId || !savedViewsQuery.data) return;
    if (skipNextDefaultViewApplyRef.current) {
      skipNextDefaultViewApplyRef.current = false;
      return;
    }
    if (defaultViewAppliedClientRef.current === draft.clientId) return;
    const defaultView = savedViewsQuery.data.find(view => view.isDefault);
    if (!defaultView) return;
    setFilters(defaultView.filters);
    setSort(defaultView.sort as InventorySortConfig);
    setColumnVisibility(defaultView.columnVisibility);
    setCurrentViewId(defaultView.id);
    defaultViewAppliedClientRef.current = draft.clientId;
  }, [draft.clientId, savedViewsQuery.data]);

  const handleFinalizeRequest = useCallback(async () => {
    if (isCheckingCredit || creditCheckMutation.isPending) {
      return;
    }

    if (!draft.clientId) {
      toast.error("Please select a customer before finalizing");
      return;
    }

    if (!calculationState.isValid) {
      toast.error("Please add at least one valid line item before finalizing");
      return;
    }

    if (draft.orderType === "SALE") {
      setIsCheckingCredit(true);
      try {
        const result = await creditCheckMutation.mutateAsync({
          clientId: draft.clientId,
          orderTotal: grandTotal,
        });
        setCreditCheckResult(result);
        if (result.warning || result.requiresOverride || !result.allowed) {
          setShowCreditWarning(true);
          return;
        }
      } catch (error) {
        console.error("Credit check failed:", error);
        toast.error("Credit could not be verified. Please try again.");
        return;
      } finally {
        setIsCheckingCredit(false);
      }
    }

    setShowFinalizeConfirm(true);
  }, [
    calculationState.isValid,
    creditCheckMutation,
    draft.clientId,
    draft.orderType,
    grandTotal,
    isCheckingCredit,
  ]);

  const handleCreditProceed = useCallback((overrideReason?: string) => {
    setPendingCreditOverrideReason(overrideReason);
    setShowCreditWarning(false);
    setShowFinalizeConfirm(true);
  }, []);

  const handleCreditCancel = useCallback(() => {
    setShowCreditWarning(false);
    setCreditCheckResult(null);
    setPendingCreditOverrideReason(undefined);
  }, []);

  const handleConfirmFinalize = useCallback(() => {
    setShowFinalizeConfirm(false);
    confirmFinalizeDraft({
      overrideReason: pendingCreditOverrideReason?.trim() || undefined,
    });
    setPendingCreditOverrideReason(undefined);
  }, [confirmFinalizeDraft, pendingCreditOverrideReason]);

  const keyboard = useWorkSurfaceKeyboard({
    gridMode: false,
    customHandlers: {
      "cmd+s": (event: ReactKeyboardEvent) => {
        event.preventDefault();
        draft.handleSaveDraft();
      },
      "ctrl+s": (event: ReactKeyboardEvent) => {
        event.preventDefault();
        draft.handleSaveDraft();
      },
      "cmd+enter": (event: ReactKeyboardEvent) => {
        event.preventDefault();
        void handleFinalizeRequest();
      },
      "ctrl+enter": (event: ReactKeyboardEvent) => {
        event.preventDefault();
        void handleFinalizeRequest();
      },
    },
  });

  const keyboardProps = useMemo(
    () => ({
      ...keyboard.keyboardProps,
      onKeyDown: (event: ReactKeyboardEvent) => {
        if (shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget(event.target)) {
          return;
        }

        keyboard.keyboardProps.onKeyDown(event);
      },
    }),
    [keyboard.keyboardProps]
  );

  const activeFilterCount =
    filters.categories.length +
    filters.grades.length +
    filters.vendors.length +
    (filters.inStockOnly ? 1 : 0);

  return (
    <div {...keyboardProps} className="flex h-full flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 bg-background px-2 py-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setLocation(buildSalesWorkspacePath("orders"))}
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Queue
        </Button>
        <Badge variant="secondary" className="text-[10px]">
          Sales Order
        </Badge>
        {draft.isSalesSheetImport ? (
          <Badge variant="outline" className="text-[10px]">
            Seeded from catalogue
          </Badge>
        ) : null}
        <div className="w-48">
          <ClientCombobox
            value={draft.clientId}
            onValueChange={handleClientChange}
            clients={clientList}
            isLoading={clientsQuery.isLoading}
            placeholder="Customer..."
            emptyText="No customers"
          />
        </div>
        <Select
          value={draft.orderType}
          onValueChange={value => draft.setOrderType(value as "QUOTE" | "SALE")}
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SALE">Sales Order</SelectItem>
            <SelectItem value="QUOTE">Quote</SelectItem>
          </SelectContent>
        </Select>
        {draft.activeDraftId ? (
          <Badge variant="outline" className="text-[10px]">
            Draft #{draft.activeDraftId}
          </Badge>
        ) : null}
        {draft.SaveStateIndicator}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() =>
              setLocation(
                buildSalesWorkspacePath("create-order", {
                  ...(draft.activeDraftId ? { draftId: draft.activeDraftId } : {}),
                  classic: true,
                })
              )
            }
          >
            Classic Composer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={draft.items.length === 0 || draft.isPersistingDraft}
            onClick={() => draft.handleSaveDraft()}
          >
            <Save className="mr-1 h-3 w-3" />
            Save Draft
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!calculationState.isValid || isFinalizeBusy}
            onClick={() => void handleFinalizeRequest()}
          >
            {draft.orderType === "QUOTE" ? "Confirm Quote" : "Confirm Order"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1">
        {draft.clientId && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              disabled={!selectedInventoryRowId || selectedInventoryBlocked}
              onClick={handleAddSelectedInventory}
            >
              Add Selected
            </Button>
            <QuickViewSelector
              clientId={draft.clientId}
              onLoadView={handleLoadView}
              currentViewId={currentViewId}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => setShowSaveViewDialog(true)}
            >
              Save View
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => setShowAdvancedFilters(prev => !prev)}
            >
              Filters{activeFilterCount > 0 ? " \u25cf" : ""}
            </Button>
          </>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {draft.items.length > 0
            ? `${draft.items.length} lines \u00b7 ${formatCurrency(grandTotal)}`
            : "No line items"}
        </span>
      </div>

      {showAdvancedFilters && draft.clientId && (
        <AdvancedFilters
          filters={filters}
          sort={sort}
          onFiltersChange={setFilters}
          onSortChange={setSort}
          inventory={inventoryQuery.data ?? []}
          isOpen={showAdvancedFilters}
          onOpenChange={setShowAdvancedFilters}
        />
      )}

      {draft.clientId ? (
        <div className="grid flex-1 gap-1.5 px-1 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="mb-1">
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search SKU, batch, product..."
                className="h-7 max-w-xs text-xs"
              />
            </div>
            <PowersheetGrid
              surfaceId="sales-order-inventory-browser"
              requirementIds={["ORD-INV-001", "ORD-INV-002"]}
              title="Inventory"
              description="Pick rows from available inventory and add them to the order."
              rows={inventoryRows}
              columnDefs={inventoryColumnDefs}
              getRowId={row => row.identity.rowKey}
              selectedRowId={selectedInventoryRowId}
              onSelectedRowChange={row =>
                setSelectedInventoryRowId(row?.identity.rowKey ?? null)
              }
              selectionMode="cell-range"
              enableFillHandle={false}
              enableUndoRedo={false}
              isLoading={inventoryQuery.isLoading}
              errorMessage={inventoryQuery.error?.message ?? null}
              emptyTitle="No inventory"
              emptyDescription="This customer has no priced inventory available."
              summary={
                <span>
                  {inventoryRows.length} visible
                  {selectedClientName ? ` \u00b7 ${selectedClientName}` : ""}
                </span>
              }
              minHeight={420}
            />
          </div>

          <div className="flex flex-col gap-1 lg:col-span-3">
            <div className="rounded-lg border border-border/70 bg-background">
              <OrdersDocumentLineItemsGrid
                items={draft.items}
                clientId={draft.clientId}
                onChange={draft.setItems}
                onAddItem={() => {
                  const firstAvailable = inventoryRows.find(row => !row.inOrder);
                  if (firstAvailable) {
                    draft.handleAddInventoryItems([firstAvailable._raw]);
                  } else {
                    toast.info("Use the inventory browser to add more items");
                  }
                }}
                showCogsColumn={showCogs}
                showMarginColumn={showMargin}
              />
              <InvoiceBottom
                subtotal={orderTotals.subtotal}
                adjustment={draft.adjustment as OrderAdjustment | null}
                onAdjustmentChange={draft.setAdjustment}
                showAdjustmentOnDocument={draft.showAdjustmentOnDocument}
                onShowAdjustmentOnDocumentChange={draft.setShowAdjustmentOnDocument}
                freight={draft.freight}
                onFreightChange={draft.setFreight}
                total={grandTotal}
                paymentTerms={draft.paymentTerms}
                onPaymentTermsChange={draft.setPaymentTerms}
                creditAvailable={creditSummary.creditAvailable}
                creditUtilizationPercent={creditSummary.utilizationPercent}
                creditWarning={creditSummary.warning}
                totalCogs={orderTotals.totalCogs}
                totalMargin={orderTotals.totalMargin}
                marginPercent={orderTotals.avgMarginPercent}
                showCogs={showCogs}
                showMargin={showMargin}
              />
            </div>

            <OrderAdjustmentsBar
              referredByClientId={draft.referredByClientId}
              onReferredByChange={draft.setReferredByClientId}
              clientId={draft.clientId}
              notes={draft.notes}
              onNotesChange={draft.setNotes}
              activeDraftId={draft.activeDraftId}
              isSaving={draft.isPersistingDraft}
              hasUnsavedChanges={draft.hasUnsavedChanges}
              onSaveDraft={() => draft.handleSaveDraft()}
              onFinalize={() => void handleFinalizeRequest()}
              isFinalizePending={isFinalizeBusy}
              isSeededFromCatalogue={draft.isSalesSheetImport}
              orderType={draft.orderType}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-4 py-16 text-center text-muted-foreground">
          <div>
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Select a customer to start the order sheet</p>
          </div>
        </div>
      )}

      <WorkSurfaceStatusBar
        left={
          <span>
            {draft.items.length} lines
            {draft.hasUnsavedChanges ? " \u00b7 unsaved" : " \u00b7 synced"}
            {currentViewId ? " \u00b7 saved view" : ""}
            {selectedClientName ? ` \u00b7 ${selectedClientName}` : ""}
          </span>
        }
        right={<KeyboardHintBar hints={keyboardHints} className="text-xs" />}
      />

      {draft.clientId ? (
        <SaveViewDialog
          open={showSaveViewDialog}
          onOpenChange={setShowSaveViewDialog}
          clientId={draft.clientId}
          clientName={selectedClientName}
          filters={filters}
          sort={sort}
          columnVisibility={columnVisibility}
          onSaved={viewId => {
            skipNextDefaultViewApplyRef.current = true;
            setCurrentViewId(viewId);
            void utils.salesSheets.getViews.invalidate({
              clientId: draft.clientId ?? undefined,
            });
          }}
        />
      ) : null}

      <CreditWarningDialog
        open={showCreditWarning}
        onOpenChange={setShowCreditWarning}
        creditCheck={creditCheckResult}
        orderTotal={grandTotal}
        clientName={selectedClientName ?? "Selected customer"}
        onProceed={handleCreditProceed}
        onCancel={handleCreditCancel}
      />

      <ConfirmDialog
        open={showFinalizeConfirm}
        onOpenChange={open => {
          setShowFinalizeConfirm(open);
          if (!open) {
            setPendingCreditOverrideReason(undefined);
          }
        }}
        title={draft.orderType === "QUOTE" ? "Confirm quote?" : "Confirm order?"}
        description={
          draft.orderType === "QUOTE"
            ? "This will save the current draft and finalize it as a quote."
            : "This will save the current draft and finalize it as a sales order."
        }
        confirmLabel={draft.orderType === "QUOTE" ? "Confirm Quote" : "Confirm Order"}
        onConfirm={handleConfirmFinalize}
        isLoading={draft.isFinalizingDraft}
      />

      <draft.ConfirmNavigationDialog />
    </div>
  );
}

export default SalesOrderSurface;
