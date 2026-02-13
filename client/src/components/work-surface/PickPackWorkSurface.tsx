/**
 * PickPackWorkSurface (UXS-402)
 *
 * Work Surface implementation for warehouse pick & pack operations.
 * Integrates keyboard navigation, save state, and inspector panel patterns.
 *
 * Features:
 * - Real-time pick list queue with keyboard navigation
 * - Multi-select item packing with bulk operations
 * - Inspector panel for order and item details
 * - Action bar for pack/ready workflows
 * - Status filtering and search
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  RefreshCw,
  Search,
  Box,
  AlertCircle,
  ChevronRight,
  User,
  DollarSign,
  MapPin,
  Loader2,
  CheckSquare,
  PackageCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useWorkSurfaceKeyboard } from '@/hooks/work-surface/useWorkSurfaceKeyboard';
import { useSaveState } from '@/hooks/work-surface/useSaveState';
import { useConcurrentEditDetection } from '@/hooks/work-surface/useConcurrentEditDetection';
import { InspectorPanel } from '@/components/work-surface/InspectorPanel';
import { WorkSurfaceStatusBar } from '@/components/work-surface/WorkSurfaceStatusBar';

// ============================================================================
// Types
// ============================================================================

type PickPackStatus = 'PENDING' | 'PICKING' | 'PACKED' | 'READY';

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

interface OrderSummary {
  orderId: number;
  orderNumber: string;
  clientName: string;
  pickPackStatus: PickPackStatus;
  itemCount: number;
  packedCount: number;
  bagCount: number;
  createdAt?: Date | null;
}

interface OrderDetails {
  order: {
    id: number;
    orderNumber: string;
    clientId: number;
    clientName: string;
    pickPackStatus: PickPackStatus;
    fulfillmentStatus: string | null;
    total: string;
    notes: string | null;
    createdAt: Date | null;
    version?: number;
  };
  items: OrderItem[];
  bags: Bag[];
  summary: {
    totalItems: number;
    packedItems: number;
    bagCount: number;
  };
}

// Helper type for version tracking
interface PickPackOrderEntity {
  id: number;
  version: number;
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: PickPackStatus }) {
  const config = {
    PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending' },
    PICKING: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package, label: 'Picking' },
    PACKED: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Packed' },
    READY: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck, label: 'Ready' },
  };
  const { color, icon: Icon, label } = config[status] || config.PENDING;

  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', color)}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

// ============================================================================
// Order List Row
// ============================================================================

interface OrderListRowProps {
  order: OrderSummary;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}

function OrderListRow({ order, isSelected, isFocused, onClick }: OrderListRowProps) {
  const progress = order.itemCount > 0
    ? (order.packedCount / order.itemCount) * 100
    : 0;

  return (
    <div
      onClick={onClick}
      data-testid="order-queue-row"
      className={cn(
        'p-4 border-b cursor-pointer transition-colors',
        isSelected && 'bg-blue-50 border-l-4 border-l-blue-500',
        isFocused && !isSelected && 'bg-gray-100 ring-2 ring-inset ring-blue-400',
        !isSelected && !isFocused && 'hover:bg-gray-50'
      )}
      role="row"
      tabIndex={-1}
      aria-selected={isSelected}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{order.orderNumber}</span>
        <StatusBadge status={order.pickPackStatus} />
      </div>
      <div className="text-sm text-gray-600 mb-2">{order.clientName}</div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {order.packedCount}/{order.itemCount} items packed
        </span>
        <span>{order.bagCount} bags</span>
      </div>
      <div className="mt-2 bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Item Row
// ============================================================================

interface ItemRowProps {
  item: OrderItem;
  isSelected: boolean;
  isFocused: boolean;
  onToggle: () => void;
  onInspect: () => void;
}

function ItemRow({ item, isSelected, isFocused, onToggle, onInspect }: ItemRowProps) {
  return (
    <div
      onClick={() => !item.isPacked && onToggle()}
      onDoubleClick={onInspect}
      className={cn(
        'p-3 border rounded-lg transition-all',
        item.isPacked
          ? 'bg-green-50 border-green-200 cursor-default'
          : isSelected
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 cursor-pointer'
          : 'bg-white hover:bg-gray-50 cursor-pointer',
        isFocused && 'ring-2 ring-blue-400'
      )}
      role="row"
      tabIndex={-1}
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-3">
        {/* Selection checkbox */}
        <div
          className={cn(
            'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
            item.isPacked
              ? 'bg-green-500 border-green-500'
              : isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300'
          )}
        >
          {(item.isPacked || isSelected) && (
            <CheckCircle className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{item.productName}</div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>Qty: {item.quantity}</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.location}
            </span>
          </div>
        </div>

        {/* Bag indicator */}
        {item.isPacked && item.bagIdentifier && (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            {item.bagIdentifier}
          </Badge>
        )}

        {/* Inspect button */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Item Inspector
// ============================================================================

interface ItemInspectorProps {
  item: OrderItem;
  onClose: () => void;
}

function ItemInspector({ item, onClose }: ItemInspectorProps) {
  return (
    <InspectorPanel title="Item Details" onClose={onClose}>
      <div className="space-y-6">
        {/* Product Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Product</h4>
          <p className="text-lg font-semibold">{item.productName}</p>
          {item.productId && (
            <p className="text-sm text-gray-500">ID: {item.productId}</p>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Quantity</h4>
            <p className="text-lg font-semibold">{item.quantity}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Location</h4>
            <p className="text-lg font-semibold flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {item.location}
            </p>
          </div>
          {item.unitPrice && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Unit Price</h4>
              <p className="text-lg font-semibold">${item.unitPrice.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
          {item.isPacked ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <PackageCheck className="w-5 h-5" />
                <span className="font-medium">Packed</span>
              </div>
              {item.bagIdentifier && (
                <p className="text-sm text-green-600 mt-1">
                  Bag: {item.bagIdentifier}
                </p>
              )}
              {item.packedAt && (
                <p className="text-sm text-green-600 mt-1">
                  Packed: {new Date(item.packedAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Not Packed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </InspectorPanel>
  );
}

// ============================================================================
// Order Inspector
// ============================================================================

interface OrderInspectorProps {
  order: OrderDetails['order'];
  summary: OrderDetails['summary'];
  bags: Bag[];
  onClose: () => void;
}

function OrderInspector({ order, summary, bags, onClose }: OrderInspectorProps) {
  return (
    <InspectorPanel title="Order Details" onClose={onClose}>
      <div className="space-y-6">
        {/* Order Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">{order.orderNumber}</p>
            <StatusBadge status={order.pickPackStatus} />
          </div>
        </div>

        {/* Client */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Client</h4>
          <p className="font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            {order.clientName}
          </p>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Total</h4>
            <p className="text-lg font-semibold flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {parseFloat(order.total).toFixed(2)}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Created</h4>
            <p className="text-sm">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleDateString()
                : '-'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Packing Progress</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{
                  width: `${summary.totalItems > 0
                    ? (summary.packedItems / summary.totalItems) * 100
                    : 0}%`
                }}
              />
            </div>
            <span className="text-sm font-medium">
              {summary.packedItems}/{summary.totalItems}
            </span>
          </div>
        </div>

        {/* Bags */}
        {bags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              Bags ({bags.length})
            </h4>
            <div className="space-y-2">
              {bags.map((bag) => (
                <div
                  key={bag.id}
                  className="p-3 border rounded-lg bg-gray-50 flex items-center gap-3"
                >
                  <Box className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{bag.identifier}</p>
                    <p className="text-sm text-gray-500">{bag.itemCount} items</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {order.notes}
            </p>
          </div>
        )}
      </div>
    </InspectorPanel>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PickPackWorkSurface() {
  // State
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<PickPackStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedOrderIndex, setFocusedOrderIndex] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const [focusZone, setFocusZone] = useState<'list' | 'items'>('list');
  const [inspectorMode, setInspectorMode] = useState<'item' | 'order' | null>(null);
  const [inspectedItemId, setInspectedItemId] = useState<number | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const {
    data: pickList,
    isLoading: pickListLoading,
    refetch: refetchPickList,
  } = trpc.pickPack.getPickList.useQuery({
    filters: statusFilter !== 'ALL' ? { status: statusFilter } : undefined,
    limit: 50,
  });

  const { data: stats, refetch: refetchStats } = trpc.pickPack.getStats.useQuery();

  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
    refetch: refetchOrderDetails,
  } = trpc.pickPack.getOrderDetails.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: !!selectedOrderId }
  );

  // Save state
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();

  // Concurrent edit detection for optimistic locking (UXS-705)
  const {
    handleError: handleConflictError,
    ConflictDialog,
    trackVersion,
  } = useConcurrentEditDetection<PickPackOrderEntity>({
    entityType: "Order",
    onRefresh: async () => {
      await refetchOrderDetails();
      await refetchPickList();
    },
  });

  // Track version when order details are loaded (UXS-705)
  // Cast to access version if available from API response
  useEffect(() => {
    if (orderDetails?.order) {
      const order = orderDetails.order as typeof orderDetails.order & { version?: number };
      if (order.version !== undefined) {
        trackVersion({ id: order.id, version: order.version });
      }
    }
  }, [orderDetails, trackVersion]);

  // Mutations
  const packItemsMutation = trpc.pickPack.packItems.useMutation({
    onMutate: () => setSaving(),
    onSuccess: () => {
      setSelectedItems([]);
      refetchOrderDetails();
      refetchPickList();
      refetchStats();
      setSaved();
      toast.success('Items packed successfully');
    },
    onError: (error: { message: string }) => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        setError(error.message || 'Failed to pack items');
        toast.error(`Failed to pack items: ${error.message}`);
      }
    },
  });

  const markAllPackedMutation = trpc.pickPack.markAllPacked.useMutation({
    onMutate: () => setSaving(),
    onSuccess: () => {
      refetchOrderDetails();
      refetchPickList();
      refetchStats();
      setSaved();
      toast.success('All items packed');
    },
    onError: (error: { message: string }) => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        setError(error.message || 'Failed to pack items');
        toast.error(`Failed to pack items: ${error.message}`);
      }
    },
  });

  const markReadyMutation = trpc.pickPack.markOrderReady.useMutation({
    onMutate: () => setSaving(),
    onSuccess: () => {
      setSelectedOrderId(null);
      refetchPickList();
      refetchStats();
      setSaved();
      toast.success('Order marked ready for shipping');
    },
    onError: (error: { message: string }) => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        setError(error.message || 'Failed to mark ready');
        toast.error(`Failed to mark ready: ${error.message}`);
      }
    },
  });

  // Filter pick list
  const filteredPickList = useMemo(() => {
    if (!pickList) return [];
    return pickList.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pickList, searchQuery]);

  // Get unpacked items for current order
  const unpackedItems = useMemo(() => {
    if (!orderDetails) return [];
    return orderDetails.items.filter((item) => !item.isPacked);
  }, [orderDetails]);

  // Handlers
  const handleSelectOrder = useCallback((orderId: number) => {
    setSelectedOrderId(orderId);
    setSelectedItems([]);
    setFocusZone('items');
    setFocusedItemIndex(0);
  }, []);

  const toggleItemSelection = useCallback((itemId: number) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const selectAllUnpacked = useCallback(() => {
    if (orderDetails) {
      const unpackedIds = orderDetails.items
        .filter((item) => !item.isPacked)
        .map((item) => item.id);
      setSelectedItems(unpackedIds);
    }
  }, [orderDetails]);

  const handlePackSelected = useCallback(() => {
    if (selectedOrderId && selectedItems.length > 0) {
      packItemsMutation.mutate({
        orderId: selectedOrderId,
        itemIds: selectedItems,
      });
    }
  }, [selectedOrderId, selectedItems, packItemsMutation]);

  const handleMarkAllPacked = useCallback(() => {
    if (selectedOrderId) {
      markAllPackedMutation.mutate({ orderId: selectedOrderId });
    }
  }, [selectedOrderId, markAllPackedMutation]);

  const handleMarkReady = useCallback(() => {
    if (selectedOrderId) {
      markReadyMutation.mutate({ orderId: selectedOrderId });
    }
  }, [selectedOrderId, markReadyMutation]);

  const openItemInspector = useCallback((itemId: number) => {
    setInspectedItemId(itemId);
    setInspectorMode('item');
  }, []);

  const openOrderInspector = useCallback(() => {
    setInspectorMode('order');
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorMode(null);
    setInspectedItemId(null);
  }, []);

  // Keyboard configuration
  const keyboardConfig = useMemo(() => ({
    customHandlers: {
      arrowup: () => {
        if (focusZone === 'list') {
          setFocusedOrderIndex((prev) => Math.max(0, prev - 1));
        } else if (orderDetails) {
          setFocusedItemIndex((prev) => Math.max(0, prev - 1));
        }
      },
      arrowdown: () => {
        if (focusZone === 'list') {
          setFocusedOrderIndex((prev) =>
            Math.min(filteredPickList.length - 1, prev + 1)
          );
        } else if (orderDetails) {
          setFocusedItemIndex((prev) =>
            Math.min(orderDetails.items.length - 1, prev + 1)
          );
        }
      },
      arrowleft: () => {
        if (focusZone === 'items') {
          setFocusZone('list');
        }
      },
      arrowright: () => {
        if (focusZone === 'list' && selectedOrderId) {
          setFocusZone('items');
        }
      },
      enter: () => {
        if (focusZone === 'list' && filteredPickList[focusedOrderIndex]) {
          handleSelectOrder(filteredPickList[focusedOrderIndex].orderId);
        } else if (focusZone === 'items' && orderDetails?.items[focusedItemIndex]) {
          const item = orderDetails.items[focusedItemIndex];
          if (!item.isPacked) {
            toggleItemSelection(item.id);
          }
        }
      },
      tab: () => {
        if (focusZone === 'list') {
          setFocusZone('items');
        } else {
          setFocusZone('list');
        }
      },
      'cmd+k': () => {
        searchInputRef.current?.focus();
      },
      'ctrl+k': () => {
        searchInputRef.current?.focus();
      },
      ' ': () => {
        if (focusZone === 'items' && orderDetails?.items[focusedItemIndex]) {
          const item = orderDetails.items[focusedItemIndex];
          if (!item.isPacked) {
            toggleItemSelection(item.id);
          }
        }
      },
      'p': () => handlePackSelected(),
      'a': () => selectAllUnpacked(),
      'r': () => handleMarkReady(),
      'i': () => {
        if (focusZone === 'items' && orderDetails?.items[focusedItemIndex]) {
          openItemInspector(orderDetails.items[focusedItemIndex].id);
        } else if (selectedOrderId) {
          openOrderInspector();
        }
      },
    },
    onCancel: () => {
      if (inspectorMode) {
        closeInspector();
      } else if (focusZone === 'items') {
        setFocusZone('list');
        setSelectedItems([]);
      } else {
        setSelectedOrderId(null);
      }
    },
    containerRef,
  }), [
    focusZone,
    focusedOrderIndex,
    focusedItemIndex,
    filteredPickList,
    orderDetails,
    selectedOrderId,
    inspectorMode,
    handleSelectOrder,
    toggleItemSelection,
    closeInspector,
    handlePackSelected,
    selectAllUnpacked,
    handleMarkReady,
    openItemInspector,
    openOrderInspector,
    containerRef,
  ]);

  useWorkSurfaceKeyboard(keyboardConfig);

  // Get inspected item
  const inspectedItem = useMemo(() => {
    if (inspectorMode === 'item' && inspectedItemId && orderDetails) {
      return orderDetails.items.find((item) => item.id === inspectedItemId);
    }
    return null;
  }, [inspectorMode, inspectedItemId, orderDetails]);

  // Status counts
  const statusCounts = useMemo(() => ({
    pending: stats?.pending || 0,
    picking: stats?.picking || 0,
    packed: stats?.packed || 0,
    ready: stats?.ready || 0,
  }), [stats]);

  return (
    <div ref={containerRef} className="flex h-full bg-gray-50" tabIndex={0}>
      {/* Left Panel: Pick List */}
      <div className="w-1/3 border-r bg-white flex flex-col min-w-[320px]">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Pick & Pack
            </h1>
            <div className="flex items-center gap-2">
              {SaveStateIndicator}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  refetchPickList();
                  refetchStats();
                }}
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">{statusCounts.pending}</div>
              <div className="text-xs text-yellow-700">Pending</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{statusCounts.picking}</div>
              <div className="text-xs text-blue-700">Picking</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{statusCounts.packed}</div>
              <div className="text-xs text-green-700">Packed</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{statusCounts.ready}</div>
              <div className="text-xs text-purple-700">Ready</div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                data-testid="pick-pack-search-input"
                placeholder="Search orders... (Cmd+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PickPackStatus | 'ALL')}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PICKING">Picking</SelectItem>
                <SelectItem value="PACKED">Packed</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Order List */}
        <div
          className="flex-1 overflow-y-auto"
          role="listbox"
          data-testid="order-queue"
        >
          {pickListLoading ? (
            <div className="flex items-center justify-center h-32" data-testid="order-queue-loading">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : filteredPickList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500" data-testid="order-queue-empty">
              <Package className="w-8 h-8 mb-2" />
              <p>No orders to pick</p>
            </div>
          ) : (
            filteredPickList.map((order, index) => (
              <OrderListRow
                key={order.orderId}
                order={order}
                isSelected={selectedOrderId === order.orderId}
                isFocused={focusZone === 'list' && focusedOrderIndex === index}
                onClick={() => handleSelectOrder(order.orderId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Order Details */}
      <div className="flex-1 flex flex-col">
        {!selectedOrderId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Box className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Select an order to start packing</p>
            <p className="text-sm">Use arrow keys to navigate, Enter to select</p>
          </div>
        ) : orderDetailsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : orderDetails ? (
          <>
            {/* Order Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Order {orderDetails.order.orderNumber}
                    </h2>
                    <p className="text-sm text-gray-600">{orderDetails.order.clientName}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={openOrderInspector}>
                    View Details
                  </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllUnpacked}
                disabled={unpackedItems.length === 0}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All (A)
              </Button>
              <Button
                size="sm"
                onClick={handlePackSelected}
                disabled={selectedItems.length === 0 || packItemsMutation.isPending}
              >
                {packItemsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Package className="w-4 h-4 mr-2" />
                )}
                Pack Selected (P) ({selectedItems.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPacked}
                disabled={unpackedItems.length === 0 || markAllPackedMutation.isPending}
              >
                Pack All to One Bag
              </Button>
              <div className="flex-1" />
              <Button
                variant="default"
                size="sm"
                onClick={handleMarkReady}
                disabled={
                  orderDetails.summary.packedItems < orderDetails.summary.totalItems ||
                  markReadyMutation.isPending
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {markReadyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4 mr-2" />
                )}
                Mark Ready (R)
              </Button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Order Items ({orderDetails.items.length})
              </h3>
              <div className="space-y-2" role="listbox">
                {orderDetails.items.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.includes(item.id)}
                    isFocused={focusZone === 'items' && focusedItemIndex === index}
                    onToggle={() => toggleItemSelection(item.id)}
                    onInspect={() => openItemInspector(item.id)}
                  />
                ))}
              </div>

              {/* Bags Section */}
              {orderDetails.bags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Bags ({orderDetails.bags.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {orderDetails.bags.map((bag) => (
                      <Card key={bag.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Box className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{bag.identifier}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {bag.itemCount} items
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Bar */}
            <WorkSurfaceStatusBar
              left={`Zone: ${focusZone === 'list' ? 'Order List' : 'Items'}`}
              center={`${selectedItems.length} items selected`}
              right="↑↓ Navigate • Space Select • P Pack • R Ready • I Inspect"
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <AlertCircle className="w-16 h-16 mb-4 text-red-300" />
            <p className="text-lg">Order not found</p>
          </div>
        )}
      </div>

      {/* Inspector Panel */}
      {inspectorMode === 'item' && inspectedItem && (
        <ItemInspector item={inspectedItem} onClose={closeInspector} />
      )}
      {inspectorMode === 'order' && orderDetails && (
        <OrderInspector
          order={orderDetails.order}
          summary={orderDetails.summary}
          bags={orderDetails.bags}
          onClose={closeInspector}
        />
      )}

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />
    </div>
  );
}

export default PickPackWorkSurface;
