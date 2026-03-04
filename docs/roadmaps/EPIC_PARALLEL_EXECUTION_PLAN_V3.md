# EPIC Parallel Execution Plan v3 — UX-First Priority

**Created**: 2026-03-04
**Version**: 3.0 (UX-prioritized)
**Scope**: All 40 tasks across 4 roadmaps — resequenced so every user-facing change lands first
**Goal**: Users see improvements earliest; infrastructure and tooling fill gaps in between

---

## Design Philosophy

v2 optimized for maximum parallelism and zero file conflicts. v3 keeps all of that
but **reorders execution so user-facing work is always the priority lane**.

**Priority tiers:**
| Tier | Label | What counts | When it runs |
|------|-------|-------------|--------------|
| **P0** | **User-facing UX** | H1-H6, S1-S3 (10 tasks) | Immediately — first agents launched |
| **P1** | **User-facing text** | LEX-008→012 (5 tasks) — UI string normalization | As soon as UX-H merges + LEX foundation ready |
| **P2** | **Tooling that enables P1** | LEX-001→007, LEX-014 (8 tasks) | Parallel with P0, but lower priority for Evan's attention |
| **P3** | **Docs & closure** | LEX-013, LEX-015, LEX-016, S4 (4 tasks) | Fill idle capacity |
| **P4** | **Infrastructure** | STX-001→010 (10 tasks) | Background — fully independent, no user impact |

**Key change from v2**: Session B (UX) is no longer just "first among equals" — it's the
**primary session** that gets the fastest model, the most attention, and finishes before
anything else. Session C (STX) drops to background priority.

---

## Orchestration Stack (from Research Report)

This plan uses every technique documented in `docs/research/CLAUDE_CODE_ORCHESTRATION_REPORT.md`:

| Technique | Where Used | Why |
|-----------|-----------|-----|
| **Custom agents** (`.claude/agents/`) | `ux-implementer`, `lex-foundation`, `lex-normalizer`, `stx-builder` | Reusable, version-controlled agent configs with model/tool/hook settings |
| **Skills** (`.claude/skills/`) | `verification-protocol`, `architecture`, `deprecated-systems` | Lazy-loaded domain knowledge — only ~100 tokens at start |
| **TaskCompleted hooks** | All agents | Deterministic `pnpm check && pnpm lint && pnpm test && pnpm build` on every task close |
| **Worktree isolation** | All parallel subagents | Zero file conflicts between concurrent agents |
| **`/wave-execute` skill** | Each wave launch | Standardized wave execution with built-in verification gates |
| **`/coding-prompt-forge` skill** | Task prompt generation | QA-enforced prompts that prevent skipped verification |
| **Agent Teams** | Session B (UX) | Peer-to-peer coordination between inventory + dashboard teams |
| **`/batch`** | LEX-008→010 (3 independent string renames) | Automated decomposition of repetitive rename work |
| **Gate system** | 5 gates | Git-based coordination between sessions — no messaging needed |

---

## Custom Agent Definitions

### `.claude/agents/ux-implementer.md`
```yaml
name: ux-implementer
description: "UX implementation agent for TERP. Handles user-facing component work with STRICT mode verification."
model: opus
isolation: worktree
skills:
  - verification-protocol
  - architecture
  - deprecated-systems
hooks:
  TaskCompleted:
    command: "pnpm check && pnpm lint && pnpm test && pnpm build"
    timeout: 180000
```
Primary agent for H1-H6 and S1-S3. Uses **Opus** for highest quality on user-visible code.

### `.claude/agents/lex-foundation.md`
```yaml
name: lex-foundation
description: "LEX terminology foundation agent. Builds schemas, term maps, and audit tooling."
model: sonnet
isolation: worktree
skills:
  - verification-protocol
  - architecture
hooks:
  TaskCompleted:
    command: "pnpm check && pnpm lint && pnpm test && pnpm build"
    timeout: 180000
```
Handles LEX-001→007, LEX-014. Uses **Sonnet** — these are docs/tooling, not user-facing.

### `.claude/agents/lex-normalizer.md`
```yaml
name: lex-normalizer
description: "LEX UI string normalization agent. Renames user-visible text across components."
model: opus
isolation: worktree
skills:
  - verification-protocol
  - architecture
  - deprecated-systems
hooks:
  TaskCompleted:
    command: "pnpm check && pnpm lint && pnpm test && pnpm build"
    timeout: 180000
```
Handles LEX-008→012. Uses **Opus** — these are user-facing string changes.

