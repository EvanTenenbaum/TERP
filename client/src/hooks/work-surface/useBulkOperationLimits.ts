/**
 * useBulkOperationLimits Hook (UXS-803)
 *
 * Prevents UI freeze from large bulk operations.
 * Enforces selection and update limits.
 *
 * Limits:
 * - Selection: 500 items max
 * - Update: 100 items per request
 *
 * @see ATOMIC_UX_STRATEGY.md for bulk operation requirements
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface BulkOperationLimits {
  /** Maximum items that can be selected at once */
  maxSelection: number;
  /** Maximum items per update request */
  maxPerRequest: number;
  /** Maximum total items for bulk operations */
  maxBulkTotal: number;
}

export interface BulkOperationState<T = unknown> {
  /** Currently selected items */
  selectedItems: T[];
  /** Number of selected items */
  selectedCount: number;
  /** Whether selection is at max */
  isAtSelectionLimit: boolean;
  /** Whether an operation is in progress */
  isProcessing: boolean;
  /** Progress of current operation (0-100) */
  progress: number;
  /** Current batch being processed */
  currentBatch: number;
  /** Total batches */
  totalBatches: number;
}

export interface UseBulkOperationLimitsOptions {
  /** Custom limits */
  limits?: Partial<BulkOperationLimits>;
  /** Callback when selection limit is reached */
  onSelectionLimitReached?: () => void;
  /** Callback when operation limit warning */
  onOperationLimitWarning?: (count: number, limit: number) => void;
  /** Show toast notifications */
  showToasts?: boolean;
}

