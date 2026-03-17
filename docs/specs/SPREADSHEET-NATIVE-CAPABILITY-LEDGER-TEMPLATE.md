# Specification: Spreadsheet-Native Capability Ledger Template

**Task:** ARCH-SS-007: Capability Ledger Template for Spreadsheet-Native TERP  
**Status:** Draft  
**Priority:** CRITICAL  
**Estimate:** 18h planning / migration tooling design  
**Module:** Migration control, parity proof, anti-clawback process  
**Dependencies:** [SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md](./SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md), [SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md](./SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md), [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md), [FEATURE_PRESERVATION_MATRIX.md](./ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md)  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

Migration to a spreadsheet-native fork will fail if teams rely on memory, screenshots, or general intuition about what a module “basically does.”

TERP needs one repeatable **capability ledger** format that captures:

- what the current module actually does
- which actions are critical
- what hidden dependencies exist
- how each capability maps into the new fork
- what evidence is required before claiming parity

## 2. Core Principle

No module may be redesigned without a completed capability ledger.  
No module may be declared migrated without evidence attached to its ledger.

## 3. Ledger Purpose

The ledger exists to prevent:

- silent feature loss
- undercounted edge cases
- missing outputs and side effects
- shallow “looks similar” parity claims
- late discovery of hidden dependencies

## 4. Ledger Scope

Each ledger is workbook- and sheet-aware, but begins from current TERP reality.

A ledger may target:

- a whole workbook
- a module
- a sheet candidate
- a golden flow

## 5. Required Capability Granularity

Capabilities must be captured at a level where migration risk is meaningful.

Good granularity:

- “Generate invoice from order”
- “Bulk receive selected PO lines”
- “Adjust inventory batch quantity with movement history”

Bad granularity:

- “Accounting”
- “Inventory”
- “Stuff users do in orders”

## 6. Required Ledger Fields

Every capability row must include:

- `capability_id`
- `workbook`
- `source_repo_snapshot`
- `current_route_or_surface`
- `source_flow_matrix_rows_or_procedures`
- `source_flow_guide_sections`
- `source_feature_modules_or_ids`
- `source_preservation_entries`
- `source_golden_flows`
- `source_discrepancies_or_open_questions`
- `user_job`
- `capability_name`
- `criticality`
- `trigger_or_entry_point`
- `completion_or_success_criteria`
- `primary_actor_roles`
- `required_permissions_or_access_rules`
- `current_ui_surface`
- `critical_validations_and_guards`
- `required_data_entities`
- `required_api_or_service_dependencies`
- `required_outputs_or_side_effects`
- `hidden_dependencies`
- `failure_mode_if_lost`
- `target_sheet_pattern`
- `migration_classification`
- `required_sidecar_or_exception`
- `parity_test_requirement`
- `evidence_required`
- `owner`
- `status`

## 7. Source Traceability Requirement

Every ledger row must prove where the capability came from.

Minimum traceability:

- the repo snapshot used for the ledger
- one or more `USER_FLOW_MATRIX.csv` rows or exact procedures
- the corresponding `FLOW_GUIDE.md` section, if one exists
- the corresponding `USER_FLOWS.md` feature/module reference, if one exists
- the matching `FEATURE_PRESERVATION_MATRIX.md` row, if one exists
- any golden-flow reference, if applicable
- any source discrepancy or unresolved gap

Use the stable matrix row-key scheme defined in [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md).

If a source does not exist for a row, say `none found` rather than leaving the field blank.

## 8. Classification Values

### 8.1 Criticality

Allowed values:

- `P0`
- `P1`
- `P2`

### 8.2 Migration Classification

Allowed values:

- `sheet-native`
- `sheet-plus-sidecar`
- `exception-surface`
- `intentionally-deferred`
- `rejected-with-evidence`

### 8.3 Status

Allowed values:

- `not-started`
- `mapped`
- `implemented`
- `verified`
- `blocked`

## 9. Hidden Dependency Capture

Each capability must explicitly capture hidden dependencies such as:

- related supporting records
- background jobs
- document generation
- audit trail requirements
- notifications
- role/permission nuances
- linked calculations
- third-order downstream effects

If a capability has no hidden dependencies, the ledger must say `none identified`, not leave the field blank.

## 10. Failure Mode Requirement

Every capability must state what breaks if it is lost.

Examples:

- revenue workflow blocked
- inventory truth diverges
- compliance trail lost
- approvals become unsafe
- customer communication broken

This is required to prevent “minor” features from being underestimated.

## 11. Evidence Contract

Each ledger row must define what proof is needed before parity can be claimed.

Evidence types may include:

- unit test
- integration test
- E2E flow
- screenshot
- artifact output
- audit log confirmation
- role-based access proof
- performance check

## 12. Ledger File Structure

Recommended file layout:

- one authoritative CSV or JSON ledger per workbook or pilot scope
- one markdown summary for human review
- one discrepancy log
- one evidence column or field linking to concrete proof paths

For ledgers larger than 25 rows, CSV or JSON is required as the authoritative artifact.
The markdown table below is illustrative only and should not be the sole long-term storage format for large ledgers.

Recommended naming pattern:

- `docs/specs/spreadsheet-native-ledgers/<scope>-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/<scope>-capability-ledger-summary.md`
- `docs/specs/spreadsheet-native-ledgers/<scope>-discrepancy-log.md`

## 13. Markdown Ledger Template

