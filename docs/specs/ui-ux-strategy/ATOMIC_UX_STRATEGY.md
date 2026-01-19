# ATOMIC_UX_STRATEGY.md

## 1. Core Problem and Success Definition

### 1.1 Problem Statement

TERP’s current UX slows high‑velocity operations by overusing modal flows, context switches, and non-deterministic focus behavior. The user wants “really simple data entry” and “spreadsheet‑like speed,” **without** turning TERP into a fragile, unconstrained spreadsheet.

### 1.2 Success Definition (TERP‑specific)

**Speed (Operational Velocity)** is defined as measurable reductions in:

- **Time‑to‑entry**: median time from opening a workflow to committing a valid row or record.
- **Keystroke count**: average keystrokes + pointer interactions per row/record.
- **Error recovery time**: time from validation failure to corrected commit.
- **Context switching**: number of view/surface changes per workflow completion.

**Safety (ERP‑grade correctness)** is defined as:

- Zero silent data corruption on commit.
- Required validations occur at commit/blur, not mid‑typing.
- Every mutation has visible save state and undo where feasible.

**“Not a glorified spreadsheet”** means:

- Constraints are explicit and enforced (validation + defaults).
- Complex objects edit in the inspector, not in free‑form grid cells.
- Clear save state + audit surfaces are always available.

---

## 2. UX Doctrine (Non‑Negotiables)

(derived from `TERP_UX_DOCTRINE.md`)

1. **Velocity → Safety → Context** is always the priority order.
2. **Keyboard‑first contracts** are consistent across Work Surfaces.
3. **Deterministic focus**: no unexpected focus jumps.
4. **No core‑flow modals** for high‑frequency operations.
5. **Hybrid editing**: inline primitives, inspector for meaning.
6. **Save‑state is always visible** (Saved / Saving / Needs attention).

**Violations** include:

- Nested modals in core flows
- Field‑level selection inside Cmd+K
- Grid cells for complex multi‑field objects

---

## 3. UX System Primitives

Each primitive is a **buildable unit** with guarantees, tradeoffs, metrics, and applicability rules.

### P1. Work Surface Shell

- **What**: Standard layout shell: Sticky Context Header + Primary Work Grid + Inspector Panel + Status Bar.
- **Problem solved**: Replaces modal‑heavy workflows with a consistent, high‑velocity work surface.
- **Guarantees**: consistent keyboard map, visible save state, persistent context.
- **Tradeoffs/failure modes**: can feel “dense” if context header overloaded; risk of inconsistency if modules diverge.
- **Metrics**: time‑to‑entry; drop‑off rate during core flows; error rate per commit.
- **Applies**: Intake, Sales Orders, Inventory Count, Pricing updates, Ledger adjustments.
- **Does NOT apply**: read‑only dashboards, infrequent admin configuration.

### P2. Sticky Context Header

- **What**: Always‑visible header defining batch/session scope (vendor/customer, location, date, terms).
- **Problem**: reduces repeated entry and context loss.
- **Guarantees**: defaults applied to new rows; never scrolls away.
- **Tradeoffs**: limited space; must prevent clutter.
- **Metrics**: % rows created without editing default fields.
- **Applies**: intake, PO, orders, inventory counts.
- **Not**: simple single‑record forms.

### P3. Primary Work Grid (Velocity Grid / Smart Grid)

- **What**: Dense, keyboard‑first grid for row entry and review.
- **Problem**: fast repeated data entry.
- **Guarantees**: deterministic Tab/Enter/Esc; row‑level commit; inline primitives only.
- **Tradeoffs**: requires virtualization for performance; risk of mis‑edits if validation timing is wrong.
- **Metrics**: row commit success rate; average row entry time.
- **Applies**: intake lines, order lines, inventory adjustments.
- **Not**: complex object creation with many dependent fields.

### P4. Inspector Panel (Non‑modal)

- **What**: Right‑side panel for detailed editing and audit context.
- **Problem**: need complex edits without leaving context.
- **Guarantees**: never blocks grid; Esc closes; shows audit/history.
- **Tradeoffs**: can hide critical info if panel is ignored.
- **Metrics**: % of complex edits done without navigation.
- **Applies**: batch details, pricing rules, ledger adjustments.
- **Not**: simple single‑field edits.

### P5. Bulk Action Model + Selection Model

- **What**: Multi‑row selection with contextual action bar.
- **Problem**: bulk updates without leaving work surface.
- **Guarantees**: visible selection count; undo for destructive actions.
- **Tradeoffs**: increased UI complexity; requires clear selection state.
- **Metrics**: bulk action usage rate; undo usage.
- **Applies**: inventory operations, pick/pack, order updates.

### P6. Inline Validation Timing Model

- **What**: “Reward early, punish late” validation contract.
- **Problem**: reduce frustration while preserving correctness.
- **Guarantees**: no required errors while typing; errors on blur/commit only.
- **Tradeoffs**: delayed error visibility can hide issues until commit.
- **Metrics**: error correction time; failed commit rate.
- **Applies**: all Work Surfaces.

### P7. Defaults + Smart Constraints

