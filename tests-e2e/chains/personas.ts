/**
 * User Persona Definitions
 *
 * Realistic employee persona simulations for staging load tests.
 * Each persona drives a set of daily and occasional chain workflows.
 */

import type { UserPersona } from "./types";

export const PERSONAS: UserPersona[] = [
  {
    persona_id: "jordan-sales",
    name: "Jordan (Sales Rep)",
    role_description:
      "Manages client relationships, creates quotes and orders, sends sales sheets",
    daily_chains: [
      "sales.check-dashboard",
      "sales.review-orders",
      "sales.create-client",
      "sales.create-order",
      "sales.create-sales-sheet",
      "sales.manage-client-profile",
    ],
    occasional_chains: [
      "sales.process-return",
      "sales.manage-credits",
      "sales.edit-pricing-rules",
    ],
  },
  {
    persona_id: "alex-inventory",
    name: "Alex (Inventory Manager)",
    role_description:
      "Receives shipments, manages batches, tracks stock levels, handles transfers",
    daily_chains: [
      "inventory.check-dashboard",
      "inventory.review-batches",
      "inventory.create-batch",
      "inventory.record-movement",
      "inventory.manage-locations",
      "inventory.check-low-stock",
    ],
    occasional_chains: [
      "inventory.adjust-inventory",
      "inventory.manage-strains",
      "inventory.process-intake",
    ],
  },
  {
    persona_id: "sam-accounting",
    name: "Sam (Accountant)",
    role_description:
      "Generates invoices, records payments, manages bills, handles reconciliation",
    daily_chains: [
      "accounting.check-dashboard",
      "accounting.review-invoices",
      "accounting.generate-invoice",
      "accounting.record-payment",
      "accounting.review-bills",
      "accounting.check-overdue",
    ],
    occasional_chains: [
      "accounting.manage-chart-of-accounts",
      "accounting.manage-fiscal-periods",
      "accounting.review-general-ledger",
    ],
  },
  {
    persona_id: "casey-ops",
    name: "Casey (Operations Manager)",
    role_description:
      "Oversees daily operations, manages scheduling, reviews analytics, handles workflow",
    daily_chains: [
      "ops.check-dashboard",
      "ops.review-workflow-queue",
      "ops.manage-calendar",
      "ops.review-analytics",
      "ops.search-records",
      "ops.manage-todos",
    ],
    occasional_chains: [
      "ops.manage-users",
      "ops.manage-feature-flags",
      "ops.review-notifications",
    ],
  },
];
