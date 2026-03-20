# Spreadsheet-Native Full Rollout — Master Plan v2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll out PowersheetGrid sheet-native surfaces to all applicable TERP modules, prove zero capability regression per module, flip defaults with telemetry, and retire classic WorkSurface components incrementally.

**Architecture:** Each module gets a `*PilotSurface.tsx` wrapping PowersheetGrid with module-specific queries, mutations, affordances, and field policies. A SheetModeToggle lets users switch during transition. Classic surfaces are removed per-module after usage monitoring confirms low fallback reliance.

**Tech Stack:** React 19, AG Grid Enterprise (PowersheetGrid wrapper), tRPC, Tailwind 4, shadcn/ui, Vitest, Playwright.

---

## North Star

**TERP becomes a spreadsheet-first ERP.** Every data-dense surface renders through PowersheetGrid with consistent selection, clipboard, fill, and keyboard behavior. Classic surfaces are retired module-by-module based on evidence, not a calendar.

**Definition of Done:** Every module with a classic WorkSurface has a sheet-native PilotSurface that passes gate verification, its default is flipped to sheet-native, and its classic component is removed after a monitored soak period.

---

## Honest Current State

### Orders Pilot: Foundation Reusable, Initiative NOT Retired

- G5: closed with evidence
- G6: `partial` — SALE-ORD-029, SALE-ORD-035 still code-proven; 020/021/031 are limitations
- G7: `open` — retirement blocked per charter until G6 reaches proof-complete
- `initiative_status: "reopened"`, `gates_closed: 5` of 7
- **Foundation IS reusable** — PowersheetGrid, SpreadsheetPilotGrid, contracts, CSS all generalized
- **Initiative is NOT done** — treated as background track, not blocking rollout

### Built Surfaces (G2 complete, G3 pending)

| Surface                          | Lines | Toggle Wired           |
| -------------------------------- | ----- | ---------------------- |
| `OrdersSheetPilotSurface.tsx`    | 805   | SalesWorkspacePage     |
| `InventorySheetPilotSurface.tsx` | 1,046 | InventoryWorkspacePage |
| `SalesSheetsPilotSurface.tsx`    | 1,057 | SalesWorkspacePage     |

### Capability Ledgers Ready (G2 unblocked)

| Module          | Rows         | Discrepancies |
| --------------- | ------------ | ------------- |
| Payments        | 20           | 6             |
| Client Ledger   | 12           | 3             |
| Direct Intake   | existing CSV | existing log  |
| Purchase Orders | existing CSV | existing log  |

### Need Architect Pass (G1 pending)

Fulfillment, Invoices, Returns, Quotes, Samples

---

## Module Families

Modules that share the same layout/interaction pattern reuse patterns from the family leader.

| Family                    | Pattern                                                                           | Leader (proven)          | Followers                                   |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------- |
| **Queue + Detail**        | Dominant queue grid, selected-row document/inspector, workflow actions            | Orders                   | Purchase Orders, Direct Intake, Fulfillment |
| **Ledger + Inspector**    | Client-gated transaction grid, right-rail inspector, KPI cards, adjustment dialog | (Payments — first build) | Client Ledger                               |
| **Browser + Preview**     | Inventory/catalog browser, preview pane, conversion actions                       | Sales Sheets             | (none currently)                            |
| **Registry + Actions**    | Read-only registry grid, row-scoped action buttons, status transitions            | (Invoices — first build) | Quotes                                      |
| **Table + Support Cards** | Dominant data table, companion support cards for exception/expiry work            | Inventory                | Samples, Returns                            |

**Why families matter:** The first module in each family pays the "pattern discovery" cost. Followers reuse the pattern and build faster. QA for followers is lighter because the family pattern is already proven.

---

## Gate Model

### Family-first modules: 4 gates

| Gate | Name              | Exit Criteria                                                                                                                   |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| G0   | Family Readiness  | Starter kit doc covers this family's pattern. Shared primitives confirmed working for this layout type.                         |
| G1   | Capability Ledger | Detailed ledger locked. Every capability classified as preserved/adapted/deferred/rejected. Zero unclassified.                  |
| G2   | Implementation    | PilotSurface renders. All preserved/adapted capabilities work. Affordances, hints, cues. `pnpm check && lint && test && build`. |
| G3   | Deployed Proof    | Staging proof per capability. Classic toggle works. Route handoffs verified. Adversarial QA passes.                             |

