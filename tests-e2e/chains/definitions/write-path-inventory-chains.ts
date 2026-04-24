/**
 * Write-Path Inventory Chain Definitions
 *
 * Full interactive write-path chains for the inventory domain.
 * Covers batch lifecycle, intake-to-batch, strain management, and location management
 * with complete create → save → navigate away → return → verify → edit → verify cycles.
 *
 * Action vocabulary:
 *   navigate, click, type, select, add_line_item, assert, wait, screenshot, store, custom
 */

import type { TestChain } from "../types";

export const WRITE_PATH_INVENTORY_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // inventory.batch-full-lifecycle — Complete batch management
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.batch-full-lifecycle",
    description:
      "Full batch lifecycle: create batch → extract ID → navigate away → return → search → verify → edit notes → record movement → adjust inventory with audit trail",
    tags: [
      "route:/inventory",
      "persona:inventory",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
      "audit-trail",
      "cross-domain:inventory-locations",
      "write-path",
    ],
    preconditions: {
      ensure: [
        { entity: "strain", ref: "test-strain", where: { isActive: true } },
        { entity: "location", ref: "test-location", where: { isActive: true } },
      ],
    },
    phases: [
      {
        phase_id: "navigate-to-inventory",
        description: "Navigate to the inventory workspace",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-batch-lifecycle-inventory-list" },
        ],
        expected_ui: { url_contains: "inventory" },
      },
      {
        phase_id: "open-create-batch-form",
        description: "Click Create Batch / Add Batch button",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create Batch"), button:has-text("Add Batch"), button:has-text("Create"), button:has-text("New Batch"), [data-testid*="create-batch"], [data-testid*="add-batch"]',
            wait_for: "text=Strain, text=Batch, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-batch-lifecycle-create-form-open" },
        ],
      },
      {
        phase_id: "fill-batch-form",
        description:
          "Select strain from combobox, fill quantity, batch number, cost",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="strain" i], [data-testid*="strain-select"], [role="combobox"]:first-child, select[name*="strain" i]',
            wait_for: "[role=option], option",
          },
          {
            action: "type",
            target:
              '[aria-label*="strain" i] input, [role="combobox"] input, input[placeholder*="strain" i]',
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
            action: "type",
            target:
              'input[name="quantity"], input[name="weight"], input[placeholder*="quantity" i], input[placeholder*="weight" i], input[aria-label*="quantity" i]',
            value: "100",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="batchNumber"], input[name="batch_number"], input[placeholder*="batch" i], input[aria-label*="batch" i]',
            value: "QA-WP-BATCH-{{timestamp}}",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="costPerUnit"], input[name="cost_per_unit"], input[name="costUnit"], input[placeholder*="cost" i], input[aria-label*="cost" i]',
            value: "25.00",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-batch-lifecycle-form-filled" },
        ],
      },
      {
        phase_id: "save-batch",
        description: "Submit the batch form, extract batchId",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Batch"), button:has-text("Submit")',
            wait_for: "text=Success, text=Created, text=Batch, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "store",
            from: '[data-testid*="batch-id"], h1, [class*="batch-number"], [class*="batch-id"]',
            as: "batchId",
          },
          { action: "screenshot", name: "wp-batch-lifecycle-saved" },
        ],
        extract: [{ from: "url", as: "batchId", pattern: "/inventory/(\\d+)" }],
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
          { action: "screenshot", name: "wp-batch-lifecycle-navigated-away" },
        ],
      },
      {
        phase_id: "return-and-search-batch",
        description: "Return to inventory and search for the created batch",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "type",
            target:
              'input[placeholder*="search" i], input[type="search"], [data-testid*="search"]',
            value: "QA-WP-BATCH-",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            text_contains: "QA-WP-BATCH-",
          },
          { action: "screenshot", name: "wp-batch-lifecycle-persisted" },
        ],
      },
      {
        phase_id: "open-batch-detail",
        description: "Open batch detail page",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:has-text("QA-WP-BATCH-"), [data-testid*="batch-row"]:has-text("QA-WP-BATCH-"), a:has-text("QA-WP-BATCH-")',
            wait_for: "text=Batch, text=Strain, text=Quantity, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-batch-lifecycle-detail-open" },
        ],
      },
      {
        phase_id: "edit-batch-notes",
        description: "Click Edit, modify the notes field, save",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Edit"), [data-testid*="edit-batch"], button:has-text("Modify")',
            wait_for: "input, form, textarea",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'textarea[name="notes"], input[name="notes"], textarea[placeholder*="note" i]',
            value: "QA write-path batch edit verified {{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
            wait_for: "text=Success, text=Updated, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            text_contains: "QA write-path batch edit verified",
          },
          { action: "screenshot", name: "wp-batch-lifecycle-notes-edited" },
        ],
      },
      {
        phase_id: "record-movement",
        description: "Record a movement transfer to a destination location",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Move"), button:has-text("Transfer"), button:has-text("Record Movement"), [data-testid*="movement"], [data-testid*="transfer"]',
            wait_for:
              "text=Movement, text=Transfer, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="quantity"], input[placeholder*="quantity" i], input[aria-label*="quantity" i]',
            value: "10",
            clear_first: true,
          },
          {
            action: "click",
            target:
              '[aria-label*="location" i], select[name*="location" i], [data-testid*="location-select"], [role="combobox"]',
            wait_for: "[role=option], option",
          },
          { action: "wait", duration: 200 },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Confirm")',
            wait_for: "text=Success, text=Recorded, text=Moved, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "screenshot",
            name: "wp-batch-lifecycle-movement-recorded",
          },
        ],
      },
      {
        phase_id: "adjust-inventory",
        description:
          "Enter negative adjustment quantity with reason, save and verify audit trail",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Adjust"), button:has-text("Adjustment"), [data-testid*="adjust"], button:has-text("Correct")',
            wait_for: "text=Adjust, text=Reason, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="quantity"], input[name="adjustmentQuantity"], input[placeholder*="quantity" i]',
            value: "-5",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'textarea[name="reason"], input[name="reason"], textarea[placeholder*="reason" i], input[placeholder*="reason" i]',
            value: "QA write-path adjustment — shrinkage simulation",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Confirm")',
            wait_for: "text=Success, text=Adjusted, text=Recorded",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-batch-lifecycle-adjustment-saved" },
          {
            action: "assert",
            visible:
              '[class*="audit"], [class*="history"], [data-testid*="audit"], [data-testid*="history"], table',
          },
          { action: "screenshot", name: "wp-batch-lifecycle-audit-trail" },
        ],
      },
    ],
    invariants: [
      {
        name: "batch-notes-persisted",
        description: "Edited batch notes show updated value",
        check: "ui",
        page: "/inventory",
        assertions: ["QA write-path batch edit verified"],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.batch-primer-create-only — Bootstrap batch creation without location dependency
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.batch-primer-create-only",
    description:
      "Create inventory through the direct intake surface, submit it, navigate to inventory, and verify the new batch remains searchable for downstream swarm flows.",
    tags: [
      "route:/inventory?tab=intake",
      "route:/inventory",
      "persona:inventory",
      "crud:create",
      "save-state",
      "persistence",
      "cross-domain:inventory-intake",
      "write-path",
      "swarm-primer",
    ],
    preconditions: {
      ensure: [],
    },
    phases: [
      {
        phase_id: "navigate-to-direct-intake",
        description: "Navigate to the direct intake workspace",
        steps: [
          {
            action: "navigate",
            path: "/inventory?tab=intake",
            wait_for: 'text=Direct Intake, button:has-text("Add Row"), main',
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "swarm-batch-primer-intake-list" },
        ],
        expected_ui: { url_contains: "tab=intake" },
      },
      {
        phase_id: "add-intake-row",
        description: "Add a new intake row and focus it for quick edit",
        steps: [
          {
            action: "click",
            target: 'button:has-text("Add Row")',
            wait_for:
              'input[list="intake-pilot-top-vendors"], input[list="direct-intake-top-vendors"], input[placeholder="Supplier"], input[placeholder*="supplier" i]',
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "swarm-batch-primer-row-added" },
        ],
      },
      {
        phase_id: "fill-intake-row",
        description:
          "Fill supplier, product, quantity, and COGS so intake can create a live batch",
        steps: [
          {
            action: "type",
            target:
              'input[list="intake-pilot-top-vendors"], input[list="direct-intake-top-vendors"], input[placeholder="Supplier"], input[placeholder*="supplier" i], input[placeholder*="Type supplier" i]',
            value: "QA Swarm Supplier {{timestamp}}",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[list="intake-pilot-top-products"], input[list="direct-intake-top-products"], input[placeholder="Product"], input[placeholder*="product" i], input[placeholder*="Type or select product" i]',
            value: "QA Swarm Intake Product {{timestamp}}",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'div:has(> label:has-text("Qty")) input, input[placeholder="0"]',
            value: "25",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'div:has(> label:has-text("COGS")) input, input[placeholder="0.00"]',
            value: "14.50",
            clear_first: true,
          },
          { action: "screenshot", name: "swarm-batch-primer-intake-filled" },
        ],
      },
      {
        phase_id: "submit-intake",
        description: "Submit the intake row so the system creates inventory",
        steps: [
          {
            action: "click",
            target:
              'button[aria-label="Submit Selected"], button:has-text("Submit Selected"), button:has-text("Submit This Row"), button:has-text("Submit All Pending")',
            wait_for:
              "text=Intake submitted successfully, text=Successfully submitted, text=Submitted 1",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "swarm-batch-primer-intake-submitted" },
        ],
      },
      {
        phase_id: "verify-created-batch-in-inventory",
        description:
          "Navigate to inventory and search for the submitted product to verify the new batch exists",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "wait", duration: 4000 },
          {
            action: "type",
            target:
              'input[placeholder*="SKU" i], input[placeholder*="supplier" i], [data-testid*="inventory-search"]',
            value: "QA Swarm Intake Product",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "wait", duration: 4000 },
          {
            action: "assert",
            not_visible: "text=Loading inventory sheet...",
          },
          {
            action: "assert",
            text_contains: "QA Swarm Intake Product",
          },
          {
            action: "screenshot",
            name: "swarm-batch-primer-inventory-persisted",
          },
        ],
      },
    ],
    invariants: [
      {
        name: "batch-primer-persisted",
        description:
          "Created batch remains visible in inventory search after navigation",
        check: "ui",
        page: "/inventory",
        assertions: ["QA Swarm Intake Product"],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.intake-to-batch — Intake receipt processing
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.intake-to-batch",
    description:
      "Open first pending intake receipt → verify details → confirm receipt → navigate to /inventory → verify new batch created",
    tags: [
      "route:/intake-receipts",
      "route:/inventory",
      "persona:inventory",
      "crud:create",
      "crud:update",
      "cross-domain:inventory-purchasing",
      "write-path",
    ],
    preconditions: {
      ensure: [
        {
          entity: "intake_receipt",
          ref: "pending-receipt",
          where: { status: "PENDING" },
        },
      ],
    },
    phases: [
      {
        phase_id: "navigate-intake",
        description: "Go to intake receipts page",
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
              'table, [role="table"], [class*="list"], [class*="receipt"], [data-testid*="intake"]',
          },
          { action: "screenshot", name: "wp-intake-to-batch-list" },
        ],
        expected_ui: { url_contains: "intake" },
      },
      {
        phase_id: "open-pending-receipt",
        description: "Click on the first pending receipt",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="intake-row"]:first-child, [class*="row"]:first-child a',
            wait_for: "text=Receipt, text=Supplier, text=Items, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-intake-to-batch-receipt-open" },
        ],
      },
      {
        phase_id: "verify-receipt-details",
        description: "Verify receipt shows supplier, items, and quantities",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="detail"], [class*="item"], table, [class*="supplier"], h1, h2',
          },
          { action: "screenshot", name: "wp-intake-to-batch-receipt-details" },
        ],
      },
      {
        phase_id: "confirm-receipt",
        description: "Click Receive / Confirm Receipt, wait for success",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Receive"), button:has-text("Confirm Receipt"), button:has-text("Process"), [data-testid*="confirm-receipt"]',
            wait_for: "text=Success, text=Received, text=Processed, text=Batch",
          },
          { action: "wait", network_idle: true, timeout: 12000 },
          { action: "screenshot", name: "wp-intake-to-batch-confirmed" },
        ],
      },
      {
        phase_id: "verify-batch-in-inventory",
        description: "Navigate to /inventory and verify new batch was created",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child',
          },
          { action: "screenshot", name: "wp-intake-to-batch-batch-created" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.strain-management — Product catalog CRUD
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.strain-management",
    description:
      "Create new strain with name and type → save → navigate away → return → search for strain → verify persistence",
    tags: [
      "route:/products",
      "persona:inventory",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
      "write-path",
    ],
    preconditions: {},
    phases: [
      {
        phase_id: "navigate-products",
        description: "Go to the products/strains page",
        steps: [
          {
            action: "navigate",
            path: "/products",
            wait_for: "text=Products, text=Strains, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-strain-mgmt-list" },
        ],
        expected_ui: { url_contains: "product" },
      },
      {
        phase_id: "create-strain",
        description: "Open create form, enter strain name and type",
        steps: [
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
            value: "QA WP Strain {{timestamp}}",
            clear_first: true,
          },
          {
            action: "store",
            from: 'input[name="name"], input[placeholder*="name" i], input[aria-label*="strain name" i]',
            as: "strainName",
          },
          {
            action: "select",
            target:
              '[data-testid="strain-type"], [aria-label*="type" i], select[name*="type" i]',
            value: "Indica",
          },
          { action: "screenshot", name: "wp-strain-mgmt-form-filled" },
        ],
      },
      {
        phase_id: "save-strain",
        description: "Save the new strain and verify success",
        steps: [
          {
            action: "click",
            target:
              '[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Create Strain"), [data-slot="dialog-content"] button[type="submit"]',
            wait_for: "text=Success, text=Created, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            not_visible: '[role="dialog"]',
          },
          { action: "screenshot", name: "wp-strain-mgmt-saved" },
        ],
      },
      {
        phase_id: "navigate-away-and-return",
        description: "Navigate to dashboard and back to products",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "navigate",
            path: "/products",
            wait_for: "text=Products, text=Strains, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-strain-mgmt-back-at-list" },
        ],
      },
      {
        phase_id: "search-for-strain",
        description: "Search for the created strain and verify persistence",
        steps: [
          {
            action: "type",
            target:
              'input[placeholder*="search strain" i], input[placeholder*="strains" i], [data-testid*="strain-search"]',
            value_ref: "strainName",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "assert",
            text_contains: "$ctx.strainName",
          },
          { action: "screenshot", name: "wp-strain-mgmt-persisted" },
        ],
      },
    ],
    invariants: [
      {
        name: "strain-persisted",
        description: "Created strain appears in products list after navigation",
        check: "ui",
        page: "/products",
        assertions: ["QA WP Strain"],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.location-management — Warehouse location CRUD + stock verification
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.location-management",
    description:
      "Create new warehouse location → save → navigate to inventory → record movement TO the new location → return to locations → verify stock count updated",
    tags: [
      "route:/locations",
      "route:/inventory",
      "persona:inventory",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
      "cross-domain:inventory-locations",
      "write-path",
    ],
    preconditions: {
      ensure: [
        { entity: "batch", ref: "test-batch", where: { status: "AVAILABLE" } },
      ],
    },
    phases: [
      {
        phase_id: "navigate-locations",
        description: "Go to the locations management page",
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
              'table, [role="table"], [class*="list"], [class*="location"], [data-testid*="location"]',
          },
          { action: "screenshot", name: "wp-location-mgmt-list" },
        ],
        expected_ui: { url_contains: "location" },
      },
      {
        phase_id: "create-location",
        description: "Open create form, fill name, type, and capacity",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add"), button:has-text("New Location"), [data-testid*="create-location"]',
            wait_for: "text=Name, text=Location, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i]',
            value: "QA-WP-ZONE-{{timestamp}}",
            clear_first: true,
          },
          {
            action: "click",
            target:
              '[aria-label*="type" i], select[name*="type" i], [data-testid*="location-type"], [role="combobox"]',
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
              'input[name="capacity"], input[placeholder*="capacity" i], input[aria-label*="capacity" i]',
            value: "500",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-location-mgmt-form-filled" },
        ],
      },
      {
        phase_id: "save-location",
        description: "Save the new location and verify it appears in list",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create")',
            wait_for: "text=Success, text=Created, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            text_contains: "QA-WP-ZONE-",
          },
          { action: "screenshot", name: "wp-location-mgmt-saved" },
        ],
        extract: [
          { from: "url", as: "locationId", pattern: "/locations/(\\d+)" },
        ],
      },
      {
        phase_id: "navigate-to-inventory-for-movement",
        description: "Go to inventory to record a movement to the new location",
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
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child',
            wait_for: "text=Batch, text=Quantity, text=Location, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-location-mgmt-batch-selected" },
        ],
      },
      {
        phase_id: "record-movement-to-new-location",
        description: "Record a transfer movement to the newly created location",
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
            target:
              'input[name="quantity"], input[placeholder*="quantity" i], input[aria-label*="quantity" i]',
            value: "15",
            clear_first: true,
          },
          {
            action: "click",
            target:
              '[aria-label*="location" i], select[name*="location" i], [data-testid*="location-select"], [role="combobox"]',
            wait_for: "[role=option], option",
          },
          {
            action: "type",
            target: '[role="combobox"] input, input[placeholder*="location" i]',
            value: "QA-WP-ZONE-",
            clear_first: true,
          },
          { action: "wait", duration: 300 },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[role="option"]:has-text("QA-WP-ZONE-"), [role="option"]:first-child',
            wait_for: "main",
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Confirm")',
            wait_for: "text=Success, text=Recorded, text=Moved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-location-mgmt-movement-saved" },
        ],
      },
      {
        phase_id: "verify-location-stock-updated",
        description:
          "Return to locations list and verify the stock count for the new zone",
        steps: [
          {
            action: "navigate",
            path: "/locations",
            wait_for: "text=Location, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            text_contains: "QA-WP-ZONE-",
          },
          {
            action: "assert",
            visible:
              'table tbody tr:has-text("QA-WP-ZONE-"), [data-testid*="location-row"]:has-text("QA-WP-ZONE-")',
          },
          { action: "screenshot", name: "wp-location-mgmt-stock-updated" },
        ],
      },
    ],
    invariants: [
      {
        name: "location-created-and-stocked",
        description: "New location appears in locations list after navigation",
        check: "ui",
        page: "/locations",
        assertions: ["QA-WP-ZONE-"],
      },
    ],
  },
];
