import { SalesConstraint } from "@/types/entities";
import { mockSalesConstraints } from "@/lib/mockData";

export interface ConstraintResult {
  adjusted_qty: number;
  was_rounded: boolean;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export function validateConstraints(constraint: SalesConstraint, qty: number): ValidationResult {
  if (qty < constraint.moq) {
    return {
      valid: false,
      message: `Minimum order quantity is ${constraint.moq}`,
    };
  }

  if (constraint.increment > 1) {
    const remainder = qty % constraint.increment;
    if (remainder !== 0) {
      return {
        valid: false,
        message: `Quantity must be in increments of ${constraint.increment}`,
      };
    }
  }

  return { valid: true, message: "" };
}

/**
 * Apply MOQ (Minimum Order Quantity) constraint
 */
export function applyMOQ(inventoryId: string, qty: number): ConstraintResult {
  const constraint = mockSalesConstraints.find((c) => c.inventory_id === inventoryId);

  if (!constraint) {
    return { adjusted_qty: qty, was_rounded: false };
  }

  if (qty < constraint.moq) {
    return {
      adjusted_qty: constraint.moq,
      was_rounded: true,
      message: `Quantity adjusted to meet minimum order quantity of ${constraint.moq}`,
    };
  }

  return { adjusted_qty: qty, was_rounded: false };
}

/**
 * Apply increment constraint (round to nearest increment)
 */
export function applyIncrement(inventoryId: string, qty: number): ConstraintResult {
  const constraint = mockSalesConstraints.find((c) => c.inventory_id === inventoryId);

  if (!constraint || constraint.increment <= 1) {
    return { adjusted_qty: qty, was_rounded: false };
  }

  const rounded = Math.ceil(qty / constraint.increment) * constraint.increment;

  if (rounded !== qty) {
    return {
      adjusted_qty: rounded,
      was_rounded: true,
      message: `Quantity rounded to nearest increment of ${constraint.increment} (from ${qty} to ${rounded})`,
    };
  }

  return { adjusted_qty: qty, was_rounded: false };
}

/**
 * Apply both MOQ and increment constraints
 */
export function applyConstraints(inventoryId: string, qty: number): ConstraintResult {
  const moqResult = applyMOQ(inventoryId, qty);
  const incrementResult = applyIncrement(inventoryId, moqResult.adjusted_qty);

  if (incrementResult.was_rounded) {
    return incrementResult;
  }

  if (moqResult.was_rounded) {
    return moqResult;
  }

  return { adjusted_qty: qty, was_rounded: false };
}
