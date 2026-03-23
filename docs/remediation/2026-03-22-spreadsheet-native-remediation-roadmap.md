# Spreadsheet-Native Remediation Roadmap

**Date**: 2026-03-22
**Status**: DRAFT — requires Phase 0 reconciliation before becoming canonical
**Author**: Remediation agent (program-recovery task)
**Predecessor**: 2026-03-21 audit handoff
**Adversarial review**: Codex gpt-5.4 NO-SHIP → corrections applied (see Appendix A)

---

## 1. Canonical Module Matrix

Verified against current repo on branch `fix/add-invoices-reference-index` (commit `80d22b6d`).

**Column definitions:**

- **Planned wave**: Per `docs/roadmaps/spreadsheet-native-full-rollout/README.md`
- **Roadmap readiness**: What the roadmap says about build-readiness
- **Implemented**: Pilot surface component exists in repo
- **Route-wired**: Pilot is lazy-loaded and conditionally rendered in a workspace page
- **pilotSurfaceSupported**: Tab is included in the `pilotSurfaceSupported` check (controls flag polling + toggle availability)
- **Toggle rendered**: SheetModeToggle appears in command strip conditional for this tab
- **Default surface**: Value of `SHEET_NATIVE_DEFAULTS[moduleId]` in `searchParams.ts`
- **QA verdict**: From `docs/qa/2026-03-21-pilot-surface-review/consolidated-verdict.md`
- **Parity proof**: Status in parity proof plan or capability ledger
- **Visible user risk**: Active risk to users on the visible (classic or default) path

### Matrix

