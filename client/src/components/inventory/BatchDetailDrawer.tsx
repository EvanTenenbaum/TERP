import { trpc } from "@/lib/trpc";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Pause,
  MapPin,
  DollarSign,
  Package,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { CogsEditModal } from "./CogsEditModal";
import { ClientInterestWidget } from "./ClientInterestWidget";
import { useState } from "react";

interface BatchDetailDrawerProps {
  batchId: number | null;
  open: boolean;
  onClose: () => void;
}

export function BatchDetailDrawer({ batchId, open, onClose }: BatchDetailDrawerProps) {
  const [showCogsEdit, setShowCogsEdit] = useState(false);
  
  const { data, isLoading, refetch } = trpc.inventory.getById.useQuery(batchId!, {
    enabled: !!batchId && open,
  });

  if (!batchId || !open) return null;

  const batch = data?.batch;
  const locations = data?.locations || [];
  const auditLogs = data?.auditLogs || [];
  const availableQty = data?.availableQty || 0;

  // Get status badge
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
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading batch details...</p>
          </div>
        ) : !batch ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Batch not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <Package className="h-6 w-6" />
                {batch.sku}
              </SheetTitle>
              <SheetDescription>
                Batch Code: {batch.code}
              </SheetDescription>
            </SheetHeader>

            {/* Status */}
            <div>
              {getStatusBadge(batch.status)}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">On Hand</span>
                </div>
                <p className="text-2xl font-bold">{parseFloat(batch.onHandQty).toFixed(2)}</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Available</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{availableQty.toFixed(2)}</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Reserved</span>
                </div>
                <p className="text-2xl font-bold">{parseFloat(batch.reservedQty).toFixed(2)}</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Quarantine</span>
                </div>
                <p className="text-2xl font-bold">{parseFloat(batch.quarantineQty).toFixed(2)}</p>
              </Card>
            </div>

            <Separator />

            {/* Product Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Product Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Grade</p>
                  <p className="font-medium">{batch.grade || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sample</p>
                  <p className="font-medium">{batch.isSample ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* COGS Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <h3 className="font-semibold text-lg">Cost Details</h3>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCogsEdit(true)}
                >
                  Edit COGS
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">COGS Mode</p>
                  <p className="font-medium">{batch.cogsMode}</p>
                </div>
                {batch.cogsMode === "FIXED" && batch.unitCogs && (
                  <div>
                    <p className="text-muted-foreground">Unit COGS</p>
                    <p className="font-medium">${parseFloat(batch.unitCogs).toFixed(2)}</p>
                  </div>
                )}

                {batch.cogsMode === "RANGE" && (
                  <>
                    <div>
                      <p className="text-muted-foreground">COGS Min</p>
                      <p className="font-medium">
                        ${batch.unitCogsMin ? parseFloat(batch.unitCogsMin).toFixed(2) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">COGS Max</p>
                      <p className="font-medium">
                        ${batch.unitCogsMax ? parseFloat(batch.unitCogsMax).toFixed(2) : "N/A"}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">{batch.paymentTerms.replace(/_/g, " ")}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Payment History</h3>
              </div>
              <Card className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Terms:</span>
                    <span className="font-medium">{batch.paymentTerms.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <Badge variant="secondary">Pending</Badge>
                  </div>

                </div>
              </Card>
            </div>

            <Separator />

            {/* Client Interest */}
            <ClientInterestWidget batchId={batchId} />

            <Separator />

            {/* Sales History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Sales History</h3>
              </div>
              <Card className="p-4">
                <div className="text-center text-sm text-muted-foreground">
                  <p>No sales recorded</p>

                </div>
              </Card>
            </div>

            <Separator />

            {/* Locations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Storage Locations</h3>
              </div>
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No locations recorded</p>
              ) : (
                <div className="space-y-2">
                  {locations.map((location) => (
                    <Card key={location.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="text-sm">
                          <p className="font-medium">{location.site}</p>
                          <p className="text-muted-foreground">
                            {[location.zone, location.rack, location.shelf, location.bin]
                              .filter(Boolean)
                              .join(" / ") || "No specific location"}
                          </p>
                        </div>
                        <Badge variant="outline">{parseFloat(location.qty).toFixed(2)}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Audit Trail */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Audit Trail</h3>
              </div>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit logs</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.slice(0, 10).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm">{log.reason || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1">
                Adjust Quantity
              </Button>
              <Button variant="outline" className="flex-1">
                Change Status
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
      
      {/* COGS Edit Modal */}
      {batch && (
        <CogsEditModal
          isOpen={showCogsEdit}
          onClose={() => setShowCogsEdit(false)}
          batchId={batch.id}
          currentCogs={batch.unitCogs || "0"}
          batchCode={batch.code}
          onSuccess={() => {
            refetch();
            setShowCogsEdit(false);
          }}
        />
      )}
    </Sheet>
  );
}

