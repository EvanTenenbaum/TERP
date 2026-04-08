import { buildPickListExportOptions } from "./fulfillmentPickList";

describe("fulfillment pick list export helper", () => {
  it("builds pick-list export options with batch-location framing", () => {
    const options = buildPickListExportOptions("ORD 1001");

    expect(options.filename).toBe("pick_list_ORD_1001");
    expect(options.addTimestamp).toBe(true);
    expect(options.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "batchLocation",
          label: "Batch Location",
        }),
      ])
    );
  });
});