| #   | Module              | Planned Wave        | Roadmap Ready                                     | Implemented                          | Route-wired                                  | pilotSurfaceSupported                                                                                                             | Toggle Rendered                                                                                                            | Default Surface  | QA Verdict                                    | Parity Proof                                                                                                                                                                      | Visible User Risk                                                                                                                                                             | Recommended Action                                                    |
| --- | ------------------- | ------------------- | ------------------------------------------------- | ------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | **Orders**          | W0 (foundation)     | Yes                                               | Yes                                  | SalesWorkspacePage:105                       | Yes (line 68)                                                                                                                     | Yes (line 94-96)                                                                                                           | **sheet-native** | None (not in verdict)                         | 35 rows: 4 `live-proven`, 9 `code-proven`, 16 `partial`, 5 `blocked`, 1 `implemented-not-surfaced`                                                                                | **Medium** — default sheet-native with 16 partial + 5 blocked proof rows                                                                                                      | Complete parity proof for partial rows                                |
| 2   | **Create-order**    | W0 (part of Orders) | Yes                                               | Yes (reuses OrdersSheetPilotSurface) | SalesWorkspacePage:160                       | Yes (line 69, shared)                                                                                                             | Yes (shared w/Orders)                                                                                                      | classic          | None                                          | Covered by Orders rows                                                                                                                                                            | Low — opt-in only                                                                                                                                                             | Include in Orders proof wave                                          |
| 3   | **Inventory**       | W1A                 | Yes (detailed ledger)                             | Yes                                  | InventoryWorkspacePage:163                   | Yes (line 72)                                                                                                                     | Yes (line 142-146)                                                                                                         | classic          | None                                          | 12 rows: 2 `live-proven`, 2 `code-proven`, 5 `partial`, 3 `blocked`                                                                                                               | **Medium** — bulk delete staging 500 (OPS-INV-006)                                                                                                                            | Fix staging 500, complete proof                                       |
| 4   | **Sales Sheets**    | W1B                 | Yes (detailed ledger)                             | Yes                                  | SalesWorkspacePage:144                       | Yes (line 70)                                                                                                                     | Yes (line 94-96)                                                                                                           | classic          | None                                          | Ledger exists, no formal proof                                                                                                                                                    | Low — opt-in only                                                                                                                                                             | Run adversarial review                                                |
| 5   | **Payments**        | W1C                 | **PACK-ONLY** (brief says "pilot DOES NOT EXIST") | Yes                                  | AccountingWorkspacePage:100                  | Yes (line 48)                                                                                                                     | Yes (line 74-78)                                                                                                           | classic          | **NO-SHIP** (P1: cache namespace stale grids) | Ledger exists                                                                                                                                                                     | **High** — P1 blocker unfixed, roadmap completely stale                                                                                                                       | Fix P1, update roadmap                                                |
| 6   | **Client Ledger**   | W1D                 | **PACK-ONLY** (brief says "pilot DOES NOT EXIST") | Yes                                  | ClientLedgerPage:49 (JSX render)             | Yes (line 32, always true)                                                                                                        | Yes (line 52-59, conditional on flag)                                                                                      | classic          | **SHIP** (2 P2, 1 P3)                         | Ledger exists                                                                                                                                                                     | Low — SHIP verdict, opt-in only                                                                                                                                               | Update roadmap to reflect reality                                     |
| 7   | **Direct Intake**   | W2A                 | Yes (detailed ledger)                             | Yes                                  | InventoryWorkspacePage:194                   | Yes (line 80)                                                                                                                     | Yes (line 148-153)                                                                                                         | classic          | None                                          | Ledger exists, no formal proof                                                                                                                                                    | **Medium** — legacy routes `/product-intake`, `/intake`, `/direct-intake` redirect to `tab=receiving` not `tab=intake` (surfacing mismatch)                                   | Run adversarial review; audit legacy redirects                        |
| 8   | **Purchase Orders** | W2B                 | Yes (detailed ledger)                             | Yes                                  | ProcurementWorkspacePage:~100 (panel render) | Yes (line 53)                                                                                                                     | Yes (line ~85-95, command strip)                                                                                           | classic          | None                                          | Ledger exists, no formal proof                                                                                                                                                    | Low — opt-in only                                                                                                                                                             | Run adversarial review                                                |
| 9   | **Fulfillment**     | W2C                 | **PACK-ONLY**                                     | Yes                                  | InventoryWorkspacePage:180                   | Yes (line 97)                                                                                                                     | Yes (line 154-160)                                                                                                         | classic          | **SHIP** (2 P3)                               | Ledger: 10 discrepancies (DISC-FUL-001 through DISC-FUL-010), inc. inert concurrent-edit detection (005), permission mismatch (006)                                               | **Medium** — SHIP but 10 residual discrepancies include permission mismatch and inert version check                                                                           | Fix high-severity discrepancies                                       |
| 10  | **Invoices**        | W3                  | **PACK-ONLY**                                     | Yes                                  | AccountingWorkspacePage:86                   | **No** — `pilotSurfaceSupported` only includes `payments` (line 48)                                                               | No (toggle only renders for payments tab)                                                                                  | classic          | **NO-SHIP** (P1: Mark Paid bypasses GL)       | Ledger exists                                                                                                                                                                     | **CRITICAL** — Classic void/mark-paid mutations don't pass `version` param so server version check never runs; client-side `INV-${Date.now()}` numbering. Pilot also NO-SHIP. | Wire version to existing guard; server-side numbering; fix pilot P1   |
| 11  | **Returns**         | W3                  | **PACK-ONLY**                                     | Yes                                  | SalesWorkspacePage:133                       | **No** — not in `pilotSurfaceSupported` (line 68-70); `useSpreadsheetPilotAvailability(false)` returns `sheetPilotEnabled: false` | No (no toggle for this tab)                                                                                                | classic          | **CONDITIONAL SHIP** (1 P2, 2 P3)             | Ledger: DISC-RET-001 (CRITICAL: double credit), DISC-RET-002-005 (HIGH: status in notes, double-restock, no approval UI, no vendor return UI)                                     | **HIGH** — CRITICAL double-credit risk (DISC-RET-001); 4 HIGH discrepancies; pilot is unreachable (not piggyback)                                                             | Fix double-credit; add to Phase 1                                     |
| 12  | **Quotes**          | W3                  | **NONE** (no detailed ledger)                     | Yes                                  | SalesWorkspacePage:122                       | **No** — not in `pilotSurfaceSupported` (line 68-70); `useSpreadsheetPilotAvailability(false)` returns `sheetPilotEnabled: false` | No (no toggle for this tab)                                                                                                | classic          | None                                          | Ledger: DISC-QUO-001 (uses orders.getAll), DISC-QUO-003 (stale: says no reject UI but pilot has it), DISC-QUO-004 (no expiry scheduler), DISC-QUO-006 (custom send not persisted) | **High** — Classic uses `orders.getAll` not quotes router; no rejection UI; pilot unreachable (not piggyback)                                                                 | Fix classic to use quotes router; surface rejection                   |
| 13  | **Samples**         | W3                  | **PACK-ONLY**                                     | Yes                                  | InventoryWorkspacePage:219                   | Yes (line 113)                                                                                                                    | **No** — samples tab omitted from command strip conditional (lines 142-160 only include `inventory`, `intake`, `shipping`) | classic          | None                                          | Ledger: DISC-SAM-001 (fulfill backend, no UI — Critical), DISC-SAM-002 (expiration, no UI — High), DISC-SAM-003 (due date hidden in notes text)                                   | **High** — Classic lacks fulfill/expiration; pilot wires `fulfillRequest` but NOT `setExpirationDate`; toggle never rendered                                                  | Add toggle to command strip; port fulfill to classic or surface pilot |

### Cross-Cutting: Shared Contracts

The rollout roadmap lists `Shared contracts (CROSS-001 to CROSS-005)` as pack-level-only work (README.md line 62). These cross-cutting contracts are absent from the module matrix above because they are not module-specific surfaces, but they are unresolved prerequisites that affect multiple modules.

**Assessment basis**: Pack capability ledger CSV rows (`CROSS-001` to `CROSS-005`), discrepancy log `STUB-CROSS-001`, and direct code inspection of `client/src/components/spreadsheet-native/`, `client/src/lib/powersheet/contracts.ts`, `client/src/components/work-surface/`, and `client/src/hooks/powersheet/`. Inspected 2026-03-22.

