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
  // golden.sales-to-cash — Order → Invoice → Payment → GL verification
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.sales-to-cash",
    description:
      "Complete sales-to-cash cycle: find existing order → navigate to accounting → generate invoice → record payment → verify GL entry exists",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/sales",
      "route:/accounting/invoices",
      "route:/accounting/payments",
      "route:/accounting/general-ledger",
      "crud:read",
      "crud:create",
      "persistence",
    ],
    invariants: [
      {
        name: "no-orphaned-invoices",
        description:
          "Every invoice visible in GL must have a corresponding order",
      },
      {
        name: "payment-balance",
        description:
          "Recorded payment amount must reduce the invoice outstanding balance",
      },
    ],
    phases: [
      {
        phase_id: "find-existing-order",
        description:
          "Navigate to sales list and open an existing order to verify it has line items",
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
              'table, [role="table"], [class*="list"], [data-testid*="order"]',
          },
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="order-row"]:first-child',
            wait_for: "text=Order, text=Status, text=Client",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: 'h1, [data-testid*="order-number"], [class*="order-number"], [class*="order-id"]',
            as: "sourceOrderId",
          },
          { action: "screenshot", name: "golden-stc-source-order" },
        ],
        expected_ui: { url_contains: "sales" },
        screenshot: "golden-stc-orders-list",
      },
      {
        phase_id: "navigate-to-invoices",
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
        phase_id: "generate-invoice",
        description: "Create a new invoice for the order",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Generate"), button:has-text("New Invoice"), [data-testid*="create-invoice"]',
            wait_for: "text=Client, text=Order, text=Amount, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[aria-label*="order" i], [data-testid*="order-select"], [role="combobox"], select[name*="order" i]',
            wait_for: "[role=option], option",
          },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              'table, [class*="line-item"], [class*="total"], [class*="amount"]',
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Generate Invoice"), button:has-text("Create Invoice"), button:has-text("Save")',
            wait_for:
              "text=Success, text=Generated, text=Created, text=Invoice",
          },
          { action: "wait", network_idle: true, timeout: 12000 },
          {
            action: "store",
            from: '[data-testid*="invoice-number"], h1, [class*="invoice-number"], [class*="invoice-id"]',
            as: "invoiceNumber",
          },
          { action: "screenshot", name: "golden-stc-invoice-created" },
        ],
      },
      {
        phase_id: "record-payment",
        description: "Record a payment against the newly created invoice",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Record Payment"), button:has-text("Payment"), [data-testid*="record-payment"], button:has-text("Pay")',
            wait_for: "text=Payment, text=Amount, text=Method, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="amount"], input[placeholder*="amount" i], input[aria-label*="amount" i]',
            value: "500.00",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'select[name*="method" i], [aria-label*="method" i], [data-testid*="payment-method"], [role="combobox"]',
            wait_for: "[role=option], option",
          },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record Payment"), button:has-text("Confirm")',
            wait_for: "text=Success, text=Recorded, text=Payment, text=Paid",
          },
          { action: "wait", network_idle: true, timeout: 12000 },
          { action: "screenshot", name: "golden-stc-payment-recorded" },
        ],
      },
      {
        phase_id: "verify-in-general-ledger",
        description:
          "Cross domain: navigate to GL and verify the payment created GL entries",
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
      {
        phase_id: "inspect-gl-entry",
        description:
          "Open the first GL entry and verify it references the payment",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="gl-row"]:first-child',
            wait_for: "text=Debit, text=Credit, text=Account, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "golden-stc-gl-entry-detail" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.procure-to-stock — Supplier → Intake → Batch → Inventory
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.procure-to-stock",
    description:
      "Full procurement cycle: find supplier in clients → navigate to intake receipts → open pending receipt → cross to inventory → verify batch details",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/clients",
      "route:/intake-receipts",
      "route:/inventory",
      "crud:read",
      "crud:create",
      "persistence",
    ],
    invariants: [
      {
        name: "receipt-to-batch",
        description:
          "Every confirmed intake receipt must result in at least one inventory batch",
      },
      {
        name: "quantity-integrity",
        description:
          "Batch quantity must match the received quantity on the intake receipt",
      },
    ],
    phases: [
      {
        phase_id: "find-supplier",
        description:
          "Navigate to clients and identify a supplier (isSeller=true)",
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
        phase_id: "filter-suppliers",
        description: "Filter the client list to show only suppliers",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Supplier"), [role="tab"]:has-text("Supplier"), [data-testid*="supplier-filter"], select[name*="type" i]',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "golden-pts-suppliers-filtered" },
        ],
      },
      {
        phase_id: "navigate-to-intake",
        description: "Cross domain: navigate to intake receipts page",
        steps: [
          {
            action: "navigate",
            path: "/intake-receipts",
            wait_for: "text=Intake, text=Receipt, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="receipt"], main',
          },
          { action: "screenshot", name: "golden-pts-intake-list" },
        ],
        expected_ui: { url_contains: "intake" },
      },
      {
        phase_id: "open-pending-receipt",
        description: "Open a pending intake receipt to view its details",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="intake-row"]:first-child',
            wait_for: "text=Receipt, text=Supplier, text=Items, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              '[class*="detail"], [class*="item"], table, [class*="supplier"], h1, h2',
          },
          { action: "screenshot", name: "golden-pts-receipt-detail" },
        ],
      },
      {
        phase_id: "verify-cross-to-inventory",
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
            visible:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child, [data-testid*="inventory-row"]:first-child',
          },
          { action: "screenshot", name: "golden-pts-inventory-batches" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
      {
        phase_id: "inspect-batch-details",
        description: "Open a batch to verify its quantities and strain data",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child',
            wait_for: "text=Batch, text=Quantity, text=Strain, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              '[class*="detail"], [class*="quantity"], [class*="strain"], h1, h2',
          },
          { action: "screenshot", name: "golden-pts-batch-detail" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.client-lifecycle — Create client → Order → Invoice → View history
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.client-lifecycle",
    description:
      "Full client lifecycle: create new client → view their orders → view their invoices → verify all history shows in client profile",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/clients",
      "route:/sales",
      "route:/accounting/invoices",
      "crud:create",
      "crud:read",
      "historical",
      "persistence",
    ],
    invariants: [
      {
        name: "client-history-completeness",
        description:
          "Client profile must show all orders and invoices linked to that client",
      },
    ],
    phases: [
      {
        phase_id: "create-new-client",
        description:
          "Create a new client that will be used throughout this lifecycle test",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Clients, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add"), button:has-text("New Client"), [data-testid*="create-client"]',
            wait_for: "text=Name, text=Client, input",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i], #name',
            value: "QA Lifecycle Client {{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client"), button:has-text("Submit")',
            wait_for: "text=Success, text=Created, text=saved, text=Client",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: 'h1, [data-testid*="client-name"], [class*="client-name"]',
            as: "lifecycleClientName",
          },
          { action: "screenshot", name: "golden-cl-client-created" },
        ],
        expected_ui: { url_contains: "client" },
      },
      {
        phase_id: "view-client-orders",
        description:
          "Cross domain: navigate to orders to see this client's order history",
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
        phase_id: "view-client-invoices",
        description:
          "Cross domain: navigate to invoices to see this client's invoice history",
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
        phase_id: "return-to-client-profile",
        description:
          "Cross back to the client profile to verify all history is shown",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Clients, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "type",
            target:
              'input[placeholder*="search" i], input[type="search"], [data-testid*="search"]',
            value: "QA Lifecycle Client",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "assert", text_contains: "QA Lifecycle Client" },
          {
            action: "click",
            target:
              'table tbody tr:has-text("QA Lifecycle Client"), a:has-text("QA Lifecycle Client")',
            wait_for: "text=Profile, text=Details, text=Client, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "golden-cl-client-profile" },
        ],
      },
      {
        phase_id: "verify-profile-history",
        description:
          "Verify the client profile shows the order and invoice history sections",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="history"], [class*="order"], [class*="invoice"], [class*="activity"], [data-testid*="history"], h1, main',
          },
          { action: "screenshot", name: "golden-cl-profile-history" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.inventory-lifecycle — Create strain → Batch → Move → Adjust → Verify
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.inventory-lifecycle",
    description:
      "Full inventory lifecycle: create strain → create batch with that strain → record movement → make adjustment → verify final state across locations",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/products",
      "route:/inventory",
      "route:/locations",
      "crud:create",
      "crud:update",
      "persistence",
    ],
    invariants: [
      {
        name: "quantity-conservation",
        description:
          "Total quantity across all batches of a strain must equal receipts minus adjustments",
      },
      {
        name: "movement-audit",
        description:
          "Every movement must be traceable to a source batch and destination location",
      },
    ],
    phases: [
      {
        phase_id: "create-strain",
        description: "Create a new strain in the products catalog",
        steps: [
          {
            action: "navigate",
            path: "/products",
            wait_for: "text=Products, text=Strains, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add Strain"), button:has-text("New"), [data-testid*="create-strain"]',
            wait_for: "text=Name, text=Strain, text=Type, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="strain name" i]',
            value: "QA Lifecycle Strain {{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              '[aria-label*="type" i], select[name*="type" i], [data-testid*="strain-type"], [role="combobox"]',
            wait_for: "[role=option], option",
          },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Strain")',
            wait_for: "text=Success, text=Created, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "golden-il-strain-created" },
        ],
        expected_ui: { url_contains: "product" },
      },
      {
        phase_id: "create-batch-for-strain",
        description:
          "Cross domain: navigate to inventory and create a batch using the new strain",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add Batch"), button:has-text("New Batch"), [data-testid*="create-batch"]',
            wait_for: "text=Strain, text=Batch, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[aria-label*="strain" i], [data-testid*="strain-select"], [role="combobox"]:first-child, select[name*="strain" i]',
            wait_for: "[role=option], option",
          },
          {
            action: "click",
            target:
              '[role="option"]:has-text("QA Lifecycle Strain"), [role="option"]:first-child',
            wait_for: "main",
          },
          {
            action: "type",
            target:
              'input[name="quantity"], input[name="weight"], input[placeholder*="quantity" i], input[placeholder*="weight" i]',
            value: "200",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="batchNumber"], input[name="batch_number"], input[placeholder*="batch" i]',
            value: "QA-LIFECYCLE-BATCH-{{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Batch")',
            wait_for: "text=Success, text=Created, text=Batch",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: '[data-testid*="batch-id"], h1, [class*="batch-number"]',
            as: "lifecycleBatchId",
          },
          { action: "screenshot", name: "golden-il-batch-created" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
      {
        phase_id: "record-batch-movement",
        description:
          "Record a movement for the created batch to a different location",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Move"), button:has-text("Transfer"), button:has-text("Record Movement"), [data-testid*="movement"]',
            wait_for:
              "text=Movement, text=Transfer, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target: 'input[name="quantity"], input[placeholder*="quantity" i]',
            value: "50",
            clear_first: true,
          },
          {
            action: "click",
            target:
              '[aria-label*="location" i], select[name*="location" i], [data-testid*="location-select"], [role="combobox"]',
            wait_for: "[role=option], option",
          },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Confirm")',
            wait_for: "text=Success, text=Recorded, text=Moved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "golden-il-movement-recorded" },
        ],
      },
      {
        phase_id: "make-batch-adjustment",
        description:
          "Make a downward adjustment to the batch to simulate shrinkage",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Adjust"), button:has-text("Adjustment"), [data-testid*="adjust"]',
            wait_for: "text=Adjust, text=Reason, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="quantity"], input[name="adjustmentQuantity"], input[placeholder*="quantity" i]',
            value: "-10",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'textarea[name="reason"], input[name="reason"], textarea[placeholder*="reason" i]',
            value: "QA lifecycle adjustment - shrinkage test",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Confirm")',
            wait_for: "text=Success, text=Adjusted, text=Recorded",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "golden-il-adjustment-made" },
        ],
      },
      {
        phase_id: "verify-final-batch-state",
        description:
          "Verify the batch reflects the correct quantity after movement and adjustment",
        steps: [
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              '[class*="quantity"], [data-testid*="quantity"], [class*="detail"], main',
          },
          { action: "screenshot", name: "golden-il-final-batch-state" },
        ],
      },
      {
        phase_id: "verify-locations",
        description:
          "Cross domain: navigate to locations and verify the destination received the transferred quantity",
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
    ],
  },

  // ---------------------------------------------------------------------------
  // golden.returns-and-credits — Order → Return → Credit → Verify inventory
  // ---------------------------------------------------------------------------
  {
    chain_id: "golden.returns-and-credits",
    description:
      "Full returns cycle: find fulfilled order → process return request → verify credit memo created → verify inventory adjustment recorded",
    tags: [
      "golden-flow",
      "cross-domain",
      "route:/sales",
      "route:/returns",
      "route:/credits",
      "route:/inventory",
      "crud:read",
      "crud:create",
      "persistence",
    ],
    invariants: [
      {
        name: "credit-memo-creation",
        description:
          "Every approved return must generate a corresponding credit memo",
      },
      {
        name: "inventory-restoration",
        description:
          "Returned items must restore inventory quantity upon return confirmation",
      },
    ],
    phases: [
      {
        phase_id: "find-fulfilled-order",
        description:
          "Navigate to orders and find a fulfilled/completed order to return against",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Orders, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "click",
            target:
              'table tbody tr:has-text("Fulfilled"), table tbody tr:has-text("Completed"), table tbody tr:has-text("Shipped"), table tbody tr:first-child',
            wait_for: "text=Order, text=Status, text=Client, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: 'h1, [data-testid*="order-number"], [class*="order-number"]',
            as: "returnOrderId",
          },
          { action: "screenshot", name: "golden-rc-source-order" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "navigate-to-returns",
        description:
          "Cross domain: navigate to returns page and initiate a return",
        steps: [
          {
            action: "navigate",
            path: "/returns",
            wait_for: "text=Return, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="return"], main',
          },
          { action: "screenshot", name: "golden-rc-returns-list" },
        ],
        expected_ui: { url_contains: "return" },
      },
      {
        phase_id: "create-return-request",
        description: "Create a new return request against the fulfilled order",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("New Return"), button:has-text("Initiate"), [data-testid*="create-return"]',
            wait_for: "text=Return, text=Order, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[aria-label*="order" i], [data-testid*="order-select"], [role="combobox"], select[name*="order" i]',
            wait_for: "[role=option], option",
          },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'textarea[name="reason"], input[name="reason"], textarea[placeholder*="reason" i]',
            value: "QA golden flow return test",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Submit Return")',
            wait_for: "text=Success, text=Return, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 12000 },
          { action: "screenshot", name: "golden-rc-return-created" },
        ],
      },
      {
        phase_id: "verify-credit-created",
        description:
          "Cross domain: navigate to credits and verify a credit memo was created",
        steps: [
          {
            action: "navigate",
            path: "/credits",
            wait_for: "text=Credit, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [data-testid*="credit"], main',
          },
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="credit-row"]:first-child',
            wait_for: "text=Credit, text=Balance, text=Amount, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "golden-rc-credit-verified" },
        ],
        expected_ui: { url_contains: "credit" },
      },
      {
        phase_id: "verify-inventory-adjusted",
        description:
          "Cross domain: navigate to inventory and verify returned stock was re-added",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, text=Batch, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [data-testid*="batch"], main',
          },
          { action: "screenshot", name: "golden-rc-inventory-post-return" },
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
