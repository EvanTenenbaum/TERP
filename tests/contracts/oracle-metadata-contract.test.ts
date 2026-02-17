import path from "path";
import { describe, expect, it } from "vitest";
import { loadOraclesFromDir } from "../../tests-e2e/oracles/loader";

const ORACLES_ROOT = path.resolve(process.cwd(), "tests-e2e/oracles");

/**
 * Canonical set of critical tier1 flows. Adding to this set is always safe.
 * Removing a flow from this set requires explicit review — the guard test
 * below will fail if a tier1 flow is demoted without updating this allowlist.
 */
const CRITICAL_TIER1_FLOWS = new Set([
  "Accounting.COGS.UpdateBatchCogs",
  "Accounting.Invoices.GenerateFromOrder",
  "Accounting.Invoices.ListInvoices",
  "Accounting.Invoices.MarkSent",
  "Accounting.Invoices.UpdateStatus",
  "Accounting.Invoices.Void",
  "Auth.Login.SuperAdmin",
  "CRM.Clients.Archive",
  "CRM.Clients.Communications.Add",
  "CRM.Clients.Create",
  "CRM.Clients.CreateClient",
  "CRM.Clients.Delete",
  "CRM.Clients.ListClients",
  "CRM.Clients.Tags.Add",
  "CRM.Clients.Transactions.Create",
  "CRM.Clients.Transactions.RecordPayment",
  "CRM.Clients.Update",
  "Dashboard.Main.ViewDashboard",
  "Inventory.Batches.CreateBatch",
  "Inventory.Batches.ListBatches",
  "Inventory.Batches.UpdateBatch",
  "Inventory.Batches.UpdateStatus",
  "Inventory.Movements.AdjustInventory",
  "Inventory.Movements.RecordMovement",
  "Orders.DraftOrders.ConfirmDraftOrder",
  "Orders.DraftOrders.CreateDraftEnhanced",
  "Orders.DraftOrders.FinalizeDraft",
  "Orders.DraftOrders.UpdateDraftEnhanced",
  "Orders.Fulfillment.ConfirmOrder",
  "Orders.Fulfillment.FulfillOrder",
  "Orders.OrderStatus.UpdateOrderStatus",
  "Orders.Orders.Create",
  "Orders.Orders.ListOrders",
  "Orders.Orders.NavigateCreateOrder",
]);

/**
 * Minimum number of tier1 flows. This guard prevents silent erosion of
 * critical flow coverage. If you legitimately need to reduce this number,
 * update the constant and document the reason.
 */
const MIN_TIER1_COUNT = 34;

/**
 * Minimum number of mutation flows with expected_db contracts.
 * Prevents silent removal of DB assertion requirements.
 * Last updated: 2026-02-17 (TER-249: strengthened oracle DB assertions,
 * added mutation tag to CRM.Clients.CreateClient, deepened assertions
 * across 11 existing oracles). Count reflects valid oracle files only
 * (procurement/gf-002-procure-to-pay.oracle.yaml excluded due to pre-existing
 * YAML parse error: duplicated mapping key "bills").
 */
const MIN_MUTATION_WITH_DB_COUNT = 30;

describe("oracle metadata contract", () => {
  const oracles = loadOraclesFromDir(ORACLES_ROOT);
  const flowMap = new Map(oracles.map(oracle => [oracle.flow_id, oracle]));

  it("keeps critical flows in tier1", () => {
    const violations: string[] = [];

    for (const flowId of CRITICAL_TIER1_FLOWS) {
      const oracle = flowMap.get(flowId);
      if (!oracle) {
        violations.push(`${flowId}: missing oracle file`);
        continue;
      }
      if (!oracle.tags?.includes("tier1")) {
        violations.push(`${flowId}: missing tier1 tag`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("requires expected_db on critical mutation flows", () => {
    const violations: string[] = [];

    for (const flowId of CRITICAL_TIER1_FLOWS) {
      const oracle = flowMap.get(flowId);
      if (!oracle) continue;
      if (!oracle.tags?.includes("mutation")) continue;
      if (!oracle.expected_db) {
        violations.push(`${flowId}: missing expected_db`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("prevents silent tier1 demotion (minimum count guard)", () => {
    const tier1Oracles = oracles.filter(o => o.tags?.includes("tier1"));
    expect(tier1Oracles.length).toBeGreaterThanOrEqual(MIN_TIER1_COUNT);
  });

  it("prevents silent mutation DB contract erosion", () => {
    const mutationsWithDb = oracles.filter(
      o => o.tags?.includes("mutation") && o.expected_db
    );
    expect(mutationsWithDb.length).toBeGreaterThanOrEqual(
      MIN_MUTATION_WITH_DB_COUNT
    );
  });

  it("detects tier1 flows not in CRITICAL_TIER1_FLOWS allowlist", () => {
    const untracked: string[] = [];
    for (const oracle of oracles) {
      if (!oracle.tags?.includes("tier1")) continue;
      if (!CRITICAL_TIER1_FLOWS.has(oracle.flow_id)) {
        untracked.push(oracle.flow_id);
      }
    }
    // This test documents drift — untracked tier1 flows should be added
    // to CRITICAL_TIER1_FLOWS or explicitly demoted to tier2.
    expect(untracked).toEqual([]);
  });
});
