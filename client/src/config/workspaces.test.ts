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
  // TER-815: "intake" tab added as a first-class tab for direct intake (sheet-native pilot)
  it("exposes the inventory workspace tabs with intake, receiving, and shipping labels", () => {
    expect(INVENTORY_WORKSPACE.title).toBe("Inventory");
    expect(INVENTORY_WORKSPACE.homePath).toBe("/inventory");
    expect(INVENTORY_WORKSPACE.tabs).toEqual([
      { value: "inventory", label: "Inventory" },
      { value: "intake", label: "Intake" },
      { value: "receiving", label: "Receiving" },
      { value: "shipping", label: "Shipping" },
      { value: "photography", label: "Photography" },
      { value: "samples", label: "Samples" },
    ]);
  });
});
