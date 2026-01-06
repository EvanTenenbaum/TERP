/**
 * Live Shopping Session - Customer Experience
 * 
 * Three-status workflow for products:
 * 1. SAMPLE_REQUEST - Customer wants to see a sample brought out
 * 2. INTERESTED - Customer is interested, may want to negotiate price
 * 3. TO_PURCHASE - Customer intends to buy this item
 * 
 * Features:
 * - Real-time price updates from staff
 * - Drag-and-drop or click to move items between statuses
 * - Visual feedback for price changes
 * - Mobile-optimized interface
 */

import React, { useState, useCallback } from "react";
import { trpc } from "../../lib/trpc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Types
type ItemStatus = "SAMPLE_REQUEST" | "INTERESTED" | "TO_PURCHASE";

interface LiveShoppingSessionProps {
  sessionId: number;
  roomCode: string;
  onClose?: () => void;
}

const STATUS_CONFIG = {
  SAMPLE_REQUEST: {
    label: "Request Sample",
    shortLabel: "Sample",
    icon: "👁️",
    color: "bg-amber-50 border-amber-200",
    headerColor: "bg-amber-100 text-amber-800",
    buttonColor: "bg-amber-500 hover:bg-amber-600",
    description: "I want to see this product",
  },
  INTERESTED: {
    label: "Interested",
    shortLabel: "Interest",
    icon: "💭",
    color: "bg-blue-50 border-blue-200",
    headerColor: "bg-blue-100 text-blue-800",
    buttonColor: "bg-blue-500 hover:bg-blue-600",
    description: "I'm interested, let's discuss",
  },
  TO_PURCHASE: {
    label: "To Purchase",
    shortLabel: "Buy",
    icon: "🛒",
    color: "bg-green-50 border-green-200",
    headerColor: "bg-green-100 text-green-800",
    buttonColor: "bg-green-500 hover:bg-green-600",
    description: "I want to buy this",
  },
};

