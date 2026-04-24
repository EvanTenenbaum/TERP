import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { ColDef } from "ag-grid-community";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { buildProductIdentityLines } from "@/lib/productIdentity";
import { adaptInventorySavedViewToSalesFilters } from "@/lib/portableInventoryViews";
import { buildRelationshipProfilePath } from "@/lib/relationshipProfile";
import { trpc } from "@/lib/trpc";
import { normalizePositiveIntegerWithin } from "@/lib/quantity";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { useOrderCalculations } from "@/hooks/orders/useOrderCalculations";
import { usePermissions } from "@/hooks/usePermissions";
import {
  type CreditCheckResult,
  resolveOrderCostVisibility,
  shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget,
  useOrderDraft,
} from "@/hooks/useOrderDraft";
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClientCombobox } from "@/components/ui/client-combobox";
import { SavedViewsDropdown } from "@/components/inventory/SavedViewsDropdown";
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
import { ClientCommitContextCard } from "@/components/orders/ClientCommitContextCard";
import type { OrderAdjustment } from "@/components/orders/types";
import { QuickViewSelector } from "@/components/sales/QuickViewSelector";
import { SaveViewDialog } from "@/components/sales/SaveViewDialog";
import { AdvancedFilters } from "@/components/sales/AdvancedFilters";
import {
  clearPortableSalesCut,
  isSalesInventorySellable,
  readPortableSalesCut,
} from "@/components/sales/filtering";
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
import { AdaptiveSplitLayout } from "@/components/layout/AdaptiveSplitLayout";
import InlineRowAddControls from "./InlineRowAddControls";
import { PowersheetGrid } from "./PowersheetGrid";

interface InventoryBrowserRow {
  identity: { rowKey: string };
  inventoryId: number;
  sku: string;
  name: string;
  batchLabel: string;
  category: string;
  subcategory: string;
  brand: string;
  vendor: string;
  retailPrice: number;
  quantity: number;
  grade: string;
  status: string;
  inOrder: boolean;
  _raw: PricedInventoryItem;
}

interface InventoryRowControls {
  quantity: string;
  retailPrice: string;
  markup: string;
  lastEdited: "retailPrice" | "markup" | null;
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
const surfacePanelClass =
  "rounded-xl border border-border/70 bg-card/80 shadow-sm";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const roundToCents = (value: number) => Math.round(value * 100) / 100;
const roundToTenth = (value: number) => Math.round(value * 10) / 10;

const calculateRetailFromMarkup = (basePrice: number, markup: number) =>
  basePrice > 0 ? roundToCents(basePrice * (1 + markup / 100)) : 0;

const calculateMarkupFromRetail = (basePrice: number, retailPrice: number) =>
  basePrice > 0
    ? roundToTenth(((retailPrice - basePrice) / basePrice) * 100)
    : 0;

const sanitizeQuantityInput = (value: string) => value.replace(/\D/g, "");

const sanitizeDecimalInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...fraction] = cleaned.split(".");
  return fraction.length > 0 ? `${whole}.${fraction.join("")}` : whole;
};

const parseNonNegativeNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const formatLineCountLabel = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

const getInventoryCogsPerUnit = (item: PricedInventoryItem) =>
  item.effectiveCogs ?? item.basePrice ?? item.unitCogs ?? 0;

const getInventoryRetailPrice = (item: PricedInventoryItem) =>
  // TER-1011: preserve explicit 0 (intentionally free). Use `??` instead of
  // `||` so a saved retailPrice of 0 isn't replaced by the catalogue default.
  roundToCents(item.retailPrice ?? item.basePrice ?? 0);

const buildDefaultInventoryRowControls = (
  row: InventoryBrowserRow
): InventoryRowControls => {
  const cogsPerUnit = getInventoryCogsPerUnit(row._raw);
  const retailPrice = getInventoryRetailPrice(row._raw);
  const markup =
    row._raw.priceMarkup ?? calculateMarkupFromRetail(cogsPerUnit, retailPrice);
  const availableUnits = Math.max(1, Math.floor(row.quantity || 1));

  return {
    quantity: String(
      normalizePositiveIntegerWithin(row.quantity, availableUnits) ?? 1
    ),
    retailPrice: retailPrice.toFixed(2),
    markup: roundToTenth(markup).toFixed(1),
    lastEdited: null,
  };
};

