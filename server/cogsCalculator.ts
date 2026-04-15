/**
 * COGS Calculator
 * Shared helpers for fixed and range-based vendor COGS.
 */

import type { Batch } from "../drizzle/schema";

export type CogsRangeBasis = "LOW" | "MID" | "HIGH" | "MANUAL";
export type PricingChannel = "SALES_SHEET" | "LIVE_SHOPPING" | "VIP_SHOPPING";

type BatchCogsSnapshot = {
  id: number;
  cogsMode: "FIXED" | "RANGE";
  unitCogs?: string | null;
  unitCogsMin?: string | null;
  unitCogsMax?: string | null;
};

export interface CogsCalculationInput {
  batch: BatchCogsSnapshot;
  client: {
    id: number;
    cogsAdjustmentType:
      | "NONE"
      | "PERCENTAGE"
      | "PERCENTAGE_DECREASE"
      | "PERCENTAGE_INCREASE"
      | "FIXED_AMOUNT"
      | "FIXED_DECREASE"
      | "FIXED_INCREASE";
    cogsAdjustmentValue: string;
  };
  context: {
    quantity: number;
    salePrice: number;
    paymentTerms?: string;
  };
  rangeBasis?: Exclude<CogsRangeBasis, "MANUAL">;
}

export interface CogsCalculationResult {
  unitCogs: number;
  cogsSource:
    | "FIXED"
    | "LOW"
    | "MIDPOINT"
    | "HIGH"
    | "CLIENT_ADJUSTMENT"
    | "RULE"
    | "MANUAL";
  appliedRule?: string;
  unitMargin: number;
  marginPercent: number;
  effectiveCogsBasis: CogsRangeBasis;
  originalRangeMin: number | null;
  originalRangeMax: number | null;
  isBelowVendorRange: boolean;
}

export interface ResolvedBatchCogs {
  cogsMode: "FIXED" | "RANGE";
  unitCogs: number;
  cogsSource: CogsCalculationResult["cogsSource"];
  effectiveCogsBasis: CogsRangeBasis;
  originalRangeMin: number | null;
  originalRangeMax: number | null;
  isBelowVendorRange: boolean;
}

