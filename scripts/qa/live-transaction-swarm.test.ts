import { describe, expect, it } from "vitest";

import {
  buildExecutionRecord,
  buildLiveTransactionSwarmPlan,
} from "../../tests-e2e/chains/live-transaction-swarm";
import type { ChainResult } from "../../tests-e2e/chains/types";

describe("live transaction swarm planner", () => {
  it("builds a quick bundle with deterministic transaction ids", () => {
    const plan = buildLiveTransactionSwarmPlan("quick", {
      runId: "ltx-run-quick",
      baseUrl: "https://example.test",
      transactionDateCode: "20260328",
    });

    expect(plan.summary.totalTransactions).toBe(12);
    expect(plan.transactions[0]?.transactionId).toBe("LTX-20260328-001");
    expect(new Set(plan.transactions.map(t => t.transactionId)).size).toBe(
      plan.transactions.length
    );
  });

  it("builds a full bundle with dozens of transactions", () => {
    const plan = buildLiveTransactionSwarmPlan("full", {
      runId: "ltx-run-full",
      baseUrl: "https://example.test",
      transactionDateCode: "20260328",
    });

    expect(plan.summary.totalTransactions).toBe(36);
    expect(plan.summary.byLane.accounting).toBeGreaterThan(0);
    expect(plan.summary.byLane.inventory).toBeGreaterThan(0);
    expect(plan.summary.byLane.sales).toBeGreaterThan(0);
  });
});

describe("live transaction execution record", () => {
  it("derives checkpoint and identifier evidence from a successful chain result", () => {
    const plan = buildLiveTransactionSwarmPlan("quick", {
      runId: "ltx-run-quick",
      baseUrl: "https://example.test",
      transactionDateCode: "20260328",
      maxTransactions: 1,
    });
    const transaction = plan.transactions[0];
    if (!transaction) {
      throw new Error("Expected a transaction scenario");
    }

    const result: ChainResult = {
      chain_id: transaction.chainId,
      description: transaction.title,
      success: true,
      duration_ms: 1234,
      phases: [
        {
          phase_id: "save-draft",
          success: true,
          duration_ms: 200,
          steps_completed: 3,
          total_steps: 3,
          extracted_values: {},
          errors: [],
          screenshots: ["save-draft.png"],
        },
        {
          phase_id: "return-and-verify-order",
          success: true,
          duration_ms: 300,
          steps_completed: 2,
          total_steps: 2,
          extracted_values: {},
          errors: [],
          screenshots: ["return.png"],
        },
        {
          phase_id: "edit-order",
          success: true,
          duration_ms: 300,
          steps_completed: 2,
          total_steps: 2,
          extracted_values: {},
          errors: [],
          screenshots: [],
        },
        {
          phase_id: "record-payment",
          success: true,
          duration_ms: 300,
          steps_completed: 2,
          total_steps: 2,
          extracted_values: {},
          errors: [],
          screenshots: [],
        },
      ],
      invariant_results: [{ name: "ledger", passed: true }],
      tags_covered: [],
      stored_snapshot: {
        orderId: "123",
        invoiceId: "987",
      },
    };

    const record = buildExecutionRecord(transaction, result);

    expect(record.status).toBe("passed");
    expect(record.extractedIdentifiers.orderId).toBe("123");
    expect(record.checkpoints.find(c => c.id === "created")?.status).toBe(
      "passed"
    );
    expect(record.checkpoints.find(c => c.id === "persisted")?.status).toBe(
      "passed"
    );
    expect(record.checkpoints.find(c => c.id === "edited")?.status).toBe(
      "passed"
    );
    expect(record.checkpoints.find(c => c.id === "downstream")?.status).toBe(
      "passed"
    );
    expect(record.checkpoints.find(c => c.id === "audit")?.status).toBe(
      "passed"
    );
  });
});
