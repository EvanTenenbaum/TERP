# Wave 5: Terminology Program Linear Closeout

**Date**: 2026-03-05
**Source**: `docs/terminology/LEX_CLOSURE_REPORT.md`

---

## TER-546 — LEX Terminology Bible (Parent)

**Status**: Done
**Linear**: https://linear.app/terpcorp/issue/TER-546

### Evidence Packet

```
LEX Terminology Bible — Complete Evidence
==========================================
Program Report:  docs/terminology/LEX_CLOSURE_REPORT.md
Term Map:        docs/terminology/term-map.json (15 terms, 5 policy locks)
Bible:           docs/terminology/TERMINOLOGY_BIBLE.md (438 lines)
Authority Src:   docs/terminology/authority-source-register.md (280 lines)
Schema:          docs/terminology/schema.json (JSON Schema v7)
Census Script:   scripts/terminology-census.sh (257 lines)
Audit Script:    scripts/terminology-drift-audit.sh (203 lines)
Unit Tests:      tests/unit/terminology/term-map.test.ts (55+ cases, all PASS)

Subtasks Complete: 16/16 (LEX-001 through LEX-016)

Policy Locks Active and CI-enforced:
  1. Supplier (never Vendor)
  2. Brand / Farmer (dynamic by category)
  3. Batch (never InventoryItem as a type)
  4. Intake (never Receiving)
  5. Sales Order (never Sale as a document noun)

UI Normalization Complete:
  LEX-008  feat(lex): normalize Vendor→Supplier in UI strings
  LEX-009  feat(lex): normalize Receiving→Intake in UI strings
  LEX-010  feat(lex): normalize Sales Order and Quote terminology
  LEX-011  feat(lex): apply dynamic Brand/Farmer labels in UI
  LEX-012  feat(lex): normalize Inventory Item→Batch in UI strings
  LEX-013  docs(lex): bulk normalize 284 docs files
  LEX-016  docs(lex): add LEX program closure report

Gate 1 (Evan Review):
  89f2d11  docs(lex): integrate Gate 1 review — Evan approves 5 policy locks

CI Gate:
  pnpm gate:terminology → exit 0 (no violations in non-exempt code)

Verification (2026-03-05 baseline):
  TypeScript: PASS (0 errors)
  Lint:       PASS (0 warnings)
  Tests:      PASS (5860/5860, includes 55+ terminology tests)
  Build:      PASS
```

### Action

Set TER-546 = **Done** in Linear. Paste evidence block above as comment.

---

## TER-558 — Scope Resolution

**Linear lookup required** — TER-558 is not documented in any local file.

### Likely scope (based on ticket number proximity to TER-546/553/560)

TER-553 = `audit:terminology` scripts + docs pipeline (completed in 2026-03-05 STX/LEX closure)
TER-558 = likely another LEX or STX sub-ticket

### Resolution path

1. Open https://linear.app/terpcorp/issue/TER-558
2. If it is a LEX sub-ticket for UI normalization (LEX-008 through LEX-012): those are **all complete** — close with the LEX evidence above
3. If it is a STX sub-ticket for stress testing infrastructure: check `docs/roadmaps/2026-03-05-atomic-open-ticket-closure-staging.md` — TER-536–544 are all done
4. If it is unrelated: open a follow-up with scope details

### Earliest close path

If TER-558 = any LEX/STX sub-ticket → Done immediately with the evidence above.
If TER-558 = new scope → escalate to Evan before implementing.

---

## Action Required (Evan)

1. Open TER-546 in Linear → set status = Done, paste evidence block
2. Open TER-558 in Linear → determine scope, close or route per decision tree above
3. Once TER-546 is Done and all LEX sub-tickets are Done, the program is fully closed
