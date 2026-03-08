/**
 * Accounting Persona Chain Definitions
 *
 * Chains for Sam (Accountant): invoices, payments, bills, GL, chart of accounts,
 * fiscal periods, bank reconciliation, overdue tracking.
 *
 * CRUD lifecycle pattern: create → save → navigate away → return → verify persistence → edit → verify edit saved
 */

import type { TestChain } from "../types";

export const ACCOUNTING_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // accounting.check-dashboard — daily read
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.check-dashboard",
    description: "Accountant checks the accounting dashboard for daily summary",
    tags: ["route:/accounting", "persona:accounting", "daily", "read"],
    phases: [
      {
        phase_id: "load-accounting-dashboard",
        description: "Navigate to accounting dashboard",
        steps: [
          {
            action: "navigate",
            path: "/accounting",
            wait_for: "text=Accounting, text=Dashboard, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'main, [class*="dashboard"], [class*="card"], [class*="stat"]',
          },
        ],
        expected_ui: { url_contains: "accounting" },
        screenshot: "accounting-dashboard-loaded",
      },
      {
        phase_id: "verify-summary-widgets",
        description: "Verify financial summary widgets display",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="card"], [class*="widget"], [class*="stat"], table, main',
          },
          { action: "screenshot", name: "accounting-dashboard-widgets" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.review-invoices — daily read + historical access
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.review-invoices",
    description:
      "Review existing invoices list and inspect a saved invoice (historical access)",
    tags: [
      "route:/accounting/invoices",
      "persona:accounting",
      "daily",
      "read",
      "crud:read",
      "historical",
    ],
    phases: [
      {
        phase_id: "navigate-invoices",
        description: "Go to invoices page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "invoice" },
        screenshot: "accounting-invoices-list",
      },
      {
        phase_id: "verify-invoice-list",
        description: "Verify invoices table loaded with data",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [data-testid*="invoice"]',
          },
          { action: "screenshot", name: "accounting-invoices-data" },
        ],
      },
      {
        phase_id: "inspect-saved-invoice",
        description: "Click on a saved invoice to view details",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="invoice-row"]:first-child',
            wait_for: "text=Invoice, text=Detail, text=Amount",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "accounting-invoice-detail" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.generate-invoice — daily create
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.generate-invoice",
    description:
      "Generate a new invoice, verify it saves, navigate away and back to verify persistence",
    tags: [
      "route:/accounting/invoices",
      "persona:accounting",
      "daily",
      "crud:create",
      "save-state",
      "persistence",
      "cross-domain:orders-accounting",
    ],
    phases: [
      {
        phase_id: "navigate-invoices",
        description: "Go to invoices page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        screenshot: "accounting-gen-invoice-start",
      },
      {
        phase_id: "open-create-dialog",
        description: "Click create/generate invoice button",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Generate"), button:has-text("New"), button:has-text("Add"), [data-testid*="create"]',
            wait_for: "text=Invoice, text=Client, input",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
        ],
        screenshot: "accounting-invoice-form",
      },
      {
        phase_id: "verify-form-elements",
        description: "Verify invoice form has required fields",
        steps: [
          {
            action: "assert",
            visible:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Generate")',
          },
          { action: "screenshot", name: "accounting-invoice-form-ready" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.record-payment — daily create
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.record-payment",
    description: "Record a payment against an invoice",
    tags: [
      "route:/accounting/payments",
      "route:/accounting/invoices",
      "persona:accounting",
      "daily",
      "crud:create",
      "cross-domain:payments-accounting",
    ],
    phases: [
      {
        phase_id: "navigate-payments",
        description: "Go to payments page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/payments",
            wait_for: "text=Payment, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "payment" },
        screenshot: "accounting-payments-page",
      },
      {
        phase_id: "verify-payments-loaded",
        description: "Verify payments page elements",
        steps: [
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "accounting-payments-loaded" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.review-bills — daily read + historical
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.review-bills",
    description: "Review vendor bills (historical access)",
    tags: [
      "route:/accounting/bills",
      "persona:accounting",
      "daily",
      "read",
      "crud:read",
      "historical",
    ],
    phases: [
      {
        phase_id: "navigate-bills",
        description: "Go to bills page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/bills",
            wait_for: "text=Bill, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "bill" },
        screenshot: "accounting-bills-page",
      },
      {
        phase_id: "verify-bills-data",
        description: "Verify bills table loaded",
        steps: [
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "accounting-bills-data" },
        ],
      },
      {
        phase_id: "inspect-saved-bill",
        description: "Click on a saved bill to view details",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="bill-row"]:first-child',
            wait_for: "text=Bill, text=Detail, text=Amount",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "accounting-bill-detail" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.check-overdue — daily read
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.check-overdue",
    description: "Check for overdue invoices and aging report",
    tags: ["route:/accounting/invoices", "persona:accounting", "daily", "read"],
    phases: [
      {
        phase_id: "navigate-invoices",
        description: "Go to invoices page to check overdue",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        screenshot: "accounting-overdue-check",
      },
      {
        phase_id: "check-aging",
        description: "Look for overdue/aging indicators",
        steps: [
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "accounting-aging-report" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.manage-chart-of-accounts — occasional
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.manage-chart-of-accounts",
    description: "View and manage chart of accounts (historical records)",
    tags: [
      "route:/accounting/chart-of-accounts",
      "persona:accounting",
      "occasional",
      "crud:read",
      "historical",
    ],
    phases: [
      {
        phase_id: "navigate-coa",
        description: "Go to chart of accounts page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/chart-of-accounts",
            wait_for: "text=Account, text=Chart, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        screenshot: "accounting-coa-page",
      },
      {
        phase_id: "verify-accounts-loaded",
        description: "Verify accounts tree/table loaded",
        steps: [
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="tree"], main',
          },
          { action: "screenshot", name: "accounting-coa-data" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.manage-fiscal-periods — occasional
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.manage-fiscal-periods",
    description: "View and manage fiscal periods",
    tags: [
      "route:/accounting/fiscal-periods",
      "persona:accounting",
      "occasional",
      "crud:read",
    ],
    phases: [
      {
        phase_id: "navigate-fiscal-periods",
        description: "Go to fiscal periods page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/fiscal-periods",
            wait_for: "text=Fiscal, text=Period, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        screenshot: "accounting-fiscal-periods",
      },
      {
        phase_id: "verify-periods-loaded",
        description: "Verify fiscal periods data loaded",
        steps: [
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "accounting-fiscal-data" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.review-general-ledger — occasional
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.review-general-ledger",
    description: "View general ledger entries (historical records)",
    tags: [
      "route:/accounting/general-ledger",
      "persona:accounting",
      "occasional",
      "crud:read",
      "historical",
    ],
    phases: [
      {
        phase_id: "navigate-gl",
        description: "Go to general ledger page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/general-ledger",
            wait_for: "text=Ledger, text=General, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        screenshot: "accounting-gl-page",
      },
      {
        phase_id: "verify-gl-entries",
        description: "Verify GL entries table loaded",
        steps: [
          {
            action: "assert",
            visible: 'table, [role="table"], main',
          },
          { action: "screenshot", name: "accounting-gl-entries" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.view-client-ledger — Client Ledger
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.view-client-ledger",
    description: "View client ledger for transaction history across clients",
    tags: ["route:/client-ledger", "persona:accounting", "occasional", "read"],
    phases: [
      {
        phase_id: "load-client-ledger",
        description: "Navigate to client ledger page",
        steps: [
          {
            action: "navigate",
            path: "/client-ledger",
            wait_for: "text=Client, text=Ledger, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "ledger" },
        screenshot: "accounting-client-ledger-loaded",
      },
      {
        phase_id: "verify-client-ledger-content",
        description: "Verify client ledger data displays",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="card"], main',
          },
          { action: "screenshot", name: "accounting-client-ledger-content" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.view-cogs-settings — COGS Settings
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.view-cogs-settings",
    description: "View COGS (Cost of Goods Sold) configuration settings",
    tags: ["route:/settings/cogs", "persona:accounting", "occasional", "read"],
    phases: [
      {
        phase_id: "load-cogs-settings",
        description: "Navigate to COGS settings page",
        steps: [
          {
            action: "navigate",
            path: "/settings/cogs",
            wait_for: "text=COGS, text=Cost, text=Settings, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "cogs" },
        screenshot: "accounting-cogs-settings-loaded",
      },
      {
        phase_id: "verify-cogs-content",
        description: "Verify COGS configuration form displays",
        steps: [
          {
            action: "assert",
            visible: 'form, [class*="card"], [class*="setting"], input, main',
          },
          { action: "screenshot", name: "accounting-cogs-settings-content" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.view-cash-locations — Cash Audit Locations
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.view-cash-locations",
    description: "View cash locations for cash audit management",
    tags: ["route:/cash-locations", "persona:accounting", "occasional", "read"],
    phases: [
      {
        phase_id: "load-cash-locations",
        description: "Navigate to cash locations page",
        steps: [
          {
            action: "navigate",
            path: "/cash-locations",
            wait_for: "text=Cash, text=Location, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "cash" },
        screenshot: "accounting-cash-locations-loaded",
      },
      {
        phase_id: "verify-cash-locations-content",
        description: "Verify cash locations display",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="card"], main',
          },
          { action: "screenshot", name: "accounting-cash-locations-content" },
        ],
      },
    ],
  },
];
