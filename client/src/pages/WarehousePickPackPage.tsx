/**
 * Warehouse Mobile/Tablet Pick & Pack Page (TER-1225)
 *
 * Mobile/tablet-optimized interface for warehouse workers to fulfill confirmed orders
 * by scanning or tapping batches. Optimized for touch at 768px+ viewport.
 *
 * Features:
 * - List confirmed orders with pending fulfillment
 * - Show line items with batch locations
 * - Large tap targets (min 44px)
 * - Scan or tap to pick items
 * - Pack complete workflow
 * - Minimal text input
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Package,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
  Barcode,
  PackageCheck,
  Truck,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = "PENDING" | "PARTIAL" | "READY" | "SHIPPED";

interface OrderItem {
  id: number;
  productId?: number | null;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  location: string;
  isPacked: boolean;
  bagId: number | null;
  bagIdentifier: string | null;
  packedAt: Date | null;
}

const WarehousePickPackPage: React.FC = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const pickListQuery = trpc.pickPack.getPickList.useQuery({
    filters: { status: "PENDING" },
    limit: 50,
  });

  const orderDetailsQuery = trpc.pickPack.getOrderDetails.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: selectedOrderId !== null }
  );

  const statsQuery = trpc.pickPack.getStats.useQuery();

  // Mutations
  const packItemsMutation = trpc.pickPack.packItems.useMutation({
    onSuccess: () => {
      toast.success("Items packed successfully");
      void pickListQuery.refetch();
      void orderDetailsQuery.refetch();
      void statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to pack items: ${error.message}`);
    },
  });

  const markAllPackedMutation = trpc.pickPack.markAllPacked.useMutation({
    onSuccess: () => {
      toast.success("All items packed");
      void pickListQuery.refetch();
      void orderDetailsQuery.refetch();
      void statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to pack all: ${error.message}`);
    },
  });

  const markReadyMutation = trpc.pickPack.markOrderReady.useMutation({
    onSuccess: () => {
      toast.success("Order marked ready for fulfillment");
      setSelectedOrderId(null);
      void pickListQuery.refetch();
      void statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to mark ready: ${error.message}`);
    },
  });

  // Handlers
  const handleSelectOrder = useCallback((orderId: number) => {
    setSelectedOrderId(orderId);
    setScanInput("");
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedOrderId(null);
    setScanInput("");
  }, []);

  const handleScan = useCallback(() => {
    const trimmed = scanInput.trim();
    if (!trimmed) return;

    // In a real implementation, this would match the scan to a specific item
    // For now, we'll just show a message
    toast.info(`Scanned: ${trimmed}`);
    setScanInput("");
    scanInputRef.current?.focus();
  }, [scanInput]);

  const handlePickItem = useCallback(
    (itemId: number) => {
      if (!selectedOrderId) return;

      packItemsMutation.mutate({
        orderId: selectedOrderId,
        itemIds: [itemId],
      });
    },
    [selectedOrderId, packItemsMutation]
  );

  const handlePackAll = useCallback(() => {
    if (!selectedOrderId) return;

    markAllPackedMutation.mutate({
      orderId: selectedOrderId,
    });
  }, [selectedOrderId, markAllPackedMutation]);

  const handleMarkReady = useCallback(() => {
    if (!selectedOrderId) return;

    markReadyMutation.mutate({
      orderId: selectedOrderId,
    });
  }, [selectedOrderId, markReadyMutation]);

  // Filter orders by search
  const filteredOrders = React.useMemo(() => {
    const orders = pickListQuery.data ?? [];
    if (!searchQuery.trim()) return orders;

    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        (order.clientName?.toLowerCase() ?? "").includes(query)
    );
  }, [pickListQuery.data, searchQuery]);

  const orderDetails = orderDetailsQuery.data;
  const stats = statsQuery.data;

  const unpackedItems = orderDetails?.items.filter((item) => !item.isPacked) ?? [];
  const packedItems = orderDetails?.items.filter((item) => item.isPacked) ?? [];
  const allItemsPacked = unpackedItems.length === 0 && packedItems.length > 0;

  // Auto-focus scan input when order is selected
  useEffect(() => {
    if (selectedOrderId) {
      const timer = setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedOrderId]);

  // Status badge helper
  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const statusConfig: Record<
      OrderStatus,
      { label: string; icon: React.ElementType; className: string }
    > = {
      PENDING: {
        label: "Pending",
        icon: Clock,
        className: "bg-[var(--warning-bg)] text-[var(--warning)] border-yellow-200",
      },
      PARTIAL: {
        label: "Picking",
        icon: Package,
        className: "bg-[var(--info-bg)] text-[var(--info)] border-blue-200",
      },
      READY: {
        label: "Ready",
        icon: CheckCircle,
        className: "bg-[var(--success-bg)] text-[var(--success)] border-green-200",
      },
      SHIPPED: {
        label: "Shipped",
        icon: Truck,
        className: "bg-gray-100 text-gray-700 border-gray-200",
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn("flex items-center gap-2 min-h-[44px] px-4 text-base", config.className)}>
        <Icon className="w-5 h-5" />
        {config.label}
      </Badge>
    );
  };

  // Order list view
  if (!selectedOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pick & Pack</h1>
            <p className="text-gray-600 mt-2">Select an order to start picking</p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-[var(--warning)]">{stats.pending}</div>
                  <div className="text-sm text-gray-600 mt-1">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-[var(--info)]">{stats.partial}</div>
                  <div className="text-sm text-gray-600 mt-1">Picking</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-[var(--success)]">{stats.ready}</div>
                  <div className="text-sm text-gray-600 mt-1">Ready</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-gray-600">{stats.shipped}</div>
                  <div className="text-sm text-gray-600 mt-1">Shipped</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by order number or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 min-h-[52px] text-lg"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px]"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Orders list */}
          <div className="space-y-3">
            {pickListQuery.isLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Loading orders...
                </CardContent>
              </Card>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  {searchQuery ? "No orders match your search" : "No pending orders"}
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => (
                <Card
                  key={order.orderId}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectOrder(order.orderId)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg text-gray-900 truncate">
                          {order.orderNumber}
                        </div>
                        <div className="text-gray-600 mt-1 truncate">{order.clientName}</div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {order.itemCount} items
                          </span>
                          {order.packedCount > 0 && (
                            <span className="flex items-center gap-1 text-[var(--success)]">
                              <CheckCircle className="w-4 h-4" />
                              {order.packedCount} packed
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Order detail view
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Fixed header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBackToList}
            className="mb-4 min-h-[44px] text-base"
          >
            ← Back to Orders
          </Button>

          {orderDetailsQuery.isLoading ? (
            <div className="text-gray-500">Loading order details...</div>
          ) : orderDetails ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {orderDetails.order.orderNumber}
                  </h1>
                  <p className="text-gray-600 mt-1">{orderDetails.order.clientName}</p>
                </div>
                <StatusBadge status={orderDetails.order.pickPackStatus as OrderStatus} />
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>
                    {orderDetails.summary.packedItems} / {orderDetails.summary.totalItems}{" "}
                    items packed
                  </span>
                  <span>
                    {Math.round(
                      (orderDetails.summary.packedItems /
                        orderDetails.summary.totalItems) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-[var(--success)] h-3 rounded-full transition-all"
                    style={{
                      width: `${
                        (orderDetails.summary.packedItems /
                          orderDetails.summary.totalItems) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-destructive">Failed to load order details</div>
          )}
        </div>
      </div>

      {/* Scan input */}
      {orderDetails && (
        <div className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  ref={scanInputRef}
                  type="text"
                  placeholder="Scan barcode or enter item ID..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleScan();
                    }
                  }}
                  className="pl-12 min-h-[52px] text-lg"
                />
              </div>
              <Button
                onClick={handleScan}
                disabled={!scanInput.trim()}
                className="min-h-[52px] min-w-[52px] px-6 text-base"
              >
                Scan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {orderDetails && (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
          {/* Unpacked items */}
          {unpackedItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--warning)]" />
                Items to Pick ({unpackedItems.length})
              </h2>
              <div className="space-y-3">
                {unpackedItems.map((item) => (
                  <Card
                    key={item.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg text-gray-900">
                            {item.productName}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-gray-600">
                            <span className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              Qty: {item.quantity}
                            </span>
                            {item.location && item.location !== "N/A" && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {item.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePickItem(item.id)}
                          disabled={packItemsMutation.isPending}
                          className="min-h-[52px] min-w-[100px] text-base"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Pick
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Packed items */}
          {packedItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                Packed Items ({packedItems.length})
              </h2>
              <div className="space-y-3">
                {packedItems.map((item) => (
                  <Card key={item.id} className="bg-[var(--success-bg)] border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg text-gray-900">
                            {item.productName}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-gray-600">
                            <span className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              Qty: {item.quantity}
                            </span>
                            {item.bagIdentifier && (
                              <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success)] border-green-300">
                                {item.bagIdentifier}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CheckCircle className="w-8 h-8 text-[var(--success)] flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {unpackedItems.length === 0 && packedItems.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No items found for this order</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Fixed action bar */}
      {orderDetails && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:p-6 shadow-lg">
          <div className="max-w-4xl mx-auto flex gap-3">
            {unpackedItems.length > 0 && (
              <Button
                onClick={handlePackAll}
                disabled={markAllPackedMutation.isPending}
                variant="outline"
                className="flex-1 min-h-[56px] text-base"
              >
                <PackageCheck className="w-5 h-5 mr-2" />
                Pack All Items
              </Button>
            )}
            {allItemsPacked && (
              <Button
                onClick={handleMarkReady}
                disabled={markReadyMutation.isPending}
                className="flex-1 min-h-[56px] text-base bg-[var(--success)] hover:bg-[var(--success)]"
              >
                <Truck className="w-5 h-5 mr-2" />
                Mark Ready for Fulfillment
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousePickPackPage;
