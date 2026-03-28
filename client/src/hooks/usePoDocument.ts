/**
 * usePoDocument — state helpers for PO draft creation/editing.
 *
 * This module exports pure helper functions only.
 * React hook wiring will be added when wiring into the surface.
 */

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface PoLineItem {
  tempId: string;
  productId: number | null;
  productName: string;
  category: string;
  subcategory: string;
  quantityOrdered: number;
  cogsMode: "FIXED" | "RANGE";
  unitCost: number;
  unitCostMin: number;
  unitCostMax: number;
  notes: string;
}

export interface PoDocumentState {
  supplierId: number | null;
  lineItems: PoLineItem[];
  orderDate: string; // ISO date
  expectedDeliveryDate: string; // ISO date or ""
  paymentTerms: string;
  internalNotes: string;
  supplierNotes: string;
  draftId: number | null;
}

// ── Line item factory ────────────────────────────────────────────────────────

export function createEmptyLineItem(): PoLineItem {
  return {
    tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: null,
    productName: "",
    category: "",
    subcategory: "",
    quantityOrdered: 1,
    cogsMode: "FIXED",
    unitCost: 0,
    unitCostMin: 0,
    unitCostMax: 0,
    notes: "",
  };
}

interface ProductInput {
  productId: number | string | null;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  cogsMode: "FIXED" | "RANGE" | string | null;
  unitCost: number | string | null;
  unitCostMin: number | string | null;
  unitCostMax: number | string | null;
}

export function createLineItemFromProduct(product: ProductInput): PoLineItem {
  const toNum = (v: number | string | null | undefined): number => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  return {
    tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId:
      product.productId !== null && product.productId !== undefined
        ? Number(product.productId)
        : null,
    productName: product.productName ?? "",
    category: product.category ?? "",
    subcategory: product.subcategory ?? "",
    quantityOrdered: 1,
    cogsMode: product.cogsMode === "RANGE" ? "RANGE" : "FIXED",
    unitCost: toNum(product.unitCost),
    unitCostMin: toNum(product.unitCostMin),
    unitCostMax: toNum(product.unitCostMax),
    notes: "",
  };
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validatePoDocument(state: PoDocumentState): string[] {
  const errors: string[] = [];

  if (!state.supplierId) {
    errors.push("Supplier is required");
  }

  if (state.lineItems.length === 0) {
    errors.push("At least one line item is required");
    return errors; // no point checking per-line if there are none
  }

  state.lineItems.forEach((item, idx) => {
    const label = item.productName
      ? `"${item.productName}"`
      : `Line ${idx + 1}`;

    if (item.quantityOrdered <= 0) {
      errors.push(`${label}: quantity must be > 0`);
    }

    if (item.cogsMode === "FIXED") {
      if (item.unitCost < 0) {
        errors.push(`${label}: unit cost must be >= 0`);
      }
    } else {
      if (item.unitCostMin < 0) {
        errors.push(`${label}: min cost must be >= 0`);
      }
      if (item.unitCostMax < item.unitCostMin) {
        errors.push(`${label}: max cost must be >= min`);
      }
    }
  });

  return errors;
}

// ── Payload builder ──────────────────────────────────────────────────────────

interface CreatePayloadItem {
  productId?: number;
  productName?: string;
  category?: string;
  subcategory?: string;
  quantityOrdered: number;
  cogsMode: "FIXED" | "RANGE";
  unitCost?: number;
  unitCostMin?: number;
  unitCostMax?: number;
}

interface CreatePayload {
  supplierClientId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  notes?: string;
  vendorNotes?: string;
  items: CreatePayloadItem[];
}

export function buildCreatePayload(state: PoDocumentState): CreatePayload {
  const payload: CreatePayload = {
    supplierClientId: state.supplierId as number,
    orderDate: state.orderDate,
    items: state.lineItems.map(item => {
      const base: CreatePayloadItem = {
        quantityOrdered: item.quantityOrdered,
        cogsMode: item.cogsMode,
      };

      if (item.productId !== null && item.productId !== undefined)
        base.productId = item.productId;
      if (item.productName) base.productName = item.productName;
      if (item.category) base.category = item.category;
      if (item.subcategory) base.subcategory = item.subcategory;

      if (item.cogsMode === "FIXED") {
        base.unitCost = item.unitCost;
      } else {
        base.unitCostMin = item.unitCostMin;
        base.unitCostMax = item.unitCostMax;
      }

      return base;
    }),
  };

  if (state.expectedDeliveryDate) {
    payload.expectedDeliveryDate = state.expectedDeliveryDate;
  }
  if (state.paymentTerms) {
    payload.paymentTerms = state.paymentTerms;
  }
  if (state.internalNotes) {
    payload.notes = state.internalNotes;
  }
  if (state.supplierNotes) {
    payload.vendorNotes = state.supplierNotes;
  }

  return payload;
}

// ── Totals ───────────────────────────────────────────────────────────────────

export function getLineTotal(item: PoLineItem): number {
  if (item.cogsMode === "FIXED") {
    return item.quantityOrdered * item.unitCost;
  }
  const avg = (item.unitCostMin + item.unitCostMax) / 2;
  return item.quantityOrdered * avg;
}

export function getDocumentTotal(items: PoLineItem[]): number {
  return items.reduce((sum, item) => sum + getLineTotal(item), 0);
}

// ── Default state factory ────────────────────────────────────────────────────

export function createDefaultPoDocument(): PoDocumentState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    supplierId: null,
    lineItems: [createEmptyLineItem()],
    orderDate: today,
    expectedDeliveryDate: "",
    paymentTerms: "",
    internalNotes: "",
    supplierNotes: "",
    draftId: null,
  };
}
