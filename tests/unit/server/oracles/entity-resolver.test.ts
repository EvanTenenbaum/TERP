import { describe, expect, it } from "vitest";
import {
  extractRouteParameters,
  inferEntityTypeFromPath,
  isValidEntityId,
  replacePathParameter,
} from "../../../../tests-e2e/oracles/lib/entity-resolver";

describe("entity resolver helpers", () => {
  it("extracts all route parameters in order", () => {
    expect(extractRouteParameters("/orders/:orderId/items/:itemId")).toEqual([
      "orderId",
      "itemId",
    ]);
  });

  it("infers entity type from route path", () => {
    expect(inferEntityTypeFromPath("/accounting/invoices/:id")).toBe(
      "invoices"
    );
    expect(inferEntityTypeFromPath("/clients/:clientId/orders/:orderId")).toBe(
      "orders"
    );
    expect(
      inferEntityTypeFromPath(
        "/clients/550e8400-e29b-41d4-a716-446655440000/orders"
      )
    ).toBe("orders");
  });

  it("validates ID patterns and rejects placeholders", () => {
    expect(isValidEntityId("invoices", "INV-20260122-00315")).toBe(true);
    expect(isValidEntityId("orders", "ORD-12345")).toBe(true);
    expect(isValidEntityId("invoices", ":id")).toBe(false);
    expect(isValidEntityId("clients", "undefined")).toBe(false);
  });

  it("replaces a named parameter in path", () => {
    expect(
      replacePathParameter("/orders/:orderId/invoice", "orderId", "ORD-222")
    ).toBe("/orders/ORD-222/invoice");
  });
});