| ID        | Contract                                 | Priority | What It Covers                                                                                                     | Implementation Status          | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Blocking Risk                                                                                                                                                              |
| --------- | ---------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CROSS-001 | Shared selection, save-state, keyboard   | P0       | Consistent selection model, dirty-state cues, keyboard discoverability across all sheet surfaces                   | **Partial**                    | `PowersheetGrid.tsx`, `SpreadsheetPilotGrid.tsx`, `contracts.ts` define primitives. `PowersheetFieldPolicy` and `PowersheetEditRejection` are type-only interfaces — no shared toast/rejection UI component exists. `KeyboardHintBar` and `WorkSurfaceStatusBar` exist in `work-surface/` but are used per-surface, not cross-surface. No shared selection state or event bus. `STUB-CROSS-001` is the only preservation stub. `shared-foundation-capability-ledger.csv` planned but does not exist. | Each new module reimplements selection/edit-rejection independently. Inconsistent UX across surfaces. No central keyboard hint registry.                                   |
| CROSS-002 | Terminology policy                       | P1       | Visible label alignment to `TERMINOLOGY_BIBLE.md` across all pack docs and module surfaces                         | **Not verified**               | `docs/terminology/TERMINOLOGY_BIBLE.md` exists. No code-level enforcement. No automated check. Pack docs and pilot surfaces have not been audited for terminology drift since TERMINOLOGY_BIBLE was authored.                                                                                                                                                                                                                                                                                        | Teams building new modules may introduce label drift silently. No tooling to catch it.                                                                                     |
| CROSS-003 | Quotes adjacency                         | P0       | Quote-mode seeded order entry, `quoteId` route seed, `salesSheetToQuote` bridge                                    | **Partial — with P1 live bug** | `QuotesPilotSurface.tsx` exists and wires `quotes.reject`. Route seeding (`?quoteId=`) is implemented in `OrderCreatorPage`. However, both `QuotesWorkSurface.tsx:464` and `QuotesPilotSurface.tsx:591` use `orders.getAll` instead of the quotes router — a live data-ownership violation. Quotes pilot is completely unreachable (not in `pilotSurfaceSupported`).                                                                                                                                 | `orders.getAll` ownership bug is live in the classic path today (R4, HIGH). Quotes pilot unreachable means the bug-fix-in-pilot pattern is producing no user value.        |
| CROSS-004 | Live Shopping adjacency                  | P1       | Sales-sheet-to-live-session conversion bridge; Live Shopping route family visibility                               | **Verified — not broken**      | `salesSheets.convertToLiveSession` mutation exists. Live Shopping route family (`/live-shopping`) is present and not removed by spreadsheet-native migration. `SalesSheetPreview` conversion actions are wired. No spreadsheet-native surface directly conflicts with this adjacency.                                                                                                                                                                                                                | Low immediate risk. The bridge is intact. No regression detected. Formal proof via output proof and route proof still outstanding.                                         |
| CROSS-005 | Output, export, print, receipt contracts | P0       | Invoice PDF/print, payment receipt, `clientLedger.exportLedger`, Sales Sheet share link, PO/intake export behavior | **Partial**                    | `clientLedger.exportLedger` is wired in `ClientLedgerPilotSurface.tsx`. Invoice PDF/print path exists in `InvoicesWorkSurface.tsx`. `salesSheets.generateShareLink` is wired. However, three of the five planned capability ledgers that would formally verify output coverage do not exist: `invoices-capability-ledger.csv` (planned), `payments-capability-ledger.csv` (planned), `client-ledger-capability-ledger.csv` (planned). No cross-module output-regression test.                        | Output paths appear intact but have no formal proof. Spreadsheet-native migration could silently break invoice, payment, or export surface routing without a failing test. |

**Summary**:

- CROSS-001, CROSS-003, and CROSS-005 are **active prerequisites** — each has P0 items not yet formally closed.
- CROSS-002 is **unverified** — the policy doc exists but no audit has run.
- CROSS-004 is the only contract in a stable state, though formal proof is still outstanding.
- No `shared-foundation-capability-ledger.csv` exists. This was the planned deliverable to close out CROSS-001 and CROSS-005; it has not been created.
- These contracts are not assigned to any phase in the current remediation plan. Phase 4 task 4.5 notes "Address shared contracts (CROSS-001 through CROSS-005)" but leaves it unspecified. The status documented above should feed that task.

### Reachability Model Clarification

The surfacing architecture has four independent checkpoints. A module is only truly reachable when ALL four pass:

1. **`pilotSurfaceSupported`** — tab is in the check → controls flag polling via `useSpreadsheetPilotAvailability`
2. **Toggle rendered** — `SheetModeToggle` appears in the command strip for this tab
3. **URL/direct-route reachable** — legacy redirects and standalone pages resolve to the correct tab
4. **`SHEET_NATIVE_DEFAULTS`** — controls whether sheet-native is the default without URL param

Quotes and Returns fail checkpoint 1, making them **unreachable** (not "indirectly reachable via piggyback" as originally stated). When `pilotSurfaceSupported` is false, `sheetPilotEnabled` is hard-coded to `false` regardless of the feature flag state (pilotAvailability.ts:30-34).

---

## 2. Crack Registry (Verified)

### A. Source-of-Truth Drift (CONFIRMED)

