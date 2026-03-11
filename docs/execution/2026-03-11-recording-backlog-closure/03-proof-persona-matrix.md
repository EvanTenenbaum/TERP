# Proof Persona Matrix

Date: 2026-03-11

This matrix replaces vague phrases like "correct role" with concrete TERP personas and gating requirements.

## Role model used

Source: `server/services/rbacDefinitions.ts`, `server/_core/permissionMiddleware.ts`

Operational personas used for backlog closure:

- `Public demo`
  - Read-biased fallback user. Allowed for read-only smoke checks only.
  - Not valid for any closure that requires create, update, process, shipping, finance, or returns actions.
- `Sales Manager`
  - Valid for quotes, orders, sales editing, relationships create/edit, and pricing visibility checks.
- `Operations Manager`
  - Valid for receiving, inventory, returns processing, samples, and most operations execution checks.
- `Accountant`
  - Valid for accounting, credits, client-credit capacity, and finance hierarchy checks.
- `Super Admin`
  - Valid only when the target route is `adminProcedure` or when a narrower production persona cannot execute the route in current staging.
  - Use sparingly and record why a narrower persona was insufficient.

## Issue-to-persona requirements

| Issue     | Minimum valid persona                                            | Why                                                                                                  | Data prerequisites                                                                            |
| --------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `TER-694` | `Sales Manager`                                                  | Quote edit, duplicate, and convert are sales actions.                                                | At least one editable seeded quote with line items and relationship metadata.                 |
| `TER-695` | `Operations Manager`                                             | Returns processing depends on create/update/process permissions and may be gated off for demo users. | At least one shipped or otherwise returnable order with line-item detail.                     |
| `TER-696` | `Sales Manager`                                                  | Downstream order pricing must be validated from the order-creation path.                             | Seeded client pricing profile, category/subcategory pricing inputs, and a new order draft.    |
| `TER-697` | `Sales Manager`                                                  | Margin/FIFO explainability sits in sales-order creation.                                             | Multi-batch inventory with distinct costs plus a seeded order draft.                          |
| `TER-698` | `Sales Manager`                                                  | Sales UI cleanup must be proven in the main sales workspace.                                         | Populated orders and quotes so empty-state-only proof is avoided.                             |
| `TER-699` | `Operations Manager`                                             | Shipping state language must be validated on the active shipping queue.                              | Orders spanning pending, partial, ready, and shipped cases.                                   |
| `TER-700` | `Operations Manager`                                             | Shipping stale-filter truthfulness is an operator queue problem.                                     | Known ready orders and a browser session with stale local storage to validate reset behavior. |
| `TER-701` | `Super Admin` or `Operations Manager` with shipping-enabled mode | Current shipping routes include admin-only gates in places.                                          | Ready-to-ship seeded orders plus one order that can be inspected individually.                |
| `TER-702` | `Operations Manager`                                             | Operations chrome and advanced-filter default state are ops workspace concerns.                      | Populated inventory queues on desktop and mobile widths.                                      |
| `TER-703` | `Operations Manager`                                             | Inventory discoverability must be evaluated from the ops navigation path.                            | Populated inventory queue plus entrypoint navigation replay.                                  |
| `TER-704` | `Operations Manager`                                             | Samples directly affect inventory and should not be validated under demo-only permissions.           | One samples-out and one samples-return scenario.                                              |
| `TER-705` | `Operations Manager`                                             | Proof ticket for simplified samples flow.                                                            | Simplified samples model must already exist with replayable fixtures.                         |
| `TER-706` | `Super Admin` or equivalent photography-enabled ops persona      | Current photography queue routes are admin-gated.                                                    | Seeded batches with and without photos.                                                       |
| `TER-707` | `Super Admin` or equivalent photography-enabled ops persona      | Camera denial and upload fallback must run on the real photography flow.                             | Browser session that can deny camera permission and still upload files.                       |
| `TER-708` | `Accountant`                                                     | Accounting landing and quick-action priority are finance workflows.                                  | Realistic accounting widgets and transaction data.                                            |
| `TER-709` | `Accountant`                                                     | Credit capacity vs credits/refunds must be validated with finance permissions.                       | Client with credit limit, exposure, and at least one issued credit/adjustment case.           |
| `TER-710` | `Accountant`                                                     | Finance hierarchy and dashboard-first credits are finance IA checks.                                 | Populated accounting, credits, and client-ledger surfaces.                                    |
| `TER-711` | `Sales Manager`                                                  | Relationship terminology is visible in relationship create/edit and profile flows.                   | At least one existing client profile plus create flow access.                                 |
| `TER-712` | `Sales Manager`                                                  | Lightweight create/edit flow is primarily a relationship entry workflow.                             | Create and edit flows with save-state visibility.                                             |
| `TER-713` | Mixed by row                                                     | Replay must use the row-declared persona, not a single broad role.                                   | The ledger row itself is the checklist.                                                       |
| `TER-714` | No runtime persona                                               | Report-only issue.                                                                                   | Complete evidence bundle from all prior issues.                                               |

## Blocking rule

If the required persona or data prerequisites are missing, the issue stays `partial` or `open`.
Wrong-persona proof does not close the row.
