/**
 * ProductBrowserGrid
 *
 * Multi-source product browser with 4 tabs for the PO creation split surface.
 * Used to find and add products to a Purchase Order document.
 *
 * Tabs:
 *   0. Quick Add       — blank-row form for products not yet in the system (default)
 *   1. Supplier History — recent products ordered from this supplier
 *   2. Low Stock       — inventory items below reorder threshold
 *   3. Catalog         — full product catalog search
 *
 * TER-1261: Clicking a row in Supplier History / Low Stock / Catalog tabs
 * adds the product immediately (no second click). The Quick Add tab accepts
 * a blank-row form for products not yet in the system.
 */

import { useCallback, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InlineRowAddControls from "./InlineRowAddControls";
import { PowersheetGrid } from "./PowersheetGrid";
import { getStockStatusLabel } from "@/components/inventory/StockStatusBadge";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveTab = "quick-add" | "supplier-history" | "low-stock" | "catalog";

type QuickAddUnit = "g" | "lb" | "unit";

export interface AddProductPayload {
  productId: number | null;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  quantityOrdered?: number;
  cogsMode: "FIXED" | "RANGE";
  unitCost: string | null;
  unitCostMin: string | null;
  unitCostMax: string | null;
  /** TER-1261: optional SKU supplied via the Quick Add tab. */
  sku?: string | null;
  /** TER-1261: optional unit-of-measure supplied via the Quick Add tab. */
  unit?: string | null;
}

export interface ProductBrowserGridProps {
  supplierId: number | null;
  addedProductIds: Set<number>;
  onAddProduct: (product: AddProductPayload) => void;
}

interface BrowserRow {
  identity: { rowKey: string };
  productId: number | null;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  cogsMode: "FIXED" | "RANGE";
  unitCost: string | null;
  unitCostMin: string | null;
  unitCostMax: string | null;
  // Tab-specific display fields
  col3: string; // "Last Cost" | "Stock" | "Subcategory"
  col4: string; // "Last PO" | "Context" | ""
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const usd = (v: number | string | null | undefined): string => {
  const n = Number(v);
  if (v === null || v === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
};

const formatDate = (d: string | Date | null | undefined): string => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const sanitizeQuantityInput = (value: string) => value.replace(/\D/g, "");

const normalizeRequestedQuantity = (value: string | undefined): number => {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductBrowserGrid({
  supplierId,
  addedProductIds,
  onAddProduct,
}: ProductBrowserGridProps) {
  // TER-1261: Quick Add is the default / leftmost tab.
  const [activeTab, setActiveTab] = useState<ActiveTab>("quick-add");
  const [search, setSearch] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<BrowserRow | null>(null);
  const [requestedQuantities, setRequestedQuantities] = useState<
    Record<string, string>
  >({});

  // TER-1261: Quick Add form state — separate from list-tab selection state.
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddSku, setQuickAddSku] = useState("");
  const [quickAddQty, setQuickAddQty] = useState("1");
  const [quickAddPrice, setQuickAddPrice] = useState("");
  const [quickAddUnit, setQuickAddUnit] = useState<QuickAddUnit>("unit");
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLowerCase();

  const resetQuickAddForm = useCallback(() => {
    setQuickAddName("");
    setQuickAddSku("");
    setQuickAddQty("1");
    setQuickAddPrice("");
    setQuickAddUnit("unit");
    setQuickAddError(null);
  }, []);

  const handleQuickAddSubmit = useCallback(() => {
    const trimmedName = quickAddName.trim();
    if (!trimmedName) {
      setQuickAddError("Product name is required");
      return;
    }
    const qty = normalizeRequestedQuantity(quickAddQty);
    const priceRaw = quickAddPrice.trim();
    const priceNum = Number(priceRaw);
    if (!priceRaw || !Number.isFinite(priceNum) || priceNum < 0) {
      setQuickAddError("Unit price must be a non-negative number");
      return;
    }
    const trimmedSku = quickAddSku.trim();
    onAddProduct({
      productId: null,
      productName: trimmedName,
      category: null,
      subcategory: null,
      quantityOrdered: qty,
      cogsMode: "FIXED",
      unitCost: priceNum.toString(),
      unitCostMin: null,
      unitCostMax: null,
      sku: trimmedSku || null,
      unit: quickAddUnit,
    });
    resetQuickAddForm();
  }, [
    onAddProduct,
    quickAddName,
    quickAddPrice,
    quickAddQty,
    quickAddSku,
    quickAddUnit,
    resetQuickAddForm,
  ]);

  // TER-1261: Click-to-add behavior for Supplier History / Low Stock / Catalog.
  const handleAddRow = useCallback(
    (row: BrowserRow) => {
      if (
        row.productId !== null &&
        row.productId !== undefined &&
        addedProductIds.has(row.productId)
      ) {
        return;
      }
      const quantityValue = requestedQuantities[row.identity.rowKey] ?? "1";
      onAddProduct({
        productId: row.productId,
        productName: row.productName,
        category: row.category,
        subcategory: row.subcategory,
        quantityOrdered: normalizeRequestedQuantity(quantityValue),
        cogsMode: row.cogsMode,
        unitCost: row.unitCost,
        unitCostMin: row.unitCostMin,
        unitCostMax: row.unitCostMax,
      });
    },
    [addedProductIds, onAddProduct, requestedQuantities]
  );

  // ── Queries ──────────────────────────────────────────────────────────────────

  const supplierHistoryQuery =
    trpc.purchaseOrders.getRecentProductsBySupplier.useQuery(
      { supplierClientId: supplierId ?? 0, limit: 12 },
      { enabled: activeTab === "supplier-history" && supplierId !== null }
    );

  const lowStockQuery = trpc.inventory.getEnhanced.useQuery(
    {
      page: 1,
      pageSize: 50,
      stockLevel: "low_stock",
      sortBy: "available",
      sortOrder: "asc",
      search,
    },
    { enabled: activeTab === "low-stock" }
  );

  const catalogQuery = trpc.purchaseOrders.products.useQuery(
    { search, limit: 100 },
    { enabled: activeTab === "catalog" }
  );
  const catalogFallbackQuery = trpc.productCatalogue.list.useQuery(
    { limit: 100, offset: 0, search },
    {
      enabled:
        activeTab === "catalog" &&
        (!catalogQuery.data ||
          catalogQuery.isError ||
          ((catalogQuery.data as { items?: unknown[] } | undefined)?.items
            ?.length ?? 0) === 0),
    }
  );

  // ── Row mapping ───────────────────────────────────────────────────────────────

  const rows = useMemo<BrowserRow[]>(() => {
    if (activeTab === "supplier-history") {
      const items = (supplierHistoryQuery.data ?? []).filter(item => {
        if (!normalizedSearch) return true;
        const haystack = [
          item.productName,
          item.category,
          item.subcategory,
          item.poNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
      return items.map((item, idx) => ({
        identity: { rowKey: `sh-${item.productId ?? idx}` },
        productId: item.productId ?? null,
        productName: item.productName ?? null,
        category: item.category ?? null,
        subcategory: item.subcategory ?? null,
        cogsMode: (item.cogsMode as "FIXED" | "RANGE") ?? "FIXED",
        unitCost:
          item.unitCost !== null && item.unitCost !== undefined
            ? String(item.unitCost)
            : null,
        unitCostMin:
          item.unitCostMin !== null && item.unitCostMin !== undefined
            ? String(item.unitCostMin)
            : null,
        unitCostMax:
          item.unitCostMax !== null && item.unitCostMax !== undefined
            ? String(item.unitCostMax)
            : null,
        col3:
          item.cogsMode === "RANGE"
            ? `${usd(item.unitCostMin)} – ${usd(item.unitCostMax)}`
            : usd(item.unitCost),
        col4: item.poNumber
          ? `${item.poNumber} · ${formatDate(item.orderDate)}`
          : "",
      }));
    }

    if (activeTab === "low-stock") {
      const items = (lowStockQuery.data?.items ?? []) as Array<{
        id: number;
        productName?: string | null;
        category?: string | null;
        subcategory?: string | null;
        availableQty?: number | null;
        stockStatus?: string | null;
        unitCogs?: number | null;
      }>;
      return items.map(item => ({
        identity: { rowKey: `ls-${item.id}` },
        productId: item.id,
        productName: item.productName ?? null,
        category: item.category ?? null,
        subcategory: item.subcategory ?? null,
        cogsMode: "FIXED" as const,
        unitCost:
          item.unitCogs !== null && item.unitCogs !== undefined
            ? String(item.unitCogs)
            : null,
        unitCostMin: null,
        unitCostMax: null,
        col3:
          item.availableQty !== null && item.availableQty !== undefined
            ? String(item.availableQty)
            : "0",
        col4: getStockStatusLabel(item.stockStatus),
      }));
    }

    if (activeTab === "quick-add") {
      return [];
    }

    // catalog tab — returns UnifiedPaginatedResponse with .items array
    const rawData = catalogQuery.data;
    const fallbackData = catalogFallbackQuery.data;
    type CatalogItem = {
      id: number;
      productName?: string | null;
      nameCanonical?: string | null;
      category?: string | null;
      subcategory?: string | null;
      unitCost?: number | null;
    };
    const primaryItems: CatalogItem[] = Array.isArray(rawData)
      ? (rawData as CatalogItem[])
      : ((rawData?.items as CatalogItem[] | undefined) ?? []);
    const fallbackItems: CatalogItem[] = Array.isArray(fallbackData)
      ? (fallbackData as CatalogItem[])
      : ((fallbackData?.items as CatalogItem[] | undefined) ?? []);
    const items =
      primaryItems.length > 0 || !fallbackItems.length
        ? primaryItems
        : fallbackItems;

    return items.map((item, idx) => ({
      identity: { rowKey: `cat-${item.id ?? idx}` },
      productId: item.id ?? null,
      productName: item.productName ?? item.nameCanonical ?? null,
      category: item.category ?? null,
      subcategory: item.subcategory ?? null,
      cogsMode: "FIXED" as const,
      unitCost:
        item.unitCost !== null && item.unitCost !== undefined
          ? String(item.unitCost)
          : null,
      unitCostMin: null,
      unitCostMax: null,
      col3: item.subcategory ?? "—",
      col4: "",
    }));
  }, [
    activeTab,
    normalizedSearch,
    supplierHistoryQuery.data,
    lowStockQuery.data,
    catalogQuery.data,
    catalogFallbackQuery.data,
  ]);

  // ── Column defs ───────────────────────────────────────────────────────────────

  const col3Header =
    activeTab === "supplier-history"
      ? "Last Cost"
      : activeTab === "low-stock"
        ? "Stock"
        : "Subcategory";

  const col4Header =
    activeTab === "supplier-history"
      ? "Last PO"
      : activeTab === "low-stock"
        ? "Context"
        : "";

  const columnDefs = useMemo<ColDef<BrowserRow>[]>(() => {
    const cols: ColDef<BrowserRow>[] = [
      {
        headerName: "Add",
        minWidth: 156,
        maxWidth: 156,
        pinned: "left",
        sortable: false,
        filter: false,
        resizable: false,
        suppressNavigable: true,
        cellRenderer: (params: { data?: BrowserRow }) => {
          const row = params.data;
          if (!row) return null;
          const added =
            row.productId !== null &&
            row.productId !== undefined &&
            addedProductIds.has(row.productId);
          const quantityValue = requestedQuantities[row.identity.rowKey] ?? "1";

          return (
            <InlineRowAddControls
              added={added}
              onAdd={() => handleAddRow(row)}
              quantityValue={quantityValue}
              quantityLabel={`Quantity for ${row.productName ?? "product"}`}
              onQuantityChange={value =>
                setRequestedQuantities(current => ({
                  ...current,
                  [row.identity.rowKey]: sanitizeQuantityInput(value),
                }))
              }
              onQuantityBlur={() =>
                setRequestedQuantities(current => ({
                  ...current,
                  [row.identity.rowKey]: String(
                    normalizeRequestedQuantity(
                      current[row.identity.rowKey] ?? quantityValue
                    )
                  ),
                }))
              }
            />
          );
        },
        cellClass: "powersheet-cell--locked",
      },
      {
        headerName: "Product",
        field: "productName",
        flex: 2,
        minWidth: 140,
        cellRenderer: (params: { value?: string }) => {
          if (!params.value) return "-";
          // TER-1051: Show product name prominently
          return (
            <div className="font-medium text-sm leading-tight py-1">
              {params.value}
            </div>
          );
        },
      },
      {
        headerName: "Category",
        field: "category",
        flex: 1,
        minWidth: 100,
      },
      {
        headerName: col3Header,
        field: "col3",
        flex: 1,
        minWidth: 90,
      },
    ];

    if (col4Header) {
      cols.push({
        headerName: col4Header,
        field: "col4",
        flex: 1,
        minWidth: 120,
      });
    }

    return cols;
  }, [addedProductIds, col3Header, col4Header, handleAddRow, requestedQuantities]);

  // ── State derivations ─────────────────────────────────────────────────────────

  const isLoading =
    (activeTab === "supplier-history" && supplierHistoryQuery.isLoading) ||
    (activeTab === "low-stock" && lowStockQuery.isLoading) ||
    (activeTab === "catalog" &&
      (catalogQuery.isLoading || catalogFallbackQuery.isLoading));

  // ── Empty state for no-supplier on supplier-history tab ────────────────────

  const showNoSupplierState =
    activeTab === "supplier-history" && supplierId === null;

  // ── Render ────────────────────────────────────────────────────────────────────

  // TER-1261: Quick Add is first & default to support fast blank-row flows.
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "quick-add", label: "Quick Add" },
    { id: "supplier-history", label: "Supplier History" },
    { id: "low-stock", label: "Low Stock" },
    { id: "catalog", label: "Catalog" },
  ];

  const isQuickAdd = activeTab === "quick-add";

  return (
    <div className="flex flex-col gap-2">
      {/* Top bar: tab toggle + search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? "default" : "outline"}
              className="h-7 px-3 text-xs"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedRowId(null);
                setSelectedRow(null);
                setRequestedQuantities({});
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        {!isQuickAdd && (
          <Input
            className="h-7 text-xs w-48"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        )}
      </div>

      {/* Content area */}
      {isQuickAdd ? (
        <QuickAddForm
          name={quickAddName}
          sku={quickAddSku}
          quantity={quickAddQty}
          price={quickAddPrice}
          unit={quickAddUnit}
          error={quickAddError}
          onNameChange={value => {
            setQuickAddName(value);
            if (quickAddError) setQuickAddError(null);
          }}
          onSkuChange={setQuickAddSku}
          onQuantityChange={value =>
            setQuickAddQty(sanitizeQuantityInput(value) || "")
          }
          onQuantityBlur={() =>
            setQuickAddQty(String(normalizeRequestedQuantity(quickAddQty)))
          }
          onPriceChange={value => {
            setQuickAddPrice(value);
            if (quickAddError) setQuickAddError(null);
          }}
          onUnitChange={setQuickAddUnit}
          onSubmit={handleQuickAddSubmit}
        />
      ) : showNoSupplierState ? (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground border rounded-md bg-muted/30">
          Select a supplier first
        </div>
      ) : (
        <PowersheetGrid<BrowserRow>
          surfaceId="product-browser"
          requirementIds={["PROC-PO-BROWSER-001"]}
          title="Products"
          rows={rows}
          columnDefs={columnDefs}
          getRowId={row => row.identity.rowKey}
          selectedRowId={selectedRowId}
          onSelectedRowChange={row => {
            setSelectedRowId(row ? row.identity.rowKey : null);
            setSelectedRow(row ?? null);
            // TER-1261: Click = add. Selecting a row from a list tab
            // immediately appends the product to the right panel.
            if (row) {
              handleAddRow(row);
            }
          }}
          headerActions={
            selectedRow ? (
              selectedRow.productId !== null &&
              selectedRow.productId !== undefined &&
              addedProductIds.has(selectedRow.productId) ? (
                <Button size="sm" disabled>
                  Added
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleAddRow(selectedRow)}>
                  + Add Selected
                </Button>
              )
            ) : undefined
          }
          isLoading={isLoading}
          emptyTitle="No products found"
          emptyDescription={
            activeTab === "supplier-history"
              ? "No purchase history found for this supplier."
              : activeTab === "low-stock"
                ? "No low-stock items match your search."
                : "No products match your search."
          }
          minHeight={280}
        />
      )}
    </div>
  );
}

// ── Quick Add form ─────────────────────────────────────────────────────────────

interface QuickAddFormProps {
  name: string;
  sku: string;
  quantity: string;
  price: string;
  unit: QuickAddUnit;
  error: string | null;
  onNameChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onQuantityBlur: () => void;
  onPriceChange: (value: string) => void;
  onUnitChange: (value: QuickAddUnit) => void;
  onSubmit: () => void;
}

function QuickAddForm({
  name,
  sku,
  quantity,
  price,
  unit,
  error,
  onNameChange,
  onSkuChange,
  onQuantityChange,
  onQuantityBlur,
  onPriceChange,
  onUnitChange,
  onSubmit,
}: QuickAddFormProps) {
  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-3"
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
      aria-label="Quick add product"
    >
      <p className="text-[11px] text-muted-foreground leading-tight">
        Add a product that isn&apos;t in the system yet. It will be appended
        to the PO line items as a new draft line.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Product Name
          </span>
          <Input
            className="h-8 text-xs"
            placeholder="e.g. Wedding Cake - Top Shelf"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            aria-label="Quick add product name"
          />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            SKU <span className="normal-case text-muted-foreground/70">(optional)</span>
          </span>
          <Input
            className="h-8 text-xs"
            placeholder="SKU"
            value={sku}
            onChange={e => onSkuChange(e.target.value)}
            aria-label="Quick add SKU"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Quantity
          </span>
          <Input
            className="h-8 text-xs"
            placeholder="Qty"
            inputMode="numeric"
            value={quantity}
            onChange={e => onQuantityChange(e.target.value)}
            onBlur={onQuantityBlur}
            aria-label="Quick add quantity"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Unit Price
          </span>
          <Input
            className="h-8 text-xs"
            placeholder="0.00"
            inputMode="decimal"
            value={price}
            onChange={e => onPriceChange(e.target.value)}
            aria-label="Quick add unit price"
          />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Unit
          </span>
          <Select
            value={unit}
            onValueChange={value => onUnitChange(value as QuickAddUnit)}
          >
            <SelectTrigger
              className="h-8 text-xs"
              aria-label="Quick add unit of measure"
            >
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="g">Grams (g)</SelectItem>
              <SelectItem value="lb">Pounds (lb)</SelectItem>
              <SelectItem value="unit">Unit</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      {error ? (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end pt-1">
        <Button type="submit" size="sm" className="h-8 px-3 text-xs">
          Add to PO
        </Button>
      </div>
    </form>
  );
}

export default ProductBrowserGrid;
