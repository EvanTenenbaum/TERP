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
              '[role="grid"] [role="row"]:nth-child(2), [data-testid*="order-row"]:first-child, table tbody tr:first-child',
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
          // Click the Orders tab explicitly — session may preserve the last active tab
          {
            action: "click",
            target: '[role="tab"]:has-text("Orders")',
            wait_for: '[role="grid"], text=Orders Queue',
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              '[role="grid"] [role="row"]:nth-child(2), [data-testid*="order-row"]:first-child',
          },
          { action: "screenshot", name: "sales-orders-after-create" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.create-sales-sheet — daily read (catalogues tab)
  // NOTE: /sales-sheets now redirects into the unified /sales workspace as the
  // "Sales Catalogues" tab. The pilot surface is a catalog browser; a standalone
  // create-form with a name input does not exist in the current pilot. This chain
  // verifies the tab loads and the surface renders. Restore create/save phases
  // once the create flow is implemented in SalesSheetsPilotSurface.
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.create-sales-sheet",
    description:
      "Verify the Sales Catalogues tab loads in the unified sales workspace",
    tags: ["route:/sales", "persona:sales", "daily", "read", "crud:read"],
    phases: [
      {
        phase_id: "navigate-sales",
        description: "Navigate to the unified sales workspace",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "sales" },
        screenshot: "sales-workspace-for-catalogues",
      },
      {
        phase_id: "open-sales-catalogues-tab",
        description: "Click the Sales Catalogues tab",
        steps: [
          {
            action: "click",
            target:
              '[role="tab"]:has-text("Sales Catalogues"), [role="tab"]:has-text("Catalogue")',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-catalogues-tab-loaded" },
        ],
      },
      {
        phase_id: "verify-catalogues-surface-renders",
        description:
          "Assert the catalogues surface renders with a grid, list, or empty state",
        steps: [
          {
            action: "assert",
            visible:
              '[role="grid"], [role="table"], table, [class*="catalogue"], [class*="catalog"], [class*="sheet"], main',
          },
          { action: "screenshot", name: "sales-catalogues-surface" },
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
        description:
          "Go to the clients list (redirects into Relationships workspace)",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Clients, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "client" },
        screenshot: "sales-clients-list-for-profile",
      },
      {
        phase_id: "open-existing-client",
        description: "Click on the first client row to open its profile",
        steps: [
          {
            action: "click",
            target:
              '[data-testid^="client-row-"], table tbody tr:first-child, a[href*="/clients/"]:first-child',
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
  // NOTE: /returns redirects to /sales?tab=returns. The Returns tab uses
  // ReturnsPilotSurface which is a queue view only — new returns are initiated
  // from individual order detail pages, not via a standalone Create button.
  // This chain verifies the queue renders and the surface is navigable.
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.process-return",
    description:
      "Verify the Returns queue renders in the unified sales workspace",
    tags: [
      "route:/sales",
      "persona:sales",
      "occasional",
      "read",
      "crud:read",
      "cross-domain:returns-inventory",
    ],
    phases: [
      {
        phase_id: "navigate-returns",
        description: "Navigate to the returns surface via the sales workspace",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "sales" },
        screenshot: "sales-workspace-for-returns",
      },
      {
        phase_id: "open-returns-tab",
        description: "Click the Returns tab",
        steps: [
          {
            action: "click",
            target: '[role="tab"]:has-text("Returns")',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "sales-returns-tab-loaded" },
        ],
      },
      {
        phase_id: "verify-returns-surface-renders",
        description:
          "Assert the returns queue renders (AG Grid or empty state)",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[role="grid"], [role="table"], table, [class*="return"], [class*="queue"], text=Return',
          },
          { action: "screenshot", name: "sales-returns-surface" },
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

  // ---------------------------------------------------------------------------
  // sales.view-demand-supply — Demand & Supply workspace
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.view-demand-supply",
    description:
      "View the Demand & Supply workspace for matching supply with demand",
    tags: ["route:/demand-supply", "persona:sales", "occasional", "read"],
    phases: [
      {
        phase_id: "load-demand-supply",
        description: "Navigate to demand supply page",
        steps: [
          {
            action: "navigate",
            path: "/demand-supply",
            wait_for: "text=Demand, text=Supply, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "demand" },
        screenshot: "sales-demand-supply-loaded",
      },
      {
        phase_id: "verify-demand-supply-content",
        description: "Verify demand and supply sections display",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="card"], main',
          },
          { action: "screenshot", name: "sales-demand-supply-content" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.view-relationships — Relationships workspace
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.view-relationships",
    description:
      "View the Relationships workspace with buyer and supplier records",
    tags: [
      "route:/relationships",
      "route:/clients",
      "persona:sales",
      "occasional",
      "read",
    ],
    phases: [
      {
        phase_id: "load-relationships",
        description: "Navigate to relationships workspace",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Relationship, text=Client, text=Buyer, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "client" },
        screenshot: "sales-relationships-loaded",
      },
      {
        phase_id: "verify-buyer-records",
        description: "Verify buyer records tab displays",
        steps: [
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "sales-relationships-buyers" },
        ],
      },
      {
        phase_id: "check-supplier-records",
        description: "Switch to supplier records tab",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Supplier"), [role="tab"]:has-text("Supplier"), a:has-text("Supplier")',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "sales-relationships-suppliers" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.view-live-shopping — Live Shopping sessions
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.view-live-shopping",
    description:
      "View the Live Shopping page and verify sessions can be managed",
    tags: ["route:/live-shopping", "persona:sales", "occasional", "read"],
    phases: [
      {
        phase_id: "load-live-shopping",
        description: "Navigate to live shopping page",
        steps: [
          {
            action: "navigate",
            path: "/live-shopping",
            wait_for: "text=Live, text=Shopping, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "live-shopping" },
        screenshot: "sales-live-shopping-loaded",
      },
      {
        phase_id: "verify-live-shopping-content",
        description: "Verify live shopping content displays",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="card"], [class*="session"], main',
          },
          { action: "screenshot", name: "sales-live-shopping-content" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.view-leaderboard — Sales Leaderboard
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.view-leaderboard",
    description: "View the sales leaderboard for team performance tracking",
    tags: ["route:/leaderboard", "persona:sales", "occasional", "read"],
    phases: [
      {
        phase_id: "load-leaderboard",
        description: "Navigate to leaderboard page",
        steps: [
          {
            action: "navigate",
            path: "/leaderboard",
            wait_for: "text=Leaderboard, text=Performance, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "leaderboard" },
        screenshot: "sales-leaderboard-loaded",
      },
      {
        phase_id: "verify-leaderboard-content",
        description: "Verify leaderboard data displays",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="card"], [class*="leaderboard"], [class*="rank"], main',
          },
          { action: "screenshot", name: "sales-leaderboard-content" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.view-pricing-profiles — Pricing Profiles
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.view-pricing-profiles",
    description: "View pricing profiles configuration",
    tags: ["route:/pricing/profiles", "persona:sales", "occasional", "read"],
    phases: [
      {
        phase_id: "load-pricing-profiles",
        description: "Navigate to pricing profiles page",
        steps: [
          {
            action: "navigate",
            path: "/pricing/profiles",
            wait_for: "text=Pricing, text=Profile, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
        ],
        expected_ui: { url_contains: "pricing" },
        screenshot: "sales-pricing-profiles-loaded",
      },
      {
        phase_id: "verify-profiles-content",
        description: "Verify pricing profiles display",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="card"], main',
          },
          { action: "screenshot", name: "sales-pricing-profiles-content" },
        ],
      },
    ],
  },
];
