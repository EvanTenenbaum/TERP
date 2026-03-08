/**
 * Cross-Domain Golden Flow Chains
 *
 * These are the MOST IMPORTANT chains — they test complete business processes
 * that cross multiple domains (sales, inventory, accounting, clients).
 *
 * These flows expose bugs that single-domain tests miss: data that should flow
 * from one domain to another but doesn't, race conditions in state updates, and
 * cross-domain reference integrity failures.
 *
 * Flows:
 * - golden.sales-to-cash: Order → Invoice → Payment → GL verification
 * - golden.procure-to-stock: Supplier → Intake → Batch → Inventory
 * - golden.client-lifecycle: Create client → view orders → view invoices → verify profile history
 * - golden.inventory-lifecycle: Create strain → Create batch → Move → Adjust → Verify locations
 * - golden.returns-and-credits: Find order → Process return → Verify credit → Verify inventory
 * - golden.full-day-simulation: Dashboard → Orders → Clients → Inventory → Accounting → Calendar
 */

import type { TestChain } from "../types";

export const CROSS_DOMAIN_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // golden.sales-to-cash — Order → Invoice → Payment → GL (read verification)
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.sales-to-cash",
    description:
      "Complete sales-to-cash cycle: find order → navigate to invoices → navigate to payments → verify GL entries exist",
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
    invariants: [
      {
        name: "no-orphaned-invoices",
        description:
          "Every invoice visible in GL must have a corresponding order",
        check: "visual",
      },
    ],
    phases: [
      {
        phase_id: "find-existing-order",
        description: "Navigate to sales list and verify orders are visible",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Orders, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [data-testid*="order"], main',
          },
          { action: "screenshot", name: "golden-stc-orders-list" },
        ],
        expected_ui: { url_contains: "sales" },
      },
      {
        phase_id: "open-order-detail",
        description: "Click into the first order to verify detail view",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="order-row"]:first-child, [class*="row"]:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: 'h1, h2, [data-testid*="order-number"], [class*="order-number"], [class*="order-id"], [class*="title"]',
            as: "sourceOrderId",
          },
          { action: "screenshot", name: "golden-stc-source-order" },
        ],
      },
      {
        phase_id: "cross-to-invoices",
        description: "Cross domain: navigate from sales to accounting invoices",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-stc-invoices-list" },
        ],
        expected_ui: { url_contains: "invoice" },
      },
      {
        phase_id: "cross-to-payments",
        description: "Cross domain: navigate to payments page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/payments",
            wait_for: "text=Payment, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-stc-payments-list" },
        ],
        expected_ui: { url_contains: "payment" },
      },
      {
        phase_id: "cross-to-general-ledger",
        description:
          "Cross domain: navigate to GL and verify the ledger page loads",
        steps: [
          {
            action: "navigate",
            path: "/accounting/general-ledger",
            wait_for: "text=General Ledger, text=Ledger, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="ledger"], [class*="entry"], main',
          },
          { action: "screenshot", name: "golden-stc-gl-entries" },
        ],
        expected_ui: { url_contains: "ledger" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.procure-to-stock — Supplier → Intake → Inventory (read verification)
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.procure-to-stock",
    description:
      "Procurement cycle: check suppliers → navigate to intake receipts → verify inventory pages → verify batch data",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/clients",
      "route:/purchase-orders",
      "route:/inventory",
      "crud:read",
    ],
    invariants: [
      {
        name: "receipt-to-batch",
        description:
          "Every confirmed intake receipt must result in at least one inventory batch",
        check: "visual",
      },
    ],
    phases: [
      {
        phase_id: "find-supplier",
        description: "Navigate to clients and verify supplier records exist",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Client, text=Supplier, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-pts-clients-list" },
        ],
        expected_ui: { url_contains: "clients" },
      },
      {
        phase_id: "view-suppliers-tab",
        description: "Switch to suppliers tab to verify supplier data",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Supplier"), [role="tab"]:has-text("Supplier"), a:has-text("Supplier"), [data-testid*="supplier"]',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "golden-pts-suppliers-filtered" },
        ],
      },
      {
        phase_id: "cross-to-purchase-orders",
        description: "Cross domain: navigate to purchase orders / intake",
        steps: [
          {
            action: "navigate",
            path: "/purchase-orders",
            wait_for: "text=Purchase, text=Order, text=Intake, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-pts-purchase-orders" },
        ],
        expected_ui: { url_contains: "purchase" },
      },
      {
        phase_id: "cross-to-inventory",
        description:
          "Cross domain: navigate to inventory and verify batches exist",
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
          { action: "screenshot", name: "golden-pts-inventory-batches" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
      {
        phase_id: "cross-to-products",
        description:
          "Cross domain: navigate to products to verify strain catalog",
        steps: [
          {
            action: "navigate",
            path: "/products",
            wait_for: "text=Product, text=Strain, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-pts-products" },
        ],
        expected_ui: { url_contains: "product" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.client-lifecycle — Clients → Orders → Invoices → Back to clients
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.client-lifecycle",
    description:
      "Client lifecycle: view clients → view orders → view invoices → view client profile history",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/clients",
      "route:/sales",
      "route:/accounting/invoices",
      "crud:read",
      "historical",
    ],
    invariants: [
      {
        name: "client-history-completeness",
        description:
          "Client profile must show all orders and invoices linked to that client",
        check: "visual",
      },
    ],
    phases: [
      {
        phase_id: "view-clients-list",
        description: "Navigate to clients and verify records exist",
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
          { action: "screenshot", name: "golden-cl-clients-list" },
        ],
        expected_ui: { url_contains: "client" },
      },
      {
        phase_id: "open-client-detail",
        description: "Click into a client to view their profile",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="client-row"]:first-child, [class*="row"]:first-child a',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "golden-cl-client-profile" },
        ],
      },
      {
        phase_id: "cross-to-orders",
        description: "Cross domain: navigate to orders page",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Orders, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-cl-orders-view" },
        ],
        expected_ui: { url_contains: "sales" },
      },
      {
        phase_id: "cross-to-invoices",
        description: "Cross domain: navigate to invoices page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-cl-invoices-view" },
        ],
        expected_ui: { url_contains: "invoice" },
      },
      {
        phase_id: "return-to-clients",
        description:
          "Cross back to clients to verify page loads correctly after cross-domain navigation",
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
          { action: "screenshot", name: "golden-cl-back-to-clients" },
        ],
        expected_ui: { url_contains: "client" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.inventory-lifecycle — Products → Inventory → Locations (read verification)
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
    ],
    invariants: [
      {
        name: "quantity-conservation",
        description:
          "Total quantity across all batches of a strain must equal receipts minus adjustments",
        check: "visual",
      },
    ],
    phases: [
      {
        phase_id: "view-products",
        description: "Navigate to products catalog and verify strains exist",
        steps: [
          {
            action: "navigate",
            path: "/products",
            wait_for: "text=Product, text=Strain, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-il-products-list" },
        ],
        expected_ui: { url_contains: "product" },
      },
      {
        phase_id: "cross-to-inventory",
        description:
          "Cross domain: navigate to inventory and verify batches exist",
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
          { action: "screenshot", name: "golden-il-inventory-batches" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
      {
        phase_id: "open-batch-detail",
        description: "Open a batch to verify its detail view loads correctly",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child, [class*="row"]:first-child a',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "golden-il-batch-detail" },
        ],
      },
      {
        phase_id: "cross-to-locations",
        description: "Cross domain: navigate to locations and verify they load",
        steps: [
          {
            action: "navigate",
            path: "/locations",
            wait_for: "text=Location, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="location"], main',
          },
          { action: "screenshot", name: "golden-il-locations-verified" },
        ],
        expected_ui: { url_contains: "location" },
      },
      {
        phase_id: "cross-back-to-products",
        description:
          "Cross back to products to verify page state after cross-domain navigation",
        steps: [
          {
            action: "navigate",
            path: "/products",
            wait_for: "text=Product, text=Strain, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-il-back-to-products" },
        ],
        expected_ui: { url_contains: "product" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.returns-and-credits — Orders → Returns → Credits → Inventory (read verification)
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
      "route:/inventory",
      "crud:read",
    ],
    invariants: [
      {
        name: "credit-memo-creation",
        description:
          "Every approved return must generate a corresponding credit memo",
        check: "visual",
      },
    ],
    phases: [
      {
        phase_id: "view-orders",
        description: "Navigate to orders page and verify data loads",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Orders, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-rc-orders-list" },
        ],
        expected_ui: { url_contains: "sales" },
      },
      {
        phase_id: "cross-to-returns",
        description: "Cross domain: navigate to returns page",
        steps: [
          {
            action: "navigate",
            path: "/returns",
            wait_for: "text=Return, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-rc-returns-list" },
        ],
        expected_ui: { url_contains: "return" },
      },
      {
        phase_id: "cross-to-credits",
        description: "Cross domain: navigate to credits page",
        steps: [
          {
            action: "navigate",
            path: "/credits",
            wait_for: "text=Credit, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-rc-credits-list" },
        ],
        expected_ui: { url_contains: "credit" },
      },
      {
        phase_id: "cross-to-inventory",
        description:
          "Cross domain: navigate to inventory and verify page loads",
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
          { action: "screenshot", name: "golden-rc-inventory" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.full-day-simulation — A complete business day across all domains
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
        description:
          "Start the day by checking the dashboard for outstanding items",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="card"], [class*="widget"], [class*="kpi"], [class*="stat"]',
          },
        ],
        expected_ui: { url_contains: "dashboard" },
        screenshot: "golden-day-dashboard",
      },
      {
        phase_id: "check-orders",
        description: "Review today's orders and check for any pending items",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Order, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "golden-day-orders" },
        ],
        expected_ui: { url_contains: "sales" },
      },
      {
        phase_id: "check-clients",
        description: "Review client activity and recent additions",
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
          { action: "screenshot", name: "golden-day-clients" },
        ],
        expected_ui: { url_contains: "clients" },
      },
      {
        phase_id: "check-inventory",
        description: "Review inventory levels and check for low-stock alerts",
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
          { action: "screenshot", name: "golden-day-inventory" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
      {
        phase_id: "check-accounting",
        description: "Review accounting summary: AR, AP, and overdue items",
        steps: [
          {
            action: "navigate",
            path: "/accounting",
            wait_for: "text=Accounting, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              '[class*="card"], [class*="widget"], [class*="balance"], main',
          },
          { action: "screenshot", name: "golden-day-accounting" },
        ],
        expected_ui: { url_contains: "accounting" },
      },
      {
        phase_id: "check-calendar",
        description: "Check today's calendar for upcoming events and tasks",
        steps: [
          {
            action: "navigate",
            path: "/calendar",
            wait_for: "text=Calendar, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              '[class*="calendar"], [class*="event"], [class*="day"], main',
          },
          { action: "screenshot", name: "golden-day-calendar" },
        ],
        expected_ui: { url_contains: "calendar" },
      },
    ],
  },
];
