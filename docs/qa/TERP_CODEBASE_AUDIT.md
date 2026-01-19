# TERP Codebase Audit (Router-Level Risk Review)

**Scope:** Router/procedure-level RBAC enforcement, server-side validation, business logic correctness, idempotency, error handling, and invariant protection.

**Sources reviewed:**

- `docs/reference/USER_FLOW_MATRIX.csv`
- `docs/reference/FLOW_GUIDE.md`
- `docs/qa/QA_PLAYBOOK.md`
- `docs/auth/QA_AUTH.md`
- Core router files in `server/routers/*` and `server/_core/*`

---

## Core tRPC Router Files (Entry Points)

- **Primary router aggregation:** `server/routers.ts` (registers all domain routers in `appRouter`).
- **tRPC base procedures & auth:** `server/_core/trpc.ts` (defines `publicProcedure`, `protectedProcedure`, `adminProcedure`, `strictlyProtectedProcedure`, and VIP session handling).

---

## Top 30 Highest-Risk Procedures (Spreadsheet-Ready)

| Procedure                        | FilePath                             | Read/Write | Entity                 | Expected Guards                  | Observed Guards                                    | Risk Summary                            | Severity |
| -------------------------------- | ------------------------------------ | ---------- | ---------------------- | -------------------------------- | -------------------------------------------------- | --------------------------------------- | -------- |
| orders.create                    | server/routers/orders.ts             | Write      | Order                  | protected + orders:create        | protected + requirePermission("orders:create")     | Order creation drives pricing/inventory | P0       |
| orders.update                    | server/routers/orders.ts             | Write      | Order                  | protected + orders:update        | protected + requirePermission("orders:update")     | Core order edits                        | P1       |
| orders.delete                    | server/routers/orders.ts             | Write      | Order                  | protected + orders:delete        | protected + requirePermission("orders:delete")     | Soft delete affects audits              | P1       |
| orders.createDraftEnhanced       | server/routers/orders.ts             | Write      | Order                  | protected + orders:create        | protected + requirePermission("orders:create")     | Draft pricing/COGS                      | P0       |
| orders.finalizeDraft             | server/routers/orders.ts             | Write      | Order                  | protected + orders:create        | protected + requirePermission("orders:create")     | Finalizes sale                          | P0       |
| orders.processReturn             | server/routers/orders.ts             | Write      | Return                 | protected + orders:update        | protected + requirePermission("orders:update")     | Returns affect inventory/credits        | P0       |
| orders.convertQuoteToSale        | server/routers/orders.ts             | Write      | Order                  | protected + orders:create        | protected + requirePermission("orders:create")     | Quote→Sale conversion                   | P0       |
| orders.confirmOrder              | server/routers/orders.ts             | Write      | Order                  | protected + orders:update        | protected + requirePermission("orders:update")     | Inventory reservation gate              | P0       |
| orders.fulfillOrder              | server/routers/orders.ts             | Write      | Inventory/Order        | protected + orders:update        | protected + requirePermission("orders:update")     | Picks/fulfillment stock changes         | P0       |
| inventory.intake                 | server/routers/inventory.ts          | Write      | Batch/Inventory        | protected + inventory:create     | protected + requirePermission("inventory:create")  | Creates inventory                       | P0       |
| inventory.updateStatus           | server/routers/inventory.ts          | Write      | Batch                  | protected + inventory:update     | protected + requirePermission("inventory:update")  | Quarantine/qty changes                  | P0       |
| inventory.updateBatch            | server/routers/inventory.ts          | Write      | Batch                  | protected + inventory:update     | protected + requirePermission("inventory:update")  | COGS edits                              | P1       |
| inventoryMovements.adjust        | server/routers/inventoryMovements.ts | Write      | Inventory              | protected + inventory:update     | protected + requirePermission("inventory:update")  | Manual adjustments                      | P0       |
| inventoryMovements.decrease      | server/routers/inventoryMovements.ts | Write      | Inventory              | protected + inventory:update     | protected + requirePermission("inventory:update")  | Sales deductions                        | P0       |
| inventoryMovements.increase      | server/routers/inventoryMovements.ts | Write      | Inventory              | protected + inventory:update     | protected + requirePermission("inventory:update")  | Refund adds                             | P0       |
| inventoryMovements.reverse       | server/routers/inventoryMovements.ts | Write      | Inventory              | protected + inventory:update     | protected + requirePermission("inventory:update")  | Reversal capability                     | P0       |
| invoices.generateFromOrder       | server/routers/invoices.ts           | Write      | Invoice                | protected + accounting:create    | protected + requirePermission("accounting:create") | Creates invoice                         | P0       |
| invoices.updateStatus            | server/routers/invoices.ts           | Write      | Invoice                | protected + accounting:update    | protected + requirePermission("accounting:update") | Financial state transitions             | P0       |
| invoices.void                    | server/routers/invoices.ts           | Write      | Invoice                | protected + accounting:delete    | protected + requirePermission("accounting:delete") | Voids obligations                       | P0       |
| payments.recordPayment           | server/routers/payments.ts           | Write      | Payment/GL             | protected + accounting:create    | protected + requirePermission("accounting:create") | Money movement & GL                     | P0       |
| accounting.postJournalEntry      | server/routers/accounting.ts         | Write      | GL                     | protected + accounting:create    | protected + requirePermission("accounting:create") | Direct ledger postings                  | P0       |
| accounting.receiveClientPayment  | server/routers/accounting.ts         | Write      | Payment/Client balance | protected + accounting:create    | protected + requirePermission("accounting:create") | Updates payments + client totals        | P0       |
| accounting.payVendor             | server/routers/accounting.ts         | Write      | Payment/AP             | protected + accounting:create    | protected + requirePermission("accounting:create") | Vendor payment & AP                     | P0       |
| clientLedger.addLedgerAdjustment | server/routers/clientLedger.ts       | Write      | Ledger                 | protected + accounting:create    | protected + requirePermission("accounting:create") | Manual credit/debit                     | P0       |
| cogs.updateBatchCogs             | server/routers/cogs.ts               | Write      | COGS                   | protected + cogs:update          | protected + requirePermission("cogs:update")       | Updates COGS + margins                  | P0       |
| credits.issue                    | server/routers/credits.ts            | Write      | Credit                 | protected + credits:create       | protected + requirePermission("credits:create")    | Issues credit value                     | P0       |
| credits.applyCredit              | server/routers/credits.ts            | Write      | Credit/Invoice         | protected + credits:update       | protected + requirePermission("credits:update")    | Applies credits to invoices             | P0       |
| purchaseOrders.create            | server/routers/purchaseOrders.ts     | Write      | Purchase Order         | protected + purchasing:create    | protected only (no permission middleware)          | Any user can create POs                 | P0       |
| poReceiving.receive              | server/routers/poReceiving.ts        | Write      | PO/Inventory           | protected + inventory/purchasing | protected only (no permission middleware)          | Any user can receive POs                | P0       |
| vendorSupply.create              | server/routers/vendorSupply.ts       | Write      | Vendor Supply          | protected + vendor permission    | publicProcedure (no auth)                          | Unauthenticated supply creation         | P0       |

