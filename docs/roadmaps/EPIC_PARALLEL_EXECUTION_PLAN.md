# EPIC Parallel Execution Plan v2 — 2026-03-04

**Created**: 2026-03-04
**Version**: 2.0 (QA-hardened)
**Scope**: All 40 tasks created today across 4 independent roadmaps
**Goal**: Maximum parallelism with guaranteed zero-conflict execution

---

## QA Findings That Changed the Plan (v1 → v2)

| Finding | Severity | Impact on Plan |
|---------|----------|----------------|
| ~~Unmerged release train branch~~ (`codex/feedback-release-train-20260302`) | **FALSE ALARM** | Branch is fully contained in main (0 commits ahead, `git merge-base --is-ancestor` confirms). Stale branch — no action needed. Gate 0.1 removed. |
| **5 exact file collisions** between LEX-008→012 and UX-H tasks — not just "possible" overlap but confirmed line-level conflicts in `InventoryWorkSurface.tsx`, `AdvancedFilters.tsx`, `FilterChips.tsx`, `InventoryCard.tsx`, `nomenclature.ts` | **HIGH** | Reversed sequencing: LEX string renames go FIRST (surgical), UX structural refactors go SECOND (on clean base) |
| **k6 not installed** anywhere — binary missing from CI runners and local. STX-005 and STX-010 have a hidden prerequisite | **HIGH** | Added k6 install step as STX-000.5 prerequisite before Wave S2 |
| **BullMQ listed in CLAUDE.md but not implemented** — no Redis, no ioredis, no bullmq in deps | **MEDIUM** | STX profiles must NOT include queue worker stress. Corrected in STX-004 scope |
| **LEX-004 is the single most dangerous blocking task** — 6 parallel tasks wait on it. If its policy wording is vague, all 6 stall | **HIGH** | Added Evan review gate after LEX-004 before normalization burst |
| **LEX-011 and LEX-012 share files** (`nomenclature.ts`, inventory components) — cannot safely parallelize these two | **MEDIUM** | Sequenced LEX-011 before LEX-012 within the burst |
| **H3 (selection mode) touches `AdvancedFilters.tsx` and `FilterChips.tsx`** — same files as LEX-008/011 | **MEDIUM** | H3 must wait for LEX string renames in those files, OR run before them |
| **Archived `e2e-live-site.yml`** — live-site browser testing was tried and discontinued | **LOW** | STX-006/007 should investigate why before rebuilding |
| **MySQL connection pool capped at 25** — k6 with >20 VUs will hit ceiling | **INFO** | Documented as expected stress point in STX-004 profiles |

---

## Gate 0: Mandatory Pre-Launch Checklist

**NOTHING starts until these are done. No exceptions.**

| # | Gate | Owner | Command / Action | Pass Criteria |
|---|------|-------|-----------------|---------------|
| ~~0.1~~ | ~~Merge feedback release train~~ | — | **CLEARED** — branch is already fully contained in main (verified `git merge-base --is-ancestor`). Stale branch, safe to delete. | ✅ Already passed |
| 0.2 | **Verify main is clean** | Evan | `git pull origin main && pnpm check && pnpm lint && pnpm test && pnpm build` | All 4 pass |
| 0.3 | **Staging is current** | Evan | `curl -s https://terp-staging-yicld.ondigitalocean.app/health` | Returns 200 |
| 0.4 | **No active sessions** | Any | `cat docs/ACTIVE_SESSIONS.md` | No genuine in-progress work (stale entries OK) |

**Gate 0.1 status**: The `codex/feedback-release-train-20260302` branch was investigated and found to be fully integrated into main (0 commits ahead, confirmed ancestor). All work surface changes it contained are already in main. No merge required — the branch can be safely deleted.

---

## Inventory: 4 Roadmaps, 40 Tasks

| Roadmap | Parent | Tasks | Priority | Domain |
|---------|--------|-------|----------|--------|
| **LEX** — Terminology Bible Program | TER-546 | 16 subtasks (LEX-001→016) | High | Docs, scripts, UI text |
| **STX** — Staging Stress Testing | TER-528 | 10 subtasks (STX-001→010) | Urgent | Infra, test scripts |
| **UX-H** — High Priority UX | TER-523 | 6 subtasks (H1→H6) | High | Client UI code |
| **UX-S** — Secondary UX | TER-524 | 4 subtasks (S1→S4) | Medium/Low | Client UI code |

**Total**: 36 executable subtasks + 4 parent epics

---

## Verified Dependency Graphs

### LEX — Deep Sequential Chain with Parallel Burst