### `.claude/agents/stx-builder.md`
```yaml
name: stx-builder
description: "STX stress testing infrastructure agent. Builds k6/Playwright test harnesses."
model: sonnet
isolation: worktree
background: true
skills:
  - verification-protocol
  - architecture
hooks:
  TaskCompleted:
    command: "pnpm check && pnpm lint && pnpm test && pnpm build"
    timeout: 180000
```
Handles STX-001→010. Uses **Sonnet** in **background** mode — lowest priority.

---

## Gate 0: Pre-Launch Checklist (unchanged from v2)

| # | Gate | Owner | Command / Action | Pass Criteria |
|---|------|-------|-----------------|---------------|
| 0.2 | Verify main is clean | Evan | `pnpm check && pnpm lint && pnpm test && pnpm build` | All 4 pass |
| 0.3 | Staging is current | Evan | `curl -s https://terp-staging-yicld.ondigitalocean.app/health` | Returns 200 |
| 0.4 | No active sessions | Any | `cat docs/ACTIVE_SESSIONS.md` | No genuine in-progress work |

---

## Execution Timeline — UX-First Resequencing

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    TIMELINE v3 — UX-FIRST                                  │
│                                                                            │
│  Gate 0   T=0      T=30     T=60     T=90     T=120    T=150    T=180    │
│  ────────┬────────┬────────┬────────┬────────┬────────┬────────┬──────   │
│          │        │        │        │        │        │        │          │
│  ★ PRIMARY LANE — User-Facing UX (P0) ★                                  │
│  ........[H1→H2→H3∥H4] ∥ [H5∥H6]                                       │
│  ........──── merge to main ────                                          │
│  ........                    [S1∥S2∥S3] [S4]                             │
│  ........                    ──── merge ────                              │
│          │        │        │        │        │        │        │          │
│  ★ USER-FACING TEXT — LEX UI Normalization (P1) — starts after merge ★   │
│  ........                              [008∥009∥010]──[011→012]          │
│  ........                              ──── merge ─────────────          │
│          │        │        │        │        │        │        │          │
│  LEX Foundation (P2) — parallel with UX, unblocks P1                     │
│  ........[001→002→003]→[004∥005]→[006]→[007∥014]                        │
│  ........                    ★ EVAN: review LEX-004 ★                     │
│          │        │        │        │        │        │        │          │
│  LEX Docs/Closure (P3) — fills idle time                                 │
│  ........                                   [013∥015]      [016]         │
│          │        │        │        │        │        │        │          │
│  STX Infrastructure (P4) — background, fully independent                  │
│  ........[k6]→[001]→[002∥003∥004∥006]→[005∥007∥008]→[009]→[010]        │
│          │        │        │        │        │        │        │          │
│  GATES:  G0       │        │   G1   │   G2   │   G3   │        │          │
│                    │        │(LEX-004│(UX-H   │(LEX    │        │          │
│                    │        │review) │merged) │pulls)  │        │          │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Session B: UX Master Plan — PRIMARY SESSION

**Priority**: P0 — launches first, finishes first, gets Opus model
**Branch**: `claude/ux-master-plan-{sessionId}`
**Agent**: `ux-implementer` (Opus, worktree isolation, TaskCompleted hook)
**Mode**: STRICT
**Estimated Duration**: 1.5-2 hours
**Orchestration**: Agent Teams (inventory team + dashboard team working peer-to-peer)

### Why This Goes First

Every task in this session directly changes what users see and interact with:
- H1: Users can no longer accidentally delete batches with remaining inventory
- H2: Users get clear, actionable error messages instead of confusing toasts
- H3: Inventory UI becomes less busy and more focused during selection
- H4: Accessibility improvements for screen readers and keyboard users
- H5: Owner dashboard becomes a command center, not a data dump
- H6: Appointments are visible on the dashboard for the first time
- S1-S3: Additional dashboard widgets and navigation improvements

### Wave U1 — High Priority UX (P0, ~50 min)

**Launch method**: Agent Teams with 2 teammates + lead in delegate mode

