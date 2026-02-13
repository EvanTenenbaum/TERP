/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Staff Session Console - Live Shopping
 * 
 * Staff-facing interface for managing live shopping sessions.
 * Shows customer's items grouped by status with real-time updates.
 * Allows staff to:
 * - View items by status (Sample Request, Interested, To Purchase)
 * - Update prices in real-time
 * - Move items between statuses
 * - Highlight products for customer attention
 * - Convert session to order
 */

import React, { useState, useCallback } from "react";
import { trpc } from "../../lib/trpc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, DollarSign, Check, X as XIcon } from "lucide-react";

type ItemStatus = "SAMPLE_REQUEST" | "INTERESTED" | "TO_PURCHASE";

interface StaffSessionConsoleProps {
  sessionId: number;
}

const STATUS_CONFIG = {
  SAMPLE_REQUEST: {
    label: "Sample Requests",
    icon: "👁️",
    color: "border-amber-400 bg-amber-50",
    headerBg: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800",
  },
  INTERESTED: {
    label: "Interested / Negotiate",
    icon: "💭",
    color: "border-blue-400 bg-blue-50",
    headerBg: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800",
  },
  TO_PURCHASE: {
    label: "Ready to Purchase",
    icon: "🛒",
    color: "border-green-400 bg-green-50",
    headerBg: "bg-green-500",
    badge: "bg-green-100 text-green-800",
  },
};

