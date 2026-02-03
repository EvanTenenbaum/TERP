/**
 * Golden Flow E2E Test Suite (UXS-602)
 *
 * Comprehensive regression tests for critical user flows
 * implementing Work Surface patterns.
 *
 * Test Files:
 * - gf-001-direct-intake.spec.ts: Direct intake flow
 * - gf-002-procure-to-pay.spec.ts: Procure-to-pay flow
 * - gf-003-order-to-cash.spec.ts: Order-to-cash flow
 * - gf-004-invoice-payment.spec.ts: Invoice & payment flow
 * - gf-005-pick-pack.spec.ts: Pick & pack flow
 * - gf-006-client-ledger-review.spec.ts: Client ledger review
 * - gf-007-inventory-management.spec.ts: Inventory management flow
 * - gf-008-sample-request.spec.ts: Sample request flow
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
  "gf-001-direct-intake",
  "gf-002-procure-to-pay",
  "gf-003-order-to-cash",
  "gf-004-invoice-payment",
  "gf-005-pick-pack",
  "gf-006-client-ledger-review",
  "gf-007-inventory-management",
  "gf-008-sample-request",
  "order-creation",
  "order-to-invoice",
  "invoice-to-payment",
  "pick-pack-fulfillment",
  "work-surface-keyboard",
  "cmd-k-enforcement",
] as const;

export type GoldenFlow = (typeof GOLDEN_FLOWS)[number];

export const FLOW_DESCRIPTIONS: Record<GoldenFlow, string> = {
  "gf-001-direct-intake": "Direct intake via work surface with batch creation",
  "gf-002-procure-to-pay": "Purchase order creation through receiving",
  "gf-003-order-to-cash": "Order creation through fulfillment and payment",
  "gf-004-invoice-payment": "Invoice generation and payment recording",
  "gf-005-pick-pack": "Pick, pack, and ship fulfillment workflow",
  "gf-006-client-ledger-review": "Client ledger review with filters and export",
  "gf-007-inventory-management": "Inventory adjustment workflow",
  "gf-008-sample-request": "Sample request creation and fulfillment",
  "order-creation": "Complete order creation from inventory to confirmation",
  "order-to-invoice": "Generate and manage invoices from orders",
  "invoice-to-payment": "Record payments against invoices",
  "pick-pack-fulfillment": "Warehouse pick and pack operations",
  "work-surface-keyboard": "Keyboard navigation contract validation",
  "cmd-k-enforcement": "Command palette scope enforcement (UXS-603)",
};
