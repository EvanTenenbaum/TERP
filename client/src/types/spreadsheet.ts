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

export interface ClientGridRow {
  id: string;
  orderId: number;
  date: string | null;
  vendorCode: string | null;
  item: string;
  qty: number;
  unitPrice: number;
  total: number;
  payment: string | null;
  note: string | null;
  paid: boolean;
  invoiced: boolean;
  confirmed: boolean;
}

export interface ClientGridSummary {
  total: number;
  balance: number;
  yearToDate: number;
}

// Intake Grid Types (TERP-SS-001)
export interface IntakeGridRow {
  id: string; // Temporary ID for new rows
  vendorId: number | null;
  vendorName: string;
  category: string;
  item: string;
  qty: number;
  cogs: number;
  paymentTerms: string;
  locationId: number | null;
  locationName: string;
  notes: string;
  status: "pending" | "submitted" | "error";
  errorMessage?: string;
}

export interface IntakeGridSummary {
  totalItems: number;
  totalQty: number;
  totalValue: number;
}

// Pick & Pack Grid Types (TERP-SS-002)
export interface PickPackGridRow {
  orderId: number;
  orderNumber: string;
  clientId: number;
  clientName: string;
  orderDate: string | null;
  itemCount: number;
  packedCount: number;
  bagCount: number;
  pickPackStatus: "PENDING" | "PICKING" | "PACKED" | "READY";
  total: number | null;
}

export interface PickPackStats {
  pending: number;
  picking: number;
  packed: number;
  ready: number;
  total: number;
}
