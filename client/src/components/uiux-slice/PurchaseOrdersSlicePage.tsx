import { useCallback, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  ClipboardPlus,
  History,
  Plus,
  Search,
  ShoppingCart,
  Truck,
} from "lucide-react";
import GridColumnsPopover, {
  type GridColumnOption,
} from "@/components/uiux-slice/GridColumnsPopover";
import {
  createProductIntakeDraftFromPO,
  upsertProductIntakeDraft,
} from "@/lib/productIntakeDrafts";
import {
  clearGridPreference,
  loadGridPreference,
  saveGridPreference,
  type GridViewMode,
} from "@/lib/gridPreferences";
import { recordFrictionEvent } from "@/lib/navigation/frictionTelemetry";

const statusColor: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-800",
  SENT: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  RECEIVING: "bg-amber-100 text-amber-800",
  RECEIVED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const defaultColumns: GridColumnOption[] = [
  { id: "po", label: "PO", visible: true },
  { id: "supplier", label: "Supplier", visible: true },
  { id: "status", label: "Status", visible: true },
  { id: "orderDate", label: "Order Date", visible: true },
  { id: "expected", label: "Expected", visible: true },
  { id: "total", label: "Total", visible: true },
];

type IntakePickerLine = {
  poItemId: number;
  productId: number;
  productName: string;
  category?: string | null;
  subcategory?: string | null;
  quantityOrdered: number;
  quantityReceived: number;
  remainingQty: number;
  unitCost: number;
  selected: boolean;
  intakeQty: number;
};

type PoLineLike = {
  id: number;
  productId: number;
  productName?: string | null;
  category?: string | null;
  subcategory?: string | null;
  quantityOrdered?: string | number | null;
  quantityReceived?: string | number | null;
  unitCost?: string | number | null;
};

type SupplierLike = {
  id: number;
  name?: string | null;
};

type VendorLike = {
  id: number;
  name?: string | null;
  _clientId?: number | null;
};

type CreatePoItemForm = {
  id: string;
  productId: string;
  quantityOrdered: string;
  unitCost: string;
};

