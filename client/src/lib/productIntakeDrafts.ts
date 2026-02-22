export type ProductIntakeDraftStatus = "DRAFT" | "RECEIVED" | "VOIDED";

export interface ProductIntakeDraftLine {
  id: string;
  poItemId: number;
  productId: number;
  productName: string;
  brandName?: string;
  strainName?: string;
  category?: string | null;
  subcategory?: string | null;
  packaging?: string | null;
  quantityOrdered: number;
  quantityReceived: number;
  intakeQty: number;
  unitCost: number;
  grade?: string;
  locationId?: number | null;
  locationName?: string;
  notes?: string;
  mediaUrls?: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
  batchId?: number;
  sku?: string;
}

export interface ProductIntakeDraft {
  id: string;
  poId: number;
  poNumber: string;
  vendorId?: number | null;
  vendorName: string;
  warehouseId?: number | null;
  warehouseName: string;
  status: ProductIntakeDraftStatus;
  lines: ProductIntakeDraftLine[];
  idempotencyKey: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  receivedAt?: string;
  voidedAt?: string;
  lastError?: string;
}

const STORAGE_PREFIX = "terp.product-intake-drafts.v1";
const LAB_ACTIVITY_STORAGE_PREFIX = "terp.product-intake-lab-activity.v1";

export interface ProductIntakeLabActivity {
  id: number;
  batchId: number;
  inventoryMovementType: string;
  quantityChange: string;
  notes?: string | null;
  createdAt?: string | Date | null;
  draftId?: string;
}

function getStorageKey(userId?: number | string | null): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}`;
}

function getLabActivityStorageKey(userId?: number | string | null): string {
  return `${LAB_ACTIVITY_STORAGE_PREFIX}:${userId ?? "anon"}`;
}

function safeParseDrafts(raw: string | null): ProductIntakeDraft[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProductIntakeDraft[]) : [];
  } catch {
    return [];
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function listProductIntakeDrafts(
  userId?: number | string | null
): ProductIntakeDraft[] {
  if (!canUseStorage()) return [];
  return safeParseDrafts(window.localStorage.getItem(getStorageKey(userId)));
}

export function getProductIntakeDraft(
  draftId: string,
  userId?: number | string | null
): ProductIntakeDraft | null {
  return listProductIntakeDrafts(userId).find(d => d.id === draftId) ?? null;
}

export function upsertProductIntakeDraft(
  draft: ProductIntakeDraft,
  userId?: number | string | null
): ProductIntakeDraft {
  if (!canUseStorage()) return draft;

  const existing = listProductIntakeDrafts(userId);
  const nowIso = new Date().toISOString();
  const nextDraft: ProductIntakeDraft = {
    ...draft,
    updatedAt: nowIso,
    version: Math.max(1, (draft.version || 0) + 1),
  };

  const idx = existing.findIndex(d => d.id === draft.id);
  const next = [...existing];
  if (idx >= 0) {
    next[idx] = nextDraft;
  } else {
    next.unshift(nextDraft);
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  return nextDraft;
}

export function createProductIntakeDraftFromPO(input: {
  poId: number;
  poNumber: string;
  vendorId?: number | null;
  vendorName: string;
  warehouseId?: number | null;
  warehouseName: string;
  lines: ProductIntakeDraftLine[];
}): ProductIntakeDraft {
  const timestamp = Date.now();
  const shortRandom = Math.random().toString(36).slice(2, 8).toUpperCase();
  const draftId = `PI-${timestamp}-${shortRandom}`;

  return {
    id: draftId,
    poId: input.poId,
    poNumber: input.poNumber,
    vendorId: input.vendorId ?? null,
    vendorName: input.vendorName,
    warehouseId: input.warehouseId ?? null,
    warehouseName: input.warehouseName,
    status: "DRAFT",
    lines: input.lines,
    idempotencyKey: `receive-${draftId}-${timestamp}`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function markProductIntakeDraftReceived(
  draftId: string,
  data: {
    lines: ProductIntakeDraftLine[];
  },
  userId?: number | string | null
): ProductIntakeDraft | null {
  const draft = getProductIntakeDraft(draftId, userId);
  if (!draft) return null;

  const next: ProductIntakeDraft = {
    ...draft,
    status: "RECEIVED",
    lines: data.lines,
    receivedAt: new Date().toISOString(),
    lastError: undefined,
  };

  return upsertProductIntakeDraft(next, userId);
}

export function markProductIntakeDraftVoided(
  draftId: string,
  userId?: number | string | null
): ProductIntakeDraft | null {
  const draft = getProductIntakeDraft(draftId, userId);
  if (!draft) return null;

  const next: ProductIntakeDraft = {
    ...draft,
    status: "VOIDED",
    voidedAt: new Date().toISOString(),
  };

  return upsertProductIntakeDraft(next, userId);
}

export function setProductIntakeDraftError(
  draftId: string,
  message: string,
  userId?: number | string | null
): ProductIntakeDraft | null {
  const draft = getProductIntakeDraft(draftId, userId);
  if (!draft) return null;

  const next: ProductIntakeDraft = {
    ...draft,
    lastError: message,
  };

  return upsertProductIntakeDraft(next, userId);
}

function safeParseLabActivity(raw: string | null): ProductIntakeLabActivity[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProductIntakeLabActivity[]) : [];
  } catch {
    return [];
  }
}

export function loadProductIntakeLabActivity(
  userId?: number | string | null
): ProductIntakeLabActivity[] {
  if (!canUseStorage()) return [];
  return safeParseLabActivity(
    window.localStorage.getItem(getLabActivityStorageKey(userId))
  );
}

export function saveProductIntakeLabActivity(
  items: ProductIntakeLabActivity[],
  userId?: number | string | null
): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    getLabActivityStorageKey(userId),
    JSON.stringify(items)
  );
}
