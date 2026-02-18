/**
 * PurchaseOrdersWorkSurface - Work Surface implementation for Purchase Orders
 * UXS-202: Aligns Purchase Orders page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract (Esc to close dialogs, Cmd+Z undo)
 * - Save state indicator (Saved/Saving/Error)
 * - Inspector panel for PO detail editing
 * - "Reward Early, Punish Late" validation
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { z } from "zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  InspectorActions,
  useInspectorPanel,
} from "./InspectorPanel";

// Icons
import {
  Plus,
  Search,
  Trash2,
  ShoppingCart,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Package,
  Calendar,
  Building,
} from "lucide-react";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const _purchaseOrderSchema = z.object({
  supplierClientId: z.number().min(1, "Supplier is required"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  supplierNotes: z.string().optional(),
});

interface LineItem {
  tempId: string; // Unique identifier for React keys
  productId: string;
  quantityOrdered: string;
  unitCost: string;
}

interface POFormData {
  supplierClientId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  notes: string;
  supplierNotes: string;
  items: LineItem[];
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierClientId?: number;
  vendorId?: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  purchaseOrderStatus: string;
  total: string;
  paymentTerms?: string;
  notes?: string;
  vendorNotes?: string;
  version?: number;
  items?: Array<{
    id: number;
    productId: number;
    quantityOrdered: number;
    quantityReceived?: number;
    unitCost: number;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_TERMS_OPTIONS = [
  { value: "Net 15", label: "Net 15" },
  { value: "Net 30", label: "Net 30" },
  { value: "Net 45", label: "Net 45" },
  { value: "Net 60", label: "Net 60" },
  { value: "Due on Receipt", label: "Due on Receipt" },
  { value: "COD", label: "COD" },
];

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  RECEIVING: "bg-yellow-100 text-yellow-800",
  RECEIVED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const PO_STATUSES = [
  "DRAFT",
  "SENT",
  "CONFIRMED",
  "RECEIVING",
  "RECEIVED",
  "CANCELLED",
] as const;
type POStatus = (typeof PO_STATUSES)[number];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleDateString();
  } catch {
    return "Error";
  }
};

const formatCurrency = (amount: string | number | null | undefined): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${(num || 0).toFixed(2)}`;
};

const generateTempId = () =>
  `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createEmptyForm = (): POFormData => ({
  supplierClientId: "",
  orderDate: new Date().toISOString().split("T")[0],
  expectedDeliveryDate: "",
  paymentTerms: "",
  notes: "",
  supplierNotes: "",
  items: [
    {
      tempId: generateTempId(),
      productId: "",
      quantityOrdered: "",
      unitCost: "",
    },
  ],
});

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        PO_STATUS_COLORS[status] || PO_STATUS_COLORS.DRAFT
      )}
    >
      {status}
    </Badge>
  );
}

// ============================================================================
// PO INSPECTOR CONTENT
// ============================================================================

interface POInspectorProps {
  po: PurchaseOrder | null;
  suppliers: Array<{ id: number; name: string }>;
  products: Array<{ id: number; name: string }>;
  onUpdateStatus: (poId: number, status: string) => void;
  onDelete: (poId: number) => void;
}

function POInspectorContent({
  po,
  suppliers,
  products,
  onUpdateStatus,
  onDelete: _onDelete,
}: POInspectorProps) {
  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a purchase order to view details</p>
      </div>
    );
  }

  const supplierName =
    suppliers.find(s => s.id === (po.supplierClientId || po.vendorId))?.name ||
    "Unknown Supplier";

  const lineItems = po.items || [];
  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCost,
    0
  );

  return (
    <div className="space-y-6">
      <InspectorSection title="Order Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="PO Number">
            <p className="font-semibold text-lg">{po.poNumber}</p>
          </InspectorField>
          <InspectorField label="Status">
            <StatusBadge status={po.purchaseOrderStatus} />
          </InspectorField>
        </div>

        <InspectorField label="Supplier">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>{supplierName}</span>
          </div>
        </InspectorField>

        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Order Date">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(po.orderDate)}</span>
            </div>
          </InspectorField>
          {po.expectedDeliveryDate && (
            <InspectorField label="Expected Delivery">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(po.expectedDeliveryDate)}</span>
              </div>
            </InspectorField>
          )}
        </div>

        {po.paymentTerms && (
          <InspectorField label="Payment Terms">
            <span>{po.paymentTerms}</span>
          </InspectorField>
        )}
      </InspectorSection>

      <InspectorSection title={`Line Items (${lineItems.length})`} defaultOpen>
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items</p>
        ) : (
          <div className="space-y-2">
            {lineItems.map((item, index) => {
              const productName =
                products.find(p => p.id === item.productId)?.name ||
                `Product #${item.productId}`;
              return (
                <div
                  key={item.id || index}
                  className="p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantityOrdered} @{" "}
                        {formatCurrency(item.unitCost)}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(item.quantityOrdered * item.unitCost)}
                    </p>
                  </div>
                  {item.quantityReceived !== undefined &&
                    item.quantityReceived > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Received: {item.quantityReceived}
                      </p>
                    )}
                </div>
              );
            })}
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(po.total || lineItemsTotal)}
              </span>
            </div>
          </div>
        )}
      </InspectorSection>

      {(po.notes || po.vendorNotes) && (
        <InspectorSection title="Notes">
          {po.notes && (
            <InspectorField label="Internal Notes">
              <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
            </InspectorField>
          )}
          {po.vendorNotes && (
            <InspectorField label="Supplier Notes">
              <p className="text-sm whitespace-pre-wrap">{po.vendorNotes}</p>
            </InspectorField>
          )}
        </InspectorSection>
      )}

      <InspectorSection title="Update Status">
        <div className="grid grid-cols-2 gap-2">
          {PO_STATUSES.filter(s => s !== po.purchaseOrderStatus).map(status => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => onUpdateStatus(po.id, status)}
              className="justify-start"
            >
              <StatusBadge status={status} />
            </Button>
          ))}
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN WORK SURFACE COMPONENT
// ============================================================================

export function PurchaseOrdersWorkSurface() {
  // Auth
  useAuth(); // Required for authentication check

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null);
  const [formData, setFormData] = useState<POFormData>(createEmptyForm());
  const searchInputRef = useRef<HTMLInputElement>(null); // WS-KB-001: Ref for Cmd+K focus

  // Work Surface hooks
  const {
    saveState: _saveState,
    setSaving,
    setSaved,
    setError,
    SaveStateIndicator,
    isDirty: _isDirty,
  } = useSaveState();
  const inspector = useInspectorPanel();

  // Concurrent edit detection for optimistic locking (UXS-705)
  const {
    handleError: handleConflictError,
    ConflictDialog,
    trackVersion,
  } = useConcurrentEditDetection<PurchaseOrder>({
    entityType: "Purchase Order",
    onRefresh: async () => {
      await refetch();
    },
  });

  // Display settings
  const { data: settingsData } =
    trpc.organizationSettings.getDisplaySettings.useQuery();
  const showExpectedDelivery =
    settingsData?.display?.showExpectedDelivery ?? true;

  // Data queries
  const {
    data: posData,
    refetch,
    isLoading: posLoading,
    error: posError,
  } = trpc.purchaseOrders.getAll.useQuery();
  const pos = useMemo(
    () =>
      Array.isArray(posData)
        ? posData
        : ((posData as unknown as { items?: PurchaseOrder[] })?.items ?? []),
    [posData]
  );

  const { data: suppliersRawData } = trpc.clients.list.useQuery({
    clientTypes: ["seller"],
    limit: 1000,
  });
  const suppliers = useMemo(() => {
    const items = Array.isArray(suppliersRawData)
      ? suppliersRawData
      : ((suppliersRawData as { items?: Array<{ id: number; name: string }> })
          ?.items ?? []);
    return items.map((client: { id: number; name: string }) => ({
      id: client.id,
      name: client.name,
    }));
  }, [suppliersRawData]);

  // BUG-114 FIX: Use product catalogue via PO endpoint for role-safe access
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
  } = trpc.purchaseOrders.products.useQuery({
    limit: 500,
  });
  // Only fire fallback AFTER primary query settles (completes or errors)
  const primarySettled = !productsLoading;
  const primaryEmpty =
    primarySettled && (productsData?.items?.length ?? 0) === 0;
  const { data: productsListFallback } = trpc.productCatalogue.list.useQuery(
    { limit: 500, offset: 0 },
    { enabled: primaryEmpty || productsError }
  );
  const products = useMemo(() => {
    const poItems = productsData?.items ?? [];
    const fallbackItems = productsListFallback?.items ?? [];
    const items = poItems.length > 0 ? poItems : fallbackItems;
    return items
      .filter(
        product =>
          typeof product?.id === "number" &&
          typeof product?.nameCanonical === "string"
      )
      .map(product => ({
        id: product.id,
        name: product.nameCanonical,
      }));
  }, [productsData, productsListFallback]);

  // Selected PO
  const selectedPO = useMemo(
    () => (pos as PurchaseOrder[]).find(po => po.id === selectedPOId) || null,
    [pos, selectedPOId]
  );

  // Mutations
  const createPO = trpc.purchaseOrders.create.useMutation({
    onMutate: () => setSaving("Creating purchase order..."),
    onSuccess: () => {
      toast.success("Purchase order created successfully");
      setSaved();
      refetch();
      setIsCreateDialogOpen(false);
      setFormData(createEmptyForm());
    },
    onError: error => {
      toast.error(error.message || "Failed to create purchase order");
      setError(error.message);
    },
  });

  const deletePO = trpc.purchaseOrders.delete.useMutation({
    onMutate: () => setSaving("Deleting purchase order..."),
    onSuccess: () => {
      toast.success("Purchase order deleted successfully");
      setSaved();
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedPOId(null);
      if (inspector.isOpen) inspector.close();
    },
    onError: error => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        toast.error(error.message || "Failed to delete purchase order");
        setError(error.message);
      }
    },
  });

  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onMutate: () => setSaving("Updating status..."),
    onSuccess: () => {
      toast.success("Status updated successfully");
      setSaved();
      refetch();
    },
    onError: error => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        toast.error(error.message || "Failed to update status");
        setError(error.message);
      }
    },
  });

  // Track version for optimistic locking when PO is selected (UXS-705)
  useEffect(() => {
    if (selectedPO && selectedPO.version !== undefined) {
      trackVersion(selectedPO);
    }
  }, [selectedPO, trackVersion]);

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    // WS-KB-001: Add Cmd+K to focus search
    customHandlers: {
      "cmd+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
    },
    onCancel: () => {
      if (isCreateDialogOpen) {
        setIsCreateDialogOpen(false);
      } else if (isDeleteDialogOpen) {
        setIsDeleteDialogOpen(false);
      } else if (inspector.isOpen) {
        inspector.close();
      }
    },
  });

  // Filter POs
  const filteredPOs = useMemo(() => {
    return (pos as PurchaseOrder[]).filter(po => {
      const supplierId = po.supplierClientId ?? po.vendorId;
      const supplierName = suppliers.find(s => s.id === supplierId)?.name || "";
      const matchesSearch =
        (po.poNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || po.purchaseOrderStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pos, searchQuery, statusFilter, suppliers]);

  // Statistics
  const stats = useMemo(() => {
    const all = pos as PurchaseOrder[];
    return {
      total: all.length,
      draft: all.filter(p => p.purchaseOrderStatus === "DRAFT").length,
      pending: all.filter(p =>
        ["SENT", "CONFIRMED"].includes(p.purchaseOrderStatus)
      ).length,
      receiving: all.filter(p => p.purchaseOrderStatus === "RECEIVING").length,
      totalValue: all.reduce((sum, p) => sum + parseFloat(p.total || "0"), 0),
    };
  }, [pos]);

  // Handlers
  const getSupplierName = (supplierId: number | null | undefined) => {
    if (!supplierId) return "Unknown";
    return suppliers.find(s => s.id === supplierId)?.name || "Unknown";
  };

  const handleCreatePO = () => {
    const items = formData.items
      .filter(item => item.productId && item.quantityOrdered && item.unitCost)
      .map(item => ({
        productId: parseInt(item.productId),
        quantityOrdered: parseFloat(item.quantityOrdered),
        unitCost: parseFloat(item.unitCost),
      }));

    if (!formData.supplierClientId || items.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const invalidItems = items.filter(
      item => item.quantityOrdered <= 0 || item.unitCost < 0
    );
    if (invalidItems.length > 0) {
      toast.error("Quantity must be > 0 and cost cannot be negative");
      return;
    }

    createPO.mutate({
      supplierClientId: parseInt(formData.supplierClientId),
      orderDate: formData.orderDate,
      expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
      paymentTerms: formData.paymentTerms || undefined,
      notes: formData.notes || undefined,
      vendorNotes: formData.supplierNotes || undefined,
      items,
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          tempId: generateTempId(),
          productId: "",
          quantityOrdered: "",
          unitCost: "",
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      });
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: string
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleUpdateStatus = (poId: number, status: string) => {
    updateStatus.mutate({ id: poId, status: status as POStatus });
  };

  const handleDelete = (poId: number) => {
    setSelectedPOId(poId);
    setIsDeleteDialogOpen(true);
  };

  // Render
  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <ShoppingCart className="h-6 w-6" />
            Purchase Orders
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage supplier purchase orders
          </p>
        </div>
        <div className="flex items-center gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Total:{" "}
              <span className="font-semibold text-foreground">
                {stats.total}
              </span>
            </span>
            <span>
              Pending:{" "}
              <span className="font-semibold text-foreground">
                {stats.pending}
              </span>
            </span>
            <span>
              Value:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(stats.totalValue)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search by PO number or supplier... (Cmd+K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PO_STATUSES.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Area */}
        <div
          className={cn(
            "flex-1 overflow-auto transition-all duration-200",
            inspector.isOpen && "mr-96"
          )}
        >
          {posLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="font-medium">Failed to load purchase orders</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {posError.message}
                </p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No purchase orders found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first purchase order"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create PO
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  {showExpectedDelivery && (
                    <TableHead>Expected Delivery</TableHead>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map(po => (
                  <TableRow
                    key={po.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedPOId === po.id && "bg-muted"
                    )}
                    onClick={() => {
                      setSelectedPOId(po.id);
                      inspector.open();
                    }}
                  >
                    <TableCell className="font-medium">
                      {po.poNumber || "-"}
                    </TableCell>
                    <TableCell>
                      {getSupplierName(po.supplierClientId ?? po.vendorId)}
                    </TableCell>
                    <TableCell>{formatDate(po.orderDate)}</TableCell>
                    {showExpectedDelivery && (
                      <TableCell>
                        {formatDate(po.expectedDeliveryDate)}
                      </TableCell>
                    )}
                    <TableCell>
                      <StatusBadge status={po.purchaseOrderStatus || "DRAFT"} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(po.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedPOId(po.id);
                            inspector.open();
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(po.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Inspector Panel */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedPO?.poNumber || "Purchase Order"}
          subtitle={
            selectedPO
              ? getSupplierName(
                  selectedPO.supplierClientId ?? selectedPO.vendorId
                )
              : ""
          }
        >
          <POInspectorContent
            po={selectedPO}
            suppliers={suppliers}
            products={products}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
          />
          {selectedPO && (
            <InspectorActions>
              <Button
                variant="outline"
                onClick={() => handleDelete(selectedPO.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete PO
              </Button>
            </InspectorActions>
          )}
        </InspectorPanel>
      </div>

      {/* Create PO Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                value={formData.supplierClientId}
                onValueChange={value =>
                  setFormData({ ...formData, supplierClientId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem
                      key={supplier.id}
                      value={supplier.id.toString()}
                    >
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className={cn(
                "grid gap-4",
                showExpectedDelivery ? "grid-cols-2" : "grid-cols-1"
              )}
            >
              <div>
                <Label htmlFor="orderDate">Order Date *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={e =>
                    setFormData({ ...formData, orderDate: e.target.value })
                  }
                />
              </div>
              {showExpectedDelivery && (
                <div>
                  <Label htmlFor="expectedDeliveryDate">
                    Expected Delivery
                  </Label>
                  <Input
                    id="expectedDeliveryDate"
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        expectedDeliveryDate: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={value =>
                  setFormData({ ...formData, paymentTerms: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              {formData.items.map((item, index) => (
                <div key={item.tempId} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-5">
                    <Select
                      value={item.productId}
                      onValueChange={value =>
                        handleItemChange(index, "productId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsLoading ? (
                          <SelectItem value="loading-products" disabled>
                            Loading products...
                          </SelectItem>
                        ) : products.length === 0 ? (
                          <SelectItem value="no-products" disabled>
                            No products available
                          </SelectItem>
                        ) : (
                          products.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      min="0.01"
                      step="0.01"
                      value={item.quantityOrdered}
                      onChange={e =>
                        handleItemChange(
                          index,
                          "quantityOrdered",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Unit Cost"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      onChange={e =>
                        handleItemChange(index, "unitCost", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    {formData.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="supplierNotes">Supplier Notes</Label>
              <Textarea
                id="supplierNotes"
                value={formData.supplierNotes}
                onChange={e =>
                  setFormData({ ...formData, supplierNotes: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={createPO.isPending}>
              {createPO.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete PO {selectedPO?.poNumber}? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedPO && deletePO.mutate({ id: selectedPO.id })
              }
              disabled={deletePO.isPending}
            >
              {deletePO.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />
    </div>
  );
}

export default PurchaseOrdersWorkSurface;
