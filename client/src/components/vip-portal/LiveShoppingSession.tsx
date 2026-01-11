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
 * - Customer product search
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "../../lib/trpc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronUp, Plus, X, Loader2, Wifi, WifiOff } from "lucide-react";
import { useVIPPortalAuth } from "@/hooks/useVIPPortalAuth";

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
  const { sessionToken } = useVIPPortalAuth();

  // SSE connection state
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track price changes for visual feedback
  const [priceAnimations, setPriceAnimations] = useState<Record<number, "up" | "down">>({});
  const prevPricesRef = useRef<Record<number, string>>({});

  // Queries
  const { data: itemsByStatus, isLoading, refetch } = trpc.vipPortalLiveShopping.getMyItemsByStatus.useQuery(
    { sessionId },
    { refetchInterval: 10000 } // Fallback polling every 10 seconds (SSE is primary)
  );

  // SSE Connection for real-time updates
  useEffect(() => {
    if (!roomCode || !sessionToken) return;

    const connect = () => {
      const url = `/api/sse/vip/live-shopping/${roomCode}?token=${encodeURIComponent(sessionToken)}`;
      const evtSource = new EventSource(url);
      eventSourceRef.current = evtSource;

      evtSource.onopen = () => {
        setSseConnected(true);
        console.log("[Customer SSE] Connected");
      };

      // Handle cart updates from staff
      evtSource.addEventListener("CART_UPDATED", () => {
        // Refetch to get accurate grouped data
        refetch();
      });

      // Handle session status changes
      evtSource.addEventListener("SESSION_STATUS", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === "ENDED" || data.status === "CONVERTED") {
            toast.info("Session has ended");
            onClose?.();
          } else if (data.status === "PAUSED") {
            toast.info("Session paused by staff");
          }
        } catch (e) {
          console.error("[SSE] Status parse error", e);
        }
      });

      // Handle highlighted products
      evtSource.addEventListener("HIGHLIGHTED", (event) => {
        try {
          const data = JSON.parse(event.data);
          toast.info(`Staff is highlighting a product!`, {
            duration: 3000,
          });
          refetch();
        } catch (e) {
          console.error("[SSE] Highlight parse error", e);
        }
      });

      evtSource.onerror = () => {
        setSseConnected(false);
        evtSource.close();
        // Reconnect after 3 seconds
        retryTimeoutRef.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [roomCode, sessionToken, refetch, onClose]);

  // Track price changes for visual animation
  useEffect(() => {
    if (!itemsByStatus) return;

    const allItems = [
      ...(itemsByStatus.sampleRequests || []),
      ...(itemsByStatus.interested || []),
      ...(itemsByStatus.toPurchase || []),
    ];

    const newAnimations: Record<number, "up" | "down"> = {};

    allItems.forEach((item: any) => {
      const prevPrice = prevPricesRef.current[item.id];
      const currentPrice = item.unitPrice;

      if (prevPrice && prevPrice !== currentPrice) {
        const prev = parseFloat(prevPrice);
        const curr = parseFloat(currentPrice);
        if (curr > prev) {
          newAnimations[item.id] = "up";
        } else if (curr < prev) {
          newAnimations[item.id] = "down";
        }
      }
      prevPricesRef.current[item.id] = currentPrice;
    });

    if (Object.keys(newAnimations).length > 0) {
      setPriceAnimations(newAnimations);
      // Clear animations after 2 seconds
      setTimeout(() => setPriceAnimations({}), 2000);
    }
  }, [itemsByStatus]);

  // Mutations
  const updateStatusMutation = trpc.vipPortalLiveShopping.updateItemStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const removeItemMutation = trpc.vipPortalLiveShopping.removeItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });

  const requestCheckoutMutation = trpc.vipPortalLiveShopping.requestCheckout.useMutation({
    onError: (error) => {
      toast.error(`Failed to request checkout: ${error.message}`);
    },
  });


  // BUG-007: State for remove confirmation dialog (replaces window.confirm)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);

  // Product search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAddStatus, setSelectedAddStatus] = useState<ItemStatus>("INTERESTED");

  // Product search query
  const { data: searchResults, isLoading: searchLoading } =
    trpc.vipPortalLiveShopping.searchProducts.useQuery(
      { sessionId, query: searchTerm },
      { enabled: searchTerm.length >= 2 }
    );

  // Add item mutation
  const addItemMutation = trpc.vipPortalLiveShopping.addItemWithStatus.useMutation({
    onSuccess: () => {
      toast.success("Item added to session");
      refetch();
      setSearchTerm("");
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

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

  // BUG-007: Handle remove dialog close - reset state
  const handleRemoveDialogChange = useCallback((open: boolean) => {
    setRemoveDialogOpen(open);
    if (!open) {
      setItemToRemove(null);
    }
  }, []);

  // Handle checkout request
  const handleRequestCheckout = useCallback(() => {
    requestCheckoutMutation.mutate(
      { sessionId },
      {
        onSuccess: () => {
          toast.success("Staff has been notified that you're ready to checkout!");
        },
      }
    );
  }, [sessionId, requestCheckoutMutation]);

  // Handle adding item from search
  const handleAddItem = useCallback(
    (batchId: number) => {
      addItemMutation.mutate({
        sessionId,
        batchId,
        quantity: 1,
        status: selectedAddStatus,
      });
    },
    [sessionId, selectedAddStatus, addItemMutation]
  );

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
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Live Shopping</h1>
                <p className="text-sm text-gray-500">
                  Session: {roomCode?.slice(0, 8)}...
                </p>
              </div>
              {/* SSE Connection Status */}
              <span
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  sseConnected
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {sseConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Connecting...
                  </>
                )}
              </span>
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

      {/* Product Search Panel */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">
                Find & Add Products
              </span>
            </div>
            {showSearch ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {showSearch && (
            <div className="px-4 pb-4 border-t">
              {/* Status selector */}
              <div className="flex items-center gap-2 py-3">
                <span className="text-sm text-gray-500">Add items as:</span>
                {(Object.keys(STATUS_CONFIG) as ItemStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedAddStatus(status)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      selectedAddStatus === status
                        ? `${STATUS_CONFIG[status].buttonColor} text-white`
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].shortLabel}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search results */}
              {searchTerm.length >= 2 && (
                <div className="mt-3 max-h-64 overflow-y-auto">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((product: any) => (
                        <div
                          key={product.batchId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {product.productName}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {product.batchCode}
                            </p>
                            <p className="text-xs text-gray-500">
                              Available: {product.available}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddItem(product.batchId)}
                            disabled={addItemMutation.isPending}
                            className={`ml-3 p-2 rounded-lg text-white ${STATUS_CONFIG[selectedAddStatus].buttonColor} disabled:opacity-50`}
                          >
                            {addItemMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500 text-sm">
                      No products found
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
            priceAnimations={priceAnimations}
          />

          {/* Interested Column */}
          <StatusColumn
            status="INTERESTED"
            items={interested}
            count={totals?.interestedCount || 0}
            onStatusChange={handleStatusChange}
            onRemove={handleRemoveItem}
            priceAnimations={priceAnimations}
          />

          {/* To Purchase Column */}
          <StatusColumn
            status="TO_PURCHASE"
            items={toPurchase}
            count={totals?.toPurchaseCount || 0}
            onStatusChange={handleStatusChange}
            onRemove={handleRemoveItem}
            priceAnimations={priceAnimations}
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
        onOpenChange={handleRemoveDialogChange}
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
  priceAnimations: Record<number, "up" | "down">;
}

const StatusColumn: React.FC<StatusColumnProps> = ({
  status,
  items,
  count,
  onStatusChange,
  onRemove,
  priceAnimations,
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
              priceAnimation={priceAnimations[item.id]}
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
  priceAnimation?: "up" | "down";
}

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  currentStatus: _currentStatus,
  otherStatuses,
  onStatusChange,
  onRemove,
  priceAnimation,
}) => {
  // Note: showActions state reserved for future mobile interaction enhancements
  const [_showActions, _setShowActions] = useState(false);

  // UX-013: Fixed undefined priceChange variable - should use priceAnimation prop
  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-3 border transition-all ${
        item.isHighlighted ? "ring-2 ring-indigo-400 border-indigo-300" : "border-gray-200"
      } ${priceAnimation ? "animate-pulse bg-yellow-50" : ""}`}
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
          <span
            className={`text-lg font-bold transition-all duration-300 ${
              priceAnimation === "down"
                ? "text-green-600 animate-pulse"
                : priceAnimation === "up"
                ? "text-red-600 animate-pulse"
                : "text-gray-900"
            }`}
          >
            {priceAnimation === "down" && "↓ "}
            {priceAnimation === "up" && "↑ "}
            ${parseFloat(item.unitPrice).toFixed(2)}
          </span>
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