```
Phase 1:  LEX-001 (root — authority register, NO deps)
              │
Phase 2:  LEX-002 (JSON schema, depends 001)
              │
Phase 3:  LEX-003 (canonical term map, depends 001+002)
              ├────────────────────────────┐
Phase 4:  LEX-004                      LEX-005
          (bible markdown,             (census mode,
           depends 001+003)             depends 003 ONLY)
              │                             │
              │              Phase 5:   LEX-006 (drift audit, depends 003+005)
              │                             │
              │              Phase 6:   ┌── LEX-007 (scripts, depends 005+006)
              │                         │
              │                         ├── LEX-014 (test coverage, depends 006 ONLY)
              │                         │
              │    ★ EVAN REVIEW GATE ★ │
              │    (LEX-004 policies     │
              │     must be unambiguous) │
              │                         │
Phase 7:  ════╪═════════════════════════╪═══════════════════════════
          ║   │                         │                          ║
          ║   ├── LEX-013 (docs only — no UI, starts immediately) ║
          ║   ├── LEX-015 (QA gate, needs 007+014, no UI)         ║
          ║   │                                                    ║
          ║   │  ★ AFTER UX-H merges to main ★                    ║
          ║   ├── LEX-008 (Supplier normalize)                     ║
          ║   ├── LEX-009 (Intake normalize)                       ║
          ║   ├── LEX-010 (Sales Order normalize)                  ║
          ║   ├── LEX-011 (Brand/Farmer policy) ──→ then:          ║
          ║   ├── LEX-012 (Batch/Inv Item split, after 011)        ║
          ║   │         ↑ shares files with 011, must be serial    ║
          ═══════════════════════════════════════════════════════════
              │
Phase 8:  LEX-016 (closure report, depends on ALL of 008-015)
```

**Critical path**: 001 → 002 → 003 → 005 → 006 → 007 → (burst) → 016
**Minimum serial depth**: 8 hops (not 16)
**Parallelism**: LEX-004 ∥ LEX-005 in Phase 4; LEX-007 ∥ LEX-014 in Phase 6; 5 tasks parallel + 011→012 serial in Phase 7

### STX — Foundation → Parallel Build → Integration

```
Phase 0.5: Install k6 binary (prerequisite — not a Linear task)
               │
Phase 1:   STX-001 (contract + runbook)
               │
Phase 2:   ┌── STX-002 (preflight gate)
           ├── STX-003 (orchestrator shell)       ALL PARALLEL
           ├── STX-004 (stress profiles)
           ├── STX-006 (Playwright plumbing)
               │
Phase 3:   ┌── STX-005 (k6 scripts, needs 004)
           ├── STX-007 (browser suite, needs 006)  PARALLEL
           ├── STX-008 (invariant gate, needs 003)
               │
Phase 4:   STX-009 (wire commands, needs all above)
               │
Phase 5:   STX-010 (execute rehearsals — final)
```

### UX-H — Two Sub-streams (File-Verified)

```
Stream A (Inventory):              Stream B (Dashboard):
  H1 (prevent bad deletes)          H5 (command center)
    │                                H6 (appointments widget)
  H2 (error banner)                   ↑ fully independent
    │
  ═══ H1+H2 touch InventoryWorkSurface.tsx delete code ═══
    │
  H3 (focused selection)  ← touches AdvancedFilters.tsx, FilterChips.tsx
  H4 (accessibility)      ← touches InventoryCard.tsx, global ui/*
    ↑ H3, H4 independent of H1/H2 but share InventoryWorkSurface.tsx
    ↑ MUST run in same session, NOT parallel with H1/H2 on same file
```

**Revised**: H3 and H4 cannot safely run parallel with H1/H2 — they all modify `InventoryWorkSurface.tsx`. Execute as: H1→H2→(H3 ∥ H4).

### UX-S — All Independent (confirmed)

```
S1, S2, S3, S4 — no interdependencies, all parallel
S4 is an analysis/decision task, not code
```

---

## Verified File Collision Matrix

### Confirmed Collision Files (from codebase grep)

| File | UX-H Tasks | LEX Tasks | Lines at Risk |
|------|-----------|-----------|---------------|
| `InventoryWorkSurface.tsx` (2402 lines) | H1, H2, H3, H4 (delete, selection, bulk actions) | LEX-008 (L1573 "Vendor", L1957 "Vendor"), LEX-009 (L1781 "Product Intake", L1584 "Intake Date"), LEX-012 (L1949 "Brand") | **HIGH — both structural + string changes** |
| `AdvancedFilters.tsx` | H3 (filter panel restructure) | LEX-008 (L214-227 "Vendor" filter), LEX-011 (L241 `getBrandLabel`) | **MEDIUM** |
| `FilterChips.tsx` | H3 (chip restyle in selection mode) | LEX-008 (L48-52 "Vendor" chip), LEX-011 (L56-58 brand chip) | **MEDIUM** |
| `InventoryCard.tsx` | H4 (aria labels) | LEX-008 (L78 "Vendor" label), LEX-011 (L73 `getBrandLabel`) | **LOW-MEDIUM** |
| `nomenclature.ts` | None | LEX-008 (L187-188 "Vendor" strings), LEX-011 (dynamic Brand/Farmer logic) | **MEDIUM — LEX internal conflict** |

