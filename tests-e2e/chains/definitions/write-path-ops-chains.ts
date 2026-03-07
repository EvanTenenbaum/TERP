/**
 * Write-Path Operations Chain Definitions
 *
 * Full interactive write-path chains for the operations domain.
 * Covers workflow task status management, calendar event CRUD,
 * and todo full lifecycle with persistence verification.
 *
 * Action vocabulary:
 *   navigate, click, type, select, add_line_item, assert, wait, screenshot, store, custom
 */

import type { TestChain } from "../types";

export const WRITE_PATH_OPS_CHAINS: TestChain[] = [
  // ---------------------------------------------------------------------------
  // ops.workflow-management — Task lifecycle with status change and persistence
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.workflow-management",
    description:
      "Navigate to /workflow-queue → open first task → update status (mark complete or reassign) → verify status change → navigate away and back → verify status still shows updated value",
    tags: [
      "route:/workflow-queue",
      "persona:ops",
      "crud:update",
      "save-state",
      "persistence",
      "write-path",
    ],
    preconditions: {
      ensure: [
        {
          entity: "workflow_task",
          ref: "pending-task",
          where: { status: "PENDING" },
        },
      ],
    },
    phases: [
      {
        phase_id: "navigate-workflow-queue",
        description: "Navigate to the workflow queue page",
        steps: [
          {
            action: "navigate",
            path: "/workflow-queue",
            wait_for: "text=Workflow, text=Queue, text=Tasks, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            visible:
              'table, [role="table"], [class*="list"], [class*="queue"], [data-testid*="workflow"]',
          },
          { action: "screenshot", name: "wp-workflow-mgmt-queue-list" },
        ],
        expected_ui: { url_contains: "workflow" },
      },
      {
        phase_id: "open-first-task",
        description: "Click on the first task in the workflow queue",
        steps: [
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="queue-item"]:first-child, [class*="queue-row"]:first-child',
            wait_for: "text=Task, text=Status, text=Assigned, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "store",
            from: 'h1, [data-testid*="task-id"], [class*="task-title"]',
            as: "taskTitle",
          },
          { action: "screenshot", name: "wp-workflow-mgmt-task-detail" },
        ],
      },
      {
        phase_id: "update-task-status",
        description: "Update the task status to complete or reassign",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Mark Complete"), button:has-text("Complete"), button:has-text("Update Status"), [data-testid*="status-update"], [data-testid*="complete-task"]',
            wait_for:
              "text=Status, text=Complete, text=Updated, input, select, [role=option]",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              '[role="option"]:has-text("Complete"), [role="option"]:has-text("Done"), option[value*="COMPLETE" i], option[value*="DONE" i], [role="option"]:first-child',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Confirm"), button:has-text("Apply")',
            wait_for: "text=Success, text=Updated, text=Complete, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-workflow-mgmt-status-updated" },
        ],
      },
      {
        phase_id: "verify-status-change",
        description: "Verify the task status shows the updated value",
        steps: [
          {
            action: "assert",
            visible:
              'text=COMPLETE, text=DONE, [class*="complete"], [class*="done"]',
          },
          { action: "screenshot", name: "wp-workflow-mgmt-status-verified" },
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
          { action: "screenshot", name: "wp-workflow-mgmt-left-to-dashboard" },
        ],
      },
      {
        phase_id: "return-and-verify-persisted-status",
        description:
          "Return to workflow queue and verify the status is still updated",
        steps: [
          {
            action: "navigate",
            path: "/workflow-queue",
            wait_for: "text=Workflow, text=Queue, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "click",
            target:
              'table tbody tr:first-child, [data-testid*="queue-item"]:first-child',
            wait_for: "text=Task, text=Status, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          {
            action: "assert",
            visible:
              'text=COMPLETE, text=DONE, [class*="complete"], [class*="done"]',
          },
          { action: "screenshot", name: "wp-workflow-mgmt-status-persisted" },
        ],
      },
    ],
    invariants: [
      {
        name: "task-status-persisted",
        description:
          "Task status shows complete/done after navigation away and back",
        check: "ui",
        page: "/workflow-queue",
        assertions: ["COMPLETE", "DONE"],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.calendar-event-lifecycle — Full calendar CRUD
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.calendar-event-lifecycle",
    description:
      "Create calendar event with title, date/time, description → save → navigate away → return → find event → edit title and time → save edit → delete event → verify deletion",
    tags: [
      "route:/calendar",
      "persona:ops",
      "crud:create",
      "crud:update",
      "crud:delete",
      "save-state",
      "persistence",
      "write-path",
    ],
    preconditions: {},
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
          {
            action: "assert",
            visible:
              '[class*="calendar"], [class*="event"], [class*="month"], [class*="week"], [data-testid*="calendar"]',
          },
          { action: "screenshot", name: "wp-calendar-lifecycle-view" },
        ],
        expected_ui: { url_contains: "calendar" },
      },
      {
        phase_id: "create-calendar-event",
        description: "Click create new event button to open form",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Create"), button:has-text("Add Event"), button:has-text("New Event"), [data-testid*="create-event"], button:has-text("+")',
            wait_for: "text=Title, text=Event, text=Date, input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-calendar-lifecycle-form-open" },
        ],
      },
      {
        phase_id: "fill-event-form",
        description: "Enter event title, date/time, and description",
        steps: [
          {
            action: "type",
            target:
              'input[name="title"], input[name="name"], input[placeholder*="title" i], input[aria-label*="title" i]',
            value: "QA WP Calendar Event {{timestamp}}",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="date"], input[type="date"], input[name="eventDate"], input[aria-label*="date" i]',
            value: "2026-04-01",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="time"], input[type="time"], input[name="startTime"], input[aria-label*="time" i]',
            value: "10:00",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'textarea[name="description"], input[name="description"], textarea[placeholder*="description" i], textarea[placeholder*="notes" i]',
            value: "QA write-path calendar event test description",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-calendar-lifecycle-form-filled" },
        ],
      },
      {
        phase_id: "save-event",
        description: "Save the event and verify success",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Create Event"), button:has-text("Add")',
            wait_for: "text=Success, text=Created, text=Event, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          { action: "screenshot", name: "wp-calendar-lifecycle-event-saved" },
        ],
      },
      {
        phase_id: "navigate-away-and-return",
        description: "Navigate to dashboard and back to calendar",
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
          {
            action: "assert",
            text_contains: "QA WP Calendar Event",
          },
          {
            action: "screenshot",
            name: "wp-calendar-lifecycle-event-persisted",
          },
        ],
      },
      {
        phase_id: "open-event-to-edit",
        description: "Click on the created event to open it",
        steps: [
          {
            action: "click",
            target:
              '[class*="event"]:has-text("QA WP Calendar Event"), [data-testid*="event"]:has-text("QA WP Calendar Event"), a:has-text("QA WP Calendar Event")',
            wait_for: "text=Event, text=Title, main",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-calendar-lifecycle-event-open" },
        ],
      },
      {
        phase_id: "edit-event",
        description: "Edit the event title and change the time",
        steps: [
          {
            action: "click",
            target: 'button:has-text("Edit"), [data-testid*="edit-event"]',
            wait_for: "input, form",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          {
            action: "type",
            target:
              'input[name="title"], input[name="name"], input[placeholder*="title" i]',
            value: "QA WP Calendar Event EDITED {{timestamp}}",
            clear_first: true,
          },
          {
            action: "type",
            target:
              'input[name="time"], input[type="time"], input[name="startTime"]',
            value: "14:00",
            clear_first: true,
          },
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
            wait_for: "text=Success, text=Updated, text=saved",
          },
          { action: "wait", network_idle: true, timeout: 8000 },
          { action: "screenshot", name: "wp-calendar-lifecycle-event-edited" },
        ],
      },
      {
        phase_id: "delete-event",
        description: "Delete the event and verify it is gone",
        steps: [
          {
            action: "click",
            target:
              'button:has-text("Delete"), button:has-text("Remove"), [data-testid*="delete-event"]',
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
            action: "navigate",
            path: "/calendar",
            wait_for: "text=Calendar, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            not_visible: 'text="QA WP Calendar Event EDITED"',
          },
          { action: "screenshot", name: "wp-calendar-lifecycle-event-deleted" },
        ],
      },
    ],
    invariants: [
      {
        name: "event-deleted",
        description: "Calendar event no longer appears after deletion",
        check: "ui",
        page: "/calendar",
        assertions: [],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ops.todo-full-lifecycle — Todo management with persistence
  // ---------------------------------------------------------------------------
  {
    chain_id: "ops.todo-full-lifecycle",
    description:
      "Create todo with title → save → verify in list → mark complete → verify status → navigate away and back → verify completion persisted",
    tags: [
      "route:/todos",
      "persona:ops",
      "crud:create",
      "crud:update",
      "save-state",
      "persistence",
      "write-path",
    ],
    preconditions: {},
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
          { action: "assert", visible: "main" },
          { action: "screenshot", name: "wp-todo-lifecycle-list" },
        ],
        expected_ui: { url_contains: "todo" },
      },
      {
        phase_id: "create-todo",
        description: "Click add/create, enter a todo title, save",
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
            value: "QA WP Todo Lifecycle {{timestamp}}",
            clear_first: true,
          },
          { action: "screenshot", name: "wp-todo-lifecycle-form-filled" },
        ],
      },
      {
        phase_id: "save-todo",
        description: "Submit the todo and verify it appears in the list",
        steps: [
          {
            action: "click",
            target:
              'button[type="submit"], button:has-text("Save"), button:has-text("Add Todo"), button:has-text("Create")',
            wait_for: "text=QA WP Todo Lifecycle, text=saved, text=Created",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            text_contains: "QA WP Todo Lifecycle",
          },
          { action: "screenshot", name: "wp-todo-lifecycle-saved" },
        ],
      },
      {
        phase_id: "mark-complete",
        description: "Mark the todo as complete and verify status change",
        steps: [
          {
            action: "click",
            target:
              '[data-testid*="todo"]:has-text("QA WP Todo Lifecycle") input[type="checkbox"], [data-testid*="todo"]:has-text("QA WP Todo Lifecycle") button:has-text("Complete"), [class*="todo-item"]:has-text("QA WP Todo Lifecycle") input[type="checkbox"]',
            wait_for: "main",
          },
          { action: "wait", network_idle: true, timeout: 5000 },
          { action: "screenshot", name: "wp-todo-lifecycle-marked-complete" },
        ],
      },
      {
        phase_id: "verify-completion-status",
        description: "Verify the todo shows a completed/checked state",
        steps: [
          {
            action: "assert",
            visible:
              '[data-testid*="todo"]:has-text("QA WP Todo Lifecycle") [class*="complete"], [data-testid*="todo"]:has-text("QA WP Todo Lifecycle") input[type="checkbox"]:checked, [class*="todo-item"]:has-text("QA WP Todo Lifecycle") [class*="complete"]',
          },
          { action: "screenshot", name: "wp-todo-lifecycle-status-verified" },
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
          { action: "screenshot", name: "wp-todo-lifecycle-left-to-dashboard" },
        ],
      },
      {
        phase_id: "return-and-verify-completion-persisted",
        description: "Return to todos and verify the completed state persisted",
        steps: [
          {
            action: "navigate",
            path: "/todos",
            wait_for: "text=Todo, main",
          },
          { action: "wait", network_idle: true, timeout: 10000 },
          {
            action: "assert",
            text_contains: "QA WP Todo Lifecycle",
          },
          {
            action: "assert",
            visible:
              '[data-testid*="todo"]:has-text("QA WP Todo Lifecycle") [class*="complete"], [data-testid*="todo"]:has-text("QA WP Todo Lifecycle") input[type="checkbox"]:checked, [class*="todo-item"]:has-text("QA WP Todo Lifecycle") [class*="complete"]',
          },
          {
            action: "screenshot",
            name: "wp-todo-lifecycle-completion-persisted",
          },
        ],
      },
    ],
    invariants: [
      {
        name: "todo-completion-persisted",
        description:
          "Todo shows completed state after navigation away and back",
        check: "ui",
        page: "/todos",
        assertions: ["QA WP Todo Lifecycle"],
      },
    ],
  },
];
