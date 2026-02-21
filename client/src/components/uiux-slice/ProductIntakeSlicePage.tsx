import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileImage,
  GalleryHorizontal,
  History,
  Package,
  Pencil,
  RotateCcw,
  Waypoints,
} from "lucide-react";
import GridColumnsPopover, {
  type GridColumnOption,
} from "@/components/uiux-slice/GridColumnsPopover";
import {
  clearGridPreference,
  loadGridPreference,
  saveGridPreference,
  type GridViewMode,
} from "@/lib/gridPreferences";
import {
  createProductIntakeDraftFromPO,
  getProductIntakeDraft,
  loadProductIntakeLabActivity,
  listProductIntakeDrafts,
  markProductIntakeDraftReceived,
  markProductIntakeDraftVoided,
  saveProductIntakeLabActivity,
  setProductIntakeDraftError,
  upsertProductIntakeDraft,
  type ProductIntakeDraft,
  type ProductIntakeLabActivity,
  type ProductIntakeDraftLine,
} from "@/lib/productIntakeDrafts";
import { recordFrictionEvent } from "@/lib/navigation/frictionTelemetry";

const defaultColumns: GridColumnOption[] = [
  { id: "brand", label: "Brand", visible: true },
  { id: "strain", label: "Strain", visible: true },
  { id: "category", label: "Category", visible: true },
  { id: "packaging", label: "Packaging", visible: true },
  { id: "qty", label: "Qty", visible: true },
  { id: "cost", label: "Cost", visible: true },
  { id: "grade", label: "Grade", visible: true },
  { id: "location", label: "Location", visible: true },
  { id: "images", label: "Images", visible: true },
  { id: "sku", label: "SKU", visible: true },
];

function parseLocationDraftId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("draftId");
}

function rowValidationErrors(line: ProductIntakeDraftLine): string[] {
  const errors: string[] = [];
  const remaining = Math.max(0, line.quantityOrdered - line.quantityReceived);

  if (!line.strainName && !line.productName) errors.push("Strain is required");
  if (!line.brandName) errors.push("Brand is required");
  if (!line.category) errors.push("Category is required");
  if (!line.packaging && !line.subcategory) errors.push("Packaging is required");
  if (!(line.intakeQty > 0)) errors.push("Qty must be greater than 0");
  if (line.intakeQty > remaining) errors.push("Qty exceeds remaining PO quantity");
  if (!(line.unitCost >= 0)) errors.push("Cost must be 0 or more");
  if (!line.locationName) errors.push("Location is required");
  if ((line.mediaUrls ?? []).length === 0) errors.push("Image evidence is required");

  return errors;
}

function calculateValidation(draft: ProductIntakeDraft | null) {
  if (!draft) return { errorCount: 0, errorsByLine: new Map<string, string[]>() };

  const errorsByLine = new Map<string, string[]>();
  draft.lines.forEach(line => {
    const errs = rowValidationErrors(line);
    if (errs.length) errorsByLine.set(line.id, errs);
  });

  return {
    errorCount: Array.from(errorsByLine.values()).reduce((sum, errs) => sum + errs.length, 0),
    errorsByLine,
  };
}

type ActivityMovement = ProductIntakeLabActivity;

type PoListItem = {
  id: number;
  poNumber: string;
  purchaseOrderStatus?: string;
  supplierClientId?: number | null;
  supplier?: { name?: string | null } | null;
};

type PoDetailItem = {
  id: number;
  productId: number;
  productName?: string | null;
  category?: string | null;
  subcategory?: string | null;
  quantityOrdered?: string | number | null;
  quantityReceived?: string | number | null;
  unitCost?: string | number | null;
};

type PoDetail = {
  id: number;
  poNumber: string;
  supplierClientId?: number | null;
  supplier?: { name?: string | null } | null;
  items?: PoDetailItem[];
};

