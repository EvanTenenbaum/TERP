export interface InventoryGridRow {
  id: number;
  vendorCode: string | null;
  lotDate: string | null;
  source: string | null;
  category: string | null;
  item: string | null;
  available: number;
  intake: number;
  ticket: number;
  sub: number;
  notes: string | null;
  confirm: string | null;
}

export interface ClientGridSummary {
  total: number;
  balance: number;
  yearToDate: number;
}

export interface ClientGridRow {
  id: string;
  orderId: number;
  date: string | null;
  vendorCode: string | null; // TERP-SS-003: Now displays batch.code instead of orderNumber
  item: string;
  qty: number;
  unitPrice: number;
  total: number;
  payment: string | null;
  paymentAmount: number; // TERP-SS-005: Actual payment amount (cashPayment)
  note: string | null;
  paid: boolean;
  invoiced: boolean;
  confirmed: boolean;
}

export type InventoryBatchRecord = {
  batch: {
    id: number;
    code: string;
    sku: string;
    batchStatus: string | null;
    onHandQty: string;
    reservedQty: string;
    quarantineQty: string;
    holdQty: string;
    unitCogs: string | null;
    metadata: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    version: number;
  };
  product: {
    nameCanonical?: string | null;
    category?: string | null;
  } | null;
  brand: {
    name?: string | null;
  } | null;
  lot: {
    code?: string | null;
    date?: Date | null;
  } | null;
  vendor: {
    name?: string | null;
  } | null;
  intakeQty?: number | null; // TERP-SS-004: Original intake quantity from first inventory movement
};

export interface ClientOrderItem {
  batchId?: number | null;
  displayName?: string | null;
  originalName?: string | null;
  quantity: number;
  unitPrice: number;
  isSample?: boolean;
  unitCogs?: number;
  batchCode?: string | null; // Added for TERP-SS-003: Vendor/batch code display
}

