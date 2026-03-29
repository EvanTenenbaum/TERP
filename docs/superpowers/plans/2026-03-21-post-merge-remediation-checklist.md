# Post-Merge Remediation Checklist

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track four remediation items that follow the `fix/spreadsheet-native-remediation-2026-03-21` branch merge: Linear status corrections, P1 pilot blocker tracking, index migration generation, and feature-flag 0-rows resolution.

**Architecture:** This is a checklist, not an implementation plan. Items 1 and 4 are status/documentation updates. Item 2 is a pointer to separate implementation work. Item 3 is a single post-merge command with verification.

**Tech Stack:** Linear (manual), Drizzle Kit, MySQL.

---

## Item 1: Linear Status Corrections (Manual)

**Why:** TER-842, TER-845, TER-830, and TER-833 were closed as `Done` without sufficient evidence. The remediation plan (Epic B, Task 3) identified this. These corrections must happen in Linear by Evan.

| Ticket  | Current | Target        | Reason                                                                 |
|---------|---------|---------------|------------------------------------------------------------------------|
| TER-842 | Done    | In Progress   | Phase 6 "flip remaining modules" — flipped without 2-week soak/telemetry gate |
| TER-845 | Done    | In Progress   | Phase 5 "flip 3 modules" — same premature flip, no soak evidence       |
| TER-830 | Done    | In Progress   | QA ticket closed without SHIP/NO-SHIP proof artifact                   |
| TER-833 | Done    | In Progress   | QA ticket closed without SHIP/NO-SHIP proof artifact                   |

- [ ] **Step 1: Open each ticket in Linear and change status to `In Progress`**

- [ ] **Step 2: Add comment to TER-842 and TER-845:**
  > Reopened: default flip was applied before the plan's own 2-week soak gate. Defaults rolled back in commit `9fd11446`. Soak + telemetry evidence required before re-closing.

- [ ] **Step 3: Add comment to TER-830 and TER-833:**
  > Reopened: closed without SHIP/NO-SHIP QA verdict. Consolidated pilot surface review produced on 2026-03-21 (`docs/qa/2026-03-21-pilot-surface-review/consolidated-verdict.md`). InvoicesPilotSurface and PaymentsPilotSurface received NO-SHIP. Re-close after P1 fixes land and surfaces re-pass QA.

---

## Item 2: P1 Pilot Surface Blockers (Separate Work)

**Why:** Two NO-SHIP verdicts from the consolidated pilot surface review. These are implementation tasks, not status corrections. Tracked here for visibility; actual work is separate.

### INV-P1: InvoicesPilotSurface "Mark as Paid" GL Bypass

**Problem:** The InvoicesPilotSurface has a "Mark as Paid (Full)" action that flips invoice status to `PAID` without creating a payment record, GL entries, or updating balances. The golden flow (`InvoiceToPaymentFlow.tsx`) correctly calls `trpc.payments.recordPayment` which does atomic GL posting (cash debit + AR credit), but the surface's direct mark-as-paid button bypasses this entirely.

**Fix direction:** Remove or rewire the "Mark as Paid" button to route through the `payments.recordPayment` endpoint (or the InvoiceToPaymentFlow golden flow), ensuring GL entries are always created.

**Key files:**
- `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx` — surface with the bypass button
- `server/routers/payments.ts:258-447` — correct `recordPayment` endpoint with GL posting
- `server/routers/invoices.ts` — likely has the direct status-flip mutation

### PAY-P1: PaymentsPilotSurface Cache Namespace Split

**Problem:** PaymentsPilotSurface queries `trpc.accounting.payments.list` while InvoiceToPaymentFlow mutates via `trpc.payments.recordPayment`. These are different tRPC routers with different React Query cache keys. After recording a payment through the golden flow, PaymentsPilotSurface shows stale data until manual refresh.

**Fix direction:** After `recordPayment` mutation succeeds, invalidate the `accounting.payments.list` query cache (or migrate PaymentsPilotSurface to use the same `payments` router for reads).

**Key files:**
- `client/src/components/spreadsheet-native/PaymentsPilotSurface.tsx:470` — uses `trpc.accounting.payments.list`
- `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` — calls `trpc.payments.recordPayment`

---

## Item 3: drizzle-kit Generate for Index Migration

**Why:** Commit `df948d49` added `idx_invoices_reference` on `(referenceType, referenceId)` to eliminate full table scans on returns invoice lookups. The index was added to `drizzle/schema.ts` but no migration SQL was generated. The index has been restored in schema.ts and needs `drizzle-kit generate` after merge.

- [ ] **Step 1: Verify the index is in schema.ts**

  Check that `drizzle/schema.ts` contains in the invoices table indexes:
  ```typescript
  referenceIdx: index("idx_invoices_reference").on(
    table.referenceType,
    table.referenceId
  ),
  ```

- [ ] **Step 2: Run drizzle-kit generate**

  ```bash
  pnpm drizzle-kit generate
  ```

  Expected: Creates `drizzle/migrations/0062_*.sql` with:
  ```sql
  CREATE INDEX `idx_invoices_reference` ON `invoices` (`referenceType`, `referenceId`);
  ```

- [ ] **Step 3: Verify and commit the migration**

  ```bash
  pnpm check && pnpm build
  git add drizzle/migrations/0062_*
  git commit -m "chore(db): generate migration for idx_invoices_reference index"
  ```

- [ ] **Step 4: After staging deploy, verify index exists**

  ```sql
  SHOW INDEX FROM invoices WHERE Key_name = 'idx_invoices_reference';
  ```

---

## Item 4: Feature-Flag Audit 0-Rows Investigation

**Why:** An audit flagged 0 rows returned from feature flag queries. Investigation confirmed the column names are correct throughout the codebase.

### Root Cause: Deployment Timing / Env Config

**Not a code bug.** The feature flag system is correctly implemented:

- **Schema:** `drizzle/schema-feature-flags.ts` defines `feature_flags`, `feature_flag_role_overrides`, `feature_flag_user_overrides`, and `feature_flag_audit_logs` with snake_case column names
- **DB layer:** `server/featureFlagsDb.ts` queries use correct column names (`flag_id`, `role_id`, `enabled`, etc.)
- **Service:** `server/services/featureFlagService.ts` evaluation cascade is correct (system → dependency → module → user override → role override → default)
- **Seed:** `server/services/seedFeatureFlags.ts` is idempotent and seeds ~20 flags

**Most likely cause of 0 rows:**
1. **Seed hasn't run yet** — the `seedFeatureFlags()` function must execute on app startup for flags to exist. If the deployment didn't trigger seeding (new environment, cold start, migration timing), the table is empty.
2. **Environment mismatch** — querying a database instance that hasn't been seeded (e.g., a fresh staging DB after rebuild without running seeds).

**Resolution:** No code change needed. Verify on next staging deploy that `seedFeatureFlags()` runs on startup and the `feature_flags` table is populated:
```sql
SELECT COUNT(*) FROM feature_flags WHERE deleted_at IS NULL;
-- Expected: ~20 rows
```

If 0, check that the seed function is invoked in the server startup path.