- **What**: Visible, editable defaults derived from context (vendor, location, last‑used).
- **Problem**: eliminate repeated entry and errors.
- **Guarantees**: defaults always visible and changeable; never implicit.
- **Tradeoffs**: incorrect defaults can cause silent errors if not visible.
- **Metrics**: % default overrides; error rate vs default usage.

### P8. Undo Model

- **What**: immediate undo for destructive actions (row delete, bulk remove).
- **Problem**: recover quickly without opening history.
- **Guarantees**: undo available for last destructive action.
- **Tradeoffs**: limited window; not a replacement for audit history.
- **Metrics**: undo activation rate.

### P9. Save State + Status Feedback

- **What**: Save status indicator + inline error summary.
- **Problem**: user trust in persistence.
- **Guarantees**: only 3 states: Saved/Saving/Needs attention.
- **Tradeoffs**: requires consistent API signals.
- **Metrics**: user‑reported uncertainty incidents.

### P10. Local Filtering/Search Behavior

- **What**: grid‑local search scoped to current dataset.
- **Problem**: prevents confusion with global search/Cmd+K.
- **Guarantees**: local search never navigates away.
- **Tradeoffs**: dual search needs clear labeling.
- **Metrics**: search success rate; time to find row.

### P11. Keyboard Map System

- **What**: canonical Tab/Enter/Esc/Cmd+K behaviors.
- **Problem**: eliminate muscle‑memory drift.
- **Guarantees**: same behavior across modules.
- **Tradeoffs**: some legacy flows may need refactor.
- **Metrics**: keyboard usage %, error rate by key action.

### P12. Progressive Disclosure Rules

- **What**: show 80% fields by default; advanced in inspector.
- **Problem**: reduce cognitive load without hiding essentials.
- **Guarantees**: frequent fields never hidden behind “More.”
- **Tradeoffs**: requires usage data or SME review.
- **Metrics**: use frequency of advanced fields; completion rate.

---

## 4. Pattern Registry Synthesis (System View)

| Pattern               | Purpose                     | Where it fits                     | Where it breaks              |
| --------------------- | --------------------------- | --------------------------------- | ---------------------------- |
| Work Surface          | Universal execution surface | High‑frequency flows              | Infrequent admin config      |
| Sticky Context Header | Establish batch scope       | Intake, Orders, Inventory         | Single‑record forms          |
| Primary Work Grid     | Fast entry                  | Line items, counts                | Complex objects              |
| Inspector Panel       | Contextual deep edit        | Ledger adjustments, batch details | When no complex fields exist |
| Bulk Action Bar       | Multi‑row ops               | pick/pack, inventory              | Single‑row edits             |
| Save‑State Indicator  | Trust                       | All Work Surfaces                 | None                         |
| Validation Timing     | Flow‑safe errors            | All Work Surfaces                 | None                         |
| Cmd+K Palette         | Actions + navigation        | Global shortcuts                  | Field selection              |
| Smart Defaults        | Reduce repetition           | Intake, orders                    | Where defaults are dangerous |
| Quick Create          | Avoid flow breaks           | inline new vendor/product         | if it opens nested modals    |

---

## 5. Explicit Anti‑Patterns

- Modal overload / nested modals
- Spreadsheet free‑for‑all cells
- Multi‑screen context fragmentation
- Hidden keyboard shortcuts with no discoverability
- Unbounded customization (breaks consistency)
- “Future‑proof feature bloat” (shipping speculative UI)

---

## 6. Design Decisions With Evidence + Reversibility

(Condensed decision log; full changes tracked in Assumption Log + Roadmap tasks.)

### D‑01: Work Surface as universal execution shell

- **Decision**: All high‑frequency flows use Work Surface shell.
- **Evidence For**: Doctrine + strategy package insist on consistent velocity loop; repo already has Spreadsheet view (AG Grid) and DataTable patterns.
- **Evidence Against**: Risk of forcing Work Surface on low‑frequency admin screens.
- **Resolution**: Apply only to execution surfaces; exclude admin/setup.
- **Confidence**: High
- **Reversibility**: Moderate; Work Surface is a layout shell, not a data model change.

### D‑02: Direct Intake compresses UX, not schema

- **Decision**: Direct Intake auto‑creates PO + receipt + batch events while preserving distinct records.
- **Evidence For**: Strategy package explicitly rejects schema merge; repo has intake sessions + receipts.
- **Evidence Against**: More complex orchestration across DB models.
- **Resolution**: Implement orchestration at service layer; maintain event boundaries.
- **Confidence**: High
- **Reversibility**: Low (if schema merged, costly to undo).

### D‑03: Cmd+K is not record selection

- **Decision**: Command palette for actions/navigation only.
- **Evidence For**: Doctrine + strategy package warn against competing search systems.
- **Evidence Against**: power users may request it.
- **Resolution**: local search + typeahead inside grid; Cmd+K remains global actions.
- **Confidence**: High
- **Reversibility**: High (can add later if needed).

### D‑04: Inline primitives + inspector for meaning