**Team 1: UX-Inventory** (sequential — all touch `InventoryWorkSurface.tsx`):

1. **H1**: Prevent invalid batch deletions pre-click
   - Files: `InventoryWorkSurface.tsx` (L1066-1161, L1504-1516), `BulkActionsBar.tsx`, `BulkConfirmDialog.tsx`
   - UX impact: **HIGH** — users currently see confusing errors AFTER clicking delete
   - Acceptance: Selected `eligible` and `blocked` sets computed from on-hand qty. Delete disabled when blocked rows exist.

2. **H2**: Single blocked-delete error banner + actionable recovery
   - Files: Same as H1 + new banner component
   - UX impact: **HIGH** — replaces duplicate toast.error spam with one clear message
   - Acceptance: Exactly one error surface. "Adjust quantity" action for single blocked row.

3. Then parallel (H1/H2 are merged, safe to fork):
   - **H3**: Focused selection mode to reduce busy UI
     - Files: `InventoryWorkSurface.tsx` (selection), `AdvancedFilters.tsx`, `FilterChips.tsx`
     - UX impact: **MEDIUM** — less visual noise during multi-select operations
   - **H4**: Accessibility hardening (persistent undo + icon labels)
     - Files: `InventoryWorkSurface.tsx` (toast/undo), `InventoryCard.tsx`, `ui/*`
     - UX impact: **MEDIUM** — keyboard and screen reader users get proper support

**Team 2: UX-Dashboard** (parallel from T=0):

- **H5**: Owner command center consolidation + plain-language copy
  - Files: `OwnerCommandCenterDashboard.tsx`, `client/src/components/dashboard/owner/*`
  - UX impact: **HIGH** — the dashboard Evan uses daily becomes actually useful
- **H6**: Add Appointments widget using existing scheduling endpoint
  - Files: New `AppointmentsWidget.tsx`, `DashboardGrid.tsx`
  - UX impact: **HIGH** — appointments visible without navigating to a separate page

### ★ MERGE GATE 2 (after Wave U1)

> All H1-H6 committed, pushed, PR'd, merged to main.
> Verify: `pnpm check && pnpm lint && pnpm test && pnpm build`
> Signal: Session A can start LEX Wave L4b (UI normalization)

### Wave U2 — Secondary UX (P0, ~30 min)

**Launch method**: `/batch` — 3 independent widget tasks, perfect for automated decomposition

- **S1**: SKU Status Browser widget (hidden by default)
  - UX impact: **MEDIUM** — power users get inventory status at a glance
- **S2**: Inventory snapshot price-bracket grouping (validation-gated)
  - UX impact: **MEDIUM** — pricing tiers visible in inventory view
- **S3**: Navigation hierarchy cues between global nav and workspace tabs
  - UX impact: **MEDIUM** — less "where am I?" confusion for all users
- **S4**: Dashboard architecture decision doc (analysis only — no code, no UX impact)
  - Priority: P3 — fill idle time after S1-S3 ship

### File Scope (Verified — unchanged from v2)

| Task | Files | Collision Risk |
|------|-------|----------------|
| H1, H2 | `InventoryWorkSurface.tsx` (delete L1066-1161), `BulkActionsBar.tsx`, `BulkConfirmDialog.tsx` | LOW if merged before LEX |
| H3 | `InventoryWorkSurface.tsx` (selection L1019-1045), `AdvancedFilters.tsx`, `FilterChips.tsx` | MUST merge before LEX |
| H4 | `InventoryWorkSurface.tsx` (toast/undo), `InventoryCard.tsx`, `ui/*` | MUST merge before LEX |
| H5 | `OwnerCommandCenterDashboard.tsx`, owner dashboard widgets | Zero LEX overlap |
| H6 | New widget file, `DashboardGrid.tsx` | Zero LEX overlap |
| S1-S3 | Dashboard widgets, nav components | Zero LEX overlap |

---

## Session A: LEX Terminology Bible Program

**Priority**: P2 (foundation) → P1 (UI normalization)
**Branch**: `claude/lex-terminology-bible-{sessionId}`
**Agent**: `lex-foundation` (Sonnet) for waves L1-L3, `lex-normalizer` (Opus) for wave L4b
**Mode**: SAFE (docs/tooling) → STRICT (UI changes in L4b)
**Estimated Duration**: 2.5-3 hours

