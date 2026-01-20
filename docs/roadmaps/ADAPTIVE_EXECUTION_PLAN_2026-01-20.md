# Adaptive Work Surface Execution Plan

> **Purpose**: Execution roadmap with built-in validation, learning loops, and adaptive re-planning
>
> **Date**: 2026-01-20
>
> **Version**: 1.0
>
> **Philosophy**: "Plan → Execute → Validate → Learn → Adapt → Repeat"

---

## Executive Summary

This execution plan builds validation and learning into every phase. Unlike a static roadmap, this plan:

1. **Validates continuously** - Not just at the end, but at meaningful integration points
2. **Learns from each phase** - Structured retrospectives capture what worked and what didn't
3. **Adapts the approach** - Later phases adjust based on earlier learnings
4. **Right-sized tasks** - Current task granularity is optimal; over-atomizing would add coordination overhead without benefit

### Why NOT Break Tasks Smaller?

| Factor | Analysis | Decision |
|--------|----------|----------|
| **Coordination overhead** | Each sub-task boundary requires handoff documentation, status sync | Keep tasks whole |
| **Context switching cost** | Frequent task switches lose implementation momentum | Minimize switches |
| **Integration risk** | More atomic pieces = more integration points = more bugs | Fewer, larger integrations |
| **Current task scope** | Tasks average 1-2 days effort with clear acceptance criteria | Already optimal |
| **Validation efficiency** | Validating at task completion is more meaningful than micro-checkpoints | Checkpoint at natural boundaries |

**Conclusion**: Current task granularity is optimal. Add internal checkpoints within tasks, not more tasks.

---

## Execution Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXECUTION FRAMEWORK                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   SPRINT 0         SPRINT 1         SPRINT 2         SPRINT 3              │
│   Foundation       Pilot Module     Scale Out        Harden                │
│   (2 days)         (3 days)         (5 days)         (3 days)              │
│                                                                             │
│   ┌─────┐          ┌─────┐          ┌─────┐          ┌─────┐               │
│   │Tasks│──────────│Tasks│──────────│Tasks│──────────│Tasks│               │
│   └──┬──┘          └──┬──┘          └──┬──┘          └──┬──┘               │
│      │                │                │                │                   │
│   ┌──▼──┐          ┌──▼──┐          ┌──▼──┐          ┌──▼──┐               │
│   │GATE │          │GATE │          │GATE │          │GATE │               │
│   │  0  │          │  1  │          │  2  │          │  3  │               │
│   └──┬──┘          └──┬──┘          └──┬──┘          └──┬──┘               │
│      │                │                │                │                   │
│   ┌──▼──┐          ┌──▼──┐          ┌──▼──┐          ┌──▼──┐               │
│   │RETRO│          │RETRO│          │RETRO│          │RETRO│               │
│   │  0  │          │  1  │          │  2  │          │  3  │               │
│   └──┬──┘          └──┬──┘          └──┬──┘          └──┬──┘               │
│      │                │                │                │                   │
│      └────────────────┴────────────────┴────────────────┘                   │
│                              │                                              │
│                    ┌─────────▼─────────┐                                    │
│                    │   PLAN REVISION   │                                    │
│                    │  (if triggered)   │                                    │
│                    └───────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sprint 0: Foundation (Days 1-2)

### Objective
Complete P0 blocker hooks that all Work Surfaces depend on.

### Tasks

| Task | Current State | Remaining Work | Owner |
|------|---------------|----------------|-------|
| **UXS-101** Keyboard hook | 70% (254 lines) | Tab/Shift+Tab navigation, AG Grid integration | Agent 1 |
| **UXS-102** Save state | 70% (293 lines) | useAppMutation integration, error state styling | Agent 1 |
| **UXS-104** Validation timing | 70% (363 lines) | Zod schema integration, form library compatibility | Agent 1 |
| **UXS-103** Inspector panel | 0% | New component creation | Agent 2 |

### Internal Checkpoints (within tasks)

**UXS-101 Checkpoints:**
1. ☐ Tab navigation working in isolation (unit test)
2. ☐ AG Grid integration functional (manual test)
3. ☐ Esc handling with inspector state (integration test)
4. ☐ Custom handler support verified

**UXS-102 Checkpoints:**
1. ☐ Component renders all 4 states correctly
2. ☐ useAppMutation integration compiles
3. ☐ Error auto-reset timer working
4. ☐ Accessibility (aria-live) verified

