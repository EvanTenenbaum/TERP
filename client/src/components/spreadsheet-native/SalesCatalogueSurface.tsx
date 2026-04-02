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
import type { CellClickedEvent, ColDef } from "ag-grid-community";
import {
  ArrowRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  MoreHorizontal,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { UnifiedExportMenu } from "@/components/common/UnifiedExportMenu";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { buildRelationshipProfilePath } from "@/lib/relationshipProfile";
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
  selectedForAdd: boolean;
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
  markup: number;
  retailPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl?: string;
  _raw: PricedInventoryItem;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

export const escapeCsvField = (value: string) =>
  value.replace(/\r\n|\n|\r/g, " ").replace(/"/g, '""');

const roundToCents = (value: number) => Math.round(value * 100) / 100;
const roundToTenth = (value: number) => Math.round(value * 10) / 10;

const calculateRetailFromMarkup = (basePrice: number, markup: number) =>
  basePrice > 0 ? roundToCents(basePrice * (1 + markup / 100)) : 0;

const calculateMarkupFromRetail = (basePrice: number, retailPrice: number) =>
  basePrice > 0
    ? roundToTenth(((retailPrice - basePrice) / basePrice) * 100)
    : 0;

export function applyCatalogueLineMarkup(
  item: PricedInventoryItem,
  markup: number
): PricedInventoryItem {
  const nextMarkup = roundToTenth(markup);

  if (item.basePrice <= 0) {
    return {
      ...item,
      priceMarkup: nextMarkup,
    };
  }

  return {
    ...item,
    priceMarkup: nextMarkup,
    retailPrice: calculateRetailFromMarkup(item.basePrice, nextMarkup),
  };
}

export function applyCatalogueLineRetail(
  item: PricedInventoryItem,
  retailPrice: number
): PricedInventoryItem {
  const nextRetail = roundToCents(retailPrice);

  if (item.basePrice <= 0) {
    return {
      ...item,
      retailPrice: nextRetail,
    };
  }

  return {
    ...item,
    retailPrice: nextRetail,
    priceMarkup: calculateMarkupFromRetail(item.basePrice, nextRetail),
  };
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function sanitizePrintableImageUrl(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const parsed =
      typeof window !== "undefined"
        ? new URL(trimmed, window.location.origin)
        : new URL(trimmed);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildCatalogueCsv(items: PricedInventoryItem[]) {
  return [
    "Product,Category,Qty,Retail Price",
    ...items.map(
      i =>
        `"${escapeCsvField(i.name)}","${escapeCsvField(i.category ?? "")}",${i.quantity},${i.retailPrice}`
    ),
  ].join("\n");
}

export function buildCatalogueJson(items: PricedInventoryItem[]) {
  return JSON.stringify(
    items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category ?? null,
      quantity: item.quantity,
      retailPrice: item.retailPrice,
      markup: item.priceMarkup,
      vendor: item.vendor ?? null,
      imageUrl: item.imageUrl ?? null,
    })),
    null,
    2
  );
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildPrintableCatalogueHtml({
  title,
  clientName,
  items,
  includeImages,
  totalValue,
}: {
  title: string;
  clientName?: string;
  items: PricedInventoryItem[];
  includeImages: boolean;
  totalValue: number;
}) {
  const itemMarkup = items
    .map(item => {
      const printableImageUrl = sanitizePrintableImageUrl(item.imageUrl);

      return `
        <article class="catalogue-row">
          ${
            includeImages
              ? `<div class="catalogue-image">${
                  printableImageUrl
                    ? `<img src="${escapeHtml(printableImageUrl)}" alt="${escapeHtml(item.name)}" />`
                    : `<div class="catalogue-image-fallback">No image</div>`
                }</div>`
              : ""
          }
          <div class="catalogue-copy">
            <div class="catalogue-head">
              <h3>${escapeHtml(item.name)}</h3>
              <span>${formatCurrency(item.retailPrice)}</span>
            </div>
            <p>${escapeHtml(item.category ?? "Uncategorized")}</p>
            <div class="catalogue-meta">
              <span>Qty ${item.quantity}</span>
              <span>${item.priceMarkup >= 0 ? "+" : ""}${item.priceMarkup.toFixed(1)}% markup</span>
              ${item.vendor ? `<span>${escapeHtml(item.vendor)}</span>` : ""}
            </div>
          </div>
        </article>
      `
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: "Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif; margin: 24px; color: #181d1f; }
          .catalogue-shell { display: flex; flex-direction: column; gap: 20px; }
          .catalogue-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid rgba(24, 29, 31, 0.12); padding-bottom: 16px; }
          .catalogue-header h1 { margin: 0 0 6px; font-size: 28px; line-height: 1.1; }
          .catalogue-header p { margin: 0; color: rgba(24, 29, 31, 0.7); }
          .catalogue-total { font-size: 28px; font-weight: 700; text-align: right; }
          .catalogue-list { display: flex; flex-direction: column; gap: 12px; }
          .catalogue-row { display: grid; grid-template-columns: ${includeImages ? "96px 1fr" : "1fr"}; gap: 16px; border: 1px solid rgba(24, 29, 31, 0.12); border-radius: 16px; padding: 14px; page-break-inside: avoid; }
          .catalogue-image { width: 96px; height: 96px; border-radius: 12px; overflow: hidden; background: rgba(24, 29, 31, 0.05); border: 1px solid rgba(24, 29, 31, 0.08); display: flex; align-items: center; justify-content: center; }
          .catalogue-image img { width: 100%; height: 100%; object-fit: cover; }
          .catalogue-image-fallback { font-size: 11px; color: rgba(24, 29, 31, 0.55); }
          .catalogue-copy { display: flex; flex-direction: column; gap: 8px; }
          .catalogue-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
          .catalogue-head h3 { margin: 0; font-size: 18px; }
          .catalogue-head span { font-size: 18px; font-weight: 700; }
          .catalogue-copy p { margin: 0; color: rgba(24, 29, 31, 0.7); }
          .catalogue-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: rgba(24, 29, 31, 0.72); text-transform: uppercase; letter-spacing: 0.04em; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="catalogue-shell">
          <header class="catalogue-header">
            <div>
              <h1>${escapeHtml(title)}</h1>
              <p>${escapeHtml(clientName ?? "No client selected")}</p>
            </div>
            <div class="catalogue-total">${formatCurrency(totalValue)}</div>
          </header>
          <section class="catalogue-list">${itemMarkup}</section>
        </div>
        <script>
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>
  `;
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
  selectedIds: Set<number>,
  checkedIds: Set<number>
): InventoryBrowserRow[] {
  return items.map(item => ({
    identity: { rowKey: `inventory:${item.id}` },
    inventoryId: item.id,
    selectedForAdd: checkedIds.has(item.id),
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
    markup: item.priceMarkup,
    retailPrice: item.retailPrice,
    quantity: item.quantity,
    lineTotal: item.retailPrice * item.quantity,
    imageUrl: item.imageUrl,
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
        strainId: typeof raw.strainId === "number" ? raw.strainId : undefined,
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
        imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
        vendorId: typeof raw.vendorId === "number" ? raw.vendorId : undefined,
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

function isNonSellableInventoryStatus(status: string | null | undefined) {
  return NON_SELLABLE_STATUSES.includes(
    (status ?? "LIVE") as (typeof NON_SELLABLE_STATUSES)[number]
  );
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
  const [checkedInventoryIds, setCheckedInventoryIds] = useState<Set<number>>(
    new Set()
  );
  const [includeImagesInPreview, setIncludeImagesInPreview] = useState(true);
  const [selectedLineMarkupInput, setSelectedLineMarkupInput] = useState("");
  const [selectedLineRetailInput, setSelectedLineRetailInput] = useState("");

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
  const saveCatalogueSheet = draft.saveSheet;
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

      return (
        String(aValue).localeCompare(String(bValue), undefined, {
          sensitivity: "base",
          numeric: true,
        }) * direction
      );
    });

    return mapInventoryToRows(
      sortedItems,
      selectedItemIds,
      checkedInventoryIds
    );
  }, [
    inventoryQuery.data,
    selectedItemIds,
    checkedInventoryIds,
    filters,
    sort,
  ]);

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

  const selectedClientName = useMemo(() => {
    if (!selectedClientId) return undefined;
    return clientList.find(c => c.id === selectedClientId)?.name;
  }, [selectedClientId, clientList]);

  const selectableInventoryRows = useMemo(
    () => inventoryRows.filter(row => !row.inSheet),
    [inventoryRows]
  );

  const checkedVisibleRows = useMemo(
    () =>
      selectableInventoryRows.filter(row =>
        checkedInventoryIds.has(row.inventoryId)
      ),
    [checkedInventoryIds, selectableInventoryRows]
  );

  const selectedPreviewItem = useMemo(() => {
    if (!selectedPreviewRowId) return null;
    return (
      selectedItems.find(
        item => `preview:${item.id}` === selectedPreviewRowId
      ) ?? null
    );
  }, [selectedItems, selectedPreviewRowId]);

  // ── column defs ────────────────────────────────────────────────────────
  const inventoryColumnDefs = useMemo<ColDef<InventoryBrowserRow>[]>(() => {
    const cols: ColDef<InventoryBrowserRow>[] = [
      {
        field: "inSheet",
        headerName: "Add",
        minWidth: 74,
        maxWidth: 74,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: { data?: InventoryBrowserRow }) =>
          params.data?.inSheet ? "Added" : "+ Add",
        cellStyle: (params: { data?: InventoryBrowserRow }) => ({
          color: params.data?.inSheet
            ? "var(--color-emerald-700)"
            : "var(--color-primary)",
          fontWeight: 600,
          textAlign: "center",
          cursor: params.data?.inSheet ? "default" : "pointer",
        }),
        headerTooltip: "Quick-add this row to the catalogue",
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "selectedForAdd",
        headerName: "",
        minWidth: 44,
        maxWidth: 44,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: {
          value: boolean;
          data?: InventoryBrowserRow;
        }) =>
          params.data?.inSheet ? "\u2713" : params.value ? "\u2611" : "\u2610",
        cellStyle: (params: { data?: InventoryBrowserRow }) => ({
          color: params.data?.inSheet
            ? "var(--color-emerald-700)"
            : "var(--color-foreground)",
          fontWeight: 700,
          textAlign: "center",
          cursor: params.data?.inSheet ? "default" : "pointer",
        }),
        headerTooltip: "Queue this row for bulk add",
        cellClass: "powersheet-cell--locked",
      },
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

  useEffect(() => {
    if (!selectedPreviewItem) {
      setSelectedLineMarkupInput("");
      setSelectedLineRetailInput("");
      return;
    }

    setSelectedLineMarkupInput(selectedPreviewItem.priceMarkup.toFixed(1));
    setSelectedLineRetailInput(selectedPreviewItem.retailPrice.toFixed(2));
  }, [selectedPreviewItem]);

  // ── handlers ───────────────────────────────────────────────────────────
  const performClientChange = useCallback(
    (clientId: number | null) => {
      setSelectedClientId(clientId);
      setSelectedItems([]);
      setSelectedInventoryRowId(null);
      setSelectedPreviewRowId(null);
      setCheckedInventoryIds(new Set());
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

  const appendItemsToCatalogue = useCallback(
    (itemsToAdd: PricedInventoryItem[]) => {
      if (itemsToAdd.length === 0) return;

      setSelectedItems(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const nextItems = [...prev];

        itemsToAdd.forEach(item => {
          if (!existingIds.has(item.id)) {
            nextItems.push(item);
            existingIds.add(item.id);
          }
        });

        return nextItems;
      });
    },
    []
  );

  const getSellableItemsForCatalogue = useCallback(
    (itemsToAdd: PricedInventoryItem[]) => {
      const sellableItems = itemsToAdd.filter(
        item => !isNonSellableInventoryStatus(item.status)
      );

      if (sellableItems.length !== itemsToAdd.length) {
        toast.warning("Only sellable inventory can be added to the catalogue");
      }

      return sellableItems;
    },
    []
  );

  const handleAddSelectedItem = useCallback(() => {
    if (!selectedInventoryRowId) return;
    const row = inventoryRows.find(
      r => r.identity.rowKey === selectedInventoryRowId
    );
    if (!row || selectedItemIds.has(row.inventoryId)) return;
    const sellableItems = getSellableItemsForCatalogue([row._raw]);
    if (sellableItems.length === 0) return;
    appendItemsToCatalogue(sellableItems);
    setCheckedInventoryIds(prev => {
      const next = new Set(prev);
      next.delete(row.inventoryId);
      return next;
    });
  }, [
    appendItemsToCatalogue,
    getSellableItemsForCatalogue,
    selectedInventoryRowId,
    inventoryRows,
    selectedItemIds,
  ]);

  const handleBulkAddVisible = useCallback(() => {
    const requestedItems = checkedVisibleRows
      .filter(row => !selectedItemIds.has(row.inventoryId))
      .map(row => row._raw);

    if (requestedItems.length === 0) return;

    const itemsToAdd = getSellableItemsForCatalogue(requestedItems);
    if (itemsToAdd.length === 0) return;

    appendItemsToCatalogue(itemsToAdd);
    setCheckedInventoryIds(prev => {
      const next = new Set(prev);
      requestedItems.forEach(item => next.delete(item.id));
      return next;
    });
  }, [
    appendItemsToCatalogue,
    checkedVisibleRows,
    getSellableItemsForCatalogue,
    selectedItemIds,
  ]);

  const handleSelectAllVisible = useCallback(() => {
    setCheckedInventoryIds(
      new Set(selectableInventoryRows.map(row => row.inventoryId))
    );
  }, [selectableInventoryRows]);

  const handleClearVisibleSelection = useCallback(() => {
    setCheckedInventoryIds(prev => {
      const next = new Set(prev);
      selectableInventoryRows.forEach(row => next.delete(row.inventoryId));
      return next;
    });
  }, [selectableInventoryRows]);

  const handleInventoryCellClicked = useCallback(
    (event: CellClickedEvent<InventoryBrowserRow>) => {
      const row = event.data;
      if (!row) return;

      if (event.colDef.field === "inSheet") {
        if (row.inSheet) return;
        const sellableItems = getSellableItemsForCatalogue([row._raw]);
        if (sellableItems.length === 0) return;
        appendItemsToCatalogue(sellableItems);
        return;
      }

      if (event.colDef.field === "selectedForAdd") {
        if (row.inSheet) return;
        setCheckedInventoryIds(prev => {
          const next = new Set(prev);
          if (next.has(row.inventoryId)) {
            next.delete(row.inventoryId);
          } else {
            next.add(row.inventoryId);
          }
          return next;
        });
      }
    },
    [appendItemsToCatalogue, getSellableItemsForCatalogue]
  );

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
    setCheckedInventoryIds(new Set());
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
    downloadBlob(csv, "text/csv", `${draftFileName || "catalogue"}.csv`);
    toast.success("CSV exported");
  }, [draftFileName, selectedItems]);

  const handleExportJson = useCallback(() => {
    if (selectedItems.length === 0) return;
    downloadBlob(
      buildCatalogueJson(selectedItems),
      "application/json",
      `${draftFileName || "catalogue"}.json`
    );
    toast.success("JSON exported");
  }, [draftFileName, selectedItems]);

  const handlePrintCatalogue = useCallback(() => {
    if (selectedItems.length === 0) return false;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Allow pop-ups to print the catalogue");
      return false;
    }

    try {
      printWindow.document.write(
        buildPrintableCatalogueHtml({
          title: draftFileName || "Sales Catalogue",
          clientName: selectedClientName,
          items: selectedItems,
          includeImages: includeImagesInPreview,
          totalValue: totalSheetValue,
        })
      );
      printWindow.document.close();
      return true;
    } catch {
      toast.error("Failed to prepare the printable catalogue");
      return false;
    }
  }, [
    draftFileName,
    includeImagesInPreview,
    selectedClientName,
    selectedItems,
    totalSheetValue,
  ]);

  const handleExportPdf = useCallback(() => {
    if (!handlePrintCatalogue()) return;
    toast.success("Print dialog opened. Use Save as PDF to export.");
  }, [handlePrintCatalogue]);

  const handleManageClientPricing = useCallback(() => {
    if (!selectedClientId) return;
    setLocation(
      buildRelationshipProfilePath(selectedClientId, "sales-pricing")
    );
  }, [selectedClientId, setLocation]);

  const handleReloadClientPricing = useCallback(() => {
    const defaultItems = inventoryQuery.data ?? [];
    if (defaultItems.length === 0) return;

    const defaultById = new Map(defaultItems.map(item => [item.id, item]));
    setSelectedItems(prev =>
      prev.map(item => defaultById.get(item.id) ?? item)
    );
    toast.success("Reloaded the client's current pricing");
  }, [inventoryQuery.data]);

  const handleApplySelectedLineMarkup = useCallback(
    (value: string) => {
      if (!selectedPreviewItem) return;
      const nextMarkup = Number(value);
      if (!Number.isFinite(nextMarkup)) return;

      setSelectedItems(prev =>
        prev.map(item =>
          item.id === selectedPreviewItem.id
            ? applyCatalogueLineMarkup(item, nextMarkup)
            : item
        )
      );
    },
    [selectedPreviewItem]
  );

  const handleApplySelectedLineRetail = useCallback(
    (value: string) => {
      if (!selectedPreviewItem) return;
      const nextRetail = Number(value);
      if (!Number.isFinite(nextRetail)) return;

      setSelectedItems(prev =>
        prev.map(item =>
          item.id === selectedPreviewItem.id
            ? applyCatalogueLineRetail(item, nextRetail)
            : item
        )
      );
    },
    [selectedPreviewItem]
  );

  const handleResetSelectedLinePricing = useCallback(() => {
    if (!selectedPreviewItem) return;
    const sourceItem = inventoryQuery.data?.find(
      item => item.id === selectedPreviewItem.id
    );
    if (!sourceItem) return;

    setSelectedItems(prev =>
      prev.map(item => (item.id === sourceItem.id ? sourceItem : item))
    );
    toast.success("Line pricing reset to the client's default");
  }, [inventoryQuery.data, selectedPreviewItem]);

  const handleOpenSharePreview = useCallback(async () => {
    if (!draft.lastSavedSheetId || draft.hasUnsavedChanges) {
      toast.error("Save the catalogue before opening the shared view");
      return;
    }

    const shareWindow = window.open("", "_blank");
    if (!shareWindow) {
      toast.error("Allow pop-ups to open the shared view");
      return;
    }

    try {
      shareWindow.opener = null;
    } catch {
      // Ignore browsers that disallow setting opener on the returned handle.
    }

    try {
      const shareUrl = draft.lastShareUrl ?? (await draft.generateShareLink());
      if (!shareUrl) {
        shareWindow.close();
        toast.error("Could not open the shared view");
        return;
      }

      shareWindow.location.href = shareUrl;
    } catch {
      shareWindow.close();
      toast.error("Could not open the shared view");
    }
  }, [draft]);

  const navigateToOrder = useCallback(
    async (fromSalesSheet: boolean, mode?: "quote") => {
      if (!draft.canConvert || draft.isConverting) return;
      if (!draft.lastSavedSheetId) {
        toast.error(
          "Save the catalogue before converting it into an order or quote"
        );
        return;
      }
      const converted = await convertCatalogueToOrder(async () => {
        setLocation(
          buildSalesWorkspacePath("create-order", {
            fromSalesSheet,
            mode,
          })
        );
      });
      if (!converted) return;
      resetCatalogueDraft();
      setSelectedItems([]);
      setSelectedInventoryRowId(null);
      setSelectedPreviewRowId(null);
      setCheckedInventoryIds(new Set());
    },
    [
      convertCatalogueToOrder,
      draft.canConvert,
      draft.isConverting,
      draft.lastSavedSheetId,
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

  // ── active filter count badge ─────────────────────────────────────────
  const activeFilterCount =
    filters.categories.length +
    filters.grades.length +
    filters.strainFamilies.length +
    filters.vendors.length;
  const canHandoffToOrder =
    draft.canConvert && draft.lastSavedSheetId !== null;
  const needsSavedSheetForHandoff =
    selectedItems.length > 0 &&
    (draft.hasUnsavedChanges || draft.lastSavedSheetId === null);
  const draftNameMissingForSave =
    selectedClientId !== null &&
    selectedItems.length > 0 &&
    draft.hasUnsavedChanges &&
    draft.draftName.trim().length === 0;

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border/70 bg-background/95 shadow-sm">
        <div className="flex flex-wrap items-start gap-2.5 border-b border-border/60 px-3 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              onClick={() => setLocation(buildSalesWorkspacePath("orders"))}
            >
              &larr; Orders
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                >
                  Sales Catalogue
                </Badge>
                {draft.hasUnsavedChanges ? (
                  <Badge
                    variant="outline"
                    className="h-5 border-amber-300 bg-amber-50 text-[10px] text-amber-700"
                  >
                    Unsaved
                  </Badge>
                ) : null}
                {draft.lastSaveTime && !draft.hasUnsavedChanges ? (
                  <Badge
                    variant="outline"
                    className="h-5 border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700"
                  >
                    Saved
                  </Badge>
                ) : null}
                {draftNameMissingForSave ? (
                  <Badge
                    variant="outline"
                    className="h-5 border-amber-300 bg-amber-50 text-[10px] text-amber-700"
                  >
                    Draft name required to save
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Build a client-ready sheet from live inventory, customer
                pricing, and quick exports.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[12rem] flex-1 sm:flex-none sm:w-48">
              <ClientCombobox
                value={selectedClientId}
                onValueChange={handleClientChange}
                clients={clientList}
                isLoading={clientsQuery.isLoading}
                placeholder="Client..."
                emptyText="No clients"
                selectedLabel={selectedClientName}
              />
            </div>
            <Input
              value={draft.draftName}
              onChange={e => draft.setDraftName(e.target.value)}
              placeholder="Draft name..."
              className="h-8 min-w-[11rem] flex-1 text-xs sm:max-w-44"
              aria-invalid={draftNameMissingForSave}
              disabled={!selectedClientId}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              disabled={!selectedClientId || draft.isSaving}
              onClick={draft.saveDraft}
            >
              <Save className="mr-1 h-3.5 w-3.5" />
              {draft.isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs"
              disabled={!selectedClientId}
              onClick={handleRefresh}
              aria-label="Refresh inventory"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-90" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5"
                  disabled={!selectedClientId}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowDraftDialog(true)}>
                  Load Draft
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowSavedSheetsDialog(true)}
                >
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

        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Input
              value={filters.search}
              onChange={e =>
                setFilters(prev => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search product, vendor, category..."
              className="h-8 w-full text-xs sm:max-w-xs"
              disabled={!selectedClientId}
            />
            {selectedClientId ? (
              <>
                <QuickViewSelector
                  clientId={selectedClientId}
                  onLoadView={handleLoadView}
                  currentViewId={currentViewId}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-[11px]"
                  onClick={() => setShowSaveViewDialog(true)}
                >
                  Save View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-[11px]"
                  onClick={() => setShowAdvancedFilters(prev => !prev)}
                >
                  Filters
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Choose a client to unlock views, filters, and pricing actions.
              </span>
            )}
          </div>

          <span className="text-[11px] text-muted-foreground">
            {checkedVisibleRows.length} checked · {inventoryRows.length} visible
            ·{" "}
            {selectedItems.length > 0
              ? `${selectedItems.length} items · ${formatCurrency(totalSheetValue)}`
              : "No catalogue items"}
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              className="h-8 px-2.5 text-[11px]"
              disabled={!selectedInventoryRowStillVisible || !selectedClientId}
              onClick={handleAddSelectedItem}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Row
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-[11px]"
              disabled={checkedVisibleRows.length === 0}
              onClick={handleBulkAddVisible}
            >
              Bulk Add
              {checkedVisibleRows.length > 0
                ? ` (${checkedVisibleRows.length})`
                : ""}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-[11px]"
              disabled={selectableInventoryRows.length === 0}
              onClick={handleSelectAllVisible}
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-[11px]"
              disabled={checkedVisibleRows.length === 0}
              onClick={handleClearVisibleSelection}
            >
              Clear Checks
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-[11px]"
              disabled={!selectedClientId}
              onClick={handleManageClientPricing}
            >
              <Settings2 className="mr-1 h-3.5 w-3.5" />
              Customer Pricing
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-[11px]"
              disabled={selectedItems.length === 0}
              onClick={handleReloadClientPricing}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reload Pricing
            </Button>
          </div>
        </div>
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
        <div className="grid gap-1 lg:grid-cols-4 px-1">
          {/* Left: Inventory Browser (3/4) */}
          <div className="lg:col-span-3 flex flex-col gap-1">
            <PowersheetGrid
              surfaceId="catalogue-inventory-browser"
              requirementIds={["CAT-001", "CAT-002"]}
              title="Inventory"
              rows={inventoryRows}
              columnDefs={inventoryColumnDefs}
              getRowId={row => row.identity.rowKey}
              selectedRowId={selectedInventoryRowId}
              onSelectedRowChange={row =>
                setSelectedInventoryRowId(row?.identity.rowKey ?? null)
              }
              onCellClicked={handleInventoryCellClicked}
              selectionMode="cell-range"
              enableFillHandle={false}
              enableUndoRedo={false}
              isLoading={inventoryQuery.isLoading}
              errorMessage={inventoryQuery.error?.message ?? null}
              emptyTitle="No inventory"
              emptyDescription="This client has no priced inventory items."
              summary={
                <span>
                  Client-priced inventory
                  {selectedClientName ? ` · ${selectedClientName}` : ""}
                </span>
              }
              minHeight={360}
              headerClassName="px-4 pb-1 pt-3"
              contentClassName="px-4 pb-4 pt-0"
            />
          </div>

          {/* Right: Preview (1/4) */}
          <div className="lg:col-span-1 flex flex-col gap-1">
            <PowersheetGrid
              surfaceId="catalogue-preview"
              requirementIds={["CAT-003"]}
              title="Preview"
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
              emptyDescription="Select items from inventory and add them here."
              headerActions={
                selectedItems.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px]"
                      disabled={!selectedPreviewRowId}
                      onClick={handleRemoveSelectedItem}
                    >
                      Remove
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px]"
                      onClick={handleClearAll}
                    >
                      Clear
                    </Button>
                  </div>
                ) : null
              }
              summary={
                selectedItems.length > 0 ? (
                  <span>
                    {totalItemCount} units · {formatCurrency(totalSheetValue)}
                  </span>
                ) : undefined
              }
              minHeight={240}
              headerClassName="px-4 pb-1 pt-3"
              contentClassName="px-4 pb-4 pt-0"
            />

            <div className="rounded-md border border-border/70 bg-card/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Output
                  </p>
                  <p className="text-sm font-medium">
                    {selectedItems.length > 0
                      ? `${selectedItems.length} lines · ${formatCurrency(totalSheetValue)}`
                      : "No rows selected"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Include images</span>
                  <Switch
                    checked={includeImagesInPreview}
                    onCheckedChange={setIncludeImagesInPreview}
                    aria-label="Include images in preview and export"
                  />
                </div>
              </div>

              {includeImagesInPreview &&
              selectedItems.some(item => item.imageUrl) ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {selectedItems.map(item => (
                    <div
                      key={item.id}
                      className="flex min-w-[88px] flex-col gap-1 rounded-md border border-border/70 bg-background/80 p-1.5"
                    >
                      <div className="h-16 w-full overflow-hidden rounded bg-muted/40">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <p className="line-clamp-2 text-[10px] font-medium leading-4">
                        {item.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  size="sm"
                  className="h-8 text-[11px]"
                  disabled={
                    !selectedClientId ||
                    selectedItems.length === 0 ||
                    draft.isFinalizing
                  }
                  onClick={() => void saveCatalogueSheet()}
                >
                  <Save className="mr-1 h-3.5 w-3.5" />
                  {draft.isFinalizing ? "Saving..." : "Save Sheet"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px]"
                  disabled={!draft.canShare}
                  onClick={() => void draft.generateShareLink()}
                >
                  <Link2 className="mr-1 h-3.5 w-3.5" />
                  Share Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px]"
                  disabled={!draft.canShare}
                  onClick={() => void handleOpenSharePreview()}
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Open Shared View
                </Button>
                <UnifiedExportMenu
                  className="h-8 text-[11px]"
                  size="sm"
                  label="Export"
                  disabled={selectedItems.length === 0}
                  onExportCSV={handleExport}
                  onExportJSON={handleExportJson}
                  onExportPDF={handleExportPdf}
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px]"
                  disabled={selectedItems.length === 0}
                  onClick={handlePrintCatalogue}
                >
                  <Printer className="mr-1 h-3.5 w-3.5" />
                  Print
                </Button>
                {draft.lastShareUrl ? (
                  <span className="text-[10px] text-muted-foreground">
                    Shared link ready
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-[10px] text-muted-foreground">
                Shared view, PDF export, and print open a new browser tab or
                window.
              </p>

              <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Next Step
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Turn this catalogue into a quote, an order, or a live
                      selling session.
                    </p>
                  </div>
                  {needsSavedSheetForHandoff ? (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-[10px] text-amber-700"
                    >
                      Save sheet before handoff
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    disabled={!canHandoffToOrder || draft.isConverting}
                    onClick={() => void navigateToOrder(true)}
                  >
                    &rarr; Sales Order
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    disabled={!canHandoffToOrder || draft.isConverting}
                    onClick={() => void navigateToOrder(true, "quote")}
                  >
                    &rarr; Quote
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] sm:col-span-2"
                    disabled={!draft.canGoLive || liveSessionMutation.isPending}
                    onClick={() => {
                      if (!draft.canGoLive) return;
                      if (!draft.lastSavedSheetId) {
                        toast.error("Save the catalogue before going live");
                        return;
                      }
                      liveSessionMutation.mutate({
                        sheetId: draft.lastSavedSheetId,
                      });
                    }}
                  >
                    Live
                  </Button>
                </div>
              </div>

              <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Line Pricing
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPreviewItem
                        ? selectedPreviewItem.name
                        : "Select a preview row to adjust pricing line by line."}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px]"
                    disabled={!selectedPreviewItem}
                    onClick={handleResetSelectedLinePricing}
                  >
                    Reset Line
                  </Button>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input
                    value={selectedLineMarkupInput}
                    onChange={e => setSelectedLineMarkupInput(e.target.value)}
                    onBlur={() =>
                      handleApplySelectedLineMarkup(selectedLineMarkupInput)
                    }
                    disabled={!selectedPreviewItem}
                    placeholder="Markup %"
                    className="h-8 text-xs"
                    aria-label="Line markup percent"
                  />
                  <Input
                    value={selectedLineRetailInput}
                    onChange={e => setSelectedLineRetailInput(e.target.value)}
                    onBlur={() =>
                      handleApplySelectedLineRetail(selectedLineRetailInput)
                    }
                    disabled={!selectedPreviewItem}
                    placeholder="Retail price"
                    className="h-8 text-xs"
                    aria-label="Line retail price"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 px-1 py-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 text-center text-muted-foreground">
            <FileText className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">
              Select a client to start building a catalogue
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-card/80 p-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Next Step
              </p>
              <p className="text-xs text-muted-foreground">
                Load or finish a catalogue, then turn it into an order, a quote,
                or a live selling session.
              </p>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled={!canHandoffToOrder || draft.isConverting}
                onClick={() => void navigateToOrder(true)}
              >
                &rarr; Sales Order
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled={!canHandoffToOrder || draft.isConverting}
                onClick={() => void navigateToOrder(true, "quote")}
              >
                &rarr; Quote
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] sm:col-span-2"
                disabled={!draft.canGoLive || liveSessionMutation.isPending}
                onClick={() => {
                  if (!draft.canGoLive) return;
                  if (!draft.lastSavedSheetId) {
                    toast.error("Save the catalogue before going live");
                    return;
                  }
                  liveSessionMutation.mutate({
                    sheetId: draft.lastSavedSheetId,
                  });
                }}
              >
                Live
              </Button>
            </div>
          </div>
        </div>
      )}

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
            if (
              Array.isArray(result.items) &&
              sanitizedItems.length < result.items.length
            ) {
              toast.info("Some invalid saved sheet items were skipped");
            }
            setSelectedItems(sanitizedItems);
            draft.resetDraft();
            draft.markSheetAsLoaded(sheetId, sanitizedItems);
            setShowSavedSheetsDialog(false);
            toast.success("Saved sheet loaded");
          }
        }}
      />
    </div>
  );
}

export default SalesCatalogueSurface;
