/**
 * Live Shopping Staff Console
 * 
 * Staff-facing interface for managing live shopping sessions.
 * Implements three-status workflow:
 * - SAMPLE_REQUEST: Customer wants to see a sample
 * - INTERESTED: Customer is interested, may negotiate price
 * - TO_PURCHASE: Customer intends to buy
 */
import React, { useState, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { trpc } from "../../utils/trpc";
import { useLiveSessionSSE } from "../../hooks/useLiveSessionSSE";

type ItemStatus = "SAMPLE_REQUEST" | "INTERESTED" | "TO_PURCHASE";

const STATUS_CONFIG = {
  SAMPLE_REQUEST: {
    label: "Sample Requests",
    shortLabel: "Samples",
    icon: "👁️",
    color: "border-amber-400 bg-amber-50",
    headerBg: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800",
    description: "Customer wants to see these items",
  },
  INTERESTED: {
    label: "Interested / Negotiate",
    shortLabel: "Interested",
    icon: "💭",
    color: "border-blue-400 bg-blue-50",
    headerBg: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800",
    description: "Customer may negotiate price",
  },
  TO_PURCHASE: {
    label: "Ready to Purchase",
    shortLabel: "To Buy",
    icon: "🛒",
    color: "border-green-400 bg-green-50",
    headerBg: "bg-green-500",
    badge: "bg-green-100 text-green-800",
    description: "Customer intends to buy",
  },
};

export default function LiveSessionConsole() {
  const router = useRouter();
  const sessionId = router.query.sessionId ? parseInt(router.query.sessionId as string) : null;
  
  // Queries
  const { data: session, isLoading: sessionLoading, refetch: refetchSession } = trpc.liveShopping.getSession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const { data: itemsByStatus, refetch: refetchItems } = trpc.liveShopping.getItemsByStatus.useQuery(
    { sessionId: sessionId! },
    { 
      enabled: !!sessionId,
      refetchInterval: 2000, // Poll for updates until SSE is fully integrated
    }
  );

  // SSE for real-time updates
  const { sessionStatus: sseStatus, connectionStatus } = useLiveSessionSSE(sessionId!);
  
  // Mutations
  const updateStatusMutation = trpc.liveShopping.updateItemStatus.useMutation({
    onSuccess: () => refetchItems(),
  });

  const updatePriceMutation = trpc.liveShopping.setOverridePrice.useMutation({
    onSuccess: () => refetchItems(),
  });

  const highlightMutation = trpc.liveShopping.highlightProduct.useMutation({
    onSuccess: () => refetchItems(),
  });

  const removeItemMutation = trpc.liveShopping.removeFromCart.useMutation({
    onSuccess: () => refetchItems(),
  });

  const updateSessionStatusMutation = trpc.liveShopping.updateSessionStatus.useMutation({
    onSuccess: () => refetchSession(),
  });

  const endSessionMutation = trpc.liveShopping.endSession.useMutation();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Handlers
  const handleStatusChange = useCallback(
    (cartItemId: number, newStatus: ItemStatus) => {
      if (!sessionId) return;
      updateStatusMutation.mutate({ sessionId, cartItemId, status: newStatus });
    },
    [sessionId, updateStatusMutation]
  );

  const handlePriceChange = useCallback(
    (productId: number, newPrice: number) => {
      if (!sessionId) return;
      updatePriceMutation.mutate({ sessionId, productId, price: newPrice });
    },
    [sessionId, updatePriceMutation]
  );

  const handleHighlight = useCallback(
    (batchId: number, isHighlighted: boolean) => {
      if (!sessionId) return;
      highlightMutation.mutate({ sessionId, batchId, isHighlighted });
    },
    [sessionId, highlightMutation]
  );

  const handleRemove = useCallback(
    (cartItemId: number) => {
      if (!sessionId) return;
      if (confirm("Remove this item from the session?")) {
        removeItemMutation.mutate({ sessionId, cartItemId });
      }
    },
    [sessionId, removeItemMutation]
  );

  const handleSessionAction = useCallback(
    (action: "start" | "pause" | "end" | "convert") => {
      if (!sessionId) return;
      
      if (action === "start") {
        updateSessionStatusMutation.mutate({ sessionId, status: "ACTIVE" });
      } else if (action === "pause") {
        updateSessionStatusMutation.mutate({ sessionId, status: "PAUSED" });
      } else if (action === "end") {
        if (confirm("End session without creating an order?")) {
          endSessionMutation.mutate(
            { sessionId, convertToOrder: false },
            { onSuccess: () => router.push("/live-shopping") }
          );
        }
      } else if (action === "convert") {
        const toPurchaseCount = itemsByStatus?.totals?.toPurchaseCount || 0;
        if (toPurchaseCount === 0) {
          alert("Cannot convert to order: No items marked 'To Purchase'. Please have the customer mark items they want to buy.");
          return;
        }
        if (confirm(`Convert ${toPurchaseCount} items to order?`)) {
          endSessionMutation.mutate(
            { sessionId, convertToOrder: true },
            {
              onSuccess: (data) => {
                if ('orderId' in data && data.orderId) {
                  alert(`Order #${data.orderId} created successfully!`);
                }
                router.push("/live-shopping");
              },
              onError: (error) => {
                alert(`Error: ${error.message}`);
              },
            }
          );
        }
      }
    },
    [sessionId, updateSessionStatusMutation, endSessionMutation, itemsByStatus, router]
  );

  // Loading state
  if (!sessionId || sessionLoading || !session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Session Console...</p>
        </div>
      </div>
    );
  }

  const currentStatus = sseStatus || session.status;
  const sampleRequests = itemsByStatus?.sampleRequests || [];
  const interested = itemsByStatus?.interested || [];
  const toPurchase = itemsByStatus?.toPurchase || [];
  const totals = itemsByStatus?.totals;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Head>
        <title>Live: {session.client?.name || "Session"} | TERP</title>
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/live-shopping")}
            className="text-gray-400 hover:text-gray-600"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {session.client?.name || "Client"}
            </h1>
            <p className="text-sm text-gray-500">{session.title || "Live Shopping Session"}</p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full ${
              currentStatus === "ACTIVE"
                ? "bg-red-100 text-red-600 animate-pulse"
                : currentStatus === "PAUSED"
                ? "bg-yellow-100 text-yellow-600"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            ● {currentStatus}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            connectionStatus === "CONNECTED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            {connectionStatus === "CONNECTED" ? "🟢 Live" : "⚪ Connecting..."}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary Stats */}
          <div className="flex gap-6 mr-6 border-r pr-6">
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
          {currentStatus === "SCHEDULED" && (
            <button
              onClick={() => handleSessionAction("start")}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow"
            >
              Start Session
            </button>
          )}
          {currentStatus === "PAUSED" && (
            <button
              onClick={() => handleSessionAction("start")}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow"
            >
              Resume Session
            </button>
          )}
          {currentStatus === "ACTIVE" && (
            <>
              <button
                onClick={() => handleSessionAction("pause")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg"
              >
                Pause
              </button>
              <button
                onClick={() => handleSessionAction("end")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                End Session
              </button>
              <button
                onClick={() => handleSessionAction("convert")}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
              >
                Convert to Order
              </button>
            </>
          )}
        </div>
      </header>

      {/* Product Search Toggle */}
      <div className="bg-white border-b px-6 py-2">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
        >
          {showSearch ? "▼ Hide Product Search" : "▶ Add Products to Session"}
        </button>
        {showSearch && (
          <div className="mt-3 pb-3">
            <input
              type="text"
              placeholder="Search products or batch codes..."
              className="w-full max-w-md border border-gray-300 rounded-lg p-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm.length > 2 && (
              <ProductSearchResults sessionId={sessionId} searchTerm={searchTerm} onAdd={() => refetchItems()} />
            )}
          </div>
        )}
      </div>

      {/* Main Content - Three Columns */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* Sample Requests Column */}
          <StatusColumn
            status="SAMPLE_REQUEST"
            items={sampleRequests}
            onStatusChange={handleStatusChange}
            onPriceChange={handlePriceChange}
            onHighlight={handleHighlight}
            onRemove={handleRemove}
          />

          {/* Interested Column */}
          <StatusColumn
            status="INTERESTED"
            items={interested}
            onStatusChange={handleStatusChange}
            onPriceChange={handlePriceChange}
            onHighlight={handleHighlight}
            onRemove={handleRemove}
          />

          {/* To Purchase Column */}
          <StatusColumn
            status="TO_PURCHASE"
            items={toPurchase}
            onStatusChange={handleStatusChange}
            onPriceChange={handlePriceChange}
            onHighlight={handleHighlight}
            onRemove={handleRemove}
          />
        </div>
      </div>
    </div>
  );
}