---

## 16 Code-Level Findings (Concrete Risks + Minimal Fixes)

1. **PO creation lacks RBAC enforcement**
   - **What’s wrong:** `purchaseOrders.create` uses only `protectedProcedure`.
   - **Why it matters:** Any authenticated user can create POs (inventory/liability impact).
   - **Location:** `server/routers/purchaseOrders.ts`.
   - **Minimal fix:** add `.use(requirePermission("purchasing:create"))` (or equivalent).

2. **PO receiving lacks RBAC enforcement**
   - **What’s wrong:** `poReceiving.receive` has no permission middleware.
   - **Why it matters:** Unauthorized users can receive inventory and change PO status.
   - **Location:** `server/routers/poReceiving.ts`.
   - **Minimal fix:** add `.use(requirePermission("inventory:update"))` or a purchasing permission.

3. **PO receiving allows spoofed `receivedBy`**
   - **What’s wrong:** `receivedBy` is user‑supplied input.
   - **Why it matters:** Audit attribution can be falsified.
   - **Location:** `server/routers/poReceiving.ts`.
   - **Minimal fix:** derive from `ctx` (`getAuthenticatedUserId`) and remove input field.

4. **PO creation allows spoofed `createdBy`**
   - **What’s wrong:** `createdBy` is provided by input and stored.
   - **Why it matters:** audit/log integrity compromised.
   - **Location:** `server/routers/purchaseOrders.ts`.
   - **Minimal fix:** use authenticated user ID; remove input field.

