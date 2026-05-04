# Baseline excerpt for `WorkflowQueuePage`

**Route:** `/workflow-queue` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `WorkflowQueuePage`

* **Route:** `/workflow-queue`.
* **Views:** `board` (kanban), `settings`, `history`, `analytics` (driven by `?view=`).
* **Board:** `WorkflowBoard` drag-and-drop; add batch dialog (select status, batches by search, priority).
* **Settings:** `WorkflowSettings` — create/rename/reorder workflow statuses, set colors, set "completed" flag.
* **History:** `WorkflowHistory` — batch status change log.
* **Analytics:** `WorkflowAnalytics` — throughput & bottleneck metrics.
* **tRPC:** `workflowQueue.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