function parseDecimal(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number.parseFloat(value || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function midpoint(min: number, max: number): number {
  return (min + max) / 2;
}

export function resolveBatchCogs(
  batch: BatchCogsSnapshot,
  options: {
    rangeBasis?: CogsRangeBasis;
    manualCogs?: number | null;
  } = {}
): ResolvedBatchCogs {
  const originalRangeMin =
    batch.cogsMode === "RANGE" ? parseDecimal(batch.unitCogsMin) : null;
  const originalRangeMax =
    batch.cogsMode === "RANGE" ? parseDecimal(batch.unitCogsMax) : null;

  if (typeof options.manualCogs === "number") {
    const manualCogs = Math.max(0, options.manualCogs);
    return {
      cogsMode: batch.cogsMode,
      unitCogs: manualCogs,
      cogsSource: "MANUAL",
      effectiveCogsBasis: "MANUAL",
      originalRangeMin,
      originalRangeMax,
      isBelowVendorRange:
        originalRangeMin !== null ? manualCogs < originalRangeMin : false,
    };
  }

  if (batch.cogsMode === "FIXED") {
    return {
      cogsMode: "FIXED",
      unitCogs: parseDecimal(batch.unitCogs),
      cogsSource: "FIXED",
      effectiveCogsBasis: "MANUAL",
      originalRangeMin: null,
      originalRangeMax: null,
      isBelowVendorRange: false,
    };
  }

  const min = originalRangeMin ?? 0;
  const max = originalRangeMax ?? min;
  const basis = options.rangeBasis ?? "MID";

  if (basis === "LOW") {
    return {
      cogsMode: "RANGE",
      unitCogs: min,
      cogsSource: "LOW",
      effectiveCogsBasis: "LOW",
      originalRangeMin,
      originalRangeMax,
      isBelowVendorRange: false,
    };
  }

  if (basis === "HIGH") {
    return {
      cogsMode: "RANGE",
      unitCogs: max,
      cogsSource: "HIGH",
      effectiveCogsBasis: "HIGH",
      originalRangeMin,
      originalRangeMax,
      isBelowVendorRange: false,
    };
  }

  return {
    cogsMode: "RANGE",
    unitCogs: midpoint(min, max),
    cogsSource: "MIDPOINT",
    effectiveCogsBasis: "MID",
    originalRangeMin,
    originalRangeMax,
    isBelowVendorRange: false,
  };
}

export function calculateCogs(
  input: CogsCalculationInput
): CogsCalculationResult {
  const { batch, client, context } = input;

  const resolved = resolveBatchCogs(batch, {
    rangeBasis: input.rangeBasis ?? "MID",
  });

  let finalCogs = resolved.unitCogs;
  let cogsSource = resolved.cogsSource;

  if (
    client.cogsAdjustmentType === "PERCENTAGE" ||
    client.cogsAdjustmentType === "PERCENTAGE_DECREASE"
  ) {
    const adjustmentPercent = parseDecimal(client.cogsAdjustmentValue);
    finalCogs = finalCogs * (1 - adjustmentPercent / 100);
    cogsSource = "CLIENT_ADJUSTMENT";
  } else if (client.cogsAdjustmentType === "PERCENTAGE_INCREASE") {
    const adjustmentPercent = parseDecimal(client.cogsAdjustmentValue);
    finalCogs = finalCogs * (1 + adjustmentPercent / 100);
    cogsSource = "CLIENT_ADJUSTMENT";
  } else if (
    client.cogsAdjustmentType === "FIXED_AMOUNT" ||
    client.cogsAdjustmentType === "FIXED_DECREASE"
  ) {
    const adjustmentAmount = parseDecimal(client.cogsAdjustmentValue);
    finalCogs = finalCogs - adjustmentAmount;
    cogsSource = "CLIENT_ADJUSTMENT";
  } else if (client.cogsAdjustmentType === "FIXED_INCREASE") {
    const adjustmentAmount = parseDecimal(client.cogsAdjustmentValue);
    finalCogs = finalCogs + adjustmentAmount;
    cogsSource = "CLIENT_ADJUSTMENT";
  }

  if (
    resolved.originalRangeMin !== null &&
    resolved.originalRangeMax !== null
  ) {
    finalCogs = Math.max(
      resolved.originalRangeMin,
      Math.min(resolved.originalRangeMax, finalCogs)
    );
  }

  finalCogs = Math.max(0, finalCogs);

  const unitMargin = context.salePrice - finalCogs;
  const marginPercent =
    context.salePrice > 0 && Math.abs(context.salePrice) > 0.01
      ? (unitMargin / context.salePrice) * 100
      : 0;

  return {
    unitCogs: finalCogs,
    cogsSource,
    unitMargin,
    marginPercent,
    effectiveCogsBasis: resolved.effectiveCogsBasis,
    originalRangeMin: resolved.originalRangeMin,
    originalRangeMax: resolved.originalRangeMax,
    isBelowVendorRange:
      resolved.originalRangeMin !== null
        ? finalCogs < resolved.originalRangeMin
        : false,
  };
}

export function getBaseCogs(
  batch: Pick<Batch, "cogsMode" | "unitCogs" | "unitCogsMin" | "unitCogsMax">,
  rangeBasis: Exclude<CogsRangeBasis, "MANUAL"> = "MID"
): number {
  return resolveBatchCogs(
    {
      id: 0,
      cogsMode: batch.cogsMode,
      unitCogs: batch.unitCogs,
      unitCogsMin: batch.unitCogsMin,
      unitCogsMax: batch.unitCogsMax,
    },
    { rangeBasis }
  ).unitCogs;
}

export function applyClientAdjustment(
  baseCogs: number,
  adjustmentType: "NONE" | "PERCENTAGE" | "FIXED_AMOUNT",
  adjustmentValue: string
): number {
  if (adjustmentType === "PERCENTAGE") {
    const percent = parseDecimal(adjustmentValue);
    return baseCogs * (1 - percent / 100);
  }
  if (adjustmentType === "FIXED_AMOUNT") {
    const amount = parseDecimal(adjustmentValue);
    return baseCogs - amount;
  }
  return baseCogs;
}

export function getMarginCategory(
  marginPercent: number
): "excellent" | "good" | "fair" | "low" | "negative" {
  if (marginPercent >= 70) return "excellent";
  if (marginPercent >= 50) return "good";
  if (marginPercent >= 30) return "fair";
  if (marginPercent >= 15) return "low";
  return "negative";
}

export function calculateDueDate(
  paymentTerms: string,
  saleDate: Date = new Date()
): Date {
  const dueDate = new Date(saleDate);

  switch (paymentTerms) {
    case "NET_7":
      dueDate.setDate(dueDate.getDate() + 7);
      break;
    case "NET_15":
      dueDate.setDate(dueDate.getDate() + 15);
      break;
    case "NET_30":
      dueDate.setDate(dueDate.getDate() + 30);
      break;
    case "COD":
      break;
    case "PARTIAL":
    case "CONSIGNMENT":
      dueDate.setDate(dueDate.getDate() + 30);
      break;
  }

  return dueDate;
}
