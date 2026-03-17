import type {
  ColumnPreset,
  RowIdentity,
  WorkbookAdapter,
} from "@shared/spreadsheetNativeContracts";
import { pilotCapabilityProofCases } from "@/lib/spreadsheet-native/pilotProofCases";

type InventoryAgeBracket = "FRESH" | "MODERATE" | "AGING" | "CRITICAL";
type InventoryStockStatus = "CRITICAL" | "LOW" | "OPTIMAL" | "OUT_OF_STOCK";

export interface InventoryMovementRecord {
  id: number;
  type: string;
  quantityChange: string | number;
  timestamp: string | Date;
  performedBy: number;
  notes: string | null;
}

export interface InventoryEnhancedRecord {
  id: number;
  sku: string;
  status: string;
  grade: string | null;
  productName: string;
  category: string | null;
  subcategory: string | null;
  vendorName: string | null;
  brandName: string | null;
  onHandQty: number;
  reservedQty: number;
  quarantineQty: number;
  holdQty: number;
  availableQty: number;
  unitCogs: number | null;
  totalValue: number | null;
  receivedDate: string | Date | null;
  ageDays: number;
  ageBracket: InventoryAgeBracket;
  stockStatus: InventoryStockStatus;
  lastMovementDate: string | Date | null;
  movementHistory?: InventoryMovementRecord[];
}

export interface InventorySheetPrimaryRow {
  identity: RowIdentity;
  batchId: number;
  sku: string;
  productName: string;
  category: string | null;
  subcategory: string | null;
  vendorName: string | null;
  brandName: string | null;
  status: string;
  grade: string | null;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  unitCogs: number | null;
  totalValue: number | null;
  receivedDate: string | Date | null;
  ageDays: number;
  ageBracket: InventoryAgeBracket;
  stockStatus: InventoryStockStatus;
  lastMovementDate: string | Date | null;
  movementHistory: InventoryMovementRecord[];
}

export interface InventoryMovementRow {
  identity: RowIdentity;
  movementId: number;
  movementType: string;
  quantityChange: number;
  timestamp: string | Date;
  performedBy: number;
  notes: string | null;
}

export interface InventorySheetSummary {
  totalRows: number;
  totalOnHand: number;
  totalAvailable: number;
  totalValue: number;
  liveRows: number;
}

export interface InventoryDashboardSummary {
  totalUnits?: number;
  totalInventoryValue?: number;
  statusCounts?: {
    LIVE?: number;
  };
}

export interface OrderQueueRecord {
  id: number;
  orderNumber: string;
  clientId: number;
  isDraft: boolean;
  orderType?: string | null;
  fulfillmentStatus?: string | null;
  saleStatus?: string | null;
  invoiceId?: number | null;
  total: string | number;
  createdAt?: string | Date | null;
  confirmedAt?: string | Date | null;
  version?: number | null;
}

export interface OrderLineItemRecord {
  id: number;
  batchId: number;
  batchSku?: string | null;
  productId?: number | null;
  productDisplayName: string | null;
  quantity: string;
  cogsPerUnit: string;
  marginPercent: string;
  unitPrice: string;
  lineTotal: string;
  isSample: boolean | number;
}

export interface OrdersSheetPrimaryRow {
  identity: RowIdentity;
  orderId: number;
  orderNumber: string;
  clientId: number;
  clientName: string;
  isDraft: boolean;
  orderType: string | null;
  fulfillmentStatus: string | null;
  paymentStatus: string | null;
  invoiceId: number | null;
  total: number;
  createdAt: string | Date | null;
  confirmedAt: string | Date | null;
  version: number | null;
}

export interface OrderLineItemSheetRow {
  identity: RowIdentity;
  lineItemId: number;
  batchId: number;
  batchSku: string | null;
  productDisplayName: string;
  quantity: number;
  cogsPerUnit: number;
  marginPercent: number;
  unitPrice: number;
  lineTotal: number;
  isSample: boolean;
}