- **Decision**: inline edit only for safe primitives; complex fields in inspector.
- **Evidence For**: Strategy doctrine; reduces grid complexity.
- **Evidence Against**: some users want everything inline.
- **Resolution**: provide inspector fast‑open on Enter; keep inline minimal.
- **Confidence**: Medium
- **Reversibility**: Medium (can add inline cells later).

---

## 7. Strategy Stress Test (Poke Holes)

### Failure Modes

- **Grid performance bottlenecks** under large datasets.
- **Keyboard traps** if focus management is inconsistent across modules.
- **Feature loss** if flows not mapped to preservation matrix.
- **Schema mismatch** when compressing intake workflows.
- **UX drift** if teams implement patterns ad‑hoc.

### Unknown Unknowns

- Module‑specific edge cases (split receipts, returns, partial shipments).
- Ledger constraints not fully represented in UI docs.
- Limits of AG Grid vs existing DataTable patterns.

### Fallback Patterns

- If Work Surface feels too dense: split into “Execution” + “Review” modes within same shell.
- If grid performance fails: introduce virtualized list + inspector for heavy modules.
- If keyboard conflicts appear: enforce global keymap via shared hook.

---

## 8. Red Hat QA Findings (Adversarial Review) + Corrections

### Classification

- **Work type**: Strategic/system specification
- **Persistence**: Durable
- **Risk**: High (financial + operational workflows)
- **Downstream consumers**: External builders/agents + stakeholders

### Primary Findings (Red Team)

1. **API‑only feature risk**: Several features in USER_FLOWS/USER_FLOW_MATRIX appear API‑only or UI‑unknown, risking silent scope loss.
2. **Ledger rigor gap**: Ledger workflows require reversals, period locks, and immutability concepts that are not explicit in UX surface rules.
3. **Intake verification nuance**: Intake receipts include public verification links + discrepancy workflows; missing explicit preservation risks regressions.
4. **Command palette overreach**: Without explicit enforcement, agents may route field selection into Cmd+K, creating competing search models.
5. **Work Surface over‑application**: Forcing Work Surface onto low‑frequency admin configuration risks UX bloat and confusion.
6. **Test gating ambiguity**: Golden flow tests are listed, but coverage gates for API‑only flows are unspecified.

### Corrections Applied

- Added explicit validation tasks for **unknown/UI‑absent flows** in the roadmap (UXS‑005/UXS‑006).
- Updated preservation mappings to explicitly include **intake verification link + discrepancy resolution** within DF‑053.
- Added ledger‑specific risks and assumptions to ensure accounting rules are surfaced in UI patterns.
- Expanded the playbook to distinguish **Work Surfaces vs Review Surfaces** and enforce Cmd+K scope.

### Open Defects (must be resolved before rollout)

- Confirm which **API‑only flows** require UI exposure vs remain backend‑only (tracked in UXS‑005).
- Validate **ledger reversal/period lock** UI requirements against accounting SMEs (tracked in UXS‑006).

---

## 9. Repo Reality Check (Observed Baseline)

**Confirmed in repo:**

- **Spreadsheet Workflows** use AG Grid components for Intake, Inventory, Pick/Pack grids (existing high‑density pattern).
- **DataTable** component exists for list views with filters/pagination (non‑AG grid).
- **Intake Sessions + Receipts** exist in backend (intake sessions, receipt verification, discrepancy workflows).
- **Modal usage** exists via Dialog/AlertDialog components; must be retired for core flow work surfaces.
- **Accounting modules** include invoices, payments, fiscal periods, chart of accounts, journal entry flows (per flow matrix).

**Gaps / mismatches to flag:**

- Some features in USER_FLOWS appear **API‑only** or **unknown** in UI; marked UNKNOWN in matrix.
- Command palette use is global; field‑level selection must remain local to grids/forms.

---

## 10. Feature Inventory (High‑Level)

**Source of truth**: `FEATURE_PRESERVATION_MATRIX.md`.

Modules covered:

- Inventory & Intake (sessions, receipts, batches)
- Purchase Orders & Receiving
- Sales Orders & Quotes
- Accounting (Invoices, Payments, AR/AP, General Ledger, Fiscal Periods)
- Pick & Pack / Fulfillment
- CRM & Client 360
- VIP Portal, Live Shopping, Pricing, Credits
- Admin/RBAC/Feature Flags

Any unverified or ambiguous feature is marked **UNKNOWN** and has a validation task in the roadmap.

---

## 11. Execution Trace (Required Flow Compliance)

1. **Ingest & Normalize**: Strategy package docs read and normalized.
2. **Repo Reality Check**: Existing intake, receipts, grids, and modal usage mapped.
3. **Feature Inventory**: Built from repo + strategy docs + flow matrix + user flows.
4. **UX System Synthesis**: Primitives, patterns, and doctrine consolidated here.
5. **Atomic Roadmap**: PR‑sized tasks created in `ATOMIC_ROADMAP.md`.
6. **Completeness Proof**: Matrix + playbook + roadmap cross‑linked.
7. **Red Hat QA**: Adversarial gaps identified + mapped to new validation tasks.
