import type { EffectiveCogsBasis } from "./COGSInput";

export interface AppliedPricingRule {
  ruleId: number;
  ruleName: string;
  adjustment: string;
}

export interface LineItem {
  id?: number;
  clientRowKey?: string;
  batchId: number;
  batchSku?: string;
  productId?: number;
  productDisplayName?: string;
  quantity: number;
  cogsPerUnit: number;
  originalCogsPerUnit: number;
  cogsMode?: "FIXED" | "RANGE";
  unitCogsMin?: number | null;
  unitCogsMax?: number | null;
  effectiveCogsBasis?: EffectiveCogsBasis;
  originalRangeMin?: number | null;
  originalRangeMax?: number | null;
  isBelowVendorRange?: boolean;
  belowRangeReason?: string;
  isCogsOverridden: boolean;
  cogsOverrideReason?: string;
  marginPercent: number;
  marginDollar: number;
  isMarginOverridden: boolean;
  marginSource: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
  profilePriceAdjustmentPercent?: number | null;
  appliedRules?: AppliedPricingRule[];
  unitPrice: number;
  lineTotal: number;
  isSample: boolean;
}

export interface OrderAdjustment {
  amount: number;
  type: "PERCENT" | "DOLLAR";
  mode: "DISCOUNT" | "MARKUP";
}

export type LineItemMarginSource = "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
export type PaymentTerms =
  | "NET_7"
  | "NET_15"
  | "NET_30"
  | "COD"
  | "PARTIAL"
  | "CONSIGNMENT";

export const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = [
  "NET_7",
  "NET_15",
  "NET_30",
  "COD",
  "PARTIAL",
  "CONSIGNMENT",
];