### Family-follower modules: 3 gates (G0 already proven)

G1 → G2 → G3

---

## Revised Epic Structure

### Epic A: Starter Kit + Family Contracts (1 session, front-loaded)

The code generalization is already merged (commit `e6566daf`). What's missing is the documentation that tells future agents what to reuse and what not to silently drop.

- [ ] **A1:** Write `docs/specs/spreadsheet-native-foundation/STARTER-KIT.md`
  - Required primitives: PowersheetGrid, SpreadsheetPilotGrid, WorkSurfaceStatusBar, KeyboardHintBar, InspectorPanel
  - Layout options by family (queue+detail, ledger+inspector, browser+preview, registry+actions, table+cards)
  - Field policy conventions: `powersheet-cell--editable` / `powersheet-cell--locked`
  - Blocked-edit behavior: toast.warning with 300ms dedup pattern
  - Keyboard hints: platform-detected mod key, context-specific per surface
  - Affordance matrix: `PowersheetAffordance[]` per surface
  - Proof expectations: per-capability staging screenshot + classic toggle test
  - What must never be silently dropped: mutations, queries, keyboard shortcuts, route handoffs, confirmation dialogs

- [ ] **A2:** Define family taxonomy (table above) and document which family each module belongs to

- [ ] **A3:** Add per-module usage instrumentation plan
  - Track `?surface=classic` fallback clicks per module per session
  - Track sheet-native vs classic route hits via existing analytics
  - Define "safe to flip default" threshold: <5% classic usage over 2 weeks

- [ ] **A4:** Close or document Orders G6/G7 remaining items
  - SALE-ORD-029, 035: accept as code-proven limitations or capture live proof
  - SALE-ORD-020, 021, 031: document as accepted limitations in G7
  - Update `initiative_status` to reflect accurate state

### Epic B: Wave 1 Completion (2-3 sessions)

**Family: Ledger + Inspector (first family build)**

**Session B1: Payments + Client Ledger implementation (parallel agents)**

_Agent 1: Payments (TER-812)_ — family leader for ledger+inspector

- Input: `docs/specs/spreadsheet-native-ledgers/payments-capability-ledger-summary.md`
- Build: `PaymentsPilotSurface.tsx` — registry grid + guided commit sidecar
- 8 P0 capabilities (PAY-001/002/006/007/008/011/012/014)
- Fixes: wire `previewPaymentBalance`, add void UI, fix dead sendReceipt toggle
- Toggle: AccountingWorkspacePage payments tab
- Family output: document "ledger+inspector family" reuse patterns

_Agent 2: Client Ledger (TER-813)_ — family follower

- Input: `docs/specs/spreadsheet-native-ledgers/client-ledger-capability-ledger-summary.md`
- Build: `ClientLedgerPilotSurface.tsx` — client selector + transaction grid + inspector + KPI cards
- Constraints: running balance visible with inspector open, 5-source balance, two-step adjustment
- Toggle: standalone client-ledger route

**Session B2: Targeted QA — Payments + Client Ledger only**

- Adversarial review of the 2 NEW surfaces only (not Inventory/Sales Sheets yet)
- Per-capability verification against the capability ledger
- If Payments fails, fix Payments. Don't muddy with Inventory issues.
- Output: SHIP/NO_SHIP per surface

**Session B3: Wave 1 sweep — all 4 surfaces**

- Lighter parity check for Inventory + Sales Sheets (already built, just need proof)
- Route handoff testing across all 4 surfaces
- Classic toggle verification on each workspace page
- Output: Wave 1 SHIP/NO_SHIP

### Epic C: Operations Document Family (2-3 sessions)

**Family: Queue + Detail (Orders is the proven leader)**

**Session C0: Fulfillment architect pass (can overlap with B1)**

- Read-only analysis — no code changes, no conflicts
- Input: `PickPackWorkSurface.tsx` (1,642 lines) + extraction CSV
- Output: `docs/specs/spreadsheet-native-ledgers/fulfillment-capability-ledger-summary.md`
- Mobile touch target requirements documented

