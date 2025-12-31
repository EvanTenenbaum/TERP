/**
 * WS-003: Pick & Pack Module Page
 * 
 * Warehouse management interface for:
 * - Real-time pick list queue
 * - Multi-select item packing
 * - Bag/container management
 * - Order status tracking
 */

import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Box,
  AlertCircle,
} from "lucide-react";

type PickPackStatus = "PENDING" | "PICKING" | "PACKED" | "READY";

interface OrderItem {
  id: number;
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice?: number;
  location: string;
  isPacked: boolean;
  bagId: number | null;
  bagIdentifier: string | null;
  packedAt: Date | null;
}

interface Bag {
  id: number;
  identifier: string;
  notes: string | null;
  itemCount: number;
  createdAt: Date | null;
}

interface OrderDetails {
  order: {
    id: number;
    orderNumber: string;
    clientId: number;
    clientName: string;
    pickPackStatus: PickPackStatus;
    fulfillmentStatus: string;
    total: string;
    notes: string | null;
    createdAt: Date | null;
  };
  items: OrderItem[];
  bags: Bag[];
  summary: {
    totalItems: number;
    packedItems: number;
    bagCount: number;
  };
}

export default function PickPackPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<PickPackStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch pick list
  const {
    data: pickList,
    isLoading: pickListLoading,
    refetch: refetchPickList,
  } = trpc.pickPack.getPickList.useQuery({
    filters: statusFilter !== "ALL" ? { status: statusFilter } : undefined,
    limit: 50,
  });

  // Fetch stats
  const { data: stats, refetch: refetchStats } = trpc.pickPack.getStats.useQuery();

  // Fetch order details when selected
  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
    refetch: refetchOrderDetails,
  } = trpc.pickPack.getOrderDetails.useQuery(
    { orderId: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );

  // Pack items mutation
  const packItemsMutation = trpc.pickPack.packItems.useMutation({
    onSuccess: () => {
      setSelectedItems([]);
      refetchOrderDetails();
      refetchPickList();
      refetchStats();
    },
  });

  // Mark all packed mutation
  const markAllPackedMutation = trpc.pickPack.markAllPacked.useMutation({
    onSuccess: () => {
      refetchOrderDetails();
      refetchPickList();
      refetchStats();
    },
  });

  // Mark order ready mutation
  const markReadyMutation = trpc.pickPack.markOrderReady.useMutation({
    onSuccess: () => {
      setSelectedOrderId(null);
      refetchPickList();
      refetchStats();
    },
  });

  // Handle item selection
  const toggleItemSelection = (itemId: number) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle select all unpacked items
  const selectAllUnpacked = () => {
    if (orderDetails) {
      const unpackedIds = orderDetails.items
        .filter((item) => !item.isPacked)
        .map((item) => item.id);
      setSelectedItems(unpackedIds);
    }
  };

  // Handle pack selected items
  const handlePackSelected = () => {
    if (selectedOrderId && selectedItems.length > 0) {
      packItemsMutation.mutate({
        orderId: selectedOrderId,
        itemIds: selectedItems,
      });
    }
  };

  // Handle mark all packed
  const handleMarkAllPacked = () => {
    if (selectedOrderId) {
      markAllPackedMutation.mutate({ orderId: selectedOrderId });
    }
  };

  // Handle mark ready
  const handleMarkReady = () => {
    if (selectedOrderId) {
      markReadyMutation.mutate({ orderId: selectedOrderId });
    }
  };

  // Filter pick list by search
  const filteredPickList = pickList?.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Status badge component
  const StatusBadge = ({ status }: { status: PickPackStatus }) => {
    const config = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
      PICKING: { color: "bg-blue-100 text-blue-800", icon: Package, label: "Picking" },
      PACKED: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Packed" },
      READY: { color: "bg-purple-100 text-purple-800", icon: Truck, label: "Ready" },
    };
    const { color, icon: Icon, label } = config[status] || config.PENDING;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Panel: Pick List */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Pick & Pack
            </h1>
            <button
              onClick={() => {
                refetchPickList();
                refetchStats();
              }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-yellow-700">Pending</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{stats.picking}</div>
                <div className="text-xs text-blue-700">Picking</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">{stats.packed}</div>
                <div className="text-xs text-green-700">Packed</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{stats.ready}</div>
                <div className="text-xs text-purple-700">Ready</div>
              </div>
            </div>
          )}

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PickPackStatus | "ALL")}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PICKING">Picking</option>
              <option value="PACKED">Packed</option>
              <option value="READY">Ready</option>
            </select>
          </div>
        </div>

        {/* Order List */}
        <div className="flex-1 overflow-y-auto">
          {pickListLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : filteredPickList?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Package className="w-8 h-8 mb-2" />
              <p>No orders to pick</p>
            </div>
          ) : (
            filteredPickList?.map((order) => (
              <div
                key={order.orderId}
                onClick={() => setSelectedOrderId(order.orderId)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedOrderId === order.orderId ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{order.orderNumber}</span>
                  <StatusBadge status={order.pickPackStatus as PickPackStatus} />
                </div>
                <div className="text-sm text-gray-600 mb-2">{order.clientName}</div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {order.packedCount}/{order.itemCount} items packed
                  </span>
                  <span>{order.bagCount} bags</span>
                </div>
                <div className="mt-2 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${order.itemCount > 0 ? (order.packedCount / order.itemCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Order Details */}
      <div className="flex-1 flex flex-col">
        {!selectedOrderId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Box className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg">Select an order to start packing</p>
            <p className="text-sm">Choose from the list on the left</p>
          </div>
        ) : orderDetailsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : orderDetails ? (
          <>
            {/* Order Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Order {orderDetails.order.orderNumber}
                  </h2>
                  <p className="text-sm text-gray-600">{orderDetails.order.clientName}</p>
                </div>
                <StatusBadge status={orderDetails.order.pickPackStatus} />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Total: ${parseFloat(orderDetails.order.total).toFixed(2)}</span>
                <span>
                  {orderDetails.summary.packedItems}/{orderDetails.summary.totalItems} items packed
                </span>
                <span>{orderDetails.summary.bagCount} bags</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
              <button
                onClick={selectAllUnpacked}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-white"
              >
                Select All Unpacked
              </button>
              <button
                onClick={handlePackSelected}
                disabled={selectedItems.length === 0 || packItemsMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Pack Selected ({selectedItems.length})
              </button>
              <button
                onClick={handleMarkAllPacked}
                disabled={markAllPackedMutation.isPending}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-white"
              >
                Pack All to One Bag
              </button>
              <div className="flex-1" />
              <button
                onClick={handleMarkReady}
                disabled={
                  orderDetails.summary.packedItems < orderDetails.summary.totalItems ||
                  markReadyMutation.isPending
                }
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Mark Ready for Shipping
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Order Items</h3>
              <div className="space-y-2">
                {orderDetails.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.isPacked && toggleItemSelection(item.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      item.isPacked
                        ? "bg-green-50 border-green-200 cursor-default"
                        : selectedItems.includes(item.id)
                        ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          item.isPacked
                            ? "bg-green-500 border-green-500"
                            : selectedItems.includes(item.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {(item.isPacked || selectedItems.includes(item.id)) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        <div className="text-sm text-gray-500">
                          Qty: {item.quantity} • Location: {item.location}
                        </div>
                      </div>

                      {/* Bag Info */}
                      {item.isPacked && item.bagIdentifier && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          {item.bagIdentifier}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bags Section */}
              {orderDetails.bags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Bags</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {orderDetails.bags.map((bag) => (
                      <div
                        key={bag.id}
                        className="p-3 border rounded-lg bg-white"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Box className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{bag.identifier}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {bag.itemCount} items
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <AlertCircle className="w-16 h-16 mb-4 text-red-300" />
            <p className="text-lg">Order not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
