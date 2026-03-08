/**
 * Write-Path Sales Chain Definitions
 *
 * Full interactive write-path chains for the sales domain.
 * Every chain exercises real CRUD mutations: create, save, navigate away,
 * return, verify persistence, edit, and in lifecycle chains — finalize.
 *
 * Action vocabulary:
 *   navigate, click, type, select, add_line_item, assert, wait, screenshot, store, custom
 */

import type { TestChain } from "../types";

export const WRITE_PATH_SALES_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // sales.order-full-lifecycle — most critical write-path chain
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.order-full-lifecycle",
    description:
      "Full order lifecycle: create draft with line items → save → navigate away → return → verify persistence → edit quantity → finalize with payment terms → confirm CONFIRMED status",
    tags: [
      "route:/orders/create",
      "route:/sales",
      "persona:sales",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
      "draft",
      "finalize",
      "line-items",
      "write-path",
    ],
    preconditions: {
      ensure: [
        { entity: "client", ref: "test-buyer", where: { isBuyer: true } },
        { entity: "batch", ref: "test-batch", where: { status: "AVAILABLE" } },
      ],
    },
    phases: [
      {
        phase_id: "navigate-to-create-order",
        description: "Navigate to the order creation page and wait for form",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, text=Sale, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: "main",
          },
          { action: "screenshot", name: "wp-sales-order-create-page" },
        ],
        expected_ui: { url_contains: "order" },
        screenshot: "wp-sales-order-create-loaded",
      },
      {
        phase_id: "select-client",
        description:
          "Click client selector combobox, type to search, select first result",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client")',
            wait_for: "text=Search, text=Select, [role=listbox], [role=option]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              '[aria-label*="client" i] input, [role="combobox"] input, input[placeholder*="search" i], input[placeholder*="client" i]',
            value: "test",
            clear_first: true,
          },
          { action: "wait", duration: 300 },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[role="option"]:first-child, [role="listbox"] li:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-sales-order-client-selected" },
        ],
      },
      {
        phase_id: "add-line-items",
        description: "Add line items to the order using add_line_item action",
        steps: [
          {
            action: "add_line_item",
            batch_ref: "test-batch",
            quantity: 5,
            unit_price: 100,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-sales-order-line-items-added" },
          {
            action: "assert",
            visible:
              '[class*="line-item"], [data-testid*="line-item"], table tbody tr',
          },
        ],
      },
      {
        phase_id: "save-draft",
        description:
          "Click Save Draft, wait for toast, extract order ID from URL",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Save Draft"), button:has-text("Save"), button:has-text("Create Order")',
            wait_for: "text=saved, text=Draft, text=Created, text=Order",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: 'h1, [data-testid*="order-id"], [class*="order-number"], [class*="order-id"]',
            as: "orderHeading",
          },
          { action: "screenshot", name: "wp-sales-order-draft-saved" },
        ],
        extract: [
          {
            from: "url",
            as: "orderId",
            pattern: "/orders/(\\d+)",
          },
        ],
      },
      {
        phase_id: "navigate-away",
        description: "Navigate away to /dashboard to break context",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-sales-order-left-to-dashboard" },
        ],
        expected_ui: { url_contains: "dashboard" },
      },
      {
        phase_id: "return-and-find-order",
        description: "Navigate to /sales and search for the draft order",
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
          { action: "screenshot", name: "wp-sales-order-list-after-return" },
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="order-row"]:first-child a, [class*="row"]:first-child a',
            wait_for: "text=Order, text=Draft, text=Details, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-sales-order-detail-returned" },
        ],
      },
      {
        phase_id: "verify-line-items-persisted",
        description: "Verify line items survived navigation away and back",
        steps: [
          {
            action: "assert",
            visible:
              "table tbody tr, [class*='line-item'], [data-testid*='line-item']",
          },
          {
            action: "assert",
            text_contains: "5",
          },
          { action: "screenshot", name: "wp-sales-order-items-persisted" },
        ],
      },
      {
        phase_id: "edit-line-item-quantity",
        description: "Click Edit, modify a line item quantity, save again",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Edit"), [data-testid*="edit-order"], button:has-text("Modify")',
            wait_for: "input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name*="quantity" i]:last-child, table tbody tr:first-child input[type="number"], [class*="line-item"]:first-child input[type="number"]',
            value: "8",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button:has-text("Save"), button:has-text("Save Draft"), button:has-text("Update")',
            wait_for: "text=saved, text=Updated, text=Draft",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-sales-order-quantity-edited" },
        ],
      },
      {
        phase_id: "finalize-order",
        description:
          "Click Finalize Order to open ConfirmDraftModal, select payment terms",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Finalize"), button:has-text("Finalize Order"), [data-testid*="finalize"]',
            wait_for:
              "text=Confirm, text=Payment, text=Terms, [role=dialog], [class*=modal]",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-sales-order-finalize-modal-open" },
        ],
      },
      {
        phase_id: "select-payment-terms",
        description: "Select NET_30 payment terms in the confirmation modal",
        steps: [
          {
            action: "click",
            target:
              '[role=dialog] [role="combobox"], [class*=modal] [role="combobox"], [role=dialog] select[name*="payment" i], [role=dialog] select[name*="terms" i]',
            wait_for: "[role=option], option",
          },
          { action: "wait", duration: 200 },
          {
            action: "click",
            target:
              '[role="option"]:has-text("NET_30"), [role="option"]:has-text("Net 30"), option[value="NET_30"]',
            wait_for: "main",
          },
          {
            action: "screenshot",
            name: "wp-sales-order-payment-terms-selected",
          },
        ],
      },
      {
        phase_id: "confirm-finalize",
        description: "Click Confirm in modal, wait for success toast",
        steps: [
          {
            action: "click",
            target:
              '[role=dialog] button:has-text("Confirm"), [class*=modal] button:has-text("Confirm"), [role=dialog] button[type="submit"]',
            wait_for: "text=Confirmed, text=Success, text=CONFIRMED",
          },
          { action: "wait", network_idle: true, timeout: 12000 },
          { action: "screenshot", name: "wp-sales-order-finalized" },
        ],
      },
      {
        phase_id: "verify-confirmed-status",
        description: "Verify order status shows CONFIRMED",
        steps: [
          {
            action: "assert",
            text_contains: "CONFIRMED",
          },
          { action: "screenshot", name: "wp-sales-order-confirmed-status" },
        ],
      },
    ],
    invariants: [
      {
        name: "order-status-confirmed",
        description: "Order status is CONFIRMED after finalization",
        check: "ui",
        page: "/sales",
        assertions: ["CONFIRMED"],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.draft-save-resume — Draft lifecycle with load and delete
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.draft-save-resume",
    description:
      "Create order draft, save, navigate completely away (dashboard then calendar), return to order create, load draft, verify client and items, then delete the draft",
    tags: [
      "route:/orders/create",
      "route:/dashboard",
      "route:/calendar",
      "persona:sales",
      "crud:create",
      "crud:delete",
      "save-state",
      "persistence",
      "draft",
      "write-path",
    ],
    preconditions: {
      ensure: [
        { entity: "client", ref: "test-buyer", where: { isBuyer: true } },
        { entity: "batch", ref: "test-batch", where: { status: "AVAILABLE" } },
      ],
    },
    phases: [
      {
        phase_id: "create-draft-order",
        description:
          "Create order, select client, add line item, save as draft",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"]',
            wait_for: "[role=listbox], [role=option]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "add_line_item",
            batch_ref: "test-batch",
            quantity: 3,
            unit_price: 50,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: 'button:has-text("Save Draft"), button:has-text("Save")',
            wait_for: "text=saved, text=Draft, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-draft-resume-draft-saved" },
        ],
        extract: [
          { from: "url", as: "draftOrderId", pattern: "/orders/(\\d+)" },
        ],
      },
      {
        phase_id: "navigate-completely-away",
        description:
          "Navigate to dashboard then calendar to fully break context",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "navigate",
            path: "/calendar",
            wait_for: "text=Calendar, main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-draft-resume-on-calendar" },
        ],
      },
      {
        phase_id: "return-to-order-create",
        description: "Navigate back to /orders/create",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-draft-resume-back-at-create" },
        ],
      },
      {
        phase_id: "load-draft",
        description:
          "Click Load Draft or use draft picker to restore saved draft",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Load Draft"), button:has-text("Resume Draft"), button:has-text("Draft"), [data-testid*="load-draft"], [data-testid*="draft-picker"]',
            wait_for:
              "text=Draft, text=Order, [role=listbox], [role=option], [role=dialog]",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-draft-resume-draft-picker-open" },
          {
            action: "click",
            target:
              '[role="option"]:first-child, [role="listbox"] li:first-child, [role=dialog] table tbody tr:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-draft-resume-draft-loaded" },
        ],
      },
      {
        phase_id: "verify-draft-restored",
        description:
          "Verify client and line items were restored from the draft",
        steps: [
          {
            action: "assert",
            visible: "main",
          },
          {
            action: "assert",
            visible:
              'table tbody tr, [class*="line-item"], [data-testid*="line-item"]',
          },
          {
            action: "assert",
            text_contains: "3",
          },
          { action: "screenshot", name: "wp-draft-resume-verified" },
        ],
      },
      {
        phase_id: "delete-draft",
        description: "Delete the draft and verify it is gone",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Delete Draft"), button:has-text("Discard Draft"), button:has-text("Delete"), [data-testid*="delete-draft"]',
            wait_for:
              "text=Deleted, text=Discarded, text=Removed, [role=dialog]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[role=dialog] button:has-text("Confirm"), [role=dialog] button:has-text("Delete"), [role=dialog] button:has-text("Yes")',
            wait_for: "text=Deleted, text=Removed, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            not_visible: '[data-testid*="draft-order"]:has-text("3")',
          },
          { action: "screenshot", name: "wp-draft-resume-draft-deleted" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.client-full-crud — Complete client lifecycle
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.client-full-crud",
    description:
      "Create client with all fields → save → navigate away and back → search and open profile → edit multiple fields → save edits → verify persistence",
    tags: [
      "route:/clients",
      "persona:sales",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
      "write-path",
    ],
    preconditions: {},
    phases: [
      {
        phase_id: "navigate-clients",
        description: "Go to clients list",
        steps: [
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Clients, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-client-crud-list" },
        ],
        expected_ui: { url_contains: "clients" },
      },
      {
        phase_id: "open-create-form",
        description: "Click create/add client button",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add"), button:has-text("New Client"), [data-testid*="create-client"], [data-testid*="add-client"]',
            wait_for: "text=Name, text=Client, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-client-crud-form-open" },
        ],
      },
      {
        phase_id: "fill-client-all-fields",
        description: "Fill name, email, phone, and address fields",
        steps: [
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i], #name',
            value: "QA Write-Path Client {{timestamp}}",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="email"], input[placeholder*="email" i], input[type="email"]',
            value: "qa-write-path-{{timestamp}}@example.com",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="phone"], input[placeholder*="phone" i], input[aria-label*="phone" i]',
            value: "555-WP-TEST",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="address"], input[name="street"], textarea[name="address"], input[placeholder*="address" i]',
            value: "123 QA Write Path Ave",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-client-crud-form-filled" },
        ],
      },
      {
        phase_id: "save-client",
        description: "Submit form and verify success toast",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client"), button:has-text("Submit")',
            wait_for: "text=Success, text=Created, text=saved, text=Client",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-client-crud-saved" },
        ],
        extract: [{ from: "url", as: "clientId", pattern: "/clients/(\\d+)" }],
      },
      {
        phase_id: "navigate-away-and-return",
        description: "Navigate to dashboard and back to clients",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "navigate",
            path: "/clients",
            wait_for: "text=Clients, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-client-crud-back-at-list" },
        ],
      },
      {
        phase_id: "search-for-client",
        description: "Search for the created client to verify persistence",
        steps: [
          {
            action: "type",
            target:
              'input[placeholder*="search" i], input[type="search"], [data-testid*="search"], input[aria-label*="search" i]',
            value: "QA Write-Path Client",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            text_contains: "QA Write-Path Client",
          },
          {
            action: "click",
            target:
              'table tbody tr:has-text("QA Write-Path Client"), a:has-text("QA Write-Path Client"), [data-testid*="client-row"]:has-text("QA Write-Path Client")',
            wait_for: "text=Profile, text=Details, text=Client, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-client-crud-profile-opened" },
        ],
      },
      {
        phase_id: "edit-multiple-fields",
        description: "Edit phone, email, and notes fields",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Edit"), [data-testid*="edit-client"], button:has-text("Modify")',
            wait_for: "input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="phone"], input[placeholder*="phone" i], input[aria-label*="phone" i]',
            value: "555-EDITED-WP",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="email"], input[placeholder*="email" i], input[type="email"]',
            value: "qa-edited@example.com",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'textarea[name="notes"], input[name="notes"], textarea[placeholder*="note" i]',
            value: "QA write-path edit verified",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-client-crud-edited-fields" },
        ],
      },
      {
        phase_id: "save-edits",
        description: "Save edits and verify persistence",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
            wait_for: "text=Success, text=Updated, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            text_contains: "555-EDITED-WP",
          },
          { action: "screenshot", name: "wp-client-crud-edits-saved" },
        ],
      },
    ],
    invariants: [
      {
        name: "client-edit-persisted",
        description: "Edited client fields show updated values",
        check: "ui",
        page: "/clients",
        assertions: ["QA Write-Path Client"],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // sales.sales-sheet-lifecycle — Sales sheet draft flow
  // ---------------------------------------------------------------------------
  {
    chain_id: "sales.sales-sheet-lifecycle",
    description:
      "Create sales sheet → select client → add products → save draft → navigate away → return and load draft → delete draft → create new and finalize",
    tags: [
      "route:/sales-sheets",
      "persona:sales",
      "crud:create",
      "crud:update",
      "crud:delete",
      "save-state",
      "persistence",
      "draft",
      "finalize",
      "write-path",
    ],
    preconditions: {
      ensure: [
        { entity: "client", ref: "test-buyer", where: { isBuyer: true } },
      ],
    },
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
          { action: "screenshot", name: "wp-sales-sheet-list" },
        ],
        expected_ui: { url_contains: "sales-sheet" },
      },
      {
        phase_id: "create-new-sheet",
        description: "Open create form for a new sales sheet",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("New"), button:has-text("Add"), [data-testid*="create-sheet"], [data-testid*="new-sheet"]',
            wait_for: "text=Name, text=Title, text=Products, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="name"], input[name="title"], input[placeholder*="name" i], input[placeholder*="title" i]',
            value: "QA Sales Sheet Lifecycle {{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-sales-sheet-form-named" },
        ],
      },
      {
        phase_id: "select-client-for-sheet",
        description: "Select client from combobox for the sales sheet",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"]',
            wait_for: "[role=listbox], [role=option]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-sales-sheet-client-selected" },
        ],
      },
      {
        phase_id: "add-products-to-sheet",
        description: "Add products or items to the sales sheet",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Add Product"), button:has-text("Add Item"), button:has-text("Add"), [data-testid*="add-product"], [data-testid*="add-item"]',
            wait_for: "[role=option], [role=listbox], input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[role="option"]:first-child, [role="listbox"] li:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-sales-sheet-products-added" },
        ],
      },
      {
        phase_id: "save-draft-sheet",
        description: "Save the sheet as draft (auto-save or manual)",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Save Draft"), button:has-text("Save"), button:has-text("Draft")',
            wait_for: "text=saved, text=Draft, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-sales-sheet-draft-saved" },
        ],
        extract: [
          { from: "url", as: "sheetId", pattern: "/sales-sheets/(\\d+)" },
        ],
      },
      {
        phase_id: "navigate-away-from-sheet",
        description: "Navigate to dashboard to break context",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-sales-sheet-left-to-dashboard" },
        ],
      },
      {
        phase_id: "return-and-load-draft",
        description: "Return to /sales-sheets and load the draft from picker",
        steps: [
          {
            action: "navigate",
            path: "/sales-sheets",
            wait_for: "text=Sales Sheet, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            text_contains: "QA Sales Sheet Lifecycle",
          },
          { action: "screenshot", name: "wp-sales-sheet-persisted" },
          {
            action: "click",
            target:
              'table tbody tr:has-text("QA Sales Sheet Lifecycle"), a:has-text("QA Sales Sheet Lifecycle"), [data-testid*="sheet-row"]:has-text("QA Sales Sheet Lifecycle")',
            wait_for: "text=Sheet, text=Draft, text=Products, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-sales-sheet-draft-loaded" },
        ],
      },
      {
        phase_id: "delete-draft-sheet",
        description: "Delete the draft sheet and verify deletion",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Delete"), button:has-text("Discard"), [data-testid*="delete-sheet"]',
            wait_for: "text=Confirm, text=Delete, [role=dialog]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[role=dialog] button:has-text("Confirm"), [role=dialog] button:has-text("Delete"), [role=dialog] button:has-text("Yes")',
            wait_for: "text=Deleted, text=Removed, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            not_visible: 'text="QA Sales Sheet Lifecycle"',
          },
          { action: "screenshot", name: "wp-sales-sheet-deleted" },
        ],
      },
      {
        phase_id: "create-and-finalize-new-sheet",
        description: "Create a new sheet and publish/finalize it",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("New"), [data-testid*="create-sheet"]',
            wait_for: "input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="name"], input[name="title"], input[placeholder*="name" i]',
            value: "QA Final Sheet {{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Publish"), button:has-text("Finalize")',
            wait_for: "text=saved, text=Created, text=Published, text=Success",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-sales-sheet-finalized" },
        ],
      },
    ],
  },
];
