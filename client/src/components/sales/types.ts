/**
 * Sales Sheet Types
 * Shared types for sales sheet components
 * QA-062: Draft functionality support
 */

export interface PricedInventoryItem {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  strain?: string;
  basePrice: number;
  retailPrice: number;
  quantity: number;
  grade?: string;
  vendor?: string;
  priceMarkup: number;
  appliedRules: Array<{
    ruleId: number;
    ruleName: string;
    adjustment: string;
  }>;
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
