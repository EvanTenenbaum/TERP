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

---

## 12. Extended Red Hat QA Findings (Deep Adversarial Review)

This section captures additional findings from a comprehensive adversarial review conducted on 2026-01-19.

### 12.1 Technical Architecture Gaps

#### T-001: Responsive/Mobile Considerations Missing

**Finding**: No specification for how Work Surfaces adapt to different screen sizes.

**Risk**: Warehouse staff often use tablets; sales reps use phones for quick lookups.

**Required Specifications**:
- **Desktop (≥1280px)**: Full Work Surface with grid + inspector side-by-side
- **Tablet (768-1279px)**: Grid full-width; inspector as slide-over sheet
- **Mobile (<768px)**: Single-column view; inspector replaces grid temporarily

**Breakpoint Behavior**:
| Breakpoint | Grid Columns | Inspector | Context Header |
|------------|--------------|-----------|----------------|
| ≥1440px    | Full         | 400px fixed right | Full sticky |
| 1280-1439px| Full         | 360px fixed right | Full sticky |
| 1024-1279px| Full         | Slide-over sheet | Collapsible |
| 768-1023px | Reduced cols | Full-screen sheet | Collapsed by default |
| <768px     | Card layout  | Full-screen | Summary only |

#### T-002: Offline/Degraded Network Handling

**Finding**: No specification for handling network failures during data entry.

**Risk**: Users lose work; silent data loss; duplicate submissions.

**Required Patterns**:
- **Optimistic UI**: Show success immediately, queue for sync
- **Offline Queue**: Store mutations in IndexedDB when offline
- **Conflict Resolution**: Last-write-wins with user notification for conflicts
- **Retry Strategy**: Exponential backoff (1s, 2s, 4s, 8s, max 30s)

**Save State Extensions**:
```
✅ Saved              - Persisted to server
🟡 Saving…            - Request in flight
🟠 Queued (offline)   - Stored locally, pending sync
🔴 Needs attention    - Validation error or conflict
⚠️ Sync required     - Local changes not yet synced
```

#### T-003: Loading States and Skeleton Patterns

**Finding**: No specification for loading states during data fetch.

**Required Patterns**:
- **Initial Load**: Full skeleton matching grid layout
- **Pagination Load**: Inline spinner at grid bottom
- **Inspector Load**: Skeleton for inspector content only
- **Action Processing**: Disable button + spinner; never hide button
- **Refresh**: Subtle overlay; keep stale data visible

**Skeleton Rules**:
- Skeleton shape must match actual content layout
- Animation: subtle pulse (opacity 0.6 → 1.0, 1.5s cycle)
- Never show spinner + skeleton simultaneously
- Minimum display time: 200ms (prevent flash)

#### T-004: Error Boundary Patterns

**Finding**: No specification for handling unexpected errors.

**Required Patterns**:
- **Component-level**: Catch errors in grids; show inline "Something went wrong" + retry
- **Page-level**: Full error boundary with "Go back" option
- **Network errors**: Toast notification + automatic retry for GET; manual retry for mutations
- **Validation errors**: Inline field errors + summary in status bar

**Error Display Hierarchy**:
1. Field-level errors (inline, below field)
2. Row-level errors (row highlight + icon)
3. Form-level errors (status bar summary)
4. Page-level errors (error boundary component)
5. Global errors (toast notification)

#### T-005: Animation/Transition Guidelines

**Finding**: No specification for motion design.

**Required Specifications**:
- **Inspector open/close**: slide-in 200ms ease-out
- **Row creation**: fade-in 150ms
- **Row deletion**: fade-out 150ms + collapse 100ms
- **Save state change**: color transition 300ms
- **Focus ring**: instant (no transition)
- **Bulk selection**: checkbox scale 100ms

**Motion Principles**:
- Never animate during typing
- Reduce motion when `prefers-reduced-motion: reduce`
- No animations longer than 300ms
- Use `will-change` sparingly for performance

### 12.2 UX/UI Design Gaps

#### U-001: Work Surface vs Review Surface Visual Distinction

**Finding**: No visual specification differentiating execution surfaces from analysis surfaces.

**Required Specifications**:

| Aspect | Work Surface | Review Surface |
|--------|--------------|----------------|
| Primary action | Create/Edit | Filter/Export |
| Status bar | Save state + errors | Totals + filters |
| Inspector | Edit form | Read-only details |
| Grid behavior | Inline edit | Click to navigate |
| Context header | Editable defaults | Filter controls |
| Background | `bg-background` | `bg-muted/30` |
| Border | None | `border-l-4 border-primary/20` |

#### U-002: Data Density Guidelines

**Finding**: No specification for grid column limits and density.

**Required Specifications**:
- **Maximum visible columns (no scroll)**: 8-10 on desktop
- **Minimum column width**: 80px (prevents text truncation issues)
- **Optimal row height**: 40px (touch-friendly)
- **Grid spacing**: 8px cell padding
- **Column resize**: Minimum 60px, maximum 400px

