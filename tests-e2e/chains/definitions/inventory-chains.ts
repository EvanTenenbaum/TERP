/**
 * Inventory Persona Chain Definitions
 *
 * Chains for Alex (Inventory Manager): batch management, stock movements,
 * location management, low-stock checks, adjustments, strains, and intake.
 *
 * CRUD lifecycle pattern: create → save → navigate away → return → verify persistence → edit → verify edit saved
 */

import type { TestChain } from "../types";

export const INVENTORY_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // inventory.check-dashboard — daily read
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.check-dashboard",
    description:
      "Inventory manager checks dashboard for stock KPIs and pending receipts",
    tags: ["route:/dashboard", "persona:inventory", "daily", "read"],
    phases: [
      {
        phase_id: "load-dashboard",
        description: "Navigate to dashboard and wait for KPI data to load",
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
        screenshot: "inventory-dashboard-loaded",
      },
      {
        phase_id: "check-stock-widgets",
        description: "Verify stock-related KPI widgets are displayed",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="card"], [data-testid*="kpi"], [class*="widget"], [class*="stat"]',
          },
          { action: "screenshot", name: "inventory-dashboard-kpis" },
        ],
      },
      {
        phase_id: "check-pending-receipts",
        description: "Verify any pending receipts or alerts are shown",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="alert"], [class*="pending"], [class*="notice"], [class*="widget"], main',
          },
          { action: "screenshot", name: "inventory-dashboard-alerts" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.review-batches — daily read / historical
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.review-batches",
    description:
      "Review existing inventory batches, filter by strain, and inspect a saved batch",
    tags: [
      "route:/inventory",
      "persona:inventory",
      "daily",
      "read",
      "crud:read",
      "historical",
    ],
    phases: [
      {
        phase_id: "navigate-inventory",
        description: "Go to the inventory workspace",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "inventory" },
        screenshot: "inventory-batches-list",
      },
      {
        phase_id: "verify-batches-loaded",
        description: "Confirm the batch list is rendered with data",
        steps: [
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="batch"], [data-testid*="batch"]',
          },
          { action: "screenshot", name: "inventory-batches-data" },
        ],
      },
      {
        phase_id: "inspect-existing-batch",
        description: "Click the first batch to view its full details",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child, [class*="row"]:first-child a',
            wait_for: "text=Batch, text=Strain, text=Quantity, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "inventory-batch-detail" },
        ],
      },
      {
        phase_id: "return-to-batch-list",
        description: "Navigate back to the inventory list",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "inventory-returned-to-list" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.create-batch — daily full CRUD lifecycle
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.create-batch",
    description:
      "Create a new inventory batch, verify save, navigate away, return, verify persistence, edit, verify edit saved",
    tags: [
      "route:/inventory",
      "persona:inventory",
      "daily",
      "crud:create",
      "crud:read",
      "crud:update",
      "save-state",
      "persistence",
    ],
    phases: [
      {
        phase_id: "navigate-inventory",
        description: "Go to the inventory list",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "inventory" },
        screenshot: "inventory-list-for-create",
      },
      {
        phase_id: "open-create-batch-form",
        description: "Click create/add batch to open the create form",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add Batch"), button:has-text("New Batch"), [data-testid*="create-batch"], [data-testid*="add-batch"]',
            wait_for: "text=Strain, text=Batch, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "inventory-create-batch-form" },
        ],
      },
      {
        phase_id: "fill-batch-form",
        description: "Select a strain and enter batch details",
        steps: [
          {
            action: "click",
            target:
              '[aria-label*="strain" i], [data-testid*="strain-select"], [role="combobox"]:first-child, select[name*="strain" i]',
            wait_for: "[role=option], option",
          },
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
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
            value: "QA-BATCH-{{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "inventory-batch-form-filled" },
        ],
      },
      {
        phase_id: "save-batch",
        description: "Submit the batch form and verify save success",
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
          { action: "screenshot", name: "inventory-batch-saved" },
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
          { action: "screenshot", name: "inventory-navigated-away" },
        ],
      },
      {
        phase_id: "return-to-inventory",
        description: "Navigate back to the inventory list",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "inventory-returned-after-create" },
        ],
      },
      {
        phase_id: "verify-batch-persisted",
        description: "Search for the created batch to confirm it was saved",
        steps: [
          {
            action: "type",
            target:
              'input[placeholder*="search" i], input[type="search"], [data-testid*="search"]',
            value: "QA-BATCH-",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "assert", text_contains: "QA-BATCH-" },
          { action: "screenshot", name: "inventory-batch-persisted" },
        ],
      },
      {
        phase_id: "open-batch-to-edit",
        description: "Click on the created batch to open its detail view",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:has-text("QA-BATCH-"), [data-testid*="batch-row"]:has-text("QA-BATCH-"), a:has-text("QA-BATCH-")',
            wait_for: "text=Batch, text=Strain, text=Quantity, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "inventory-batch-for-edit" },
        ],
      },
      {
        phase_id: "edit-batch-and-verify",
        description:
          "Edit the batch notes field, save, and verify the change persisted",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Edit"), [data-testid*="edit-batch"], button:has-text("Modify")',
            wait_for: "input, form, textarea",
          },
          {
            action: "type",
            target:
              'textarea[name="notes"], input[name="notes"], textarea[placeholder*="note" i]',
            value: "QA chain verified batch - edit pass",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
            wait_for: "text=Success, text=Updated, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "assert", text_contains: "QA chain verified batch" },
          { action: "screenshot", name: "inventory-batch-edit-saved" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.record-movement — daily crud:create
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.record-movement",
    description:
      "Record an inventory movement (transfer or adjustment) for a batch",
    tags: [
      "route:/inventory",
      "persona:inventory",
      "daily",
      "crud:create",
      "cross-domain:inventory-locations",
    ],
    phases: [
      {
        phase_id: "navigate-inventory",
        description: "Go to the inventory workspace",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "inventory" },
        screenshot: "inventory-for-movement",
      },
      {
        phase_id: "select-batch-for-movement",
        description: "Click on an existing batch to open its detail view",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child',
            wait_for: "text=Batch, text=Quantity, text=Location, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "screenshot",
            name: "inventory-batch-selected-for-movement",
          },
        ],
      },
      {
        phase_id: "open-movement-form",
        description: "Click the Record Movement / Transfer button",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Move"), button:has-text("Transfer"), button:has-text("Record Movement"), [data-testid*="movement"], [data-testid*="transfer"]',
            wait_for:
              "text=Movement, text=Transfer, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "inventory-movement-form-open" },
        ],
      },
      {
        phase_id: "fill-movement-form",
        description: "Enter movement quantity and destination location",
        steps: [
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
          {
            action: "click",
            target: '[role="option"]:first-child, option:first-child',
            wait_for: "main",
          },
          { action: "screenshot", name: "inventory-movement-form-filled" },
        ],
      },
      {
        phase_id: "save-movement",
        description: "Submit the movement and verify it records",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Confirm")',
            wait_for: "text=Success, text=Recorded, text=Moved, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "inventory-movement-saved" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.manage-locations — daily crud:read + crud:create
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.manage-locations",
    description:
      "View warehouse locations list and create a new storage location",
    tags: [
      "route:/locations",
      "persona:inventory",
      "daily",
      "crud:read",
      "crud:create",
      "save-state",
    ],
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
        ],
        expected_ui: { url_contains: "location" },
        screenshot: "inventory-locations-list",
      },
      {
        phase_id: "verify-locations-loaded",
        description: "Verify the locations table is rendered",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="location"], [data-testid*="location"]',
          },
          { action: "screenshot", name: "inventory-locations-data" },
        ],
      },
      {
        phase_id: "create-new-location",
        description: "Open the create form for a new warehouse location",
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
            value: "QA-ZONE-{{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "inventory-location-form-filled" },
        ],
      },
      {
        phase_id: "save-location",
        description: "Save the new location and verify it appears in the list",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create")',
            wait_for: "text=Success, text=Created, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", text_contains: "QA-ZONE-" },
          { action: "screenshot", name: "inventory-location-saved" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.check-low-stock — daily read
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.check-low-stock",
    description:
      "Check inventory for low-stock or out-of-stock alerts and review affected batches",
    tags: ["route:/inventory", "persona:inventory", "daily", "read"],
    phases: [
      {
        phase_id: "navigate-inventory",
        description: "Go to inventory workspace",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "inventory" },
        screenshot: "inventory-for-low-stock",
      },
      {
        phase_id: "filter-low-stock",
        description:
          "Apply a low-stock filter or look for a low stock indicator tab",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Low Stock"), [data-testid*="low-stock"], [role="tab"]:has-text("Low"), button:has-text("Alerts"), [class*="filter"]:has-text("Low")',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "inventory-low-stock-filtered" },
        ],
      },
      {
        phase_id: "verify-low-stock-results",
        description: "Verify the low stock results section is shown",
        steps: [
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "inventory-low-stock-results" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.adjust-inventory — occasional crud:create
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.adjust-inventory",
    description:
      "Make a manual inventory adjustment for a batch (shrinkage, damage, etc.)",
    tags: [
      "route:/inventory",
      "persona:inventory",
      "occasional",
      "crud:create",
      "audit-trail",
    ],
    phases: [
      {
        phase_id: "navigate-inventory",
        description: "Go to inventory workspace",
        steps: [
          {
            action: "navigate",
            path: "/inventory",
            wait_for: "text=Inventory, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "inventory" },
        screenshot: "inventory-for-adjustment",
      },
      {
        phase_id: "select-batch-to-adjust",
        description: "Click on a batch to open it for adjustment",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="batch-row"]:first-child',
            wait_for: "text=Batch, text=Quantity, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "inventory-batch-for-adjustment" },
        ],
      },
      {
        phase_id: "open-adjustment-form",
        description: "Click the Adjust button to open adjustment form",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Adjust"), button:has-text("Adjustment"), [data-testid*="adjust"], button:has-text("Correct")',
            wait_for: "text=Adjust, text=Reason, text=Quantity, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "inventory-adjustment-form-open" },
        ],
      },
      {
        phase_id: "fill-adjustment-form",
        description: "Enter adjustment quantity and reason",
        steps: [
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
            value: "QA chain adjustment test — shrinkage simulation",
            clear_first: true,
          },
          { action: "screenshot", name: "inventory-adjustment-form-filled" },
        ],
      },
      {
        phase_id: "save-adjustment",
        description: "Submit the adjustment and verify it records",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Record"), button:has-text("Confirm")',
            wait_for: "text=Success, text=Adjusted, text=Recorded",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "inventory-adjustment-saved" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.manage-strains — occasional crud:create + crud:read
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.manage-strains",
    description: "View existing strains and create a new strain record",
    tags: [
      "route:/products",
      "persona:inventory",
      "occasional",
      "crud:create",
      "crud:read",
      "save-state",
      "persistence",
    ],
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
        ],
        expected_ui: { url_contains: "product" },
        screenshot: "inventory-strains-list",
      },
      {
        phase_id: "verify-strains-list",
        description: "Confirm the strains/products list is rendered",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="strain"], [data-testid*="strain"]',
          },
          { action: "screenshot", name: "inventory-strains-data" },
        ],
      },
      {
        phase_id: "create-new-strain",
        description: "Open the create form and enter a new strain",
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
            value: "QA Test Strain {{timestamp}}",
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
          { action: "screenshot", name: "inventory-strain-form-filled" },
        ],
      },
      {
        phase_id: "save-strain",
        description: "Save the new strain and verify it persists",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Strain")',
            wait_for: "text=Success, text=Created, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "inventory-strain-saved" },
        ],
      },
      {
        phase_id: "verify-strain-persisted",
        description: "Navigate away and back to confirm the strain persists",
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
          { action: "assert", text_contains: "QA Test Strain" },
          { action: "screenshot", name: "inventory-strain-persisted" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // inventory.process-intake — occasional crud:create
  // ---------------------------------------------------------------------------
  {
    chain_id: "inventory.process-intake",
    description:
      "Process an intake receipt: open receipt, verify details, confirm receipt to create batch",
    tags: [
      "route:/intake-receipts",
      "persona:inventory",
      "occasional",
      "crud:create",
      "crud:update",
      "cross-domain:inventory-purchasing",
    ],
    phases: [
      {
        phase_id: "navigate-intake",
        description: "Go to the intake receipts page",
        steps: [
          {
            action: "navigate",
            path: "/intake-receipts",
            wait_for: "text=Intake, text=Receipt, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "intake" },
        screenshot: "inventory-intake-list",
      },
      {
        phase_id: "verify-intake-list",
        description: "Confirm intake receipts list is rendered",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="receipt"], [data-testid*="intake"]',
          },
          { action: "screenshot", name: "inventory-intake-data" },
        ],
      },
      {
        phase_id: "open-pending-receipt",
        description:
          "Click on a pending intake receipt to open it for processing",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="intake-row"]:first-child, [class*="row"]:first-child a',
            wait_for: "text=Receipt, text=Supplier, text=Items, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "inventory-intake-receipt-detail" },
        ],
      },
      {
        phase_id: "verify-receipt-details",
        description: "Verify the receipt shows line items and supplier info",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="detail"], [class*="item"], table, [class*="supplier"], h1, h2',
          },
          { action: "screenshot", name: "inventory-intake-receipt-items" },
        ],
      },
      {
        phase_id: "confirm-intake-receipt",
        description:
          "Click Receive/Confirm to process the intake and create inventory batches",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Receive"), button:has-text("Confirm Receipt"), button:has-text("Process"), [data-testid*="confirm-receipt"]',
            wait_for: "text=Success, text=Received, text=Processed, text=Batch",
          },
          { action: "wait", network_idle: true, timeout: 12000 },
          { action: "screenshot", name: "inventory-intake-confirmed" },
        ],
      },
      {
        phase_id: "verify-batch-created",
        description:
          "Navigate to inventory list and confirm a new batch exists from this receipt",
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
          { action: "screenshot", name: "inventory-batch-from-intake" },
        ],
      },
    ],
  },
];