**UXS-103 Checkpoints:**
1. ☐ Basic panel structure renders
2. ☐ Esc closes panel (keyboard hook integration)
3. ☐ Focus trap implemented
4. ☐ Responsive behavior (slide-over on mobile)

**UXS-104 Checkpoints:**
1. ☐ No errors shown while typing (core behavior)
2. ☐ Errors appear on blur
3. ☐ validateAll() for commit
4. ☐ Zod schema compatibility

### Validation Gate 0

**Must pass ALL criteria to proceed to Sprint 1:**

| # | Criterion | Validation Method | Pass/Fail |
|---|-----------|-------------------|-----------|
| V0.1 | All 4 hooks compile with zero TS errors | `pnpm typecheck` | ☐ |
| V0.2 | Unit tests pass for all hooks | `pnpm test --filter=work-surface` | ☐ |
| V0.3 | Hooks can be imported together without conflict | Integration test file | ☐ |
| V0.4 | Demo page shows all hooks working together | Manual verification | ☐ |
| V0.5 | No console errors in development | Browser dev tools | ☐ |

**Validation Script:**
```bash
#!/bin/bash
# Gate 0 Validation
set -e
echo "V0.1: TypeScript compilation..."
pnpm typecheck

echo "V0.2: Unit tests..."
pnpm test --filter=work-surface --passWithNoTests

echo "V0.3: Integration check..."
tsx scripts/validate-work-surface-hooks-integration.ts

echo "V0.4: Manual verification required"
echo "V0.5: Manual verification required"

echo "✅ Gate 0 automated checks passed"
```

### Retrospective 0

**Questions to answer after Sprint 0:**

1. **What worked well?**
   - Which patterns from existing hooks (useOptimisticLocking, useAppMutation) were most helpful?
   - Did skeleton implementations save the expected ~70% effort?

2. **What didn't work?**
   - Any AG Grid integration issues not anticipated?
   - Any Zod/form library conflicts?

3. **What did we learn?**
   - Actual effort vs. estimated (2 days)?
   - Any risks that materialized?

4. **What should we change for Sprint 1?**
   - Task breakdown adjustments needed?
   - Validation criteria changes?

**Metrics to capture:**
| Metric | Expected | Actual | Variance |
|--------|----------|--------|----------|
| Sprint duration | 2 days | ___ | ___ |
| TypeScript errors introduced | 0 | ___ | ___ |
| Test coverage change | +5% | ___ | ___ |
| Bugs found in gate | <2 | ___ | ___ |

---

## Sprint 1: Pilot Module - Intake (Days 3-5)

### Objective
Implement first complete Work Surface in Intake module, proving the pattern.

### Tasks

| Task | Scope | Estimated Effort | Owner |
|------|-------|------------------|-------|
| **UXS-201** Direct Intake Work Surface | Shell + header + grid + inspector + status | 2 days | Agent 1 |
| **UXS-202** Standard PO alignment | Apply same patterns to PO page | 1 day | Agent 1 |
| **UXS-203** Mode decision banner | Mode switcher between Intake/PO | 0.5 day | Agent 1 |

### Internal Checkpoints (UXS-201 - largest task)

**Phase A: Shell Structure (4 hrs)**
1. ☐ WorkSurface wrapper component created
2. ☐ Sticky header implemented
3. ☐ Layout grid (header/grid/inspector zones)

**Phase B: Grid Integration (4 hrs)**
1. ☐ AG Grid receives keyboard hook
2. ☐ Row selection triggers inspector
3. ☐ Enter creates new row

**Phase C: Inspector Integration (4 hrs)**
1. ☐ Inspector panel opens on row select
2. ☐ Esc closes inspector
3. ☐ Data flows bidirectionally

**Phase D: Status Integration (4 hrs)**
1. ☐ Save state indicator visible
2. ☐ Mutation hooks use save state
3. ☐ Validation timing active

### Validation Gate 1

| # | Criterion | Validation Method | Pass/Fail |
|---|-----------|-------------------|-----------|
| V1.1 | GF-001 (Direct Intake) E2E passes | `pnpm test:e2e intake.spec.ts` | ☐ |
| V1.2 | Keyboard contract verified | E2E keyboard navigation test | ☐ |
| V1.3 | No modals in core intake flow | Manual flow-through | ☐ |
| V1.4 | Save state visible and accurate | Manual verification | ☐ |
| V1.5 | Feature flag rollback works | Disable flag, verify old UI | ☐ |
| V1.6 | TypeScript still compiles | `pnpm typecheck` | ☐ |
| V1.7 | Schema validation passes | `pnpm validate:schema` | ☐ |
| V1.8 | RBAC: Inventory role can complete flow | QA Auth test | ☐ |