| Finding                                                                                       | Evidence                                                                                                                     | Severity                                                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Roadmap says Payments/Client Ledger are PACK-ONLY with no pilot                               | `W1C-payments.md:12`, `W1D-client-ledger.md:13` say "Pilot surface: DOES NOT EXIST"                                          | **Critical drift** — both pilots exist, one has SHIP verdict |
| Wave sequencing violated                                                                      | W2 (Fulfillment) and W3 (Invoices, Returns) modules built and reviewed before W1 honestly closed                             | **Critical drift**                                           |
| Gate rule "no implementation starts until parity gap report shows zero unclassified" violated | `README.md:18` states the rule; 7 modules are PACK-ONLY yet have implementations                                             | **Critical drift**                                           |
| Capability ledgers stale in both directions                                                   | Quotes ledger says "no rejection UI" (DISC-QUO-003) but pilot has it; Samples ledger says "no fulfill UI" but pilot wires it | **High** — docs unreliable                                   |

### B. Built But Not Properly Surfaced (CONFIRMED)

| Module        | Issue                                                                                   | Evidence                                                                      |
| ------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Invoices      | `pilotSurfaceSupported` excludes invoices tab entirely                                  | `AccountingWorkspacePage.tsx:48` — only `payments`                            |
| Quotes        | Not in `pilotSurfaceSupported`; `sheetPilotEnabled` hard-returns false                  | `SalesWorkspacePage.tsx:68-70` + `pilotAvailability.ts:30-34`                 |
| Returns       | Same as Quotes — completely unreachable, not piggyback                                  | `SalesWorkspacePage.tsx:68-70` + `pilotAvailability.ts:30-34`                 |
| Samples       | In `pilotSurfaceSupported` (line 113) but toggle missing from command strip conditional | `InventoryWorkspacePage.tsx:142-160` — only `inventory`, `intake`, `shipping` |
| Direct Intake | Tab `intake` is surfaced, but legacy routes redirect to `receiving` not `intake`        | `App.tsx` legacy redirects                                                    |

### C. Surfaced But Not Proof-Complete (CONFIRMED)

| Module      | Status                                                                                       | Evidence                                                              |
| ----------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Orders      | Default sheet-native, 16/35 parity rows `partial`, 5 `blocked`, 1 `implemented-not-surfaced` | `pilot-ledgers-parity-proof-plan.md`                                  |
| Inventory   | Toggle visible, bulk delete staging 500, 5 `partial` rows                                    | `OPS-INV-006: [live-failing]`                                         |
| Payments    | Toggle visible, NO-SHIP verdict                                                              | `consolidated-verdict.md:13` — PAY-P1 cache stale grids               |
| Fulfillment | Toggle visible, SHIP but 10 discrepancies                                                    | `fulfillment-capability-ledger-summary.md` — DISC-FUL-001 through 010 |

### D. Hidden Pilot Fixes Not Helping Real Users (CONFIRMED)

| Classic Gap                                                                | Pilot Fix                                                           | Evidence                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invoices: void/mark-paid don't pass `version` param; client-side numbering | Pilot exists but NO-SHIP and unreachable                            | `InvoicesWorkSurface.tsx:712-745` (mutations missing version), `:1252` (`INV-${Date.now()}`). Server version check exists at `invoices.ts:480` but never receives version. |
| Quotes: uses `orders.getAll`, no rejection UI                              | Pilot has `quotes.reject` mutation                                  | `QuotesWorkSurface.tsx:460-467`, `QuotesPilotSurface.tsx:746-756`                                                                                                          |
| Samples: no fulfill/expiration in classic                                  | Pilot wires `samples.fulfillRequest` only (not `setExpirationDate`) | `SampleManagement.tsx:375-420` vs `SamplesPilotSurface.tsx:445`. `setExpirationDate` exists server-side (`samples.ts:554`) but is not wired in either surface.             |

### E. Adversarial Review Open Risks Not Captured Elsewhere (added by Phase 0 cross-check, 2026-03-22)

These items were called out in `docs/specs/spreadsheet-native-ledgers/pilot-ledgers-adversarial-review.md` but were absent from earlier versions of this document.

| Risk ID              | Adversarial Finding                                                                                                                                                                                                                                                                  | Severity              | Action                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------- |
| AR-003 / INV-D005    | Gallery mode reads `photography.getBatchImages`; saved views have shared/private ownership rules. A spreadsheet-native fork could lose thumbnails, leak saved views across users, or swallow photography ownership. Not visible in the Inventory matrix row or any prior phase task. | **Medium**            | Cover in Inventory adversarial review (Phase 3.1) |
| AR-004 / OPS-INV-005 | Bulk delete undo window (10-second) and zero-on-hand delete eligibility guard. Inventory matrix row only tracks the staging 500 (OPS-INV-006); undo/eligibility guardrails are not tracked separately.                                                                               | **Medium**            | Cover in Inventory adversarial review (Phase 3.1) |
| INV-D006             | Open and non-blueprint-blocking per adversarial review "Remaining Open Risks." INV-D004 and INV-D007 were closed by the 2026-03-14 ownership seams memo.                                                                                                                             | **Low**               | Tracked here; no Phase 0-3 action required        |
| ORD-D010             | Download Invoice button is visually present in the orders inspector but has no wired workbook handler. Confirmed inert by live staging proof. Open and non-blueprint-blocking per adversarial review.                                                                                | **Low**               | Tracked here; no Phase 0-3 action required        |
| AR-009 process risk  | Summary `.md` classification counts had drifted from the CSV rows they described; both summaries were rebuilt from CSV state. The specific failure mode — trusting a summary over its source CSV — was not previously codified as a prevention rule.                                 | **High process risk** | See Rule 8 added to Section 4                     |