**Column Priority Tiers**:
1. **Always visible**: ID, primary name, status, primary amount
2. **Default visible**: Date, secondary fields
3. **Hidden by default**: Notes, metadata, timestamps
4. **Inspector only**: Audit history, complex objects

#### U-003: Empty State Patterns

**Finding**: No specification for empty states.

**Required Patterns**:
- **No data yet**: Illustration + "No [items] yet" + primary action button
- **No search results**: "No results for [query]" + clear filters link
- **Filtered to empty**: "No [items] match filters" + reset button
- **Error state**: "Couldn't load [items]" + retry button

**Empty State Content Template**:
```
[Illustration - optional]
[Headline - what's empty]
[Description - why or what to do]
[Primary CTA - create/add action]
[Secondary link - optional help]
```

#### U-004: Notification/Toast Behavior in Work Surfaces

**Finding**: No specification for toast positioning and behavior.

**Required Specifications**:
- **Position**: Bottom-right, above status bar
- **Stack**: Maximum 3 visible, FIFO
- **Duration**: Success 3s, Info 5s, Warning 7s, Error persistent
- **Dismissal**: Click X, swipe, or auto-dismiss
- **Action toasts**: Include undo button, persist until action taken or dismissed

**Toast vs Inline Error Rules**:
- Use toast for: Success confirmations, background operations, undo prompts
- Use inline for: Validation errors, field-specific issues
- Never use toast for: Errors that require user action on specific fields

#### U-005: Scroll Behavior Specifications

**Finding**: No specification for grid scrolling strategy.

**Required Specifications**:
- **Virtualization**: Enable for >100 rows
- **Infinite scroll**: Trigger at 80% scroll depth
- **Page size**: 50 rows per fetch
- **Scroll restoration**: Maintain position on back navigation
- **Fixed elements**: Header + status bar always visible

**Keyboard Scrolling**:
- Page Up/Down: Scroll by viewport height
- Home/End: Jump to first/last row
- Ctrl+Home/End: Jump and select first/last row

### 12.3 Business Logic Gaps

#### B-001: Concurrent Editing Handling

**Finding**: No specification for handling multiple users editing same records.

**Required Specifications**:
- **Locking Strategy**: Optimistic locking via `version` field (exists in schema)
- **Conflict Detection**: Compare version on save; reject if stale
- **User Notification**: "This record was modified by [user]. Reload to see changes."
- **Resolution Options**: Reload (lose changes) or Force save (overwrite)

**Implementation**:
```typescript
// On save attempt
if (serverVersion > localVersion) {
  showConflictDialog({
    message: `Modified by ${lastModifiedBy} at ${lastModifiedAt}`,
    options: ['Reload', 'Force Save', 'Cancel']
  });
}
```

#### B-002: Undo Window Specification

**Finding**: No specification for how long undo is available.

**Required Specifications**:
- **Destructive actions**: 10 seconds to undo
- **Soft delete**: 30 days recovery period (from `deletedAt`)
- **Bulk operations**: 10 seconds, all-or-nothing undo
- **Cross-session**: No undo across page navigation

**Undo Implementation**:
- Queue deleted records client-side for undo window
- Show "Deleted. Undo" toast with countdown
- On undo: restore from client queue
- On timeout: commit deletion to server

#### B-003: Validation Order Specification

**Finding**: No specification for client vs server validation order.

**Required Specifications**:
1. **Client-side first**: Type validation, required fields, format
2. **Debounced async**: Uniqueness checks, availability (300ms debounce)
3. **Server-side always**: Business rules, permissions, invariants
4. **Never trust client**: Server validates everything regardless of client validation

**Validation Timing by Type**:
| Validation Type | Trigger | Location |
|----------------|---------|----------|
| Required field | blur | Client |
| Format (email, phone) | blur | Client |
| Type (number, date) | change (debounced) | Client |
| Uniqueness | blur (300ms) | Server (async) |
| Business rules | submit | Server |
| Cross-field | blur of dependent field | Client + Server |

#### B-004: Session Timeout Handling

**Finding**: No specification for handling session timeout during long data entry.

**Required Specifications**:
- **Warning**: Show at 5 minutes before timeout
- **Auto-save**: Draft saved to localStorage before session expires
- **Recovery**: On re-login, prompt to restore unsaved work
- **Heartbeat**: Silent ping every 5 minutes to extend session

**Session Timeout Flow**:
1. User inactive for 25 minutes → Show "Session expiring" warning
2. User continues inactivity → Auto-save draft at 29 minutes
3. Session expires → Redirect to login with return URL
4. User re-authenticates → Prompt "Restore unsaved changes?"

#### B-005: Batch Size Limits for Bulk Operations

**Finding**: No specification for bulk operation limits.

**Required Specifications**:
- **Bulk select maximum**: 500 rows
- **Bulk update maximum**: 100 rows per request
- **Bulk delete maximum**: 50 rows per request
- **Export maximum**: 10,000 rows (paginated download for more)

**User Feedback for Large Operations**:
```
Selecting 100+ items → "100 selected. Select all 1,234?"
Bulk action on 50+ → "Processing 50 items..." with progress
Export 1000+ → "Preparing export... This may take a moment"
```

