/**
 * AlertsPage - System alerts and notifications dashboard
 * NAV-017: Add Missing /alerts Route
 *
 * Features:
 * - Low stock alerts
 * - Critical stock warnings
 * - Out of stock alerts
 * - Client needs notifications
 * - Alert acknowledgment
 */

import { useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  AlertTriangle,
  Package,
  Users,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type AlertType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "CLIENT_NEED"
  | "VENDOR_HARVEST"
  | "PENDING_VALUATION";
type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: Severity;
  entityType: string;
  entityId: number;
  createdAt: Date | string;
  acknowledgedAt?: Date | string;
  acknowledgedBy?: number;
  metadata?: Record<string, unknown>;
}

const severityColors: Record<Severity, string> = {
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

const typeIcons: Record<string, ReactNode> = {
  LOW_STOCK: <Package className="h-4 w-4" />,
  OUT_OF_STOCK: <AlertTriangle className="h-4 w-4" />,
  CLIENT_NEED: <Users className="h-4 w-4" />,
  VENDOR_HARVEST: <Package className="h-4 w-4" />,
  PENDING_VALUATION: <Package className="h-4 w-4" />,
};

export default function AlertsPage() {
  const [, setLocation] = useLocation();
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");
  const [lowStockThreshold, setLowStockThreshold] = useState(50);
  const [criticalStockThreshold, setCriticalStockThreshold] = useState(10);

  const {
    data: alerts,
    isLoading,
    refetch,
  } = trpc.alerts.getAll.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    lowStockThreshold,
    criticalStockThreshold,
    limit: 100,
  });

  const { data: stats, isLoading: statsLoading } =
    trpc.alerts.getStats.useQuery({
      lowStockThreshold,
      criticalStockThreshold,
    });

  const acknowledgeMutation = trpc.alerts.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Alert acknowledged");
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to acknowledge alert");
    },
  });

  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate({ alertId });
  };

  const handleNavigateToEntity = (alert: Alert) => {
    if (alert.entityType === "batch") {
      setLocation(`/inventory/${alert.entityId}`);
    } else if (alert.entityType === "clientNeed") {
      setLocation("/needs");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Alerts
          </h1>
          <p className="text-muted-foreground">
            Monitor stock levels, client needs, and system notifications
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.outOfStockCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Critical Stock
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats?.criticalStockCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Package className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats?.lowStockCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client Needs</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.pendingNeedsCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Alert Type</Label>
              <Select
                value={typeFilter}
                onValueChange={v => setTypeFilter(v as AlertType | "all")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                  <SelectItem value="CLIENT_NEED">Client Needs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Low Stock Threshold</Label>
              <Input
                type="number"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Number(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <Label className="text-xs">Critical Stock Threshold</Label>
              <Input
                type="number"
                value={criticalStockThreshold}
                onChange={e =>
                  setCriticalStockThreshold(Number(e.target.value))
                }
                min={0}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setTypeFilter("all");
                  setLowStockThreshold(50);
                  setCriticalStockThreshold(10);
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Active Alerts ({alerts?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : alerts?.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">No Active Alerts</p>
              <p className="text-muted-foreground">
                All stock levels are within acceptable ranges
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts?.map(alert => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {typeIcons[alert.type] || <Bell className="h-4 w-4" />}
                        <span className="text-xs font-mono">{alert.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={severityColors[alert.severity]}
                      >
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(alert.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigateToEntity(alert)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
