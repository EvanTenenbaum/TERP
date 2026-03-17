# Specification: Spreadsheet-Native Primitive Pack

**Task:** ARCH-SS-015  
**Status:** Draft  
**Priority:** CRITICAL  
**Spec Date:** 2026-03-14

## 1. Purpose

This pack defines the reusable primitives every spreadsheet-native workbook must inherit.

No pilot blueprint is allowed to invent a new primitive, keyboard rule, save-state rule, or sidecar pattern without updating this pack first.

## 2. Required Primitives

| Primitive                  | Responsibility                                                      | Required States                                                       | Allowed Variations                                        | Must Not Absorb                        |
| -------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| `WorkbookShell`            | hosts module identity, sheet tabs, workbook-level context           | default, loading workbook metadata, permission denied                 | module title, section cue, workbook metadata              | module-specific action overload        |
| `SheetShell`               | hosts sheet title, command strip, status bar, main layout grid      | loading, ready, partial data, blocked                                 | archetype-specific layout proportions                     | custom toolbar logic per module        |
| `CommandStrip`             | visible actions, filter chips, search, selection count, view picker | no selection, single selection, bulk selection, background job active | import/export slot, create slot, view slot                | hidden icon-only command sprawl        |
| `PrimaryTableContainer`    | main execution surface for rows                                     | loading, empty, partial, error, ready                                 | registry, document, queue, conveyor, review, setup        | custom page layout ownership           |
| `SupportingTableContainer` | linked rows, stage lanes, exceptions, lines, summaries              | loading, empty-driven, ready                                          | child-detail, stage-lane, exception-lane, summary-support | replacing the primary table            |
| `Inspector`                | default detail/edit/history/comments context                        | closed, open-empty, open-ready, blocked, saving                       | compact, full-height                                      | becoming a second page                 |
| `ApprovedSidecar`          | broader context only when inspector is insufficient                 | media, activity, exception-resolution                                 | one sidecar open at a time by default                     | lazy rebuild of legacy forms           |
| `StatusBar`                | save state, warnings, sync state, job state                         | `Saved`, `Saving`, `Needs attention`                                  | summary pill slots by sheet archetype                     | workflow-specific command area         |
| `SelectionModel`           | sheet-level and table-level selection behavior                      | none, single, bulk, secondary-supporting                              | row, cell, staged-bulk                                    | arbitrary multi-owner selection state  |
| `ValidationModel`          | cell, row, document/process readiness surfacing                     | warning, blocking, resolved, stale                                    | per-archetype badge wording                               | hiding workflow blockers in cells only |
| `WorkflowTransitionModel`  | explicit state-changing actions                                     | enabled, disabled, confirm-required, blocked                          | stage-specific button labels                              | silent state changes from casual edits |

## 3. Primitive Rules

- Every sheet has exactly one `PrimaryTableContainer`.
- Supporting tables must declare what drives them.
- `Inspector` is the default detail surface. Sidecars are exceptions, not defaults.
- `StatusBar` state wording does not vary by module.
- Workflow changes must go through `WorkflowTransitionModel`, not hidden cell behavior.
- Selection and validation rules are global product behaviors, not local module choices.

## 4. Keyboard and Focus Defaults

- `Tab` and `Shift+Tab` move within the active grid context by runtime contract.
- `Enter` commits in-grid edits where allowed.
- `Esc` exits edit mode before closing inspectors or sidecars.
- Bulk actions operate only on the active selection scope shown in the command strip.
- Sidecar focus must return to the prior table context when closed.

## 5. Primitive Exit Gate

This pack is considered decision-complete only when:

- the AG Grid proof spike validates the keyboard and selection expectations
- pilot blueprints reference only primitives from this pack
- no pilot blueprint adds an unnamed surface or sidecar type