### 12.4 Cross-Cutting Concerns

#### X-001: Accessibility (WCAG 2.1 AA) Compliance

**Finding**: Only keyboard navigation specified; broader accessibility missing.

**Required Specifications**:
- **Focus indicators**: 2px solid ring, contrast ratio ≥3:1
- **Color independence**: Never use color alone to convey meaning
- **Screen reader labels**: All interactive elements have accessible names
- **Announce changes**: Use aria-live for save state, errors, toast
- **Reduced motion**: Respect `prefers-reduced-motion`
- **Minimum target size**: 44x44px for touch targets

**ARIA Patterns**:
- Grid: `role="grid"`, `role="row"`, `role="gridcell"`
- Inspector: `role="complementary"`, `aria-label="Details panel"`
- Status bar: `role="status"`, `aria-live="polite"`
- Save indicator: `aria-live="assertive"` for errors only

#### X-002: Internationalization (i18n) Considerations

**Finding**: No i18n specifications.

**Required Specifications**:
- **Text direction**: Support LTR and RTL layouts
- **Date formats**: Use Intl.DateTimeFormat (respects locale)
- **Number formats**: Use Intl.NumberFormat (respects locale)
- **Currency**: Always show currency symbol with amounts
- **Pluralization**: Use proper plural rules (not just +s)

**Layout Adjustments for RTL**:
- Inspector panel: Appears on left instead of right
- Grid: Columns reverse order
- Icons: Mirror directional icons (arrows, chevrons)

#### X-003: Print/Export Considerations

**Finding**: No print stylesheet or export specifications.

**Required Specifications**:
- **Print view**: Hide navigation, inspector; grid fills page
- **Page breaks**: Avoid breaking rows across pages
- **Headers**: Repeat context header on each page
- **Export formats**: CSV (default), Excel, PDF

**Print Media Styles**:
```css
@media print {
  .inspector-panel, .navigation, .status-bar { display: none; }
  .work-surface-grid { width: 100%; }
  .context-header { position: static; }
}
```

#### X-004: Browser Compatibility

**Finding**: No browser compatibility specification.

**Required Support Matrix**:
| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 90+ | Primary target |
| Firefox | 88+ | Full support |
| Safari | 14+ | iOS Safari included |
| Edge | 90+ | Chromium-based |

**Polyfills Required**:
- ResizeObserver (for grid virtualization)
- IntersectionObserver (for infinite scroll)
- IndexedDB (for offline support)

### 12.5 Additional Anti-Patterns (Extended)

Building on Section 5, add these anti-patterns:

- **Infinite spinners**: Always show progress or timeout after 30s
- **Disabled without explanation**: Always tooltip why disabled
- **Silent failures**: Every failure must have user-visible feedback
- **Data loss on navigation**: Warn if unsaved changes exist
- **Stale data display**: Show "last updated" for cached data >5 min old
- **Pagination amnesia**: Losing scroll position on back navigation
- **Modal for confirmation only**: Use toast with undo instead
- **Form reset on error**: Never clear valid fields on partial failure

### 12.6 Performance Budgets

**Finding**: No performance specifications.

**Required Budgets**:
| Metric | Budget | Measurement |
|--------|--------|-------------|
| First Contentful Paint | <1.5s | Lighthouse |
| Time to Interactive | <3s | Lighthouse |
| Grid render (100 rows) | <100ms | Performance.now() |
| Inspector open | <50ms | Performance.now() |
| Keystroke response | <50ms | Input delay |
| Save roundtrip | <500ms | Network + server |

**Monitoring**:
- Log performance marks for critical operations
- Alert on P95 exceeding 2x budget
- Dashboard for performance trends

---

## 13. Implementation Priority Matrix

Based on red hat findings, prioritize implementation:

### P0 - Must have before any Work Surface deployment
- [ ] Save state indicator component (P9)
- [ ] Keyboard contract hook (P11)
- [ ] Validation timing helper (P6)
- [ ] Error boundary wrapper
- [ ] Loading skeleton components

### P1 - Required for production readiness
- [ ] Responsive breakpoint handling
- [ ] Offline queue + sync
- [ ] Concurrent edit detection
- [ ] Session timeout handling
- [ ] Accessibility audit + fixes

### P2 - Required for scale
- [ ] Performance monitoring
- [ ] Bulk operation limits
- [ ] Export functionality
- [ ] Print styles
- [ ] i18n infrastructure

---

## 14. Validation Checklist

Before marking this strategy complete, verify:

- [ ] All P0 components have implementation tasks in ATOMIC_ROADMAP.md
- [ ] All 14 "unknown" features in preservation matrix have resolution plan
- [ ] Accounting SME has reviewed ledger UI requirements
- [ ] Responsive designs reviewed for tablet/mobile
- [ ] Accessibility audit scheduled
- [ ] Performance budgets integrated into CI/CD
- [ ] Error handling patterns documented with code examples
- [ ] Offline capability scope decision made
