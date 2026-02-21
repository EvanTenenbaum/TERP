import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clearGridPreference,
  loadGridPreference,
  saveGridPreference,
  type GridViewMode,
} from "@/lib/gridPreferences";
import { listProductIntakeDrafts } from "@/lib/productIntakeDrafts";
import { recordFrictionEvent } from "@/lib/navigation/frictionTelemetry";
import GridColumnsPopover, {
  type GridColumnOption,
} from "@/components/uiux-slice/GridColumnsPopover";
import { GalleryHorizontal, Search } from "lucide-react";

const defaultColumns: GridColumnOption[] = [
  { id: "sku", label: "SKU", visible: true },
  { id: "product", label: "Product", visible: true },
  { id: "status", label: "Status", visible: true },
  { id: "onHand", label: "On Hand", visible: true },
  { id: "cost", label: "Cost", visible: true },
  { id: "vendor", label: "Vendor", visible: true },
  { id: "images", label: "Images", visible: true },
];

export function InventoryBrowseSlicePage() {
  const [route] = useLocation();
  const isLabRoute = route.startsWith("/slice-v1-lab");
  const { user } = useAuth();
  const userId = user?.id;
  const storageUserId = isLabRoute ? "slice-lab" : userId;

  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [primaryThumbByBatchId, setPrimaryThumbByBatchId] = useState<
    Record<number, string>
  >({});

  const [viewMode, setViewMode] = useState<GridViewMode>(() => {
    return (
      loadGridPreference("slice-inventory-browse", storageUserId)?.viewMode ??
      "COMFORTABLE"
    );
  });
  const [columns, setColumns] = useState<GridColumnOption[]>(() => {
    const pref = loadGridPreference("slice-inventory-browse", storageUserId);
    if (!pref) return defaultColumns;
    const map = new Map(defaultColumns.map(c => [c.id, c]));
    const ordered = pref.columnOrder
      .map(id => map.get(id))
      .filter((c): c is GridColumnOption => !!c)
      .map(c => ({ ...c, visible: pref.columnVisibility[c.id] ?? c.visible }));
    const missing = defaultColumns
      .filter(c => !ordered.some(o => o.id === c.id))
      .map(c => ({ ...c, visible: pref.columnVisibility[c.id] ?? c.visible }));
    return [...ordered, ...missing];
  });

  const enhancedQuery = trpc.inventory.getEnhanced.useQuery({
    page: 1,
    pageSize: 100,
    cursor: 0,
    sortBy: "sku",
    sortOrder: "asc",
  });
  const productsQuery = trpc.purchaseOrders.products.useQuery({ limit: 100 });
  const utils = trpc.useUtils();
  const backendItems = useMemo(() => {
    const normalizeEnhanced = (
      enhancedItems: Array<Record<string, unknown>>
    ) =>
      enhancedItems.map(item => ({
        batch: {
          id: Number(item.id ?? 0),
          sku: String(item.sku ?? ""),
          batchStatus: String(item.status ?? "UNKNOWN"),
          onHandQty: String(item.onHandQty ?? 0),
          unitCogs:
            item.unitCogs !== undefined && item.unitCogs !== null
              ? String(item.unitCogs)
              : "0",
        },
        product: {
          nameCanonical: String(item.productName ?? "Unknown Product"),
        },
        vendor: item.vendorName
          ? { name: String(item.vendorName) }
          : undefined,
      }));

    const enhancedPayload = enhancedQuery.data as
      | { items?: Array<Record<string, unknown>> }
      | undefined;
    if (Array.isArray(enhancedPayload?.items)) {
      return normalizeEnhanced(enhancedPayload.items);
    }

    return [];
  }, [enhancedQuery.data]);

  const fallbackInventoryItems = useMemo(() => {
    if (backendItems.length > 0) return [];

    return listProductIntakeDrafts(storageUserId)
      .filter(draft => draft.status === "RECEIVED")
      .flatMap(draft =>
        draft.lines.map((line, index) => {
          const batchId =
            line.batchId ??
            Number(`${Math.max(draft.poId, 1)}${index + 1}${Math.max(index, 0)}`);
          return {
            batch: {
              id: batchId,
              sku: line.sku ?? `LAB-${String(draft.poId).padStart(4, "0")}-${String(index + 1).padStart(3, "0")}`,
              batchStatus: "RECEIVED",
              onHandQty: line.intakeQty,
              unitCogs: line.unitCost,
            },
            product: {
              nameCanonical: line.productName ?? line.strainName ?? "Unknown Product",
            },
            vendor: {
              name: draft.vendorName,
            },
            __fallbackImages: line.mediaUrls ?? [],
          };
        })
      );
  }, [backendItems.length, storageUserId]);

  const fallbackProductItems = useMemo(() => {
    if (backendItems.length > 0 || fallbackInventoryItems.length > 0) return [];

    const productRecords = productsQuery.data?.items ?? [];
    return productRecords.slice(0, 24).map((product, index) => {
      const batchId = 900000 + index + 1;
      return {
        batch: {
          id: batchId,
          sku: `LAB-${String(product.id).padStart(4, "0")}-${String(index + 1).padStart(3, "0")}`,
          batchStatus: index % 4 === 0 ? "ON_HOLD" : "LIVE",
          onHandQty: (12 + (index % 7) * 3).toFixed(2),
          unitCogs: (95 + index * 4.25).toFixed(2),
        },
        product: {
          nameCanonical: product.nameCanonical ?? `Product #${product.id}`,
        },
        vendor: {
          name: product.brandName ?? "Seed Vendor",
        },
      };
    });
  }, [backendItems.length, fallbackInventoryItems.length, productsQuery.data?.items]);

  const items =
    backendItems.length > 0
      ? backendItems
      : fallbackInventoryItems.length > 0
        ? fallbackInventoryItems
        : fallbackProductItems;

  const fallbackImagesByBatchId = useMemo(() => {
    const map: Record<number, Array<{ url: string; fileName: string }>> = {};
    fallbackInventoryItems.forEach(item => {
      const batchId = item.batch?.id;
      if (!batchId) return;
      const images = (item as { __fallbackImages?: Array<{ url: string; fileName: string }> }).__fallbackImages ?? [];
      if (images.length > 0) {
        map[batchId] = images;
      }
    });
    return map;
  }, [fallbackInventoryItems]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(item => {
      const sku = item.batch?.sku ?? "";
      const product = item.product?.nameCanonical ?? "";
      const vendor = item.vendor?.name ?? "";
      return (
        sku.toLowerCase().includes(term) ||
        product.toLowerCase().includes(term) ||
        vendor.toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const selectedItem = useMemo(
    () => filtered.find(item => item.batch?.id === selectedBatchId) ?? null,
    [filtered, selectedBatchId]
  );

  const galleryQuery = trpc.photography.getBatchImages.useQuery(
    { batchId: selectedBatchId ?? -1 },
    { enabled: !!selectedBatchId && drawerOpen }
  );

  const visualBatchIds = useMemo(
    () =>
      viewMode === "VISUAL"
        ? filtered
            .map(item => item.batch?.id)
            .filter((batchId): batchId is number => !!batchId)
            .slice(0, 80)
        : [],
    [filtered, viewMode]
  );

  useEffect(() => {
    if (visualBatchIds.length === 0) return;

    const missingBatchIds = visualBatchIds.filter(
      batchId => !primaryThumbByBatchId[batchId]
    );
    if (missingBatchIds.length === 0) return;

    let cancelled = false;
    const loadThumbnails = async () => {
      const pairs = await Promise.all(
        missingBatchIds.map(async batchId => {
          try {
            const images = await utils.photography.getBatchImages.fetch({ batchId });
            const image = images[0];
            return [batchId, image?.thumbnailUrl ?? image?.imageUrl ?? ""] as const;
          } catch {
            return [batchId, ""] as const;
          }
        })
      );

      if (cancelled) return;
      setPrimaryThumbByBatchId(prev => {
        const next = { ...prev };
        pairs.forEach(([batchId, imageUrl]) => {
          if (imageUrl) {
            next[batchId] = imageUrl;
          }
        });
        return next;
      });
    };

    void loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [primaryThumbByBatchId, utils.photography.getBatchImages, visualBatchIds]);

  const visibleColumnIds = new Set(columns.filter(c => c.visible).map(c => c.id));

  const savePreference = (
    nextColumns: GridColumnOption[],
    nextViewMode: GridViewMode
  ) => {
    saveGridPreference(
      "slice-inventory-browse",
      {
        viewMode: nextViewMode,
        columnOrder: nextColumns.map(c => c.id),
        columnVisibility: Object.fromEntries(nextColumns.map(c => [c.id, c.visible])),
      },
      storageUserId
    );
  };

  const setColumnsAndPersist = (next: GridColumnOption[]) => {
    setColumns(next);
    savePreference(next, viewMode);
  };

  const setViewModeAndPersist = (next: GridViewMode) => {
    setViewMode(next);
    savePreference(columns, next);
  };

  const resetColumns = () => {
    clearGridPreference("slice-inventory-browse", storageUserId);
    setColumns(defaultColumns);
    setViewMode("COMFORTABLE");
  };

  const rowClass =
    viewMode === "DENSE"
      ? "text-xs"
      : viewMode === "COMFORTABLE"
        ? "text-sm"
        : "text-sm h-16";

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-background">
        <h1 className="text-2xl font-semibold">Inventory Browse (Slice Test)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grid-first browse with column controls, view modes, and SKU gallery drawer.
        </p>
      </div>

      <div className="px-6 py-3 border-b bg-muted/20 flex items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-md">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            placeholder="Search SKU, product, vendor"
          />
        </div>

        <Select value={viewMode} onValueChange={v => setViewModeAndPersist(v as GridViewMode)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DENSE">Dense</SelectItem>
            <SelectItem value="COMFORTABLE">Comfortable</SelectItem>
            <SelectItem value="VISUAL">Visual</SelectItem>
          </SelectContent>
        </Select>

        <GridColumnsPopover columns={columns} onChange={setColumnsAndPersist} onReset={resetColumns} />
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              {visibleColumnIds.has("sku") && <th className="text-left p-2">SKU</th>}
              {visibleColumnIds.has("product") && <th className="text-left p-2">Product</th>}
              {visibleColumnIds.has("status") && <th className="text-left p-2">Status</th>}
              {visibleColumnIds.has("onHand") && <th className="text-right p-2">On Hand</th>}
              {visibleColumnIds.has("cost") && <th className="text-right p-2">Cost</th>}
              {visibleColumnIds.has("vendor") && <th className="text-left p-2">Vendor</th>}
              {viewMode === "VISUAL" && visibleColumnIds.has("images") && <th className="text-left p-2">Image</th>}
              <th className="text-right p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const batchId = item.batch?.id;
              if (!batchId) return null;
              const onHand = Number(item.batch?.onHandQty ?? 0);
              const fallbackThumb = fallbackImagesByBatchId[batchId]?.[0]?.url;
              const visualThumb = primaryThumbByBatchId[batchId] || fallbackThumb;
              return (
                <tr key={batchId} className={`border-b ${rowClass}`}>
                  {visibleColumnIds.has("sku") && <td className="p-2 font-mono text-xs">{item.batch?.sku}</td>}
                  {visibleColumnIds.has("product") && <td className="p-2">{item.product?.nameCanonical ?? "-"}</td>}
                  {visibleColumnIds.has("status") && (
                    <td className="p-2">
                      <Badge variant="outline">{item.batch?.batchStatus ?? "-"}</Badge>
                    </td>
                  )}
                  {visibleColumnIds.has("onHand") && <td className="p-2 text-right">{onHand.toFixed(2)}</td>}
                  {visibleColumnIds.has("cost") && (
                    <td className="p-2 text-right">${Number(item.batch?.unitCogs ?? 0).toFixed(2)}</td>
                  )}
                  {visibleColumnIds.has("vendor") && <td className="p-2">{item.vendor?.name ?? "-"}</td>}
                  {viewMode === "VISUAL" && visibleColumnIds.has("images") && (
                    <td className="p-2">
                      {visualThumb ? (
                        <div className="relative group w-fit">
                          <img
                            src={visualThumb}
                            alt={item.product?.nameCanonical ?? "Primary image"}
                            className="h-12 w-12 rounded border object-cover"
                          />
                          <img
                            src={visualThumb}
                            alt={item.product?.nameCanonical ?? "Preview"}
                            className="hidden group-hover:block absolute left-14 top-0 h-28 w-28 rounded border object-cover shadow-lg z-10 bg-background"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                          Img
                        </div>
                      )}
                    </td>
                  )}
                  <td className="p-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBatchId(batchId);
                        setDrawerOpen(true);
                        recordFrictionEvent({
                          event: "flow_step",
                          workflow: "GF-007",
                          surface: "inventory-browse",
                          step: "open-sku-gallery",
                        });
                      }}
                    >
                      <GalleryHorizontal className="h-4 w-4 mr-1" />
                      Gallery
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={8}>
                  No inventory records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="w-[540px] sm:max-w-none">
          <DrawerHeader>
            <DrawerTitle>SKU Gallery</DrawerTitle>
            <DrawerDescription className="sr-only">
              Browse SKU images for the selected inventory batch.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto space-y-3">
            <div className="text-sm rounded border p-2 bg-muted/20">
              <p className="font-medium">{selectedItem?.product?.nameCanonical ?? "-"}</p>
              <p className="text-xs text-muted-foreground">SKU {selectedItem?.batch?.sku ?? "-"}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                (galleryQuery.data && galleryQuery.data.length > 0
                  ? galleryQuery.data.map(image => ({
                      id: image.id,
                      url: image.thumbnailUrl ?? image.imageUrl,
                      caption: image.caption ?? "SKU image",
                    }))
                  : (fallbackImagesByBatchId[selectedBatchId ?? -1] ?? []).map((image, index) => ({
                      id: Number(`${selectedBatchId ?? 0}${index + 1}`),
                      url: image.url,
                      caption: image.fileName ?? "SKU image",
                    }))) ?? []
              ).map(image => (
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.caption}
                  className="h-40 w-full object-cover rounded border"
                />
              ))}
              {(galleryQuery.data ?? []).length === 0 &&
                (fallbackImagesByBatchId[selectedBatchId ?? -1] ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No images available for this SKU.</p>
              )}
            </div>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default InventoryBrowseSlicePage;