**Validation Script:**
```bash
#!/bin/bash
# Gate 1 Validation
set -e

echo "V1.1: GF-001 E2E test..."
pnpm test:e2e tests-e2e/critical-paths/intake.spec.ts

echo "V1.6: TypeScript compilation..."
pnpm typecheck

echo "V1.7: Schema validation..."
pnpm validate:schema

echo "V1.8: RBAC test..."
tsx scripts/qa/validate-intake-rbac.ts

echo "✅ Gate 1 automated checks passed"
echo "⚠️ Manual checks required: V1.2-V1.5"
```

### Retrospective 1

**Critical learning questions:**

1. **Pattern validation:**
   - Did the Work Surface pattern feel natural in Intake?
   - What friction points emerged?

2. **Integration lessons:**
   - How well did AG Grid accept the keyboard hook?
   - Were there unexpected modal dependencies?

3. **Effort calibration:**
   - Actual effort vs. estimated (3 days)?
   - Should Sprint 2 estimates change?

4. **Architecture decisions:**
   - Should any hook APIs change based on real usage?
   - Are there new shared utilities to extract?

**Metrics to capture:**
| Metric | Expected | Actual | Variance |
|--------|----------|--------|----------|
| Sprint duration | 3 days | ___ | ___ |
| Modals removed | 2 (VendorCreateDialog, etc.) | ___ | ___ |
| E2E test pass rate | 100% | ___ | ___ |
| User testing feedback | Positive | ___ | ___ |

### Plan Revision Trigger

**STOP and revise plan if ANY of these occur:**
- [ ] Sprint duration exceeds 150% of estimate (4.5 days)
- [ ] More than 3 TypeScript errors introduced
- [ ] E2E test failures in unrelated modules
- [ ] Hook API required breaking changes
- [ ] Performance regression >50ms on grid render

---

## Sprint 2: Scale Out (Days 6-10)

### Objective
Apply proven patterns to remaining modules in parallel.

