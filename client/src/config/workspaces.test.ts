import { describe, expect, it } from "vitest";
import { ACCOUNTING_WORKSPACE, INVENTORY_WORKSPACE } from "./workspaces";

describe("ACCOUNTING_WORKSPACE", () => {
  it("keeps the invoice and banking surfaces in the valid tab list", () => {
    // Values must match the four-group ordering introduced in TER-1305
    // (Overview / Receivables / Payables / Ledger) so the flat-rail fallback
    // lines up with the grouped rail reading order.
    expect(ACCOUNTING_WORKSPACE.tabs.map(tab => tab.value)).toEqual([
      "dashboard",
      "invoices",
      "payments",
      "bills",
      "expenses",
      "general-ledger",
      "chart-of-accounts",
      "bank-accounts",
      "bank-transactions",
      "fiscal-periods",
    ]);
  });

  it("declares four tab groups that cover every flat tab exactly once", () => {
    // TER-1305: two-level rail reorganises the 10 flat tabs into Overview,
    // Receivables, Payables, and Ledger groups. The grouped view MUST be a
    // partition of the flat tabs so every surface remains reachable.
    expect(ACCOUNTING_WORKSPACE.tabGroups).toBeDefined();
    const groups = ACCOUNTING_WORKSPACE.tabGroups ?? [];
    expect(groups.map(group => group.label)).toEqual([
      "Overview",
      "Receivables",
      "Payables",
      "Ledger",
    ]);

    const groupedValues = groups.flatMap(group =>
      group.tabs.map(tab => tab.value)
    );
    const flatValues = ACCOUNTING_WORKSPACE.tabs.map(tab => tab.value);
    expect([...groupedValues].sort()).toEqual([...flatValues].sort());
    expect(new Set(groupedValues).size).toBe(groupedValues.length);
  });
});

describe("INVENTORY_WORKSPACE", () => {
  it("exposes the inventory workspace tabs with direct and PO-linked intake labels", () => {
    expect(INVENTORY_WORKSPACE.title).toBe("Inventory");
    expect(INVENTORY_WORKSPACE.homePath).toBe("/inventory");
    expect(INVENTORY_WORKSPACE.tabs).toEqual([
      { value: "inventory", label: "Inventory" },
      { value: "intake", label: "Direct Intake" },
      { value: "receiving", label: "Product Intake" },
      { value: "shipping", label: "Shipping" },
      { value: "photography", label: "Photography" },
      { value: "samples", label: "Samples" },
    ]);
  });
});
