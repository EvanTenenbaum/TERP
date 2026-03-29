/**
 * SalesCatalogueSurface
 *
 * Unified sheet-native surface for Sales Catalogues.
 * Replaces both SalesSheetCreatorPage (classic) and SalesSheetsPilotSurface (pilot).
 *
 * Layout: Toolbar → Action Bar → Split Grids (Inventory 3/4 | Preview 1/4) → Handoff Bar → Status Bar
 *
 * Spec: docs/superpowers/specs/2026-03-27-unified-sheet-native-sales-surfaces-design.md
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef } from "ag-grid-community";
import {
  ArrowRight,
  Download,
  FileText,
  Link2,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientCombobox } from "@/components/ui/client-combobox";
import { QuickViewSelector } from "@/components/sales/QuickViewSelector";
import { SaveViewDialog } from "@/components/sales/SaveViewDialog";
import { AdvancedFilters } from "@/components/sales/AdvancedFilters";
import { DraftDialog } from "@/components/sales/DraftDialog";
import { SavedSheetsDialog } from "@/components/sales/SavedSheetsDialog";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PricedInventoryItem } from "@/components/sales/types";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DEFAULT_COLUMN_VISIBILITY,
  NON_SELLABLE_STATUSES,
  type InventoryFilters,
  type InventorySortConfig,
  type ColumnVisibility,
} from "@/components/sales/types";
import { useCatalogueDraft } from "@/hooks/useCatalogueDraft";

// ── types ────────────────────────────────────────────────────────────────────

interface InventoryBrowserRow {
  identity: { rowKey: string };
  inventoryId: number;
  name: string;
  category: string;
  strain: string;
  vendor: string;
  basePrice: number;
  markup: number;
  retailPrice: number;
  quantity: number;
  grade: string;
  inSheet: boolean;
  status: string;
  _raw: PricedInventoryItem;
}

interface SheetPreviewRow {
  identity: { rowKey: string };
  index: number;
  name: string;
  category: string;
  retailPrice: number;
  quantity: number;
  lineTotal: number;
  _raw: PricedInventoryItem;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

export const escapeCsvField = (value: string) =>
  value.replace(/\r\n|\n|\r/g, " ").replace(/"/g, "\"\"");

export function buildCatalogueCsv(items: PricedInventoryItem[]) {
  return [
    "Product,Category,Qty,Retail Price",
    ...items.map(
      i =>
        `"${escapeCsvField(i.name)}","${escapeCsvField(i.category ?? "")}",${i.quantity},${i.retailPrice}`
    ),
  ].join("\n");
}

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const keyboardHints: KeyboardHint[] = [
  { key: `${mod}+S`, label: "save" },
  { key: `${mod}+C`, label: "copy" },
  { key: "Click", label: "select" },
  { key: "Shift+Click", label: "extend" },
];

function mapInventoryToRows(
  items: PricedInventoryItem[],
  selectedIds: Set<number>
): InventoryBrowserRow[] {
  return items.map(item => ({
    identity: { rowKey: `inventory:${item.id}` },
    inventoryId: item.id,
    name: item.name,
    category: item.category ?? "-",
    strain: item.strain ?? item.strainFamily ?? "-",
    vendor: item.vendor ?? "-",
    basePrice: item.basePrice,
    markup: item.priceMarkup,
    retailPrice: item.retailPrice,
    quantity: item.quantity,
    grade: item.grade ?? "-",
    inSheet: selectedIds.has(item.id),
    status: item.status ?? "LIVE",
    _raw: item,
  }));
}

function mapItemsToPreviewRows(
  items: PricedInventoryItem[]
): SheetPreviewRow[] {
  return items.map((item, index) => ({
    identity: { rowKey: `preview:${item.id}` },
    index: index + 1,
    name: item.name,
    category: item.category ?? "-",
    retailPrice: item.retailPrice,
    quantity: item.quantity,
    lineTotal: item.retailPrice * item.quantity,
    _raw: item,
  }));
}

function coerceOptionalNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeLoadedSheetItems(items: unknown): PricedInventoryItem[] {
  if (!Array.isArray(items)) return [];

  return items.flatMap(item => {
    if (!item || typeof item !== "object") return [];

    const raw = item as Record<string, unknown>;
    const id = Number(raw.id);
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const basePrice = Number(raw.basePrice);
    const retailPrice = Number(raw.retailPrice);
    const quantity = Number(raw.quantity);

    if (
      !Number.isFinite(id) ||
      !name ||
      !Number.isFinite(basePrice) ||
      !Number.isFinite(retailPrice) ||
      !Number.isFinite(quantity)
    ) {
      return [];
    }

    return [
      {
        id,
        name,
        category: typeof raw.category === "string" ? raw.category : undefined,
        subcategory:
          typeof raw.subcategory === "string" ? raw.subcategory : undefined,
        strain: typeof raw.strain === "string" ? raw.strain : undefined,
        strainId:
          typeof raw.strainId === "number" ? raw.strainId : undefined,
        strainFamily:
          typeof raw.strainFamily === "string" ? raw.strainFamily : undefined,
        basePrice,
        cogsMode:
          raw.cogsMode === "FIXED" || raw.cogsMode === "RANGE"
            ? raw.cogsMode
            : undefined,
        unitCogs: coerceOptionalNumber(raw.unitCogs) ?? undefined,
        unitCogsMin: coerceOptionalNumber(raw.unitCogsMin) ?? null,
        unitCogsMax: coerceOptionalNumber(raw.unitCogsMax) ?? null,
        effectiveCogs: coerceOptionalNumber(raw.effectiveCogs) ?? undefined,
        effectiveCogsBasis:
          raw.effectiveCogsBasis === "LOW" ||
          raw.effectiveCogsBasis === "MID" ||
          raw.effectiveCogsBasis === "HIGH" ||
          raw.effectiveCogsBasis === "MANUAL"
            ? raw.effectiveCogsBasis
            : undefined,
        retailPrice,
        quantity,
        grade: typeof raw.grade === "string" ? raw.grade : undefined,
        vendor: typeof raw.vendor === "string" ? raw.vendor : undefined,
        vendorId:
          typeof raw.vendorId === "number" ? raw.vendorId : undefined,
        priceMarkup: Number.isFinite(Number(raw.priceMarkup))
          ? Number(raw.priceMarkup)
          : 0,
        appliedRules: Array.isArray(raw.appliedRules)
          ? raw.appliedRules.flatMap(rule => {
              if (!rule || typeof rule !== "object") return [];
              const appliedRule = rule as Record<string, unknown>;
              if (
                typeof appliedRule.ruleId !== "number" ||
                typeof appliedRule.ruleName !== "string" ||
                typeof appliedRule.adjustment !== "string"
              ) {
                return [];
              }
              return [
                {
                  ruleId: appliedRule.ruleId,
                  ruleName: appliedRule.ruleName,
                  adjustment: appliedRule.adjustment,
                },
              ];
            })
          : [],
        status: typeof raw.status === "string" ? raw.status : undefined,
      },
    ];
  });
}

// ── component ────────────────────────────────────────────────────────────────

export function SalesCatalogueSurface() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ── client state ───────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<PricedInventoryItem[]>([]);
  const [selectedInventoryRowId, setSelectedInventoryRowId] = useState<
    string | null
  >(null);
  const [selectedPreviewRowId, setSelectedPreviewRowId] = useState<
    string | null
  >(null);

  // ── filter/sort/view state ─────────────────────────────────────────────
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<InventorySortConfig>(DEFAULT_SORT);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY
  );
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ── dialogs ────────────────────────────────────────────────────────────
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);
  const [showSwitchClientDialog, setShowSwitchClientDialog] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showSavedSheetsDialog, setShowSavedSheetsDialog] = useState(false);
  const [pendingClientId, setPendingClientId] = useState<number | null>(null);
  const defaultViewAppliedClientIdRef = useRef<number | null>(null);

  // ── draft hook ─────────────────────────────────────────────────────────
  const draft = useCatalogueDraft({
    clientId: selectedClientId,
    items: selectedItems,
  });
  const resetCatalogueDraft = draft.resetDraft;
  const saveCatalogueDraft = draft.saveDraft;
  const convertCatalogueToOrder = draft.handleConvertToOrder;
  const draftFileName = draft.draftName;

  // ── data ───────────────────────────────────────────────────────────────
  const clientsQuery = trpc.clients.list.useQuery({ limit: 1000 });
  const clientList = useMemo(() => {
    const data = clientsQuery.data;
    const items = Array.isArray(data) ? data : (data?.items ?? []);
    return items
      .filter((c: { isBuyer?: boolean | null }) => c.isBuyer)
      .map((c: { id: number; name: string; email?: string | null }) => ({
        id: c.id,
        name: c.name,
        email: c.email,
      }));
  }, [clientsQuery.data]);

  const inventoryQuery = trpc.salesSheets.getInventory.useQuery(
    { clientId: selectedClientId ?? 0 },
    { enabled: selectedClientId !== null }
  );

  const savedSheetsQuery = trpc.salesSheets.getHistory.useQuery(
    { clientId: selectedClientId ?? 0 },
    { enabled: selectedClientId !== null }
  );

  const savedViewsQuery = trpc.salesSheets.getViews.useQuery(
    { clientId: selectedClientId ?? undefined },
    { enabled: selectedClientId !== null }
  );

  const displaySettingsQuery =
    trpc.organizationSettings.getDisplaySettings.useQuery();
  const showCogs = displaySettingsQuery.data?.display.showCogsInOrders ?? false;

  // ── live session mutation ──────────────────────────────────────────────
  const liveSessionMutation = trpc.salesSheets.convertToLiveSession.useMutation(
    {
      onSuccess: data => {
        if (data?.sessionId) {
          setLocation(
            buildSalesWorkspacePath("live-shopping", {
              session: data.sessionId,
            })
          );
          toast.success("Live shopping session started");
          return;
        }
        toast.error("Live shopping session could not be started");
      },
      onError: error => {
        toast.error("Failed to start live session: " + error.message);
      },
    }
  );

  // ── auto-load default view on client change ────────────────────────────
  useEffect(() => {
    if (selectedClientId === null) {
      defaultViewAppliedClientIdRef.current = null;
      return;
    }
    if (!selectedClientId || !savedViewsQuery.data) return;
    if (defaultViewAppliedClientIdRef.current === selectedClientId) return;

    const views = Array.isArray(savedViewsQuery.data)
      ? savedViewsQuery.data
      : [];
    const defaultView = views.find(
      (v: { clientId: number | null; isDefault: boolean }) =>
        v.clientId === selectedClientId && v.isDefault
    );
    if (defaultView) {
      setFilters(
        (defaultView as { filters: InventoryFilters }).filters ??
          DEFAULT_FILTERS
      );
      setSort(
        (defaultView as { sort: InventorySortConfig }).sort ?? DEFAULT_SORT
      );
      setColumnVisibility(
        (defaultView as { columnVisibility: ColumnVisibility })
          .columnVisibility ?? DEFAULT_COLUMN_VISIBILITY
      );
      setCurrentViewId(defaultView.id as number);
      defaultViewAppliedClientIdRef.current = selectedClientId;
      toast.info(
        `Loaded default view: ${(defaultView as { name: string }).name}`
      );
      return;
    }
    defaultViewAppliedClientIdRef.current = selectedClientId;
  }, [selectedClientId, savedViewsQuery.data]);

  // ── row data ───────────────────────────────────────────────────────────
  const selectedItemIds = useMemo(
    () => new Set(selectedItems.map(i => i.id)),
    [selectedItems]
  );

  const inventoryRows = useMemo(() => {
    let items = inventoryQuery.data ?? [];

    // Apply text search
    const lower = filters.search.trim().toLowerCase();
    if (lower) {
      items = items.filter(
        (item: PricedInventoryItem) =>
          item.name.toLowerCase().includes(lower) ||
          (item.category ?? "").toLowerCase().includes(lower) ||
          (item.vendor ?? "").toLowerCase().includes(lower) ||
          (item.strain ?? item.strainFamily ?? "").toLowerCase().includes(lower)
      );
    }

    // Apply advanced filters
    if (filters.categories.length > 0) {
      items = items.filter((item: PricedInventoryItem) =>
        filters.categories.includes(item.category ?? "")
      );
    }
    if (filters.grades.length > 0) {
      items = items.filter((item: PricedInventoryItem) =>
        filters.grades.includes(item.grade ?? "")
      );
    }
    if (filters.vendors.length > 0) {
      items = items.filter((item: PricedInventoryItem) =>
        filters.vendors.includes(item.vendor ?? "")
      );
    }
    if (filters.strainFamilies.length > 0) {
      items = items.filter((item: PricedInventoryItem) =>
        filters.strainFamilies.includes(item.strainFamily ?? "")
      );
    }
    if (filters.priceMin !== null) {
      const priceMin = filters.priceMin;
      items = items.filter(
        (item: PricedInventoryItem) => item.retailPrice >= priceMin
      );
    }
    if (filters.priceMax !== null) {
      const priceMax = filters.priceMax;
      items = items.filter(
        (item: PricedInventoryItem) => item.retailPrice <= priceMax
      );
    }
    if (filters.inStockOnly) {
      items = items.filter((item: PricedInventoryItem) => item.quantity > 0);
    }

    const sortedItems = [...items].sort((a, b) => {
      const getSortValue = (item: PricedInventoryItem) => {
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

      const aValue = getSortValue(a);
      const bValue = getSortValue(b);
      const direction = sort.direction === "asc" ? 1 : -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue), undefined, {
        sensitivity: "base",
        numeric: true,
      }) * direction;
    });

    return mapInventoryToRows(sortedItems, selectedItemIds);
  }, [inventoryQuery.data, selectedItemIds, filters, sort]);

  const previewRows = useMemo(
    () => mapItemsToPreviewRows(selectedItems),
    [selectedItems]
  );

  const selectedInventoryRowStillVisible = useMemo(
    () =>
      selectedInventoryRowId !== null &&
      inventoryRows.some(row => row.identity.rowKey === selectedInventoryRowId),
    [inventoryRows, selectedInventoryRowId]
  );

  const totalSheetValue = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + item.retailPrice * item.quantity,
        0
      ),
    [selectedItems]
  );

  const totalItemCount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems]
  );

  // ── column defs ────────────────────────────────────────────────────────
  const inventoryColumnDefs = useMemo<ColDef<InventoryBrowserRow>[]>(() => {
    const cols: ColDef<InventoryBrowserRow>[] = [
      {
        field: "status",
        headerName: "",
        maxWidth: 28,
        valueGetter: params => params.data?.status ?? "LIVE",
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
        headerTooltip: "Non-sellable batch warning",
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "inSheet",
        headerName: "",
        maxWidth: 36,
        cellRenderer: (params: { value: boolean }) =>
          params.value ? "\u2713" : "",
        cellStyle: { color: "var(--color-primary)", fontWeight: "bold" },
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "name",
        headerName: "Product",
        flex: 1.5,
        minWidth: 160,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "category",
        headerName: "Category",
        minWidth: 100,
        maxWidth: 130,
        hide: !columnVisibility.category,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "strain",
        headerName: "Strain",
        minWidth: 110,
        maxWidth: 140,
        hide: !columnVisibility.strain,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "vendor",
        headerName: "Vendor",
        minWidth: 90,
        maxWidth: 120,
        hide: !columnVisibility.vendor,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "basePrice",
        headerName: "Base",
        minWidth: 80,
        maxWidth: 100,
        hide: !columnVisibility.basePrice,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "retailPrice",
        headerName: "Retail",
        minWidth: 85,
        maxWidth: 105,
        hide: !columnVisibility.retailPrice,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "markup",
        headerName: "Markup",
        minWidth: 80,
        maxWidth: 100,
        hide: !columnVisibility.markup,
        valueFormatter: params => `${Number(params.value ?? 0).toFixed(1)}%`,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "quantity",
        headerName: "Qty",
        minWidth: 60,
        maxWidth: 80,
        hide: !columnVisibility.quantity,
        cellClass: "powersheet-cell--locked",
      },
    ];

    if (showCogs) {
      cols.push({
        headerName: "COGS",
        minWidth: 75,
        maxWidth: 95,
        valueGetter: params =>
          params.data?._raw.effectiveCogs ?? params.data?._raw.unitCogs ?? 0,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      });
    }

    cols.push({
      field: "grade",
      headerName: "Grade",
      minWidth: 70,
      maxWidth: 90,
      hide: !columnVisibility.grade,
      cellClass: "powersheet-cell--locked",
    });

    return cols;
  }, [columnVisibility, showCogs]);

  const previewColumnDefs = useMemo<ColDef<SheetPreviewRow>[]>(
    () => [
      {
        field: "index",
        headerName: "#",
        maxWidth: 36,
        cellClass: "powersheet-cell--locked font-mono text-muted-foreground",
      },
      {
        field: "name",
        headerName: "Item",
        flex: 1.5,
        minWidth: 120,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "quantity",
        headerName: "Qty",
        minWidth: 50,
        maxWidth: 65,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "lineTotal",
        headerName: "Total",
        minWidth: 75,
        maxWidth: 95,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
    ],
    []
  );

  // ── handlers ───────────────────────────────────────────────────────────
  const performClientChange = useCallback(
    (clientId: number | null) => {
      setSelectedClientId(clientId);
      setSelectedItems([]);
      setSelectedInventoryRowId(null);
      setSelectedPreviewRowId(null);
      setFilters(DEFAULT_FILTERS);
      setSort(DEFAULT_SORT);
      setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
      setCurrentViewId(null);
      defaultViewAppliedClientIdRef.current = null;
      resetCatalogueDraft();
    },
    [resetCatalogueDraft]
  );

  const handleClientChange = useCallback(
    (clientId: number | null) => {
      if (clientId === selectedClientId) return;

      if (
        selectedClientId !== null &&
        draft.hasUnsavedChanges &&
        selectedItems.length > 0
      ) {
        setPendingClientId(clientId);
        setShowSwitchClientDialog(true);
        return;
      }

      performClientChange(clientId);
    },
    [
      draft.hasUnsavedChanges,
      performClientChange,
      selectedClientId,
      selectedItems.length,
    ]
  );

  const handleAddSelectedItem = useCallback(() => {
    if (!selectedInventoryRowId) return;
    const row = inventoryRows.find(
      r => r.identity.rowKey === selectedInventoryRowId
    );
    if (!row || selectedItemIds.has(row.inventoryId)) return;
    setSelectedItems(prev => [...prev, row._raw]);
  }, [selectedInventoryRowId, inventoryRows, selectedItemIds]);

  const handleRemoveSelectedItem = useCallback(() => {
    if (!selectedPreviewRowId) return;
    const row = previewRows.find(
      r => r.identity.rowKey === selectedPreviewRowId
    );
    if (!row) return;
    setSelectedItems(prev => prev.filter(i => i.id !== row._raw.id));
    setSelectedPreviewRowId(null);
  }, [selectedPreviewRowId, previewRows]);

  const handleClearAll = useCallback(() => {
    setSelectedItems([]);
    setSelectedPreviewRowId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    void inventoryQuery.refetch();
  }, [inventoryQuery]);

  const handleLoadView = useCallback(
    (view: {
      id: number;
      filters: InventoryFilters;
      sort: InventorySortConfig;
      columnVisibility: ColumnVisibility;
    }) => {
      setCurrentViewId(view.id);
      setFilters(view.filters);
      setSort(view.sort);
      setColumnVisibility(view.columnVisibility);
    },
    []
  );

  const handleExport = useCallback(() => {
    if (selectedItems.length === 0) return;
    const csv = buildCatalogueCsv(selectedItems);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draftFileName || "catalogue"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [draftFileName, selectedItems]);

  const navigateToOrder = useCallback(
    async (fromSalesSheet: boolean, mode?: "quote") => {
      if (!draft.canConvert || draft.isConverting) return;
      const converted = await convertCatalogueToOrder();
      if (!converted) return;
      resetCatalogueDraft();
      setSelectedItems([]);
      setSelectedInventoryRowId(null);
      setSelectedPreviewRowId(null);
      setLocation(
        buildSalesWorkspacePath("create-order", {
          fromSalesSheet,
          mode,
        })
      );
    },
    [
      convertCatalogueToOrder,
      draft.canConvert,
      draft.isConverting,
      resetCatalogueDraft,
      setLocation,
    ]
  );

  // ── keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedInventoryRowId) return;
    if (!selectedInventoryRowStillVisible) {
      setSelectedInventoryRowId(null);
    }
  }, [selectedInventoryRowId, selectedInventoryRowStillVisible]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveCatalogueDraft();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveCatalogueDraft]);

  // ── selected client name ───────────────────────────────────────────────
  const selectedClientName = useMemo(() => {
    if (!selectedClientId) return undefined;
    return clientList.find(c => c.id === selectedClientId)?.name;
  }, [selectedClientId, clientList]);

  // ── active filter count badge ─────────────────────────────────────────
  const activeFilterCount =
    filters.categories.length +
    filters.grades.length +
    filters.strainFamilies.length +
    filters.vendors.length;
  const draftNameMissingForSave =
    selectedClientId !== null &&
    selectedItems.length > 0 &&
    draft.hasUnsavedChanges &&
    draft.draftName.trim().length === 0;

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-1">
      {/* ── TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1 border-b border-border/70 bg-background">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setLocation(buildSalesWorkspacePath("orders"))}
        >
          &larr; Orders
        </Button>
        <Badge
          variant="secondary"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
        >
          Sales Catalogue
        </Badge>
        <Input
          value={draft.draftName}
          onChange={e => draft.setDraftName(e.target.value)}
          placeholder="Draft name..."
          className="h-7 max-w-36 text-xs"
          aria-invalid={draftNameMissingForSave}
          disabled={!selectedClientId}
        />
        {draftNameMissingForSave && (
          <span className="text-[10px] text-amber-700">
            Draft name required to save
          </span>
        )}
        <div className="w-48">
          <ClientCombobox
            value={selectedClientId}
            onValueChange={handleClientChange}
            clients={clientList}
            isLoading={clientsQuery.isLoading}
            placeholder="Client..."
            emptyText="No clients"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {draft.hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300 bg-amber-50 text-[10px] h-5"
            >
              Unsaved
            </Badge>
          )}
          {draft.lastSaveTime && !draft.hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="text-emerald-600 border-emerald-300 bg-emerald-50 text-[10px] h-5"
            >
              Saved
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!selectedClientId || draft.isSaving}
            onClick={draft.saveDraft}
          >
            <Save className="mr-1 h-3 w-3" />
            {draft.isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!selectedClientId}
            onClick={handleRefresh}
            aria-label="Refresh inventory"
          >
            <ArrowRight className="h-3 w-3 rotate-90" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                disabled={!selectedClientId}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowDraftDialog(true)}>
                Load Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSavedSheetsDialog(true)}>
                Load Saved Sheet
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!draft.currentDraftId}
                onClick={() => setShowDeleteDraftDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete Draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── ACTION BAR ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-0.5 rounded-md border border-border/70 bg-muted/30 mx-1">
        <span className="text-xs font-medium">Sheet</span>
        <Button
          size="sm"
          className="h-6 px-2 text-[10px]"
          disabled={!selectedInventoryRowStillVisible || !selectedClientId}
          onClick={handleAddSelectedItem}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px]"
          disabled={!selectedPreviewRowId}
          onClick={handleRemoveSelectedItem}
        >
          <X className="mr-1 h-3 w-3" />
          Remove
        </Button>

        {selectedClientId && (
          <>
            <QuickViewSelector
              clientId={selectedClientId}
              onLoadView={handleLoadView}
              currentViewId={currentViewId}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => setShowSaveViewDialog(true)}
            >
              Save View
            </Button>
            <Button
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
          {selectedItems.length > 0
            ? `${selectedItems.length} items \u00b7 ${formatCurrency(totalSheetValue)}`
            : "No items"}
        </span>
      </div>

      {/* ── ADVANCED FILTERS ─────────────────────────────────────────── */}
      {showAdvancedFilters && selectedClientId && (
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

      {/* ── SPLIT GRIDS ──────────────────────────────────────────────── */}
      {selectedClientId ? (
        <div className="grid gap-1.5 lg:grid-cols-4 px-1">
          {/* Left: Inventory Browser (3/4) */}
          <div className="lg:col-span-3">
            <div className="mb-1">
              <Input
                value={filters.search}
                onChange={e =>
                  setFilters(prev => ({ ...prev, search: e.target.value }))
                }
                placeholder="Search product, vendor, category..."
                className="h-7 max-w-xs text-xs"
              />
            </div>
            <PowersheetGrid
              surfaceId="catalogue-inventory-browser"
              requirementIds={["CAT-001", "CAT-002"]}
              title="Inventory"
              description="Client-priced inventory. Select a row and click Add to include it in the catalogue."
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
              emptyDescription="This client has no priced inventory items."
              summary={
                <span>
                  {inventoryRows.length} visible
                  {selectedClientName ? ` \u00b7 ${selectedClientName}` : ""}
                </span>
              }
              minHeight={340}
            />
          </div>

          {/* Right: Preview (1/4) */}
          <div className="lg:col-span-1 flex flex-col gap-1">
            <PowersheetGrid
              surfaceId="catalogue-preview"
              requirementIds={["CAT-003"]}
              title="Preview"
              description="Items selected for this catalogue."
              rows={previewRows}
              columnDefs={previewColumnDefs}
              getRowId={row => row.identity.rowKey}
              selectedRowId={selectedPreviewRowId}
              onSelectedRowChange={row =>
                setSelectedPreviewRowId(row?.identity.rowKey ?? null)
              }
              selectionMode="cell-range"
              enableFillHandle={false}
              enableUndoRedo={false}
              emptyTitle="Empty catalogue"
              emptyDescription="Select items from inventory and click Add."
              headerActions={
                selectedItems.length > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={handleClearAll}
                  >
                    Clear
                  </Button>
                ) : null
              }
              summary={
                selectedItems.length > 0 ? (
                  <span>
                    {totalItemCount} units \u00b7{" "}
                    {formatCurrency(totalSheetValue)}
                  </span>
                ) : undefined
              }
              minHeight={220}
            />

            {/* Output actions */}
            <div className="flex gap-1 flex-wrap">
              <Button
                size="sm"
                className="h-7 flex-1 text-[10px]"
                disabled={
                  !selectedClientId ||
                  (selectedItems.length === 0 && !draft.currentDraftId) ||
                  draft.isSaving
                }
                onClick={draft.saveDraft}
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px]"
                disabled={!draft.canShare}
                onClick={() => void draft.generateShareLink()}
                aria-label="Copy share link"
              >
                <Link2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px]"
                disabled={selectedItems.length === 0}
                onClick={handleExport}
                aria-label="Export CSV"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            Select a client to start building a catalogue
          </p>
        </div>
      )}

      {/* ── HANDOFF BAR ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-2 py-1 mx-1 rounded-md border border-border/70 bg-background">
        {draft.hasUnsavedChanges && selectedItems.length > 0 && (
          <Badge
            variant="outline"
            className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]"
          >
            Save before sharing or converting
          </Badge>
        )}
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!draft.canShare}
            onClick={() => void draft.generateShareLink()}
          >
            Share Link
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!draft.canConvert || draft.isConverting}
            onClick={() => void navigateToOrder(true)}
          >
            &rarr; Sales Order
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!draft.canConvert || draft.isConverting}
            onClick={() => void navigateToOrder(true, "quote")}
          >
            &rarr; Quote
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!draft.canGoLive || liveSessionMutation.isPending}
            onClick={() => {
              if (!draft.canGoLive) return;
              if (!draft.lastSavedSheetId) {
                toast.error("Save the catalogue before going live");
                return;
              }
              liveSessionMutation.mutate({ sheetId: draft.lastSavedSheetId });
            }}
          >
            Live
          </Button>
        </div>
      </div>

      {/* ── STATUS BAR ───────────────────────────────────────────────── */}
      <WorkSurfaceStatusBar
        left={
          <span>
            {selectedItems.length} selected
            {currentViewId ? " \u00b7 saved view" : " \u00b7 default view"}
            {draft.hasUnsavedChanges ? " \u00b7 unsaved" : ""}
            {selectedClientName ? ` \u00b7 ${selectedClientName}` : ""}
          </span>
        }
        right={<KeyboardHintBar hints={keyboardHints} className="text-xs" />}
      />

      {/* ── DIALOGS ──────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteDraftDialog}
        onOpenChange={setShowDeleteDraftDialog}
        title="Delete draft?"
        description="This draft will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          draft.deleteDraft();
          setShowDeleteDraftDialog(false);
        }}
      />

      <ConfirmDialog
        open={showSwitchClientDialog}
        onOpenChange={open => {
          setShowSwitchClientDialog(open);
          if (!open) {
            setPendingClientId(null);
          }
        }}
        title="Discard current catalogue changes?"
        description="Switching clients will clear the current unsaved catalogue."
        confirmLabel="Switch client"
        onConfirm={() => {
          performClientChange(pendingClientId);
          setPendingClientId(null);
          setShowSwitchClientDialog(false);
        }}
      />

      {selectedClientId && (
        <SaveViewDialog
          open={showSaveViewDialog}
          onOpenChange={setShowSaveViewDialog}
          clientId={selectedClientId}
          clientName={selectedClientName}
          filters={filters}
          sort={sort}
          columnVisibility={columnVisibility}
          onSaved={viewId => setCurrentViewId(viewId)}
        />
      )}

      <DraftDialog
        open={showDraftDialog}
        onOpenChange={setShowDraftDialog}
        drafts={draft.drafts}
        isLoading={draft.draftsLoading}
        onLoadDraft={async draftId => {
          const items = await draft.loadDraft(draftId);
          setSelectedItems(items);
          setShowDraftDialog(false);
        }}
        onDeleteDraft={_draftId => {
          draft.deleteDraftById(_draftId);
        }}
        isDeleting={draft.isDeleting}
      />

      <SavedSheetsDialog
        open={showSavedSheetsDialog}
        onOpenChange={setShowSavedSheetsDialog}
        savedSheets={(savedSheetsQuery.data ?? []).map(
          (s: {
            id: number;
            clientId: number;
            itemCount: number;
            totalValue: string;
            createdAt: Date | null;
          }) => ({
            id: s.id,
            clientId: s.clientId,
            itemCount: s.itemCount,
            totalValue: s.totalValue,
            createdAt: s.createdAt,
          })
        )}
        isLoading={savedSheetsQuery.isLoading}
        onLoadSavedSheet={async sheetId => {
          const result = await utils.salesSheets.getById.fetch({ sheetId });
          if (result) {
            const sanitizedItems = sanitizeLoadedSheetItems(result.items);
            if (sanitizedItems.length === 0) {
              toast.error("Saved sheet could not be loaded");
              return;
            }
            if (Array.isArray(result.items) && sanitizedItems.length < result.items.length) {
              toast.info("Some invalid saved sheet items were skipped");
            }
            setSelectedItems(sanitizedItems);
            draft.resetDraft();
            draft.markSheetAsLoaded(sheetId);
            setShowSavedSheetsDialog(false);
            toast.success("Saved sheet loaded");
          }
        }}
      />
    </div>
  );
}

export default SalesCatalogueSurface;
