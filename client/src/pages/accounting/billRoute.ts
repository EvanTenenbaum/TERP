export interface BillRouteContext {
  billId: number | null;
  statusFilter: BillStatusFilter | null;
}

type BillStatusFilter =
  | "DRAFT"
  | "RECEIVED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

function parseBillStatusFilter(value: string | null): BillStatusFilter | null {
  switch (value) {
    case "DRAFT":
    case "RECEIVED":
    case "PARTIAL":
    case "PAID":
    case "OVERDUE":
    case "VOID":
      return value;
    default:
      return null;
  }
}

export interface BillRouteCandidate {
  id: number;
}

export function parseBillRouteContext(search: string): BillRouteContext {
  const params = new URLSearchParams(search);
  const rawBillId = params.get("id");
  const billId = rawBillId ? Number(rawBillId) : Number.NaN;

  return {
    billId: Number.isInteger(billId) && billId > 0 ? billId : null,
    statusFilter: parseBillStatusFilter(params.get("status")),
  };
}

export function findBillByRouteId<T extends BillRouteCandidate>(
  bills: readonly T[],
  billId: number | null
): T | null {
  if (billId === null) {
    return null;
  }

  return bills.find(bill => bill.id === billId) ?? null;
}
