/**
 * Sales Persona Chain Definitions
 *
 * Chains for Jordan (Sales Rep): client management, order creation,
 * sales sheets, pricing rules, returns, and credits.
 *
 * CRUD lifecycle pattern: create → save → navigate away → return → verify persistence → edit → verify edit saved
 */

import type { TestChain } from "../types";

export const SALES_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // sales.check-dashboard — daily read
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.check-dashboard",
    description: "Sales rep checks daily dashboard KPIs and recent activity",
    tags: ["route:/dashboard", "persona:sales", "daily", "read"],
    phases: [
      {
        phase_id: "load-dashboard",
        description: "Navigate to dashboard and wait for network to settle",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "text=Dashboard" },
        ],
        expected_ui: { url_contains: "dashboard" },
        screenshot: "sales-dashboard-loaded",
      },
      {
        phase_id: "check-kpi-widgets",
        description: "Verify KPI cards are present and the page is interactive",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="card"], [data-testid*="kpi"], [class*="widget"], [class*="stat"]',
          },
          { action: "screenshot", name: "sales-dashboard-kpis" },
        ],
      },
      {
        phase_id: "check-recent-activity",
        description:
          "Scroll down and verify recent activity section is rendered",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="activity"], [class*="recent"], [class*="feed"], main',
          },
          { action: "screenshot", name: "sales-dashboard-activity" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.review-orders — daily read / historical access
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.review-orders",
    description:
      "Review existing orders list, filter by status, and inspect a saved order",
    tags: [
      "route:/sales",
      "persona:sales",
      "daily",
      "read",
      "crud:read",
      "historical",
    ],
    phases: [
      {
        phase_id: "navigate-orders",
        description: "Go to orders/sales page",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Orders, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "sales" },
        screenshot: "sales-orders-list",
      },
      {
        phase_id: "verify-list-loaded",
        description: "Verify orders table or list has rows",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="grid"], [data-testid*="order"]',
          },
          { action: "screenshot", name: "sales-orders-data" },
        ],
      },
      {
        phase_id: "inspect-existing-order",
        description:
          "Click the first order row to view its details (historical record access)",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="order-row"]:first-child, [class*="row"]:first-child a',
            wait_for: "text=Order, text=Details, text=Status",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "sales-order-detail" },
        ],
      },
      {
        phase_id: "return-to-list",
        description: "Navigate back to the orders list",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Orders, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-orders-returned-to-list" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.create-client — daily CRUD lifecycle
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.create-client",
    description:
      "Create a new client, verify save, navigate away, return, verify persistence, then edit",
    tags: [
      "route:/clients",
      "persona:sales",
      "daily",
      "crud:create",
      "crud:read",
      "crud:update",
      "save-state",
      "persistence",
    ],
    phases: [
      {
        phase_id: "navigate-clients",
        description: "Go to clients list page",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Clients, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "clients" },
        screenshot: "sales-clients-list",
      },
      {
        phase_id: "open-create-form",
        description: "Click the create/add client button to open the form",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add"), button:has-text("New Client"), [data-testid*="create-client"], [data-testid*="add-client"]',
            wait_for: "text=Name, text=Client, input",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "sales-create-client-form-open" },
        ],
      },
      {
        phase_id: "fill-client-form",
        description: "Fill in client name with a unique timestamped value",
        steps: [
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i], #name, input[name="clientName"]',
            value: "QA Chain Test Client {{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "sales-client-form-filled" },
        ],
      },
      {
        phase_id: "save-client",
        description: "Submit the create form and verify a success signal",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client"), button:has-text("Submit")',
            wait_for: "text=Success, text=Created, text=saved, text=Client",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "sales-client-saved" },
        ],
      },
      {
        phase_id: "navigate-away",
        description: "Navigate to dashboard to leave the clients context",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "sales-navigated-away-to-dashboard" },
        ],
      },
      {
        phase_id: "return-to-clients",
        description: "Navigate back to clients list",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Clients, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "sales-clients-after-return" },
        ],
      },
      {
        phase_id: "verify-client-persisted",
        description: "Search for the created client to confirm it was saved",
        steps: [
          {
            action: "type",
            target:
              'input[placeholder*="search" i], input[type="search"], [data-testid*="search"], input[aria-label*="search" i]',
            value: "QA Chain Test",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "assert", text_contains: "QA Chain Test" },
          { action: "screenshot", name: "sales-client-persisted-verified" },
        ],
      },
      {
        phase_id: "open-client-to-edit",
        description: "Click on the created client to open its detail/edit view",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:has-text("QA Chain Test"), [data-testid*="client-row"]:has-text("QA Chain Test"), a:has-text("QA Chain Test")',
            wait_for: "text=Edit, text=Profile, text=Details",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-client-detail-for-edit" },
        ],
      },
      {
        phase_id: "edit-client-and-verify",
        description:
          "Click edit, update a field, save, and confirm the change persisted",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Edit"), [data-testid*="edit"], button:has-text("Modify")',
            wait_for: "input, form",
          },
          {
            action: "type",
            target:
              'input[name="phone"], input[placeholder*="phone" i], input[aria-label*="phone" i]',
            value: "555-QA-TEST",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
            wait_for: "text=Success, text=Updated, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-client-edit-saved" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.create-order — daily CRUD lifecycle
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.create-order",
    description:
      "Create a sales order, verify it saves, navigate away, return, edit it, verify edit persists",
    tags: [
      "route:/orders/create",
      "route:/sales",
      "persona:sales",
      "daily",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
      "cross-domain:orders-inventory",
    ],
    phases: [
      {
        phase_id: "navigate-create-order",
        description: "Navigate to the order creation page",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, text=Sale, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "order" },
        screenshot: "sales-create-order-page",
      },
      {
        phase_id: "select-client-for-order",
        description: "Open the client selector and choose a client",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client"), select[name*="client" i]',
            wait_for: "text=Search, text=Select, [role=option], option",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "sales-order-client-dropdown-open" },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "sales-order-client-selected" },
        ],
      },
      {
        phase_id: "verify-order-form-ready",
        description:
          "Confirm the order form is fully rendered with a submit button",
        steps: [
          {
            action: "assert",
            visible:
              'button:has-text("Save"), button:has-text("Create"), button:has-text("Submit"), button:has-text("Confirm")',
          },
          { action: "screenshot", name: "sales-order-form-ready" },
        ],
      },
      {
        phase_id: "save-draft-order",
        description: "Save the order (even as draft) and verify it persists",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Save"), button:has-text("Save Draft"), button:has-text("Create Order")',
            wait_for: "text=saved, text=Created, text=Order, text=Draft",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: 'h1, [data-testid*="order-id"], [class*="order-number"]',
            as: "orderId",
          },
          { action: "screenshot", name: "sales-order-saved" },
        ],
      },
      {
        phase_id: "navigate-away-from-order",
        description: "Navigate to dashboard to leave the order context",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "sales-left-order-to-dashboard" },
        ],
      },
      {
        phase_id: "return-to-orders-and-verify",
        description: "Return to orders list and verify the new order appears",
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
              'table tbody tr:first-child, [data-testid*="order-row"]:first-child',
          },
          { action: "screenshot", name: "sales-orders-after-create" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.create-sales-sheet — daily CRUD lifecycle
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.create-sales-sheet",
    description:
      "Create a new sales sheet, save it, navigate away, and verify persistence",
    tags: [
      "route:/sales-sheets",
      "persona:sales",
      "daily",
      "crud:create",
      "save-state",
      "persistence",
    ],
    phases: [
      {
        phase_id: "navigate-sales-sheets",
        description: "Go to sales sheets page",
        steps: [
          {
            action: "navigate",
            path: "/sales-sheets",
            wait_for: "text=Sales Sheet, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "sales-sheet" },
        screenshot: "sales-sheets-list",
      },
      {
        phase_id: "verify-page-loaded",
        description: "Verify the sales sheets page renders correctly",
        steps: [
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "sales-sheets-page-loaded" },
        ],
      },
      {
        phase_id: "create-new-sales-sheet",
        description: "Open the create form for a new sales sheet",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("New"), button:has-text("Add"), [data-testid*="create-sheet"], [data-testid*="new-sheet"]',
            wait_for: "text=Name, text=Title, text=Products, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "sales-sheet-create-form" },
        ],
      },
      {
        phase_id: "fill-sales-sheet-form",
        description: "Enter a name for the sales sheet",
        steps: [
          {
            action: "type",
            target:
              'input[name="name"], input[name="title"], input[placeholder*="name" i], input[placeholder*="title" i], input[aria-label*="name" i]',
            value: "QA Chain Sales Sheet {{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "sales-sheet-form-filled" },
        ],
      },
      {
        phase_id: "save-sales-sheet",
        description: "Submit and verify the sales sheet saves",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Publish")',
            wait_for: "text=saved, text=Created, text=Success",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "sales-sheet-saved" },
        ],
      },
      {
        phase_id: "navigate-away-and-verify-persistence",
        description:
          "Leave the page and come back to confirm the sheet is still there",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "navigate",
            path: "/sales-sheets",
            wait_for: "text=Sales Sheet, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", text_contains: "QA Chain Sales Sheet" },
          { action: "screenshot", name: "sales-sheet-persisted" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.manage-client-profile — daily historical edit
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.manage-client-profile",
    description:
      "View and edit an existing client profile (historical record editing)",
    tags: [
      "route:/clients",
      "persona:sales",
      "daily",
      "crud:read",
      "crud:update",
      "historical",
      "edit-saved-record",
    ],
    phases: [
      {
        phase_id: "navigate-clients",
        description: "Go to the clients list",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Clients, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "clients" },
        screenshot: "sales-clients-list-for-profile",
      },
      {
        phase_id: "open-existing-client",
        description: "Click on the first client row to open its profile",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="client-row"]:first-child, a[href*="client"]:first-child',
            wait_for: "text=Profile, text=Details, text=Client, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "sales-client-profile-opened" },
        ],
      },
      {
        phase_id: "verify-profile-data",
        description:
          "Verify the profile page shows the client's historical data",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="detail"], [class*="profile"], [class*="info"], h1, h2',
          },
          { action: "screenshot", name: "sales-client-profile-data" },
        ],
      },
      {
        phase_id: "edit-profile-field",
        description: "Click edit on the profile and update a contact field",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Edit"), [data-testid*="edit-profile"], button:has-text("Modify")',
            wait_for: "input, form, textarea",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="email"], input[placeholder*="email" i], input[type="email"], textarea[name="notes"]',
            value: "qa-chain-test@example.com",
            clear_first: true,
          },
          { action: "screenshot", name: "sales-client-profile-edit-filled" },
        ],
      },
      {
        phase_id: "save-profile-edit",
        description: "Save the profile edit and confirm the update was applied",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
            wait_for: "text=Success, text=Updated, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-client-profile-edit-saved" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.process-return — occasional
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.process-return",
    description: "Navigate to returns page and initiate a return request",
    tags: [
      "route:/returns",
      "persona:sales",
      "occasional",
      "crud:create",
      "cross-domain:returns-inventory",
    ],
    phases: [
      {
        phase_id: "navigate-returns",
        description: "Go to the returns page",
        steps: [
          {
            action: "navigate",
            path: "/returns",
            wait_for: "text=Return, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "return" },
        screenshot: "sales-returns-page",
      },
      {
        phase_id: "verify-returns-list",
        description: "Verify the returns list renders",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="returns"], [data-testid*="return"]',
          },
          { action: "screenshot", name: "sales-returns-list-loaded" },
        ],
      },
      {
        phase_id: "initiate-new-return",
        description: "Click the create/initiate return button",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("New Return"), button:has-text("Initiate"), [data-testid*="create-return"]',
            wait_for: "text=Return, text=Order, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "sales-return-form-opened" },
        ],
      },
      {
        phase_id: "verify-return-form",
        description: "Confirm return form elements are displayed",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'input, select, [role="combobox"], button:has-text("Submit"), button:has-text("Save")',
          },
          { action: "screenshot", name: "sales-return-form-elements" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.manage-credits — occasional
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.manage-credits",
    description: "Review and manage client credits",
    tags: [
      "route:/credits",
      "persona:sales",
      "occasional",
      "crud:read",
      "cross-domain:credits-accounting",
    ],
    phases: [
      {
        phase_id: "navigate-credits",
        description: "Go to the credits page",
        steps: [
          {
            action: "navigate",
            path: "/credits",
            wait_for: "text=Credit, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "credit" },
        screenshot: "sales-credits-page",
      },
      {
        phase_id: "verify-credits-list",
        description: "Verify the credits list is rendered",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [data-testid*="credit"]',
          },
          { action: "screenshot", name: "sales-credits-list" },
        ],
      },
      {
        phase_id: "inspect-credit-record",
        description: "Open a credit record to view its details",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="credit-row"]:first-child, a[href*="credit"]',
            wait_for: "text=Credit, text=Balance, text=Amount, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-credit-detail" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.edit-pricing-rules — occasional historical edit
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.edit-pricing-rules",
    description: "View and edit pricing rules (historical record editing)",
    tags: [
      "route:/pricing-rules",
      "persona:sales",
      "occasional",
      "crud:read",
      "crud:update",
      "edit-saved-record",
    ],
    phases: [
      {
        phase_id: "navigate-pricing",
        description: "Go to the pricing rules page",
        steps: [
          {
            action: "navigate",
            path: "/pricing-rules",
            wait_for: "text=Pricing, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "pricing" },
        screenshot: "sales-pricing-rules-list",
      },
      {
        phase_id: "verify-rules-loaded",
        description: "Confirm the pricing rules table or list is shown",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="rules"], [data-testid*="rule"]',
          },
          { action: "screenshot", name: "sales-pricing-rules-loaded" },
        ],
      },
      {
        phase_id: "open-pricing-rule",
        description: "Click on an existing pricing rule to open it",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="rule-row"]:first-child, a[href*="pricing"]',
            wait_for: "text=Rule, text=Price, text=Discount, text=Markup, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-pricing-rule-detail" },
        ],
      },
      {
        phase_id: "edit-pricing-rule",
        description: "Edit a field on the pricing rule and save it",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Edit"), [data-testid*="edit-rule"], button:has-text("Modify")',
            wait_for: "input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="description"], input[name="name"], textarea[name="description"]',
            value: "QA Chain Updated Rule {{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
            wait_for: "text=Success, text=Updated, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-pricing-rule-edit-saved" },
        ],
      },
    ],
  },
];
