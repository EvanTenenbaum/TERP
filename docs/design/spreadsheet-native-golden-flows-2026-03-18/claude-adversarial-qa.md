# Claude Adversarial QA Notes

Date: `2026-03-18`

## Purpose

This file records the pre-build Claude adversarial QA runs for the spreadsheet-native golden-flow pack, what they surfaced, and how those findings were resolved before artboard generation.

## Review Runs

### Run 1

- run dir: `/Users/evan/.codex-runs/claude-qa/20260319T001434Z-users-evan-spec-erp-docker-terp-terp-docs-design-spreadsheet-nat-a495c3`
- target: `docs/design/spreadsheet-native-golden-flows-2026-03-18/module-specs.md`
- value: surfaced the most useful first-pass spec contradictions

Primary useful findings from Run 1:

- Client Ledger should not silently move from `/client-ledger` to an Accounting tab route that does not exist today.
- Shipping needed concrete pick-pack contract names instead of a placeholder phrase.
- Returns needed an explicit `GF-009` versus `GF-012` split.
- Payments needed a clear staging-versus-commit rule so spreadsheet edits do not imply direct financial posting.

Resolution status:

- `closed with evidence`: Client Ledger route is now documented as `/client-ledger?surface=sheet-native` with current compatibility routes preserved.
- `closed with evidence`: Shipping now names `pickPack.getPickList`, `pickPack.getOrderDetails`, `pickPack.packItems`, `pickPack.markAllPacked`, `pickPack.unpackItems`, `pickPack.markOrderReady`, `pickPack.getStats`, and `orders.shipOrder`.
- `closed with evidence`: Returns now has a dedicated dual-flow clarification section that explains how `GF-009` and `GF-012` coexist.
- `closed with evidence`: Payments now states that spreadsheet edits only stage the transaction and that `Record Payment` is the explicit commit step.

### Run 2

- run dir: `/Users/evan/.codex-runs/claude-qa/20260319T002125Z-users-evan-spec-erp-docker-terp-terp-docs-design-spreadsheet-nat-5619c6`
- target: `docs/design/spreadsheet-native-golden-flows-2026-03-18/module-specs.md`
- value: surfaced structural documentation improvements, but also hit inline-context truncation

Important caveat from Run 2:

- Claude still reported that modules 5-8 were missing, but that is a context-collection limitation rather than a real file-state issue.
- Local verification confirms all 8 module sections exist in `module-specs.md`.
- Verified headings:
  - `### 1. Operations -> Receiving`
  - `### 2. Purchasing -> Purchase Orders`
  - `### 3. Operations -> Shipping / Pick & Pack`
  - `### 4. Accounting -> Invoices`
  - `### 5. Accounting -> Payments`
  - `### 6. Accounting -> Client Ledger`
  - `### 7. Sales -> Returns`
  - `### 8. Operations -> Samples`

Useful findings from Run 2 that were incorporated:

- explicitly account for `GF-003`, `GF-004`, and `GF-011`
- define a concrete viewport assumption for width-discipline review
- translate visible adjacency into a repeatable layout pattern
- clarify why contract naming mixes namespaced and bare routers in a few places

Resolution status:

- `closed with evidence`: `module-specs.md` now explains that `GF-003`, `GF-004`, and `GF-011` are already covered by the existing March Orders and Inventory pilot artboards.
- `closed with evidence`: `module-specs.md` now states a `1440px` working viewport and minimum visible-column heuristics.
- `closed with evidence`: `module-specs.md` now defines visible adjacency as a compact summary strip, pinned handoff row, or support card with explicit cross-sheet CTA.
- `closed with evidence`: `module-specs.md` now includes a contract naming rule that documents why some active TERP routers are namespaced and others are still bare.

## QA Outcome Used For Build Go/No-Go

Result: `closed with evidence`

Reason:

- the highest-signal contradictions from Claude were resolved in the written spec pack before generation
- the second run's missing-module claim was disproven by local file verification
- the spec pack, prompt, screenshot-direction note, README, manifest, and generated SVGs now agree on scope and route intent

### Run 3

- run dir: `/Users/evan/.codex-runs/claude-qa/20260319T005419Z-users-evan-spec-erp-docker-terp-terp-docs-design-spreadsheet-nat-8aee11`
- target: `docs/design/spreadsheet-native-golden-flows-2026-03-18/`
- value: intended as a full-pack adversarial review after adding the missing Sales Sheets surface and explicit Sales Order deliverable naming

Run 3 blocker:

- the Claude runner now reaches preflight on this machine, but the actual `claude` binary is not installed or not on `PATH`
- report status: `Blocked`
- report evidence: `report.md` in the run directory explicitly states `claude is not installed or not on PATH`

Local fallback verification completed in the same pass:

- `closed with evidence`: pack folder now contains `14` SVG artboards
- `closed with evidence`: `manifest.json` now contains `14` artboard entries and includes both `sales-sheet.svg` and `sales-order-sheet.svg`
- `closed with evidence`: `sales-order-sheet.svg` contains the directional anchors `Inventory`, `Sales Order`, `Referral`, `Credit`, and `Whole Order Changes`
- `closed with evidence`: `sales-sheet.svg` contains the guardrail-critical anchors `Sales Sheet Builder`, `Priced Inventory Browser`, `Sales Sheet Preview`, `Unsaved changes block share/convert`, `Seed route: ?fromSalesSheet=true`, `To Order`, `To Quote`, and `Live`
- `closed with evidence`: the manifest maps `sales-sheet.svg` to `/sales?tab=sales-sheets&surface=sheet-native` and preserves current oracle routes for the explicit sales-order artboard

### Run 4

- run dir: `/Users/evan/.codex-runs/claude-qa/20260319T042039Z-users-evan-spec-erp-docker-terp-terp-docs-design-spreadsheet-nat-7b4519`
- target: explicit-path-list review of `module-specs.md`, `sales-order-sheet.svg`, and `sales-sheet.svg`
- value: successful Claude Messages API fallback review after narrowing scope to the three highest-leverage files

Primary useful findings from Run 4:

- the Pack Definition omitted `sales-sheet.svg` and `sales-order-sheet.svg`
- the Payments spec left two competing commit contracts unresolved
- the Returns spec did not name a concrete layout home for `GF-012`
- the Sales Sheets spec used `DF-021` without defining it or grounding it in source material
- the Client Ledger spec still said `Accounting` workbook even though the route remains standalone

Resolution status:

- `closed with evidence`: `module-specs.md` Pack Definition now includes both `sales-order-sheet.svg` and `sales-sheet.svg`, and adds a pack QA rule requiring explicit deliverables to appear in the list.
- `closed with evidence`: the Payments spec now names `accounting.payments.create` as the spreadsheet-native confirm contract and demotes `payments.recordPayment` / `accounting.invoices.recordPayment` to legacy compatibility references.
- `closed with evidence`: the Returns spec now names a linked order-context clarification band for `GF-012`, matching the existing `returns-sheet.svg` dual-flow region.
- `closed with evidence`: `DF-021` is now defined inline and grounded in `COMPREHENSIVE_ROADMAP_REVIEW_2026-01-20.md`, `USER_FLOW_MATRIX.csv`, current sales-sheet UI files, and `server/routers/salesSheets.ts`.
- `closed with evidence`: the Client Ledger spec now labels the workbook as `Standalone Ledger`, matching the preserved `/client-ledger` route and the artboard copy.
- `closed with evidence`: the Sales Sheets spec now uses the current router surface more precisely: `save`, `generateShareLink`, `getById`, `deleteDraft`, `saveView`, and `setDefaultView` were added, and quote conversion is now documented as `salesSheets.convertToOrder` with `orderType=QUOTE`.
- `closed with evidence`: `sales-sheet.svg` now restores the `Template + Brand` affordance and clarifies that quote mode uses the same conversion path rather than a second endpoint.
- `closed with evidence`: `payments-sheet.svg` now explicitly states that confirm posts through `accounting.payments.create`.
- `closed with evidence`: `sales-order-sheet.svg` now calls out preserved seeded-entry modes so the directional layout cannot be mistaken for feature loss.

### Run 5

- run dir: `/Users/evan/.codex-runs/claude-qa/20260319T043305Z-users-evan-spec-erp-docker-terp-terp-docs-design-spreadsheet-nat-f1f26c`
- target: repeat explicit-path-list review of `module-specs.md`, `sales-order-sheet.svg`, and `sales-sheet.svg` after the Run 4 fixes
- value: surfaced one remaining contract-doc gap and two QA-hardening improvements; still limited by the collector not extracting SVG internals into Claude's inline context

Primary useful findings from Run 5:

- the Contract Naming Rule still omitted `inventory.*`
- the Module Summary Matrix needed an explicit standalone note for Client Ledger
- the Pack QA rule needed the inverse physical-file check, not just deliverable-to-pack inclusion
- Claude also requested explicit citation for the `salesSheets.convertToOrder(orderType=QUOTE)` claim

Resolution status:

- `closed with evidence`: `module-specs.md` now names `inventory.*` explicitly and grounds it in `server/routers/inventory.ts`, where `inventoryRouter` is the active namespace.
- `closed with evidence`: the Module Summary Matrix now carries a standalone-workbook note for Client Ledger so the route is not accidentally remounted into Accounting tabs.
- `closed with evidence`: the Pack QA rule now requires physical file confirmation for every Pack Definition artboard, and local directory verification confirms `14` SVGs are present in the pack folder.
- `closed with evidence`: the Sales Sheets conversion rule now cites `server/routers/salesSheets.ts`, where `convertToOrder` accepts `orderType: z.enum(["DRAFT", "QUOTE", "ORDER"])`.
- `partial with evidence`: Claude still could not verify the actual SVG layout content because the collector omitted SVG internals from inline context; local text-level verification was used for those artboards instead.

