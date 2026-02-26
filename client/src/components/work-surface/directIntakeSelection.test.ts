/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from "vitest";
import {
  createDirectIntakeRemovalPlan,
  submitRowsWithGuaranteedCleanup,
  type DirectIntakeRowSnapshot,
} from "./directIntakeSelection";

const buildRow = (
  id: string,
  status: DirectIntakeRowSnapshot["status"]
): DirectIntakeRowSnapshot => ({
  id,
  status,
});

describe("createDirectIntakeRemovalPlan", () => {
  it("blocks removal when all pending rows are selected", () => {
    const rows = [buildRow("a", "pending"), buildRow("b", "pending")];
    const plan = createDirectIntakeRemovalPlan(rows, ["a", "b"]);

    expect(plan.blocked).toBe(true);
    expect(plan.removedIds).toEqual([]);
    expect(plan.nextRows).toEqual(rows);
  });

  it("removes only selected pending rows when at least one pending row remains", () => {
    const rows = [
      buildRow("a", "pending"),
      buildRow("b", "pending"),
      buildRow("c", "submitted"),
    ];
    const plan = createDirectIntakeRemovalPlan(rows, ["a"]);

    expect(plan.blocked).toBe(false);
    expect(plan.removedIds).toEqual(["a"]);
    expect(plan.nextRows).toEqual([
      buildRow("b", "pending"),
      buildRow("c", "submitted"),
    ]);
  });

  it("returns unchanged rows when selected ids are not pending", () => {
    const rows = [buildRow("a", "pending"), buildRow("b", "submitted")];
    const plan = createDirectIntakeRemovalPlan(rows, ["b"]);

    expect(plan.blocked).toBe(false);
    expect(plan.removedIds).toEqual([]);
    expect(plan.nextRows).toEqual(rows);
  });
});

describe("submitRowsWithGuaranteedCleanup", () => {
  it("calls cleanup after successful submission", async () => {
    const cleanup = vi.fn();
    const submit = vi.fn(async () => {});

    await submitRowsWithGuaranteedCleanup([1, 2], submit, cleanup);

    expect(submit).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("calls cleanup and rethrows when submit fails", async () => {
    const cleanup = vi.fn();
    const submit = vi
      .fn(async (row: number) => {
        if (row === 2) {
          throw new Error("submit failed");
        }
      })
      .mockName("submitRow");

    await expect(
      submitRowsWithGuaranteedCleanup([1, 2], submit, cleanup)
    ).rejects.toThrow("submit failed");

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