5. **Vendor supply mutations are public**
   - **What’s wrong:** `vendorSupply.create/update/reserve/purchase` are public.
   - **Why it matters:** unauthenticated tampering of marketplace data.
   - **Location:** `server/routers/vendorSupply.ts`.
   - **Minimal fix:** require auth + role permission checks.

6. **Vendor supply uses `createdBy` input + `any` cast**
   - **What’s wrong:** `createdBy` is passed in and updates use `any`.
   - **Why it matters:** audit spoofing and unsafe updates.
   - **Location:** `server/routers/vendorSupply.ts`.
   - **Minimal fix:** derive actor from context and use strict types (no `any`).

7. **Tag CRUD is unauthenticated**
   - **What’s wrong:** `tags.create/update/delete` are public.
   - **Why it matters:** anyone can mutate tag taxonomy.
   - **Location:** `server/routers/tags.ts`.
   - **Minimal fix:** require auth + `tags:manage` permission.

8. **Inventory movement quantities are unvalidated strings**
   - **What’s wrong:** `quantity` and `quantityChange` are `z.string()` without numeric validation.
   - **Why it matters:** malformed values can corrupt inventory math.
   - **Location:** `server/routers/inventoryMovements.ts`.
   - **Minimal fix:** use numeric schema with `nonnegative/positive` constraints.

9. **Order create allows non‑positive quantities/prices**
   - **What’s wrong:** no `positive()` on quantity/unitPrice fields.
   - **Why it matters:** negative totals or invalid inventory impact.
   - **Location:** `server/routers/orders.ts` (create schema).
   - **Minimal fix:** enforce positive numeric constraints.

10. **Pricing default fallback silently applies 30% margin**
    - **What’s wrong:** missing pricing defaults are handled by auto‑margin.
    - **Why it matters:** risk of unintended pricing.
    - **Location:** `server/routers/orders.ts` (`createDraftEnhanced`).
    - **Minimal fix:** block unless explicit override approved.

11. **Receive client payment is non‑transactional**
    - **What’s wrong:** multiple inserts/updates occur outside a transaction.
    - **Why it matters:** partial updates leave balances inconsistent.
    - **Location:** `server/routers/accounting.ts` quick action.
    - **Minimal fix:** wrap in `db.transaction` + add idempotency key.

12. **Vendor payment is non‑transactional**
    - **What’s wrong:** payment insert + bill update are not atomic.
    - **Why it matters:** AP ledger drift.
    - **Location:** `server/routers/accounting.ts` quick action.
    - **Minimal fix:** use a transaction and idempotency key.

13. **Batch status transitions are not transactional**
    - **What’s wrong:** status update + qty shifts + movement insert are separate.
    - **Why it matters:** quarantine/on‑hand mismatches if any step fails.
    - **Location:** `server/routers/inventory.ts` (`updateStatus`).
    - **Minimal fix:** wrap in a single transaction.

14. **COGS batch update touches many orders without atomicity**
    - **What’s wrong:** updates order items in a loop without transaction control.
    - **Why it matters:** partial COGS/margin updates across orders.
    - **Location:** `server/routers/cogs.ts` (`updateBatchCogs`).
    - **Minimal fix:** use transaction or background job with retry.

15. **Payment number generation is race‑prone**
    - **What’s wrong:** based on count per month.
    - **Why it matters:** duplicates under concurrency.
    - **Location:** `server/routers/payments.ts`.
    - **Minimal fix:** database sequence or unique constraint + retry.

16. **Invoice generation not wrapped in a transaction**
    - **What’s wrong:** invoice creation and order update are separate.
    - **Why it matters:** duplicate invoices or orphaned links.
    - **Location:** `server/routers/invoices.ts` (`generateFromOrder`).
    - **Minimal fix:** transaction + unique constraint on reference.

---

## QA Classification (Adaptive Expert QA Protocol)

- **Work Type:** Strategic / decision-making document
- **Persistence:** Durable
- **Risk of Error:** High (financial, inventory, compliance)
- **Downstream Consumers:** Internal collaborators and stakeholders
- **QA Severity Selected:** 🔴 Level 3 (Full Red Hat QE / Red Team)

**Key Risks Identified:** RBAC gaps, non-transactional financial flows, spoofable audit fields, and unsafe quantity validation.