## Remaining Known Limitation

- Claude review on long single-file design specs can truncate inline context and produce false missing-section findings.
- For this pack, use `module-specs.md` plus this QA memo as the authoritative source of truth rather than relying on the truncation-prone summary line in Run 2.
- On this machine, broad folder-level Claude runs are still blocked until the `claude` binary is installed or made available on `PATH`, but focused explicit-file reviews can succeed through the Messages API fallback path.
- The current Claude collector path still does not inline SVG element content, so final layout conformance for SVG artboards must be closed with local verification or a renderer-backed review pass rather than Claude's text-only artifact packet.

### Run 6

- execution path: direct image-backed Messages API invocation through `scripts/invoke_claude_api.py`
- strongest output: `/tmp/terp-visual-review-b.json`
- supporting output: `/tmp/terp-visual-review-post.json`
- weak / low-confidence output: `/tmp/terp-visual-review-a.json`
- value: this was the first pass in this project that gave Claude the actual rendered PNGs as primary evidence instead of only manifest-style context

What Run 6 established:

- the earlier `run_review.py` folder-level attempts were not equally trustworthy for visual QA because some of them spent the attachment budget on manifests or drifted back into spec-only reasoning
- the direct API path with PNG attachments produced the most useful visual findings for this pack
- the highest-signal visual issues from that run were:
  - Payments commit stage still read too much like a secondary / inspector-position action surface
  - Returns needed clearer `GF-012` follow-up signaling and credit-handoff language
  - Sales Sheets needed a visibly blocked dirty state for conversion
  - Samples support-card framing needed to stay visually separate from the dominant table
  - Client Ledger needed stronger running-balance visibility under open-detail review

Resolution status after Run 6:

- `closed with evidence`: `payments-sheet.svg` was updated so the trust surface now reads as `Guided Commit Review`, uses a stronger trust container, and foregrounds staged-versus-commit language.
- `closed with evidence`: `receiving-sheet.svg` was updated so the top strip no longer pretends to be the submit surface; the submission anchor now reads as `Review + Submit` inside `Pre-Submit Review + Media`.
- `closed with evidence`: `sales-sheet.svg` now shows a dirty-state treatment with blocked share / convert actions until save completes.
- `closed with evidence`: `samples-sheet.svg` now uses explicit support-card framing (`Expiry Support Card`, `Action Support Card`) instead of letting those regions read like generic side actions.
- `closed with evidence`: `returns-sheet.svg` now uses `credit handoff initiation` language and a stronger `Order + Credit` CTA for the `GF-012` follow-up path.
- `partial with evidence`: `client-ledger-sheet.svg` was improved after the first visual run, but required an additional local fix / rerender cycle because the running-balance summary still was not carrying enough visual weight.

### Run 7

- execution path: post-fix local rerender plus another narrow Claude image pass attempt
- local render evidence: `/tmp/terp-figma-review-pngs/client-ledger-sheet.svg.png`
- attempted narrow reruns:
  - `/tmp/terp-visual-rerun.json`
  - `/tmp/terp-visual-pass-1.json`
- value: used to verify whether the Client Ledger rework closed the remaining visible weakness

What happened in Run 7:

- the first re-render exposed a real SVG authoring mistake (`Attribute fill redefined`), which was fixed before finalizing the artboard.
- after the SVG fix, the Client Ledger artboard was rerendered successfully and the right rail now includes:
  - a stronger `RUNNING BAL` summary card
  - a visible `SELECTED ROW IMPACT` strip
  - directional running-balance deltas in-row (`14.9K  -2.5K`, `17.4K  +3.3K`, etc.)
- the broad six-image Claude rerun hit an output-budget ceiling before returning usable findings.
- a follow-up split rerun was attempted, but it did not return a usable result within the interactive window and was stopped rather than treated as authoritative.

Resolution status after Run 7:

- `closed with evidence`: the Client Ledger artboard now carries running-balance visibility and directional movement more explicitly in both the right rail and the table itself.
- `closed with evidence`: the first broken SVG rerender was caught and fixed before delivery, so the final artboard renders cleanly again.
- `partial with evidence`: the newest split Claude reruns did not produce additional trustworthy findings, so final closure uses the strongest completed image-backed run plus local rerender verification rather than pretending the latest tool attempt was conclusive.

## Final Visual-QA Closure Note

Result: `closed with evidence`

Why this is the final closure call:

- the pack did receive a real image-backed Claude pass through the Messages API with PNG attachments
- the strongest completed visual run produced actionable findings that were incorporated into the artboards and spec
- the remaining Client Ledger weakness was then fixed locally and verified by rerendering the SVG itself
- later Claude reruns became tool-limited (output budget / non-returning run), so they were treated as non-authoritative rather than overstated
- final delivery therefore rests on the combination of:
  - the strongest completed Claude image-backed output
  - local SVG rerender verification
  - direct artifact inspection of the updated files
