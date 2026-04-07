# Comprehensive TERP Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all known open issues across TERP pilot surfaces, prioritizing frontend/UX-impacting issues before security, documentation, and scalability concerns.

**Architecture:** Each wave is independently committable. Fixes touch client-side pilot surfaces, server routers, cron jobs, and shared utilities. All changes follow existing patterns (tRPC mutations, shadcn/ui components, Drizzle ORM queries).

**Tech Stack:** React 19, TypeScript, tRPC, Drizzle ORM, shadcn/ui, Tailwind 4, Vitest, BullMQ

**Branch:** `claude/spreadsheet-remediation-continue-ofopR`

---

## Exclusions

- **Live Shopping** — all items deferred per user instruction
- **DISC-INV-001** — void already correctly calls `invoices.void` with reason + GL reversal (verified in code)
- **DISC-INV-003** — invoice numbers already use server-generated sequential numbers (verified, commit d9775b39)
- **DISC-FUL-006** — ship button permission already fixed (verified, regression test exists)
- **SAM-P3 (#26)** — duplicate of DISC-SAM-002 (#19)
- **DISC-INV-008 (#39)** — duplicate of INV-P2-CREATE (#9)
- **Infra/schema debt** (strainId, image tables, party model, samples due-date migration) — blocked on migrations, out of scope
- **Staging proof items** — require live environment, not code changes
- **Accepted limitations** (multi-cell edit, clipboard, fill-handle) — deferred to rollout wave

## File Structure

### Wave 1 — Frontend/UX Critical (P1 + high-impact P2)

| File                                                                    | Action | Issues                                                                                                                                                          |
| ----------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx`     | Modify | INV-P1 (mark-paid → payment flow), INV-P2-CREATE (zero-amount validation), DISC-INV-002 (markSent wiring verify)                                                |
| `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`  | Modify | ORD-P2 (lineItemCount), ORD-D010 (download invoice), ORD-P3 (sorting)                                                                                           |
| `server/ordersDb.ts`                                                    | Modify | ORD-P2 (add lineItemCount to getAllOrders return)                                                                                                               |
| `client/src/components/spreadsheet-native/PaymentsPilotSurface.tsx`     | Modify | PAY-P2-PERM (permission gate on void), PAY-P2-STANDALONE (document as intentional)                                                                              |
| `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx`  | Modify | DISC-FUL-004 (ship button for RESTOCKED), DISC-FUL-010 (SHIPPED badge color), FUL-P3-A (R keyboard guard), DISC-FUL-009 (tracking/carrier/notes in ship dialog) |
| `client/src/components/spreadsheet-native/SamplesPilotSurface.tsx`      | Modify | DISC-SAM-002 (setExpirationDate UI)                                                                                                                             |
| `client/src/components/spreadsheet-native/ClientLedgerPilotSurface.tsx` | Modify | CL-P2-FILTER (filter UX), CL-P2-EXPORT (stale cache), CL-P3 (invoice ref navigation)                                                                            |

### Wave 2 — Frontend/UX P2 + P3

| File                                                                      | Action | Issues                                                                                                  |
| ------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `client/src/components/spreadsheet-native/PurchaseOrdersPilotSurface.tsx` | Modify | PO-P2 (state machine validation)                                                                        |
| `client/src/components/spreadsheet-native/ReturnsPilotSurface.tsx`        | Modify | DISC-RET-005 (vendor return UI), RET-P3-B (ReceiveCard re-init), DISC-RET-010 (expectedCondition field) |
| `client/src/components/spreadsheet-native/QuotesPilotSurface.tsx`         | Modify | DISC-QUO-003 (reject verify)                                                                            |
| `client/src/components/spreadsheet-native/InventorySheetPilot.tsx`        | Modify | INV-P2-VERSION (version param wiring), INV-P3-CACHE (dashboard invalidation)                            |

### Wave 3 — Server-Side / Security / Data Integrity

| File                             | Action | Issues                                                                                                                  |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `server/routers/quotes.ts`       | Modify | QUO-P3 (actor attribution on convertToOrder), DISC-QUO-004 (checkExpired scheduling), DISC-QUO-005 (default validUntil) |
| `server/cron/quoteExpiryCron.ts` | Create | DISC-QUO-004 (cron job for quote expiry)                                                                                |
| `server/routers/returns.ts`      | Modify | DISC-RET-009 (ctx.user?.id → getAuthenticatedUserId)                                                                    |
| `server/routers/pickPack.ts`     | Modify | DISC-FUL-003 (audit logging for pack mutations), DISC-FUL-005 (version param)                                           |
| `server/routers/invoices.ts`     | Modify | DISC-INV-007 (version check in accounting namespace verify)                                                             |
| `server/routers/accounting.ts`   | Modify | DISC-INV-007 (add version to updateStatus schema)                                                                       |

### Wave 4 — Code Quality / Polish

| File                                                                   | Action | Issues                                                                               |
| ---------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx` | Modify | FUL-P3-B (shared status derivation), DISC-FUL-001 (Shipping→Fulfillment terminology) |
| `client/src/components/spreadsheet-native/ReturnsPilotSurface.tsx`     | Modify | RET-P3-A (use server status), DISC-RET-006 (shared GL parser)                        |
| `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx`    | Modify | INV-P2-DEAD (remove deepLink.openRecordPayment dead code)                            |
| `server/routers/payments.ts`                                           | Modify | PAY-P3 (cross-namespace invalidation)                                                |

---

## Wave 1: Frontend/UX Critical Fixes

### Task 1.1: INV-P1 — Remove "Mark as Paid" quick action (force payment flow)

**Files:**

- Modify: `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx:900-909,970-973,1170-1180,715-721`

The "Mark as Paid" button bypasses GL flow — flips status without creating payment record, GL entries, or updating amountPaid/amountDue. The safest fix: remove the quick "Mark Paid" action entirely and force users through the InvoiceToPaymentFlow which properly records a payment.

- [ ] **Step 1: Remove markPaidMutation and replace Mark Paid buttons with Record Payment**

In `InvoicesPilotSurface.tsx`:

1. Remove the `markPaidMutation` (lines ~900-909)
2. Remove `handleMarkPaid` callback (lines ~970-973)
3. Replace the "Mark Paid" command strip button (lines ~1170-1180) with a second "Record Payment" prompt or remove it
4. In the InspectorContent, replace the "Mark as Paid (Full)" button with "Record Full Payment" that opens the payment flow
5. Remove `isMarkPaidPending` prop threading

- [ ] **Step 2: Verify the InvoiceToPaymentFlow is properly wired**

Confirm the existing `handleRecordPayment` callback opens `showPaymentDialog` and the `InvoiceToPaymentFlow` component handles payment + GL entries atomically.

- [ ] **Step 3: Run `pnpm check` to verify no type errors**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(invoices): remove Mark as Paid bypass — force payment flow for GL integrity (INV-P1)"
```

### Task 1.2: ORD-P2 — Fix lineItemCount always 0

**Files:**

- Modify: `server/ordersDb.ts:965-969` (add lineItemCount to transform)
- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx:299` (verify column def)

- [ ] **Step 1: Add lineItemCount to getAllOrders transform**

In `server/ordersDb.ts`, in the `transformed` mapping (~line 965), add `lineItemCount: parsedItems.length` to the returned object.

- [ ] **Step 2: Verify the OrdersSheetPilotSurface column def reads `lineItemCount`**

- [ ] **Step 3: Run `pnpm check`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(orders): include lineItemCount in getAllOrders response (ORD-P2)"
```

### Task 1.3: ORD-D010 — Remove inert "Download Invoice" from orders pilot

**Files:**

- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`

- [ ] **Step 1: Find and remove the "Download Invoice" button/action in the orders pilot inspector**

The classic OrdersWorkSurface has a working download, but the pilot surface has an inert version. Remove the non-functional button from the pilot inspector.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(orders): remove inert Download Invoice button from pilot inspector (ORD-D010)"
```

### Task 1.4: PAY-P2-PERM — Add permission gate to void button

**Files:**

- Modify: `client/src/components/spreadsheet-native/PaymentsPilotSurface.tsx:705-718,813-816`

- [ ] **Step 1: Import usePermissions hook and gate void button**

Add `hasPermission("accounting:delete")` check. Disable/hide void buttons when user lacks permission.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(payments): gate void button on accounting:delete permission (PAY-P2-PERM)"
```

### Task 1.5: DISC-FUL-004 + DISC-FUL-010 — Ship button for RESTOCKED + SHIPPED badge color

**Files:**

- Modify: `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx:83,171,184,724`

- [ ] **Step 1: Hide ship button for RESTOCKED orders**

In the `canShipSelectedOrder` condition (~line 721-726), add "RESTOCKED" to the exclusion set alongside SHIPPED/DELIVERED/RETURNED.

- [ ] **Step 2: Add SHIPPED badge color token**

Add distinct color for SHIPPED status in the status rendering function (currently falls through to default).

- [ ] **Step 3: Run `pnpm check`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(fulfillment): hide ship button for RESTOCKED, add SHIPPED badge color (DISC-FUL-004, DISC-FUL-010)"
```

### Task 1.6: DISC-FUL-009 — Add tracking/carrier/notes to ship dialog

**Files:**

- Modify: `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx`

- [ ] **Step 1: Find the ship confirmation dialog**

Locate where `shipOrder` mutation is called and the dialog that triggers it.

- [ ] **Step 2: Add trackingNumber, carrier, and notes input fields**

Add three form fields to the ship dialog. Pass values to the `shipOrder` mutation which already accepts them.

- [ ] **Step 3: Run `pnpm check`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(fulfillment): expose tracking number, carrier, and notes in ship dialog (DISC-FUL-009)"
```

### Task 1.7: FUL-P3-A — Guard R keyboard shortcut

**Files:**

- Modify: `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx`

- [ ] **Step 1: Find the R keyboard handler**

Locate where the R key triggers "Ready to Ship" action.

- [ ] **Step 2: Add packedItemCount > 0 guard**

Only fire the mutation if the selected order has at least one packed item.

- [ ] **Step 3: Run `pnpm check`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(fulfillment): guard R shortcut — require packed items before ready-to-ship (FUL-P3-A)"
```

### Task 1.8: INV-P2-CREATE — Validate Create Invoice dialog

**Files:**

- Modify: `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx:1480-1486`

- [ ] **Step 1: Add validation preventing zero-balance skeleton invoices**

The Create Invoice dialog currently allows submission with no line items and totalAmount 0. Add a validation message and disable the Create button unless the client is selected and due date is provided. Add a note that line items should be added after creation. (The dialog creates a draft — line items come later.)

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(invoices): require client and due date for invoice creation (INV-P2-CREATE)"
```

### Task 1.9: DISC-SAM-002 — Add expiration date to SamplesPilotSurface

**Files:**

- Modify: `client/src/components/spreadsheet-native/SamplesPilotSurface.tsx`

- [ ] **Step 1: Add expiration date field to inspector**

Wire `setExpirationDate` mutation to a date picker in the samples inspector panel.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(samples): expose setExpirationDate in pilot surface inspector (DISC-SAM-002)"
```

### Task 1.10: CL-P2-FILTER — Fix transaction type filter UX

**Files:**

- Modify: `client/src/components/spreadsheet-native/ClientLedgerPilotSurface.tsx`

- [ ] **Step 1: Fix filter display**

If single-select state with multi-select display, align them. Switch trigger to show the actual selected value.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(client-ledger): align transaction type filter display with single-select state (CL-P2-FILTER)"
```

### Task 1.11: CL-P2-EXPORT — Fix stale export data

**Files:**

- Modify: `client/src/components/spreadsheet-native/ClientLedgerPilotSurface.tsx`

- [ ] **Step 1: Export from current query data instead of cache**

Ensure the export function uses the currently loaded/filtered data rather than potentially stale cached data.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(client-ledger): export from current query data to prevent stale cache (CL-P2-EXPORT)"
```

### Task 1.12: DISC-INV-002 — Verify Mark as Sent wiring

**Files:**

- Verify: `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx:912-921`

- [ ] **Step 1: Verify markSent is properly wired**

Check that `handleMarkSent` calls `markSentMutation.mutate` with the correct invoice ID. Already appears wired in the code — confirm and note if already fixed.

- [ ] **Step 2: Commit if changes needed**

### Task 1.13: ORD-P3 — Add sorting to monetary columns

**Files:**

- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`

- [ ] **Step 1: Add `sortable: true` to total/amount column defs**

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(orders): enable sorting on monetary columns (ORD-P3)"
```

---

## Wave 2: Frontend/UX P2 + P3

### Task 2.1: PO-P2 — Add state machine validation to PO status updates

**Files:**

- Modify: `client/src/components/spreadsheet-native/PurchaseOrdersPilotSurface.tsx`

- [ ] **Step 1: Define allowed PO status transitions**

Create a transition map (DRAFT→SUBMITTED→APPROVED→RECEIVED, etc.) and validate before calling mutation.

- [ ] **Step 2: Show error toast for invalid transitions**

- [ ] **Step 3: Run `pnpm check`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(purchase-orders): add client-side state machine validation for status updates (PO-P2)"
```

### Task 2.2: INV-P2-VERSION — Wire version param for inventory status updates

**Files:**

- Modify: `client/src/components/spreadsheet-native/InventorySheetPilot.tsx`

- [ ] **Step 1: Pass version from current row data to updateStatus mutation**

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(inventory): wire version param to updateStatus for optimistic locking (INV-P2-VERSION)"
```

### Task 2.3: INV-P3-CACHE — Dashboard cache invalidation

**Files:**

- Modify: `client/src/components/spreadsheet-native/InventorySheetPilot.tsx`

- [ ] **Step 1: Add dashboard query invalidation to status mutation onSuccess**

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(inventory): invalidate dashboard cache after status update (INV-P3-CACHE)"
```

### Task 2.4: CL-P3 — Invoice reference navigation in client ledger

**Files:**

- Modify: `client/src/components/spreadsheet-native/ClientLedgerPilotSurface.tsx`

- [ ] **Step 1: Add click handler for INVOICE reference type**

Navigate to the invoice detail when clicking an invoice reference in the ledger.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(client-ledger): add navigation for invoice reference clicks (CL-P3)"
```

### Task 2.5: DISC-RET-010 — Add expectedCondition field to returns

**Files:**

- Modify: `client/src/components/spreadsheet-native/ReturnsPilotSurface.tsx`

- [ ] **Step 1: Add expected condition dropdown to return composition dialog**

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(returns): add expectedCondition field to composition dialog (DISC-RET-010)"
```

### Task 2.6: RET-P3-B — ReceiveCard prop re-initialization

**Files:**

- Modify: `client/src/components/spreadsheet-native/ReturnsPilotSurface.tsx`

- [ ] **Step 1: Add useEffect to re-sync ReceiveCard from props on change**

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(returns): re-init ReceiveCard when async props change (RET-P3-B)"
```

---

## Wave 3: Server-Side / Security / Data Integrity

### Task 3.1: QUO-P3 — Actor attribution on convertToOrder

**Files:**

- Modify: `server/routers/quotes.ts:604`

- [ ] **Step 1: Add ctx to mutation handler and call getAuthenticatedUserId**

Change `.mutation(async ({ input })` to `.mutation(async ({ input, ctx })` and pass the authenticated user ID to the conversion function.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(quotes): add actor attribution to convertToOrder via getAuthenticatedUserId (QUO-P3)"
```

### Task 3.2: DISC-RET-009 — Fix forbidden pattern in returns.create

**Files:**

- Modify: `server/routers/returns.ts`

- [ ] **Step 1: Replace ctx.user?.id with getAuthenticatedUserId(ctx)**

Find the returns.create mutation and swap the forbidden pattern.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(returns): replace ctx.user?.id with getAuthenticatedUserId in create mutation (DISC-RET-009)"
```

### Task 3.3: DISC-QUO-004 + DISC-QUO-005 — Quote expiry cron + default validUntil

**Files:**

- Create: `server/cron/quoteExpiryCron.ts`
- Modify: `server/routers/quotes.ts` (or wherever quotes are created)
- Modify: `server/index.ts` or cron registration file

- [ ] **Step 1: Create quoteExpiryCron.ts**

A cron job that calls `quotes.checkExpired` logic on a schedule (daily).

- [ ] **Step 2: Ensure quote creation defaults validUntil to 30 days if not provided**

- [ ] **Step 3: Register cron in the cron initialization file**

- [ ] **Step 4: Run `pnpm check`**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(quotes): add expiry cron job + default validUntil for new quotes (DISC-QUO-004, DISC-QUO-005)"
```

### Task 3.4: DISC-FUL-003 — Add audit logging to pack mutations

**Files:**

- Modify: `server/routers/pickPack.ts`

- [ ] **Step 1: Add audit log entries to packItems and markAllPacked**

Match the pattern used by `unpackItems` which already logs.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(fulfillment): add audit logging to packItems and markAllPacked (DISC-FUL-003)"
```

### Task 3.5: DISC-INV-007 — Add version to accounting.ts updateStatus schema

**Files:**

- Modify: `server/routers/accounting.ts`

- [ ] **Step 1: Find updateStatus in accounting router and add version param**

Add `version: z.number().optional()` to the updateStatus input schema. Forward to the invoices.updateStatus which already handles version checking.

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(invoices): add version param to accounting.invoices.updateStatus schema (DISC-INV-007)"
```

---

## Wave 4: Code Quality / Polish

### Task 4.1: DISC-FUL-001 — Shipping → Fulfillment terminology

**Files:**

- Modify: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx:587`

- [ ] **Step 1: Replace "Shipping" label with "Fulfillment" in UI text**

Only in user-facing labels, not variable names or route paths.

- [ ] **Step 2: Update test expectations if needed**

- [ ] **Step 3: Run `pnpm check && pnpm test`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(fulfillment): rename Shipping to Fulfillment in pilot surface labels (DISC-FUL-001)"
```

### Task 4.2: FUL-P3-B — Extract shared status derivation utility

**Files:**

- Create: `client/src/lib/fulfillment-status.ts`
- Modify: `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx`

- [ ] **Step 1: Extract mapToQueueRow status derivation to shared utility**

- [ ] **Step 2: Use shared utility in both mapToQueueRow and OrderInspector**

- [ ] **Step 3: Run `pnpm check`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(fulfillment): extract shared status derivation utility (FUL-P3-B)"
```

### Task 4.3: INV-P2-DEAD — Remove dead deepLink code

**Files:**

- Modify: `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx`

- [ ] **Step 1: Remove deepLink.openRecordPayment dead code path**

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(invoices): remove dead deepLink.openRecordPayment code (INV-P2-DEAD)"
```

### Task 4.4: RET-P3-A — Use server-returned status in returns

**Files:**

- Modify: `client/src/components/spreadsheet-native/ReturnsPilotSurface.tsx`

- [ ] **Step 1: Replace client-side extractWorkflowStatus with server-returned status**

- [ ] **Step 2: Run `pnpm check`**

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(returns): use server-returned workflow status instead of client derivation (RET-P3-A)"
```

---

## Final QA Gate

After all waves complete:

- [ ] `pnpm check` — zero TypeScript errors
- [ ] `pnpm lint` — zero lint errors
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm build` — production build succeeds
- [ ] Review all changes with `git diff origin/main..HEAD`
- [ ] Create PR to main