function createPoItemForm(): CreatePoItemForm {
  return {
    id: `po-line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: "",
    quantityOrdered: "",
    unitCost: "",
  };
}

function formatDateCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return value.toLocaleDateString();

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
}

export function PurchaseOrdersSlicePage() {
  const [route, navigate] = useLocation();
  const { user } = useAuth();
  const userId = user?.id;
  const preferenceUserId = route.startsWith("/slice-v1-lab") ? "slice-lab" : userId;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedPoId, setSelectedPoId] = useState<number | null>(null);
  const [selectedPoIds, setSelectedPoIds] = useState<Set<number>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [pickerLines, setPickerLines] = useState<IntakePickerLine[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkPlacing, setBulkPlacing] = useState(false);

  const [viewMode, setViewMode] = useState<GridViewMode>(() => {
    return (
      loadGridPreference("slice-po-list", preferenceUserId)?.viewMode ??
      "COMFORTABLE"
    );
  });

  const [columns, setColumns] = useState<GridColumnOption[]>(() => {
    const pref = loadGridPreference("slice-po-list", preferenceUserId);
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

  const [createForm, setCreateForm] = useState({
    supplierClientId: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    paymentTerms: "",
    notes: "",
    items: [createPoItemForm()],
  });

  const posQuery = trpc.purchaseOrders.getAll.useQuery({});
  const poItems = useMemo(() => {
    const data = posQuery.data;
    if (Array.isArray(data)) return data;
    return data?.items ?? [];
  }, [posQuery.data]);

  const suppliersQuery = trpc.clients.list.useQuery({
    clientTypes: ["seller"],
    limit: 1000,
  });
  const vendorsQuery = trpc.vendors.getAll.useQuery();

  const suppliers = useMemo(() => {
    const data = suppliersQuery.data;
    if (Array.isArray(data)) return data;
    return data?.items ?? [];
  }, [suppliersQuery.data]);

  const vendors = useMemo(() => {
    const data = vendorsQuery.data;
    if (!data || typeof data !== "object") return [];
    const payload = data as Record<string, unknown>;
    if (Array.isArray(payload.data)) {
      return payload.data as VendorLike[];
    }
    if (Array.isArray(payload.items)) {
      return payload.items as VendorLike[];
    }
    return [];
  }, [vendorsQuery.data]);

  const getSupplierName = useCallback(
    (po: {
      supplierClientId?: number | null;
      vendorId?: number | null;
      supplier?: { name?: string | null } | null;
    }) => {
      if (po.supplier?.name?.trim()) return po.supplier.name.trim();

      const supplierByClient = suppliers.find(
        supplier => supplier.id === po.supplierClientId
      ) as SupplierLike | undefined;
      if (supplierByClient?.name?.trim()) return supplierByClient.name.trim();

      const vendorByLegacyId = vendors.find(vendor => vendor.id === po.vendorId);
      if (vendorByLegacyId?.name?.trim()) return vendorByLegacyId.name.trim();

      const vendorByClient = vendors.find(
        vendor =>
          vendor._clientId !== undefined &&
          vendor._clientId !== null &&
          vendor._clientId === po.supplierClientId
      );
      if (vendorByClient?.name?.trim()) return vendorByClient.name.trim();

      if (po.vendorId) return `Vendor #${po.vendorId}`;
      return "Unknown Supplier";
    },
    [suppliers, vendors]
  );

  const productsQuery = trpc.purchaseOrders.products.useQuery({ limit: 500 });
  const products = productsQuery.data?.items ?? [];

  const selectedPoQuery = trpc.purchaseOrders.getByIdWithDetails.useQuery(
    { id: selectedPoId ?? -1 },
    { enabled: !!selectedPoId }
  );

  const locationsQuery = trpc.locations.getAll.useQuery();
  const locations = useMemo(() => {
    const data = locationsQuery.data;
    return Array.isArray(data) ? data : [];
  }, [locationsQuery.data]);

  const activityQuery = trpc.inventoryMovements.getByReference.useQuery(
    {
      referenceType: "PO_RECEIPT",
      referenceId: selectedPoId ?? -1,
    },
    {
      enabled: !!selectedPoId && activityOpen,
    }
  );

  const savePreference = (
    nextColumns: GridColumnOption[],
    nextViewMode: GridViewMode
  ) => {
    saveGridPreference(
      "slice-po-list",
      {
        viewMode: nextViewMode,
        columnOrder: nextColumns.map(c => c.id),
        columnVisibility: Object.fromEntries(nextColumns.map(c => [c.id, c.visible])),
      },
      preferenceUserId
    );
  };

  const resetColumns = () => {
    clearGridPreference("slice-po-list", preferenceUserId);
    setColumns(defaultColumns);
    setViewMode("COMFORTABLE");
  };

  const setColumnsAndPersist = (next: GridColumnOption[]) => {
    setColumns(next);
    savePreference(next, viewMode);
  };

  const setViewModeAndPersist = (next: GridViewMode) => {
    setViewMode(next);
    savePreference(columns, next);
  };

  const visibleColumnIds = new Set(columns.filter(c => c.visible).map(c => c.id));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return poItems.filter(po => {
      const supplierName = getSupplierName(po);
      const matchesSearch =
        !term ||
        (po.poNumber ?? "").toLowerCase().includes(term) ||
        supplierName.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "ALL" || po.purchaseOrderStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [getSupplierName, poItems, search, statusFilter]);

  const selectedPo = selectedPoQuery.data;

  const activePoForIntake = useMemo(() => {
    if (selectedPo) return selectedPo;
    if (selectedPoIds.size !== 1) return null;
    const onlyId = Array.from(selectedPoIds)[0];
    return poItems.find(po => po.id === onlyId) ?? null;
  }, [poItems, selectedPo, selectedPoIds]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every(po => selectedPoIds.has(po.id));

  const selectableDraftIds = useMemo(
    () =>
      Array.from(selectedPoIds).filter(id => {
        const po = poItems.find(item => item.id === id);
        return po?.purchaseOrderStatus === "DRAFT";
      }),
    [poItems, selectedPoIds]
  );

  const createPoMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: async () => {
      toast.success("Purchase Order created");
      setCreateOpen(false);
      setCreateForm({
        supplierClientId: "",
        orderDate: new Date().toISOString().split("T")[0],
        expectedDeliveryDate: "",
        paymentTerms: "",
        notes: "",
        items: [createPoItemForm()],
      });
      await posQuery.refetch();
    },
    onError: e => toast.error(e.message),
  });

  const submitPoMutation = trpc.purchaseOrders.submit.useMutation({
    onError: e => toast.error(e.message),
  });

  const confirmPoMutation = trpc.purchaseOrders.confirm.useMutation({
    onError: e => toast.error(e.message),
  });

  const placeOrder = async (poId: number) => {
    const startedAt = Date.now();
    try {
      await submitPoMutation.mutateAsync({ id: poId });
      await confirmPoMutation.mutateAsync({ id: poId });
      await Promise.all([posQuery.refetch(), selectedPoQuery.refetch()]);
      toast.success("Purchase Order placed");
      recordFrictionEvent({
        event: "flow_complete",
        workflow: "GF-002",
        surface: "purchase-orders",
        step: "place-order",
        stepCount: 1,
        elapsedMs: Date.now() - startedAt,
      });
    } catch {
      recordFrictionEvent({
        event: "dead_end",
        workflow: "GF-002",
        surface: "purchase-orders",
        step: "place-order",
        elapsedMs: Date.now() - startedAt,
      });
      // handled by mutation errors
    }
  };

  const placeOrderBulk = async () => {
    if (selectableDraftIds.length === 0) {
      toast.error("Select at least one Draft PO for bulk placement.");
      return;
    }

    setBulkPlacing(true);
    let successCount = 0;

    for (const poId of selectableDraftIds) {
      try {
        await submitPoMutation.mutateAsync({ id: poId });
        await confirmPoMutation.mutateAsync({ id: poId });
        successCount += 1;
      } catch {
        // continue through remaining POs
      }
    }

    await posQuery.refetch();
    if (selectedPoId) await selectedPoQuery.refetch();

    toast.success(`Placed ${successCount} purchase order(s).`);
    setBulkPlacing(false);
  };

  const openIntakePicker = () => {
    const po = activePoForIntake;
    if (!po) {
      toast.error("Select one Purchase Order first.");
      recordFrictionEvent({
        event: "dead_end",
        workflow: "GF-002",
        surface: "purchase-orders",
        step: "open-intake-picker",
        note: "no-po-selected",
      });
      return;
    }

    const lines = ((po.items ?? []) as PoLineLike[]).map(item => {
      const ordered = Number(item.quantityOrdered ?? 0);
      const received = Number(item.quantityReceived ?? 0);
      const remaining = Math.max(0, ordered - received);
      return {
        poItemId: item.id,
        productId: item.productId,
        productName: item.productName ?? `Product #${item.productId}`,
        category: item.category,
        subcategory: item.subcategory,
        quantityOrdered: ordered,
        quantityReceived: received,
        remainingQty: remaining,
        unitCost: Number(item.unitCost ?? 0),
        selected: remaining > 0,
        intakeQty: remaining,
      } satisfies IntakePickerLine;
    });

    setPickerLines(lines);
    setPickerOpen(true);
    recordFrictionEvent({
      event: "flow_step",
      workflow: "GF-002",
      surface: "purchase-orders",
      step: "open-intake-picker",
      stepCount: 1,
    });
  };

  const createIntakeDraft = () => {
    const startedAt = Date.now();
    const po = activePoForIntake;
    if (!po) return;

    const chosen = pickerLines.filter(l => l.selected && l.intakeQty > 0);
    if (chosen.length === 0) {
      toast.error("Select at least one line with intake quantity.");
      return;
    }

    const invalid = chosen.find(line => line.intakeQty > line.remainingQty);
    if (invalid) {
      toast.error("Intake quantity cannot exceed remaining quantity.");
      return;
    }

    const supplierName =
      getSupplierName(po);

    const defaultWarehouse =
      locations.find(loc => (loc.site ?? "").toLowerCase().includes("main")) ??
      locations[0];

    const draft = createProductIntakeDraftFromPO({
      poId: po.id,
      poNumber: po.poNumber,
      vendorId: po.supplierClientId,
      vendorName: supplierName,
      warehouseId: defaultWarehouse?.id,
      warehouseName: defaultWarehouse?.site ?? "Main Warehouse",
      lines: chosen.map((line, index) => ({
        id: `line-${po.id}-${line.poItemId}-${index}`,
        poItemId: line.poItemId,
        productId: line.productId,
        productName: line.productName,
        brandName: supplierName,
        strainName: line.productName,
        category: line.category,
        subcategory: line.subcategory,
        packaging: line.subcategory,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: line.quantityReceived,
        intakeQty: line.intakeQty,
        unitCost: line.unitCost,
        locationId: defaultWarehouse?.id,
        locationName: defaultWarehouse?.site ?? "Main Warehouse",
        grade: "",
      })),
    });

    const intakeBasePath = route.startsWith("/slice-v1-lab")
      ? "/slice-v1-lab/product-intake"
      : route.startsWith("/slice-v1")
        ? "/slice-v1/product-intake"
        : "/product-intake";

    upsertProductIntakeDraft(draft, preferenceUserId);
    setPickerOpen(false);
    recordFrictionEvent({
      event: "flow_complete",
      workflow: "GF-002",
      surface: "purchase-orders",
      step: "create-intake-draft",
      stepCount: chosen.length + 1,
      elapsedMs: Date.now() - startedAt,
    });
    navigate(`${intakeBasePath}?draftId=${encodeURIComponent(draft.id)}`);
  };

  const createPurchaseOrder = () => {
    if (!createForm.supplierClientId) {
      toast.error("Supplier is required.");
      return;
    }

    const items = createForm.items
      .filter(i => i.productId && i.quantityOrdered && i.unitCost)
      .map(i => ({
        productId: Number(i.productId),
        quantityOrdered: Number(i.quantityOrdered),
        unitCost: Number(i.unitCost),
      }));

    if (items.length === 0) {
      toast.error("At least one line item is required.");
      return;
    }

    createPoMutation.mutate({
      supplierClientId: Number(createForm.supplierClientId),
      orderDate: createForm.orderDate,
      expectedDeliveryDate: createForm.expectedDeliveryDate || undefined,
      paymentTerms: createForm.paymentTerms || undefined,
      notes: createForm.notes || undefined,
      items,
    });
  };

  const rowClass =
    viewMode === "DENSE"
      ? "text-xs"
      : viewMode === "COMFORTABLE"
        ? "text-sm"
        : "text-sm h-14";

  const contextLine = selectedPo
    ? `${selectedPo.poNumber} · ${getSupplierName(selectedPo)} · ${selectedPo.purchaseOrderStatus} · ${selectedPo.items?.length ?? 0} lines · $${Number(selectedPo.total ?? 0).toFixed(2)}`
    : "Select a Purchase Order row to inspect detail context and create Product Intake.";

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Purchase Order to Product Intake routing surface.
        </p>
      </div>

      <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-md">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            placeholder="Search PO or supplier"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="RECEIVING">Receiving</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
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

      <div className="px-6 py-2 border-b flex items-center gap-2 flex-wrap text-sm">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create PO
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => selectedPoId && placeOrder(selectedPoId)}
          disabled={!selectedPoId || submitPoMutation.isPending || confirmPoMutation.isPending}
        >
          <Truck className="h-4 w-4 mr-1" />
          Place Order
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => void placeOrderBulk()}
          disabled={bulkPlacing || selectableDraftIds.length === 0}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          Place Order (Bulk)
        </Button>

        <Button size="sm" onClick={openIntakePicker} disabled={!activePoForIntake}>
          <ClipboardPlus className="h-4 w-4 mr-1" />
          Create Product Intake
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setActivityOpen(true)}
          disabled={!selectedPoId}
        >
          <History className="h-4 w-4 mr-1" />
          Activity Log
        </Button>

        <span className="text-muted-foreground ml-auto">
          {selectedPoIds.size} selected
        </span>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedPoIds(new Set())}
          disabled={selectedPoIds.size === 0}
        >
          Clear
        </Button>
      </div>

      <div className="px-6 py-2 border-b text-xs text-muted-foreground">{contextLine}</div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background border-b z-10">
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="text-left p-2 w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={checked => {
                    if (checked) {
                      setSelectedPoIds(new Set(filtered.map(po => po.id)));
                    } else {
                      setSelectedPoIds(new Set());
                    }
                  }}
                />
              </th>
              {visibleColumnIds.has("po") && <th className="text-left p-2">PO</th>}
              {visibleColumnIds.has("supplier") && <th className="text-left p-2">Supplier</th>}
              {visibleColumnIds.has("status") && <th className="text-left p-2">Status</th>}
              {visibleColumnIds.has("orderDate") && <th className="text-left p-2">Order Date</th>}
              {visibleColumnIds.has("expected") && <th className="text-left p-2">Expected</th>}
              {visibleColumnIds.has("total") && <th className="text-right p-2">Total</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(po => {
              const supplier = getSupplierName(po);
              const checked = selectedPoIds.has(po.id);
              return (
                <tr
                  key={po.id}
                  className={`border-b cursor-pointer hover:bg-muted/20 ${rowClass} ${selectedPoId === po.id ? "bg-muted/20" : ""}`}
                  onClick={() => setSelectedPoId(po.id)}
                >
                  <td className="p-2" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={next => {
                        setSelectedPoIds(prev => {
                          const copy = new Set(prev);
                          if (next) copy.add(po.id);
                          else copy.delete(po.id);
                          return copy;
                        });
                      }}
                    />
                  </td>
                  {visibleColumnIds.has("po") && <td className="p-2">{po.poNumber}</td>}
                  {visibleColumnIds.has("supplier") && <td className="p-2">{supplier}</td>}
                  {visibleColumnIds.has("status") && (
                    <td className="p-2">
                      <Badge className={statusColor[po.purchaseOrderStatus] ?? statusColor.DRAFT}>
                        {po.purchaseOrderStatus}
                      </Badge>
                    </td>
                  )}
                  {visibleColumnIds.has("orderDate") && (
                    <td className="p-2">
                      {formatDateCell(po.orderDate)}
                    </td>
                  )}
                  {visibleColumnIds.has("expected") && (
                    <td className="p-2">{formatDateCell(po.expectedDeliveryDate)}</td>
                  )}
                  {visibleColumnIds.has("total") && (
                    <td className="p-2 text-right">${Number(po.total ?? 0).toFixed(2)}</td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={8}>
                  No purchase orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Drawer open={pickerOpen} onOpenChange={setPickerOpen} direction="right">
        <DrawerContent className="w-[760px] sm:max-w-none">
          <DrawerHeader>
            <DrawerTitle>
              Create Product Intake{activePoForIntake ? ` from ${activePoForIntake.poNumber}` : ""}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Select PO lines and quantities to start a Product Intake draft.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-background border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-2 w-10"></th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">Remaining</th>
                  <th className="text-right p-2">Unit Cost</th>
                  <th className="text-right p-2 w-44">Intake Qty</th>
                </tr>
              </thead>
              <tbody>
                {pickerLines.map(line => (
                  <tr key={line.poItemId} className="border-b text-sm">
                    <td className="p-2">
                      <Checkbox
                        checked={line.selected}
                        onCheckedChange={checked => {
                          setPickerLines(prev =>
                            prev.map(p =>
                              p.poItemId === line.poItemId ? { ...p, selected: !!checked } : p
                            )
                          );
                        }}
                      />
                    </td>
                    <td className="p-2">{line.productName}</td>
                    <td className="p-2 text-right">{line.remainingQty.toFixed(2)}</td>
                    <td className="p-2 text-right">${line.unitCost.toFixed(2)}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        max={line.remainingQty}
                        step="0.01"
                        value={line.intakeQty}
                        onChange={e => {
                          const value = Number(e.target.value || 0);
                          setPickerLines(prev =>
                            prev.map(p =>
                              p.poItemId === line.poItemId
                                ? { ...p, intakeQty: Number.isFinite(value) ? value : 0 }
                                : p
                            )
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DrawerFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setPickerOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createIntakeDraft}>Create Intake Draft</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={activityOpen} onOpenChange={setActivityOpen} direction="right">
        <DrawerContent className="w-[520px] sm:max-w-none">
          <DrawerHeader>
            <DrawerTitle>Activity Log</DrawerTitle>
            <DrawerDescription className="sr-only">
              Movement history for the selected purchase order.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto space-y-2">
            {(activityQuery.data ?? []).map(item => (
              <div key={item.id} className="border-b pb-2 text-sm">
                <p className="font-medium">{item.inventoryMovementType}</p>
                <p className="text-xs text-muted-foreground">Qty {item.quantityChange}</p>
                <p className="text-xs text-muted-foreground">{item.notes ?? "-"}</p>
              </div>
            ))}
            {(activityQuery.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet for this PO.</p>
            )}
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setActivityOpen(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription className="sr-only">
              Create a new purchase order with supplier, dates, and line items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Supplier</Label>
              <Select
                value={createForm.supplierClientId}
                onValueChange={value =>
                  setCreateForm(prev => ({ ...prev, supplierClientId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Order Date</Label>
                <Input
                  type="date"
                  value={createForm.orderDate}
                  onChange={e =>
                    setCreateForm(prev => ({ ...prev, orderDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={createForm.expectedDeliveryDate}
                  onChange={e =>
                    setCreateForm(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Payment Terms</Label>
              <Input
                value={createForm.paymentTerms}
                onChange={e =>
                  setCreateForm(prev => ({ ...prev, paymentTerms: e.target.value }))
                }
                placeholder="Net 30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCreateForm(prev => ({
                      ...prev,
                      items: [...prev.items, createPoItemForm()],
                    }))
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-2">
                {createForm.items.map((line, index) => (
                  <div key={line.id} className="grid grid-cols-[1.4fr_0.6fr_0.6fr_auto] gap-2">
                    <Select
                      value={line.productId}
                      onValueChange={value => {
                        setCreateForm(prev => ({
                          ...prev,
                          items: prev.items.map((item, i) =>
                            i === index ? { ...item, productId: value } : item
                          ),
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.nameCanonical}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Qty"
                      value={line.quantityOrdered}
                      onChange={e => {
                        const value = e.target.value;
                        setCreateForm(prev => ({
                          ...prev,
                          items: prev.items.map((item, i) =>
                            i === index ? { ...item, quantityOrdered: value } : item
                          ),
                        }));
                      }}
                    />

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit Cost"
                      value={line.unitCost}
                      onChange={e => {
                        const value = e.target.value;
                        setCreateForm(prev => ({
                          ...prev,
                          items: prev.items.map((item, i) =>
                            i === index ? { ...item, unitCost: value } : item
                          ),
                        }));
                      }}
                    />

                    <Button
                      variant="ghost"
                      disabled={createForm.items.length <= 1}
                      onClick={() => {
                        setCreateForm(prev => ({
                          ...prev,
                          items: prev.items.filter((_, i) => i !== index),
                        }));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={createForm.notes}
                onChange={e =>
                  setCreateForm(prev => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPurchaseOrder} disabled={createPoMutation.isPending}>
              {createPoMutation.isPending ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PurchaseOrdersSlicePage;
