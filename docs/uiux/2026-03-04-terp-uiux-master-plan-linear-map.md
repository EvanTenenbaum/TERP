# TERP UI/UX Master Plan -> Linear Mapping

Date: 2026-03-04
Source master plan:
`/Users/evan/spec-erp-docker/TERP/TERP/docs/uiux/2026-03-04-terp-uiux-master-plan-priority.md`

## Parent Trackers

- High Priority: `TER-523`
- Secondary: `TER-524`

## High Priority Tasks (H1-H6)

1. H1 Prevent invalid batch deletions pre-click -> `TER-525`
2. H2 Single blocked-delete error banner + actionable recovery -> `TER-526`
3. H3 Focused selection mode to reduce busy UI -> `TER-527`
4. H4 Persistent undo + icon label accessibility hardening -> `TER-529`
5. H5 Owner command center consolidation + plain-language copy -> `TER-530`
6. H6 Appointments widget using existing scheduling endpoint -> `TER-531`

Dependency chain:

- `TER-525` -> `TER-526` -> `TER-527` -> `TER-529`
- `TER-530` -> `TER-531`

## Secondary Tasks (S1-S4)

1. S1 SKU Status Browser widget (hidden by default) -> `TER-532`
2. S2 Inventory snapshot price-bracket grouping (validation-gated) -> `TER-533`
3. S3 Navigation hierarchy cues (global nav vs workspace tabs) -> `TER-534`
4. S4 Dashboard path retention vs convergence decision -> `TER-535`

Dependency chain:

- `TER-532` -> `TER-533` -> `TER-534` -> `TER-535`

## Global Guardrails Carried Into Every Ticket

- No schema/table/migration changes.
- Reuse existing endpoints/components first.
- Keep blast radius low (copy/state/layout before architecture changes).
- Targeted tests only: touched components + one smoke E2E for changed flow.
