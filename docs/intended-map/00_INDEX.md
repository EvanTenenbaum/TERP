# TERP Intended Behavior Map - Index

**Version:** 1.0
**Created:** 2026-01-29
**Purpose:** Single source of truth for system behavior specification and implementation status
**Replaces:** Various scattered documentation (see 00_REPLACEMENT_PLAN.md)

---

## Executive Summary

This directory contains the comprehensive behavior audit of the TERP system. It provides:

1. **Intended Behavior** - What the system SHOULD do (from specs)
2. **Implementation Status** - What the system ACTUALLY does (from code)
3. **Delta Analysis** - Gaps between intent and implementation

### Key Findings

| Metric | Value |
|--------|-------|
| Golden Flows | 8 defined |
| Golden Flows Functional | 2 (25%) |
| Golden Flows Blocked | 4 (50%) |
| Golden Flows Partial | 2 (25%) |
| Core Invariants | 8 defined |
| Invariants Compliant | 8 (100%) |
| Requirements Traced | 25 |
| Requirements Implemented | 22 (88%) |
| P0 Blockers | 3 |
| P1 Gaps | 3 |

---

## Intent Sources (by Authority)

| Rank | Source | Authority |
|------|--------|-----------|
| 1 | `docs/golden-flows/specs/GF-*.md` | HIGHEST |
| 2 | `docs/specs/*.md` | HIGH |
| 3 | `.kiro/specs/*/requirements.md` | HIGH |
| 4 | `docs/roadmaps/MASTER_ROADMAP.md` | MEDIUM |
| 5 | `docs/protocols/*.md` | MEDIUM |
| 6 | `docs/qa/QA_PLAYBOOK.md` | LOW |

See `00_INTENT_SOURCES.md` for complete register.

---

## Golden Flows

| ID | Name | Status | Entry Point |
|----|------|--------|-------------|
| GF-001 | Direct Intake | BLOCKED | /inventory |
| GF-002 | Procure-to-Pay | PARTIAL | /purchase-orders |
| GF-003 | Order-to-Cash | BLOCKED | /orders |
| GF-004 | Invoice & Payment | IMPLEMENTED | /accounting/invoices |
| GF-005 | Pick & Pack | FUNCTIONAL | /pick-pack |
| GF-006 | Client Ledger | FUNCTIONAL | /clients/:id/ledger |
| GF-007 | Inventory Management | BLOCKED | /inventory |
| GF-008 | Sample Request | PARTIAL | /samples |

See `00_GOLDEN_FLOWS.md` for detailed specifications.

---

## File Directory

### Foundation Documents

| File | Purpose |
|------|---------|
| `00_INDEX.md` | This file - main index |
| `00_CONVENTIONS.md` | ID schemes, CSV headers, citation format |
| `00_EXISTING_DOCS_INVENTORY.md` | Catalog of existing documentation |
| `00_REPLACEMENT_PLAN.md` | What this audit replaces |
| `00_INTENT_SOURCES.md` | Ranked intent source register |
| `00_GOLDEN_FLOWS.md` | Golden flow summary |
| `TERMINOLOGY_MAP.md` | Canonical terms and aliases |

### Artifact 1: State Model

| File | Purpose |
|------|---------|
| `01_STATE_MODEL_INTENDED.md` | Entity states and transitions |
| `01_STATE_MODEL_INTENDED.mmd` | Mermaid state diagrams |
| `01_INVARIANTS_INTENDED.md` | Business invariants (INV-001 to INV-008) |

### Artifact 2: Flow Matrix

| File | Purpose |
|------|---------|
| `02_FLOW_MATRIX_INTENDED.csv` | All flows in CSV format |
| `02_FLOW_MATRIX_INTENDED.md` | Flow details and variants |
| `02_FLOW_GRAPH_INTENDED.mmd` | Flow dependency graph |

### Artifact 3: Decision Tables

| File | Purpose |
|------|---------|
| `03_DECISION_TABLES_INTENDED/INDEX.md` | Decision table index |
| `03_DECISION_TABLES_INTENDED/RBAC_INTENDED.csv` | Role-based access control |
| `03_DECISION_TABLES_INTENDED/STATUS_GUARDS_INTENDED.csv` | State transition guards |
| `03_DECISION_TABLES_INTENDED/VALIDATIONS_INTENDED.csv` | Input validation rules |
| `03_DECISION_TABLES_INTENDED/INVENTORY_RULES_INTENDED.csv` | Inventory allocation rules |

### Artifact 4: Requirements Traceability

| File | Purpose |
|------|---------|
| `04_RTM_INTENDED.csv` | Requirements traceability matrix |
| `04_RTM_INTENDED.md` | RTM with gap analysis |

### Implementation Inventories

| File | Purpose |
|------|---------|
| `IMPL_UI_INVENTORY.md` | UI routes and components |
| `IMPL_API_INVENTORY.md` | tRPC endpoints and routers |
| `IMPL_DATA_INVENTORY.md` | Database tables and enums |

### Delta Analysis

| File | Purpose |
|------|---------|
| `DELTA_SCOREBOARD.md` | Full delta analysis |
| `TOP_DELTAS.md` | Priority action list |

---

## Delta Summary

| Status | Count | Definition |
|--------|-------|------------|
| Intended&Implemented | 55 | Spec exists AND code matches |
| IntendedMissing | 8 | Spec exists, code missing |
| Divergent | 3 | Code differs from spec |
| ImplNotIntended | 5 | Code without spec |
| Unspecified | 4 | No spec found |
| Unresolved | 0 | Conflicting specs |

---

## Spec Decisions Needed

No unresolved spec conflicts identified in this audit.

---

## How QA Uses This

1. **Test Planning:** Use `00_GOLDEN_FLOWS.md` to identify test scenarios
2. **Test Data:** Reference `03_VALIDATIONS_INTENDED.csv` for boundary conditions
3. **RBAC Testing:** Use `03_RBAC_INTENDED.csv` with QA accounts from `QA_PLAYBOOK.md`
4. **Invariant Verification:** Run SQL queries from `01_INVARIANTS_INTENDED.md`
5. **Gap Identification:** Check `DELTA_SCOREBOARD.md` for known issues
6. **Regression:** Ensure all flows in `02_FLOW_MATRIX_INTENDED.csv` pass

---

## Maintenance

### When to Update

- After completing a Golden Flow fix
- After adding new features
- After changing business rules
- After modifying state machines

### How to Update

1. Update the appropriate source spec (`docs/golden-flows/specs/GF-*.md`)
2. Regenerate affected intended-map artifacts
3. Re-run delta analysis
4. Update `DELTA_SCOREBOARD.md`
5. Commit changes

### Validation

Run consistency checks:
- All flows in RTM link to valid requirements
- All invariants referenced in flows exist in `01_INVARIANTS_INTENDED.md`
- All status values in guards match state model
- No orphan elements

---

## Contact

For questions about this audit:
- **Intent conflicts:** Escalate to Evan
- **Implementation issues:** Create BUG-XXX in roadmap
- **Spec changes needed:** Create task in MASTER_ROADMAP.md
