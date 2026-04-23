# TER-1361 Session
- **Ticket:** TER-1361
- **Branch:** `fix/ter-1361-accounting-tabgroups-fix`
- **Status:** Investigated — config already correct in `main`
- **Started:** 2026-04-23T23:42:54Z
- **Agent:** Factory Droid (UX v2 fix wave)

## Goal
Fix TER-1361 — Accounting `tabGroups` 4-group reorg not rendering on staging.
Permitted scope: `client/src/config/workspaces.ts` only (plus this session
file). Out of scope: `server/`, any tRPC routers, database files,
`LinearWorkspaceShell.tsx`.

## Investigation

`ACCOUNTING_WORKSPACE` in `client/src/config/workspaces.ts` already declares
the four-group reorganisation (Overview / Receivables / Payables / Ledger),
added by TER-1305 via PR #716 (commit `43a4f289`) and present in `main`:

```ts
export const ACCOUNTING_WORKSPACE = {
  ...
  tabs: [
    { value: "dashboard",          label: "Dashboard" },
    { value: "invoices",           label: "Invoices" },
    { value: "payments",           label: "Payments" },
    { value: "bills",              label: "Bills" },
    { value: "expenses",           label: "Expenses" },
    { value: "general-ledger",     label: "General Ledger" },
    { value: "chart-of-accounts",  label: "Chart of Accounts" },
    { value: "bank-accounts",      label: "Bank Accounts" },
    { value: "bank-transactions",  label: "Bank Transactions" },
    { value: "fiscal-periods",     label: "Fiscal Periods" },
  ],
  tabGroups: [
    { label: "Overview",    tabs: [{ value: "dashboard", ... }] },
    { label: "Receivables", tabs: [invoices, payments] },
    { label: "Payables",    tabs: [bills, expenses] },
    { label: "Ledger",      tabs: [general-ledger, chart-of-accounts,
                                    bank-accounts, bank-transactions,
                                    fiscal-periods] },
  ],
} as const satisfies WorkspaceConfig<...>;
```

`client/src/pages/AccountingWorkspacePage.tsx` already passes
`tabGroups={ACCOUNTING_WORKSPACE.tabGroups}` to `LinearWorkspaceShell`, and
the shell renders the two-level rail when the `ux.v2.workspace-tabs`
feature flag is on (see `client/src/components/layout/LinearWorkspaceShell.tsx`
around lines 113-135).

`client/src/config/workspaces.test.ts` confirms the invariants:
- Flat tabs list is in the 4-group order
- `tabGroups` partitions the flat tabs (no duplicates, no missing values)

## Verification

- ✅ `tsc --noEmit` (workspaces.ts typechecks clean against
  `WorkspaceConfig`)
- ✅ `eslint client/src/config/workspaces.ts` passes
- ✅ `vitest run client/src/config/workspaces.test.ts` → 3/3 tests pass:
  - "keeps the invoice and banking surfaces in the valid tab list"
  - "declares four tab groups that cover every flat tab exactly once"
  - (companion Inventory assertion)

## Acceptance Criteria Mapping

- ✅ `client/src/config/workspaces.ts` uses `tabGroups` on the Accounting
      workspace (4 groups exactly: Overview, Receivables, Payables,
      Ledger).
- ✅ Tab `value` strings unchanged — deep links such as
      `/accounting?tab=invoices` still resolve because the flat `tabs`
      array remains the source of truth for valid values.
- ✅ All other workspaces untouched (Sales, Demand & Supply,
      Relationships, Inventory, Credits, Buying, Calendar, Settings,
      Notifications still use the single-rail `tabs`-only config).
- ✅ `pnpm check` passes.
- ✅ `pnpm lint` passes (on `workspaces.ts`).

## Result

The config surface that this ticket scopes is already correct in `main`.
No further change to `client/src/config/workspaces.ts` is required to
satisfy the stated acceptance criteria.

## Out-of-Scope Follow-Up (staging rendering)

The 4-group rail still falls back to the flat 10-tab list on staging
because the `ux.v2.workspace-tabs` feature flag resolves to `false` there.
`useOptionalFeatureFlag("ux.v2.workspace-tabs")` returns
`context?.flags[key] ?? false` (see
`client/src/contexts/FeatureFlagContext.tsx`, `useOptionalFeatureFlag`), so
the flag must be enabled in the server's flag response for the grouped
rail to render.

`ux.v2.workspace-tabs` is not currently present in
`server/services/seedFeatureFlags.ts`, so it has no DB default. Staging
will keep returning `false` until either:

1. An admin toggles `ux.v2.workspace-tabs` → ON in the staging Feature
   Flags admin UI, **or**
2. A follow-up PR registers the flag in `seedFeatureFlags.ts` with
   `defaultEnabled: true`.

Both remediations live outside the scope of this ticket
(`SCOPE: client/src/config/workspaces.ts ONLY` and
`DO NOT TOUCH: server/`), so this PR documents the finding and surfaces
the follow-up requirement to unblock the staging render.

