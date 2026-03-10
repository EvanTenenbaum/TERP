import { describe, expect, it } from "vitest";
import { ACCOUNTING_WORKSPACE, INVENTORY_WORKSPACE } from "./workspaces";

describe("ACCOUNTING_WORKSPACE", () => {
  it("keeps the invoice and banking surfaces in the valid tab list", () => {
    expect(ACCOUNTING_WORKSPACE.tabs.map(tab => tab.value)).toEqual([
      "dashboard",
      "invoices",
      "bills",
      "payments",
      "general-ledger",
      "chart-of-accounts",
      "expenses",
      "bank-accounts",
      "bank-transactions",
      "fiscal-periods",
    ]);
  });
});

describe("INVENTORY_WORKSPACE", () => {
  it("exposes the operations tabs with receiving and shipping labels", () => {
    expect(INVENTORY_WORKSPACE.title).toBe("Operations");
    expect(INVENTORY_WORKSPACE.homePath).toBe("/operations");
    expect(INVENTORY_WORKSPACE.tabs).toEqual([
      { value: "inventory", label: "Inventory" },
      { value: "receiving", label: "Receiving" },
      { value: "shipping", label: "Shipping" },
      { value: "photography", label: "Photography" },
      { value: "samples", label: "Samples" },
    ]);
  });
});