### Parallel Execution Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                    SPRINT 2: PARALLEL TRACKS                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Day 6-7           Day 8-9           Day 10                    │
│                                                                │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐             │
│  │ Agent 1  │      │ Agent 1  │      │ All      │             │
│  │ UXS-301  │      │ UXS-302  │      │ Agents   │             │
│  │ (Orders) │      │ (Quotes) │      │          │             │
│  └──────────┘      └──────────┘      │ SYNC     │             │
│                                      │ POINT    │             │
│  ┌──────────┐      ┌──────────┐      │          │             │
│  │ Agent 2  │      │ Agent 2  │      │ Cross-   │             │
│  │ UXS-401  │      │ UXS-402  │      │ module   │             │
│  │(Inventory│      │(Pick/Pack│      │ testing  │             │
│  └──────────┘      └──────────┘      │          │             │
│                                      │ Pattern  │             │
│  ┌──────────┐      ┌──────────┐      │ align-   │             │
│  │ Agent 3  │      │ Agent 3  │      │ ment     │             │
│  │ UXS-501  │      │ UXS-502  │      │ check    │             │
│  │(Accountng│      │ (Ledger) │      │          │             │
│  └──────────┘      └──────────┘      └──────────┘             │
│                                                                │
│  ┌──────────┐      ┌──────────┐                               │
│  │ Agent 4  │      │ Agent 4  │                               │
│  │ UXS-705  │      │ UXS-701  │                               │
│  │(Conflict)│      │(Responsve│                               │
│  └──────────┘      └──────────┘                               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Tasks by Agent

**Agent 1: Sales/Orders Track**
| Task | Days | Dependencies | Validation |
|------|------|--------------|------------|
| UXS-301 | 1.5 | Sprint 0 hooks | GF-003 E2E |
| UXS-302 | 1 | UXS-301 | Quotes E2E |

**Agent 2: Inventory Track**
| Task | Days | Dependencies | Validation |
|------|------|--------------|------------|
| UXS-401 | 1.5 | Sprint 0 hooks | GF-007 E2E |
| UXS-402 | 1 | UXS-401 | GF-005 E2E |

**Agent 3: Accounting Track**
| Task | Days | Dependencies | Validation |
|------|------|--------------|------------|
| UXS-501 | 1.5 | Sprint 0 hooks | GF-004 E2E |
| UXS-502 | 1 | UXS-501 | GF-006 E2E |

**Agent 4: Infrastructure Track**
| Task | Days | Dependencies | Validation |
|------|------|--------------|------------|
| UXS-705 | 1.5 | useOptimisticLocking | Two-browser test |
| UXS-701 | 1 | UXS-103 | Viewport tests |

### Sync Points

**Daily sync (15 min):**
- Blockers identified?
- Pattern divergence detected?
- Shared utility extraction needed?

**Day 10 Integration Sync:**
- All modules use identical keyboard contract?
- Save state behavior consistent?
- Inspector interaction identical?

### Validation Gate 2

| # | Criterion | Validation Method | Pass/Fail |
|---|-----------|-------------------|-----------|
| V2.1 | All 8 golden flows pass | Full E2E suite | ☐ |
| V2.2 | Keyboard behavior identical across modules | Cross-module E2E | ☐ |
| V2.3 | Save state behavior consistent | Visual comparison | ☐ |
| V2.4 | Conflict detection working | Two-browser test | ☐ |
| V2.5 | Responsive breakpoints work | Viewport tests | ☐ |
| V2.6 | No TypeScript errors | `pnpm typecheck` | ☐ |
| V2.7 | Schema validation passes | `pnpm validate:schema` | ☐ |
| V2.8 | Data integrity validated | `tsx scripts/validate-data-integrity.ts` | ☐ |
| V2.9 | Performance: Grid render <100ms | Performance test | ☐ |
| V2.10 | Bundle size increase <50KB | Build analysis | ☐ |

**Validation Script:**
```bash
#!/bin/bash
# Gate 2 Validation - Comprehensive
set -e

echo "V2.1: Full E2E suite..."
pnpm test:e2e

echo "V2.6: TypeScript compilation..."
pnpm typecheck

echo "V2.7: Schema validation..."
pnpm validate:schema

echo "V2.8: Data integrity..."
tsx scripts/validate-data-integrity.ts

echo "V2.9: Performance check..."
tsx scripts/validate-performance-budget.ts

echo "V2.10: Bundle analysis..."
tsx scripts/analyze-bundle-size.ts

echo "✅ Gate 2 automated checks passed"
```

### Retrospective 2

**Scale-out learning questions:**

1. **Parallel execution:**
   - Did 4 agents work efficiently?
   - Were there merge conflicts or integration issues?

2. **Pattern consistency:**
   - Did the pattern transfer cleanly to all modules?
   - Which module had the most friction?

3. **Cross-module issues:**
   - Any shared state bugs?
   - Any feature flag interaction issues?

4. **Infrastructure tasks:**
   - Did UXS-705 (conflict detection) work as designed?
   - Responsive breakpoints correct?

**Metrics to capture:**
| Metric | Expected | Actual | Variance |
|--------|----------|--------|----------|
| Sprint duration | 5 days | ___ | ___ |
| E2E pass rate | 100% | ___ | ___ |
| Cross-module bugs | <3 | ___ | ___ |
| Pattern consistency score | 95%+ | ___ | ___ |
| Performance regression | <10ms | ___ | ___ |

### Plan Revision Triggers

**STOP and revise plan if ANY of these occur:**
- [ ] More than 2 modules fail Gate 2 criteria
- [ ] Pattern divergence detected across modules
- [ ] Performance regression >50ms on any grid
- [ ] Data integrity issues found
- [ ] Sprint exceeds 150% estimate (7.5 days)

---

## Sprint 3: Hardening (Days 11-13)

### Objective
Modal retirement, golden flow regression, and polish.

### Tasks

| Task | Scope | Owner | Validation |
|------|-------|-------|------------|
| **UXS-601** Modal audit + retirement | Remove core-flow modals | Agent 1 | Modal count reduced |
| **UXS-602** Golden flow regression suite | Comprehensive E2E | Agent 2 | All 8 GFs pass |
| **UXS-603** Cmd+K scope enforcement | Command palette restrictions | Agent 3 | Scope tests pass |
| **UXS-801** Accessibility audit | WCAG 2.1 AA compliance | Agent 4 | Axe audit clean |

### P2 Tasks (if time permits)

| Task | Description | Priority |
|------|-------------|----------|
| UXS-707 | Undo infrastructure | P2 |
| UXS-802 | Performance monitoring | P2 |
| UXS-901 | Empty state components | P2 |
| UXS-902 | Toast standardization | P2 |

### Validation Gate 3 (Final)

| # | Criterion | Validation Method | Pass/Fail |
|---|-----------|-------------------|-----------|
| V3.1 | All 8 golden flows pass | Full E2E suite | ☐ |
| V3.2 | No core-flow modals remain | Manual audit | ☐ |
| V3.3 | WCAG 2.1 AA compliant | Axe audit | ☐ |
| V3.4 | All RBAC paths tested | QA Auth tests | ☐ |
| V3.5 | Feature flag rollback verified | Manual test | ☐ |
| V3.6 | TypeScript zero errors | `pnpm typecheck` | ☐ |
| V3.7 | Schema validation passes | `pnpm validate:schema` | ☐ |
| V3.8 | Data integrity validated | Full validation suite | ☐ |
| V3.9 | Performance within budget | <100ms grid, <3s load | ☐ |
| V3.10 | No console errors | Production build test | ☐ |
| V3.11 | Red Hat QA checklist complete | Adversarial review | ☐ |

**Final Validation Script:**
```bash
#!/bin/bash
# Gate 3 Final Validation - COMPREHENSIVE
set -e

echo "=== TERP Work Surface Final Validation ==="
echo ""

echo "V3.1: Full E2E suite..."
pnpm test:e2e

echo "V3.6: TypeScript compilation..."
pnpm typecheck

echo "V3.7: Schema validation..."
pnpm validate:schema

echo "V3.8: Data integrity..."
tsx scripts/validate-data-integrity.ts
tsx scripts/validate-schema-comprehensive.ts
tsx scripts/validate-seeded-data.ts

echo "V3.9: Performance validation..."
tsx scripts/validate-performance-budget.ts

echo "V3.10: Production build test..."
pnpm build
pnpm preview &
sleep 5
tsx scripts/check-console-errors.ts
kill %1

echo ""
echo "✅ All automated validation checks PASSED"
echo ""
echo "⚠️ Manual checks required:"
echo "   V3.2: Modal audit"
echo "   V3.3: Accessibility (run axe)"
echo "   V3.4: RBAC paths"
echo "   V3.5: Feature flag rollback"
echo "   V3.11: Red Hat QA checklist"
```

### Final Retrospective

**Project-level questions:**

1. **What worked well across all sprints?**
   - Best patterns to carry forward?
   - Most valuable validation checks?

2. **What would we do differently?**
   - Task breakdown changes?
   - Validation timing changes?

3. **What did we learn about Work Surfaces?**
   - Pattern applicability to other projects?
   - Reusable hook library potential?

4. **What risks materialized vs. didn't?**
   - Risk register accuracy?
   - New risks discovered?

---

## Adaptive Planning Rules

### When to Adjust

| Trigger | Action |
|---------|--------|
| Sprint exceeds 150% estimate | Stop, analyze, revise estimates for remaining sprints |
| >3 TS errors introduced | Stop, fix, add pre-commit hook |
| E2E failures in unrelated modules | Stop, investigate, add regression tests |
| Hook API requires breaking change | Stop, version hooks, update all consumers |
| Performance regression >50ms | Stop, profile, optimize before proceeding |
| Pattern divergence detected | Sync point: align all modules before continuing |

### How to Adjust

1. **Document the deviation** - What triggered the adjustment?
2. **Analyze root cause** - Why did the estimate/plan fail?
3. **Revise affected tasks** - Update estimates, add validation
4. **Communicate change** - Update stakeholders
5. **Continue execution** - Don't over-plan, adapt and move

### Metrics Dashboard

Track these metrics throughout execution:

```
┌─────────────────────────────────────────────────────────────────┐
│                  EXECUTION METRICS DASHBOARD                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VELOCITY                    QUALITY                            │
│  ─────────                   ───────                            │
│  Tasks completed: __/36      TypeScript errors: __              │
│  Days elapsed: __/13         E2E pass rate: __%                 │
│  Estimate accuracy: __%      Bugs found: __                     │
│                              P0 bugs: __                        │
│                                                                 │
│  VALIDATION                  LEARNING                           │
│  ──────────                  ────────                           │
│  Gates passed: __/4          Plan revisions: __                 │
│  Criteria met: __/__         Patterns extracted: __             │
│  Rollbacks needed: __        Risks materialized: __             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Task Granularity Analysis

### Why Current Granularity is Optimal

| Task | Lines of Code (est.) | Hours (est.) | Atomic Enough? | Why |
|------|---------------------|--------------|----------------|-----|
| UXS-101 | 300 | 8 | ✅ Yes | Single responsibility, clear API |
| UXS-102 | 200 | 4 | ✅ Yes | Single component, well-scoped |
| UXS-103 | 250 | 8 | ✅ Yes | Single component, clear contract |
| UXS-104 | 300 | 6 | ✅ Yes | Single hook, defined behavior |
| UXS-201 | 500 | 16 | ✅ Yes | Would fragment if split further |
| UXS-301 | 400 | 12 | ✅ Yes | Single module application |
| UXS-401 | 400 | 12 | ✅ Yes | Single module application |
| UXS-501 | 400 | 12 | ✅ Yes | Single module application |
| UXS-601 | 200 | 8 | ✅ Yes | Single audit scope |
| UXS-602 | 300 | 12 | ✅ Yes | Single test suite |

### What Over-Atomizing Would Look Like (DON'T DO THIS)

```
❌ BAD: UXS-201 split into 8 micro-tasks
   UXS-201a: Create WorkSurface wrapper (2 hrs)
   UXS-201b: Implement sticky header (2 hrs)
   UXS-201c: Add grid zone layout (2 hrs)
   UXS-201d: Integrate keyboard hook (2 hrs)
   UXS-201e: Add inspector zone (2 hrs)
   UXS-201f: Implement row selection (2 hrs)
   UXS-201g: Add status bar (2 hrs)
   UXS-201h: Integration testing (4 hrs)

   PROBLEMS:
   - 8 handoff points vs. 1
   - 8 status updates vs. 1
   - 8 potential integration bugs vs. 1
   - Context switch overhead: ~30 min per switch = 3.5 hrs lost
   - Coordination overhead: ~15 min per handoff = 2 hrs lost

✅ GOOD: UXS-201 with internal checkpoints
   UXS-201: Direct Intake Work Surface (16 hrs)
   Internal checkpoints:
   - [ ] Shell structure complete
   - [ ] Grid integration complete
   - [ ] Inspector integration complete
   - [ ] Status integration complete

   BENEFITS:
   - Single owner, single context
   - Natural integration within task
   - Checkpoints catch issues early without overhead
```

---

## Appendix B: Validation Scripts Reference

All validation scripts in `/scripts/`:

| Script | Purpose | Gate |
|--------|---------|------|
| `validate-work-surface-hooks-integration.ts` | Verify hooks work together | Gate 0 |
| `validate-schema-comprehensive.ts` | Full schema validation | All gates |
| `validate-data-integrity.ts` | Data quality checks | Gate 2, 3 |
| `validate-performance-budget.ts` | Performance thresholds | Gate 2, 3 |
| `analyze-bundle-size.ts` | Bundle size analysis | Gate 2, 3 |
| `check-console-errors.ts` | Production console check | Gate 3 |
| `qa/validate-intake-rbac.ts` | RBAC test for intake | Gate 1 |
| `qa/validate-order-workflow.ts` | Order workflow validation | Gate 2 |
| `qa/validate-inventory-workflow.ts` | Inventory validation | Gate 2 |

---

## Appendix C: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│              WORK SURFACE EXECUTION QUICK REFERENCE             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SPRINTS                                                        │
│  Sprint 0: Foundation (Days 1-2)  - Hooks completion            │
│  Sprint 1: Pilot (Days 3-5)       - Intake module               │
│  Sprint 2: Scale (Days 6-10)      - All modules (parallel)      │
│  Sprint 3: Harden (Days 11-13)    - Polish + regression         │
│                                                                 │
│  VALIDATION COMMANDS                                            │
│  pnpm typecheck                   - TypeScript check            │
│  pnpm test                        - Unit tests                  │
│  pnpm test:e2e                    - E2E tests                   │
│  pnpm validate:schema             - Schema validation           │
│  tsx scripts/validate-data-integrity.ts - Data checks           │
│                                                                 │
│  STOP TRIGGERS                                                  │
│  - Sprint >150% estimate                                        │
│  - >3 TypeScript errors                                         │
│  - E2E failures in unrelated modules                            │
│  - Performance regression >50ms                                 │
│                                                                 │
│  KEY FILES                                                      │
│  hooks/work-surface/*.ts          - Core hooks                  │
│  components/work-surface/*.tsx    - Core components             │
│  docs/specs/ui-ux-strategy/*.md   - UX documentation            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**End of Adaptive Execution Plan**

*This plan is designed to be a living document. Update metrics and retrospective findings as you execute.*
