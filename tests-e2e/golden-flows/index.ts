/**
 * Golden Flow E2E Test Suite (UXS-602)
 *
 * Comprehensive regression tests for critical user flows
 * implementing Work Surface patterns.
 *
 * Test Files:
 * - order-creation.spec.ts: Order creation flow
 * - order-to-invoice.spec.ts: Invoice generation
 * - invoice-to-payment.spec.ts: Payment recording
 * - pick-pack-fulfillment.spec.ts: Warehouse operations
 * - work-surface-keyboard.spec.ts: Keyboard contract validation
 * - cmd-k-enforcement.spec.ts: Command palette scope (UXS-603)
 *
 * Run all golden flow tests:
 *   npx playwright test tests-e2e/golden-flows/
 *
 * Run specific flow:
 *   npx playwright test tests-e2e/golden-flows/order-creation.spec.ts
 */

export const GOLDEN_FLOWS = [
  "order-creation",
  "order-to-invoice",
  "invoice-to-payment",
  "pick-pack-fulfillment",
  "work-surface-keyboard",
  "cmd-k-enforcement",
] as const;

export type GoldenFlow = (typeof GOLDEN_FLOWS)[number];

export const FLOW_DESCRIPTIONS: Record<GoldenFlow, string> = {
  "order-creation": "Complete order creation from inventory to confirmation",
  "order-to-invoice": "Generate and manage invoices from orders",
  "invoice-to-payment": "Record payments against invoices",
  "pick-pack-fulfillment": "Warehouse pick and pack operations",
  "work-surface-keyboard": "Keyboard navigation contract validation",
  "cmd-k-enforcement": "Command palette scope enforcement (UXS-603)",
};