### F. User-Visible Integrity Risks (CONFIRMED, ranked)

| Risk | Severity     | Module        | Description                                                                                                                                                      |
| ---- | ------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1   | **CRITICAL** | Invoices      | Classic void/mark-paid mutations don't pass `version` param so server version check never runs; client-side `INV-${Date.now()}` numbering creates collision risk |
| R2   | **CRITICAL** | Returns       | DISC-RET-001: `returns.create` and `returns.process` both independently issue credit memos — double-credit risk                                                  |
| R3   | **HIGH**     | Returns       | DISC-RET-002-005: status in notes text (no column), double-restock risk, approval workflow (4 procedures) has zero UI, vendor return path has no UI              |
| R4   | **HIGH**     | Quotes        | Classic path queries `orders.getAll` instead of quotes router — data ownership violation; no rejection UI                                                        |
| R5   | **HIGH**     | Samples       | Classic lacks fulfill/expiration actions users need — backend exists but neither surface wires `setExpirationDate`                                               |
| R6   | **HIGH**     | Payments      | NO-SHIP pilot visible via toggle; cache namespace causes stale data across surfaces                                                                              |
| R7   | **MEDIUM**   | Fulfillment   | SHIP verdict but permission mismatch (DISC-FUL-006), inert version check (DISC-FUL-005), missing audit logs (DISC-FUL-003)                                       |
| R8   | **MEDIUM**   | Orders        | Default sheet-native with 16 partial + 5 blocked + 1 implemented-not-surfaced proof rows                                                                         |
| R9   | **MEDIUM**   | Direct Intake | Legacy route redirects point to `receiving` not `intake` — users following old URLs won't reach the pilot                                                        |

---

## 3. Remediation Roadmap

### Phase 0: Truth Reconciliation (no code changes)

**Goal**: One trustworthy operating picture before any code. This document becomes canonical only AFTER Phase 0 verifies it.

| #    | Task                                                                                                                                                                                        | Deliverable                           | Effort |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------ |
| 0.1  | Update roadmap README.md to reflect actual implementation state for all 13 modules                                                                                                          | Roadmap matches repo                  | M      |
| 0.2  | Update W1C-payments.md and W1D-client-ledger.md briefs                                                                                                                                      | Briefs reflect pilots exist + verdict | S      |
| 0.3  | Update quotes-capability-ledger-summary.md (DISC-QUO-003 resolved in pilot; add DISC-QUO-004/006)                                                                                           | Ledger accurate                       | S      |
| 0.4  | Update samples-capability-ledger-summary.md (DISC-SAM-001 partially resolved in pilot; add SAM-003)                                                                                         | Ledger accurate                       | S      |
| 0.5  | Update returns-capability-ledger-summary.md — pilot now has approve/reject/receive UI (ReturnsPilotSurface.tsx:1008) but ledger still says "no UI"                                          | Ledger accurate                       | S      |
| 0.5b | Update invoices-capability-ledger-summary.md — pilot fixes documented but ledger still shows pre-fix state                                                                                  | Ledger accurate                       | S      |
| 0.5c | Update payments-capability-ledger-summary.md — pilot has void UI (PaymentsPilotSurface.tsx:881) but DISC-PAY-005 says "no UI surface"                                                       | Ledger accurate                       | S      |
| 0.5d | Update fulfillment-capability-ledger-summary.md — DISC-FUL-006 already resolved in pilot (FulfillmentPilotSurface.tsx:607)                                                                  | Ledger accurate                       | S      |
| 0.6  | Reclassify wave structure in README to match reality (implementation has outrun waves)                                                                                                      | Wave structure honest                 | M      |
| 0.7  | Review `pilot-ledgers-adversarial-review.md` and incorporate its classification-drift warnings — **DONE** (2026-03-22): 5 gaps added to crack registry Section E; Rule 8 added to Section 4 | Cross-check complete                  | S      |
| 0.8  | Document shared contracts (CROSS-001 through CROSS-005) status                                                                                                                              | Cross-cutting gaps visible            | S      |

**Stop/go**: Phase 0 complete when all doc claims verified against code. Matrix corrections applied. No code changes needed.

### Phase 1: Fix Visible-User Risks (CRITICAL + HIGH)

**Goal**: No user-facing integrity risk on any visible path.

