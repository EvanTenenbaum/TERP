import path from "path";
import { describe, expect, it } from "vitest";
import { loadOraclesFromDir } from "../../tests-e2e/oracles/loader";

const ORACLES_ROOT = path.resolve(process.cwd(), "tests-e2e/oracles");

const CRITICAL_TIER1_FLOWS = new Set([
  "Accounting.COGS.UpdateBatchCogs",
  "Accounting.Invoices.MarkSent",
  "CRM.Clients.Archive",
  "CRM.Clients.Communications.Add",
  "CRM.Clients.Create",
  "CRM.Clients.Delete",
  "CRM.Clients.Tags.Add",
  "CRM.Clients.Transactions.Create",
  "CRM.Clients.Transactions.RecordPayment",
  "CRM.Clients.Update",
  "Inventory.Batches.CreateBatch",
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
]);

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
});
