import { describe, expect, it } from "vitest";

import { findBillByRouteId, parseBillRouteContext } from "./billRoute";

describe("parseBillRouteContext", () => {
  it("returns a bill id when the deep link is valid", () => {
    expect(parseBillRouteContext("?id=17")).toEqual({
      billId: 17,
      statusFilter: null,
    });
  });

  it("drops invalid bill ids", () => {
    expect(parseBillRouteContext("?id=abc")).toEqual({
      billId: null,
      statusFilter: null,
    });
    expect(parseBillRouteContext("?id=-4")).toEqual({
      billId: null,
      statusFilter: null,
    });
  });

  it("hydrates bill status filters from dashboard handoffs", () => {
    expect(parseBillRouteContext("?status=OVERDUE")).toEqual({
      billId: null,
      statusFilter: "OVERDUE",
    });
  });

  it("resolves bill selection from the route id", () => {
    const bills = [{ id: 17, code: "B-17" }, { id: 18, code: "B-18" }] as const;

    expect(findBillByRouteId(bills, 18)).toEqual({
      id: 18,
      code: "B-18",
    });
    expect(findBillByRouteId(bills, 99)).toBeNull();
    expect(findBillByRouteId(bills, null)).toBeNull();
  });
});