| #   | Task                                                      | Risk Addressed | Approach                                                                                                                                                                     | Effort |
| --- | --------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1 | **Invoices: server-side invoice numbering**               | R1             | Replace `INV-${Date.now()}` with server-controlled sequence in create mutation                                                                                               | M      |
| 1.2 | **Invoices: wire version param to existing server guard** | R1             | Pass `version` from selected invoice state into `markPaidMutation` and `voidMutation` — server check at `invoices.ts:480` already exists but never receives it               | M      |
| 1.3 | **Returns: fix double-credit risk**                       | R2             | Audit `returns.create` and `returns.process` credit memo issuance; ensure only one path issues credit, or add idempotency guard                                              | L      |
| 1.4 | **Returns: surface approval workflow**                    | R3             | Wire approve/reject/receive/process actions into classic ReturnsPage or pilot                                                                                                | L      |
| 1.5 | **Quotes: migrate BOTH surfaces to quotes router**        | R4             | Replace `trpc.orders.getAll` with `trpc.quotes.list` (or equivalent) in BOTH `QuotesWorkSurface.tsx:464` AND `QuotesPilotSurface.tsx:591` — pilot has the same ownership bug | L      |
| 1.6 | **Quotes: surface rejection in classic**                  | R4             | Add reject action to `QuotesWorkSurface.tsx` (port from pilot's `quotes.reject` pattern)                                                                                     | M      |
| 1.7 | **Samples: surface fulfill in classic**                   | R5             | Add `samples.fulfillRequest` action to `SampleManagement.tsx`; `setExpirationDate` needs server-side wire in both surfaces                                                   | M      |
| 1.8 | **Payments: fix cache namespace stale grids**             | R6             | Align PaymentsPilotSurface and InvoicesPilotSurface to same tRPC cache key, or add cross-namespace invalidation                                                              | M      |

**Stop/go**: Phase 1 complete when each fix passes `pnpm check && pnpm lint && pnpm test && pnpm build` and has targeted test coverage. No new pilots surfaced during this phase.

### Phase 2: Fix Surfacing Truth

**Goal**: Every module's toggle and pilot reachability matches its documented state.

**Important**: Adding a module to `pilotSurfaceSupported` is not just a render change — it changes feature-flag polling behavior, URL `?surface=` param stripping, and user discoverability semantics. Each change below requires route/UI tests.

| #   | Task                                                            | Issue                                                                                          | Approach                                                                                         | Effort |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| 2.1 | **Samples: add toggle to command strip**                        | `pilotSurfaceSupported` is true but toggle never rendered                                      | Add `samples` to InventoryWorkspacePage command strip conditional (lines 142-160) + UI test      | S      |
| 2.2 | **Invoices: add to `pilotSurfaceSupported` + render toggle**    | Not in `pilotSurfaceSupported`; toggle never renders                                           | Add `invoices` to AccountingWorkspacePage (line 48); add toggle to command strip; add route test | M      |
| 2.3 | **Quotes: add to `pilotSurfaceSupported` + render toggle**      | Not in `pilotSurfaceSupported`; pilot completely unreachable                                   | Add `quotes` to SalesWorkspacePage (line 68-70); add toggle to command strip; add route test     | M      |
| 2.4 | **Returns: add to `pilotSurfaceSupported` + render toggle**     | Same as Quotes                                                                                 | Add `returns` to SalesWorkspacePage (line 68-70); add toggle to command strip; add route test    | M      |
| 2.5 | **Direct Intake: fix legacy route redirects**                   | Legacy `/product-intake`, `/intake` redirect to `receiving` not `intake`                       | Update App.tsx redirects to point at `tab=intake`                                                | S      |
| 2.6 | **Fulfillment: verify DISC-FUL-006 fix + add regression test**  | DISC-FUL-006 already fixed in pilot (FulfillmentPilotSurface.tsx:607-610 uses `orders:update`) | Verify fix, update ledger, add permission regression test                                        | S      |
| 2.7 | **Fulfillment: populate version for concurrent-edit detection** | DISC-FUL-005                                                                                   | Wire version field from server response into mutation payload                                    | M      |

**Stop/go**: Phase 2 complete when every module that has a pilot also has an independently reachable toggle (when pilot flag is on) — verified by the 4-checkpoint reachability model. Each toggle addition has a route/UI test.

### Phase 3: Proof Debt

**Goal**: Every surfaced module has a formal SHIP/NO-SHIP verdict.

| #   | Task                                               | Modules                                                                          | Approach                                                                                                                         | Effort |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 3.1 | **Run adversarial review on unreviewed surfaces**  | Orders, Inventory, Sales Sheets, Direct Intake, Purchase Orders, Quotes, Samples | Per-module: read pilot + classic source, run against review rubric in `docs/qa/`, produce structured verdict with P0-P3 findings | L      |
| 3.2 | **Complete parity proof for Orders**               | Orders                                                                           | Re-run SALE-ORD-003 through SALE-ORD-035 on staging; promote `code-proven` and `partial` rows                                    | L      |
| 3.3 | **Fix Inventory staging 500**                      | Inventory (OPS-INV-006)                                                          | Debug `inventory.bulk.delete` mutation on staging                                                                                | M      |
| 3.4 | **Re-run Payments verdict after P1 fix**           | Payments                                                                         | Repeat adversarial review post-1.8                                                                                               | M      |
| 3.5 | **Re-run Invoices verdict after classic fixes**    | Invoices                                                                         | Repeat adversarial review post-1.1/1.2                                                                                           | M      |
| 3.6 | **Re-run Returns verdict after double-credit fix** | Returns                                                                          | Repeat adversarial review post-1.3/1.4                                                                                           | M      |

**Stop/go**: Phase 3 complete when every surfaced module has a verdict of SHIP or CONDITIONAL SHIP with only P3 residuals. Any NO-SHIP blocks Phase 4 for that module.

### Phase 4: Roadmap Rebuild

**Goal**: Official roadmap reflects repo truth and is future-proof.

| #   | Task                                                         | Deliverable                                                                                                              |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 4.1 | Reissue atomic roadmap from current repo state               | New README.md with modules classified as: `visible-and-safe`, `visible-but-not-safe`, `built-but-hidden`, `planned-only` |
| 4.2 | Archive stale wave briefs that claimed pilots don't exist    | Move to `briefs/archive/`                                                                                                |
| 4.3 | Update SHEET_NATIVE_DEFAULTS as modules achieve <5% fallback | Per-module default promotion                                                                                             |
| 4.4 | Define classic retirement criteria per module                | Retirement checklist in roadmap                                                                                          |
| 4.5 | Address shared contracts (CROSS-001 through CROSS-005)       | Cross-cutting work planned or resolved                                                                                   |

### Phase 5: Classic-Pilot Convergence (future)

**Goal**: Eliminate duplicate behavior paths.

For each module, decide:

- **Stabilize classic only** — if pilot adds no value
- **Stabilize pilot and surface** — if pilot is strictly better
- **Hybridize** — port best fixes to classic, defer full pilot
- **Defer** — not ready for convergence

This phase starts only after Phase 3 is fully closed.

---

## 4. Prevention Protocol

### Rules to Stop Recurrence

These rules are the operating contract for all future agents working on spreadsheet-native:

#### Rule 1: Status Alignment

Every module's status MUST include three independent fields:

```
implemented_state: yes | no
surfacing_state: default | toggle-reachable | unreachable | not-built
proof_state: SHIP | CONDITIONAL-SHIP | NO-SHIP | no-verdict
```

If these three are not aligned, the module status is `partial`. Period.

#### Rule 2: Reachability Is a 4-Checkpoint Test

A module is only "surfaced" when ALL four pass:

1. `pilotSurfaceSupported` includes the tab (controls flag polling)
2. `SheetModeToggle` renders in the command strip for the tab
3. URL/direct-route resolves to the correct tab (no legacy redirect mismatch)
4. `SHEET_NATIVE_DEFAULTS[moduleId]` is set if claiming default exposure

Failing any checkpoint means the module is unreachable, regardless of whether the pilot component exists and is route-wired.

#### Rule 3: No Proofless Done Claims

Never treat any of these as proof of user availability:

- Component file exists → only proves `implemented_state`
- Route branch exists → only proves code is wired, not reachable
- Test file passes → only proves unit correctness
- Pilot flag gates it → must verify all 4 reachability checkpoints
- Roadmap says "complete" → must verify against route wiring + QA verdict

#### Rule 4: No Hidden Pilot Fix Graveyards

If a pilot fixes a problem that the visible classic path still has:

- **Port the fix to classic**, OR
- **Surface the pilot with an independent toggle**, OR
- **Document it as a known visible-path risk with a ticket**

Never leave a correctness fix trapped behind an unreachable pilot.

#### Rule 5: Roadmap Tracks Repo, Not Intent

After any implementation work:

1. Update the module's row in this matrix
2. Update any brief that claims the pilot doesn't exist
3. Update any ledger that claims a capability doesn't exist when it does

If the roadmap and repo disagree, the roadmap is wrong. Always.

#### Rule 6: Wave Gates Are Descriptive, Not Prescriptive

Waves describe intended order. If implementation outran waves (as happened here), update the wave structure to match reality. Do not pretend waves were followed when they weren't.

#### Rule 7: Ledger Currency

Capability ledgers must be refreshed after any pilot implements a discrepancy fix. If DISC-XXX-NNN is resolved in code, update the ledger within the same PR.

#### Rule 8: Summaries Must Be Rebuilt from CSV State, Not from Other Summaries

When verifying or updating a capability ledger summary, always recount classification rows directly from the source CSV. Never copy or infer counts from a prior summary document. Summary `.md` files can silently drift from their source CSVs — this was the root cause of the `AR-009` finding in the adversarial review, where both inventory and orders summary counts had diverged from the actual CSV rows. If a summary count disagrees with a direct CSV count, the CSV is authoritative.

---

## 5. Execution Order

### Recommended Sequence

```
Phase 0 (truth reconciliation)     → 1-2 days
  └─ 0.1-0.8 in parallel (all doc-only)

Phase 1 (visible user risks)       → 5-7 days
  ├─ 1.1 + 1.2 (Invoices safety)   → can parallel with others
  ├─ 1.3 + 1.4 (Returns safety)    → can parallel with others
  ├─ 1.5 + 1.6 (Quotes ownership)  → can parallel with others
  ├─ 1.7 (Samples actions)         → can parallel with others
  └─ 1.8 (Payments cache)          → can parallel with others

Phase 2 (surfacing truth)          → 2-3 days
  ├─ 2.1 (Samples toggle)          → S, independent
  ├─ 2.2 (Invoices toggle + test)  → M, independent
  ├─ 2.3 (Quotes toggle + test)    → M, independent
  ├─ 2.4 (Returns toggle + test)   → M, independent
  ├─ 2.5 (Direct Intake redirects) → S, independent
  └─ 2.6 + 2.7 (Fulfillment)      → M, independent

Phase 3 (proof debt)               → 5-7 days
  ├─ 3.1 (7 modules need review)   → can run in parallel batches
  ├─ 3.2 (Orders parity)           → sequential, needs staging
  ├─ 3.3 (Inventory staging fix)   → independent
  ├─ 3.4 (Payments re-verdict)     → must follow 1.8
  ├─ 3.5 (Invoices re-verdict)     → must follow 1.1/1.2
  └─ 3.6 (Returns re-verdict)      → must follow 1.3/1.4

Phase 4 (roadmap rebuild)          → 1-2 days
  └─ 4.1-4.5 (doc work after code stabilizes)
```

### Stop/Go Criteria

| Gate        | Condition to proceed                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Phase 0 → 1 | All doc claims verified against code. Matrix corrections applied.                                   |
| Phase 1 → 2 | All CRITICAL and HIGH user risks fixed. `pnpm check && pnpm lint && pnpm test && pnpm build` green. |
| Phase 2 → 3 | Every pilot passes all 4 reachability checkpoints. Route/UI tests added.                            |
| Phase 3 → 4 | Every surfaced module has SHIP or CONDITIONAL SHIP (P3 only).                                       |
| Phase 4 → 5 | Roadmap fully reconciled. This document superseded by updated roadmap.                              |

### Parallelization Strategy

- Phase 1 tasks are fully independent — use `isolation: worktree` for concurrent agents
- Phase 2 tasks require route/UI tests per module — can run 2-3 in parallel but not as simple as single-line changes
- Phase 3 reviews can run 2-3 in parallel but need careful staging coordination

---

## 6. Evidence States Used in This Document

| State                    | Meaning                                               |
| ------------------------ | ----------------------------------------------------- |
| `open`                   | Not started, no evidence                              |
| `partial`                | Some evidence exists but gaps remain                  |
| `closed-with-evidence`   | Complete with cited proof artifacts                   |
| `rejected-with-evidence` | Intentionally not done, with documented justification |

Every claim in this document is traced to a specific file and line number. If a claim lacks a file reference, it is an assertion that should be independently verified.

---

## Appendix A: Codex Adversarial Review Findings (2026-03-22)

**Reviewer**: Codex gpt-5.4, full-auto, disk-read sandbox
**Verdict**: NO-SHIP → corrections applied below

### ERRORS fixed:

1. **Orders proof-state counts wrong** → Corrected to 4 live-proven, 9 code-proven, 16 partial, 5 blocked, 1 implemented-not-surfaced
2. **Inventory partial count off by 1** → Corrected to 5 partial
3. **Quotes/Returns reachability model wrong** → Changed from "indirect piggyback" to "unreachable" — `pilotSurfaceSupported=false` hard-returns `sheetPilotEnabled=false`
4. **Samples matrix self-contradictory** → Clarified: `pilotSurfaceSupported=yes` but toggle not rendered; pilot only wires `fulfillRequest`, NOT `setExpirationDate`
5. **Several file:line anchors imprecise** → Corrected Purchase Orders and Client Ledger line refs
6. **Invoices fix description imprecise** → Changed from "add optimistic locking" to "wire version param to existing server guard"
7. **Fulfillment discrepancy count wrong** → Corrected from 9 to 10

### GAPS filled:

1. **Returns re-ranked** → Elevated from Low to HIGH/CRITICAL (DISC-RET-001 double credit, 4 HIGH discrepancies)
2. **Additional discrepancies added** → DISC-QUO-004/006, DISC-SAM-003, DISC-RET-001-005, DISC-PAY-005
3. **Direct Intake legacy redirect mismatch** → Added as surfacing issue and Phase 2 task
4. **Shared contracts (CROSS-001 to CROSS-005)** → Added as cross-cutting gap
5. **`pilot-ledgers-adversarial-review.md`** → Added to Phase 0 reconciliation

### LOGIC fixes:

1. **Phase 1→2 stop/go gate** → Fixed to require all 4 verification commands, not just 2
2. **Phase 2 success criterion** → Expanded from "toggle exists" to 4-checkpoint reachability model
3. **Phase 2 effort estimates** → Upgraded from S to M where route/UI tests needed
4. **Status changed from ACTIVE to DRAFT** → Document not canonical until Phase 0 verifies it

### Additional findings from second Codex run (same session):

5. **DISC-FUL-006 already fixed in pilot** → FulfillmentPilotSurface.tsx:607-610 already uses `orders:update`. Changed Phase 2 task from "fix" to "verify + regression test"
6. **QuotesPilotSurface also uses `orders.getAll`** → QuotesPilotSurface.tsx:591. Updated Phase 1 task 1.5 to fix BOTH classic and pilot
7. **Phase 0 scope too small** → Added 4 additional ledger updates (returns, invoices, payments, fulfillment) where pilot code has resolved discrepancies but ledgers are stale
8. **Entry-path topology under-covered** → Noted: `/client-ledger` vs `/clients/:clientId/ledger`, `pick-pack` normalization to `shipping`, procurement aliases need route audit in Phase 2
9. **Phase 3.2 not executable as written** → Acknowledged: Orders proof plan has runtime tranche dependencies; "re-run all" oversimplifies the sequencing
