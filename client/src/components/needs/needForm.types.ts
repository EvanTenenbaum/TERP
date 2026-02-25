export type NeedFormMode = "create" | "edit";

export interface NeedFormState {
  strain: string;
  productName: string;
  strainId: number | null;
  category: string;
  subcategory: string;
  grade: string;
  quantityMin: string;
  quantityMax: string;
  priceMax: string;
  priority: string;
  neededBy: string;
  expiresAt: string;
  notes: string;
  internalNotes: string;
}

export interface NeedFormPayload {
  clientId: number;
  strain?: string;
  productName?: string;
  strainId?: number;
  category?: string;
  subcategory?: string;
  grade?: string;
  quantityMin?: number;
  quantityMax?: number;
  priceMax?: number;
  priority?: string;
  neededBy?: string;
  expiresAt?: string;
  notes?: string;
  internalNotes?: string;
}