// Status Column Component
interface StatusColumnProps {
  status: ItemStatus;
  items: any[];
  onStatusChange: (cartItemId: number, newStatus: ItemStatus) => void;
  onPriceChange: (productId: number, newPrice: number) => void;
  onHighlight: (batchId: number, isHighlighted: boolean) => void;
  onRemove: (cartItemId: number) => void;
}

const StatusColumn: React.FC<StatusColumnProps> = ({
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
      <div className={`${config.headerBg} text-white px-4 py-3`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            <span className="font-semibold">{config.label}</span>
          </div>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-medium">
            {items.length}
          </span>
        </div>
        <p className="text-xs text-white/80 mt-1">{config.description}</p>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No items in this category
          </div>
        ) : (
          items.map((item: any) => (
            <ItemCard
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

// Item Card Component
interface ItemCardProps {
  item: any;
  currentStatus: ItemStatus;
  otherStatuses: ItemStatus[];
  onStatusChange: (cartItemId: number, newStatus: ItemStatus) => void;
  onPriceChange: (productId: number, newPrice: number) => void;
  onHighlight: (batchId: number, isHighlighted: boolean) => void;
  onRemove: (cartItemId: number) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  currentStatus,
  otherStatuses,
  onStatusChange,
  onPriceChange,
  onHighlight,
  onRemove,
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(item.unitPrice?.toString() || "0");

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
            className={`p-1 rounded text-sm ${
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
            className="p-1 rounded bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 text-sm"
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
          <span className="font-bold">{parseFloat(item.quantity || 0).toFixed(0)}</span>
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
                ${parseFloat(item.unitPrice || 0).toFixed(2)}
              </span>
              <span className="text-xs text-gray-400">✎</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            Total: ${parseFloat(item.subtotal || 0).toFixed(2)}
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
              {targetConfig.icon} {targetConfig.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Product Search Results Component
const ProductSearchResults = ({ 
  sessionId, 
  searchTerm,
  onAdd 
}: { 
  sessionId: number; 
  searchTerm: string;
  onAdd: () => void;
}) => {
  const { data: products, isLoading } = trpc.liveShopping.searchProducts.useQuery(
    { query: searchTerm },
    { enabled: searchTerm.length > 2 }
  );

  const addToCartMutation = trpc.liveShopping.addItemWithStatus.useMutation({
    onSuccess: () => onAdd(),
  });

  const [selectedStatus, setSelectedStatus] = useState<ItemStatus>("INTERESTED");

  if (isLoading) return <div className="text-gray-400 text-sm mt-2">Searching...</div>;
  if (!products || products.length === 0) return <div className="text-gray-400 text-sm mt-2">No products found</div>;

  return (
    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">Add as:</span>
        {(Object.keys(STATUS_CONFIG) as ItemStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`text-xs px-2 py-1 rounded ${
              selectedStatus === status
                ? STATUS_CONFIG[status].badge + " font-bold"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].shortLabel}
          </button>
        ))}
      </div>
      {products.map((p: any) => (
        <div
          key={p.batchId}
          className="border rounded-lg p-3 flex justify-between items-center hover:bg-gray-50 transition-colors bg-white"
        >
          <div>
            <div className="font-medium text-gray-900">{p.productName}</div>
            <div className="text-xs text-gray-500 font-mono">Batch: {p.batchCode}</div>
            <div className="text-xs text-gray-500">
              Avail: <span className="font-bold">{p.onHand}</span>
            </div>
          </div>
          <button
            onClick={() =>
              addToCartMutation.mutate({
                sessionId,
                batchId: p.batchId,
                quantity: 1,
                status: selectedStatus,
              })
            }
            disabled={addToCartMutation.isLoading}
            className={`px-3 py-1 rounded text-sm ${STATUS_CONFIG[selectedStatus].badge}`}
          >
            + Add
          </button>
        </div>
      ))}
    </div>
  );
};
