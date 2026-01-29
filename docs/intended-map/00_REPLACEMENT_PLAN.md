# Documentation Replacement Plan

**Purpose:** Define how intended-map artifacts supersede/replace existing documentation
**Created:** 2026-01-29
**Status:** Active

---

## Replacement Strategy

### Principle 1: Consolidate, Don't Duplicate
The `docs/intended-map/` directory becomes the **single source of truth** for:
- System behavior specifications
- Flow definitions and variants
- Business rules and validations
- Requirements traceability
- RBAC permissions
- Implementation status

### Principle 2: Reference, Don't Copy
Existing authoritative documents (Golden Flow specs) are **referenced** rather than copied.
The intended-map provides a unified index and status layer on top of them.

### Principle 3: Deprecate Stale Content
Documents with overlapping scope that are older than 30 days are considered candidates for deprecation unless they contain unique, still-valid content.

---

## Replacement Matrix

### Fully Replaced Documents

| Old Document | Replaced By | Reason |
|--------------|-------------|--------|
| `docs/qa/COVERAGE_MATRIX.md` | `00_COVERAGE.csv` | More comprehensive coverage tracking |
| `docs/qa/FLOW_COVERAGE_PLAN.md` | `02_FLOW_MATRIX_INTENDED.csv` | Unified flow matrix |
| Multiple `docs/roadmaps/*_EXECUTION_PLAN.md` | This audit + MASTER_ROADMAP.md | Consolidated task tracking |
| Scattered state diagrams | `01_STATE_MODEL_INTENDED.mmd` | Unified state model |
| Multiple RBAC references | `03_RBAC_INTENDED.csv` | Consolidated permissions |

### Partially Replaced (Content Incorporated)

| Old Document | New Document | What's Incorporated |
|--------------|--------------|---------------------|
| `docs/protocols/CANONICAL_DICTIONARY.md` | `TERMINOLOGY_MAP.md` | Entity names, FK conventions |
| `docs/qa/QA_PLAYBOOK.md` | `03_RBAC_INTENDED.csv` | Role permissions |
| `docs/reference/FLOW_GUIDE.md` | `02_FLOW_MATRIX_INTENDED.md`, `IMPL_API_INVENTORY.md` | Procedure inventory |
| `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md` | `01_INVARIANTS_INTENDED.md` | INV-001 through INV-008 |

### Not Replaced (Preserved)

| Document | Reason |
|----------|--------|
| `docs/golden-flows/specs/GF-*.md` | Primary intent source - authoritative |
| `docs/specs/*.md` | Feature specs - still authoritative |
| `docs/roadmaps/MASTER_ROADMAP.md` | Active task tracking |
| `docs/protocols/CODE_STANDARDS.md` | Development standards |
| `docs/protocols/DATABASE_STANDARDS.md` | DB conventions |
| `docs/adr/*.md` | Architecture decisions |
| `.kiro/specs/*/requirements.md` | Kiro requirements specs |

---

## Migration Actions

### Immediate (This Audit)

1. **Create all intended-map artifacts** - This document set
2. **Update references** - Point from old docs to new where appropriate
3. **Mark deprecated docs** - Add deprecation notices

### Future (Post-Audit)

1. **Archive historical roadmaps** - Move completed execution plans to `docs/roadmaps/archive/`
2. **Consolidate QA reports** - Move point-in-time reports to `docs/qa/archive/`
3. **Update CLAUDE.md** - Reference intended-map for behavior specs

---

## Deprecation Notices

Add the following notice to deprecated documents:

```markdown
> **DEPRECATED**: This document has been superseded by `docs/intended-map/`.
> See [00_INDEX.md](../intended-map/00_INDEX.md) for the current source of truth.
>
> This document is retained for historical reference only.
```

### Documents to Mark Deprecated

- [ ] `docs/qa/COVERAGE_MATRIX.md`
- [ ] `docs/qa/FLOW_COVERAGE_PLAN.md`
- [ ] All `docs/roadmaps/*_EXECUTION_PLAN*.md` except MASTER_ROADMAP.md and GOLDEN_FLOWS_BETA_ROADMAP.md

---

## Cross-Reference Index

### Where to Find Information (New Locations)

| Information Type | New Location |
|------------------|--------------|
| Golden Flow definitions | `00_GOLDEN_FLOWS.md` (summary) + `docs/golden-flows/specs/` (detail) |
| Entity state machines | `01_STATE_MODEL_INTENDED.md` |
| Business invariants | `01_INVARIANTS_INTENDED.md` |
| User flow definitions | `02_FLOW_MATRIX_INTENDED.md` |
| RBAC permissions | `03_DECISION_TABLES_INTENDED/RBAC_INTENDED.csv` |
| Validation rules | `03_DECISION_TABLES_INTENDED/VALIDATIONS_INTENDED.csv` |
| Requirements traceability | `04_RTM_INTENDED.csv` |
| Implementation status | `00_COVERAGE.csv` |
| Terminology/naming | `TERMINOLOGY_MAP.md` |
| API inventory | `IMPL_API_INVENTORY.md` |
| UI inventory | `IMPL_UI_INVENTORY.md` |
| Data model inventory | `IMPL_DATA_INVENTORY.md` |
| Implementation gaps | `DELTA_SCOREBOARD.md` |

---

## Governance

### Ownership
- **Primary Owner:** QA Agent / Development Team
- **Review Cadence:** Update after each major feature completion
- **Validation:** Run `pnpm roadmap:validate` equivalent for intended-map

### Change Process
1. Update source Golden Flow specs first (highest authority)
2. Update intended-map artifacts to reflect changes
3. Run consistency checks
4. Commit with descriptive message