export interface UseBulkOperationLimitsReturn<T> {
  /** Current state */
  state: BulkOperationState<T>;
  /** Select an item */
  select: (item: T) => boolean;
  /** Deselect an item */
  deselect: (item: T) => void;
  /** Toggle item selection */
  toggle: (item: T) => boolean;
  /** Select multiple items */
  selectMany: (items: T[]) => number;
  /** Select all items (up to limit) */
  selectAll: (items: T[]) => number;
  /** Clear selection */
  clearSelection: () => void;
  /** Check if item is selected */
  isSelected: (item: T) => boolean;
  /** Execute bulk operation with batching */
  executeBulk: <R>(
    operation: (batch: T[]) => Promise<R>,
    options?: { onBatchComplete?: (results: R[], batch: number) => void }
  ) => Promise<R[]>;
  /** Check if count exceeds limit */
  checkLimit: (count: number) => boolean;
  /** Get items that can be selected */
  getSelectableCount: (available: T[]) => number;
  /** Limits in use */
  limits: BulkOperationLimits;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMITS: BulkOperationLimits = {
  maxSelection: 500,
  maxPerRequest: 100,
  maxBulkTotal: 1000,
};

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for managing bulk operations with limits
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   select,
 *   toggle,
 *   selectAll,
 *   clearSelection,
 *   executeBulk,
 * } = useBulkOperationLimits<Product>();
 *
 * // Select items
 * products.forEach(p => select(p));
 *
 * // Execute bulk update
 * await executeBulk(async (batch) => {
 *   return api.updateProducts(batch);
 * });
 * ```
 */
export function useBulkOperationLimits<T>(
  options: UseBulkOperationLimitsOptions = {},
  getItemId: (item: T) => string | number = (item: any) => item.id
): UseBulkOperationLimitsReturn<T> {
  const {
    limits: customLimits,
    onSelectionLimitReached,
    onOperationLimitWarning,
    showToasts = true,
  } = options;

  const limits: BulkOperationLimits = {
    ...DEFAULT_LIMITS,
    ...customLimits,
  };

  const [selectedMap, setSelectedMap] = useState<Map<string | number, T>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  // Ref for cancelation
  const cancelRef = useRef(false);

  // Derive state
  const state = useMemo((): BulkOperationState<T> => ({
    selectedItems: Array.from(selectedMap.values()),
    selectedCount: selectedMap.size,
    isAtSelectionLimit: selectedMap.size >= limits.maxSelection,
    isProcessing,
    progress,
    currentBatch,
    totalBatches,
  }), [selectedMap, limits.maxSelection, isProcessing, progress, currentBatch, totalBatches]);

  // Select single item
  const select = useCallback((item: T): boolean => {
    const id = getItemId(item);

    if (selectedMap.has(id)) {
      return true; // Already selected
    }

    if (selectedMap.size >= limits.maxSelection) {
      if (showToasts) {
        toast.warning(`Selection limit reached (${limits.maxSelection} items)`);
      }
      onSelectionLimitReached?.();
      return false;
    }

    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.set(id, item);
      return next;
    });

    return true;
  }, [selectedMap, limits.maxSelection, showToasts, onSelectionLimitReached, getItemId]);

  // Deselect item
  const deselect = useCallback((item: T): void => {
    const id = getItemId(item);
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, [getItemId]);

  // Toggle selection
  const toggle = useCallback((item: T): boolean => {
    const id = getItemId(item);
    if (selectedMap.has(id)) {
      deselect(item);
      return false;
    }
    return select(item);
  }, [selectedMap, select, deselect, getItemId]);

  // Select multiple items
  const selectMany = useCallback((items: T[]): number => {
    const available = limits.maxSelection - selectedMap.size;
    const toSelect = items.slice(0, available);

    if (toSelect.length < items.length) {
      if (showToasts) {
        toast.warning(
          `Only selected ${toSelect.length} of ${items.length} items (limit: ${limits.maxSelection})`
        );
      }
      onOperationLimitWarning?.(items.length, limits.maxSelection);
    }

    setSelectedMap((prev) => {
      const next = new Map(prev);
      toSelect.forEach((item) => {
        next.set(getItemId(item), item);
      });
      return next;
    });

    return toSelect.length;
  }, [selectedMap, limits.maxSelection, showToasts, onOperationLimitWarning, getItemId]);

  // Select all (up to limit)
  const selectAll = useCallback((items: T[]): number => {
    const toSelect = items.slice(0, limits.maxSelection);

    if (toSelect.length < items.length) {
      if (showToasts) {
        toast.info(
          `Selected ${toSelect.length} items (limit: ${limits.maxSelection})`
        );
      }
    }

    setSelectedMap(() => {
      const next = new Map<string | number, T>();
      toSelect.forEach((item) => {
        next.set(getItemId(item), item);
      });
      return next;
    });

    return toSelect.length;
  }, [limits.maxSelection, showToasts, getItemId]);

  // Clear selection
  const clearSelection = useCallback((): void => {
    setSelectedMap(new Map());
  }, []);

  // Check if selected
  const isSelected = useCallback((item: T): boolean => {
    return selectedMap.has(getItemId(item));
  }, [selectedMap, getItemId]);

  // Check limit
  const checkLimit = useCallback((count: number): boolean => {
    return count <= limits.maxBulkTotal;
  }, [limits.maxBulkTotal]);

  // Get selectable count
  const getSelectableCount = useCallback((available: T[]): number => {
    return Math.min(available.length, limits.maxSelection - selectedMap.size);
  }, [selectedMap, limits.maxSelection]);

  // Execute bulk operation with batching
  const executeBulk = useCallback(async <R>(
    operation: (batch: T[]) => Promise<R>,
    batchOptions?: { onBatchComplete?: (results: R[], batch: number) => void }
  ): Promise<R[]> => {
    const items = Array.from(selectedMap.values());

    if (items.length === 0) {
      return [];
    }

    if (!checkLimit(items.length)) {
      if (showToasts) {
        toast.error(`Cannot process ${items.length} items (limit: ${limits.maxBulkTotal})`);
      }
      throw new Error(`Bulk operation limit exceeded: ${items.length} > ${limits.maxBulkTotal}`);
    }

    // Calculate batches
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += limits.maxPerRequest) {
      batches.push(items.slice(i, i + limits.maxPerRequest));
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentBatch(0);
    setTotalBatches(batches.length);
    cancelRef.current = false;

    const results: R[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        if (cancelRef.current) {
          throw new Error('Operation cancelled');
        }

        setCurrentBatch(i + 1);

        const batchResult = await operation(batches[i]);
        results.push(batchResult);

        const newProgress = Math.round(((i + 1) / batches.length) * 100);
        setProgress(newProgress);

        batchOptions?.onBatchComplete?.(results, i + 1);

        // Small delay between batches to prevent overwhelming
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      if (showToasts) {
        toast.success(`Processed ${items.length} items in ${batches.length} batches`);
      }

      return results;
    } catch (error) {
      if (showToasts && !cancelRef.current) {
        toast.error(`Bulk operation failed at batch ${currentBatch}`);
      }
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, [selectedMap, limits, showToasts, checkLimit]);

  return {
    state,
    select,
    deselect,
    toggle,
    selectMany,
    selectAll,
    clearSelection,
    isSelected,
    executeBulk,
    checkLimit,
    getSelectableCount,
    limits,
  };
}

// ============================================================================
// Bulk Progress Component
// ============================================================================

export interface BulkProgressProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Current batch */
  currentBatch: number;
  /** Total batches */
  totalBatches: number;
  /** Whether operation is in progress */
  isProcessing: boolean;
  /** Cancel callback */
  onCancel?: () => void;
}

/**
 * Progress indicator for bulk operations
 */
export function BulkProgress({
  progress,
  currentBatch,
  totalBatches,
  isProcessing,
  onCancel,
}: BulkProgressProps) {
  if (!isProcessing) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-4 w-72 z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Processing...</span>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
      <div className="w-full bg-muted rounded-full h-2 mb-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Batch {currentBatch} of {totalBatches} ({progress}%)
      </div>
    </div>
  );
}

export default useBulkOperationLimits;