const normalizeInventoryControlsFromPrice = (
  row: InventoryBrowserRow,
  controls: InventoryRowControls
): InventoryRowControls => {
  const cogsPerUnit = getInventoryCogsPerUnit(row._raw);
  const availableUnits = Math.max(1, Math.floor(row.quantity || 1));
  const quantity =
    normalizePositiveIntegerWithin(controls.quantity, availableUnits) ?? 1;
  const retailPrice = roundToCents(
    parseNonNegativeNumber(controls.retailPrice) ??
      getInventoryRetailPrice(row._raw)
  );
  const markup = roundToTenth(
    calculateMarkupFromRetail(cogsPerUnit, retailPrice)
  );

  return {
    quantity: String(quantity),
    retailPrice: retailPrice.toFixed(2),
    markup: markup.toFixed(1),
    lastEdited: null,
  };
};

const normalizeInventoryControlsFromMarkup = (
  row: InventoryBrowserRow,
  controls: InventoryRowControls
): InventoryRowControls => {
  const cogsPerUnit = getInventoryCogsPerUnit(row._raw);
  const availableUnits = Math.max(1, Math.floor(row.quantity || 1));
  const quantity =
    normalizePositiveIntegerWithin(controls.quantity, availableUnits) ?? 1;
  const fallbackMarkup =
    row._raw.priceMarkup ??
    calculateMarkupFromRetail(cogsPerUnit, getInventoryRetailPrice(row._raw));
  const markup = roundToTenth(
    parseNonNegativeNumber(controls.markup) ?? fallbackMarkup
  );
  const retailPrice = calculateRetailFromMarkup(cogsPerUnit, markup);

  return {
    quantity: String(quantity),
    retailPrice: retailPrice.toFixed(2),
    markup: markup.toFixed(1),
    lastEdited: null,
  };
};

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
    subcategory: item.subcategory ?? "-",
    brand: item.brand ?? "-",
    vendor: item.vendor ?? "-",
    retailPrice: item.retailPrice,
    quantity: item.quantity,
    grade: item.grade ?? "-",
    status: item.status ?? "LIVE",
    inOrder: selectedBatchIds.has(item.id),
    _raw: item,
  }));
}

