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
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // Debounce search query (150ms as per spec)
  const debouncedSearch = useDebounce(searchQuery, 150);

  // Fetch inventory data
  const { data: inventoryData, isLoading } = trpc.inventory.list.useQuery({
    query: debouncedSearch || undefined,
    limit: 100,
  });

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
      qcPending: inventoryData.filter(
        (item) => item.batch?.status === "QC_PENDING"
      ).length,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage batches, track stock levels, and control product lifecycle
          </p>
        </div>
        <Button onClick={() => setShowIntakeModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Intake
        </Button>
      </div>

      {/* Open Tasks Bar */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Awaiting Intake</p>
              <p className="text-2xl font-bold mt-1">{openTasks.awaitingIntake}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">QC Pending</p>
              <p className="text-2xl font-bold mt-1">{openTasks.qcPending}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Quarantined</p>
              <p className="text-2xl font-bold mt-1">{openTasks.quarantined}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">On Hold</p>
              <p className="text-2xl font-bold mt-1">{openTasks.onHold}</p>
            </div>
            <Pause className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold mt-1">{openTasks.lowStock}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Search Bar */}
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
      </div>

      {/* Inventory Table */}
      <Card>
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
                        onClick={() => setShowIntakeModal(true)}
                      >
                        Create First Batch
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                inventoryData.map((item) => {
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* TODO: Add Intake Modal */}
      {/* TODO: Add Batch Detail Drawer */}
    </div>
  );
}