```md
# Capability Ledger: <scope>

| Capability ID | Workbook | Repo Snapshot   | Current Surface   | Flow Matrix Rows / Procedures | Flow Guide Sections | Feature Modules / IDs | Preservation Entries | Golden Flows | Discrepancies / Open Questions    | User Job       | Capability | Criticality | Trigger         | Success Criteria              | Roles                                         | Permissions / Access Rules | Current UI Surface | Validations / Guards                                       | Data Entities | API / Service Dependencies                            | Outputs / Side Effects     | Hidden Dependencies                                                    | Failure Mode if Lost                                    | Target Sheet Pattern                       | Migration Classification                        | Sidecar / Exception Need                                    | Parity Test Requirement  | Evidence Required | Owner        | Status                        |
| ------------- | -------- | --------------- | ----------------- | ----------------------------- | ------------------- | --------------------- | -------------------- | ------------ | --------------------------------- | -------------- | ---------- | ----------- | --------------- | ----------------------------- | --------------------------------------------- | -------------------------- | ------------------ | ---------------------------------------------------------- | ------------- | ----------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------- | ------------------------ | ----------------- | ------------ | ----------------------------- | --------------- | ------------------------------ | ------- | ------ |
| SALE-001      | Sales    | <sha-or-branch> | /sales?tab=orders | Orders                        | Sales Orders        | Create Order          | orders.create        | /orders      | Domain 4: Orders & Sales / Orders | DF-022, DF-078 | SALE-001   | GF-003      | none identified | Create and manage sales order | Create sales order from client and line items | P0                         | New order action   | order persists, inventory reserves correctly, audit exists | Sales, Ops    | orders:create plus applicable client/inventory access | Document page + line items | inventory availability, pricing checks, credit guards, required fields | orders, orderLineItems, clients, inventory reservations | orders router, pricing logic, credit logic | order created, inventory reserved, audit logged | credit checks, inventory availability, order preview totals | revenue workflow blocked | document-sheet    | sheet-native | inspector for complex details | E2E golden flow | screenshot + E2E + audit proof | <owner> | mapped |
```

## 14. Review Questions Per Capability

For every row, reviewers must be able to answer:

1. What exactly does the user accomplish?
2. What data and side effects must happen?
3. What breaks if we miss this?
4. Does the target fork handle it sheet-natively, with a sidecar, or as an exception?
5. Which source rows and sections prove this capability exists today?
6. Which permissions, validations, and success criteria must still hold?
7. What proof will convince us it still works?

## 15. Mapping Rules

When moving from current TERP to the fork:

- every current capability must map to exactly one migration classification
- one capability may map to one or more sheet elements, but the ledger row remains singular
- any capability not preserved must have explicit rejection evidence and sign-off
- every capability row must be traceable back to the interaction source-of-truth contract

## 16. Anti-Clawback Rules

Disallowed ledger behaviors:

- grouping multiple critical capabilities into one vague row
- leaving hidden dependencies blank
- leaving source-traceability fields blank
- using “covered by redesign” without evidence
- marking capabilities deferred without owner and reason

## 17. Integration with Existing Preservation Work

The ledger should reuse existing TERP evidence where useful, especially:

- [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md)
- [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv)
- [FLOW_GUIDE.md](../reference/FLOW_GUIDE.md)
- [USER_FLOWS.md](../features/USER_FLOWS.md)
- [FEATURE_PRESERVATION_MATRIX.md](./ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md)
- golden flow definitions
- existing E2E plans
- current route inventories

The ledger is not a replacement for those assets; it is the migration-specific execution layer.

## 18. Testing Requirements

### 18.1 Unit / Static Checks

- required fields present for every row
- required source-traceability fields present for every row
- classification values valid
- no blank criticality or failure-mode fields

### 18.2 Review Checks

- each P0/P1 capability has a parity test requirement
- each deferred/rejected row has owner and reason
- each exception-surface row names the exception surface explicitly
- each row can be traced back to matrix, guide, feature, and preservation sources where applicable
- each P0/P1 row has explicit permissions, validations, and success criteria

## 19. Adversarial QA Findings and Resolutions

### Finding 1: “Teams will still under-document hidden behavior.”

Risk:

- ledger becomes a shallow feature checklist

Resolution:

- made hidden dependencies mandatory
- required failure mode and side effects as separate fields

### Finding 2: “Capabilities can be grouped too broadly and hide risk.”

Risk:

- one vague row masks three missing workflows

Resolution:

- defined good vs bad capability granularity
- prohibited vague aggregation

### Finding 3: “Evidence requirements can be hand-wavy.”

Risk:

- parity is claimed without proof

Resolution:

- made evidence type and parity test requirement explicit fields

### Finding 4: “The ledger may duplicate preservation artifacts without becoming actionable.”

Risk:

- teams maintain two passive docs instead of one operational migration tool

Resolution:

- defined the ledger as the migration execution layer on top of preservation artifacts

### Finding 5: "Teams may rewrite the ledger from memory instead of current evidence."

Risk:

- the ledger becomes a fresh interpretation rather than a migration control

Resolution:

- added mandatory source-traceability fields
- required matrix, guide, feature, and preservation references where applicable

### Finding 6: "The ledger can still pass review while ignoring mismatches between docs."

Risk:

- drift is hidden until late implementation or QA

Resolution:

- added `source_discrepancies_or_open_questions`
- required explicit notes when sources disagree or a reference is missing

### Finding 7: "A 500-row ledger maintained as a markdown table will become unusable."

Risk:

- the artifact becomes hard to filter, compare, diff, and validate

Resolution:

- made CSV or JSON the authoritative format for larger ledgers
- kept markdown as a summary layer rather than the primary storage format

## 20. Approval Checklist

- [ ] Product approves the ledger field set and classification values
- [ ] Engineering approves the hidden dependency and side-effect requirements
- [ ] QA approves the evidence contract
- [ ] Migration owners agree no workbook moves forward without a completed ledger
