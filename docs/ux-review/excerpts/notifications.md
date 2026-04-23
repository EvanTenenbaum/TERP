# Baseline excerpt for `NotificationsPage`

**Route:** `/notifications` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `NotificationsPage` → `NotificationsHub`

* **Route:** `/notifications`.
* **Tabs:**
  * **system** (`InlineNotificationPanel`) — system/in-app notifications, "mark all read", link follow-through via `normalizeNotificationLink`.
  * **alerts** (`AlertsPanel`) — low-stock, needs-matching, and workflow alerts.
  * **todos** — grid of `TodoListCard`s. Actions: **New List** (`TodoListForm`), **New Todo** (`QuickAddTaskModal`), delete list (`ConfirmDialog`), click card → `/todos/:id`.
* **Empty / loading / error:** `EmptyState`/`LoadingState`/`ErrorState` per tab.
* **tRPC:** `notifications.*`, `alerts.*`, `todoLists.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
