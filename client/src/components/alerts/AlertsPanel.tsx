/**
 * AlertsPanel Component
 * Sprint 4 Track A: 4.A.7 WS-008 - Low Stock & Needs-Based Alerts
 *
 * Features:
 * - Display active alerts with severity indicators
 * - Filter by alert type
 * - Acknowledge alerts
 * - Navigate to related entities
 * - Real-time notification badge
 */

import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Package,
  Users,
  CheckCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertCircle,
    label: "Critical",
  },
  HIGH: {
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertTriangle,
    label: "High",
  },
  MEDIUM: {
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: AlertTriangle,
    label: "Medium",
  },
  LOW: {
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Package,
    label: "Low",
  },
};

const TYPE_CONFIG: Record<string, { icon: typeof AlertCircle; label: string }> = {
  LOW_STOCK: { icon: Package, label: "Low Stock" },
  OUT_OF_STOCK: { icon: AlertCircle, label: "Out of Stock" },
  CLIENT_NEED: { icon: Users, label: "Client Need" },
  VENDOR_HARVEST: { icon: Package, label: "Vendor Harvest" },
  PENDING_VALUATION: { icon: AlertTriangle, label: "Pending Valuation" },
};

interface AlertsPanelProps {
  variant?: "full" | "dropdown" | "compact";
  maxHeight?: string;
}

export const AlertsPanel = memo(function AlertsPanel({
  variant = "full",
  maxHeight = "400px",
}: AlertsPanelProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: alerts, isLoading, refetch } = trpc.alerts.getAll.useQuery(
    {
      type: activeTab !== "all" ? (activeTab as any) : undefined,
      limit: 50,
    },
    { refetchInterval: 30000 }
  );

  const { data: stats } = trpc.alerts.getStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const acknowledgeMutation = trpc.alerts.acknowledge.useMutation({
    onSuccess: () => refetch(),
  });

  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate({ alertId });
  };

  const navigateToEntity = (entityType: string, entityId: number) => {
    switch (entityType) {
      case "batch":
        setLocation(`/inventory/${entityId}`);
        break;
      case "clientNeed":
        setLocation(`/clients?needId=${entityId}`);
        break;
      default:
        break;
    }
  };

  if (variant === "dropdown") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {stats && stats.totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {stats.totalAlerts > 99 ? "99+" : stats.totalAlerts}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="p-3 border-b">
            <h4 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </h4>
          </div>
          <ScrollArea className="h-80">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : alerts?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No active alerts</p>
              </div>
            ) : (
              <div className="divide-y">
                {alerts?.slice(0, 10).map((alert) => {
                  const severity = SEVERITY_CONFIG[alert.severity];
                  const type = TYPE_CONFIG[alert.type] || TYPE_CONFIG.LOW_STOCK;
                  const Icon = type.icon;

                  return (
                    <button
                      key={alert.id}
                      onClick={() => navigateToEntity(alert.entityType, alert.entityId)}
                      className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded ${severity.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{alert.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {alert.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setLocation("/alerts")}
            >
              View All Alerts
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (variant === "compact") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Active Alerts
            </span>
            {stats && (
              <Badge variant={stats.totalAlerts > 0 ? "destructive" : "outline"}>
                {stats.totalAlerts}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>Out of Stock: {stats?.outOfStockCount || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>Critical: {stats?.criticalStockCount || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-yellow-500" />
              <span>Low Stock: {stats?.lowStockCount || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span>Needs: {stats?.pendingNeedsCount || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts
          </span>
          {stats && (
            <div className="flex items-center gap-2 text-sm font-normal">
              <Badge variant={stats.outOfStockCount > 0 ? "destructive" : "outline"}>
                {stats.outOfStockCount} Out of Stock
              </Badge>
              <Badge variant={stats.criticalStockCount > 0 ? "destructive" : "secondary"}>
                {stats.criticalStockCount} Critical
              </Badge>
              <Badge variant={stats.lowStockCount > 0 ? "secondary" : "outline"}>
                {stats.lowStockCount} Low
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="LOW_STOCK">Stock Alerts</TabsTrigger>
            <TabsTrigger value="CLIENT_NEED">Client Needs</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <ScrollArea style={{ maxHeight }}>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : alerts?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">No active alerts</p>
                  <p className="text-sm">Everything looks good!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts?.map((alert) => {
                    const severity = SEVERITY_CONFIG[alert.severity];
                    const type = TYPE_CONFIG[alert.type] || TYPE_CONFIG.LOW_STOCK;
                    const SeverityIcon = severity.icon;
                    const TypeIcon = type.icon;

                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border ${severity.color} flex items-center gap-3`}
                      >
                        <div className="p-2 bg-white/50 rounded">
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{alert.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {type.label}
                            </Badge>
                          </div>
                          <p className="text-sm opacity-80 truncate">
                            {alert.description}
                          </p>
                          <p className="text-xs opacity-60 mt-1">
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateToEntity(alert.entityType, alert.entityId)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