export const StaffSessionConsole: React.FC<StaffSessionConsoleProps> = ({
  sessionId,
}) => {
  // BUG-007: State for confirmation dialogs (replaces window.confirm)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);
  const [endSessionDialogOpen, setEndSessionDialogOpen] = useState(false);
  const [convertToOrderOnEnd, setConvertToOrderOnEnd] = useState(false);

  // Price negotiation state
  const [showNegotiations, setShowNegotiations] = useState(true);
  const [counterOfferInputs, setCounterOfferInputs] = useState<Record<number, string>>({});

  // Queries
  const { data: session, isLoading: sessionLoading } = trpc.liveShopping.getSession.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  const { data: itemsByStatus, refetch } = trpc.liveShopping.getItemsByStatus.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
      refetchInterval: 2000, // Real-time polling
    }
  );

  const { data: activeNegotiations, refetch: refetchNegotiations } = trpc.liveShopping.getActiveNegotiations.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
      refetchInterval: 2000, // Real-time polling
    }
  );

  // Mutations
  const updateStatusMutation = trpc.liveShopping.updateItemStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const updatePriceMutation = trpc.liveShopping.setOverridePrice.useMutation({
    onSuccess: () => refetch(),
  });

  const highlightMutation = trpc.liveShopping.highlightProduct.useMutation({
    onSuccess: () => refetch(),
  });

  const removeItemMutation = trpc.liveShopping.removeFromCart.useMutation({
    onSuccess: () => {
      toast.success("Item removed from session");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });

  const endSessionMutation = trpc.liveShopping.endSession.useMutation({
    onError: (error) => {
      toast.error(`Failed to end session: ${error.message}`);
    },
  });

  const respondToNegotiationMutation = trpc.liveShopping.respondToNegotiation.useMutation({
    onSuccess: () => {
      refetch();
      refetchNegotiations();
      setCounterOfferInputs({});
    },
    onError: (error) => {
      toast.error(`Failed to respond to negotiation: ${error.message}`);
    },
  });

  // Handlers
  const handleStatusChange = useCallback(
    (cartItemId: number, newStatus: ItemStatus) => {
      updateStatusMutation.mutate({ sessionId, cartItemId, status: newStatus });
    },
    [sessionId, updateStatusMutation]
  );

  const handlePriceChange = useCallback(
    (productId: number, newPrice: number) => {
      updatePriceMutation.mutate({ sessionId, productId, price: newPrice });
    },
    [sessionId, updatePriceMutation]
  );

  const handleHighlight = useCallback(
    (batchId: number, isHighlighted: boolean) => {
      highlightMutation.mutate({ sessionId, batchId, isHighlighted });
    },
    [sessionId, highlightMutation]
  );

  // BUG-007: Show confirm dialog instead of window.confirm
  const handleRemove = useCallback(
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

  // BUG-007: Show confirm dialog instead of window.confirm
  const handleEndSession = useCallback(
    (convertToOrder: boolean) => {
      setConvertToOrderOnEnd(convertToOrder);
      setEndSessionDialogOpen(true);
    },
    []
  );

  // BUG-007: Actual end session action after confirmation
  const confirmEndSession = useCallback(() => {
    endSessionMutation.mutate(
      { sessionId, convertToOrder: convertToOrderOnEnd },
      {
        onSuccess: (data) => {
          if ('orderId' in data && data.orderId) {
            toast.success(`Order #${data.orderId} created successfully!`);
          } else {
            toast.success("Session ended.");
          }
        },
      }
    );
  }, [sessionId, convertToOrderOnEnd, endSessionMutation]);

  // BUG-007: Handle end session dialog close - reset state
  const handleEndSessionDialogChange = useCallback((open: boolean) => {
    setEndSessionDialogOpen(open);
    if (!open) {
      setConvertToOrderOnEnd(false);
    }
  }, []);

  // Handle price negotiation responses
  const handleRespondToNegotiation = useCallback(
    (cartItemId: number, response: "ACCEPT" | "REJECT" | "COUNTER", counterPrice?: number) => {
      respondToNegotiationMutation.mutate({
        sessionId,
        cartItemId,
        response,
        counterPrice,
      });
    },
    [sessionId, respondToNegotiationMutation]
  );

  if (sessionLoading || !session) {
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
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">
            {session.client?.name || "Client"}
          </h1>
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full ${
              session.status === "ACTIVE"
                ? "bg-red-100 text-red-600 animate-pulse"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            ● {session.status}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary Stats */}
          <div className="flex gap-6 mr-6">
            <div className="text-center">
              <div className="text-xs text-gray-500">Samples</div>
              <div className="text-lg font-bold text-amber-600">
                {totals?.sampleRequestCount || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Interested</div>
              <div className="text-lg font-bold text-blue-600">
                {totals?.interestedCount || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">To Buy</div>
              <div className="text-lg font-bold text-green-600">
                {totals?.toPurchaseCount || 0}
              </div>
            </div>
            <div className="text-center border-l pl-6">
              <div className="text-xs text-gray-500">Purchase Value</div>
              <div className="text-xl font-bold text-green-600">
                ${totals?.toPurchaseValue?.toFixed(2) || "0.00"}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {session.status === "ACTIVE" && (
            <>
              <button
                onClick={() => handleEndSession(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                End Session
              </button>
              <button
                onClick={() => handleEndSession(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow"
              >
                Convert to Order
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6 space-y-6">
        {/* Active Negotiations Panel */}
        {activeNegotiations && activeNegotiations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border-2 border-purple-300">
            <button
              onClick={() => setShowNegotiations(!showNegotiations)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-gray-900">
                  Price Negotiations ({activeNegotiations.length})
                </span>
              </div>
              {showNegotiations ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {showNegotiations && (
              <div className="p-4 space-y-3 border-t">
                {activeNegotiations.map((item: any) => {
                  const negotiation = item.negotiation;
                  const isPending = item.negotiationStatus === "PENDING";
                  const isCounterOffered = item.negotiationStatus === "COUNTER_OFFERED";

                  return (
                    <div
                      key={item.id}
                      className="bg-purple-50 rounded-lg p-3 border border-purple-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.productName}</h4>
                          <p className="text-xs text-gray-500 font-mono">{item.batchCode || `Batch #${item.batchId}`}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            isPending
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {item.negotiationStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                        <div>
                          <span className="text-gray-500">Current:</span>
                          <p className="font-bold">${parseFloat(negotiation?.originalPrice || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Requested:</span>
                          <p className="font-bold text-purple-600">
                            ${parseFloat(negotiation?.proposedPrice || 0).toFixed(2)}
                          </p>
                        </div>
                        {negotiation?.reason && (
                          <div className="col-span-3">
                            <span className="text-gray-500">Reason:</span>
                            <p className="text-sm italic">{negotiation.reason}</p>
                          </div>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespondToNegotiation(item.id, "ACCEPT")}
                            disabled={respondToNegotiationMutation.isPending}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center justify-center gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondToNegotiation(item.id, "REJECT")}
                            disabled={respondToNegotiationMutation.isPending}
                            className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center justify-center gap-1"
                          >
                            <XIcon className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}

                      {isPending && (
                        <div className="mt-2 pt-2 border-t border-purple-200">
                          <p className="text-xs text-gray-600 mb-2">Or make a counter-offer:</p>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                $
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={counterOfferInputs[item.id] || ""}
                                onChange={(e) =>
                                  setCounterOfferInputs((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                placeholder="Counter price"
                                className="w-full pl-8 pr-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const price = parseFloat(counterOfferInputs[item.id] || "0");
                                if (price > 0) {
                                  handleRespondToNegotiation(item.id, "COUNTER", price);
                                } else {
                                  toast.error("Please enter a valid counter-offer price");
                                }
                              }}
                              disabled={respondToNegotiationMutation.isPending}
                              className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                            >
                              Send Counter
                            </button>
                          </div>
                        </div>
                      )}

                      {isCounterOffered && negotiation?.counterPrice && (
                        <div className="mt-2 p-2 bg-purple-100 rounded">
                          <p className="text-xs text-purple-800">
                            Waiting for customer to respond to your counter-offer of{" "}
                            <strong>${negotiation.counterPrice.toFixed(2)}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Three Columns */}
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* Sample Requests Column */}
          <StaffStatusColumn
            status="SAMPLE_REQUEST"
            items={sampleRequests}
            onStatusChange={handleStatusChange}
            onPriceChange={handlePriceChange}
            onHighlight={handleHighlight}
            onRemove={handleRemove}
          />

          {/* Interested Column */}
          <StaffStatusColumn
            status="INTERESTED"
            items={interested}
            onStatusChange={handleStatusChange}
            onPriceChange={handlePriceChange}
            onHighlight={handleHighlight}
            onRemove={handleRemove}
          />

          {/* To Purchase Column */}
          <StaffStatusColumn
            status="TO_PURCHASE"
            items={toPurchase}
            onStatusChange={handleStatusChange}
            onPriceChange={handlePriceChange}
            onHighlight={handleHighlight}
            onRemove={handleRemove}
          />
        </div>
      </div>

      {/* BUG-007: Remove Item Confirmation Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={handleRemoveDialogChange}
        title="Remove Item"
        description="Are you sure you want to remove this item from the session?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveItem}
        isLoading={removeItemMutation.isPending}
      />

      {/* BUG-007: End Session Confirmation Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={endSessionDialogOpen}
        onOpenChange={handleEndSessionDialogChange}
        title={convertToOrderOnEnd ? "Convert to Order" : "End Session"}
        description={
          convertToOrderOnEnd
            ? "Are you sure you want to convert this session to an order?"
            : "Are you sure you want to end this session without creating an order?"
        }
        confirmLabel={convertToOrderOnEnd ? "Convert to Order" : "End Session"}
        variant={convertToOrderOnEnd ? "default" : "destructive"}
        onConfirm={confirmEndSession}
        isLoading={endSessionMutation.isPending}
      />
    </div>
  );
};

// Staff Status Column Component
interface StaffStatusColumnProps {
  status: ItemStatus;
  items: any[];
  onStatusChange: (cartItemId: number, newStatus: ItemStatus) => void;
  onPriceChange: (productId: number, newPrice: number) => void;
  onHighlight: (batchId: number, isHighlighted: boolean) => void;
  onRemove: (cartItemId: number) => void;
}

const StaffStatusColumn: React.FC<StaffStatusColumnProps> = ({
  status,
  items,
  onStatusChange,
  onPriceChange,
  onHighlight,
  onRemove,
}) => {
  const config = STATUS_CONFIG[status];
  const otherStatuses = (Object.keys(STATUS_CONFIG) as ItemStatus[]).filter(
    (s) => s !== status
  );

  return (
    <div className={`flex flex-col rounded-xl border-2 ${config.color} overflow-hidden`}>
      {/* Column Header */}
      <div className={`${config.headerBg} text-white px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <span className="font-semibold">{config.label}</span>
        </div>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-medium">
          {items.length}
        </span>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No items in this category
          </div>
        ) : (
          items.map((item: any) => (
            <StaffItemCard
              key={item.id}
              item={item}
              currentStatus={status}
              otherStatuses={otherStatuses}
              onStatusChange={onStatusChange}
              onPriceChange={onPriceChange}
              onHighlight={onHighlight}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Staff Item Card Component
interface StaffItemCardProps {
  item: any;
  currentStatus: ItemStatus;
  otherStatuses: ItemStatus[];
  onStatusChange: (cartItemId: number, newStatus: ItemStatus) => void;
  onPriceChange: (productId: number, newPrice: number) => void;
  onHighlight: (batchId: number, isHighlighted: boolean) => void;
  onRemove: (cartItemId: number) => void;
}

const StaffItemCard: React.FC<StaffItemCardProps> = ({
  item,
  currentStatus: _currentStatus,
  otherStatuses,
  onStatusChange,
  onPriceChange,
  onHighlight,
  onRemove,
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState<string>(String(item.unitPrice));

  const handlePriceSubmit = () => {
    const newPrice = parseFloat(priceInput);
    if (!isNaN(newPrice) && newPrice > 0) {
      onPriceChange(item.productId, newPrice);
    }
    setIsEditingPrice(false);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-3 border-2 transition-all ${
        item.isHighlighted
          ? "border-indigo-400 ring-2 ring-indigo-200"
          : "border-transparent"
      }`}
    >
      {/* Header Row */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{item.productName}</h4>
          <p className="text-xs text-gray-500 font-mono">{item.batchCode}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => onHighlight(item.batchId, !item.isHighlighted)}
            className={`p-1 rounded ${
              item.isHighlighted
                ? "bg-indigo-100 text-indigo-600"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
            title={item.isHighlighted ? "Remove highlight" : "Highlight for customer"}
          >
            {item.isHighlighted ? "★" : "☆"}
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 rounded bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500"
            title="Remove item"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Quantity and Price Row */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm">
          <span className="text-gray-500">Qty:</span>{" "}
          <span className="font-bold">{parseFloat(item.quantity).toFixed(0)}</span>
        </div>
        <div className="text-right">
          {isEditingPrice ? (
            <div className="flex items-center gap-1">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                className="w-20 border rounded px-2 py-1 text-right text-sm"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                onBlur={handlePriceSubmit}
                onKeyDown={(e) => e.key === "Enter" && handlePriceSubmit()}
                autoFocus
              />
            </div>
          ) : (
            <div
              className="cursor-pointer hover:text-indigo-600 flex items-center justify-end gap-1"
              onClick={() => setIsEditingPrice(true)}
              title="Click to change price"
            >
              <span className="text-lg font-bold">
                ${parseFloat(item.unitPrice).toFixed(2)}
              </span>
              <span className="text-xs text-gray-400">✎</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            Total: ${parseFloat(item.subtotal).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Move to Status Buttons */}
      <div className="flex gap-2">
        {otherStatuses.map((newStatus) => {
          const targetConfig = STATUS_CONFIG[newStatus];
          return (
            <button
              key={newStatus}
              onClick={() => onStatusChange(item.id, newStatus)}
              className={`flex-1 text-xs py-1.5 px-2 rounded ${targetConfig.badge} hover:opacity-80 transition-opacity`}
            >
              {targetConfig.icon} Move to {targetConfig.label.split(" ")[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StaffSessionConsole;