### Why Two Priority Tiers

LEX-001→007 + LEX-014 are **foundation/tooling** (P2) — they don't change what users see.
They exist to unblock LEX-008→012 which ARE user-facing (P1) — every "Vendor" label
becomes "Supplier", every inconsistent term gets normalized to what users expect.

### Wave L1 — Foundation (P2, sequential, ~30 min)

- **LEX-001**: Build authority-source register + conflict matrix
  - Quality gate: Must resolve ALL ambiguous terms. No "TBD" allowed.
- **LEX-002**: Define terminology bible JSON schema
  - Quality gate: Schema must validate with strict required fields.
- **LEX-003**: Author canonical term map JSON (v1)
  - Quality gate: Must cover all 5 vocabulary families. Validate against LEX-002 schema.

### Wave L2 — Policy + Census (P2, parallel, ~25 min)

- **LEX-004**: Author human-readable terminology bible markdown
  - **CRITICAL**: 6 downstream tasks depend on this. Vague policy = 6 tasks stall.
  - Quality gate: Explicit policy locks for all 5 policies.
- **LEX-005**: Implement repo-wide terminology census mode
  - Quality gate: Output must be reproducible between runs.

### ★ GATE 1: EVAN REVIEW (after LEX-004)

> Evan reviews the 5 policy locks before normalization tasks begin.
> Specifically: Supplier policy, Brand/Farmer rules, Batch vs Inventory Item split,
> Intake vs Purchase boundaries, Sales Order standard.
> **If any policy is unclear, STOP. Clarify before Wave L4b.**

### Wave L3 — Tooling (P2, mixed, ~25 min)

- **LEX-006**: Implement drift-audit mode with strict failure
- After 006: **LEX-007** ∥ **LEX-014** (parallel)
  - LEX-007: Wire audit scripts
  - LEX-014: Unit tests for rule resolution

### Wave L4a — Docs (P3, no UI overlap, starts after L3)

- **LEX-013**: Active docs + protocol index normalization (docs only)
- **LEX-015**: QA gate integration for terminology drift (scripts only)

### Wave L4b — UI String Normalization (P1, GATED on UX-H merge)

**Launch method**: `/batch` for LEX-008, 009, 010 (3 independent string renames across
different page families), then serial 011→012.

> **Gate 3 check before starting:**
> ```bash
> git pull --rebase origin main
> pnpm check && pnpm lint  # Verify UX-H changes integrated cleanly
> ```

- **LEX-008**: Party language → Supplier canonical (UI)
  - UX impact: **HIGH** — "Vendor" → "Supplier" everywhere users see it
  - Files: `InventoryWorkSurface.tsx`, `AdvancedFilters.tsx`, `FilterChips.tsx`, `InventoryCard.tsx`, `nomenclature.ts`, ~15 vendor-exclusive files
- **LEX-009**: Intake language normalization (UI)
  - UX impact: **HIGH** — consistent "Intake" terminology across procurement
  - Files: `InventoryWorkSurface.tsx`, `DirectIntakeWorkSurface.tsx`, procurement pages
- **LEX-010**: Sales Order wording normalization (UI)
  - UX impact: **HIGH** — consistent "Sales Order" across order flows
  - Files: `UnifiedSalesPortalPage.tsx`, `OrderCreatorPage.tsx`, `OrderCreationFlow.tsx`
- **LEX-011**: Brand/Farmer dynamic policy (UI) — **then immediately**:
- **LEX-012**: Batch vs Inventory Item split (UI) — **after 011** (shared files)

### Wave L5 — Closure (P3, ~15 min)

- **LEX-016**: Final evidence packet + closure report

---

## Session C: STX Staging Stress Testing — BACKGROUND

**Priority**: P4 — runs entirely in background, zero user impact
**Branch**: `claude/stx-stress-testing-{sessionId}`
**Agent**: `stx-builder` (Sonnet, background: true, worktree isolation)
**Mode**: STRICT
**Estimated Duration**: 2-2.5 hours
**Fully independent** — no file overlap with Sessions A or B

### Why This Is Last Priority

Stress testing infrastructure is important but invisible to users. It builds test
harnesses, k6 scripts, and Playwright configurations. Users never see or interact
with any of this directly. It runs in the background and Evan checks on it when
Sessions A and B are done.

