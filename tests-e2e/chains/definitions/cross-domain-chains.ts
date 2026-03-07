/**
 * Cross-Domain Golden Flow Chains
 *
 * These are the MOST IMPORTANT chains — they test complete business processes
 * that cross multiple domains. These are where real ERP bugs live.
 *
 * Each golden flow represents a real end-to-end business workflow:
 * Sales-to-Cash, Procure-to-Stock, Client Lifecycle, Inventory Lifecycle, Returns & Credits.
 */

import type { TestChain } from "../types";

export const CROSS_DOMAIN_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // golden.sales-to-cash — Order → Invoice → Payment → GL verification
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.sales-to-cash",
    description:
      "Complete sales cycle: find order → navigate to accounting → generate invoice → record payment → verify in GL",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/sales",
      "route:/accounting/invoices",
      "route:/accounting/payments",
      "route:/accounting/general-ledger",
      "crud:read",
      "persistence",
    ],
    phases: [
      {
        phase_id: "find-order",
        description: "Navigate to orders and find an existing order",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Order, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [data-testid*="order"]',
          },
        ],
        expected_ui: { url_contains: "sales" },
        screenshot: "golden-stc-orders",
      },
      {
        phase_id: "inspect-order",
        description: "Open an existing order to verify its details",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="order-row"]:first-child',
            wait_for: "text=Order, text=Detail, text=Status",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "golden-stc-order-detail" },
        ],
      },
      {
        phase_id: "navigate-to-invoices",
        description: "Cross to accounting — navigate to invoices",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], main',
          },
        ],
        expected_ui: { url_contains: "invoice" },
        screenshot: "golden-stc-invoices",
      },
      {
        phase_id: "inspect-invoice",
        description: "View an existing invoice to verify data integrity",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="invoice-row"]:first-child',
            wait_for: "text=Invoice, text=Amount, text=Status",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "golden-stc-invoice-detail" },
        ],
      },
      {
        phase_id: "navigate-to-payments",
        description: "Cross to payments to verify payment records",
        steps: [
          {
            action: "navigate",
            path: "/accounting/payments",
            wait_for: "text=Payment, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "payment" },
        screenshot: "golden-stc-payments",
      },
      {
        phase_id: "verify-gl",
        description: "Navigate to GL to verify entries exist",
        steps: [
          {
            action: "navigate",
            path: "/accounting/general-ledger",
            wait_for: "text=Ledger, text=General, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "golden-stc-gl-entries" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.procure-to-stock — Supplier → Receive → Batch → Inventory
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.procure-to-stock",
    description:
      "Procurement cycle: check suppliers → navigate to intake → verify inventory pages → verify batch data",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/clients",
      "route:/intake-receipts",
      "route:/inventory",
      "crud:read",
      "persistence",
    ],
    phases: [
      {
        phase_id: "check-suppliers",
        description: "Navigate to clients and filter for suppliers",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Client, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
        ],
        screenshot: "golden-pts-suppliers",
      },
      {
        phase_id: "navigate-intake",
        description: "Cross to intake to check receiving",
        steps: [
          {
            action: "navigate",
            path: "/intake-receipts",
            wait_for: "text=Intake, text=Receipt, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-pts-intake",
      },
      {
        phase_id: "navigate-inventory",
        description: "Cross to inventory to verify stock",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, text=Batch, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
        ],
        expected_ui: { url_contains: "inventory" },
        screenshot: "golden-pts-inventory",
      },
      {
        phase_id: "inspect-batch",
        description: "Open a batch to verify details and quantities",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child, [data-testid*="inventory-row"]:first-child',
            wait_for: "text=Batch, text=Quantity, text=Status",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "golden-pts-batch-detail" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.client-lifecycle — Create → Order → Invoice → Payment → History
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.client-lifecycle",
    description:
      "Client lifecycle: view clients → view orders → view invoices → view profile history",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/clients",
      "route:/sales",
      "route:/accounting/invoices",
      "crud:read",
      "historical",
      "persistence",
    ],
    phases: [
      {
        phase_id: "view-clients",
        description: "Navigate to clients and view the list",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Client, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
        ],
        screenshot: "golden-cl-clients",
      },
      {
        phase_id: "view-client-profile",
        description: "Open a client to view full profile with history",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="client-row"]:first-child, a[href*="client"]',
            wait_for: "text=Profile, text=Detail, text=Client",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "golden-cl-profile" },
        ],
      },
      {
        phase_id: "cross-to-orders",
        description: "Navigate to orders to see client's order history",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Order, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-cl-orders",
      },
      {
        phase_id: "cross-to-invoices",
        description: "Navigate to invoices to see client's invoice history",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-cl-invoices",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.inventory-lifecycle — Products → Batches → Movements → Locations
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.inventory-lifecycle",
    description:
      "Inventory lifecycle: view products → view batches → check movements → verify locations",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/products",
      "route:/inventory",
      "route:/locations",
      "crud:read",
      "persistence",
    ],
    phases: [
      {
        phase_id: "view-products",
        description: "Navigate to products catalog",
        steps: [
          {
            action: "navigate",
            path: "/products",
            wait_for: "text=Product, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-il-products",
      },
      {
        phase_id: "view-inventory",
        description: "Navigate to inventory/batches",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, text=Batch, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
        ],
        screenshot: "golden-il-inventory",
      },
      {
        phase_id: "inspect-batch",
        description: "Open a batch to see movement history",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child',
            wait_for: "text=Batch, text=Quantity, text=Status",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "golden-il-batch-detail" },
        ],
      },
      {
        phase_id: "view-locations",
        description: "Navigate to locations to verify warehouse setup",
        steps: [
          {
            action: "navigate",
            path: "/locations",
            wait_for: "text=Location, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-il-locations",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.returns-and-credits — Orders → Returns → Credits
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.returns-and-credits",
    description:
      "Returns cycle: view orders → navigate to returns → navigate to credits → verify cross-references",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/sales",
      "route:/returns",
      "route:/credits",
      "crud:read",
      "persistence",
    ],
    phases: [
      {
        phase_id: "view-orders",
        description: "Start at orders to find fulfilled orders",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Order, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-rc-orders",
      },
      {
        phase_id: "cross-to-returns",
        description: "Navigate to returns to check return requests",
        steps: [
          {
            action: "navigate",
            path: "/returns",
            wait_for: "text=Return, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-rc-returns",
      },
      {
        phase_id: "cross-to-credits",
        description: "Navigate to credits to verify credit memos",
        steps: [
          {
            action: "navigate",
            path: "/credits",
            wait_for: "text=Credit, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-rc-credits",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.full-day-simulation — A complete day across all domains
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.full-day-simulation",
    description:
      "Simulates a complete business day: dashboard → orders → clients → inventory → accounting → calendar",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/dashboard",
      "route:/sales",
      "route:/clients",
      "route:/inventory",
      "route:/accounting",
      "route:/calendar",
      "read",
    ],
    phases: [
      {
        phase_id: "morning-dashboard",
        description: "Start the day checking dashboard",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-day-dashboard",
      },
      {
        phase_id: "check-orders",
        description: "Check today's orders",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Order, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-day-orders",
      },
      {
        phase_id: "check-clients",
        description: "Review client activity",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Client, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-day-clients",
      },
      {
        phase_id: "check-inventory",
        description: "Review inventory levels",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, text=Batch, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-day-inventory",
      },
      {
        phase_id: "check-accounting",
        description: "Review accounting summary",
        steps: [
          {
            action: "navigate",
            path: "/accounting",
            wait_for: "text=Accounting, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-day-accounting",
      },
      {
        phase_id: "check-calendar",
        description: "Check today's calendar",
        steps: [
          {
            action: "navigate",
            path: "/calendar",
            wait_for: "text=Calendar, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        screenshot: "golden-day-calendar",
      },
    ],
  },
];