export const LiveShoppingSession: React.FC<LiveShoppingSessionProps> = ({
  sessionId,
  roomCode,
  onClose,
}) => {
  // Queries
  const { data: itemsByStatus, isLoading, refetch } = trpc.vipPortalLiveShopping.getMyItemsByStatus.useQuery(
    { sessionId },
    { refetchInterval: 3000 } // Poll every 3 seconds for real-time updates
  );

  // Mutations
  const updateStatusMutation = trpc.vipPortalLiveShopping.updateItemStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const removeItemMutation = trpc.vipPortalLiveShopping.removeItem.useMutation({
    onSuccess: () => refetch(),
  });

  const requestCheckoutMutation = trpc.vipPortalLiveShopping.requestCheckout.useMutation();

  // State for price change animations
  const [priceChanges, _setPriceChanges] = useState<Record<number, { oldPrice: string; newPrice: string }>>({});

  // BUG-007: State for remove confirmation dialog (replaces window.confirm)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);

  // Handle status change
  const handleStatusChange = useCallback(
    (cartItemId: number, newStatus: ItemStatus) => {
      updateStatusMutation.mutate({
        sessionId,
        cartItemId,
        status: newStatus,
      });
    },
    [sessionId, updateStatusMutation]
  );

  // BUG-007: Show confirm dialog instead of window.confirm
  const handleRemoveItem = useCallback(
    (cartItemId: number) => {
      setItemToRemove(cartItemId);
      setRemoveDialogOpen(true);
    },
    []
  );

  // BUG-007: Actual remove action after confirmation
  const confirmRemoveItem = useCallback(() => {
    if (itemToRemove !== null) {
      removeItemMutation.mutate({ sessionId, cartItemId: itemToRemove });
    }
    setItemToRemove(null);
  }, [sessionId, itemToRemove, removeItemMutation]);

  // Handle checkout request
  const handleRequestCheckout = useCallback(() => {
    requestCheckoutMutation.mutate(
      { sessionId },
      {
        onSuccess: () => {
          globalThis.alert("Staff has been notified that you're ready to checkout!");
        },
      }
    );
  }, [sessionId, requestCheckoutMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const sampleRequests = itemsByStatus?.sampleRequests || [];
  const interested = itemsByStatus?.interested || [];
  const toPurchase = itemsByStatus?.toPurchase || [];
  const totals = itemsByStatus?.totals;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Live Shopping</h1>
              <p className="text-sm text-gray-500">
                Session: {roomCode?.slice(0, 8)}...
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Ready to Buy</div>
                <div className="text-2xl font-bold text-green-600">
                  ${totals?.toPurchaseValue?.toFixed(2) || "0.00"}
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Status Columns */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sample Requests Column */}
          <StatusColumn
            status="SAMPLE_REQUEST"
            items={sampleRequests}
            count={totals?.sampleRequestCount || 0}
            onStatusChange={handleStatusChange}
            onRemove={handleRemoveItem}
            priceChanges={priceChanges}
          />

          {/* Interested Column */}
          <StatusColumn
            status="INTERESTED"
            items={interested}
            count={totals?.interestedCount || 0}
            onStatusChange={handleStatusChange}
            onRemove={handleRemoveItem}
            priceChanges={priceChanges}
          />

          {/* To Purchase Column */}
          <StatusColumn
            status="TO_PURCHASE"
            items={toPurchase}
            count={totals?.toPurchaseCount || 0}
            onStatusChange={handleStatusChange}
            onRemove={handleRemoveItem}
            priceChanges={priceChanges}
          />
        </div>
      </div>

      {/* Floating Checkout Button */}
      {(totals?.toPurchaseCount || 0) > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <span className="text-gray-600">
                {totals?.toPurchaseCount} items ready to purchase
              </span>
              <span className="ml-4 text-2xl font-bold text-green-600">
                ${totals?.toPurchaseValue?.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleRequestCheckout}
              disabled={requestCheckoutMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50"
            >
              {requestCheckoutMutation.isPending ? "Notifying..." : "Ready to Checkout"}
            </button>
          </div>
        </div>
      )}

      {/* BUG-007: Remove Item Confirmation Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove Item"
        description="Are you sure you want to remove this item from your list?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveItem}
        isLoading={removeItemMutation.isPending}
      />
    </div>
  );
};

// Status Column Component
interface StatusColumnProps {
  status: ItemStatus;
  items: any[];
  count: number;
  onStatusChange: (cartItemId: number, newStatus: ItemStatus) => void;
  onRemove: (cartItemId: number) => void;
  priceChanges: Record<number, { oldPrice: string; newPrice: string }>;
}

const StatusColumn: React.FC<StatusColumnProps> = ({
  status,
  items,
  count,
  onStatusChange,
  onRemove,
  priceChanges,
}) => {
  const config = STATUS_CONFIG[status];
  const otherStatuses = (Object.keys(STATUS_CONFIG) as ItemStatus[]).filter(
    (s) => s !== status
  );

  return (
    <div className={`rounded-lg border-2 ${config.color} overflow-hidden`}>
      {/* Column Header */}
      <div className={`${config.headerColor} px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <span className="font-semibold">{config.label}</span>
        </div>
        <span className="bg-white/50 px-2 py-0.5 rounded-full text-sm font-medium">
          {count}
        </span>
      </div>

      {/* Items List */}
      <div className="p-3 space-y-3 min-h-[200px]">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {config.description}
          </div>
        ) : (
          items.map((item: any) => (
            <ItemCard
              key={item.id}
              item={item}
              currentStatus={status}
              otherStatuses={otherStatuses}
              onStatusChange={onStatusChange}
              onRemove={onRemove}
              priceChange={priceChanges[item.id]}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Item Card Component
interface ItemCardProps {
  item: any;
  currentStatus: ItemStatus;
  otherStatuses: ItemStatus[];
  onStatusChange: (cartItemId: number, newStatus: ItemStatus) => void;
  onRemove: (cartItemId: number) => void;
  priceChange?: { oldPrice: string; newPrice: string };
}

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  currentStatus: _currentStatus,
  otherStatuses,
  onStatusChange,
  onRemove,
  priceChange,
}) => {
  // Note: showActions state reserved for future mobile interaction enhancements
  const [_showActions, _setShowActions] = useState(false);

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-3 border transition-all ${
        item.isHighlighted ? "ring-2 ring-indigo-400 border-indigo-300" : "border-gray-200"
      } ${priceChange ? "animate-pulse bg-yellow-50" : ""}`}
    >
      {/* Product Info */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{item.productName}</h4>
          <p className="text-xs text-gray-500 font-mono">{item.batchCode}</p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="text-gray-400 hover:text-red-500 ml-2"
        >
          ✕
        </button>
      </div>

      {/* Price and Quantity */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm">
          <span className="text-gray-500">Qty:</span>{" "}
          <span className="font-medium">{parseFloat(item.quantity).toFixed(0)}</span>
        </div>
        <div className="text-right">
          {priceChange ? (
            <div className="flex items-center gap-2">
              <span className="text-sm line-through text-gray-400">
                ${parseFloat(priceChange.oldPrice).toFixed(2)}
              </span>
              <span className="text-lg font-bold text-green-600 animate-bounce">
                ${parseFloat(priceChange.newPrice).toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-gray-900">
              ${parseFloat(item.unitPrice).toFixed(2)}
            </span>
          )}
          <div className="text-xs text-gray-500">
            Total: ${parseFloat(item.subtotal).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Status Change Buttons */}
      <div className="flex gap-2">
        {otherStatuses.map((newStatus) => {
          const targetConfig = STATUS_CONFIG[newStatus];
          return (
            <button
              key={newStatus}
              onClick={() => onStatusChange(item.id, newStatus)}
              className={`flex-1 text-xs py-1.5 px-2 rounded text-white transition-all ${targetConfig.buttonColor}`}
            >
              {targetConfig.icon} {targetConfig.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LiveShoppingSession;
