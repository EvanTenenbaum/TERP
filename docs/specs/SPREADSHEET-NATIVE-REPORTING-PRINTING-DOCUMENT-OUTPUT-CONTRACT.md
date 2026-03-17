# Specification: Spreadsheet-Native Reporting, Printing, and Document Output Contract

**Task:** ARCH-SS-005: Reporting, Printing, and Document Output Contract for Spreadsheet-Native TERP  
**Status:** Draft  
**Priority:** HIGH  
**Estimate:** 20h planning / output architecture  
**Module:** Reporting, printable artifacts, exports  
**Dependencies:** [SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md](./SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md), [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md), [SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md](./SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md), [SPREADSHEET-NATIVE-SAVE-TRANSACTION-UNDO-CONTRACT.md](./SPREADSHEET-NATIVE-SAVE-TRANSACTION-UNDO-CONTRACT.md)  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

Sheet-native ERP work surfaces handle operational interaction, but TERP still needs durable business outputs:

- invoices
- statements
- receipts
- labels
- manifests
- CSV exports
- print-friendly reviews
- audit-ready supporting documents

If this is not designed explicitly, the fork risks becoming operationally fast but administratively incomplete.

## 2. Core Principle

Sheets are the primary work surfaces.  
Documents and reports are the primary **output surfaces**.

The fork must support both without letting printing/reporting logic distort the main sheet interaction model.

## 3. Output Categories

### 3.1 Operational Exports

Purpose:

- move current working data into spreadsheet-compatible or downstream workflows

Examples:

- filtered CSV export
- selected-row export
- shipping worklist export

### 3.2 Business Documents

Purpose:

- produce formal business artifacts

Examples:

- invoice PDF
- payment receipt
- purchase order document
- sales sheet artifact

### 3.3 Review / Print Views

Purpose:

- create human-readable print or PDF output from current state

Examples:

- print current ledger range
- print filtered queue review
- print a document summary

### 3.4 Audit / Evidence Outputs

Purpose:

- package data and history for accountability or review

Examples:

- change history export
- discrepancy evidence packet
- close-period support bundle

## 4. Output Surface Model

The product should support three output origins:

- `sheet-driven output`
- `inspector-driven output`
- `background-generated output`

Default rules:

- quick operational export starts from sheet context
- record/document artifact generation may start from sheet or inspector
- heavy output generation may complete in the background

## 5. Sheet-to-Output Contract

Every sheet that supports output must declare:

- what can be exported
- whether output scope is current view, selected rows, or full entity
- whether output is immediate or backgrounded
- whether output preserves current filters/grouping/order
- whether output includes derived values

## 6. Output Scope Rules

Allowed scopes:

- current visible filtered set
- explicit selected set
- current document
- current record
- approved system report scope

Disallowed:

- hidden scope expansion
- “export all” when user believes they are exporting only selected/filtered rows

## 7. Print Contract

### 7.1 Print-Friendly Views

Print views may adapt the layout, but must:

- preserve truth
- preserve key labels
- preserve totals and status meaning
- remove non-essential chrome

### 7.2 What Print Views May Omit

- navigation
- live command strip controls
- inspector shell chrome
- interactive affordances

### 7.3 What Print Views May Not Omit

- identifying context
- date/time and scope where relevant
- totals, counts, or statuses needed to interpret the output
- pagination or continuation context where relevant

## 8. Document Generation Contract

### 8.1 Business Documents

Formal business documents must be template-backed and system-owned.

Users and admins may choose:

- approved templates
- approved branding variants
- approved output formats

They may not create custom document logic or freeform formulas.

### 8.2 Source of Truth

Generated documents must be based on committed backend truth, not unsaved local draft state, unless explicitly supported and clearly labeled as draft preview.

### 8.3 Draft Preview Rule

Draft previews are allowed when:

- clearly labeled as preview or draft
- not mistaken for final issued documents
- regenerated from latest committed truth before final issuance

## 9. Export Contract

### 9.1 Export Types

Allowed export types may include:

- CSV
- XLSX-compatible tabular export if supported
- PDF
- print-friendly HTML view
- structured evidence bundle output

### 9.2 Export Safety

Exports must respect:

- role-safe field visibility
- row visibility constraints
- masking rules
- permission restrictions

### 9.3 Derived Data

Derived fields may export as final values.  
Derived logic must not export as editable formula definitions.

## 10. Reporting Contract

### 10.1 Report Classes

The framework distinguishes:

- operational reports
- financial reports
- compliance/supporting reports
- management review reports

### 10.2 Reporting Relationship to Sheets

Reports may originate from sheet context, but they are not required to mimic sheet layout.

The output may transform the information if it improves comprehension, as long as:

- scope remains truthful
- calculations remain TERP-owned
- user intent remains preserved

## 11. Background Output Contract

Background output generation is required for:

- large exports
- multi-document bundles
- expensive report generation

Required behaviors:

- initiation acknowledgement
- progress visibility where possible
- clear completion state
- downloadable result tied to initiating scope

## 12. Inspector Integration

The inspector may initiate:

- record-specific document actions
- print actions
- audit export actions

But the inspector may not become the only place to discover outputs needed for normal workflow.

## 13. Output Naming and Metadata Contract

Generated outputs should include enough metadata to remain understandable outside TERP.

Recommended metadata:

- workbook / sheet or document source
- record identifier
- date/time generated
- user or system origin where appropriate
- scope descriptor

## 14. Versioning and Traceability Contract

Outputs that matter to business or compliance must support traceability.

At minimum, the system should be able to answer:

- what data the output was based on
- when it was generated
- by whom it was generated
- whether it was preview or final

## 15. UX Framework for Output Entry Points

Output actions should appear in predictable places:

- command strip for sheet-scoped export/print
- bulk action bar for selected-row export
- inspector action area for record/document outputs

Disallowed:

- burying critical outputs deep in overflow menus
- inconsistent iconography or naming for print/export actions

## 16. Failure and Recovery Contract

If output generation fails, the system must state:

- what failed
- whether the underlying data is unaffected
- whether user action is needed
- whether retry is available

## 17. Blueprint Requirements

Every module blueprint that includes outputs must define:

- output types
- output scopes
- print entry points
- draft vs final behavior
- backgrounding rules
- role/permission constraints
- traceability requirements

## 18. Testing Requirements

### 18.1 Unit Tests

- output scope selection
- role-safe field inclusion/exclusion
- preview/final labeling rules

### 18.2 Integration Tests

- sheet filters reflected in export scope
- record output uses committed truth
- background generation result attached to correct initiating request

### 18.3 E2E Tests

- export current filtered sheet rows
- generate a formal document from a committed record
- print-friendly view removes chrome but keeps critical context
- failed output generation shows retry-safe messaging

## 19. Adversarial QA Findings and Resolutions

### Finding 1: “The fork could still lose invoices, print views, and compliance outputs while claiming sheet parity.”

Risk:

- teams focus on interaction surfaces and forget output surfaces

Resolution:

- separated output categories and made output declaration mandatory in blueprints

### Finding 2: “Exports often lie about scope.”

Risk:

- user thinks they exported selected/filtered rows but receives broader data

Resolution:

- formalized output scope rules and prohibited hidden scope expansion

### Finding 3: “Draft previews could be mistaken for final documents.”

Risk:

- users send or rely on non-final output

Resolution:

- required explicit draft/final distinction and committed-truth regeneration before final issuance

### Finding 4: “Reporting could quietly become a formula side system.”

Risk:

- admins or modules reintroduce custom logic through output templates

Resolution:

- declared documents and reports system-owned, template-backed, and TERP-calculated

## 20. Approval Checklist

- [ ] Product approves output categories and scope rules
- [ ] Engineering approves background generation and traceability expectations
- [ ] UX approves print/export entry-point consistency
- [ ] QA approves the draft/final and scope-truth contracts
- [ ] Finance / ops stakeholders approve required formal document classes
