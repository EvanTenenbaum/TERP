/**
 * Write-Path Accounting Chain Definitions
 *
 * Full interactive write-path chains for the accounting domain.
 * Covers invoice full lifecycle, payment recording, and bill management
 * with complete create → save → navigate away → return → verify → status-change cycles.
 *
 * Action vocabulary:
 *   navigate, click, type, select, add_line_item, assert, wait, screenshot, store, custom
 */

import type { TestChain } from "../types";

export const WRITE_PATH_ACCOUNTING_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // accounting.invoice-lifecycle — Full invoice flow
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.invoice-lifecycle",
    description:
      "Full invoice lifecycle: create invoice → select client → add line items → save draft → navigate away → return → verify persistence → mark Sent → record payment → verify PAID/PARTIAL status",
    tags: [
      "route:/accounting/invoices",
      "route:/accounting/payments",
      "persona:accounting",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
      "cross-domain:orders-accounting",
      "write-path",
    ],
    preconditions: {
      ensure: [
        { entity: "client", ref: "test-buyer", where: { isBuyer: true } },
      ],
    },
    phases: [
      {
        phase_id: "navigate-invoices",
        description: "Navigate to accounting invoices page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-invoice-lifecycle-list" },
        ],
        expected_ui: { url_contains: "invoice" },
      },
      {
        phase_id: "open-create-invoice",
        description: "Click Create Invoice / Generate button",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Generate"), button:has-text("New Invoice"), button:has-text("Add"), [data-testid*="create-invoice"]',
            wait_for: "text=Invoice, text=Client, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-invoice-lifecycle-create-form" },
        ],
      },
      {
        phase_id: "select-client-for-invoice",
        description: "Select client from combobox",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client")',
            wait_for: "[role=listbox], [role=option]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              '[aria-label*="client" i] input, [role="combobox"] input, input[placeholder*="search" i]',
            value: "test",
            clear_first: true,
          },
          { action: "wait", duration: 300 },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "screenshot",
            name: "wp-invoice-lifecycle-client-selected",
          },
        ],
      },
      {
        phase_id: "add-invoice-line-items",
        description: "Add line items to the invoice",
        steps: [
          {
            action: "add_line_item",
            quantity: 2,
            unit_price: 500,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-invoice-lifecycle-items-added" },
        ],
      },
      {
        phase_id: "set-due-date",
        description: "Enter a due date for the invoice",
        steps: [
          {
            action: "type",
            target:
              'input[name="dueDate"], input[name="due_date"], input[type="date"][name*="due" i], input[aria-label*="due date" i]',
            value: "2026-04-07",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-invoice-lifecycle-due-date-set" },
        ],
      },
      {
        phase_id: "save-invoice-draft",
        description: "Save invoice as draft and verify success",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Save Draft"), button:has-text("Create Invoice")',
            wait_for: "text=saved, text=Created, text=Invoice, text=Draft",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: 'h1, [data-testid*="invoice-id"], [class*="invoice-number"]',
            as: "invoiceHeading",
          },
          { action: "screenshot", name: "wp-invoice-lifecycle-draft-saved" },
        ],
        extract: [
          { from: "url", as: "invoiceId", pattern: "/invoices/(\\d+)" },
        ],
      },
      {
        phase_id: "navigate-away",
        description: "Navigate to dashboard to break context",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "screenshot",
            name: "wp-invoice-lifecycle-left-to-dashboard",
          },
        ],
      },
      {
        phase_id: "return-and-verify-invoice",
        description: "Return to invoices page and verify the invoice persisted",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table tbody tr:first-child, [data-testid*="invoice-row"]:first-child',
          },
          { action: "screenshot", name: "wp-invoice-lifecycle-back-at-list" },
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="invoice-row"]:first-child a',
            wait_for: "text=Invoice, text=Detail, text=Amount, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "screenshot",
            name: "wp-invoice-lifecycle-detail-verified",
          },
        ],
      },
      {
        phase_id: "mark-invoice-sent",
        description: "Change invoice status to Sent",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Mark Sent"), button:has-text("Send"), button:has-text("Mark as Sent"), [data-testid*="mark-sent"], [data-testid*="send-invoice"]',
            wait_for: "text=Sent, text=Success, text=Updated",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            text_contains: "SENT",
          },
          { action: "screenshot", name: "wp-invoice-lifecycle-marked-sent" },
        ],
      },
      {
        phase_id: "navigate-to-payments",
        description: "Navigate to /accounting/payments to record a payment",
        steps: [
          {
            action: "navigate",
            path: "/accounting/payments",
            wait_for: "text=Payment, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-invoice-lifecycle-payments-page" },
        ],
        expected_ui: { url_contains: "payment" },
      },
      {
        phase_id: "record-payment-against-invoice",
        description:
          "Click Record Payment, select invoice, enter amount and method",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Record Payment"), button:has-text("New Payment"), button:has-text("Add Payment"), [data-testid*="record-payment"]',
            wait_for: "text=Payment, text=Invoice, text=Amount, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[aria-label*="invoice" i], [role="combobox"], [data-testid*="invoice-select"], select[name*="invoice" i]',
            wait_for: "[role=option], option",
          },
          { action: "wait", duration: 200 },
          {
            action: "click",
            target: '[role="option"]:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="amount"], input[placeholder*="amount" i], input[aria-label*="amount" i]',
            value: "1000",
            clear_first: true,
          },
          {
            action: "click",
            target:
              '[aria-label*="method" i], select[name*="method" i], [data-testid*="payment-method"], [role="combobox"]',
            wait_for: "[role=option], option",
          },
          { action: "wait", duration: 200 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          {
            action: "type",
            target:
              'input[name="reference"], input[name="checkNumber"], input[placeholder*="reference" i]',
            value: "QA-WP-REF-{{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Submit")',
            wait_for: "text=Success, text=Recorded, text=Payment, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "screenshot",
            name: "wp-invoice-lifecycle-payment-recorded",
          },
        ],
      },
      {
        phase_id: "verify-invoice-status-updated",
        description:
          "Navigate back to invoices and verify PAID or PARTIAL status",
        steps: [
          {
            action: "navigate",
            path: "/accounting/invoices",
            wait_for: "text=Invoice, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="invoice-row"]:first-child a',
            wait_for: "text=Invoice, text=Amount, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'text=PAID, text=PARTIAL, [class*="paid"], [class*="partial"]',
          },
          { action: "screenshot", name: "wp-invoice-lifecycle-final-status" },
        ],
      },
    ],
    invariants: [
      {
        name: "invoice-payment-recorded",
        description: "Invoice shows payment applied after recording",
        check: "ui",
        page: "/accounting/invoices",
        assertions: ["PAID", "PARTIAL"],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.payment-recording — Standalone payment recording
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.payment-recording",
    description:
      "Navigate to /accounting/payments → click Record Payment → select invoice → enter amount, method, reference → save → verify success toast and persistence",
    tags: [
      "route:/accounting/payments",
      "persona:accounting",
      "crud:create",
      "save-state",
      "persistence",
      "cross-domain:payments-accounting",
      "write-path",
    ],
    preconditions: {
      ensure: [
        {
          entity: "invoice",
          ref: "open-invoice",
          where: { status: "SENT" },
        },
      ],
    },
    phases: [
      {
        phase_id: "navigate-payments",
        description: "Go to the accounting payments page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/payments",
            wait_for: "text=Payment, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "wp-payment-recording-list" },
        ],
        expected_ui: { url_contains: "payment" },
      },
      {
        phase_id: "open-record-payment-form",
        description: "Click Record Payment to open form",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Record Payment"), button:has-text("New Payment"), button:has-text("Add"), [data-testid*="record-payment"]',
            wait_for: "text=Payment, text=Invoice, text=Amount, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-payment-recording-form-open" },
        ],
      },
      {
        phase_id: "fill-payment-form",
        description:
          "Select invoice, enter amount, method, and reference number",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="invoice" i], [role="combobox"], [data-testid*="invoice-select"], select[name*="invoice" i]',
            wait_for: "[role=option], option",
          },
          { action: "wait", duration: 200 },
          {
            action: "click",
            target: '[role="option"]:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="amount"], input[placeholder*="amount" i], input[aria-label*="amount" i]',
            value: "500",
            clear_first: true,
          },
          {
            action: "click",
            target:
              '[aria-label*="method" i], select[name*="method" i], [data-testid*="payment-method"], [role="combobox"]',
            wait_for: "[role=option], option",
          },
          { action: "wait", duration: 200 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          {
            action: "type",
            target:
              'input[name="reference"], input[name="checkNumber"], input[placeholder*="reference" i], input[placeholder*="check" i]',
            value: "QA-PAYMENT-REF-{{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-payment-recording-form-filled" },
        ],
      },
      {
        phase_id: "save-payment",
        description: "Submit payment and verify success toast",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Submit")',
            wait_for: "text=Success, text=Recorded, text=Payment, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-payment-recording-saved" },
        ],
      },
      {
        phase_id: "verify-payment-persisted",
        description: "Navigate away and back to verify payment persisted",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "navigate",
            path: "/accounting/payments",
            wait_for: "text=Payment, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table tbody tr:first-child, [data-testid*="payment-row"]:first-child',
          },
          { action: "screenshot", name: "wp-payment-recording-persisted" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // accounting.bill-management — Vendor bill processing
  // ---------------------------------------------------------------------------
  {
    chain_id: "accounting.bill-management",
    description:
      "Navigate to /accounting/bills → view existing bills list → open first bill detail → approve or process bill → verify status change persisted",
    tags: [
      "route:/accounting/bills",
      "persona:accounting",
      "crud:read",
      "crud:update",
      "historical",
      "write-path",
    ],
    preconditions: {
      ensure: [
        { entity: "bill", ref: "pending-bill", where: { status: "PENDING" } },
      ],
    },
    phases: [
      {
        phase_id: "navigate-bills",
        description: "Navigate to accounting bills page",
        steps: [
          {
            action: "navigate",
            path: "/accounting/bills",
            wait_for: "text=Bill, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "wp-bill-mgmt-list" },
        ],
        expected_ui: { url_contains: "bill" },
      },
      {
        phase_id: "verify-bills-loaded",
        description: "Confirm bills table has data",
        steps: [
          {
            action: "assert",
            visible:
              'table tbody tr:first-child, [data-testid*="bill-row"]:first-child',
          },
          { action: "screenshot", name: "wp-bill-mgmt-data-loaded" },
        ],
      },
      {
        phase_id: "open-bill-detail",
        description: "Click on the first bill to open its detail view",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="bill-row"]:first-child a, [class*="row"]:first-child a',
            wait_for: "text=Bill, text=Detail, text=Amount, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              '[class*="detail"], [class*="bill"], [class*="info"], h1, h2',
          },
          { action: "screenshot", name: "wp-bill-mgmt-detail-opened" },
        ],
      },
      {
        phase_id: "process-or-approve-bill",
        description:
          "Click approve/process bill button and verify status change",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Approve"), button:has-text("Process"), button:has-text("Mark Approved"), [data-testid*="approve-bill"], [data-testid*="process-bill"]',
            wait_for:
              "text=Approved, text=Processed, text=Success, text=Updated",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'text=APPROVED, text=PROCESSED, [class*="approved"], [class*="processed"]',
          },
          { action: "screenshot", name: "wp-bill-mgmt-status-changed" },
        ],
      },
      {
        phase_id: "verify-bill-status-persisted",
        description: "Navigate away and return to confirm status persisted",
        steps: [
          {
            action: "navigate",
            path: "/accounting/bills",
            wait_for: "text=Bill, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="bill-row"]:first-child a',
            wait_for: "text=Bill, text=Amount, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'text=APPROVED, text=PROCESSED, [class*="approved"], [class*="processed"]',
          },
          { action: "screenshot", name: "wp-bill-mgmt-status-persisted" },
        ],
      },
    ],
    invariants: [
      {
        name: "bill-status-updated",
        description: "Bill status shows approved/processed after action",
        check: "ui",
        page: "/accounting/bills",
        assertions: ["APPROVED", "PROCESSED"],
      },
    ],
  },
];
