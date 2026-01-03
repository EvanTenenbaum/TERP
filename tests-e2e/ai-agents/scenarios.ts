/**
 * Pre-defined QA Scenarios
 *
 * Common testing scenarios that can be run by the AI agent.
 */

import type { QAScenario } from "./types";

export const SCENARIOS: Record<string, QAScenario> = {
  dashboardExplore: {
    name: "Dashboard Exploration",
    description:
      "Explore the dashboard, verify KPIs load, and test widget interactions",
    config: {
      task: `Explore the TERP dashboard and verify:
1. All KPI widgets load with data (no "N/A" or loading spinners stuck)
2. Charts render correctly
3. Navigation sidebar works
4. Quick action buttons are clickable
5. Recent activity shows data
Report any visual bugs or broken functionality.`,
      startUrl: "/",
      maxSteps: 15,
      requiresAuth: true,
      authRole: "admin",
    },
  },

  clientsCRUD: {
    name: "Clients CRUD Operations",
    description: "Test create, read, update operations on client records",
    config: {
      task: `Test the Clients module:
1. Navigate to Clients page
2. View the client list - verify table loads with data
3. Click on a client to view details
4. Test the search/filter functionality
5. Try to add a new client (fill form, submit)
6. Verify success message appears
Report any form validation issues or data display bugs.`,
      startUrl: "/clients",
      maxSteps: 20,
      requiresAuth: true,
      authRole: "admin",
    },
  },

  inventoryExplore: {
    name: "Inventory Exploration",
    description: "Explore inventory management features",
    config: {
      task: `Explore the Inventory module:
1. Navigate to Inventory/Batches page
2. Verify batch list displays correctly
3. Check filters and search work
4. View a batch detail page
5. Check inventory counts display
6. Look for any data inconsistencies
Report visual bugs, missing data, or broken interactions.`,
      startUrl: "/inventory",
      maxSteps: 15,
      requiresAuth: true,
      authRole: "admin",
    },
  },

  orderWorkflow: {
    name: "Order Creation Workflow",
    description: "Test the order creation process end-to-end",
    config: {
      task: `Test the Order creation workflow:
1. Navigate to Orders page
2. Click "New Order" or similar
3. Select a client from the dropdown
4. Add items to the order
5. Verify totals calculate correctly
6. Submit the order
7. Verify success and order appears in list
Report any workflow blockers or calculation errors.`,
      startUrl: "/orders",
      maxSteps: 25,
      requiresAuth: true,
      authRole: "admin",
      failFast: true,
    },
  },

  accountingOverview: {
    name: "Accounting Module Overview",
    description: "Verify accounting features and data display",
    config: {
      task: `Explore the Accounting module:
1. Navigate to Accounting section
2. Check chart of accounts displays
3. View ledger entries
4. Check invoice list loads
5. View an invoice detail
6. Verify amounts format correctly (currency)
7. Check for any calculation discrepancies
Report any financial display issues.`,
      startUrl: "/accounting",
      maxSteps: 18,
      requiresAuth: true,
      authRole: "admin",
    },
  },

  navigationSmokeTest: {
    name: "Navigation Smoke Test",
    description: "Visit all major pages and check they load without errors",
    config: {
      task: `Perform a navigation smoke test:
1. From dashboard, click each main navigation item
2. Wait for each page to fully load
3. Check no error messages appear
4. Check no infinite loading spinners
5. Verify page titles are correct
6. Check sidebar remains visible
Test at least 6-8 different pages/routes.
Report any pages that fail to load or show errors.`,
      startUrl: "/",
      maxSteps: 20,
      requiresAuth: true,
      authRole: "admin",
    },
  },

  vipPortal: {
    name: "VIP Portal Testing",
    description: "Test the VIP client portal experience",
    config: {
      task: `Test the VIP Client Portal:
1. Login to VIP portal
2. Check dashboard loads
3. Verify client-specific data displays
4. Test catalog browsing
5. Check order history if available
6. Verify PII is properly masked where appropriate
Report any access control issues or data display bugs.`,
      startUrl: "/vip-portal/login",
      maxSteps: 15,
      requiresAuth: true,
      authRole: "vipClient",
    },
  },

  formValidation: {
    name: "Form Validation Testing",
    description: "Test form validation across different forms",
    config: {
      task: `Test form validation:
1. Find a form (client, order, or quote creation)
2. Try submitting with empty required fields
3. Verify error messages appear
4. Enter invalid data (bad email, negative numbers)
5. Verify validation catches errors
6. Fill valid data and submit successfully
Report any missing or incorrect validation.`,
      startUrl: "/",
      maxSteps: 20,
      requiresAuth: true,
      authRole: "admin",
    },
  },
};

/**
 * Get a scenario by name
 */
export function getScenario(name: string): QAScenario {
  if (!(name in SCENARIOS)) {
    throw new Error(
      `Unknown scenario: ${name}. Available: ${Object.keys(SCENARIOS).join(", ")}`
    );
  }
  return SCENARIOS[name];
}

/**
 * Get all scenario names
 */
export function getScenarioNames(): string[] {
  return Object.keys(SCENARIOS);
}