export function ProductIntakeSlicePage() {
  const [route] = useLocation();
  const isLabRoute = route.startsWith("/slice-v1-lab");
  const { user } = useAuth();
  const userId = user?.id;
  const storageUserId = isLabRoute ? "slice-lab" : userId;

  const [drafts, setDrafts] = useState<ProductIntakeDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());

  const [reviewOpen, setReviewOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const [adjustAmount, setAdjustAmount] = useState("0");
  const [adjustReason, setAdjustReason] = useState("");
  const [transferLocationId, setTransferLocationId] = useState<string>("");
  const [transferQty, setTransferQty] = useState("0");
  const [transferReason, setTransferReason] = useState("");
  const [voidReason, setVoidReason] = useState("Void intake");
  const [bulkLocationId, setBulkLocationId] = useState<string>("");
  const [bulkGrade, setBulkGrade] = useState("");

  const [receivingDraftId, setReceivingDraftId] = useState<string | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityMovement[]>([]);
  const [labActivityItems, setLabActivityItems] = useState<ActivityMovement[]>(() =>
    loadProductIntakeLabActivity(storageUserId)
  );
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityReloadToken, setActivityReloadToken] = useState(0);
  const localActivityIdRef = useRef(-1);

  const [viewMode, setViewMode] = useState<GridViewMode>(() => {
    return (
      loadGridPreference("slice-intake-lines", storageUserId)?.viewMode ??
      "COMFORTABLE"
    );
  });

  const [columns, setColumns] = useState<GridColumnOption[]>(() => {
    const pref = loadGridPreference("slice-intake-lines", storageUserId);
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

  const locationsQuery = trpc.locations.getAll.useQuery();
  const locations = useMemo(
    () => (Array.isArray(locationsQuery.data) ? locationsQuery.data : []),
    [locationsQuery.data]
  );
  const poListQuery = trpc.purchaseOrders.getAll.useQuery({});
  const bootstrapPo = useMemo(() => {
    const payload = poListQuery.data;
    const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
    const list = items as PoListItem[];
    return (
      list.find(po => po.purchaseOrderStatus !== "RECEIVED") ??
      list[0] ??
      null
    );
  }, [poListQuery.data]);
  const bootstrapPoDetailsQuery = trpc.purchaseOrders.getByIdWithDetails.useQuery(
    { id: bootstrapPo?.id ?? -1 },
    { enabled: !!bootstrapPo?.id }
  );
  const productsQuery = trpc.purchaseOrders.products.useQuery({ limit: 50 });
  const bootstrapAttemptedRef = useRef(false);

  useEffect(() => {
    setLabActivityItems(loadProductIntakeLabActivity(storageUserId));
  }, [storageUserId]);

  useEffect(() => {
    saveProductIntakeLabActivity(labActivityItems, storageUserId);
  }, [labActivityItems, storageUserId]);

  const refreshDrafts = useCallback(
    (nextSelectedId?: string | null) => {
      const list = listProductIntakeDrafts(storageUserId);
      setDrafts(list);
      if (nextSelectedId) {
        setSelectedDraftId(nextSelectedId);
        return;
      }
      if (!selectedDraftId && list.length > 0) {
        setSelectedDraftId(list[0].id);
      }
    },
    [selectedDraftId, storageUserId]
  );

  useEffect(() => {
    const fromUrl = parseLocationDraftId();
    refreshDrafts(fromUrl);
  }, [refreshDrafts, route, storageUserId]);

  useEffect(() => {
    if (bootstrapAttemptedRef.current) return;
    if (drafts.length > 0) return;

    const detail = bootstrapPoDetailsQuery.data as PoDetail | undefined;
    const poItems = detail?.items ?? [];
    const defaultWarehouse =
      locations.find(loc => (loc.site ?? "").toLowerCase().includes("main")) ??
      locations[0];

    if (detail && poItems.length > 0) {
      const lines: ProductIntakeDraftLine[] = poItems
        .map((line, index): ProductIntakeDraftLine | null => {
          const ordered = Number(line.quantityOrdered ?? 0);
          const received = Number(line.quantityReceived ?? 0);
          const remaining = Math.max(0, ordered - received);
          if (remaining <= 0) return null;
          return {
            id: `line-${detail.id}-${line.id}-${index}`,
            poItemId: line.id,
            productId: line.productId,
            productName: line.productName ?? `Product #${line.productId}`,
            brandName: detail.supplier?.name ?? "Seed Supplier",
            strainName: line.productName ?? `Product #${line.productId}`,
            category: line.category ?? "",
            subcategory: line.subcategory ?? "",
            packaging: line.subcategory ?? "",
            quantityOrdered: ordered,
            quantityReceived: received,
            intakeQty: Math.min(remaining, Math.max(1, remaining)),
            unitCost: Number(line.unitCost ?? 0),
            grade: "A",
            locationId: defaultWarehouse?.id ?? null,
            locationName: defaultWarehouse?.site ?? "Main Warehouse",
            mediaUrls: [
              {
                url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=60",
                fileName: "seed-evidence.jpg",
                fileType: "image/jpeg",
                fileSize: 0,
              },
            ],
          };
        })
        .filter((line): line is ProductIntakeDraftLine => line !== null)
        .slice(0, 8);

      if (lines.length > 0) {
        const draft = createProductIntakeDraftFromPO({
          poId: detail.id,
          poNumber: detail.poNumber,
          vendorId: detail.supplierClientId ?? null,
          vendorName: detail.supplier?.name ?? "Seed Supplier",
          warehouseId: defaultWarehouse?.id ?? null,
          warehouseName: defaultWarehouse?.site ?? "Main Warehouse",
          lines,
        });
        upsertProductIntakeDraft(draft, storageUserId);
        bootstrapAttemptedRef.current = true;
        refreshDrafts(draft.id);
        return;
      }
    }

    const product = productsQuery.data?.items?.[0];
    if (product) {
      const draft = createProductIntakeDraftFromPO({
        poId: 0,
        poNumber: "PO-SEED-LOCAL",
        vendorId: null,
        vendorName: product.brandName ?? "Seed Supplier",
        warehouseId: defaultWarehouse?.id ?? null,
        warehouseName: defaultWarehouse?.site ?? "Main Warehouse",
        lines: [
          {
            id: `line-seed-${product.id}`,
            poItemId: 0,
            productId: product.id,
            productName: product.nameCanonical ?? `Product #${product.id}`,
            brandName: product.brandName ?? "Seed Supplier",
            strainName: product.strainName ?? product.nameCanonical ?? "Seed Strain",
            category: product.category ?? "Flower",
            subcategory: product.subcategory ?? "Indoor",
            packaging: product.subcategory ?? "Indoor",
            quantityOrdered: 10,
            quantityReceived: 0,
            intakeQty: 5,
            unitCost: 95,
            grade: "A",
            locationId: defaultWarehouse?.id ?? null,
            locationName: defaultWarehouse?.site ?? "Main Warehouse",
            mediaUrls: [
              {
                url: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=600&q=60",
                fileName: "seed-intake.jpg",
                fileType: "image/jpeg",
                fileSize: 0,
              },
            ],
          },
        ],
      });
      upsertProductIntakeDraft(draft, storageUserId);
      bootstrapAttemptedRef.current = true;
      refreshDrafts(draft.id);
      return;
    }

    if (
      poListQuery.isFetched &&
      bootstrapPoDetailsQuery.isFetched &&
      productsQuery.isFetched
    ) {
      bootstrapAttemptedRef.current = true;
    }
  }, [
    bootstrapPoDetailsQuery.data,
    bootstrapPoDetailsQuery.isFetched,
    drafts.length,
    locations,
    poListQuery.isFetched,
    productsQuery.data?.items,
    productsQuery.isFetched,
    refreshDrafts,
    storageUserId,
  ]);

  const selectedDraft = useMemo(
    () =>
      selectedDraftId
        ? getProductIntakeDraft(selectedDraftId, storageUserId)
        : drafts[0] ?? null,
    [drafts, selectedDraftId, storageUserId]
  );

  useEffect(() => {
    if (!selectedDraft) {
      setSelectedLineId(null);
      setSelectedLineIds(new Set());
      return;
    }

    const stillValid = selectedDraft.lines.some(line => line.id === selectedLineId);
    if (!stillValid) {
      const firstId = selectedDraft.lines[0]?.id ?? null;
      setSelectedLineId(firstId);
      setSelectedLineIds(firstId ? new Set([firstId]) : new Set());
    }
  }, [selectedDraft, selectedLineId]);

  const selectedLine = useMemo(() => {
    if (!selectedDraft || !selectedLineId) return null;
    return selectedDraft.lines.find(line => line.id === selectedLineId) ?? null;
  }, [selectedDraft, selectedLineId]);

  const receivedBatchIds = useMemo(
    () =>
      Array.from(
        new Set(
          (selectedDraft?.lines ?? [])
            .map(line => line.batchId)
            .filter((batchId): batchId is number => !!batchId)
        )
      ),
    [selectedDraft]
  );

  const galleryQuery = trpc.photography.getBatchImages.useQuery(
    { batchId: selectedLine?.batchId ?? -1 },
    { enabled: !isLabRoute && !!selectedLine?.batchId && galleryOpen }
  );

  const receiveMutation = trpc.poReceiving.receiveGoodsWithBatch.useMutation();
  const adjustMutation = trpc.inventory.adjustQty.useMutation();
  const transferMutation = trpc.warehouseTransfers.transfer.useMutation();
  const reverseMutation = trpc.inventoryMovements.reverse.useMutation();
  const uploadMediaMutation = trpc.inventory.uploadMedia.useMutation();
  const deleteMediaMutation = trpc.inventory.deleteMedia.useMutation();

  const utils = trpc.useUtils();

  const recordLabActivity = (
    movementType: string,
    quantityChange: string,
    notes: string,
    batchId: number
  ) => {
    if (!selectedDraft) return;
    localActivityIdRef.current -= 1;
    setLabActivityItems(prev => [
      {
        id: localActivityIdRef.current,
        batchId,
        inventoryMovementType: movementType,
        quantityChange,
        notes,
        createdAt: new Date().toISOString(),
        draftId: selectedDraft.id,
      },
      ...prev,
    ]);
  };

  useEffect(() => {
    if (!activityOpen || !selectedDraft) {
      setActivityItems([]);
      return;
    }

    if (isLabRoute) {
      const localForDraft = labActivityItems
        .filter(item => item.draftId === selectedDraft.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        );
      setActivityItems(localForDraft);
      setActivityLoading(false);
      return;
    }

    let cancelled = false;
    const loadActivity = async () => {
      setActivityLoading(true);
      try {
        const poReceiptMovements = (await utils.inventoryMovements.getByReference.fetch({
          referenceType: "PO_RECEIPT",
          referenceId: selectedDraft.poId,
        })) as ActivityMovement[];

        const batchMovementLists = await Promise.all(
          receivedBatchIds.map(batchId =>
            utils.inventoryMovements.getByBatch.fetch({
              batchId,
              limit: 200,
            })
          )
        );

        const merged = new Map<number, ActivityMovement>();
        [...poReceiptMovements, ...batchMovementLists.flat()].forEach(movement => {
          if (!merged.has(movement.id)) {
            merged.set(movement.id, movement as ActivityMovement);
          }
        });

        const localForDraft = labActivityItems.filter(
          item => item.draftId === selectedDraft.id
        );
        const ordered = [...Array.from(merged.values()), ...localForDraft].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        );

        if (!cancelled) setActivityItems(ordered);
      } catch {
        if (!cancelled) {
          const localForDraft = labActivityItems.filter(
            item => item.draftId === selectedDraft.id
          );
          setActivityItems(localForDraft);
          if (!isLabRoute) {
            toast.error("Unable to load activity log.");
          }
        }
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [
    activityOpen,
    activityReloadToken,
    isLabRoute,
    labActivityItems,
    receivedBatchIds,
    selectedDraft,
    utils,
  ]);

  const assertCurrentDraft = (draft: ProductIntakeDraft): ProductIntakeDraft | null => {
    const latest = getProductIntakeDraft(draft.id, storageUserId);
    if (!latest) {
      toast.error("Draft no longer exists. Reloaded current list.");
      refreshDrafts();
      return null;
    }
    if (latest.version !== draft.version) {
      toast.error("This intake changed elsewhere. Reloaded latest version.");
      refreshDrafts(draft.id);
      return null;
    }
    return latest;
  };

  const savePreference = (
    nextColumns: GridColumnOption[],
    nextViewMode: GridViewMode
  ) => {
    saveGridPreference(
      "slice-intake-lines",
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
    clearGridPreference("slice-intake-lines", storageUserId);
    setColumns(defaultColumns);
    setViewMode("COMFORTABLE");
  };

  const visibleColumnIds = new Set(columns.filter(c => c.visible).map(c => c.id));

  const updateDraft = (updater: (draft: ProductIntakeDraft) => ProductIntakeDraft) => {
    if (!selectedDraft) return;
    const latest = assertCurrentDraft(selectedDraft);
    if (!latest) return;
    const next = updater(latest);
    upsertProductIntakeDraft(next, storageUserId);
    refreshDrafts(next.id);
  };

  const updateLine = (lineId: string, patch: Partial<ProductIntakeDraftLine>) => {
    updateDraft(draft => ({
      ...draft,
      lines: draft.lines.map(line =>
        line.id === lineId
          ? {
              ...line,
              ...patch,
            }
          : line
      ),
    }));
  };

  const validation = useMemo(() => calculateValidation(selectedDraft), [selectedDraft]);

  const summary = useMemo(() => {
    if (!selectedDraft) return { lines: 0, units: 0, cost: 0 };
    const lines = selectedDraft.lines.length;
    const units = selectedDraft.lines.reduce(
      (sum, line) => sum + Number(line.intakeQty || 0),
      0
    );
    const cost = selectedDraft.lines.reduce(
      (sum, line) => sum + Number(line.intakeQty || 0) * Number(line.unitCost || 0),
      0
    );
    return { lines, units, cost };
  }, [selectedDraft]);

  const canEdit =
    selectedDraft?.status === "DRAFT" && receivingDraftId !== selectedDraft.id;

  const allLinesSelected =
    !!selectedDraft &&
    selectedDraft.lines.length > 0 &&
    selectedDraft.lines.every(line => selectedLineIds.has(line.id));

  const receiveDraft = async () => {
    if (!selectedDraft) return;
    const startedAt = Date.now();

    const latestDraft = assertCurrentDraft(selectedDraft);
    if (!latestDraft) return;

    const latestValidation = calculateValidation(latestDraft);
    if (latestValidation.errorCount > 0) {
      toast.error("Fix blocking errors before Receive.");
      recordFrictionEvent({
        event: "dead_end",
        workflow: "GF-002",
        surface: "product-intake",
        step: "receive",
        note: "blocking-validation-errors",
      });
      return;
    }

    setReceivingDraftId(latestDraft.id);
    try {
      if (isLabRoute) {
        const base = Date.now();
        const nextLines = latestDraft.lines.map((line, index) => ({
          ...line,
          batchId: line.batchId ?? base + index + 1,
          sku:
            line.sku ??
            `LAB-${String(latestDraft.poId).padStart(4, "0")}-${String(index + 1).padStart(3, "0")}`,
        }));

        markProductIntakeDraftReceived(
          latestDraft.id,
          {
            lines: nextLines,
          },
          storageUserId
        );
        nextLines.forEach(line => {
          recordLabActivity(
            "RECEIVE_INTAKE",
            Number(line.intakeQty).toString(),
            `Lab receive for ${latestDraft.id}`,
            line.batchId ?? 0
          );
        });
        refreshDrafts(latestDraft.id);
        setActivityReloadToken(token => token + 1);
        toast.success("Product Intake received.");
        recordFrictionEvent({
          event: "flow_complete",
          workflow: "GF-002",
          surface: "product-intake",
          step: "receive",
          stepCount: nextLines.length + 1,
          elapsedMs: Date.now() - startedAt,
        });
        return;
      }

      const result = await receiveMutation.mutateAsync({
        purchaseOrderId: latestDraft.poId,
        items: latestDraft.lines.map(line => ({
          poItemId: line.poItemId,
          quantity: Number(line.intakeQty),
          locationId: line.locationId ?? undefined,
          notes: line.notes,
        })),
        receivingNotes: `Product Intake ${latestDraft.id} (${latestDraft.idempotencyKey})`,
      });

      const nextLines = latestDraft.lines.map((line, index) => ({
        ...line,
        batchId: result.batches[index]?.id,
        sku: result.batches[index]?.code,
      }));

      markProductIntakeDraftReceived(
        latestDraft.id,
        {
          lines: nextLines,
        },
        storageUserId
      );

      refreshDrafts(latestDraft.id);
      setActivityReloadToken(token => token + 1);
      toast.success("Product Intake received.");
      recordFrictionEvent({
        event: "flow_complete",
        workflow: "GF-002",
        surface: "product-intake",
        step: "receive",
        stepCount: nextLines.length + 1,
        elapsedMs: Date.now() - startedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Receive failed";
      setProductIntakeDraftError(latestDraft.id, message, storageUserId);
      refreshDrafts(latestDraft.id);
      toast.error(message);
      recordFrictionEvent({
        event: "dead_end",
        workflow: "GF-002",
        surface: "product-intake",
        step: "receive",
        elapsedMs: Date.now() - startedAt,
        note: message,
      });
    } finally {
      setReceivingDraftId(null);
    }
  };

  const applyBulkLocation = () => {
    if (!selectedDraft || !canEdit) return;
    if (selectedLineIds.size === 0 || !bulkLocationId) {
      toast.error("Select lines and a destination location first.");
      return;
    }

    const location = locations.find(l => String(l.id) === bulkLocationId);
    if (!location) {
      toast.error("Location not found.");
      return;
    }

    updateDraft(draft => ({
      ...draft,
      lines: draft.lines.map(line =>
        selectedLineIds.has(line.id)
          ? {
              ...line,
              locationId: location.id,
              locationName: location.site,
            }
          : line
      ),
    }));

    toast.success("Location applied to selected lines.");
  };

  const applyBulkGrade = () => {
    if (!selectedDraft || !canEdit) return;
    if (selectedLineIds.size === 0 || !bulkGrade.trim()) {
      toast.error("Select lines and enter grade first.");
      return;
    }

    updateDraft(draft => ({
      ...draft,
      lines: draft.lines.map(line =>
        selectedLineIds.has(line.id)
          ? {
              ...line,
              grade: bulkGrade.trim(),
            }
          : line
      ),
    }));

    toast.success("Grade applied to selected lines.");
  };

  const submitAdjust = async () => {
    const startedAt = Date.now();
    if (!selectedLine) return;
    const adjustment = Number(adjustAmount || 0);
    if (!Number.isFinite(adjustment) || adjustment === 0) {
      toast.error("Enter a non-zero adjustment.");
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("Reason is required.");
      return;
    }

    if (isLabRoute) {
      recordLabActivity(
        "ADJUST_QUANTITY",
        adjustment.toString(),
        adjustReason,
        selectedLine.batchId ?? 0
      );
      setActivityReloadToken(token => token + 1);
      toast.success("Quantity adjustment recorded.");
      setAdjustOpen(false);
      recordFrictionEvent({
        event: "flow_complete",
        workflow: "GF-007",
        surface: "product-intake",
        step: "adjust-quantity",
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    try {
      if (!selectedLine.batchId) {
        throw new Error("Batch not available for server adjustment.");
      }
      await adjustMutation.mutateAsync({
        id: selectedLine.batchId,
        field: "onHandQty",
        adjustment,
        reason: adjustReason,
      });
      setActivityReloadToken(token => token + 1);
      toast.success("Quantity adjustment recorded.");
      setAdjustOpen(false);
      recordFrictionEvent({
        event: "flow_complete",
        workflow: "GF-007",
        surface: "product-intake",
        step: "adjust-quantity",
        elapsedMs: Date.now() - startedAt,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Adjustment failed");
      recordFrictionEvent({
        event: "dead_end",
        workflow: "GF-007",
        surface: "product-intake",
        step: "adjust-quantity",
        elapsedMs: Date.now() - startedAt,
      });
    }
  };

  const submitTransfer = async () => {
    const startedAt = Date.now();
    if (!selectedLine || !transferLocationId) {
      toast.error("Select destination location.");
      return;
    }

    const transferQtyNum = Number(transferQty || 0);
    if (!(transferQtyNum > 0)) {
      toast.error("Transfer quantity must be greater than 0.");
      return;
    }

    const destination = locations.find(l => String(l.id) === transferLocationId);
    if (!destination) {
      toast.error("Destination location not found.");
      return;
    }

    if (isLabRoute) {
      recordLabActivity(
        "CHANGE_LOCATION",
        transferQtyNum.toString(),
        transferReason || `Change Location from Intake ${selectedDraft?.id}`,
        selectedLine.batchId ?? 0
      );
      setActivityReloadToken(token => token + 1);
      toast.success("Location change movement recorded.");
      setTransferOpen(false);
      recordFrictionEvent({
        event: "flow_complete",
        workflow: "GF-007",
        surface: "product-intake",
        step: "change-location",
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    try {
      if (!selectedLine.batchId) {
        throw new Error("Batch not available for server transfer.");
      }
      const existingLocations = await utils.warehouseTransfers.getBatchLocations.fetch({
        batchId: selectedLine.batchId,
      });
      const from = existingLocations[0];

      await transferMutation.mutateAsync({
        batchId: selectedLine.batchId,
        fromLocationId: from?.id,
        toSite: destination.site,
        toZone: destination.zone ?? undefined,
        toRack: destination.rack ?? undefined,
        toShelf: destination.shelf ?? undefined,
        toBin: destination.bin ?? undefined,
        quantity: transferQtyNum.toString(),
        notes: transferReason || `Change Location from Intake ${selectedDraft?.id}`,
      });

      setActivityReloadToken(token => token + 1);
      toast.success("Location change movement recorded.");
      setTransferOpen(false);
      recordFrictionEvent({
        event: "flow_complete",
        workflow: "GF-007",
        surface: "product-intake",
        step: "change-location",
        elapsedMs: Date.now() - startedAt,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Location change failed");
      recordFrictionEvent({
        event: "dead_end",
        workflow: "GF-007",
        surface: "product-intake",
        step: "change-location",
        elapsedMs: Date.now() - startedAt,
      });
    }
  };

  const submitVoid = async () => {
    const startedAt = Date.now();
    if (!selectedDraft) return;

    if (isLabRoute) {
      markProductIntakeDraftVoided(selectedDraft.id, storageUserId);
      recordLabActivity(
        "VOID_INTAKE",
        "0",
        voidReason || `Void intake ${selectedDraft.id}`,
        0
      );
      refreshDrafts(selectedDraft.id);
      setActivityReloadToken(token => token + 1);
      setVoidOpen(false);
      toast.success("Intake voided with reversal movements.");
      recordFrictionEvent({
        event: "flow_complete",
        workflow: "GF-007",
        surface: "product-intake",
        step: "void-intake",
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    try {
      const movements = await utils.inventoryMovements.getByReference.fetch({
        referenceType: "PO_RECEIPT",
        referenceId: selectedDraft.poId,
      });

      const positive = (movements ?? []).filter(m => Number(m.quantityChange) > 0);
      const byBatch = new Map<number, Array<(typeof positive)[number]>>();
      positive.forEach(movement => {
        if (!byBatch.has(movement.batchId)) {
          byBatch.set(movement.batchId, []);
        }
        byBatch.get(movement.batchId)?.push(movement);
      });

      for (const candidates of byBatch.values()) {
        const preferred =
          candidates.find(c => (c.notes ?? "").includes("Received from PO")) ??
          candidates[0];
        await reverseMutation.mutateAsync({
          movementId: preferred.id,
          reason: voidReason || `Void intake ${selectedDraft.id}`,
        });
      }

      markProductIntakeDraftVoided(selectedDraft.id, storageUserId);
      refreshDrafts(selectedDraft.id);
      setActivityReloadToken(token => token + 1);
      setVoidOpen(false);
      toast.success("Intake voided with reversal movements.");
      recordFrictionEvent({
        event: "flow_complete",
        workflow: "GF-007",
        surface: "product-intake",
        step: "void-intake",
        elapsedMs: Date.now() - startedAt,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Void failed");
      recordFrictionEvent({
        event: "dead_end",
        workflow: "GF-007",
        surface: "product-intake",
        step: "void-intake",
        elapsedMs: Date.now() - startedAt,
      });
    }
  };

  const uploadAttachments = async (files: File[] | null) => {
    if (!files || !selectedLine || !selectedDraft) return;

    const accepted = files.filter(
      file => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024
    );

    if (accepted.length === 0) {
      toast.error("Select image files under 10MB.");
      return;
    }

    const uploaded: ProductIntakeDraftLine["mediaUrls"] = [];
    let usedLocalFallback = false;

    for (const file of accepted) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const raw = typeof reader.result === "string" ? reader.result : "";
          resolve(raw.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
        reader.readAsDataURL(file);
      });

      if (isLabRoute) {
        usedLocalFallback = true;
        uploaded.push({
          url: `data:${file.type};base64,${base64}`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
        continue;
      }

      try {
        const result = await uploadMediaMutation.mutateAsync({
          fileData: base64,
          fileName: file.name,
          fileType: file.type,
        });

        uploaded.push({
          url: result.url,
          fileName: result.fileName,
          fileType: result.fileType,
          fileSize: result.fileSize,
        });
      } catch {
        // Local lab fallback when object storage is not configured.
        usedLocalFallback = true;
        uploaded.push({
          url: `data:${file.type};base64,${base64}`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
      }
    }

    updateLine(selectedLine.id, {
      mediaUrls: [...(selectedLine.mediaUrls ?? []), ...(uploaded ?? [])],
    });

    toast.success(
      usedLocalFallback
        ? "Draft intake photos saved locally for this testing session."
        : "Draft intake photos saved."
    );
  };

  const removeAttachment = async (url: string) => {
    if (!selectedLine) return;

    if (!isLabRoute && !url.startsWith("data:")) {
      try {
        await deleteMediaMutation.mutateAsync({ url });
      } catch {
        // still remove from draft if backend asset is already gone
      }
    }

    updateLine(selectedLine.id, {
      mediaUrls: (selectedLine.mediaUrls ?? []).filter(m => m.url !== url),
    });
  };

  const rowClass =
    viewMode === "DENSE"
      ? "text-xs"
      : viewMode === "COMFORTABLE"
        ? "text-sm"
        : "text-sm h-16";

  const intakeContext = selectedDraft
    ? `${selectedDraft.id} · ${selectedDraft.vendorName} · ${selectedDraft.warehouseName} · PO ${selectedDraft.poNumber} · ${summary.lines} lines · ${summary.units.toFixed(2)} units · $${summary.cost.toFixed(2)} · ${selectedDraft.status}`
    : "Select an intake draft to continue.";

  const galleryImages = isLabRoute
    ? (selectedLine?.mediaUrls ?? []).map((media, index) => ({
        id: `${selectedLine?.id ?? "line"}-${index}`,
        thumbnailUrl: media.url,
        imageUrl: media.url,
        caption: media.fileName ?? "SKU image",
      }))
    : (galleryQuery.data ?? []);

  const activityRows = useMemo(() => {
    const keyCounts = new Map<string, number>();
    return activityItems.map(item => {
      const base = `${item.id}-${item.createdAt ?? "na"}-${item.inventoryMovementType}-${item.quantityChange}-${item.batchId}`;
      const nextCount = (keyCounts.get(base) ?? 0) + 1;
      keyCounts.set(base, nextCount);
      return {
        key: `${base}-${nextCount}`,
        item,
      };
    });
  }, [activityItems]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          Product Intake
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review to Receive with inline QA gating and correction actions.
        </p>
      </div>

      <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
        <Select
          value={selectedDraft?.id ?? ""}
          onValueChange={value => setSelectedDraftId(value)}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select Product Intake" />
          </SelectTrigger>
          <SelectContent>
            {drafts.map(draft => (
              <SelectItem key={draft.id} value={draft.id}>
                {draft.id} · {draft.vendorName} · {draft.status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={viewMode} onValueChange={v => setViewModeAndPersist(v as GridViewMode)}>
          <SelectTrigger className="w-40">
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

      <div className="px-6 py-2 border-b text-xs text-muted-foreground">{intakeContext}</div>

      <div className="px-6 py-2 border-b flex items-center gap-2 flex-wrap text-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setReviewOpen(true);
            recordFrictionEvent({
              event: "flow_step",
              workflow: "GF-002",
              surface: "product-intake",
              step: "open-review",
            });
          }}
          disabled={!selectedDraft}
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Review
        </Button>

        <Button
          size="sm"
          onClick={receiveDraft}
          disabled={
            !selectedDraft ||
            selectedDraft.status !== "DRAFT" ||
            receiveMutation.isPending ||
            receivingDraftId === selectedDraft.id ||
            validation.errorCount > 0
          }
        >
          {receiveMutation.isPending ? "Receiving..." : "Receive"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setActivityOpen(true)}
        >
          <History className="h-4 w-4 mr-1" />
          Activity Log
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setAttachmentsOpen(true)}
          disabled={!selectedLine}
        >
          <FileImage className="h-4 w-4 mr-1" />
          Attachments
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setGalleryOpen(true);
            recordFrictionEvent({
              event: "flow_step",
              workflow: "GF-002",
              surface: "product-intake",
              step: "open-sku-gallery",
            });
          }}
          disabled={!selectedLine?.batchId}
        >
          <GalleryHorizontal className="h-4 w-4 mr-1" />
          SKU Gallery
        </Button>

        {selectedDraft?.status === "RECEIVED" && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustOpen(true)}
              disabled={!selectedLine?.batchId}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Adjust Quantity
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransferOpen(true)}
              disabled={!selectedLine?.batchId}
            >
              <Waypoints className="h-4 w-4 mr-1" />
              Change Location
            </Button>
            <Button variant="outline" size="sm" onClick={() => setVoidOpen(true)}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Void Intake
            </Button>
          </>
        )}

        {canEdit && (
          <>
            <Select value={bulkLocationId} onValueChange={setBulkLocationId}>
              <SelectTrigger className="w-44 h-8">
                <SelectValue placeholder="Set Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={applyBulkLocation}>
              Apply Location
            </Button>

            <Input
              className="h-8 w-36"
              value={bulkGrade}
              onChange={e => setBulkGrade(e.target.value)}
              placeholder="Set Grade"
            />
            <Button variant="outline" size="sm" onClick={applyBulkGrade}>
              Apply Grade
            </Button>
          </>
        )}

        <span className="text-muted-foreground ml-auto">
          {selectedLineIds.size} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={selectedLineIds.size === 0}
          onClick={() => setSelectedLineIds(new Set())}
        >
          Clear
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-h-[420px]">
            <thead className="sticky top-0 bg-background border-b z-10">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="text-left p-2 w-10">
                  <Checkbox
                    checked={allLinesSelected}
                    onCheckedChange={checked => {
                      if (!selectedDraft) return;
                      if (checked) {
                        setSelectedLineIds(new Set(selectedDraft.lines.map(line => line.id)));
                      } else {
                        setSelectedLineIds(new Set());
                      }
                    }}
                  />
                </th>
                <th className="text-left p-2 w-10"></th>
                {visibleColumnIds.has("brand") && <th className="text-left p-2">Brand</th>}
                {visibleColumnIds.has("strain") && <th className="text-left p-2">Strain</th>}
                {visibleColumnIds.has("category") && <th className="text-left p-2">Category</th>}
                {visibleColumnIds.has("packaging") && <th className="text-left p-2">Packaging</th>}
                {visibleColumnIds.has("qty") && <th className="text-left p-2">Qty</th>}
                {visibleColumnIds.has("cost") && <th className="text-left p-2">Cost</th>}
                {visibleColumnIds.has("grade") && <th className="text-left p-2">Grade</th>}
                {visibleColumnIds.has("location") && <th className="text-left p-2">Location</th>}
                {viewMode === "VISUAL" && visibleColumnIds.has("images") && <th className="text-left p-2">Images</th>}
                {selectedDraft?.status !== "DRAFT" && visibleColumnIds.has("sku") && <th className="text-left p-2">SKU</th>}
              </tr>
            </thead>
            <tbody>
              {(selectedDraft?.lines ?? []).map(line => {
                const isSelected = selectedLineId === line.id;
                const isChecked = selectedLineIds.has(line.id);
                const lineErrors = validation.errorsByLine.get(line.id) ?? [];
                const hasError = selectedDraft?.status === "DRAFT" && lineErrors.length > 0;

                return (
                  <tr
                    key={line.id}
                    className={`border-b ${rowClass} ${isSelected ? "bg-muted/20" : ""}`}
                    onClick={() => setSelectedLineId(line.id)}
                  >
                    <td className="p-2" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={checked => {
                          setSelectedLineIds(prev => {
                            const copy = new Set(prev);
                            if (checked) copy.add(line.id);
                            else copy.delete(line.id);
                            return copy;
                          });
                        }}
                      />
                    </td>
                    <td className="p-2">
                      {hasError ? (
                        <span className="inline-flex items-center text-red-600" title={lineErrors.join("; ")}>
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-muted-foreground">•</span>
                      )}
                    </td>
                    {visibleColumnIds.has("brand") && (
                      <td className="p-2">
                        <Input
                          value={line.brandName ?? ""}
                          disabled={!canEdit}
                          onChange={e => updateLine(line.id, { brandName: e.target.value })}
                        />
                      </td>
                    )}
                    {visibleColumnIds.has("strain") && (
                      <td className="p-2">
                        <Input
                          value={line.strainName ?? line.productName}
                          disabled={!canEdit}
                          onChange={e =>
                            updateLine(line.id, {
                              strainName: e.target.value,
                              productName: e.target.value,
                            })
                          }
                        />
                      </td>
                    )}
                    {visibleColumnIds.has("category") && (
                      <td className="p-2">
                        <Input
                          value={line.category ?? ""}
                          disabled={!canEdit}
                          onChange={e => updateLine(line.id, { category: e.target.value })}
                        />
                      </td>
                    )}
                    {visibleColumnIds.has("packaging") && (
                      <td className="p-2">
                        <Input
                          value={line.packaging ?? line.subcategory ?? ""}
                          disabled={!canEdit}
                          onChange={e =>
                            updateLine(line.id, {
                              packaging: e.target.value,
                              subcategory: e.target.value,
                            })
                          }
                        />
                      </td>
                    )}
                    {visibleColumnIds.has("qty") && (
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          max={Math.max(0, line.quantityOrdered - line.quantityReceived)}
                          step="0.01"
                          value={line.intakeQty}
                          disabled={!canEdit}
                          onChange={e => updateLine(line.id, { intakeQty: Number(e.target.value || 0) })}
                        />
                      </td>
                    )}
                    {visibleColumnIds.has("cost") && (
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitCost}
                          disabled={!canEdit}
                          onChange={e => updateLine(line.id, { unitCost: Number(e.target.value || 0) })}
                        />
                      </td>
                    )}
                    {visibleColumnIds.has("grade") && (
                      <td className="p-2">
                        <Input
                          value={line.grade ?? ""}
                          disabled={!canEdit}
                          onChange={e => updateLine(line.id, { grade: e.target.value })}
                        />
                      </td>
                    )}
                    {visibleColumnIds.has("location") && (
                      <td className="p-2">
                        <Select
                          value={line.locationId ? String(line.locationId) : ""}
                          onValueChange={value => {
                            const location = locations.find(l => String(l.id) === value);
                            updateLine(line.id, {
                              locationId: location?.id,
                              locationName: location?.site ?? "",
                            });
                          }}
                          disabled={!canEdit}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map(location => (
                              <SelectItem key={location.id} value={String(location.id)}>
                                {location.site}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    {viewMode === "VISUAL" && visibleColumnIds.has("images") && (
                      <td className="p-2">
                        {line.mediaUrls && line.mediaUrls.length > 0 ? (
                          <div className="relative group w-fit">
                            <img
                              src={line.mediaUrls[0]?.url}
                              alt={line.productName}
                              className="h-12 w-12 rounded object-cover border"
                            />
                            <img
                              src={line.mediaUrls[0]?.url}
                              alt={`${line.productName} preview`}
                              className="hidden group-hover:block absolute left-14 top-0 h-28 w-28 rounded border object-cover shadow-lg z-10 bg-background"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </td>
                    )}
                    {selectedDraft?.status !== "DRAFT" && visibleColumnIds.has("sku") && (
                      <td className="p-2 font-mono text-xs">{line.sku ?? "-"}</td>
                    )}
                  </tr>
                );
              })}
              {!selectedDraft && (
                <tr>
                  <td
                    className="p-8 text-center text-muted-foreground"
                    colSpan={12}
                  >
                    Select a Product Intake draft.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Intake</DialogTitle>
            <DialogDescription className="sr-only">
              Review totals and blocking errors before receiving intake.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Lines: {summary.lines}</p>
            <p>Units: {summary.units.toFixed(2)}</p>
            <p>Cost: ${summary.cost.toFixed(2)}</p>

            {validation.errorCount > 0 ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
                {validation.errorCount} blocking error(s). Receive is disabled until fixed inline.
              </div>
            ) : (
              <div className="rounded border border-green-200 bg-green-50 p-3 text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                No blocking errors. Ready to receive.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={activityOpen} onOpenChange={setActivityOpen} direction="right">
        <DrawerContent className="w-[560px] sm:max-w-none">
          <DrawerHeader>
            <DrawerTitle>Activity Log</DrawerTitle>
            <DrawerDescription className="sr-only">
              Inventory and correction movement history for this intake.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto space-y-2">
            {activityLoading && (
              <div className="text-sm text-muted-foreground">Loading activity...</div>
            )}
            {activityRows.map(({ key, item }) => (
              <div key={key} className="border-b pb-2 text-sm">
                <p className="font-medium">{item.inventoryMovementType}</p>
                <p className="text-xs text-muted-foreground">Qty {item.quantityChange}</p>
                <p className="text-xs text-muted-foreground">{item.notes ?? "-"}</p>
              </div>
            ))}
            {!activityLoading && activityItems.length === 0 && (
              <div className="text-sm text-muted-foreground">No activity yet.</div>
            )}
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setActivityOpen(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={attachmentsOpen} onOpenChange={setAttachmentsOpen} direction="right">
        <DrawerContent className="w-[520px] sm:max-w-none">
          <DrawerHeader>
            <DrawerTitle>Attachments</DrawerTitle>
            <DrawerDescription className="sr-only">
              Upload and manage intake photo evidence for the selected line.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto space-y-3">
            {!selectedLine && (
              <p className="text-sm text-muted-foreground">Select a line first.</p>
            )}
            {selectedLine && (
              <>
                <div>
                  <Label>Upload Intake Photos</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e =>
                      uploadAttachments(e.target.files ? Array.from(e.target.files) : null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  {(selectedLine.mediaUrls ?? []).map(file => (
                    <div key={file.url} className="flex items-center justify-between border-b py-2 text-sm">
                      <span className="truncate mr-2">{file.fileName}</span>
                      <Button variant="ghost" onClick={() => removeAttachment(file.url)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                  {(selectedLine.mediaUrls ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No photos attached.</p>
                  )}
                </div>
              </>
            )}
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setAttachmentsOpen(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={galleryOpen} onOpenChange={setGalleryOpen} direction="right">
        <DrawerContent className="w-[520px] sm:max-w-none">
          <DrawerHeader>
            <DrawerTitle>SKU Gallery</DrawerTitle>
            <DrawerDescription className="sr-only">
              View SKU gallery images for the selected received line.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto grid grid-cols-2 gap-2">
            {galleryImages.map(image => (
              <img
                key={image.id}
                src={image.thumbnailUrl ?? image.imageUrl}
                alt={image.caption ?? "SKU image"}
                className="w-full h-36 object-cover rounded border"
              />
            ))}
            {galleryImages.length === 0 && (
              <p className="text-sm text-muted-foreground">No SKU images available.</p>
            )}
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setGalleryOpen(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Quantity</DialogTitle>
            <DialogDescription className="sr-only">
              Record a post-receive quantity correction as a movement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selected line: {selectedLine?.productName ?? "-"}
            </p>
            <div>
              <Label>Adjustment (+ / -)</Label>
              <Input type="number" step="0.01" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={submitAdjust} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? "Saving..." : "Record Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Location</DialogTitle>
            <DialogDescription className="sr-only">
              Record a post-receive location change as a transfer movement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Destination Location</Label>
              <Select value={transferLocationId} onValueChange={setTransferLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {location.site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" step="0.01" value={transferQty} onChange={e => setTransferQty(e.target.value)} />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={transferReason} onChange={e => setTransferReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={submitTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? "Saving..." : "Record Location Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Intake</DialogTitle>
            <DialogDescription className="sr-only">
              Void this intake by creating reversal movements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This creates reversal movements. Original records remain in history.
            </p>
            <div>
              <Label>Reason</Label>
              <Textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitVoid} disabled={reverseMutation.isPending}>
              {reverseMutation.isPending ? "Voiding..." : "Void Intake"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductIntakeSlicePage;
