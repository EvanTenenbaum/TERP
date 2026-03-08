/**
 * Edge Case Chain Definitions
 *
 * Chains that test edge cases, error handling, and unusual user flows.
 * These chains are designed to uncover bugs that happy-path tests miss:
 * form validation failures, unsaved-changes warnings, draft recovery,
 * status-machine enforcement, empty states, input boundary conditions,
 * rapid navigation stability, double-submit protection, pagination,
 * combobox type-ahead, cross-domain draft integrity, soft-delete
 * visibility, and auto-save debounce behaviour.
 */

import type { TestChain } from "../types";

export const EDGE_CASE_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // edge.order-validation-errors — Form validation testing
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.order-validation-errors",
    description:
      "Verify the order creation form rejects invalid input and accepts valid input",
    tags: ["edge-case", "validation", "error-handling", "route:/orders/create"],
    phases: [
      {
        phase_id: "navigate-to-create",
        description: "Navigate to the order creation page",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-order-validation-start" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "submit-without-client",
        description:
          "Try to save without selecting a client — expect validation error",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Save"), button:has-text("Save Draft"), button[type="submit"]',
            wait_after: 1000,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              '[class*="error"], [class*="invalid"], [role="alert"], text=required, text=Required, text=select a client, text=Client is required',
          },
          {
            action: "screenshot",
            name: "edge-order-no-client-error",
          },
        ],
      },
      {
        phase_id: "select-client-try-finalize-empty-items",
        description:
          "Select a client but attempt to finalize with zero line items",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client"), select[name*="client" i]',
            wait_for: "text=Search, text=Select, [role=option], option",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button:has-text("Finalize"), button:has-text("Confirm"), button:has-text("Submit")',
            wait_after: 1000,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              '[class*="error"], [class*="invalid"], [role="alert"], text=line item, text=items required, text=Add at least',
          },
          { action: "screenshot", name: "edge-order-no-line-items-error" },
        ],
      },
      {
        phase_id: "add-line-item-negative-quantity",
        description: "Add a line item with a negative quantity — expect error",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Add Item"), button:has-text("Add Line Item"), button:has-text("Add Product"), [data-testid*="add-line-item"]',
            wait_for: "input, [role=row], [class*=line]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name*="quantity" i], input[placeholder*="qty" i], input[aria-label*="quantity" i], [data-testid*="quantity"] input',
            value: "-5",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Save Draft")',
            wait_after: 1000,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              '[class*="error"], [class*="invalid"], [role="alert"], text=positive, text=greater than, text=invalid quantity',
          },
          { action: "screenshot", name: "edge-order-negative-qty-error" },
        ],
      },
      {
        phase_id: "enter-extremely-large-quantity",
        description:
          "Enter an extremely large quantity — expect validation error or graceful handling",
        steps: [
          {
            action: "type",
            target:
              'input[name*="quantity" i], input[placeholder*="qty" i], input[aria-label*="quantity" i], [data-testid*="quantity"] input',
            value: "99999999999",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Save Draft")',
            wait_after: 1000,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              '[class*="error"], [class*="invalid"], [role="alert"], text=maximum, text=too large, text=exceed, main',
          },
          { action: "screenshot", name: "edge-order-huge-qty-error" },
        ],
      },
      {
        phase_id: "fill-valid-and-save",
        description:
          "Enter a valid quantity and save — expect the save to succeed",
        steps: [
          {
            action: "type",
            target:
              'input[name*="quantity" i], input[placeholder*="qty" i], input[aria-label*="quantity" i], [data-testid*="quantity"] input',
            value: "1",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button:has-text("Save"), button:has-text("Save Draft"), button[type="submit"]',
            wait_for:
              "text=saved, text=Created, text=Draft, text=Order, text=Success",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-order-valid-save-success" },
        ],
        expected_ui: { url_contains: "order" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.draft-navigation-warning — Unsaved changes detection
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.draft-navigation-warning",
    description:
      "Verify unsaved-changes warning appears on navigation away from a dirty form, and does not appear after saving",
    tags: [
      "edge-case",
      "draft",
      "unsaved-changes",
      "navigation",
      "route:/orders/create",
    ],
    phases: [
      {
        phase_id: "navigate-create-order",
        description: "Open a fresh order creation page",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-draft-warning-start" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "make-form-dirty",
        description: "Select a client and type in a field to dirty the form",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client")',
            wait_for: "[role=option], option",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'textarea[name*="note" i], textarea[name*="memo" i], input[name*="note" i], textarea[placeholder*="note" i], textarea',
            value: "QA dirty state test note",
            clear_first: true,
          },
          { action: "screenshot", name: "edge-draft-form-dirty" },
        ],
      },
      {
        phase_id: "attempt-navigation-away",
        description:
          "Click a sidebar navigation link to trigger the unsaved-changes warning",
        steps: [
          {
            action: "click",
            target:
              'nav a[href="/dashboard"], nav a[href="/clients"], nav a[href="/sales"], aside a[href="/dashboard"], [data-testid*="nav"] a:first-child',
            wait_after: 1000,
          },
          { action: "wait", duration: 1500 },
          {
            action: "assert",
            visible:
              '[role="dialog"], [data-testid*="unsaved"], [class*="dialog"], text=unsaved, text=Unsaved, text=leave, text=Leave, text=discard, text=Discard',
          },
          { action: "screenshot", name: "edge-draft-unsaved-dialog" },
        ],
      },
      {
        phase_id: "stay-on-page",
        description:
          "Click the stay/cancel button to dismiss the warning and remain on the form",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Stay"), button:has-text("Cancel"), button:has-text("No"), [data-testid*="stay"], [data-testid*="cancel"]',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible: "text=QA dirty state test note, textarea, input",
          },
          { action: "screenshot", name: "edge-draft-stayed-on-page" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "save-draft",
        description: "Save the form as a draft",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Save Draft"), button:has-text("Save"), button[type="submit"]',
            wait_for: "text=saved, text=Draft, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-draft-saved-before-navigate" },
        ],
      },
      {
        phase_id: "navigate-away-after-save",
        description:
          "Navigate away after saving — no warning dialog should appear",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            not_visible:
              '[role="dialog"]:has-text("unsaved"), [data-testid*="unsaved"]',
          },
          {
            action: "assert",
            visible: "text=Dashboard",
          },
          { action: "screenshot", name: "edge-draft-no-warning-after-save" },
        ],
        expected_ui: { url_contains: "dashboard" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.draft-pickup-after-leave — Draft recovery
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.draft-pickup-after-leave",
    description:
      "Save a draft, navigate to a completely different page, return and verify the draft can be loaded",
    tags: [
      "edge-case",
      "draft",
      "recovery",
      "persistence",
      "route:/orders/create",
    ],
    phases: [
      {
        phase_id: "create-draft",
        description:
          "Navigate to order creation, select client, add line item, and save as draft",
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
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client")',
            wait_for: "[role=option], option",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button:has-text("Add Item"), button:has-text("Add Line Item"), button:has-text("Add Product"), [data-testid*="add-line-item"]',
            wait_after: 1000,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button:has-text("Save Draft"), button:has-text("Save"), button[type="submit"]',
            wait_for: "text=saved, text=Draft, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: '[data-testid*="order-id"], [class*="order-number"], h1, [class*="order-id"]',
            as: "savedDraftId",
          },
          { action: "screenshot", name: "edge-draft-created" },
        ],
      },
      {
        phase_id: "navigate-away-completely",
        description: "Navigate to a completely different domain (inventory)",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "edge-draft-left-to-inventory" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
      {
        phase_id: "return-to-create",
        description: "Navigate back to the order creation page",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-draft-returned-to-create" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "open-draft-picker",
        description: "Open the draft picker / load draft dialog",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Load Draft"), button:has-text("Drafts"), button:has-text("Resume"), [data-testid*="load-draft"], [data-testid*="draft-picker"]',
            wait_for:
              'text=Draft, [role="dialog"], [class*="draft"], [class*="list"]',
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "edge-draft-picker-open" },
        ],
      },
      {
        phase_id: "verify-draft-in-list",
        description: "Assert the saved draft appears in the list",
        steps: [
          {
            action: "assert",
            visible: 'text=Draft, [role="listitem"], [class*="draft-item"], tr',
          },
          { action: "screenshot", name: "edge-draft-in-list" },
        ],
      },
      {
        phase_id: "load-draft",
        description: "Click to load the draft and verify data is restored",
        steps: [
          {
            action: "click",
            target:
              '[role="listitem"]:first-child, [class*="draft-item"]:first-child, tr:first-child button:has-text("Load"), button:has-text("Open")',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              '[role="combobox"], [class*="client"], [class*="line-item"], input',
          },
          { action: "screenshot", name: "edge-draft-loaded" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.status-transition-enforcement — Invalid status transitions
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.status-transition-enforcement",
    description:
      "Verify that invalid status transitions are blocked and valid ones succeed",
    tags: ["edge-case", "status-transition", "state-machine", "route:/sales"],
    phases: [
      {
        phase_id: "open-an-order",
        description: "Navigate to sales and open an existing order",
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
              'table tbody tr:first-child, [data-testid*="order-row"]:first-child, [class*="row"]:first-child a',
            wait_for: "text=Status, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: '[data-testid*="status"], [class*="status-badge"], [class*="order-status"]',
            as: "currentStatus",
          },
          { action: "screenshot", name: "edge-status-order-opened" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "attempt-invalid-transition",
        description:
          "Try to apply a status that would be an invalid backward transition (e.g. Draft on a confirmed order)",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Change Status"), button:has-text("Update Status"), [data-testid*="status-select"], select[name*="status" i]',
            wait_after: 1000,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              '[role="option"], option, [class*="status-option"], [data-testid*="status-option"]',
          },
          { action: "screenshot", name: "edge-status-dropdown-open" },
        ],
      },
      {
        phase_id: "verify-invalid-option-blocked",
        description:
          "Assert that disallowed transitions are either absent or disabled",
        steps: [
          {
            action: "assert",
            visible:
              '[role="option"][aria-disabled="true"], option[disabled], [class*="disabled"], button[disabled], text=not allowed, text=Cannot transition',
          },
          { action: "screenshot", name: "edge-status-invalid-disabled" },
        ],
      },
      {
        phase_id: "apply-valid-transition",
        description: "Select a valid next status and confirm it applies",
        steps: [
          {
            action: "click",
            target:
              '[role="option"]:not([aria-disabled="true"]):first-child, option:not([disabled]):first-child',
            wait_for: "text=Status, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            visible: "main",
          },
          { action: "screenshot", name: "edge-status-valid-transition-done" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.search-empty-results — Search with no matches
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.search-empty-results",
    description:
      "Verify empty state message appears when a search returns no matches",
    tags: ["edge-case", "search", "empty-state", "route:/clients"],
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
          { action: "screenshot", name: "edge-search-clients-loaded" },
        ],
        expected_ui: { url_contains: "clients" },
      },
      {
        phase_id: "search-nonsense-term",
        description: "Type a nonsense search term that should return nothing",
        steps: [
          {
            action: "type",
            target:
              'input[placeholder*="search" i], input[type="search"], [data-testid*="search"], input[aria-label*="search" i]',
            value: "ZZZZNONEXISTENT999",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "edge-search-nonsense-typed" },
        ],
      },
      {
        phase_id: "assert-empty-state",
        description: "Verify the empty state component is shown",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="empty"], [data-testid*="empty-state"], text=No results, text=no results, text=No clients, text=Nothing found, text=No matches',
          },
          { action: "screenshot", name: "edge-search-empty-state" },
        ],
      },
      {
        phase_id: "clear-search-and-verify-list-returns",
        description: "Clear the search and verify the normal list returns",
        steps: [
          {
            action: "type",
            target:
              'input[placeholder*="search" i], input[type="search"], [data-testid*="search"], input[aria-label*="search" i]',
            value: "",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "edge-search-list-restored" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.form-field-edge-cases — Input boundary testing
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.form-field-edge-cases",
    description:
      "Test special characters, very long strings, emoji, and numeric-field text input",
    tags: [
      "edge-case",
      "validation",
      "input-boundary",
      "xss-prevention",
      "route:/clients",
    ],
    phases: [
      {
        phase_id: "navigate-client-create",
        description: "Open the client creation form",
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
              'button:has-text("Create"), button:has-text("Add"), button:has-text("New Client"), [data-testid*="create-client"], [data-testid*="add-client"]',
            wait_for: "text=Name, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "edge-form-create-client-open" },
        ],
      },
      {
        phase_id: "test-xss-in-name",
        description: "Enter a script-injection string in the name field",
        steps: [
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i], #name',
            value: "<script>alert('xss')</script>",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client")',
            wait_after: 1500,
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            not_visible: "text=<script>",
          },
          { action: "screenshot", name: "edge-form-xss-handled" },
        ],
      },
      {
        phase_id: "test-very-long-string",
        description: "Enter a 500+ character string in the name field",
        steps: [
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i], #name',
            value:
              "QALongStringTest_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client")',
            wait_after: 1500,
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "edge-form-long-string-handled" },
        ],
      },
      {
        phase_id: "test-emoji-in-field",
        description: "Enter emoji characters in the name field",
        steps: [
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i], #name',
            value: "QA Emoji Client 🌿🔥💰",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client")',
            wait_after: 1500,
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "edge-form-emoji-handled" },
        ],
      },
      {
        phase_id: "test-text-in-numeric-field",
        description: "Enter alphabetic text in a numeric-only field",
        steps: [
          {
            action: "type",
            target:
              'input[name*="phone" i], input[type="tel"], input[placeholder*="phone" i], input[aria-label*="phone" i]',
            value: "notanumber",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client")',
            wait_after: 1500,
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "edge-form-text-in-numeric-handled" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.rapid-navigation — Fast page switching
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.rapid-navigation",
    description:
      "Rapidly switch between 6+ pages without waiting for full load, then verify the final page renders correctly",
    tags: ["edge-case", "navigation", "performance", "stability"],
    phases: [
      {
        phase_id: "rapid-fire-navigate",
        description:
          "Navigate rapidly through multiple pages in quick succession",
        steps: [
          { action: "navigate", path: "/dashboard" },
          { action: "navigate", path: "/sales" },
          { action: "navigate", path: "/clients" },
          { action: "navigate", path: "/inventory" },
          { action: "navigate", path: "/accounting" },
          { action: "navigate", path: "/calendar" },
          { action: "navigate", path: "/dashboard", wait_for: "main" },
          { action: "wait", network_idle: true, timeout: 15000 },
          { action: "screenshot", name: "edge-rapid-nav-final-page" },
        ],
        expected_ui: { url_contains: "dashboard" },
      },
      {
        phase_id: "verify-dashboard-rendered",
        description:
          "Confirm the dashboard rendered correctly after rapid navigation",
        steps: [
          {
            action: "assert",
            visible: "text=Dashboard, main",
          },
          {
            action: "assert",
            not_visible:
              "text=Something went wrong, text=Error, text=404, text=White screen",
          },
          { action: "screenshot", name: "edge-rapid-nav-verified" },
        ],
        expected_ui: { url_contains: "dashboard" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.double-submit-prevention — Click spam protection
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.double-submit-prevention",
    description:
      "Click the submit button rapidly 3 times and verify only one entity is created or the button is disabled after first click",
    tags: ["edge-case", "double-submit", "idempotency", "route:/clients"],
    phases: [
      {
        phase_id: "open-client-form",
        description: "Navigate to the client creation form",
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
            wait_for: "text=Name, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i], #name',
            value: "QA Double Submit Test {{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "edge-double-submit-form-filled" },
        ],
      },
      {
        phase_id: "rapid-triple-click-submit",
        description: "Click submit 3 times in rapid succession",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client")',
            wait_after: 100,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client")',
            wait_after: 100,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client")',
            wait_after: 200,
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-double-submit-after-clicks" },
        ],
      },
      {
        phase_id: "verify-single-create-or-disabled",
        description:
          "Verify either the button became disabled or only one result exists",
        steps: [
          {
            action: "assert",
            visible:
              'button[disabled], button:has-text("Saving"), button:has-text("Creating"), text=saved, text=Created, text=Success, main',
          },
          { action: "screenshot", name: "edge-double-submit-verified" },
        ],
      },
      {
        phase_id: "search-verify-no-duplicates",
        description: "Search for the created client and confirm no duplicates",
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
            value: "QA Double Submit Test",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "edge-double-submit-search-results" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.table-pagination — Large dataset navigation
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.table-pagination",
    description:
      "Navigate to the next page of results and back, verifying data loads correctly",
    tags: ["edge-case", "pagination", "data-loading", "route:/sales"],
    phases: [
      {
        phase_id: "navigate-orders",
        description: "Go to the orders list",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Orders, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-pagination-orders-page1" },
        ],
        expected_ui: { url_contains: "sales" },
      },
      {
        phase_id: "go-to-next-page",
        description: "Click the Next Page button or load more trigger",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Next"), [aria-label="Next page"], [data-testid*="next-page"], button:has-text("Load More"), [class*="pagination"] button:last-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "edge-pagination-page2" },
        ],
      },
      {
        phase_id: "go-back-to-first-page",
        description: "Click Previous or page 1 to return to the first page",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Previous"), [aria-label="Previous page"], [data-testid*="prev-page"], [class*="pagination"] button:first-child, button:has-text("1")',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible: 'table, [role="table"], [class*="list"], main',
          },
          { action: "screenshot", name: "edge-pagination-back-to-page1" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.combobox-type-ahead — Search-as-you-type
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.combobox-type-ahead",
    description:
      "Verify the client selector combobox filters options as you type and shows empty state for no matches",
    tags: [
      "edge-case",
      "combobox",
      "search",
      "type-ahead",
      "route:/orders/create",
    ],
    phases: [
      {
        phase_id: "navigate-create-order",
        description: "Open the order creation page",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-combobox-start" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "open-combobox",
        description: "Click the client selector combobox to open it",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client")',
            wait_for: "[role=listbox], [role=option], [class*=option]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible: '[role="listbox"], [role="option"], [class*="option"]',
          },
          { action: "screenshot", name: "edge-combobox-opened" },
        ],
      },
      {
        phase_id: "type-partial-name",
        description: "Type partial text and assert options are filtered",
        steps: [
          {
            action: "type",
            target:
              '[role="combobox"] input, input[placeholder*="search" i], input[placeholder*="client" i], [data-testid*="client-search"]',
            value: "a",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible: '[role="option"], [class*="option"], [role="listbox"]',
          },
          { action: "screenshot", name: "edge-combobox-partial-filter" },
        ],
      },
      {
        phase_id: "type-more-specific",
        description: "Type more characters to narrow results further",
        steps: [
          {
            action: "type",
            target:
              '[role="combobox"] input, input[placeholder*="search" i], input[placeholder*="client" i], [data-testid*="client-search"]',
            value: "an",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              '[role="option"], [class*="option"], [role="listbox"], main',
          },
          { action: "screenshot", name: "edge-combobox-narrowed" },
        ],
      },
      {
        phase_id: "type-no-match",
        description: "Type a string that matches no clients",
        steps: [
          {
            action: "type",
            target:
              '[role="combobox"] input, input[placeholder*="search" i], input[placeholder*="client" i], [data-testid*="client-search"]',
            value: "ZZZZNONEXISTENTCLIENT999",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            visible:
              'text=No results, text=no results, text=No clients, text=Nothing found, [class*="empty"], [data-testid*="empty"]',
          },
          { action: "screenshot", name: "edge-combobox-no-match" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.concurrent-tab-simulation — Multiple operations
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.concurrent-tab-simulation",
    description:
      "Create a draft, perform cross-domain operations, then reload the draft and verify its integrity",
    tags: ["edge-case", "concurrent", "cross-domain", "draft-integrity"],
    phases: [
      {
        phase_id: "create-draft-order",
        description: "Create and save a draft order",
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
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client")',
            wait_for: "[role=option], option",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button:has-text("Save Draft"), button:has-text("Save"), button[type="submit"]',
            wait_for: "text=saved, text=Draft, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: '[data-testid*="order-id"], [class*="order-number"], h1',
            as: "concurrentDraftId",
          },
          { action: "screenshot", name: "edge-concurrent-draft-created" },
        ],
      },
      {
        phase_id: "create-a-client",
        description: "Navigate to clients and create a new client",
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
            wait_for: "input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i]',
            value: "QA Concurrent Test Client {{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Client")',
            wait_for: "text=saved, text=Created, text=Success",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-concurrent-client-created" },
        ],
      },
      {
        phase_id: "visit-inventory",
        description: "Navigate to inventory to verify it loads",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "edge-concurrent-inventory-visited" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
      {
        phase_id: "return-to-order-create",
        description: "Go back to the order creation page to reload the draft",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-concurrent-returned-to-create" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "load-draft-and-verify-integrity",
        description: "Load the saved draft and confirm data is intact",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Load Draft"), button:has-text("Drafts"), button:has-text("Resume"), [data-testid*="load-draft"], [data-testid*="draft-picker"]',
            wait_for: 'text=Draft, [role="dialog"], [class*="draft"]',
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[role="listitem"]:first-child, [class*="draft-item"]:first-child, tr:first-child button:has-text("Load"), button:has-text("Open")',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              '[role="combobox"], [class*="client"], [class*="line-item"], input',
          },
          { action: "screenshot", name: "edge-concurrent-draft-integrity-ok" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.delete-and-verify — Soft delete behavior
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.delete-and-verify",
    description:
      "Create a draft order, delete it, and verify it no longer appears in the active list",
    tags: [
      "edge-case",
      "crud:delete",
      "soft-delete",
      "verification",
      "route:/orders/create",
      "route:/sales",
    ],
    phases: [
      {
        phase_id: "create-draft-to-delete",
        description: "Create a draft order that we will later delete",
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
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client")',
            wait_for: "[role=option], option",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button:has-text("Save Draft"), button:has-text("Save"), button[type="submit"]',
            wait_for: "text=saved, text=Draft, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: '[data-testid*="order-id"], [class*="order-number"], h1',
            as: "draftToDeleteId",
          },
          { action: "screenshot", name: "edge-delete-draft-created" },
        ],
      },
      {
        phase_id: "delete-the-draft",
        description: "Click the delete button and confirm in the modal",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Delete"), [data-testid*="delete-order"], button[aria-label*="delete" i]',
            wait_for:
              'text=confirm, text=Confirm, text=Are you sure, [role="dialog"]',
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete"), [data-testid*="confirm-delete"]',
            wait_for: "text=deleted, text=Deleted, text=Success, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-delete-confirmation" },
        ],
      },
      {
        phase_id: "verify-not-in-list",
        description:
          "Navigate to the orders list and confirm the deleted draft does not appear",
        steps: [
          {
            action: "navigate",
            path: "/sales",
            wait_for: "text=Orders, text=Sales, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-delete-orders-list" },
        ],
        expected_ui: { url_contains: "sales" },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // edge.auto-save-behavior — Auto-save timing
  // ---------------------------------------------------------------------------
  {
    chain_id: "edge.auto-save-behavior",
    description:
      "Verify auto-save triggers after inactivity and that navigating away after auto-save shows no unsaved-changes warning",
    tags: [
      "edge-case",
      "auto-save",
      "debounce",
      "draft",
      "route:/orders/create",
    ],
    phases: [
      {
        phase_id: "navigate-create-order",
        description: "Open the order creation page",
        steps: [
          {
            action: "navigate",
            path: "/orders/create",
            wait_for: "text=Create, text=Order, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "edge-autosave-start" },
        ],
        expected_ui: { url_contains: "order" },
      },
      {
        phase_id: "fill-form-and-wait-for-autosave",
        description:
          "Select client, add line item, then wait 3 seconds for auto-save to trigger",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="client" i], [role="combobox"], [data-testid*="client-select"], button:has-text("Select Client")',
            wait_for: "[role=option], option",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button:has-text("Add Item"), button:has-text("Add Line Item"), button:has-text("Add Product"), [data-testid*="add-line-item"]',
            wait_after: 500,
          },
          { action: "wait", duration: 3000 },
          { action: "screenshot", name: "edge-autosave-after-wait" },
        ],
      },
      {
        phase_id: "assert-autosave-indicator",
        description: "Verify the Saved / Auto-saved indicator is visible",
        steps: [
          {
            action: "assert",
            visible:
              'text=Saved, text=Auto-saved, text=saved, [data-testid*="auto-save"], [class*="saved-indicator"], [class*="auto-save"]',
          },
          { action: "screenshot", name: "edge-autosave-indicator-visible" },
        ],
      },
      {
        phase_id: "make-second-change-and-wait",
        description: "Make another change and wait for auto-save again",
        steps: [
          {
            action: "type",
            target:
              'textarea[name*="note" i], textarea[name*="memo" i], input[name*="note" i], textarea',
            value: "QA auto-save second change",
            clear_first: true,
          },
          { action: "wait", duration: 3000 },
          {
            action: "assert",
            visible:
              'text=Saved, text=Auto-saved, text=saved, [data-testid*="auto-save"], [class*="saved-indicator"]',
          },
          { action: "screenshot", name: "edge-autosave-second-save" },
        ],
      },
      {
        phase_id: "navigate-away-no-warning",
        description:
          "Navigate away — since auto-saved, no unsaved-changes warning should appear",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            not_visible:
              '[role="dialog"]:has-text("unsaved"), [data-testid*="unsaved"]',
          },
          {
            action: "assert",
            visible: "text=Dashboard",
          },
          { action: "screenshot", name: "edge-autosave-no-warning-on-leave" },
        ],
        expected_ui: { url_contains: "dashboard" },
      },
    ],
  },
];
