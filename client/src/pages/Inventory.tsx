import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  Search,
  Plus,
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Edit,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { PurchaseModal } from "@/components/inventory/PurchaseModal";
import { BatchDetailDrawer } from "@/components/inventory/BatchDetailDrawer";
import { EditBatchModal } from "@/components/inventory/EditBatchModal";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Debounce search query (150ms as per spec)
  const debouncedSearch = useDebounce(searchQuery, 150);

  // Fetch inventory data
  const { data: inventoryData, isLoading } = trpc.inventory.list.useQuery({
    query: debouncedSearch || undefined,
    limit: 100,
  });

  // Filter inventory by status if filter is active
  const filteredInventory = useMemo(() => {
    if (!inventoryData) return [];
    if (!statusFilter) return inventoryData;
    
    // Special handling for LOW_STOCK filter (not a status)
    if (statusFilter === "LOW_STOCK") {
      return inventoryData.filter((item) => {
        if (!item.batch) return false;
        const onHand = parseFloat(item.batch.onHandQty);
        const reserved = parseFloat(item.batch.reservedQty);
        const quarantine = parseFloat(item.batch.quarantineQty);
        const hold = parseFloat(item.batch.holdQty);
        const available = onHand - reserved - quarantine - hold;
        return available <= 100; // Low stock threshold
      });
    }
    
    return inventoryData.filter((item) => item.batch?.status === statusFilter);
  }, [inventoryData, statusFilter]);

  // Calculate open tasks counters
  const openTasks = useMemo(() => {
    if (!inventoryData) return {
      awaitingIntake: 0,
      qcPending: 0,
      quarantined: 0,
      onHold: 0,
      lowStock: 0,
    };

    return {
      awaitingIntake: inventoryData.filter(
        (item) => item.batch?.status === "AWAITING_INTAKE"
      ).length,
      qcPending: 0, // QC_PENDING status removed
      quarantined: inventoryData.filter(
        (item) => item.batch?.status === "QUARANTINED"
      ).length,
      onHold: inventoryData.filter(
        (item) => item.batch?.status === "ON_HOLD"
      ).length,
      lowStock: inventoryData.filter((item) => {
        if (!item.batch) return false;
        const onHand = parseFloat(item.batch.onHandQty);
        const reserved = parseFloat(item.batch.reservedQty);
        const quarantine = parseFloat(item.batch.quarantineQty);
        const hold = parseFloat(item.batch.holdQty);
        const available = onHand - reserved - quarantine - hold;
        return available <= 100; // Low stock threshold
      }).length,
    };
  }, [inventoryData]);

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      AWAITING_INTAKE: { variant: "secondary", icon: Clock, label: "Awaiting Intake" },
      QC_PENDING: { variant: "secondary", icon: Clock, label: "QC Pending" },
      LIVE: { variant: "default", icon: CheckCircle, label: "Live" },
      ON_HOLD: { variant: "secondary", icon: Pause, label: "On Hold" },
      QUARANTINED: { variant: "destructive", icon: AlertCircle, label: "Quarantined" },
      SOLD_OUT: { variant: "secondary", icon: XCircle, label: "Sold Out" },
      CLOSED: { variant: "secondary", icon: XCircle, label: "Closed" },
    };

    const config = statusConfig[status] || statusConfig.LIVE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Calculate available quantity
  const calculateAvailable = (batch: any) => {
    if (!batch) return 0;
    const onHand = parseFloat(batch.onHandQty);
    const reserved = parseFloat(batch.reservedQty);
    const quarantine = parseFloat(batch.quarantineQty);
    const hold = parseFloat(batch.holdQty);
    return Math.max(0, onHand - reserved - quarantine - hold);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage batches, track stock levels, and control product lifecycle
          </p>
        </div>
        <Button onClick={() => setShowPurchaseModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Purchase
        </Button>
      </div>

      {/* Open Tasks Bar */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card 
          className={`p-4 cursor-pointer transition-colors ${
            statusFilter === "AWAITING_INTAKE" 
              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500" 
              : "hover:bg-muted/50"
          }`}
          onClick={() => setStatusFilter(statusFilter === "AWAITING_INTAKE" ? null : "AWAITING_INTAKE")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Awaiting Intake</p>
              <p className="text-2xl font-bold mt-1">{openTasks.awaitingIntake}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-colors ${
            statusFilter === "QUARANTINED" 
              ? "bg-red-50 border-red-300 ring-2 ring-red-500" 
              : "hover:bg-muted/50"
          }`}
          onClick={() => setStatusFilter(statusFilter === "QUARANTINED" ? null : "QUARANTINED")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Quarantined</p>
              <p className="text-2xl font-bold mt-1">{openTasks.quarantined}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-colors ${
            statusFilter === "ON_HOLD" 
              ? "bg-yellow-50 border-yellow-300 ring-2 ring-yellow-500" 
              : "hover:bg-muted/50"
          }`}
          onClick={() => setStatusFilter(statusFilter === "ON_HOLD" ? null : "ON_HOLD")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">On Hold</p>
              <p className="text-2xl font-bold mt-1">{openTasks.onHold}</p>
            </div>
            <Pause className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-colors ${
            statusFilter === "LOW_STOCK" 
              ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500" 
              : "hover:bg-muted/50"
          }`}
          onClick={() => setStatusFilter(statusFilter === "LOW_STOCK" ? null : "LOW_STOCK")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold mt-1">{openTasks.lowStock}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors opacity-50"
          title="QC Pending status has been removed"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">QC Pending</p>
              <p className="text-2xl font-bold mt-1">{openTasks.qcPending}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Search Bar and Filter Status */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU, batch code, or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {statusFilter && (
          <Button
            variant="outline"
            onClick={() => setStatusFilter(null)}
            className="whitespace-nowrap"
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Active Filter Indicator */}
      {statusFilter && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">
                Showing {filteredInventory.length} {statusFilter === "AWAITING_INTAKE" ? "batches awaiting intake" : statusFilter === "LOW_STOCK" ? "low stock items" : `${statusFilter.toLowerCase().replace("_", " ")} batches`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(null)}
              className="text-blue-600 hover:text-blue-700"
            >
              View All
            </Button>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : !inventoryData || inventoryData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No inventory found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPurchaseModal(true)}
                      >
                        Create First Batch
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const batch = item.batch;
                  const product = item.product;
                  const brand = item.brand;
                  const vendor = item.vendor;

                  if (!batch) return null;

                  const available = calculateAvailable(batch);

                  return (
                    <TableRow
                      key={batch.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedBatch(batch.id)}
                    >
                      <TableCell className="font-mono text-sm">{batch.sku}</TableCell>
                      <TableCell className="font-medium">
                        {product?.nameCanonical || "Unknown"}
                      </TableCell>
                      <TableCell>{brand?.name || "Unknown"}</TableCell>
                      <TableCell>{vendor?.name || "Unknown"}</TableCell>
                      <TableCell>
                        {batch.grade ? (
                          <Badge variant="outline">{batch.grade}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(batch.onHandQty).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(batch.reservedQty).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            available <= 100 ? "text-orange-600 font-semibold" : ""
                          }
                        >
                          {available.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBatch(batch.id);
                            }}
                          >
                            View
                          </Button>
                          {batch.status === "AWAITING_INTAKE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBatch(batch.id);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Intake
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Intake Modal */}
      <PurchaseModal
        open={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          // Refresh the list
        }}
      />

      {/* Batch Detail Drawer */}
      <BatchDetailDrawer
        batchId={selectedBatch}
        open={selectedBatch !== null}
        onClose={() => setSelectedBatch(null)}
      />

      {/* Edit Batch Modal */}
      {editingBatch && (
        <EditBatchModal
          batchId={editingBatch}
          open={editingBatch !== null}
          onClose={() => setEditingBatch(null)}
          onSuccess={() => {
            setEditingBatch(null);
            // Refresh will happen automatically via tRPC cache invalidation
          }}
        />
      )}
    </div>
  );
}