**Session C1: Direct Intake + Purchase Orders (parallel agents)**

_Agent 1: Direct Intake (TER-815)_

- Input: existing detailed ledger
- Build: `IntakePilotSurface.tsx`
- Key: direct vs PO-linked intake are SEPARATE workflows
- Toggle: InventoryWorkspacePage intake tab

_Agent 2: Purchase Orders (TER-816)_

- Input: existing detailed ledger
- Build: `PurchaseOrdersPilotSurface.tsx`
- Key: 2,909 lines — largest surface. May need sub-task breakdown by capability group.
- Key: row-scoped receiving handoff, COGS management
- Toggle: PurchaseOrders workspace page

**Session C2: Fulfillment implementation (TER-817)**

- Builds AFTER Intake and PO so the ops queue+detail grammar is proven on 2 surfaces
- Input: capability ledger from C0
- Build: `FulfillmentPilotSurface.tsx`
- Key: MOBILE-FIRST — test touch targets, tap areas, scroll behavior
- Key: Fulfillment language (not "Shipping")
- Toggle: fulfillment route

**Session C3: Ops family QA**

- Touch target testing for Fulfillment
- Status workflow verification (pick → pack → ready → ship)
- Handoff testing (PO → Intake, Order → Fulfillment)
- Document "queue+detail family" reuse notes

### Epic D: Specialized Surfaces (2-3 sessions)

**Mixed families — each module assessed individually**

**Session D0: Architect all 4 in parallel (read-only, safe)**

For each module, answer the adversarial question BEFORE coding:

> "Should this be fully sheet-native, or hybrid with support panes/cards remaining primary?"

_Invoices_ (1,308 lines) — likely registry+actions family
_Returns_ (577 lines) — likely table+support cards (exception queue)
_Quotes_ (931 lines) — likely conversion flow, NOT a standalone grid
_Samples_ (839 lines) — likely table+support cards (9 mutations, support cards for expiry/returns)

**Session D1: Implementation — paired by family**

- Invoices + Quotes (if both are registry-like)
- Returns + Samples (both table+support cards)

**Session D2: Specialized QA**

- Invoices: PDF generation, payment handoff, status transitions
- Quotes: quote-to-order conversion flow, not just a grid
- Returns: restock decision, vendor return path, order-linked context
- Samples: return/vendor-return procedures, expiry tracking, support card visibility

### Epic E: Default Flip + Soak (1-2 sessions)

**Per-module, not global. Safest first.**

- [ ] **E1:** Add per-module default config:
  ```ts
  const sheetNativeDefault: Record<string, boolean> = {
    inventory: true, // most proven, lowest risk
    "sales-sheets": true,
    orders: true,
    // ... others flipped as they pass soak
  };
  ```
- [ ] **E2:** Flip safest modules first (Inventory, Sales Sheets)
- [ ] **E3:** Monitor `?surface=classic` fallback rate per module for 2 weeks
- [ ] **E4:** Flip next batch when fallback rate < 5%
- [ ] **E5:** Continue until all modules default to sheet-native

### Epic F: Classic Retirement (incremental, per-module)

**NOT one 13K-line delete. Per-module retirement when safe.**

For each module with low fallback usage and clean soak:

- [ ] **F1:** Remove `SheetModeToggle` from that module's workspace page
- [ ] **F2:** Remove classic `*WorkSurface.tsx` component
- [ ] **F3:** Remove conditional rendering branch in the workspace page
- [ ] **F4:** Remove related classic-only tests
- [ ] **F5:** Run regression sweep focused on handoffs and deep links
- [ ] **F6:** Commit as `chore(sunset): retire classic [ModuleName] surface`

Modules that lag don't block modules that are ready.

---

## Immediate Next Sequence

1. ~~Merge shared-runtime generalization~~ ✓ (commit `e6566daf`)
2. **Write starter kit doc** (Epic A1 — 30 min)
3. **Build Payments + Client Ledger** in parallel (Epic B1 — 1 session)
4. **Start Fulfillment architect** in parallel with B1 (Epic C0 — read-only, no conflicts)
5. **Targeted QA on Payments + Client Ledger** (Epic B2)
6. **Wave 1 sweep** across all 4 built surfaces (Epic B3)
7. **Begin Epic C** — Direct Intake + Purchase Orders