export interface ClientOrderRecord {
  id: number;
  orderNumber: string;
  orderType: "QUOTE" | "SALE";
  clientId: number;
  items: ClientOrderItem[];
  subtotal?: number | null;
  total: number | null;
  paymentTerms?: string | null;
  cashPayment?: string | null;
  dueDate?: Date | null;
  saleStatus?: string | null;
  invoiceId?: number | null;
  pickPackStatus?: string | null;
  notes?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export function transformInventoryRecord(
  record: InventoryBatchRecord
): InventoryGridRow {
  const available =
    parseNumber(record.batch.onHandQty) -
    parseNumber(record.batch.reservedQty) -
    parseNumber(record.batch.quarantineQty) -
    parseNumber(record.batch.holdQty);

  // TERP-SS-004: Use original intake quantity if available, otherwise fall back to extracting from metadata
  // The intakeQty is set from the first INTAKE inventory movement or metadata.originalQty
  const metadataIntake = extractIntakeFromMetadata(record.batch.metadata);
  const intake =
    record.intakeQty ?? metadataIntake ?? parseNumber(record.batch.onHandQty);
  const ticket = parseNumber(record.batch.unitCogs);

  return {
    id: record.batch.id,
    vendorCode: record.lot?.code ?? record.vendor?.name ?? null,
    lotDate: formatDate(record.lot?.date),
    source: record.brand?.name ?? record.vendor?.name ?? null,
    category: record.product?.category ?? null,
    item: record.product?.nameCanonical ?? null,
    available,
    intake,
    ticket,
    sub: intake * ticket,
    notes: extractNotes(record.batch.metadata),
    confirm: record.batch.batchStatus,
  };
}

export function transformClientOrderRows(
  order: ClientOrderRecord
): ClientGridRow[] {
  const orderDate = formatDate(order.createdAt);
  const payment = order.paymentTerms ?? null;
  // TERP-SS-005: Parse actual payment amount from cashPayment
  const paymentAmount = parseNumber(order.cashPayment);
  const note = order.notes ?? null;
  const paid = paymentAmount > 0;
  const invoiced = Boolean(order.invoiceId);
  const confirmed = (order.saleStatus ?? "").toUpperCase() === "CONFIRMED";

  return order.items.map((item, index) => {
    const qty = parseNumber(item.quantity);
    const unitPrice = parseNumber(item.unitPrice);
    const total = qty * unitPrice;

    return {
      id: `${order.id}-${index}`,
      orderId: order.id,
      date: orderDate,
      // TERP-SS-003: Display batch code instead of order number
      vendorCode: item.batchCode ?? order.orderNumber ?? null,
      item: item.displayName ?? item.originalName ?? `Item ${index + 1}`,
      qty,
      unitPrice,
      total,
      payment,
      paymentAmount, // TERP-SS-005: Actual payment amount
      note,
      paid,
      invoiced,
      confirmed,
    };
  });
}

/**
 * Get inventory data for spreadsheet grid view
 *
 * INV-CONSISTENCY-001: Updated to filter by sellable statuses when no explicit
 * status filter is provided. This ensures the spreadsheet view shows the same
 * inventory that's available for sales by default.
 *
 * @param input Query parameters including optional status filter
 * @returns Paginated inventory grid rows
 */
export async function getInventoryGridData(
  input: InventoryGridQuery = {}
): Promise<{
  rows: InventoryGridRow[];
  nextCursor: number | null;
  hasMore: boolean;
}> {
  const limit =
    input.limit && input.limit > 0
      ? Math.min(input.limit, DEFAULT_LIMIT)
      : DEFAULT_LIMIT;

  const { items, nextCursor, hasMore } =
    await inventoryDb.getBatchesWithDetails(limit, input.cursor, {
      status: input.status,
      category: input.category,
    });

  // INV-CONSISTENCY-001: Filter to sellable statuses if no explicit status filter provided
  // This ensures spreadsheet view matches sales module inventory by default
  const filteredItems = input.status
    ? items  // User explicitly requested a status, show that
    : items.filter(item =>
        item.batch &&
        SELLABLE_BATCH_STATUSES.includes(
          item.batch.batchStatus as typeof SELLABLE_BATCH_STATUSES[number]
        )
      );

  const rows = filteredItems.map(transformInventoryRecord);

  return { rows, nextCursor, hasMore: Boolean(hasMore) };
}

export async function getClientGridData(
  input: ClientGridQuery
): Promise<{ summary: ClientGridSummary; rows: ClientGridRow[] }> {
  const orders = await getOrdersByClient(input.clientId, "SALE");

  // TERP-SS-003: Collect all batchIds to fetch batch codes
  const allBatchIds = new Set<number>();
  orders.forEach(order => {
    const rawItems = (order as { items?: unknown }).items;
    if (Array.isArray(rawItems)) {
      rawItems.forEach(item => {
        const batchId = (item as { batchId?: number | null }).batchId;
        if (batchId) allBatchIds.add(batchId);
      });
    }
  });

  // TERP-SS-003: Fetch batch codes for all batchIds
  const batchCodeMap = await getBatchCodesByIds(Array.from(allBatchIds));

  const clientOrders: ClientOrderRecord[] = orders.map(order => {
    const rawItems = (order as { items?: unknown }).items;
    const items: ClientOrderItem[] = Array.isArray(rawItems)
      ? rawItems.map(item => {
          const batchId = (item as { batchId?: number | null }).batchId ?? null;
          return {
            batchId,
            displayName:
              (item as { displayName?: string }).displayName ??
              (item as { name?: string }).name ??
              null,
            originalName:
              (item as { originalName?: string }).originalName ?? null,
            quantity: parseNumber(
              (item as { quantity?: number | string | null }).quantity
            ),
            unitPrice: parseNumber(
              (item as { unitPrice?: number | string | null }).unitPrice
            ),
            isSample: (item as { isSample?: boolean }).isSample ?? false,
            unitCogs: parseNumber(
              (item as { unitCogs?: number | string | null }).unitCogs
            ),
            // TERP-SS-003: Add batch code from lookup
            batchCode: batchId ? (batchCodeMap.get(batchId) ?? null) : null,
          };
        })
      : [];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType as ClientOrderRecord["orderType"],
      clientId: order.clientId,
      items,
      subtotal: parseNumber(
        (order as { subtotal?: string | number | null }).subtotal ?? null
      ),
      total: parseNumber(
        (order as { total?: string | number | null }).total ?? null
      ),
      paymentTerms:
        (order as { paymentTerms?: string | null }).paymentTerms ?? null,
      cashPayment: (order as { cashPayment?: string | number | null })
        .cashPayment
        ? String(
            (order as { cashPayment?: string | number | null }).cashPayment
          )
        : null,
      dueDate: (order as { dueDate?: Date | null }).dueDate ?? null,
      saleStatus: (order as { saleStatus?: string | null }).saleStatus ?? null,
      invoiceId: (order as { invoiceId?: number | null }).invoiceId ?? null,
      pickPackStatus:
        (order as { pickPackStatus?: string | null }).pickPackStatus ?? null,
      notes: (order as { notes?: string | null }).notes ?? null,
      createdAt: (order as { createdAt?: Date | null }).createdAt ?? null,
      updatedAt: (order as { updatedAt?: Date | null }).updatedAt ?? null,
    };
  });

