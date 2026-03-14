import { describe, expect, it } from "vitest";

import { parseBillRouteContext } from "./billRoute";

describe("parseBillRouteContext", () => {
  it("returns a bill id when the deep link is valid", () => {
    expect(parseBillRouteContext("?id=17")).toEqual({
      billId: 17,
    });
  });

  it("drops invalid bill ids", () => {
    expect(parseBillRouteContext("?id=abc")).toEqual({
      billId: null,
    });
    expect(parseBillRouteContext("?id=-4")).toEqual({
      billId: null,
    });
  });
});
