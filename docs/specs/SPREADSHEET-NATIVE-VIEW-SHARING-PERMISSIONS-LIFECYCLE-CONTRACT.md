# Specification: Spreadsheet-Native View Sharing, Permissions, and Lifecycle Contract

**Task:** ARCH-SS-006: View Sharing, Permissions, and Lifecycle Contract for Spreadsheet-Native TERP  
**Status:** Draft  
**Priority:** HIGH  
**Estimate:** 24h planning / governance design  
**Module:** Saved views, role-safe configuration, lifecycle management  
**Dependencies:** [SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md](./SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md), [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md), [SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md](./SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md), [SPREADSHEET-NATIVE-UX-UI-FRAMEWORK.md](./SPREADSHEET-NATIVE-UX-UI-FRAMEWORK.md)  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

Spreadsheet-native products become messy when view customization lacks governance.

Common failure modes:

- personal views break when schemas evolve
- team defaults leak sensitive columns
- admins publish views that imply permissions they do not actually grant
- module teams create incompatible view semantics
- nobody knows which views are canonical, deprecated, broken, or stale

TERP needs a contract that allows useful view customization without turning the fork into a private maze of drifting layouts.

## 2. Core Principle

Views customize **presentation of permitted data**.  
Views do not change business behavior, permissions, or workflow logic.

## 3. View Types

### 3.1 Personal Views

Owned by one user.

May control:

- column visibility
- ordering
- widths
- sorting
- filtering
- grouping where supported
- pinned columns
- density

### 3.2 Team Views

Shared to a defined team or role cohort.

Purpose:

- align groups on common work setups
- speed onboarding
- standardize operational review

### 3.3 Org Defaults

Published default views for a workbook/sheet.

Purpose:

- provide stable entry points
- define “golden path” presentation

### 3.4 Locked System Views

System-maintained views that cannot be user-edited beyond temporary local session tweaks.

Use for:

- critical financial review surfaces
- high-risk operational lanes
- compliance-sensitive views

## 4. View Content Contract

Views may persist only:

- layout metadata
- sorting
- filters
- grouping
- density
- pinned columns
- enabled supporting tables where approved

Views may not persist:

- custom formulas
- custom derived logic
- ad hoc permissions
- workflow rules
- hidden cross-role access
- unsupported module-specific behaviors
- supporting-table topology changes on high-frequency operational sheets unless the sheet contract explicitly allows them

## 5. Permissions Contract

### 5.1 Role Safety

A saved view can never grant access to:

- hidden fields
- protected rows
- restricted actions
- data outside role scope

### 5.2 Graceful Degradation

If a user opens a shared view with unavailable fields or actions:

- the view must degrade safely
- unavailable elements must be omitted or downgraded
- the user must not see a broken or misleading configuration

### 5.3 No Phantom Capability

Views must not imply that a user can perform an action they lack permission to execute.

## 6. Ownership and Publication Contract

Every shared or default view must have:

- owner
- scope
- workbook/sheet target
- last updated timestamp
- visibility level

Published views require:

- explicit publication action
- clear display of target audience
- clear ability to revoke or replace

## 7. Default View Contract

### 7.1 Entry Behavior

Each sheet must define:

- system default view
- optional role/team default override
- optional user personal default

Order of precedence:

1. user personal default
2. team/role default
3. system default

### 7.2 Reset Behavior

Users must always be able to return to a known safe default.

## 8. View Versioning Contract

Views must carry a versioned schema contract so TERP can handle:

- renamed columns
- removed columns
- changed supporting table availability
- deprecated grouping or sort semantics

The system must be able to:

- migrate compatible views
- warn on partial incompatibility
- archive or invalidate broken views safely

## 9. Lifecycle States

Views must support lifecycle states:

- draft
- active
- deprecated
- archived

Suggested meanings:

- `draft`: not shared / under preparation
- `active`: valid and usable
- `deprecated`: usable but no longer recommended
- `archived`: hidden from normal use