  const rows = clientOrders.flatMap(transformClientOrderRows);

  const totalValue = clientOrders.reduce(
    (sum, order) => sum + parseNumber(order.total),
    0
  );
  const paidAmount = clientOrders.reduce(
    (sum, order) => sum + parseNumber(order.cashPayment),
    0
  );
  const currentYear = new Date().getFullYear();
  const yearToDate = clientOrders
    .filter(order => (order.createdAt?.getFullYear() ?? 0) === currentYear)
    .reduce((sum, order) => sum + parseNumber(order.total), 0);

  return {
    summary: {
      total: totalValue,
      balance: totalValue - paidAmount,
      yearToDate,
    },
    rows,
  };
}

// TERP-SS-003 + QA-W2-001: Helper to fetch batch codes by IDs
// Fixed N+1 query by using bulk fetch instead of individual queries
async function getBatchCodesByIds(
  batchIds: number[]
): Promise<Map<number, string>> {
  if (batchIds.length === 0) return new Map();

  // QA-W2-001: Use bulk fetch to avoid N+1 queries
  const batches = await inventoryDb.getBatchesByIds(batchIds);

  // Extract codes from the batch objects
  const batchCodeMap = new Map<number, string>();
  for (const [id, batch] of batches) {
    if (batch.code) {
      batchCodeMap.set(id, batch.code);
    }
  }

  return batchCodeMap;
}
import * as inventoryDb from "../inventoryDb";
import { getOrdersByClient } from "../ordersDb";
// INV-CONSISTENCY-001: Import shared sellable status constant for consistent filtering
import { SELLABLE_BATCH_STATUSES } from "../inventoryDb";

const DEFAULT_LIMIT = 100;

const parseNumber = (value: string | number | null | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value: Date | null | undefined): string | null => {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
};

const extractNotes = (metadata: string | null): string | null => {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { notes?: unknown };
    return typeof parsed.notes === "string" ? parsed.notes : null;
  } catch {
    return null;
  }
};

// TERP-SS-004: Extract original intake quantity from batch metadata
const extractIntakeFromMetadata = (metadata: string | null): number | null => {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as {
      originalQty?: unknown;
      intakeQty?: unknown;
    };
    const qty = parsed.originalQty ?? parsed.intakeQty;
    if (typeof qty === "number") return qty;
    if (typeof qty === "string") {
      const parsed = parseFloat(qty);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  } catch {
    return null;
  }
};

export interface InventoryGridQuery {
  limit?: number;
  cursor?: number;
  status?: string;
  category?: string;
}

export interface ClientGridQuery {
  clientId: number;
}
