# TER-1068 Adversarial Review

## Source Run

- Claude review runner: `/Users/evan/.codex-runs/claude-qa/20260407T232719Z-this-39f729`
- Requested mode: evidence-assisted visual review
- Parser outcome: `report.md` notes that the Claude response was not parseable JSON, so this packet is the durable disposition of the raw findings instead of treating the run itself as structured closeout truth.

## Accepted In TER-1068

### 1. Catalogue advanced filters had no reachable entry point

- Raw finding: `High`
- Disposition: accepted and fixed in this tranche
- Fix:
  - [SalesCatalogueSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx)
  - [SalesCatalogueSurface.test.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx)
- Proof:
  - targeted Vitest covers the new `Filters` button and panel open path
  - [catalogue-filters-open.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/catalogue-filters-open.png)

### 2. Imported-cut banner badges drifted with live filter mutations

- Raw finding: `Medium`
- Disposition: accepted and fixed in this tranche
- Fix:
  - [SalesOrderSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/client/src/components/spreadsheet-native/SalesOrderSurface.tsx)
  - [SalesOrderSurface.test.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx)
- Proof:
  - targeted Vitest now proves the banner keeps `Include unavailable` after the operator toggles the live filter back to `Available now`
  - [order-cut-summary-stable.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/order-cut-summary-stable.png)

### 3. Catalogue unavailable rows were still effectively icon-only

- Raw finding: `Medium`
- Disposition: accepted and fixed in this tranche
- Fix:
  - [filtering.ts](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/client/src/components/sales/filtering.ts)
  - [SalesCatalogueSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx)
  - [SalesCatalogueSurface.test.tsx](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx)
- Proof:
  - targeted Vitest renders the product cell and asserts `Incoming` plus `Still incoming and not ready to sell`
  - [catalogue-include-unavailable.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/catalogue-include-unavailable.png)

## Deferred To TER-1069

### 1. Broadened retrieval can still carry non-sellable rows into the order document

- Raw finding: `High`
- Disposition: deferred to `TER-1069`
- Rationale:
  - TER-1068 is the retrieval-defaults / portable-cuts tranche.
  - TER-1069 is the retrieval-to-commit continuity tranche and is the right home for commit/finalize guardrails.
  - This tranche already keeps non-sellable rows out of the default retrieval posture and labels them clearly when the operator intentionally broadens scope.

### 2. No pre-finalize guard exists for orders composed only of non-sellable rows

- Raw finding: `High`
- Disposition: deferred to `TER-1069`
- Rationale:
  - this is a commit-path safeguard, not a retrieval-default or saved-cut continuity requirement
  - the TER-1068 acceptance criteria did not require changing finalize policy
  - the follow-up tracker writeback should explicitly carry this concern into the tranche 2 queue instead of silently dropping it

## Closeout Note

This review did materially improve the TER-1068 candidate, but it did not justify pulling tranche 2 commit-path policy into tranche 1. The proof-backed closeout for TER-1068 is therefore:

- accepted-now findings fixed and reverified
- deferred commit/finalize concerns preserved for `TER-1069`
