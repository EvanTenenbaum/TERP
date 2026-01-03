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
