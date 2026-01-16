/**
 * Warehouse Pick List Component (MEET-075-FE)
 *
 * Displays the pick list for warehouse staff with real-time updates.
 * Shows items grouped by location for efficient picking.
 */
import React, { useState, useEffect, useRef } from "react";
import { trpc } from "../../utils/trpc";

interface WarehousePickListProps {
  sessionId?: number; // If provided, show only this session's pick list
  compact?: boolean;
}

const PRIORITY_COLORS = {
  HIGH: "bg-green-100 text-green-800 border-green-200",
  MEDIUM: "bg-blue-100 text-blue-800 border-blue-200",
  LOW: "bg-amber-100 text-amber-800 border-amber-200",
};

const STATUS_LABELS = {
  SAMPLE_REQUEST: "Sample",
  INTERESTED: "Interested",
  TO_PURCHASE: "To Buy",
};

export const WarehousePickList: React.FC<WarehousePickListProps> = ({
  sessionId,
  compact = false,
}) => {
  const [groupByLocation, setGroupByLocation] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch pick list data
  const { data: pickList, refetch, isLoading } = sessionId
    ? trpc.liveShopping.getSessionPickList.useQuery({ sessionId }, {
        refetchInterval: 5000, // Fallback polling
      })
    : trpc.liveShopping.getConsolidatedPickList.useQuery(undefined, {
        refetchInterval: 5000,
      });

  // SSE connection for real-time updates (warehouse-wide)
  useEffect(() => {
    if (sessionId) return; // Only connect for consolidated view

    const connect = () => {
      const evtSource = new EventSource("/api/sse/warehouse/pick-list");
      eventSourceRef.current = evtSource;

      evtSource.onopen = () => {
        setIsConnected(true);
      };

      evtSource.addEventListener("PICK_LIST_UPDATE", () => {
        refetch();
      });

      evtSource.addEventListener("NEW_PICK_ITEM", () => {
        refetch();
      });

      evtSource.addEventListener("ITEM_REMOVED", () => {
        refetch();
      });

      evtSource.onerror = () => {
        setIsConnected(false);
        evtSource.close();
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [sessionId, refetch]);

  // Get items array based on response type
  const items = sessionId
    ? (pickList as any) || []
    : (pickList as any)?.items || [];

  const summary = !sessionId ? (pickList as any)?.summary : null;

  // Group items by location if enabled
  const groupedItems = React.useMemo(() => {
    if (!groupByLocation || !items.length) return { all: items };

    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const location = item.location || "Unassigned";
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location].push(item);
    }
    return groups;
  }, [items, groupByLocation]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
        Loading pick list...
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Pick List ({items.length} items)
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            {isConnected ? "Live" : "Polling"}
          </span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              No items to pick
            </div>
          ) : (
            items.slice(0, 5).map((item: any) => (
              <div
                key={item.cartItemId}
                className="px-3 py-2 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {item.productName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.location || "No location"} - Qty: {item.quantity}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]}`}>
                  {item.priority}
                </span>
              </div>
            ))
          )}
          {items.length > 5 && (
            <div className="px-3 py-2 text-center text-xs text-gray-400">
              +{items.length - 5} more items
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {sessionId ? "Session Pick List" : "Warehouse Pick List"}
            </h3>
            <p className="text-sm text-gray-500">
              {items.length} items to pick
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={groupByLocation}
                onChange={(e) => setGroupByLocation(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Group by location
            </label>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {isConnected ? "Live Updates" : "Polling"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary (only for consolidated view) */}
      {summary && (
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Sessions:</span>{" "}
              <span className="font-semibold">{Object.keys(summary.bySession).length}</span>
            </div>
            <div>
              <span className="text-gray-500">High Priority:</span>{" "}
              <span className="font-semibold text-green-600">{summary.byPriority.high}</span>
            </div>
            <div>
              <span className="text-gray-500">To Buy:</span>{" "}
              <span className="font-semibold text-green-600">{summary.byStatus.toPurchase}</span>
            </div>
            <div>
              <span className="text-gray-500">Samples:</span>{" "}
              <span className="font-semibold text-amber-600">{summary.byStatus.sampleRequests}</span>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">Empty</div>
            <p>No items in pick list</p>
          </div>
        ) : groupByLocation ? (
          Object.entries(groupedItems).map(([location, locationItems]) => (
            <div key={location} className="border-b border-gray-200 last:border-b-0">
              <div className="px-4 py-2 bg-gray-100 sticky top-0">
                <span className="font-medium text-gray-700">{location}</span>
                <span className="ml-2 text-sm text-gray-500">
                  ({(locationItems as any[]).length} items)
                </span>
              </div>
              {(locationItems as any[]).map((item) => (
                <PickListItem key={item.cartItemId} item={item} />
              ))}
            </div>
          ))
        ) : (
          items.map((item: any) => <PickListItem key={item.cartItemId} item={item} />)
        )}
      </div>
    </div>
  );
};

// Individual Pick List Item
const PickListItem: React.FC<{ item: any }> = ({ item }) => {
  return (
    <div className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{item.productName}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS]
              }`}
            >
              {item.priority}
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-500 flex gap-4">
            <span>Batch: <span className="font-mono">{item.batchCode}</span></span>
            <span>Qty: <span className="font-semibold">{item.quantity}</span></span>
            {item.itemStatus && (
              <span className="text-gray-400">
                {STATUS_LABELS[item.itemStatus as keyof typeof STATUS_LABELS]}
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-600">{item.clientName}</div>
          {item.sessionTitle && (
            <div className="text-xs text-gray-400 truncate max-w-32">{item.sessionTitle}</div>
          )}
        </div>
      </div>
      {/* Location details */}
      <div className="mt-2 text-xs text-gray-400 flex gap-2">
        {item.aisle && <span>Aisle: {item.aisle}</span>}
        {item.shelf && <span>Shelf: {item.shelf}</span>}
        {item.bin && <span>Bin: {item.bin}</span>}
      </div>
    </div>
  );
};

export default WarehousePickList;