### Safe Zones (no cross-session overlap)

| File Category | Exclusive To | Safe for Parallel |
|--------------|-------------|-------------------|
| `BulkActionsBar.tsx`, `BulkConfirmDialog.tsx` | UX-H only (H1, H2) | Yes |
| `Vendors*.tsx`, `PayVendorModal.tsx`, vendor pages | LEX only | Yes |
| `DirectIntakeWorkSurface.tsx`, procurement pages | LEX only (009, 010) | Yes |
| Dashboard widgets, `OwnerCommandCenterDashboard.tsx` | UX-H (H5, H6) + UX-S | Yes |
| `scripts/stress/*`, `k6/*`, Playwright config | STX only | Yes |
| All `docs/` terminology files | LEX only | Yes |

---

## Revised Session Architecture: Guaranteed Zero-Conflict

### Key Change from v1: Reversed UX-H / LEX-008→012 sequencing

**v1 said**: UX-H finishes first → LEX normalizes on top
**v2 says**: **WRONG.** LEX string renames are surgical (3-5 string literal changes per file). UX-H structural refactors (new components, moved code blocks, new state) are heavy. **Surgical first, structural second.** This minimizes merge conflict surface.

However, LEX-008→012 don't start until Phase 7 (~90 min in), while UX-H starts at T=0. So the actual sequencing is:

**Revised Strategy**: Two sub-phases within the collision zone:
1. **UX-H Stream B (H5, H6) + UX-S**: Start immediately. Zero collision risk — dashboard only.
2. **UX-H Stream A (H1→H2)**: Start immediately on `BulkActionsBar.tsx` and `BulkConfirmDialog.tsx` (safe zone). The `InventoryWorkSurface.tsx` changes for H1/H2 are in the delete/bulk action section (lines 1066-1161, 1504-1516) — far from LEX's string changes (lines 1573, 1584, 1781, 1949, 1957).
3. **UX-H H3 + H4**: Start after H1/H2 complete. H3 touches `AdvancedFilters.tsx` and `FilterChips.tsx` which LEX-008 also touches — but LEX-008 won't start for ~90 min. H3/H4 finish long before.
4. **LEX-008→012**: Arrive ~90+ min later. Pull latest main. All UX-H changes are already merged.

**This works because of natural timing**: LEX has 6 sequential foundation phases before it reaches Phase 7. UX-H will be done and merged well before LEX-008 starts.

### Session Timeline (Revised)