export interface OrdersSheetSummary {
  draftCount: number;
  activeCount: number;
  readyForPackingCount: number;
  shippedCount: number;
  totalValue: number;
}

export interface PilotTableDefinition<Row> {
  id: string;
  label: string;
  role: RowIdentity["tableRole"];
  columns: ColumnPreset[];
  getRowIdentity: (row: Row) => RowIdentity;
}

export interface PilotSheetContract<Row, SupportingRow, Summary> {
  workbookAdapter: WorkbookAdapter;
  selectionQueryParam: string;
  primaryTable: PilotTableDefinition<Row>;
  supportingTables: PilotTableDefinition<SupportingRow>[];
  capabilityIds: string[];
  buildSummary: (rows: Row[], secondaryRows?: SupportingRow[]) => Summary;
}

const createRowIdentity = (
  entityType: string,
  entityId: string | number,
  tableRole: RowIdentity["tableRole"],
  recordVersion?: string | number | null
): RowIdentity => ({
  entityType,
  entityId,
  rowKey: `${entityType}:${entityId}`,
  recordVersion,
  tableRole,
});

const numberOrZero = (value: string | number | null | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const inventoryPrimaryColumnPresets: ColumnPreset[] = [
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
    key: "productName",
    label: "Product",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "vendorName",
    label: "Supplier",
    dataType: "relation",
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
    bulkEditable: true,
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
    key: "unitCogs",
    label: "Unit COGS",
    dataType: "currency",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "stockStatus",
    label: "Stock",
    dataType: "status",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
];

export const inventoryMovementColumnPresets: ColumnPreset[] = [
  {
    key: "movementType",
    label: "Movement",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "quantityChange",
    label: "Change",
    dataType: "number",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "timestamp",
    label: "Timestamp",
    dataType: "datetime",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "notes",
    label: "Notes",
    dataType: "long-text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
];

export const ordersPrimaryColumnPresets: ColumnPreset[] = [
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
    dataType: "relation",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "fulfillmentStatus",
    label: "Workflow",
    dataType: "status",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "paymentStatus",
    label: "Payment",
    dataType: "status",
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
    key: "createdAt",
    label: "Created",
    dataType: "datetime",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
];

export const orderLineItemColumnPresets: ColumnPreset[] = [
  {
    key: "productDisplayName",
    label: "Item",
    dataType: "text",
    editable: false,
    bulkEditable: false,
    fillAllowed: false,
    pasteAllowed: false,
  },
  {
    key: "batchSku",
    label: "Batch",
    dataType: "relation",
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
    label: "Price",
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

export const inventoryWorkbookPilotAdapter: WorkbookAdapter = {
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
      primaryEntity: "batches",
      supportingEntities: ["inventoryMovements", "inventoryViews"],
      primaryOwnerSurface: "Operations -> Inventory",
    },
  ],
  queries: [
    {
      id: "inventory-primary-query",
      ownerSurface: "Operations -> Inventory",
      primaryEntity: "batches",
      queryKey: "inventory.getEnhanced",
      returns: {
        primaryRows: [],
        supportingRows: [],
        summary: {},
      },
    },
    {
      id: "inventory-dashboard-query",
      ownerSurface: "Operations -> Inventory",
      primaryEntity: "batches",
      queryKey: "inventory.dashboardStats",
      returns: {
        primaryRows: [],
        summary: {},
      },
    },
  ],
  mutations: [
    {
      id: "inventory-status-mutation",
      ownerSurface: "Operations -> Inventory",
      mutationKey: "inventory.updateStatus",
      intent: "advance-workflow",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "inventory-adjust-qty-mutation",
      ownerSurface: "Operations -> Inventory",
      mutationKey: "inventory.adjustQty",
      intent: "edit-data",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "inventory-bulk-status-mutation",
      ownerSurface: "Operations -> Inventory",
      mutationKey: "inventory.bulk.updateStatus",
      intent: "bulk-edit",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "inventory-bulk-delete-mutation",
      ownerSurface: "Operations -> Inventory",
      mutationKey: "inventory.bulk.delete",
      intent: "bulk-edit",
      inputShape: {},
      resultShape: {},
    },
  ],
  actions: [
    {
      id: "inventory-open-inspector",
      label: "Open Batch Detail",
      intent: "open-sidecar",
      ownerSurface: "Operations -> Inventory",
      requiresSelection: true,
      confirmRequired: false,
      successArtifact: "inventory-inspector-proof.png",
    },
    {
      id: "inventory-adjust-qty",
      label: "Adjust Quantity",
      intent: "edit-data",
      ownerSurface: "Operations -> Inventory",
      requiresSelection: true,
      confirmRequired: true,
      successArtifact: "adjust-qty-proof.png",
    },
    {
      id: "inventory-bulk-status",
      label: "Bulk Update Status",
      intent: "bulk-edit",
      ownerSurface: "Operations -> Inventory",
      requiresSelection: true,
      confirmRequired: true,
      successArtifact: "bulk-action-proof.png",
    },
  ],
  sidecars: [
    {
      id: "inventory-batch-drawer",
      label: "Batch Detail Drawer",
      kind: "inspector",
      ownerSurface: "Operations -> Inventory",
      purpose:
        "Full batch detail, comments, media, audit, and quantity adjustments",
    },
  ],
};

export const salesOrdersWorkbookPilotAdapter: WorkbookAdapter = {
  workbook: {
    id: "sales",
    label: "Sales",
    route: "/sales?tab=orders",
    section: "Sell",
    sheetIds: ["orders", "create-order"],
  },
  sheets: [
    {
      id: "orders",
      workbookId: "sales",
      label: "Orders",
      archetype: "conveyor",
      primaryEntity: "orders",
      supportingEntities: ["orderLineItems", "orderStatusHistory"],
      primaryOwnerSurface: "Sales -> Orders",
    },
    {
      id: "create-order",
      workbookId: "sales",
      label: "Create Order",
      archetype: "document",
      primaryEntity: "orders",
      supportingEntities: ["orderLineItems", "orderLineItemAllocations"],
      primaryOwnerSurface: "Sales -> Orders",
    },
  ],
  queries: [
    {
      id: "orders-drafts-query",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "orders",
      queryKey: "orders.getAll",
      returns: {
        primaryRows: [],
        supportingRows: [],
        summary: {},
      },
    },
    {
      id: "orders-detail-query",
      ownerSurface: "Sales -> Orders",
      primaryEntity: "orders",
      queryKey: "orders.getOrderWithLineItems",
      returns: {
        primaryRows: [],
        supportingRows: [],
        summary: {},
      },
    },
  ],
  mutations: [
    {
      id: "orders-confirm-draft-mutation",
      ownerSurface: "Sales -> Orders",
      mutationKey: "orders.confirmDraftOrder",
      intent: "advance-workflow",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "orders-delete-draft-mutation",
      ownerSurface: "Sales -> Orders",
      mutationKey: "orders.delete",
      intent: "advance-workflow",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "orders-confirm-fulfillment-mutation",
      ownerSurface: "Sales -> Orders",
      mutationKey: "orders.confirmOrder",
      intent: "advance-workflow",
      inputShape: {},
      resultShape: {},
    },
    {
      id: "orders-ship-mutation",
      ownerSurface: "Sales -> Orders",
      mutationKey: "orders.shipOrder",
      intent: "advance-workflow",
      inputShape: {},
      resultShape: {},
    },
  ],
  actions: [
    {
      id: "orders-edit-draft",
      label: "Edit Draft",
      intent: "inspect",
      ownerSurface: "Sales -> Orders",
      requiresSelection: true,
      confirmRequired: false,
      successArtifact: "draft-edit-proof.png",
    },
    {
      id: "orders-make-payment",
      label: "Make Payment",
      intent: "handoff",
      ownerSurface: "Accounting",
      requiresSelection: true,
      confirmRequired: false,
      successArtifact: "accounting-handoff-proof.png",
    },
    {
      id: "orders-open-shipping",
      label: "Open Shipping",
      intent: "handoff",
      ownerSurface: "Operations -> Shipping",
      requiresSelection: true,
      confirmRequired: false,
      successArtifact: "shipping-handoff-proof.png",
    },
  ],
  sidecars: [
    {
      id: "orders-inspector-rail",
      label: "Orders Inspector",
      kind: "inspector",
      ownerSurface: "Sales -> Orders",
      purpose:
        "Customer context, audit posture, and workflow actions for the selected order",
    },
  ],
};

export const inventoryPilotSheetContract: PilotSheetContract<
  InventorySheetPrimaryRow,
  InventoryMovementRow,
  InventorySheetSummary
> = {
  workbookAdapter: inventoryWorkbookPilotAdapter,
  selectionQueryParam: "batchId",
  primaryTable: {
    id: "inventory-primary-table",
    label: "Inventory Registry",
    role: "primary",
    columns: inventoryPrimaryColumnPresets,
    getRowIdentity: row => row.identity,
  },
  supportingTables: [
    {
      id: "inventory-movement-table",
      label: "Movement History",
      role: "summary-support",
      columns: inventoryMovementColumnPresets,
      getRowIdentity: row => row.identity,
    },
  ],
  capabilityIds: pilotCapabilityProofCases
    .filter(caseItem => caseItem.capabilityId.startsWith("OPS-INV-"))
    .map(caseItem => caseItem.capabilityId),
  buildSummary: rows => ({
    totalRows: rows.length,
    totalOnHand: rows.reduce((sum, row) => sum + row.onHandQty, 0),
    totalAvailable: rows.reduce((sum, row) => sum + row.availableQty, 0),
    totalValue: rows.reduce((sum, row) => sum + (row.totalValue ?? 0), 0),
    liveRows: rows.filter(row => row.status === "LIVE").length,
  }),
};

export const salesOrdersPilotSheetContract: PilotSheetContract<
  OrdersSheetPrimaryRow,
  OrderLineItemSheetRow,
  OrdersSheetSummary
> = {
  workbookAdapter: salesOrdersWorkbookPilotAdapter,
  selectionQueryParam: "orderId",
  primaryTable: {
    id: "orders-primary-table",
    label: "Orders Queue",
    role: "primary",
    columns: ordersPrimaryColumnPresets,
    getRowIdentity: row => row.identity,
  },
  supportingTables: [
    {
      id: "orders-line-items-table",
      label: "Order Line Items",
      role: "child-detail",
      columns: orderLineItemColumnPresets,
      getRowIdentity: row => row.identity,
    },
  ],
  capabilityIds: pilotCapabilityProofCases
    .filter(caseItem => caseItem.capabilityId.startsWith("SALE-ORD-"))
    .map(caseItem => caseItem.capabilityId),
  buildSummary: rows => ({
    draftCount: rows.filter(row => row.isDraft).length,
    activeCount: rows.filter(row => !row.isDraft).length,
    readyForPackingCount: rows.filter(
      row => row.fulfillmentStatus === "READY_FOR_PACKING"
    ).length,
    shippedCount: rows.filter(row => row.fulfillmentStatus === "SHIPPED")
      .length,
    totalValue: rows.reduce((sum, row) => sum + row.total, 0),
  }),
};

export const mapInventoryEnhancedItemsToSheetRows = (
  items: InventoryEnhancedRecord[]
): InventorySheetPrimaryRow[] =>
  items.map(item => ({
    identity: createRowIdentity("batch", item.id, "primary"),
    batchId: item.id,
    sku: item.sku,
    productName: item.productName,
    category: item.category,
    subcategory: item.subcategory,
    vendorName: item.vendorName,
    brandName: item.brandName,
    status: item.status,
    grade: item.grade,
    onHandQty: item.onHandQty,
    reservedQty: item.reservedQty,
    availableQty: item.availableQty,
    unitCogs: item.unitCogs,
    totalValue: item.totalValue,
    receivedDate: item.receivedDate,
    ageDays: item.ageDays,
    ageBracket: item.ageBracket,
    stockStatus: item.stockStatus,
    lastMovementDate: item.lastMovementDate,
    movementHistory: item.movementHistory ?? [],
  }));

export const mapInventoryMovementHistoryToRows = (
  row: InventorySheetPrimaryRow | null
): InventoryMovementRow[] =>
  (row?.movementHistory ?? []).map(movement => ({
    identity: createRowIdentity(
      "inventoryMovement",
      movement.id,
      "summary-support"
    ),
    movementId: movement.id,
    movementType: movement.type,
    quantityChange: numberOrZero(movement.quantityChange),
    timestamp: movement.timestamp,
    performedBy: movement.performedBy,
    notes: movement.notes,
  }));

export const buildInventorySheetSummary = (
  rows: InventorySheetPrimaryRow[],
  dashboardStats?: InventoryDashboardSummary | null
): InventorySheetSummary => ({
  totalRows: rows.length,
  totalOnHand:
    dashboardStats?.totalUnits ??
    rows.reduce((sum, row) => sum + row.onHandQty, 0),
  totalAvailable: rows.reduce((sum, row) => sum + row.availableQty, 0),
  totalValue:
    dashboardStats?.totalInventoryValue ??
    rows.reduce((sum, row) => sum + (row.totalValue ?? 0), 0),
  liveRows:
    dashboardStats?.statusCounts?.LIVE ??
    rows.filter(row => row.status === "LIVE").length,
});

export const mapOrdersToSheetRows = (
  rows: OrderQueueRecord[],
  getClientName: (clientId: number) => string
): OrdersSheetPrimaryRow[] =>
  rows.map(row => ({
    identity: createRowIdentity(
      "order",
      row.id,
      row.isDraft ? "stage-lane" : "primary",
      row.version
    ),
    orderId: row.id,
    orderNumber: row.orderNumber,
    clientId: row.clientId,
    clientName: getClientName(row.clientId),
    isDraft: row.isDraft,
    orderType: row.orderType ?? null,
    fulfillmentStatus: row.fulfillmentStatus ?? null,
    paymentStatus: row.saleStatus ?? null,
    invoiceId: row.invoiceId ?? null,
    total: numberOrZero(row.total),
    createdAt: row.createdAt ?? null,
    confirmedAt: row.confirmedAt ?? null,
    version: row.version ?? null,
  }));

export const mapOrderLineItemsToSheetRows = (
  rows: OrderLineItemRecord[]
): OrderLineItemSheetRow[] =>
  rows.map(row => ({
    identity: createRowIdentity("orderLineItem", row.id, "child-detail"),
    lineItemId: row.id,
    batchId: row.batchId,
    batchSku: row.batchSku ?? null,
    productDisplayName: row.productDisplayName ?? "Unnamed item",
    quantity: numberOrZero(row.quantity),
    cogsPerUnit: numberOrZero(row.cogsPerUnit),
    marginPercent: numberOrZero(row.marginPercent),
    unitPrice: numberOrZero(row.unitPrice),
    lineTotal: numberOrZero(row.lineTotal),
    isSample: row.isSample === true || row.isSample === 1,
  }));

export const buildOrdersSheetSummary = (
  draftRows: OrdersSheetPrimaryRow[],
  activeRows: OrdersSheetPrimaryRow[]
): OrdersSheetSummary => {
  const allRows = [...draftRows, ...activeRows];
  return {
    draftCount: draftRows.length,
    activeCount: activeRows.length,
    readyForPackingCount: activeRows.filter(
      row => row.fulfillmentStatus === "READY_FOR_PACKING"
    ).length,
    shippedCount: activeRows.filter(row => row.fulfillmentStatus === "SHIPPED")
      .length,
    totalValue: allRows.reduce((sum, row) => sum + row.total, 0),
  };
};
