/**
 * Sales Sheet Types
 * Shared types for sales sheet components
 * QA-062: Draft functionality support
 * SALES-SHEET-IMPROVEMENTS: Added filter, sort, and saved view types
 */

export interface PricedInventoryItem {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  strain?: string;
  strainId?: number;
  strainFamily?: string;
  basePrice: number;
  retailPrice: number;
  quantity: number;
  grade?: string;
  vendor?: string;
  vendorId?: number;
  priceMarkup: number;
  appliedRules: Array<{
    ruleId: number;
    ruleName: string;
    adjustment: string;
  }>;
  // TERP-0007: Batch status for non-sellable inventory indicators
  // Note: Server returns as 'status', but we use batchStatus for clarity
  status?: 'AWAITING_INTAKE' | 'LIVE' | 'PHOTOGRAPHY_COMPLETE' | 'ON_HOLD' | 'QUARANTINED' | 'SOLD_OUT' | 'CLOSED';
}

// ============================================================================
// FILTER & SORT TYPES
// ============================================================================

export interface InventoryFilters {
  search: string;
  categories: string[];
  grades: string[];
  priceMin: number | null;
  priceMax: number | null;
  strainFamilies: string[];
  vendors: string[];
  inStockOnly: boolean;
}

export interface InventorySortConfig {
  field: 'name' | 'category' | 'retailPrice' | 'quantity' | 'basePrice' | 'grade';
  direction: 'asc' | 'desc';
}

export interface ColumnVisibility {
  category: boolean;
  quantity: boolean;
  basePrice: boolean;
  retailPrice: boolean;
  markup: boolean;
  grade: boolean;
  vendor: boolean;
  strain: boolean;
}

export const DEFAULT_FILTERS: InventoryFilters = {
  search: '',
  categories: [],
  grades: [],
  priceMin: null,
  priceMax: null,
  strainFamilies: [],
  vendors: [],
  inStockOnly: false,
};

export const DEFAULT_SORT: InventorySortConfig = {
  field: 'name',
  direction: 'asc',
};

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  category: true,
  quantity: true,
  basePrice: true,
  retailPrice: true,
  markup: true,
  grade: false,
  vendor: false,
  strain: false,
};

// ============================================================================
// SAVED VIEW TYPES
// ============================================================================

export interface SavedView {
  id: number;
  name: string;
  description?: string;
  clientId: number | null; // null = universal view
  filters: InventoryFilters;
  sort: InventorySortConfig;
  columnVisibility: ColumnVisibility;
  isDefault: boolean;
  createdAt: Date | null;
  lastUsedAt: Date | null;
}

export interface SavedViewInput {
  name: string;
  description?: string;
  clientId?: number;
  filters: InventoryFilters;
  sort: InventorySortConfig;
  columnVisibility: ColumnVisibility;
  isDefault: boolean;
}

export interface DraftInfo {
  id: number;
  name: string;
  clientId: number;
  itemCount: number;
  totalValue: string;
  updatedAt: Date | null;
  createdAt: Date | null;
}

export interface DraftState {
  currentDraftId: number | null;
  draftName: string;
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
}