## 10. Schema Change Handling

When a sheet evolves, the system must define what happens to existing views.

Required outcomes:

- safe automatic migration when possible
- warning when a view loses elements
- no silent corruption of view semantics

Disallowed:

- broken views opening with empty layouts and no explanation
- hidden fallback to dangerous column exposure

## 11. Sharing UX Contract

The UX for sharing a view must communicate:

- who can access it
- what kind of view it is
- whether it is editable by recipients
- whether it becomes a default

The product should never make view sharing feel like permission granting.

## 12. Supporting Table Configuration Contract

If views are allowed to control supporting table visibility, they must only choose from pre-approved tables for that sheet.

Default rule for high-frequency operational sheets:

- shared views may not toggle the primary supporting-table topology
- personal session views may temporarily collapse or hide supporting regions
- org/team defaults must preserve the canonical sheet shape

Views may not:

- add unsupported tables
- reorder workflow lanes beyond approved rules
- change entity relationships

## 13. Filter Safety Contract

Saved filters can meaningfully change user interpretation.

Required:

- saved filters must be visible when applied
- users must see whether a shared view narrows the dataset
- dangerous hidden filters are disallowed

## 14. Lifecycle Governance Contract

The product must support:

- identifying unused shared views
- identifying stale views after sheet changes
- retiring outdated defaults
- preserving audit trail for published view changes where appropriate

## 15. URL and Deep-Link Contract

Deep links may open:

- workbook
- sheet
- view
- selected record where appropriate

Rules:

- a deep link to a restricted view must degrade safely
- a missing or archived view should fall back predictably
- URL state must not bypass permission checks

## 16. Operational Safety Rules

### 16.1 High-Risk Sheets

Certain sheets may restrict view flexibility further.

Examples:

- locked financial review views
- sensitive permissions-admin surfaces
- compliance-sensitive review tables

### 16.2 Golden Path Protection

Each high-frequency sheet should maintain one stable golden-path default view that is not casually modified.

## 17. Blueprint Requirements

Every module blueprint must define:

- allowed view types
- share scopes
- whether supporting-table visibility is configurable
- default view hierarchy
- migration behavior when sheet structure changes
- any locked-system-view requirements

## 18. Testing Requirements

### 18.1 Unit Tests

- view migration compatibility rules
- precedence resolution for defaults
- safe omission of unavailable fields

### 18.2 Integration Tests

- shared view opens safely for lower-permission role
- deprecated view falls back correctly
- published default does not override user personal default incorrectly

### 18.3 E2E Tests

- create personal view -> set default -> reopen sheet
- publish team view -> access from eligible user
- open shared view lacking permission to one column/action -> safe degradation
- rename/remove a column -> affected views migrate or warn correctly

## 19. Adversarial QA Findings and Resolutions

### Finding 1: “Shared views can become a stealth permission system.”

Risk:

- users assume access through a shared layout

Resolution:

- made role safety explicit
- prohibited phantom capability and permission-like sharing behavior

### Finding 2: “Schema evolution will silently break saved views.”

Risk:

- users reopen views months later and see distorted or empty layouts

Resolution:

- added versioning, lifecycle states, and explicit migration behavior

### Finding 3: “Team defaults could erase user trust if they override personal working habits.”

Risk:

- users lose stable entry behavior

Resolution:

- defined precedence order and reset-to-safe-default behavior

### Finding 4: “Views could become another path to workflow customization.”

Risk:

- admins start reconfiguring workflow behavior through view settings

Resolution:

- limited view content to presentation only
- prohibited entity-relationship and workflow changes via views

## 20. Approval Checklist

- [ ] Product approves view-type hierarchy and sharing rules
- [ ] Engineering approves migration/versioning expectations
- [ ] UX approves sharing and default precedence behavior
- [ ] QA approves safe degradation and schema-change handling
- [ ] Security approves role-safe view constraints