---

## Linear Mapping

| Linear Issue | Epic                       | Status                  |
| ------------ | -------------------------- | ----------------------- |
| TER-807      | Epic B (Wave 1)            | In Progress             |
| TER-812      | B1 — Payments build        | Todo                    |
| TER-813      | B1 — Client Ledger build   | Todo                    |
| TER-814      | B3 — Inventory G3 sweep    | Todo                    |
| TER-811      | B3 — Sales Sheets G3 sweep | Todo                    |
| TER-808      | Epic C (Wave 2)            | Backlog                 |
| TER-815      | C1 — Direct Intake         | Todo (blocked by W1)    |
| TER-816      | C1 — Purchase Orders       | Todo (blocked by W1)    |
| TER-817      | C0+C2 — Fulfillment        | Todo (blocked by W1)    |
| TER-809      | Epic D (Wave 3)            | Backlog                 |
| TER-818      | D0+D1 — Invoices           | Backlog (blocked by W2) |
| TER-819      | D0+D1 — Returns            | Backlog (blocked by W2) |
| TER-820      | D0+D1 — Quotes             | Backlog (blocked by W2) |
| TER-821      | D0+D1 — Samples            | Backlog (blocked by W2) |
| TER-810      | Epics E+F (Sunset)         | Backlog                 |

---

## Agent Assignment Strategy

| Work Type                                       | Best Tool   | Rationale                                    |
| ----------------------------------------------- | ----------- | -------------------------------------------- |
| Simple module builds (Returns, Samples, Quotes) | Codex       | Pattern replication, well-bounded            |
| Complex module builds (Payments, POs, Intake)   | Claude Opus | Trust-critical constraints, large surfaces   |
| Architect passes (capability ledgers)           | Claude Opus | Reading 1K+ line components, reasoning-heavy |
| QA / adversarial review                         | Claude Opus | Skeptical cross-referencing, edge cases      |
| Starter kit doc                                 | Claude Opus | Cross-cutting knowledge synthesis            |
| Default flip + classic deletion                 | Codex       | Mechanical, well-defined                     |

---

## Reusable Foundation (already generalized)

Every new module gets these for free:

- `PowersheetGrid` — surfaceId, affordances, selection summary, release gates (~50 lines saved)
- `SpreadsheetPilotGrid` — AG Grid wrapper, selection, clipboard, fill, keyboard (~200 lines)
- `powersheet-cell--editable/--locked` CSS — visual cues, light/dark, hover states (~30 lines)
- `KeyboardHintBar` — platform-detected shortcuts with a11y (~15 lines)
- `WorkSurfaceStatusBar` — left/center/right status bar (~10 lines)
- `InspectorPanel` — right-rail detail with sections/fields (~50 lines)
- `SheetModeToggle` + `useSpreadsheetSurfaceMode` — toggle infrastructure (~10 lines)
- `PowersheetFieldPolicy` — editable/locked field contract (~20 lines)
- Toast dedup pattern — 300ms dedup for blocked-edit toasts (~10 lines)
- Row operation helpers — duplicate, delete, fill, apply, clear (~30 lines)
- **Total: ~425 lines saved per module**

---

## What Changed From v1 (Codex feedback incorporated)

| v1 Assumption                     | Codex Correction                                | v2 Change                                                 |
| --------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| "Wave 0 DONE"                     | Orders G6 partial, G7 open, initiative reopened | Honest state: foundation reusable, initiative NOT retired |
| One QA session for 4 surfaces     | Mixed failures are ambiguous                    | Split: targeted QA for new builds, then lighter sweep     |
| Arbitrary wave ordering           | Module families drive reuse                     | Family taxonomy with leader/follower gates                |
| 3-gate model                      | Family-first modules need G0                    | 4 gates for leaders, 3 for followers                      |
| Global default flip after 30 days | Telemetry-driven, per-module                    | Per-module config, monitor fallback rate                  |
| One 13K-line classic deletion     | Risky, blocks everything                        | Per-module retirement, safest first                       |
| No starter kit doc                | Agents re-discover patterns                     | Front-loaded starter kit doc                              |
| Fulfillment waits for Wave 2      | Architect pass is read-only                     | Overlap Fulfillment architect with Wave 1 builds          |