### Wave S0 — Prerequisites (~5 min)
- Install k6 binary (see v2 plan for install commands)
- Verify: `k6 version`

### Wave S1 — Foundation (~15 min)
- **STX-001**: Define canonical stress command contract + runbook

### Wave S2 — Parallel Build (~30 min)
- **STX-002**: Build strict stress preflight gate
- **STX-003**: Implement stress orchestrator shell (NO_REPAIR=1)
- **STX-004**: Add stress profiles (smoke, peak, soak) — NO queue stress (BullMQ doesn't exist)
- **STX-006**: Add staging-critical Playwright project/tag plumbing

### Wave S3 — Integration (~30 min)
- **STX-005**: k6 mixed-traffic stress script (needs STX-004)
- **STX-007**: Curate staging-critical browser suite (needs STX-006)
- **STX-008**: Invariant strict gate + artifact bundle (needs STX-003)

### Wave S4 — Wiring (~20 min)
- **STX-009**: Wire package commands + agent phrase mapping

### Wave S5 — Execution (~30 min)
- **STX-010**: Execute smoke + peak rehearsals, publish evidence
  - Gate 4: k6 installed + staging healthy + STX-001→009 complete

---

## Cross-Session Gate System

| Gate | When | Condition | Who | Failure Action |
|------|------|-----------|-----|----------------|
| **Gate 0** | Pre-launch | Clean main + staging healthy | Evan | Don't start |
| **Gate 1** | After LEX-004 | Evan reviews 5 policy locks | Evan | Revise before L4b |
| **Gate 2** | After UX-H U1 | H1-H6 merged to main + build passes | Session B | Session A waits for L4b |
| **Gate 3** | Before LEX L4b | `git pull --rebase origin main` + UX-H present | Session A | Start L4a only, wait |
| **Gate 4** | Before STX-010 | k6 + staging + STX-001→009 | Session C | Debug prereqs |

### Coordination via Git (no messaging needed)

```
Session B merges H1-H6 to main
    → auto-deploy to staging
    → Session A: git pull --rebase origin main
    → Session A: verify UX-H changes present
    → Session A: start LEX Wave L4b (user-facing string normalization)
```

---

## File Collision Matrix (unchanged from v2)

| File | UX-H Tasks | LEX Tasks | Resolution |
|------|-----------|-----------|------------|
| `InventoryWorkSurface.tsx` | H1,H2,H3,H4 | LEX-008,009,012 | UX merges first (Gate 2+3) |
| `AdvancedFilters.tsx` | H3 | LEX-008,011 | UX merges first |
| `FilterChips.tsx` | H3 | LEX-008,011 | UX merges first |
| `InventoryCard.tsx` | H4 | LEX-008,011 | UX merges first |
| `nomenclature.ts` | None | LEX-008,011 | LEX-011→012 serialized |

---

## Risk Register

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | UX-H takes longer than expected | Delays all P1 LEX normalization | LEX has ~90 min of P2 foundation work before needing Gate 2. Large timing buffer. LEX does L4a (docs) while waiting. |
| R2 | LEX-004 ships vague policies | 6 P1 tasks stall | Gate 1 — Evan review before normalization |
| R3 | File collisions despite sequencing | Merge conflicts in 5 files | Gate 2+3 guarantee UX merges first |
| R4 | k6 not installable | STX-005, STX-010 blocked | P4 priority — doesn't affect users. Use `autocannon` as fallback. |
| R5 | STX-010 first run produces blockers | STX delayed | Expected. Budget one iteration cycle. P4 priority. |
| R6 | LEX-011/012 conflict | Merge within Session A | Serialized (011 before 012) — eliminated |

---

## Session Launch Prompts (Copy-Paste Ready)

### Session B Prompt (LAUNCH FIRST):
```
You are executing the UX Master Plan — the PRIMARY session.

## Context
Read docs/roadmaps/EPIC_PARALLEL_EXECUTION_PLAN_V3.md — you are Session B.
You are the highest priority session. Every task you do directly improves user experience.

## Branch
Branch off latest main: claude/ux-master-plan-{sessionId}

## Execution Order
Wave U1: Launch Agent Teams with 2 teammates:
  - Teammate 1 (Inventory): H1 → H2 → (H3 ∥ H4) — sequential on shared file
  - Teammate 2 (Dashboard): H5 ∥ H6 — parallel, independent
After U1: Push, create PR, merge to main IMMEDIATELY.
Wave U2: /batch S1, S2, S3 (parallel). S4 last (docs only).

## CRITICAL: You are on the critical path
Session A (LEX) is BLOCKED waiting for your H1-H4 inventory changes to merge to main.
Ship H1-H4 as fast as possible. H5/H6 run in parallel and don't block anything.

## File Safety
- H1, H2, H3, H4 ALL modify InventoryWorkSurface.tsx — do NOT parallelize these
- H5, H6 are dashboard-only — safe to parallelize with inventory
- H3 touches AdvancedFilters.tsx, FilterChips.tsx — must merge before LEX

## Verification
Use /wave-execute for each wave. TaskCompleted hook enforces pnpm check/lint/test/build.
After H1-H6: push, create PR, merge to main. Then start Wave U2.
```

### Session A Prompt (LAUNCH SECOND):
```
You are executing the LEX Terminology Bible Program (TER-546, 16 subtasks).

## Context
Read docs/roadmaps/EPIC_PARALLEL_EXECUTION_PLAN_V3.md — you are Session A.

## Branch
Branch off latest main: claude/lex-terminology-bible-{sessionId}

## Execution Order
Phase 1 (P2 Foundation): Waves L1 → L2 → L3 (no user-facing changes)
Phase 2 (P1 UI Normalization): Wave L4b (user-facing string renames)
Fill time: Wave L4a (docs) whenever idle

## Critical Gates
1. After LEX-004: STOP. Notify Evan to review 5 policy locks.
2. Before Wave L4b: git pull --rebase origin main. Verify UX-H H1-H4 merged.
   If NOT merged: start LEX-013 + LEX-015 only, wait.
3. LEX-011 must complete BEFORE LEX-012 (shared files).
4. For LEX-008→010: use /batch — 3 independent string renames, perfect for parallel.

## Model Selection
Use lex-foundation agent (Sonnet) for L1-L3 (tooling).
Switch to lex-normalizer agent (Opus) for L4b (user-facing UI changes).

## Verification
Use /wave-execute for each wave. TaskCompleted hook enforces verification.
```

### Session C Prompt (LAUNCH LAST, BACKGROUND):
```
You are executing STX Staging Stress Testing (TER-528, 10 subtasks).
This is a BACKGROUND session — lowest priority, no user-facing impact.

## Context
Read docs/roadmaps/EPIC_PARALLEL_EXECUTION_PLAN_V3.md — you are Session C.

## Branch
Branch off latest main: claude/stx-stress-testing-{sessionId}

## Execution Order
Wave S0 (k6 install) → S1 → S2 → S3 → S4 → S5

## Fully Independent
ZERO file overlap with Sessions A or B. No coordination needed. No gates to wait for.

## Critical Notes
1. k6 must be installed before Wave S2
2. BullMQ is NOT implemented — do NOT include queue stress in profiles
3. MySQL connection pool is 25 max — this IS the expected stress bottleneck
4. e2e-live-site.yml was archived — investigate why before rebuilding

## Verification
Use /wave-execute for each wave. TaskCompleted hook enforces verification.
Expect STX-010 first run to produce blockers — budget one iteration cycle.
```

---

## Execution Checklist

### Pre-Launch (Evan)

- [ ] **Gate 0.2**: Clean build: `pnpm check && pnpm lint && pnpm test && pnpm build`
- [ ] **Gate 0.3**: Staging health: `curl -s https://terp-staging-yicld.ondigitalocean.app/health`
- [ ] Copy-paste Session B prompt → launch first (UX — primary)
- [ ] Copy-paste Session A prompt → launch second (LEX — parallel)
- [ ] Copy-paste Session C prompt → launch last (STX — background)

### Mid-Flight Gates

- [ ] **Gate 1**: Review LEX-004 policy locks when Session A notifies
- [ ] **Gate 2**: Session B merges H1-H6 PR to main
- [ ] **Gate 3**: Session A pulls main before LEX-008→012 (self-checks)
- [ ] **Gate 4**: Session C confirms k6 + staging before STX-010

### Post-Completion

- [ ] All 3 sessions report PASS on verification quartet
- [ ] All 3 branches merged to main
- [ ] Staging deployment verified
- [ ] Update Linear issues to Done
- [ ] Final audit: `/audit:full`

---

## Efficiency Metrics

| Metric | Sequential | v2 (parallel-first) | v3 (UX-first) | Notes |
|--------|-----------|---------------------|----------------|-------|
| Total tasks | 36 | 36 | 36 | Same scope |
| Time to first UX improvement | ~8h | ~50 min | **~50 min** | Same — UX was already first in v2 |
| Time to ALL UX merged | ~14h | ~90 min | **~80 min** | v3 eliminates S4 from critical path |
| Time to UI text normalized | ~16h | ~150 min | **~150 min** | Same — blocked by LEX foundation chain |
| Wall-clock total | ~18h | ~3.5-4.5h | **~3.5-4.5h** | Same parallelism |
| UX tasks use Opus | N/A | No (all same model) | **Yes** | Higher quality on user-visible code |
| STX blocks anything? | N/A | No | **No** | Background throughout |

**v3 advantage over v2**: Explicit priority lanes ensure Evan's attention goes to UX first.
Opus model on user-facing code. STX in background mode. Same wall-clock, better outcomes.

---

## Task Inventory — All 40 Tasks by Priority

### P0 — User-Facing UX (10 tasks, Session B)
| ID | Description | UX Impact | Est |
|----|-------------|-----------|-----|
| H1 | Prevent invalid batch deletions pre-click | Prevents user confusion | 4h |
| H2 | Single blocked-delete error banner | Clear error messaging | 3h |
| H3 | Focused selection mode | Less visual noise | 4h |
| H4 | Accessibility (persistent undo + labels) | Screen reader + keyboard | 3h |
| H5 | Owner command center consolidation | Evan's daily dashboard | 6h |
| H6 | Appointments widget | Appointments visible on dashboard | 4h |
| S1 | SKU Status Browser widget | Inventory status at a glance | 3h |
| S2 | Price-bracket grouping | Pricing tiers in inventory | 3h |
| S3 | Navigation hierarchy cues | Less "where am I?" confusion | 2h |
| S4 | Dashboard architecture decision | Analysis doc — no code | 2h |

### P1 — User-Facing Text (5 tasks, Session A Wave L4b)
| ID | Description | UX Impact | Est |
|----|-------------|-----------|-----|
| LEX-008 | Supplier terminology (Vendor→Supplier) | Correct terminology everywhere | 4h |
| LEX-009 | Intake language normalization | Consistent procurement terms | 3h |
| LEX-010 | Sales Order wording normalization | Consistent order terms | 3h |
| LEX-011 | Brand/Farmer dynamic policy | Correct brand terminology | 3h |
| LEX-012 | Batch vs Inventory Item split | Clear item type terminology | 3h |

### P2 — Tooling That Enables P1 (8 tasks, Session A Waves L1-L3)
| ID | Description | Est |
|----|-------------|-----|
| LEX-001 | Authority-source register | 2h |
| LEX-002 | JSON schema definition | 2h |
| LEX-003 | Canonical term map | 3h |
| LEX-004 | Human-readable bible (★ blocks 6 tasks) | 4h |
| LEX-005 | Census mode | 3h |
| LEX-006 | Drift-audit mode | 3h |
| LEX-007 | Wire audit scripts | 2h |
| LEX-014 | Unit tests for rules | 2h |

### P3 — Docs & Closure (4 tasks)
| ID | Description | Est |
|----|-------------|-----|
| LEX-013 | Active docs normalization | 2h |
| LEX-015 | QA gate integration | 2h |
| LEX-016 | Closure report | 1h |
| S4 | Dashboard architecture doc | 2h |

### P4 — Infrastructure (10 tasks, Session C — background)
| ID | Description | Est |
|----|-------------|-----|
| STX-001 | Stress command contract | 2h |
| STX-002 | Preflight gate | 2h |
| STX-003 | Orchestrator shell | 3h |
| STX-004 | Stress profiles | 3h |
| STX-005 | k6 scripts | 4h |
| STX-006 | Playwright plumbing | 2h |
| STX-007 | Browser suite curation | 3h |
| STX-008 | Invariant gate | 2h |
| STX-009 | Wire commands | 2h |
| STX-010 | Execute rehearsals | 4h |