export function SalesOrderSurface({
  onComplete,
}: {
  onComplete?: () => void;
} = {}) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const utils = trpc.useUtils();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const salesWorkspaceTab = searchParams.get("tab");
  const routeMode = searchParams.get("mode");
  const isCreateOrderEntry = salesWorkspaceTab === "create-order";
  const draft = useOrderDraft({
    surfaceVariant: isCreateOrderEntry
      ? "classic-create-order"
      : "sheet-native-orders",
  });
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
  const [inventoryRowControls, setInventoryRowControls] = useState<
    Record<number, InventoryRowControls>
  >({});
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [creditCheckResult, setCreditCheckResult] =
    useState<CreditCheckResult | null>(null);
  const [pendingCreditOverrideReason, setPendingCreditOverrideReason] =
    useState<string | undefined>();
  const [isCheckingCredit, setIsCheckingCredit] = useState(false);
  const defaultViewAppliedClientRef = useRef<number | null>(null);
  const importedPortableCutClientRef = useRef<number | null>(null);
  const skipNextDefaultViewApplyRef = useRef(false);
  const isQuoteCreateEntry =
    isCreateOrderEntry &&
    (routeMode === "quote" || draft.orderType === "QUOTE");
  const { hasAnyPermission } = usePermissions();

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
  const canViewPricingContext = hasAnyPermission([
    "orders:view_pricing",
    "pricing:read",
    "pricing:access",
    "pricing:rules:read",
    "pricing:profiles:read",
    "pricing:defaults:view",
  ]);

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
    if (filters.brands.length > 0) {
      items = items.filter(item => filters.brands.includes(item.brand ?? ""));
    }
    if (filters.grades.length > 0) {
      items = items.filter(item => filters.grades.includes(item.grade ?? ""));
    }
    if (filters.strainFamilies.length > 0) {
      items = items.filter(item => {
        const raw = item as PricedInventoryItem & {
          strainFamily?: string | null;
          strain?: string | null;
        };
        return filters.strainFamilies.includes(
          raw.strainFamily ?? raw.strain ?? ""
        );
      });
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
    if (!filters.includeUnavailable) {
      items = items.filter(item =>
        isSalesInventorySellable({
          quantity: item.quantity,
          status: item.status,
        })
      );
    }

    return sortInventory(items, sort);
  }, [filters, inventoryQuery.data, searchTerm, sort]);

  const inventoryRows = useMemo(
    () => mapInventoryToRows(filteredInventory, selectedBatchIds),
    [filteredInventory, selectedBatchIds]
  );
  const productIdentityByBatchId = useMemo(
    () =>
      Object.fromEntries(
        (inventoryQuery.data ?? []).map(item => [
          item.id,
          buildProductIdentityLines({
            brand: item.brand,
            vendor: item.vendor,
            category: item.category,
            subcategory: item.subcategory,
          }),
        ])
      ),
    [inventoryQuery.data]
  );

  useEffect(() => {
    setInventoryRowControls({});
  }, [draft.clientId]);

  useEffect(() => {
    if (!draft.clientId) {
      importedPortableCutClientRef.current = null;
      return;
    }
    if (importedPortableCutClientRef.current === draft.clientId) {
      return;
    }

    const nextPortableCut = readPortableSalesCut();
    if (!nextPortableCut || nextPortableCut.clientId !== draft.clientId) {
      return;
    }

    if (nextPortableCut.viewId && !savedViewsQuery.data) {
      return;
    }

    const matchedView = nextPortableCut.viewId
      ? savedViewsQuery.data?.find(view => view.id === nextPortableCut.viewId)
      : null;

    skipNextDefaultViewApplyRef.current = true;
    setFilters(nextPortableCut.filters);
    setSort(
      (matchedView?.sort as InventorySortConfig | undefined) ?? DEFAULT_SORT
    );
    setColumnVisibility(
      matchedView?.columnVisibility ?? DEFAULT_COLUMN_VISIBILITY
    );
    setCurrentViewId(nextPortableCut.viewId ?? null);
    importedPortableCutClientRef.current = draft.clientId;
    clearPortableSalesCut();
    toast.info(
      nextPortableCut.viewName
        ? `Imported cut: ${nextPortableCut.viewName}`
        : "Imported inventory filters"
    );
  }, [draft.clientId, savedViewsQuery.data]);

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
  const isUnavailableClientRoute =
    draft.clientId !== null &&
    !clientsQuery.isLoading &&
    !clientDetailsQuery.isLoading &&
    !selectedClientName?.trim();
  const selectedClientLabel = useMemo(() => {
    if (!draft.clientId) {
      return undefined;
    }

    const trimmedName = selectedClientName?.trim();
    if (trimmedName) {
      return trimmedName;
    }

    return isUnavailableClientRoute
      ? `Unavailable customer #${draft.clientId}`
      : undefined;
  }, [draft.clientId, isUnavailableClientRoute, selectedClientName]);

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
    draft.isFinalizingDraft ||
    isCheckingCredit ||
    creditCheckMutation.isPending;
  const consignmentRiskItems = useMemo(
    () =>
      draft.items.filter(
        item => item.cogsMode === "RANGE" && item.isBelowVendorRange
      ),
    [draft.items]
  );
  const consignmentRiskSummary = useMemo(() => {
    if (consignmentRiskItems.length === 0) {
      return null;
    }

    const labels = consignmentRiskItems
      .slice(0, 2)
      .map(item => item.productDisplayName || `Batch #${item.batchId}`);
    const remainder = consignmentRiskItems.length - labels.length;

    return remainder > 0
      ? `${labels.join(", ")} +${remainder} more`
      : labels.join(", ");
  }, [consignmentRiskItems]);
  const draftAvailabilitySummary = useMemo(() => {
    const byBatchId = new Map(
      (inventoryQuery.data ?? []).map(item => [item.id, item])
    );
    let sellableCount = 0;
    let blockedCount = 0;
    let unresolvedCount = 0;

    draft.items.forEach(item => {
      const liveItem = byBatchId.get(item.batchId);
      if (!liveItem) {
        unresolvedCount += 1;
        return;
      }

      if (
        isSalesInventorySellable({
          quantity: liveItem.quantity,
          status: liveItem.status,
        })
      ) {
        sellableCount += 1;
        return;
      }

      blockedCount += 1;
    });

    return {
      sellableCount,
      blockedCount,
      unresolvedCount,
      issueCount: blockedCount + unresolvedCount,
    };
  }, [draft.items, inventoryQuery.data]);
  const hasOnlyUnavailableDraftLines =
    draft.items.length > 0 &&
    draftAvailabilitySummary.sellableCount === 0 &&
    draftAvailabilitySummary.issueCount > 0;
  const hasDraftAvailabilityWarnings = draftAvailabilitySummary.issueCount > 0;

  const updateInventoryRowControls = useCallback(
    (
      row: InventoryBrowserRow,
      updater: (current: InventoryRowControls) => InventoryRowControls
    ) => {
      setInventoryRowControls(current => ({
        ...current,
        [row.inventoryId]: updater(
          current[row.inventoryId] ?? buildDefaultInventoryRowControls(row)
        ),
      }));
    },
    []
  );

  const handleInventoryQuantityChange = useCallback(
    (row: InventoryBrowserRow, value: string) => {
      updateInventoryRowControls(row, current => ({
        ...current,
        quantity: sanitizeQuantityInput(value),
      }));
    },
    [updateInventoryRowControls]
  );

  const handleInventoryQuantityBlur = useCallback(
    (row: InventoryBrowserRow) => {
      updateInventoryRowControls(row, current => ({
        ...current,
        quantity: normalizeInventoryControlsFromPrice(row, current).quantity,
      }));
    },
    [updateInventoryRowControls]
  );

  const handleInventoryPriceChange = useCallback(
    (row: InventoryBrowserRow, value: string) => {
      updateInventoryRowControls(row, current => ({
        ...current,
        retailPrice: sanitizeDecimalInput(value),
        lastEdited: "retailPrice",
      }));
    },
    [updateInventoryRowControls]
  );

  const handleInventoryPriceBlur = useCallback(
    (row: InventoryBrowserRow) => {
      updateInventoryRowControls(row, current =>
        normalizeInventoryControlsFromPrice(row, current)
      );
    },
    [updateInventoryRowControls]
  );

  const handleInventoryMarkupChange = useCallback(
    (row: InventoryBrowserRow, value: string) => {
      updateInventoryRowControls(row, current => ({
        ...current,
        markup: sanitizeDecimalInput(value),
        lastEdited: "markup",
      }));
    },
    [updateInventoryRowControls]
  );

  const handleInventoryMarkupBlur = useCallback(
    (row: InventoryBrowserRow) => {
      updateInventoryRowControls(row, current =>
        normalizeInventoryControlsFromMarkup(row, current)
      );
    },
    [updateInventoryRowControls]
  );

  const handleAddInventoryRow = useCallback(
    (row: InventoryBrowserRow) => {
      const stagedControls =
        inventoryRowControls[row.inventoryId] ??
        buildDefaultInventoryRowControls(row);
      const normalizedControls =
        stagedControls.lastEdited === "markup"
          ? normalizeInventoryControlsFromMarkup(row, stagedControls)
          : normalizeInventoryControlsFromPrice(row, stagedControls);

      setInventoryRowControls(current => ({
        ...current,
        [row.inventoryId]: normalizedControls,
      }));

      handleAddInventoryItems([
        {
          ...row._raw,
          orderQuantity: Number(normalizedControls.quantity),
          retailPrice: Number(normalizedControls.retailPrice),
          priceMarkup: Number(normalizedControls.markup),
        },
      ]);
    },
    [handleAddInventoryItems, inventoryRowControls]
  );

  const inventoryColumnDefs = useMemo<ColDef<InventoryBrowserRow>[]>(() => {
    const cols: ColDef<InventoryBrowserRow>[] = [
      {
        field: "inOrder",
        headerName: "Add",
        minWidth: showMargin ? 292 : 224,
        maxWidth: showMargin ? 292 : 224,
        pinned: "left",
        sortable: false,
        filter: false,
        resizable: false,
        suppressNavigable: true,
        headerTooltip:
          "Set qty and pricing before adding this row to the order",
        cellRenderer: (params: { data?: InventoryBrowserRow }) => {
          const row = params.data;
          if (!row) return null;
          const controls =
            inventoryRowControls[row.inventoryId] ??
            buildDefaultInventoryRowControls(row);
          const isNonSellable =
            row.quantity < 1 ||
            NON_SELLABLE_STATUSES.includes(
              row.status as (typeof NON_SELLABLE_STATUSES)[number]
            );

          return (
            <InlineRowAddControls
              added={row.inOrder}
              disabled={isNonSellable}
              onAdd={() => handleAddInventoryRow(row)}
              quantityValue={controls.quantity}
              quantityLabel={`Quantity for ${row.name}`}
              onQuantityChange={value =>
                handleInventoryQuantityChange(row, value)
              }
              onQuantityBlur={() => handleInventoryQuantityBlur(row)}
              priceValue={controls.retailPrice}
              priceLabel={`Price for ${row.name}`}
              onPriceChange={value => handleInventoryPriceChange(row, value)}
              onPriceBlur={() => handleInventoryPriceBlur(row)}
              markupValue={showMargin ? controls.markup : undefined}
              markupLabel={showMargin ? `Markup for ${row.name}` : undefined}
              onMarkupChange={
                showMargin
                  ? value => handleInventoryMarkupChange(row, value)
                  : undefined
              }
              onMarkupBlur={
                showMargin ? () => handleInventoryMarkupBlur(row) : undefined
              }
            />
          );
        },
        cellClass: "powersheet-cell--locked",
      },
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
        cellRenderer: (params: { data?: InventoryBrowserRow }) => {
          const row = params.data;
          if (!row) return "";

          const identityLines = buildProductIdentityLines({
            brand: row.brand,
            vendor: row.vendor,
            category: row.category,
            subcategory: row.subcategory,
          });

          return (
            <div className="flex min-w-0 flex-col py-0.5">
              <span className="truncate font-medium">{row.name}</span>
              {identityLines.secondary ? (
                <span className="truncate text-[10px] text-muted-foreground">
                  {identityLines.secondary}
                </span>
              ) : null}
              {identityLines.tertiary ? (
                <span className="truncate text-[10px] text-muted-foreground/80">
                  {identityLines.tertiary}
                </span>
              ) : null}
            </div>
          );
        },
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

    return cols;
  }, [
    columnVisibility,
    handleAddInventoryRow,
    handleInventoryMarkupBlur,
    handleInventoryMarkupChange,
    handleInventoryPriceBlur,
    handleInventoryPriceChange,
    handleInventoryQuantityBlur,
    handleInventoryQuantityChange,
    inventoryRowControls,
    showCogs,
    showMargin,
  ]);

  const handleClientChange = useCallback(
    (clientId: number | null) => {
      setLocation(
        buildDocumentRoute({
          clientId,
          mode: draft.orderType === "QUOTE" ? "quote" : undefined,
        })
      );
      resetComposerState();
      setClientId(clientId);
      setSelectedInventoryRowId(null);
      setSearchTerm("");
      setFilters(DEFAULT_FILTERS);
      setSort(DEFAULT_SORT);
      setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
      setCurrentViewId(null);
      defaultViewAppliedClientRef.current = null;
      importedPortableCutClientRef.current = null;
      skipNextDefaultViewApplyRef.current = false;
      setPendingCreditOverrideReason(undefined);
      clearPortableSalesCut();
    },
    [
      buildDocumentRoute,
      draft.orderType,
      resetComposerState,
      setClientId,
      setLocation,
    ]
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

  const handleApplyInventorySavedView = useCallback(
    (savedFilters: { [key: string]: unknown }) => {
      skipNextDefaultViewApplyRef.current = true;
      setFilters(
        adaptInventorySavedViewToSalesFilters(
          savedFilters as Parameters<
            typeof adaptInventorySavedViewToSalesFilters
          >[0]
        )
      );
      setCurrentViewId(null);
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

  const handleSaveDraftRequest = useCallback(() => {
    if (isUnavailableClientRoute) {
      toast.error("Select an active customer before saving this draft");
      return;
    }

    draft.handleSaveDraft();
  }, [draft, isUnavailableClientRoute]);

  const handleFinalizeRequest = useCallback(async () => {
    if (isCheckingCredit || creditCheckMutation.isPending) {
      return;
    }

    if (isUnavailableClientRoute) {
      toast.error("Select an active customer before finalizing this order");
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

    // TER-1222: Remove confirmation theater - finalize directly
    confirmFinalizeDraft({
      overrideReason: undefined,
    });
  }, [
    calculationState.isValid,
    confirmFinalizeDraft,
    creditCheckMutation,
    draft.clientId,
    draft.orderType,
    grandTotal,
    isUnavailableClientRoute,
    isCheckingCredit,
  ]);

  const handleCreditProceed = useCallback((overrideReason?: string) => {
    setShowCreditWarning(false);
    setCreditCheckResult(null);
    // TER-1222: Remove confirmation theater - finalize directly after credit override
    confirmFinalizeDraft({
      overrideReason: overrideReason?.trim() || undefined,
    });
  }, [confirmFinalizeDraft]);

  const handleCreditCancel = useCallback(() => {
    setShowCreditWarning(false);
    setCreditCheckResult(null);
    setPendingCreditOverrideReason(undefined);
  }, []);

  const keyboard = useWorkSurfaceKeyboard({
    gridMode: false,
    customHandlers: {
      "cmd+s": (event: ReactKeyboardEvent) => {
        event.preventDefault();
        handleSaveDraftRequest();
      },
      "ctrl+s": (event: ReactKeyboardEvent) => {
        event.preventDefault();
        handleSaveDraftRequest();
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
    (filters.search.trim() ? 1 : 0) +
    filters.categories.length +
    filters.brands.length +
    filters.grades.length +
    filters.strainFamilies.length +
    filters.vendors.length +
    (filters.priceMin !== null || filters.priceMax !== null ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.includeUnavailable ? 1 : 0);
  const documentContextLabel = draft.activeDraftId
    ? `Draft #${draft.activeDraftId}`
    : draft.isSalesSheetImport
      ? "Catalogue import"
      : isQuoteCreateEntry
        ? "New quote"
        : isCreateOrderEntry
          ? "New order"
          : "New draft";
  const emptyStateTitle = isQuoteCreateEntry
    ? "Select a customer to start this quote"
    : isCreateOrderEntry
      ? "Select a customer to start this order"
      : "Select a customer to start the order sheet";
  const emptyStateDescription = isQuoteCreateEntry
    ? "Choose a customer above to begin a new quote without leaving the sales workspace."
    : isCreateOrderEntry
      ? "Choose a customer above to begin a new order without leaving the sales workspace."
      : "Choose a customer above to begin.";
  const inventoryPanel = (
    <div className="space-y-1">
      <div>
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
        description="Set qty and price on the row, then add it to the order."
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
            {selectedClientLabel ? ` · ${selectedClientLabel}` : ""}
          </span>
        }
        minHeight={420}
      />
    </div>
  );
  const documentPanel = (
    <div className="rounded-xl border border-border/70 bg-background shadow-sm">
      <OrdersDocumentLineItemsGrid
        items={draft.items}
        clientId={draft.clientId}
        onChange={draft.setItems}
        showCogsColumn={showCogs}
        showMarginColumn={showMargin}
        productIdentityByBatchId={productIdentityByBatchId}
      />
    </div>
  );
  const documentControlsBand = (
    <div className="space-y-1">
      {hasDraftAvailabilityWarnings ? (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 px-3 py-2 text-sm text-amber-950 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="space-y-1">
              <p className="font-medium">
                {hasOnlyUnavailableDraftLines
                  ? "This draft only contains unavailable, blocked, or unresolved lines. Replace, recheck, or remove them before confirming the order."
                  : `${formatLineCountLabel(draftAvailabilitySummary.issueCount, "draft line")} still needs live availability confirmation before final confirmation.`}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-amber-900/80">
                {draftAvailabilitySummary.blockedCount > 0 ? (
                  <span>
                    {formatLineCountLabel(
                      draftAvailabilitySummary.blockedCount,
                      "blocked line"
                    )}
                  </span>
                ) : null}
                {draftAvailabilitySummary.unresolvedCount > 0 ? (
                  <span>
                    {formatLineCountLabel(
                      draftAvailabilitySummary.unresolvedCount,
                      "unresolved line"
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {consignmentRiskItems.length > 0 ? (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 px-3 py-2 text-sm text-amber-950 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="space-y-1">
              <p className="font-medium">
                Consignment range follow-up required on{" "}
                {consignmentRiskItems.length}{" "}
                {consignmentRiskItems.length === 1 ? "line" : "lines"} before
                commit.
              </p>
              <p className="text-xs text-amber-900/80">
                {consignmentRiskSummary}. The below-range exception stays
                flagged for settlement follow-up.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
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
        onSaveDraft={handleSaveDraftRequest}
        onFinalize={() => void handleFinalizeRequest()}
        saveDraftDisabled={
          draft.items.length === 0 ||
          draft.isPersistingDraft ||
          isUnavailableClientRoute
        }
        finalizeDisabled={
          !calculationState.isValid ||
          isFinalizeBusy ||
          isUnavailableClientRoute ||
          hasOnlyUnavailableDraftLines
        }
        isFinalizePending={isFinalizeBusy}
        isSeededFromCatalogue={draft.isSalesSheetImport}
        orderType={draft.orderType}
      />
    </div>
  );
  const handleOpenClientOverview = useCallback(() => {
    if (!draft.clientId) {
      return;
    }

    setLocation(buildRelationshipProfilePath(draft.clientId, "overview"));
  }, [draft.clientId, setLocation]);
  const handleOpenClientMoney = useCallback(() => {
    if (!draft.clientId) {
      return;
    }

    setLocation(buildRelationshipProfilePath(draft.clientId, "money"));
  }, [draft.clientId, setLocation]);
  const handleOpenClientPricing = useCallback(() => {
    if (!draft.clientId) {
      return;
    }

    setLocation(buildRelationshipProfilePath(draft.clientId, "sales-pricing"));
  }, [draft.clientId, setLocation]);
  const showClientCommitContext =
    draft.clientId !== null &&
    !isUnavailableClientRoute &&
    !draft.isFinalizingDraft;
  const activeClientId = draft.clientId ?? 0;

  return (
    <div {...keyboardProps} className="flex h-full flex-col gap-1">
      <div
        className={`${surfacePanelClass} flex flex-wrap items-start gap-3 px-3 py-2`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                if (onComplete) {
                  onComplete();
                } else {
                  setLocation(buildSalesWorkspacePath("orders"));
                }
              }}
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Queue
            </Button>
            <span className="text-sm font-medium text-foreground">
              {documentContextLabel}
            </span>
            {draft.SaveStateIndicator}
          </div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Keep the customer, document type, and totals in one working frame
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="w-48">
            <ClientCombobox
              value={draft.clientId}
              onValueChange={handleClientChange}
              clients={clientList}
              isLoading={clientsQuery.isLoading}
              placeholder="Customer..."
              emptyText="No customers"
              selectedLabel={selectedClientLabel}
            />
          </div>
          <Select
            value={draft.orderType}
            onValueChange={value =>
              draft.setOrderType(value as "QUOTE" | "SALE")
            }
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SALE">Sales Order</SelectItem>
              <SelectItem value="QUOTE">Quote</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={`${surfacePanelClass} flex flex-wrap items-center gap-1.5 px-3 py-2`}
      >
        {draft.clientId && !isUnavailableClientRoute && (
          <>
            <QuickViewSelector
              clientId={draft.clientId}
              onLoadView={handleLoadView}
              currentViewId={currentViewId}
            />
            <SavedViewsDropdown onApplyView={handleApplyInventorySavedView} />
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
              onClick={() =>
                setFilters(current => ({
                  ...current,
                  includeUnavailable: !current.includeUnavailable,
                }))
              }
            >
              {filters.includeUnavailable
                ? "Including unavailable"
                : "Available now"}
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
          {isUnavailableClientRoute
            ? "Select an active customer to continue"
            : draft.items.length > 0
              ? `${draft.items.length} lines \u00b7 ${formatCurrency(grandTotal)}`
              : "No line items"}
        </span>
      </div>

      {showAdvancedFilters && draft.clientId && !isUnavailableClientRoute && (
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

      {showClientCommitContext ? (
        <div className="px-1">
          <ClientCommitContextCard
            clientId={activeClientId}
            canViewPricingContext={canViewPricingContext}
            onOpenOverview={handleOpenClientOverview}
            onOpenMoney={handleOpenClientMoney}
            onOpenPricing={handleOpenClientPricing}
          />
        </div>
      ) : null}

      {draft.clientId ? (
        isUnavailableClientRoute ? (
          <div className="flex flex-1 items-center justify-center px-4 py-16">
            <div className="max-w-xl rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="space-y-2">
                  <p className="font-medium">
                    {selectedClientLabel ?? "Selected customer"} is unavailable
                  </p>
                  <p className="text-amber-900/80">
                    This route points to a customer record that is no longer in
                    active clients. Pick an active customer before you build,
                    save, or finalize this order.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-1 px-1">
            <AdaptiveSplitLayout
              primary={
                <AdaptiveSplitLayout
                  primary={inventoryPanel}
                  secondary={documentPanel}
                  autoSaveId="sales-order-surface-layout-v2"
                  direction="vertical"
                  primaryDefaultSize={55}
                  primaryMinSize={20}
                  secondaryMinSize={20}
                  desktopClassName="h-full"
                  primaryPanelClassName="min-h-0"
                  secondaryPanelClassName="min-h-0"
                />
              }
              secondary={documentControlsBand}
              autoSaveId="sales-order-surface-tables-controls-v1"
              direction="vertical"
              primaryDefaultSize={72}
              primaryMinSize={35}
              secondaryDefaultSize={28}
              secondaryMinSize={18}
              desktopClassName="min-h-[720px] flex-1"
              primaryPanelClassName="min-h-0 h-full"
              secondaryPanelClassName="min-h-0 overflow-y-auto"
              mobileClassName="space-y-1"
            />
          </div>
        )
      ) : (
        <div className="flex flex-1 items-center justify-center px-4 py-16 text-center text-muted-foreground">
          <div>
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">{emptyStateTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emptyStateDescription}
            </p>
          </div>
        </div>
      )}

      <WorkSurfaceStatusBar
        left={
          <span>
            {draft.items.length} lines
            {draft.hasUnsavedChanges ? " \u00b7 unsaved" : " \u00b7 synced"}
            {currentViewId ? " \u00b7 saved view" : ""}
            {selectedClientLabel ? ` \u00b7 ${selectedClientLabel}` : ""}
            {isUnavailableClientRoute ? " \u00b7 action blocked" : ""}
          </span>
        }
        right={<KeyboardHintBar hints={keyboardHints} className="text-xs" />}
      />

      {draft.clientId && !isUnavailableClientRoute ? (
        <SaveViewDialog
          open={showSaveViewDialog}
          onOpenChange={setShowSaveViewDialog}
          clientId={draft.clientId}
          clientName={selectedClientLabel}
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
        onViewPaymentHistory={() => setLocation("/accounting?tab=invoices")}
        onRecordPayment={() => setLocation("/accounting?tab=payments")}
        clientName={selectedClientLabel ?? "Selected customer"}
        onProceed={handleCreditProceed}
        onCancel={handleCreditCancel}
      />

      {/* TER-1222: Removed finalize confirmation dialog (confirmation theater) */}
      <draft.ConfirmNavigationDialog />
    </div>
  );
}

export default SalesOrderSurface;
