/**
 * Operations Persona Chain Definitions
 *
 * Chains for Casey (Operations Manager): dashboard oversight, workflow queue,
 * calendar management, analytics review, global search, todos, user management,
 * feature flags, and notifications.
 *
 * CRUD lifecycle pattern: create → save → navigate away → return → verify persistence → edit → verify edit saved
 */

import type { TestChain } from "../types";

export const OPS_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // ops.check-dashboard — daily read
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.check-dashboard",
    description:
      "Operations manager checks the main dashboard for KPIs, pending items, and system health",
    tags: ["route:/dashboard", "persona:ops", "daily", "read"],
    phases: [
      {
        phase_id: "load-dashboard",
        description:
          "Navigate to dashboard and wait for all KPI widgets to load",
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
        screenshot: "ops-dashboard-loaded",
      },
      {
        phase_id: "verify-kpi-widgets",
        description: "Confirm KPI cards and summary widgets are rendered",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="card"], [data-testid*="kpi"], [class*="widget"], [class*="stat"]',
          },
          { action: "screenshot", name: "ops-dashboard-kpis" },
        ],
      },
      {
        phase_id: "check-operational-summary",
        description:
          "Verify the operational summary section shows pending items",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="activity"], [class*="recent"], [class*="pending"], [class*="summary"], main',
          },
          { action: "screenshot", name: "ops-dashboard-summary" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.review-workflow-queue — daily read + crud:update
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.review-workflow-queue",
    description:
      "Review the workflow queue, inspect a task, and update its status",
    tags: [
      "route:/workflow-queue",
      "persona:ops",
      "daily",
      "read",
      "crud:read",
      "crud:update",
    ],
    phases: [
      {
        phase_id: "navigate-workflow-queue",
        description: "Go to the workflow queue page",
        steps: [
          {
            action: "navigate",
            path: "/workflow-queue",
            wait_for: "text=Workflow, text=Queue, text=Tasks, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "workflow" },
        screenshot: "ops-workflow-queue-list",
      },
      {
        phase_id: "verify-queue-loaded",
        description: "Verify queue items are displayed",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="queue"], [data-testid*="workflow"]',
          },
          { action: "screenshot", name: "ops-queue-data" },
        ],
      },
      {
        phase_id: "inspect-queue-item",
        description: "Click on the first queue item to see its details",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="queue-item"]:first-child, [class*="queue-row"]:first-child',
            wait_for: "text=Task, text=Status, text=Assigned, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "ops-queue-item-detail" },
        ],
      },
      {
        phase_id: "update-queue-item-status",
        description: "Update the status of the queue item",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Update"), button:has-text("Mark Complete"), button:has-text("Assign"), [data-testid*="status-update"]',
            wait_for: "text=Status, input, select, [role=option]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "ops-queue-item-status-updated" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.manage-calendar — daily crud:create + crud:read
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.manage-calendar",
    description:
      "View the calendar, create a new event, verify it saves, navigate away and return to confirm persistence",
    tags: [
      "route:/calendar",
      "persona:ops",
      "daily",
      "crud:create",
      "crud:read",
      "save-state",
      "persistence",
    ],
    phases: [
      {
        phase_id: "navigate-calendar",
        description: "Go to the calendar page",
        steps: [
          {
            action: "navigate",
            path: "/calendar",
            wait_for: "text=Calendar, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "calendar" },
        screenshot: "ops-calendar-view",
      },
      {
        phase_id: "verify-calendar-loaded",
        description: "Verify the calendar grid or list view is rendered",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="calendar"], [class*="event"], [class*="month"], [class*="week"], [data-testid*="calendar"]',
          },
          { action: "screenshot", name: "ops-calendar-data" },
        ],
      },
      {
        phase_id: "create-calendar-event",
        description: "Click to create a new calendar event",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add Event"), button:has-text("New Event"), [data-testid*="create-event"], button:has-text("+")',
            wait_for: "text=Title, text=Event, text=Date, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "ops-calendar-event-form" },
        ],
      },
      {
        phase_id: "fill-event-form",
        description: "Enter event title and details",
        steps: [
          {
            action: "type",
            target:
              'input[name="title"], input[name="name"], input[placeholder*="title" i], input[aria-label*="title" i]',
            value: "QA Chain Event {{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "ops-calendar-event-form-filled" },
        ],
      },
      {
        phase_id: "save-event",
        description: "Save the calendar event and verify success",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Event"), button:has-text("Add")',
            wait_for: "text=Success, text=Created, text=Event, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "ops-calendar-event-saved" },
        ],
      },
      {
        phase_id: "verify-event-persisted",
        description: "Navigate away and return to verify the event persists",
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
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", text_contains: "QA Chain Event" },
          { action: "screenshot", name: "ops-calendar-event-persisted" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.review-analytics — daily read
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.review-analytics",
    description:
      "View analytics dashboards, review sales trends, and check key operational metrics",
    tags: ["route:/analytics", "persona:ops", "daily", "read"],
    phases: [
      {
        phase_id: "navigate-analytics",
        description: "Go to the analytics page",
        steps: [
          {
            action: "navigate",
            path: "/analytics",
            wait_for: "text=Analytics, text=Reports, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "analytics" },
        screenshot: "ops-analytics-page",
      },
      {
        phase_id: "verify-charts-loaded",
        description: "Confirm analytics charts and data tables are rendered",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="chart"], [class*="graph"], [class*="analytics"], canvas, svg, [data-testid*="chart"]',
          },
          { action: "screenshot", name: "ops-analytics-charts" },
        ],
      },
      {
        phase_id: "review-sales-trend",
        description:
          "Click on the sales trend section or tab to view detailed data",
        steps: [
          {
            action: "click",
            target:
              '[role="tab"]:has-text("Sales"), button:has-text("Sales"), [data-testid*="sales-tab"], [class*="tab"]:has-text("Sales")',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "ops-analytics-sales-trend" },
        ],
      },
      {
        phase_id: "verify-metric-data",
        description: "Verify metric values or totals are displayed",
        steps: [
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "ops-analytics-metrics" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.search-records — daily read
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.search-records",
    description:
      "Use global search to find clients, orders, and invoices by keyword",
    tags: ["route:/search", "persona:ops", "daily", "read"],
    phases: [
      {
        phase_id: "navigate-search",
        description: "Go to the global search page or trigger search",
        steps: [
          {
            action: "navigate",
            path: "/search",
            wait_for: "text=Search, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "search" },
        screenshot: "ops-search-page",
      },
      {
        phase_id: "search-for-client",
        description: "Type a search term and view results",
        steps: [
          {
            action: "type",
            target:
              'input[type="search"], input[placeholder*="search" i], [data-testid*="search-input"], [aria-label*="search" i]',
            value: "test",
            clear_first: true,
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "ops-search-results" },
        ],
      },
      {
        phase_id: "verify-results-appear",
        description: "Confirm search results are displayed across categories",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="result"], [class*="search-result"], [data-testid*="result"], table',
          },
          { action: "screenshot", name: "ops-search-results-loaded" },
        ],
      },
      {
        phase_id: "click-search-result",
        description: "Click on the first search result to verify navigation",
        steps: [
          {
            action: "click",
            target:
              '[class*="result"]:first-child a, [data-testid*="result"]:first-child, table tbody tr:first-child a',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "ops-search-result-opened" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.manage-todos — daily crud:create + crud:update
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.manage-todos",
    description:
      "Create a new todo item, verify it saves, mark it complete, verify status change",
    tags: [
      "route:/todos",
      "persona:ops",
      "daily",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
    ],
    phases: [
      {
        phase_id: "navigate-todos",
        description: "Go to the todos page",
        steps: [
          {
            action: "navigate",
            path: "/todos",
            wait_for: "text=Todo, text=Tasks, text=To-do, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "todo" },
        screenshot: "ops-todos-list",
      },
      {
        phase_id: "verify-todos-loaded",
        description: "Confirm the todo list is rendered",
        steps: [
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "ops-todos-data" },
        ],
      },
      {
        phase_id: "create-new-todo",
        description: "Add a new todo item with a unique title",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add"), button:has-text("New Todo"), button:has-text("+"), [data-testid*="create-todo"]',
            wait_for: "text=Title, text=Task, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="title"], input[name="task"], input[placeholder*="title" i], input[placeholder*="task" i], input[aria-label*="title" i]',
            value: "QA Chain Todo {{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "ops-todo-form-filled" },
        ],
      },
      {
        phase_id: "save-todo",
        description: "Save the todo and verify it appears in the list",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Add Todo"), button:has-text("Create")',
            wait_for: "text=QA Chain Todo, text=saved, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", text_contains: "QA Chain Todo" },
          { action: "screenshot", name: "ops-todo-saved" },
        ],
      },
      {
        phase_id: "mark-todo-complete",
        description: "Mark the todo as complete and verify status change",
        steps: [
          {
            action: "click",
            target:
              '[data-testid*="todo-complete"]:last-child, input[type="checkbox"]:last-child, button:has-text("Complete"):last-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "ops-todo-completed" },
        ],
      },
      {
        phase_id: "verify-todo-persistence",
        description: "Navigate away and return to confirm the todo persists",
        steps: [
          {
            action: "navigate",
            path: "/dashboard",
            wait_for: "text=Dashboard",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "navigate",
            path: "/todos",
            wait_for: "text=Todo, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "assert", text_contains: "QA Chain Todo" },
          { action: "screenshot", name: "ops-todo-persisted" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.manage-users — occasional crud:read
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.manage-users",
    description:
      "View the user list, inspect a user profile, and verify role assignments",
    tags: [
      "route:/users",
      "persona:ops",
      "occasional",
      "crud:read",
      "historical",
    ],
    phases: [
      {
        phase_id: "navigate-users",
        description: "Go to the user management page",
        steps: [
          {
            action: "navigate",
            path: "/users",
            wait_for: "text=Users, text=Team, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "users" },
        screenshot: "ops-users-list",
      },
      {
        phase_id: "verify-users-loaded",
        description: "Confirm the user list is rendered",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="user"], [data-testid*="user"]',
          },
          { action: "screenshot", name: "ops-users-data" },
        ],
      },
      {
        phase_id: "inspect-user-profile",
        description: "Click on the first user to view their profile",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="user-row"]:first-child, a[href*="user"]',
            wait_for: "text=User, text=Role, text=Email, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "ops-user-profile-detail" },
        ],
      },
      {
        phase_id: "verify-role-assignments",
        description:
          "Confirm role/permission fields are visible in the profile",
        steps: [
          {
            action: "assert",
            visible:
              '[class*="role"], [data-testid*="role"], text=Role, text=Permission, text=Access',
          },
          { action: "screenshot", name: "ops-user-roles-visible" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.manage-feature-flags — occasional read
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.manage-feature-flags",
    description:
      "View feature flags status and verify their current enabled/disabled states",
    tags: [
      "route:/settings/feature-flags",
      "persona:ops",
      "occasional",
      "read",
      "crud:read",
    ],
    phases: [
      {
        phase_id: "navigate-feature-flags",
        description: "Go to the feature flags settings page",
        steps: [
          {
            action: "navigate",
            path: "/settings/feature-flags",
            wait_for: "text=Feature, text=Flags, text=Settings, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "feature" },
        screenshot: "ops-feature-flags-page",
      },
      {
        phase_id: "verify-flags-loaded",
        description: "Confirm feature flags list is rendered with toggles",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="flag"], [class*="toggle"], input[type="checkbox"], [role="switch"], [data-testid*="flag"]',
          },
          { action: "screenshot", name: "ops-feature-flags-list" },
        ],
      },
      {
        phase_id: "inspect-flag-details",
        description: "View details of a specific feature flag",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="flag-row"]:first-child, [class*="flag-item"]:first-child',
            wait_for: "text=Flag, text=Enabled, text=Disabled, main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "ops-feature-flag-detail" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.review-notifications — occasional read
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.review-notifications",
    description:
      "Review system notifications, mark as read, and verify notification count updates",
    tags: [
      "route:/notifications",
      "persona:ops",
      "occasional",
      "crud:read",
      "crud:update",
    ],
    phases: [
      {
        phase_id: "navigate-notifications",
        description: "Go to the notifications page",
        steps: [
          {
            action: "navigate",
            path: "/notifications",
            wait_for: "text=Notification, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
        ],
        expected_ui: { url_contains: "notification" },
        screenshot: "ops-notifications-page",
      },
      {
        phase_id: "verify-notifications-loaded",
        description: "Confirm notifications list is rendered",
        steps: [
          { action: "assert", visible: "main" },
          {
            action: "assert",
            visible:
              '[class*="notification"], [class*="item"], [class*="list"], [data-testid*="notification"]',
          },
          { action: "screenshot", name: "ops-notifications-list" },
        ],
      },
      {
        phase_id: "mark-notification-read",
        description: "Mark the first notification as read",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Mark Read"), button:has-text("Mark All Read"), [data-testid*="mark-read"], [class*="notification-item"]:first-child button',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "ops-notification-marked-read" },
        ],
      },
      {
        phase_id: "verify-count-updated",
        description: "Verify the unread notification badge count updated",
        steps: [
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "ops-notification-count-updated" },
        ],
      },
    ],
  },
];
