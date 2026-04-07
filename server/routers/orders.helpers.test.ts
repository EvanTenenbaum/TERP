import { describe, expect, it } from "vitest";
import {
  buildPersistedDraftItemKey,
  isOrderAlreadyConfirmed,
  parsePersistedDraftItems,
} from "./orders";

describe("orders router helpers", () => {
  it("keeps separate persisted draft metadata buckets for sample and regular rows", () => {
    const lookup = parsePersistedDraftItems([
      {
        batchId: 101,
        isSample: false,
        productId: 11,
        batchSku: "LOT-REG",
        productDisplayName: "Regular row",
        quantity: 2,
        unitPrice: 10,
      },
      {
        batchId: 101,
        isSample: true,
        productId: 22,
        batchSku: "LOT-SAMPLE",
        productDisplayName: "Sample row",
        quantity: 1,
        unitPrice: 0,
      },
      {
        batchId: 101,
        isSample: false,
        productId: 33,
        batchSku: "LOT-REG-2",
        productDisplayName: "Second regular row",
        quantity: 3,
        unitPrice: 12,
      },
    ]);

    expect(
      lookup
        .get(buildPersistedDraftItemKey(101, false))
        ?.map(item => item.productId)
    ).toEqual([11, 33]);
    expect(
      lookup
        .get(buildPersistedDraftItemKey(101, true))
        ?.map(item => item.productId)
    ).toEqual([22]);
  });

  it("treats only non-draft orders with confirmedAt as already confirmed", () => {
    expect(
      isOrderAlreadyConfirmed({ isDraft: false, confirmedAt: new Date() })
    ).toBe(true);
    expect(isOrderAlreadyConfirmed({ isDraft: false, confirmedAt: null })).toBe(
      false
    );
    expect(
      isOrderAlreadyConfirmed({ isDraft: true, confirmedAt: new Date() })
    ).toBe(false);
  });
});
