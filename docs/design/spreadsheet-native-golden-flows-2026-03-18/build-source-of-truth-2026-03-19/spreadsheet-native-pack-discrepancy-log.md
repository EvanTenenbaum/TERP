# Spreadsheet-Native Pack Discrepancy Log

Date: `2026-03-19`
Snapshot: `0e2bb8ba5edfb9c9b1e1b836acb50a8c9348cfae`

This log records the unresolved or policy-sensitive gaps that must stay visible while the pack moves from directional design into implementation planning.

## P1 Open Questions

### D-001 Sales Sheet naming

- Current state: the design review floated `Sales Catalog`, but current TERP behavior and docs still use `Sales Sheet`.
- Decision for now: keep `Sales Sheet` as the implementation term until product explicitly changes the term.
- Impact if mishandled: agents may build against drifting terminology instead of current code and route truth.

### D-002 Invoice document-output ownership seam

- Current state: invoice generation and download exist today, but `OWNERSHIP-SEAMS-MEMO.md` still leaves `ORD-D010` open around invoice download ownership as executable functionality.
- Decision for now: preserve today's outputs on the surfaces that already expose them; do not simplify them away while the ownership seam remains open.
- Impact if mishandled: order and accounting builds may each assume the other one owns output fidelity.

### D-003 Payments guided flow versus legacy payment recording

- Current state: the guided payment flow uses `accounting.payments.create`, while legacy `payments.recordPayment` and `payments.void` still exist in live surfaces.
- Decision for now: preserve both paths as real current behavior.
- Impact if mishandled: the spreadsheet-native accounting build could delete a still-relied-on payment path during redesign.

### D-004 Review coverage is uneven across the pack

- Current state: Purchase Orders and Invoices were visible but not deeply reviewed in the 2026-03-19 recording. Returns, Samples, and Shared Primitives were not substantively reviewed there.
- Decision for now: treat the recording as weak or absent visual approval for those surfaces.
- Impact if mishandled: agents may overread the recording and invent approval that the user never gave.

### D-005 Permission precision remains weaker than behavior precision

- Current state: current code and docs clearly prove behavior, but permission strings are not uniformly documented at the same fidelity for every remaining module.
- Decision for now: preserve current route access and role-gated behavior, then tighten permission strings during module-specific ledger expansion.
- Impact if mishandled: future specs may sound more certain than the evidence supports.

## P2 Open Questions

### D-006 Sales Sheet media placement

- Current state: the recording strongly asked for image and PDF readiness, but not for one definitive placement model.
- Decision for now: preserve media/output support as required behavior and leave exact placement open.

### D-007 Fulfillment auto-bag default policy

- Current state: the recording clearly asks for auto-bag and manual bagging, but does not settle the default bag-capacity policy or distribution logic.
- Decision for now: keep bagging as a first-class required capability and leave the exact auto-bag policy open.

### D-008 Shared notes placement

- Current state: the recording repeatedly wants notes visible in Intake and other operational sheets, but does not settle the shared-note presentation pattern.
- Decision for now: require note visibility and operator continuity, but leave final placement to module-level design/build work.

### D-009 Compatibility filenames versus visible labels

- Current state: compatibility filenames like `receiving-sheet.svg` and `shipping-sheet.svg` still exist even where the visible terminology should be `Intake` and `Fulfillment`.
- Decision for now: preserve compatibility filenames for artifact continuity while enforcing current visible product language in docs and UI.

### D-010 Manifest wording versus export contract

- Current state: the review wants `manifest` de-emphasized in Fulfillment, but an export artifact still exists in current behavior.
- Decision for now: de-prioritize manifest language in the UI while preserving the export contract until explicitly replaced.

## Resolved By Policy In This Packet

- Figma is directional reference only, not implementation truth.
- Orders and Inventory reuse their existing detailed ledgers instead of being restated loosely.
- Quotes and Live Shopping remain sibling surfaces that must stay adjacent to spreadsheet-native workflows instead of being silently absorbed.
- Outputs, exports, receipts, PDFs, and print paths are first-class preservation items, not secondary polish.

## Temporary Preservation Stubs Added In This Packet

### STUB-PAY-001

- Purpose: prevent the Payments rows from carrying `none found` while a dedicated accounting preservation pass is still missing.
- Anchors used: `DF-003`, `ACCT-008`, `ACCT-009`, `ACCT-010`.
- Replacement plan: replace with dedicated payment preservation rows during the module-specific Payments ledger pass.

### STUB-CROSS-001

- Purpose: prevent the shared sheet foundation from carrying `none found` while its dedicated preservation row set is still missing.
- Anchors used: `DF-073`, `DF-074`, `DF-076`.
- Replacement plan: replace with dedicated foundation preservation rows during the shared-primitives and sheet-engine pass.
