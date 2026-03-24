import type { inferRouterOutputs } from "@trpc/server";
import type { ColumnPreset, RowIdentity, WorkbookAdapter } from "@shared/types";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

type InventoryEnhancedOutput = RouterOutputs["inventory"]["getEnhanced"];
type InventoryEnhancedItem = InventoryEnhancedOutput["items"][number];
type InventoryDetailOutput = RouterOutputs["inventory"]["getById"];
type OrdersQueueOutput = RouterOutputs["orders"]["getAll"];
type OrdersQueueItem = OrdersQueueOutput["items"][number];
type OrderWithLineItemsOutput =
  RouterOutputs["orders"]["getOrderWithLineItems"];
type OrderLineItemOutput = OrderWithLineItemsOutput["lineItems"][number];

function toDateString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function formatAgeLabel(value: Date | string | null | undefined) {
  const dateString = toDateString(value);
  if (!dateString) {
    return "-";
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `${diffDays}d`;
}

function buildProductSummary(input: {
  productName: string;
  vendorName: string | null | undefined;
  brandName: string | null | undefined;
  grade: string | null | undefined;
}) {
  const details = [input.vendorName, input.brandName, input.grade]
    .map(value => value?.trim())
    .filter(
      (value): value is string =>
        Boolean(value) && value !== "-" && value !== "Unknown"
    );

  if (details.length === 0) {
    return input.productName;
  }

  return `${input.productName} · ${details.join(" / ")}`;
}

export interface InventoryPilotRow {
  identity: RowIdentity;
  batchId: number;
  sku: string;
  productName: string;
  productSummary: string;
  category: string;
  subcategory: string;
  vendorName: string;
  brandName: string;
  grade: string;
  status: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  unitCogs: number | null;
  receivedDate: string | null;
  ageLabel: string;
  stockStatus: string | null;
}

export interface OrderQueuePilotRow {
  identity: RowIdentity;
  orderId: number;
  orderNumber: string;
  clientId: number;
  clientName: string;
  lane: "drafts" | "confirmed";
  orderType: string;
  fulfillmentStatus: string;
  total: number;
  lineItemCount: number;
  createdAt: string | null;
  ageLabel: string;
  confirmedAt: string | null;
  invoiceId: number | null;
  stageLabel: string;
  invoiceStateLabel: string;
  nextStepLabel: string;
}

export interface OrderLinePilotRow {
  identity: RowIdentity;
  lineItemId: number;
  orderId: number;
  batchId: number;
  batchSku: string;
  productDisplayName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isSample: boolean;
}

function createIdentity(
  entityType: string,
  entityId: number,
  tableRole: RowIdentity["tableRole"],
  version?: string | number | null
): RowIdentity {
  return {
    entityType,
    entityId,
    rowKey: `${entityType}:${entityId}`,
    recordVersion: version ?? null,
    tableRole,
  };
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function extractItems<T>(
  data: T[] | { items?: T[] } | null | undefined
): T[] {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data.items) ? data.items : [];
}

export function mapInventoryItemsToPilotRows(
  items: InventoryEnhancedItem[]
): InventoryPilotRow[] {
  return items.map(item => {
    const onHandQty = toNumber(item.onHandQty);
    const reservedQty = toNumber(item.reservedQty);
    const quarantineQty = toNumber(item.quarantineQty);
    const holdQty = toNumber(item.holdQty);

    return {
      identity: createIdentity(
        "batch",
        item.id,
        "primary",
        (item as Record<string, unknown>).version as
          | string
          | number
          | null
          | undefined
      ),
      batchId: item.id,
      sku: item.sku,
      productName: item.productName || "Unknown Product",
      productSummary: buildProductSummary({
        productName: item.productName || "Unknown Product",
        vendorName: item.vendorName,
        brandName: item.brandName,
        grade: item.grade,
      }),
      category: item.category || "-",
      subcategory: item.subcategory || "-",
      vendorName: item.vendorName || "-",
      brandName: item.brandName || "-",
      grade: item.grade || "-",
      status: item.status,
      onHandQty,
      reservedQty,
      availableQty: onHandQty - reservedQty - quarantineQty - holdQty,
      unitCogs:
        item.unitCogs === null || item.unitCogs === undefined
          ? null
          : toNumber(item.unitCogs),
      receivedDate: toDateString(item.receivedDate),
      ageLabel: formatAgeLabel(item.receivedDate),
      stockStatus: item.stockStatus ?? null,
    };
  });
}

export function mapInventoryDetailToPilotRow(
  detail: InventoryDetailOutput | undefined
): InventoryPilotRow | null {
  if (!detail) {
    return null;
  }

  const onHandQty = toNumber(detail.batch.onHandQty);
  const reservedQty = toNumber(detail.batch.reservedQty);

  return {
    identity: createIdentity(
      "batch",
      detail.batch.id,
      "primary",
      detail.batch.version
    ),
    batchId: detail.batch.id,
    sku: detail.batch.sku || `Batch #${detail.batch.id}`,
    productName: `Batch #${detail.batch.id}`,
    productSummary: buildProductSummary({
      productName: `Batch #${detail.batch.id}`,
      vendorName: null,
      brandName: null,
      grade: detail.batch.grade,
    }),
    category: "-",
    subcategory: "-",
    vendorName: "-",
    brandName: "-",
    grade: detail.batch.grade || "-",
    status: detail.batch.batchStatus,
    onHandQty,
    reservedQty,
    availableQty: toNumber(detail.availableQty),
    unitCogs:
      detail.batch.unitCogs === null || detail.batch.unitCogs === undefined
        ? null
        : toNumber(detail.batch.unitCogs),
    receivedDate: toDateString(detail.batch.createdAt),
    ageLabel: formatAgeLabel(detail.batch.createdAt),
    stockStatus: null,
  };
}

export function mapOrdersToPilotRows(input: {
  orders: OrdersQueueItem[];
  clientNamesById: Map<number, string>;
  lane: "drafts" | "confirmed";
}): OrderQueuePilotRow[] {
  return input.orders.map(order => {
    const createdAt = toDateString(order.createdAt);
    const invoiceId = order.invoiceId ?? null;
    const stageLabel = input.lane === "drafts" ? "Draft" : "Confirmed";
    const invoiceStateLabel =
      input.lane === "drafts"
        ? "Pending"
        : invoiceId
          ? `Issued #${invoiceId}`
          : "Pending";
    const nextStepLabel =
      input.lane === "drafts"
        ? "Open draft"
        : invoiceId
          ? "Ship"
          : "Accounting";

    return {
      identity: createIdentity("order", order.id, "primary", order.version),
      orderId: order.id,
      orderNumber: order.orderNumber || `Order #${order.id}`,
      clientId: order.clientId,
      clientName: input.clientNamesById.get(order.clientId) || "Unknown Client",
      lane: input.lane,
      orderType: order.orderType || "SALE",
      fulfillmentStatus:
        input.lane === "drafts"
          ? "DRAFT"
          : order.fulfillmentStatus || order.saleStatus || "READY_FOR_PACKING",
      total: toNumber(order.total),
      lineItemCount:
        (order as unknown as { lineItemCount?: number }).lineItemCount ??
        (Array.isArray((order as { lineItems?: unknown[] }).lineItems)
          ? ((order as { lineItems?: unknown[] }).lineItems?.length ?? 0)
          : 0),
      createdAt,
      ageLabel: formatAgeLabel(createdAt),
      confirmedAt: toDateString(order.confirmedAt),
      invoiceId,
      stageLabel,
      invoiceStateLabel,
      nextStepLabel,
    };
  });
}

export function mapOrderLineItemsToPilotRows(
  detail: OrderWithLineItemsOutput | undefined
): OrderLinePilotRow[] {
  if (!detail) {
    return [];
  }

  const lineItems = Array.isArray(detail.lineItems) ? detail.lineItems : [];

  return lineItems.map((lineItem: OrderLineItemOutput) => ({
    identity: createIdentity(
      "orderLineItem",
      lineItem.id,
      "child-detail",
      lineItem.id
    ),
    lineItemId: lineItem.id,
    orderId: detail.order.id,
    batchId: lineItem.batchId,
    batchSku: lineItem.batchSku ?? "-",
    productDisplayName: lineItem.productDisplayName ?? "Unknown Product",
    quantity: toNumber(lineItem.quantity),
    unitPrice: toNumber(lineItem.unitPrice),
    lineTotal: toNumber(lineItem.lineTotal),
    isSample: Boolean(lineItem.isSample),
  }));
}

export const inventoryPilotColumnPresets: ColumnPreset[] = [
  {
    key: "sku",
    label: "SKU",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "productSummary",
    label: "Product",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "status",
    label: "Status",
    dataType: "status",
    editable: true,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "onHandQty",
    label: "On Hand",
    dataType: "number",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "availableQty",
    label: "Available",
    dataType: "number",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "ageLabel",
    label: "Age",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
];

export const ordersQueueColumnPresets: ColumnPreset[] = [
  {
    key: "stageLabel",
    label: "Stage",
    dataType: "status",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "orderNumber",
    label: "Order",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "clientName",
    label: "Client",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "lineItemCount",
    label: "Lines",
    dataType: "number",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "total",
    label: "Total",
    dataType: "currency",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "nextStepLabel",
    label: "Next",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
];

export const orderLineColumnPresets: ColumnPreset[] = [
  {
    key: "productDisplayName",
    label: "Product",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "batchSku",
    label: "Batch",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "quantity",
    label: "Qty",
    dataType: "number",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "unitPrice",
    label: "Unit Price",
    dataType: "currency",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "lineTotal",
    label: "Line Total",
    dataType: "currency",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
];

export const inventoryWorkbookAdapter: WorkbookAdapter = {
  workbook: {
    id: "operations",
    label: "Operations",
    route: "/operations?tab=inventory",
    section: "Operations",
    sheetIds: ["inventory"],
  },
  sheets: [
    {
      id: "inventory",
      workbookId: "operations",
      label: "Inventory",
      archetype: "registry",
      primaryEntity: "batch",
      supportingEntities: ["inventoryMovements", "inventoryViews"],
      primaryOwnerSurface: "Operations -> Inventory",
    },
  ],
  queries: [
    {
      id: "inventory.getEnhanced",
      ownerSurface: "Operations -> Inventory",
      primaryEntity: "batch",
      queryKey: "inventory.getEnhanced",
      returns: { primaryRows: [], summary: {} },
    },
    {
      id: "inventory.getById",
      ownerSurface: "Operations -> Inventory",
      primaryEntity: "batch",
      queryKey: "inventory.getById",
      returns: { primaryRows: [], supportingRows: [], summary: {} },
    },
    {
      id: "inventory.dashboardStats",
      ownerSurface: "Operations -> Inventory",
      primaryEntity: "batch",
      queryKey: "inventory.dashboardStats",
      returns: { primaryRows: [], summary: {} },
    },
    {
      id: "inventory.views.list",
      ownerSurface: "Operations -> Inventory",
      primaryEntity: "inventoryView",
      queryKey: "inventory.views.list",
      returns: { primaryRows: [] },
    },
    {
      id: "inventory.profitability.batch",
      ownerSurface: "Accounting",
      primaryEntity: "batch",
      queryKey: "inventory.profitability.batch",
      returns: { primaryRows: [], summary: {} },
    },
    {
      id: "settings.locations.list",
      ownerSurface: "Locations / Storage",
      primaryEntity: "location",
      queryKey: "settings.locations.list",
      returns: { primaryRows: [] },
    },
  ],
  mutations: [
    {
      id: "inventory.updateStatus",
      ownerSurface: "Operations -> Inventory",
      mutationKey: "inventory.updateStatus",
      intent: "advance-workflow",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "inventory.adjustQty",
      ownerSurface: "Operations -> Inventory",
      mutationKey: "inventory.adjustQty",
      intent: "edit-data",
      inputShape: {},
      resultShape: {},
    },
  ],
  actions: [
    {
      id: "inventory.inspectBatch",
      label: "Inspect Batch",
      intent: "inspect",
      ownerSurface: "Operations -> Inventory",
      requiresSelection: true,
      confirmRequired: false,
      successArtifact: "selected-batch-inspector",
    },
    {
      id: "inventory.adjustQuantity",
      label: "Adjust Quantity",
      intent: "edit-data",
      ownerSurface: "Operations -> Inventory",
      requiresSelection: true,
      confirmRequired: true,
      successArtifact: "inventory-adjustment-log",
    },
    {
      id: "inventory.openClassicSurface",
      label: "Open Classic Surface",
      intent: "handoff",
      ownerSurface: "Operations -> Inventory",
      requiresSelection: false,
      confirmRequired: false,
    },
  ],
  sidecars: [
    {
      id: "inventory.inspector",
      label: "Batch Inspector",
      kind: "inspector",
      ownerSurface: "Operations -> Inventory",
      purpose:
        "Inspect quantity, locations, and audit history without leaving the grid.",
    },
  ],
};

export const salesOrdersWorkbookAdapter: WorkbookAdapter = {
  workbook: {
    id: "sales",
    label: "Sales",
    route: "/sales?tab=orders",
    section: "Sell",
    sheetIds: ["orders"],
  },
  sheets: [
    {
      id: "orders",
      workbookId: "sales",
      label: "Orders",
      archetype: "conveyor",
      primaryEntity: "order",
      supportingEntities: ["orderLineItem", "orderStatusHistory"],
      primaryOwnerSurface: "Sales -> Orders",
    },
  ],
  queries: [
    {
      id: "clients.list",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "client",
      queryKey: "clients.list",
      returns: { primaryRows: [] },
    },
    {
      id: "clients.getById",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "client",
      queryKey: "clients.getById",
      returns: { primaryRows: [], summary: {} },
    },
    {
      id: "orders.getAll",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "order",
      queryKey: "orders.getAll",
      returns: { primaryRows: [], summary: {} },
    },
    {
      id: "salesSheets.getInventory",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "batch",
      queryKey: "salesSheets.getInventory",
      returns: { primaryRows: [], summary: {} },
    },
    {
      id: "orders.getOrderWithLineItems",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "order",
      queryKey: "orders.getOrderWithLineItems",
      returns: { primaryRows: [], supportingRows: [], summary: {} },
    },
    {
      id: "orders.getOrderStatusHistory",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "orderStatusHistory",
      queryKey: "orders.getOrderStatusHistory",
      returns: { primaryRows: [] },
    },
    {
      id: "orders.getAuditLog",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "order",
      queryKey: "orders.getAuditLog",
      returns: { primaryRows: [] },
    },
    {
      id: "accounting.ledger.list",
      ownerSurface: "Accounting",
      primaryEntity: "ledgerEntry",
      queryKey: "accounting.ledger.list",
      returns: { primaryRows: [] },
    },
  ],
  mutations: [
    {
      id: "orders.createDraftEnhanced",
      ownerSurface: "Sales -> Orders",
      mutationKey: "orders.createDraftEnhanced",
      intent: "edit-data",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "orders.updateDraftEnhanced",
      ownerSurface: "Sales -> Orders",
      mutationKey: "orders.updateDraftEnhanced",
      intent: "edit-data",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "orders.finalizeDraft",
      ownerSurface: "Sales -> Orders",
      mutationKey: "orders.finalizeDraft",
      intent: "advance-workflow",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "orders.deleteDraftOrder",
      ownerSurface: "Sales -> Orders",
      mutationKey: "orders.deleteDraftOrder",
      intent: "edit-data",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "credit.checkOrderCredit",
      ownerSurface: "Sales -> Orders",
      mutationKey: "credit.checkOrderCredit",
      intent: "inspect",
      inputShape: {},
      resultShape: {},
    },
  ],
  actions: [
    {
      id: "orders.inspectOrder",
      label: "Inspect Order",
      intent: "inspect",
      ownerSurface: "Sales -> Orders",
      requiresSelection: true,
      confirmRequired: false,
      successArtifact: "selected-order-inspector",
    },
    {
      id: "orders.openDocumentSheet",
      label: "Open Document Sheet",
      intent: "handoff",
      ownerSurface: "Sales -> Orders",
      requiresSelection: false,
      confirmRequired: false,
    },
    {
      id: "orders.deleteDraft",
      label: "Delete Draft",
      intent: "edit-data",
      ownerSurface: "Sales -> Orders",
      requiresSelection: true,
      confirmRequired: true,
      successArtifact: "draft-delete-proof",
    },
    {
      id: "orders.openShippingHandoff",
      label: "Open Shipping",
      intent: "handoff",
      ownerSurface: "Operations -> Shipping",
      requiresSelection: true,
      confirmRequired: false,
    },
    {
      id: "orders.openAccountingPayment",
      label: "Open Accounting Payment",
      intent: "handoff",
      ownerSurface: "Accounting",
      requiresSelection: true,
      confirmRequired: false,
    },
    {
      id: "orders.openClassicSurface",
      label: "Open Classic Sales Surface",
      intent: "handoff",
      ownerSurface: "Sales -> Orders",
      requiresSelection: false,
      confirmRequired: false,
    },
  ],
  sidecars: [
    {
      id: "orders.inspector",
      label: "Order Inspector",
      kind: "inspector",
      ownerSurface: "Sales -> Orders",
      purpose:
        "Review order-level detail, line items, and ownership handoffs without leaving the queue.",
    },
    {
      id: "orders.accountingContext",
      label: "Accounting Context",
      kind: "activity",
      ownerSurface: "Accounting",
      purpose:
        "Expose accounting-owned evidence without moving payment execution into Sales.",
    },
  ],
};

export const pilotWorkbookAdapters = [
  inventoryWorkbookAdapter,
  salesOrdersWorkbookAdapter,
];

export function summarizeInventoryDetail(
  detail: InventoryDetailOutput | undefined
) {
  if (!detail) {
    return null;
  }

  return {
    availableQty: toNumber(detail.availableQty),
    locationCount: detail.locations.length,
    auditLogCount: detail.auditLogs.length,
    batchStatus: detail.batch.batchStatus,
    currentLocation: detail.locations[0]?.site || "Unassigned",
  };
}
