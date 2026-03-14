export interface BillRouteContext {
  billId: number | null;
}

export function parseBillRouteContext(search: string): BillRouteContext {
  const params = new URLSearchParams(search);
  const rawBillId = params.get("id");
  const billId = rawBillId ? Number(rawBillId) : Number.NaN;

  return {
    billId: Number.isInteger(billId) && billId > 0 ? billId : null,
  };
}