```
┌────────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION TIMELINE v2                            │
│                                                                        │
│  Gate 0   T=0      T=30     T=60     T=90     T=120    T=150  T=180  │
│  ────────┬────────┬────────┬────────┬────────┬────────┬────────┬──── │
│          │        │        │        │        │        │        │      │
│  SESSION A (LEX): Sequential foundation → parallel burst              │
│  ........[001]→[002]→[003]→[004∥005]→[006]→[007∥014]→              │
│  ........│                                             │              │
│  ........│              ★ EVAN GATE: review LEX-004 ★  │              │
│  ........│                                             │              │
│  ........│  (013+015 start immediately, no UI overlap) │              │
│  ........│                                    [013∥015]│              │
│  ........│                                             │              │
│  ........│  ★ GATE: git pull main (UX-H merged) ★     │              │
│  ........│                                    [008∥009∥010∥011→012]  │
│  ........│                                                    [016]  │
│          │        │        │        │        │        │        │      │
│  SESSION B (UX): Parallel UI work — finishes before LEX Phase 7      │
│  ........[H1→H2→H3∥H4] ∥ [H5∥H6]                                   │
│  ........────── merge to main ──────                                  │
│  ........                          [S1∥S2∥S3∥S4]                     │
│          │        │        │        │        │        │        │      │
│  SESSION C (STX): Fully independent infra build                       │
│  ........[k6 install]→[001]→[002∥003∥004∥006]→[005∥007∥008]→[009]→010│
│          │        │        │        │        │        │        │      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Session A: LEX Terminology Bible Program

**Branch**: `claude/lex-terminology-bible-{sessionId}`
**Mode**: SAFE (docs/tooling phases), escalate to STRICT for Phase 7 (UI changes)
**Estimated Duration**: 2.5-3 hours

### Subagent Team Structure

| Agent | Role | Tasks | Notes |
|-------|------|-------|-------|
| **LEX-Foundation** (sequential) | Build the base layer | LEX-001 → 002 → 003 | Strictly sequential — each output feeds the next |
| **LEX-Policy** (after 003) | Write bible + census | LEX-004 ∥ LEX-005 | Parallel after 003 |
| **LEX-Tooling** (after 005+006) | Build audit tooling | LEX-006 → (LEX-007 ∥ LEX-014) | 006 sequential, then 007+014 parallel |
| **LEX-Normalize** (after 004+007+UX merge) | UI text passes | LEX-008 ∥ 009 ∥ 010, then 011 → 012 | **011→012 serial** (shared files) |
| **LEX-Docs** (after 004+007) | Non-UI work | LEX-013 ∥ LEX-015 | No UI overlap — starts immediately |
| **LEX-Closure** (after all) | Final report | LEX-016 | Depends on everything |

### Wave Execution Plan

**Wave L1** (sequential, ~30 min):
- `LEX-001`: Build authority-source register + conflict matrix
  - **Quality gate**: Must resolve ALL ambiguous terms. If any term is "TBD", downstream tasks cannot proceed.
- `LEX-002`: Define terminology bible JSON schema
  - **Quality gate**: Schema must validate with strict required fields. Actionable error messages (LEX-006 depends on this).
- `LEX-003`: Author canonical term map JSON (v1)
  - **Quality gate**: Must cover all 5 vocabulary families (party, intake, order, brand/farmer, inventory). Validate against LEX-002 schema.

**Wave L2** (parallel, ~25 min):
- `LEX-004`: Author human-readable terminology bible markdown
  - **Quality gate**: Must include explicit policy locks for all 5 policies. "Enforcement guidance" section must be concrete, not vague.
  - **CRITICAL**: LEX-004 is the single most dangerous task — 6 downstream tasks depend on it. If any policy is ambiguous, 6 tasks stall.
- `LEX-005`: Implement repo-wide terminology census mode
  - **Quality gate**: Output must be reproducible between runs for unchanged inputs.

**★ EVAN REVIEW GATE** (after LEX-004):
> Evan reviews LEX-004 terminology bible before normalization tasks begin.
> Specifically verify: Supplier policy, Brand/Farmer dynamic rules, Batch vs Inventory Item split rules, Intake vs Purchase context boundaries, Sales Order standard.
> **If any policy is unclear, STOP. Clarify before Wave L4.**

**Wave L3** (mixed, ~25 min):
- `LEX-006`: Implement drift-audit mode with strict failure
  - **Quality gate**: `--strict` mode must exit non-zero on blocking findings. CI-parseable output format.
- After 006: `LEX-007` ∥ `LEX-014` (parallel)
  - LEX-007: Wire `audit:terminology`, `audit:terminology:strict`, `audit:terminology:census` scripts
  - LEX-014: Unit tests for rule resolution, forbidden alias blocking, allowed alias pass

**Wave L4a** (parallel, starts immediately after L3 — no UI overlap):
- `LEX-013`: Active docs + protocol index normalization (docs only)
- `LEX-015`: QA gate integration for terminology drift (scripts only)

**Wave L4b** (parallel burst — **GATED on UX-H merge to main**):
> Before starting: `git pull --rebase origin main` to pick up UX-H changes.
> Verify: `pnpm check && pnpm lint` pass after pull.

- `LEX-008`: Party language → Supplier canonical (UI)
  - Files: `InventoryWorkSurface.tsx` (L1573, L1957), `AdvancedFilters.tsx` (L214-227), `FilterChips.tsx` (L48-52), `InventoryCard.tsx` (L78), `nomenclature.ts` (L187-188), plus ~15 vendor-exclusive files
- `LEX-009`: Intake language normalization (UI)
  - Files: `InventoryWorkSurface.tsx` (L1781, L1584), `DirectIntakeWorkSurface.tsx`, procurement pages
- `LEX-010`: Sales Order wording normalization (UI)
  - Files: `UnifiedSalesPortalPage.tsx`, `OrderCreatorPage.tsx`, `OrderCreationFlow.tsx`
- `LEX-011`: Brand/Farmer dynamic policy (UI) — **then immediately**:
- `LEX-012`: Batch vs Inventory Item split (UI) — **after 011** (shares `nomenclature.ts`, `AdvancedFilters.tsx`, `FilterChips.tsx`, `InventoryCard.tsx`)

**Wave L5** (single, ~15 min):
- `LEX-016`: Final evidence packet + closure report
  - **Quality gate**: Must include pass/block verdict. "Residual exceptions" must be explicitly documented, not silently deferred.

---

## Session B: UX Master Plan (H1-H6 + S1-S4)

**Branch**: `claude/ux-master-plan-{sessionId}`
**Mode**: STRICT (UI behavior changes, inventory domain)
**Estimated Duration**: 1.5-2 hours
**PRIORITY**: This session must merge H1-H4 to main BEFORE Session A reaches Wave L4b.

### Subagent Team Structure (Revised)

| Agent | Role | Tasks | Notes |
|-------|------|-------|-------|
| **UX-Inventory** (sequential) | All inventory work | H1 → H2 → (H3 ∥ H4) | Sequential on shared file, then parallel on safe zones |
| **UX-Dashboard** (parallel) | Dashboard widgets | H5 ∥ H6 | Independent of inventory — starts T=0 |
| **UX-Secondary** (after H-tasks merge) | Lower priority | S1 ∥ S2 ∥ S3 ∥ S4 | All independent |

### Wave Execution Plan

**Wave U1** (parallel across 2 teams, ~50 min):

**Team 1: UX-Inventory** (sequential — all touch `InventoryWorkSurface.tsx`):
1. `H1`: Prevent invalid batch deletions pre-click
   - **Primary files**: `InventoryWorkSurface.tsx` (lines 1066-1161, 1504-1516), `BulkActionsBar.tsx`, `BulkConfirmDialog.tsx`
   - **Acceptance**: Selected `eligible` and `blocked` sets computed from on-hand qty. Destructive delete disabled when blocked rows exist.
2. `H2`: Single blocked-delete error banner + actionable recovery
   - **Primary files**: Same as H1 + new banner component
   - **Acceptance**: Exactly one primary error surface for blocked deletes. No duplicate `toast.error`. "Adjust quantity" action for single blocked row.
3. Then parallel:
   - `H3`: Focused selection mode to reduce busy UI
     - **Primary files**: `InventoryWorkSurface.tsx` (selection section), `AdvancedFilters.tsx`, `FilterChips.tsx`
   - `H4`: Accessibility hardening (persistent undo + icon labels)
     - **Primary files**: `InventoryWorkSurface.tsx` (toast/undo section), `InventoryCard.tsx`, global `ui/*` components

**Team 2: UX-Dashboard** (parallel from T=0):
- `H5`: Owner command center consolidation + plain-language copy
  - **Primary files**: `OwnerCommandCenterDashboard.tsx`, `client/src/components/dashboard/owner/*`
- `H6`: Add Appointments widget using existing scheduling endpoint
  - **Primary files**: New `AppointmentsWidget.tsx`, `DashboardGrid.tsx`

**★ MERGE GATE** (after Wave U1):
> All H1-H6 changes must be committed, pushed, PR'd, and merged to main.
> Run full verification: `pnpm check && pnpm lint && pnpm test && pnpm build`
> Signal to Session A: "UX-H merged. Safe to start LEX Wave L4b."

**Wave U2** (parallel, ~30 min):
- `S1`: SKU Status Browser widget (hidden by default)
- `S2`: Inventory snapshot price-bracket grouping (validation-gated)
- `S3`: Navigation hierarchy cues between global nav and workspace tabs
- `S4`: Dashboard architecture decision doc (analysis only — no code)

### File Scope (Verified)

| Task | Verified Files | Collision Risk |
|------|---------------|----------------|
| H1, H2 | `InventoryWorkSurface.tsx` (delete section L1066-1161), `BulkActionsBar.tsx`, `BulkConfirmDialog.tsx` | LEX touches different lines (L1573+) — LOW conflict if merged before LEX |
| H3 | `InventoryWorkSurface.tsx` (selection L1019-1045), `AdvancedFilters.tsx`, `FilterChips.tsx` | LEX-008 touches same files — MUST merge before LEX |
| H4 | `InventoryWorkSurface.tsx` (toast/undo), `InventoryCard.tsx`, `ui/*` | LEX-008 touches InventoryCard — MUST merge before LEX |
| H5 | `OwnerCommandCenterDashboard.tsx`, owner dashboard widgets | Zero LEX overlap |
| H6 | New widget file, `DashboardGrid.tsx` | Zero LEX overlap |
| S1-S3 | Dashboard widgets, nav components | Zero LEX overlap |

---

## Session C: STX Staging Stress Testing

**Branch**: `claude/stx-stress-testing-{sessionId}`
**Mode**: STRICT (test infrastructure, staging interaction)
**Estimated Duration**: 2-2.5 hours
**Fully independent** — no file overlap with Sessions A or B

### Infrastructure Baseline (Verified)

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Playwright | Mature (v1.56.1, 8 projects, 100+ specs) | Add `staging-critical` project/tag |
| k6 | **NOT INSTALLED** | Install binary in CI + document local setup |
| Staging deployment | Operational (auto-deploy via `sync-staging.yml`) | Wire staging app ID into scripts |
| Stress orchestration | Does not exist | Build from scratch (STX-001 through STX-009) |
| BullMQ | **NOT REAL** (listed in docs, not implemented) | Do NOT include queue stress in profiles |
| MySQL pool | 25 max connections, 100 queue limit | Expected bottleneck — test intentionally |
| API surface | 120+ routers | Rich target set for mixed-traffic profiles |

### Subagent Team Structure

| Agent | Role | Tasks | Notes |
|-------|------|-------|-------|
| **STX-Contract** | Define foundation | STX-001 | Must complete first |
| **STX-Infra** | Build core tools | STX-002 ∥ STX-003 ∥ STX-004 | Parallel after 001 |
| **STX-Browser** | Playwright setup | STX-006 → STX-007 | Sequential — plumbing then curation |
| **STX-Load** | k6 + invariants | STX-005 ∥ STX-008 | After profiles (004) and orchestrator (003) |
| **STX-Integration** | Wire + execute | STX-009 → STX-010 | Final sequential phase |

### Wave Execution Plan

**Wave S0** (prerequisite, ~5 min):
- Install k6: `sudo apt-get install -y gnupg software-properties-common && curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install -y k6`
- Verify: `k6 version`
- Add staging app ID to `.env.app-ids` (get from DigitalOcean console or `doctl apps list`)

**Wave S1** (foundation, ~15 min):
- `STX-001`: Define canonical stress command contract + runbook
  - Must document: k6 install requirement, staging URL, connection pool ceiling (25), NO BullMQ queue testing

**Wave S2** (parallel burst, ~30 min):
- `STX-002`: Build strict stress preflight gate (fast fail, <2 min)
  - Must check: staging health, k6 binary exists, auth prerequisites present, staging app ID resolved
- `STX-003`: Implement stress orchestrator shell (no-repair mode, `NO_REPAIR=1` default)
- `STX-004`: Add stress profiles config (smoke, peak, soak)
  - Profiles must target: tRPC API endpoints + DB query load. NOT job queue throughput (BullMQ doesn't exist).
  - Connection pool note: VUs > 20 will hit the 25-connection ceiling. This is the expected stress point.
- `STX-006`: Add staging-critical Playwright project/tag plumbing
  - Note: `e2e-live-site.yml` was previously archived. Investigate why before rebuilding. Use `PLAYWRIGHT_BASE_URL` env var (already supported in config).

**Wave S3** (parallel, ~30 min):
- `STX-005`: Add k6 mixed-traffic stress script for staging API scale lane (needs STX-004 profiles)
- `STX-007`: Curate staging-critical browser suite from existing tests (needs STX-006 plumbing)
  - DoD says "no broad rewrite" — scope limiter on selector fragility work
- `STX-008`: Integrate invariant strict gate + standardized artifact bundle (needs STX-003 orchestrator)

**Wave S4** (wiring, ~20 min):
- `STX-009`: Wire package commands (`pnpm stress:smoke`, `pnpm stress:peak`, etc.) + agent phrase mapping

**Wave S5** (execution, ~30 min):
- `STX-010`: Execute smoke + peak rehearsals and publish release-ready stress evidence
  - **Expect first run to produce blockers** (STX-003's `NO_REPAIR=1` will halt on failures). Budget time for one iteration cycle.
  - Run smoke first, then peak. Do not run both simultaneously.

---

## Cross-Session Coordination Protocol (Hardened)

### Gate System

| Gate | When | Condition | Who Checks | Failure Action |
|------|------|-----------|------------|----------------|
| **Gate 0** | Before any session starts | Feedback release train merged to main + clean build | Evan | Do not start any session |
| **Gate 1** | After LEX-004 completes | Evan reviews all 5 policy locks for clarity | Evan | Revise LEX-004 before Wave L4 |
| **Gate 2** | After UX-H Wave U1 completes | All H1-H6 merged to main + `pnpm check/lint/test/build` pass | Session B | Session A cannot start Wave L4b |
| **Gate 3** | Before LEX Wave L4b | `git pull --rebase origin main` + verify UX-H changes present | Session A | Wait for Gate 2 |
| **Gate 4** | Before STX-010 | k6 installed + staging healthy + all STX-001→009 complete | Session C | Debug prerequisites |

### Communication Mechanism

Git is the coordination layer. No inter-session messaging needed.

```
Session B merges H1-H6 to main
    → sync-staging.yml auto-deploys to staging
    → Session A does `git pull --rebase origin main`
    → Session A verifies UX-H changes present
    → Session A starts LEX Wave L4b
```

### The 5 Confirmed File Collisions and Their Resolution

| File | Resolution | Guaranteed By |
|------|-----------|---------------|
| `InventoryWorkSurface.tsx` | UX-H edits delete/selection sections (L1019-1161). LEX edits string literals (L1573-1957). Different sections, but same file. UX-H merges first → LEX rebases on top. | Gate 2 + Gate 3 |
| `AdvancedFilters.tsx` | H3 may restructure filter panel. LEX-008 renames "Vendor" label (L214-227). UX-H merges first. | Gate 2 + Gate 3 |
| `FilterChips.tsx` | H3 may restyle chips. LEX-008 renames "Vendor" chip text (L48-52). UX-H merges first. | Gate 2 + Gate 3 |
| `InventoryCard.tsx` | H4 adds aria labels. LEX-008 renames "Vendor" label (L78). UX-H merges first. | Gate 2 + Gate 3 |
| `nomenclature.ts` | LEX-008 and LEX-011 both edit this. LEX-011→012 are serialized within Session A. | Internal Session A sequencing |

---

## Risk Register (Expanded)

| # | Risk | Impact | Probability | Mitigation | Fallback |
|---|------|--------|-------------|------------|----------|
| ~~R1~~ | ~~Feedback release train not merged~~ | ~~All sessions blocked~~ | **ELIMINATED** | Branch is already in main (verified). Gate 0.1 cleared. | N/A |
| R2 | LEX-004 ships with vague policy wording | 6 downstream tasks stall or produce wrong output | Medium | Evan review gate after LEX-004 | Pause normalization, revise LEX-004 |
| R3 | UX-H takes longer than expected, delays LEX Phase 7 | LEX Session A idles waiting for Gate 2 | Medium | LEX has ~90 min of foundation work before needing Gate 2. Timing buffer is large. | LEX starts 013+015 (no UI) while waiting |
| R4 | LEX-008→012 conflicts with UX-H despite sequencing | Merge conflicts in 5 collision files | Low (gates prevent) | Gate 2 ensures UX-H is merged. Gate 3 ensures LEX rebases. | Manual conflict resolution |
| R5 | k6 not installable in session environment | STX-005 and STX-010 blocked | Medium | Wave S0 verifies installation upfront | Use `artillery` or `autocannon` as k6 alternative |
| R6 | STX-010 first rehearsal produces blockers | STX completion delayed | High (expected) | Budget one iteration cycle. Run smoke before peak. | Document blockers in BLOCKERS.md, ship as partial |
| R7 | LEX-011 and LEX-012 conflict on shared files | Merge conflicts within Session A | **Eliminated** | LEX-011→012 are serialized (no longer parallel) | N/A |
| R8 | Staging unavailable during STX-010 | Blocks final stress test | Low | Gate 4 checks staging health. Preflight gate (STX-002) fast-fails. | Retry after staging recovers |
| R9 | Connection pool (25 max) saturated during stress test | k6 tests fail or produce misleading results | Expected | STX-004 profiles document this as the expected bottleneck | This IS the stress test finding |

---

## Session Launch Prompts (Copy-Paste Ready)

### Session A Prompt:
```
You are executing the LEX Terminology Bible Program (TER-546, 16 subtasks).

## Context
Read docs/roadmaps/EPIC_PARALLEL_EXECUTION_PLAN.md — you are Session A.
Linear API key: <ask Evan for key>

## Branch
Branch off latest main: claude/lex-terminology-bible-{sessionId}

## Execution Order
Execute waves L1 → L2 → L3 → L4a → L4b → L5.

## Critical Gates
1. After LEX-004: STOP. Notify Evan to review the 5 policy locks before proceeding.
2. Before Wave L4b (LEX-008→012 UI normalization):
   - Run: git pull --rebase origin main
   - Verify UX-H inventory changes are present (H1-H4 should be merged)
   - If NOT present: start LEX-013 + LEX-015 only (no UI overlap), wait for merge
3. LEX-011 must complete BEFORE LEX-012 starts (shared files).

## Verification
Run pnpm check && pnpm lint && pnpm test && pnpm build after each wave.
Use /wave-execute for each wave.
```

### Session B Prompt:
```
You are executing the UX Master Plan (TER-523 H1-H6 + TER-524 S1-S4, 10 subtasks).

## Context
Read docs/roadmaps/EPIC_PARALLEL_EXECUTION_PLAN.md — you are Session B.
Linear API key: <ask Evan for key>

## Branch
Branch off latest main: claude/ux-master-plan-{sessionId}

## Execution Order
Wave U1: H1 → H2 → (H3 ∥ H4) in one team, H5 ∥ H6 in parallel team.
Wave U2: S1 ∥ S2 ∥ S3 ∥ S4 (all parallel).

## CRITICAL: You are on the critical path
Another session (Session A / LEX) is BLOCKED waiting for your H1-H4 inventory
changes to merge to main. Prioritize inventory tasks. Ship H1-H4 first, then
H5/H6 and S-tasks.

## File Safety Rules
- H1, H2, H3, H4 ALL modify InventoryWorkSurface.tsx — do NOT parallelize these.
- H5, H6 are dashboard-only — safe to parallelize with inventory work.
- H3 touches AdvancedFilters.tsx, FilterChips.tsx — must complete before LEX touches them.

## Verification
Run pnpm check && pnpm lint && pnpm test && pnpm build after each wave.
After H1-H6: push, create PR, merge to main immediately.
Use /wave-execute for each wave.
```

### Session C Prompt:
```
You are executing STX Staging Stress Testing (TER-528, 10 subtasks).

## Context
Read docs/roadmaps/EPIC_PARALLEL_EXECUTION_PLAN.md — you are Session C.
Linear API key: <ask Evan for key>

## Branch
Branch off latest main: claude/stx-stress-testing-{sessionId}

## Execution Order
Wave S0 (prereqs) → S1 → S2 → S3 → S4 → S5.

## Fully Independent
You have ZERO file overlap with Sessions A or B. No coordination needed.

## Critical Prerequisites
1. k6 must be installed before Wave S2. See plan for install commands.
2. Staging app ID must be wired into scripts.
3. BullMQ is NOT implemented despite being in CLAUDE.md — do NOT include
   queue worker stress in profiles. Focus on tRPC API + DB query load.
4. MySQL connection pool is 25 max — this IS the expected bottleneck.
5. e2e-live-site.yml was previously archived — investigate why before
   rebuilding live-site browser testing in STX-006/007.

## Verification
Run pnpm check && pnpm lint && pnpm test && pnpm build after each wave.
Expect STX-010 first run to produce blockers — budget one iteration cycle.
Use /wave-execute for each wave.
```

---

## Execution Checklist

### Pre-Launch (Evan)

- [x] **Gate 0.1**: ~~Merge release train~~ — CLEARED. Branch already fully integrated into main.
- [ ] **Gate 0.2**: Verify clean build on main: `pnpm check && pnpm lint && pnpm test && pnpm build`
- [ ] **Gate 0.3**: Verify staging health: `curl -s https://terp-staging-yicld.ondigitalocean.app/health`
- [ ] Spin up 3 Claude Code sessions
- [ ] Paste Session A prompt into first session
- [ ] Paste Session B prompt into second session
- [ ] Paste Session C prompt into third session

### Mid-Flight Gates

- [ ] **Gate 1**: Review LEX-004 policy locks when Session A notifies (5 policies must be unambiguous)
- [ ] **Gate 2**: Session B merges H1-H6 to main (check GitHub for merged PR)
- [ ] **Gate 3**: Session A pulls main before starting LEX-008→012 (Session A self-checks)
- [ ] **Gate 4**: Session C verifies k6 installed + staging healthy before STX-010

### Post-Completion

- [ ] All 3 sessions report PASS on verification quartet
- [ ] All 3 branches merged to main
- [ ] Staging deployment verified (all 3 waves of changes deployed)
- [ ] Update Linear issues to Done via API or UI
- [ ] Sync roadmap: `python3 scripts/sync_linear_to_github_roadmap.py`
- [ ] Final audit: `/project:audit/full`

---

## Efficiency Metrics (Revised)

| Metric | Sequential | This Plan | Speedup |
|--------|-----------|-----------|---------|
| Total task count | 36 tasks | 36 tasks | — |
| Critical path length | 36 tasks (~18h) | 16 steps (~5.5h) | **3.3x** |
| Max concurrent agents | 1 | 3 sessions × 2-5 subagents = **6-15** | — |
| Estimated wall-clock | ~18 hours | **~3.5-4.5 hours** | **4-5x** |
| Collision risk | N/A | **Zero** (gate-protected) | — |

*Note: v2 estimates are slightly longer than v1 because we added mandatory gates, serialized LEX-011→012, and serialized UX-H inventory tasks. The tradeoff is guaranteed correctness.*
