# PRD Draft - 2026-03-19-figma-review

Generated: 2026-03-19
Timeline Source: /Users/evan/spec-erp-docker/TERP/TERP/artifacts/video-feedback/2026-03-19-figma-review/04_timeline/comment_timeline.json
Comment IDs Seen: C001, C002, C003, C004, C005, C006, C007, C008, C009, C010, C011, C012, C013, C014, C015, C016, C017, C018, C019, C020, C021, C022, C023, C024, C025, C026, C027, C028, C029, C030, C031, C032, C033, C034, C035, C036, C037, C038, C039, C040, C041, C042, C043, C044, C045, C046, C047, C048, C049, C050, C051, C052, C053, C054, C055, C056, C057, C058, C059, C060, C061, C062, C063, C064, C065, C066, C067, C068, C069, C070, C071, C072, C073, C074, C075, C076, C077, C078, C079, C080, C081, C082, C083, C084, C085, C086, C087, C088, C089, C090, C091, C092, C093, C094, C095, C096, C097, C098, C099, C100, C101, C102, C103, C104, C105, C106, C107, C108, C109, C110, C111, C112, C113, C114, C115, C116, C117, C118, C119, C120, C121, C122, C123, C124, C125, C126, C127, C128, C129, C130, C131

## 1. Problem Statement

The spreadsheet-native Figma deck is directionally strong, but this recording shows a meaningful alignment risk: if the designs are taken too literally, they can lose existing TERP workflow logic, underdeliver on spreadsheet density, and introduce placeholder actions that do not match how the real modules should behave. The review consistently asks for denser sheet-like working areas, broader search and actionability, preservation of prior system behaviors, and tighter alignment between page layout and actual operational logic.

## 2. Goals

- Make the reviewed surfaces feel faster, denser, and more spreadsheet-native.
- Preserve real TERP workflow behavior even when the current mock is simplified.
- Improve trust and throughput for operations users by emphasizing direct actionability and high-value context.
- Carry forward the strongest functional asks from the recording, especially around Fulfillment bagging and Payments debt handling.
- Explicitly separate recording-approved direction from visible-but-not-actually-reviewed surfaces.

## 3. Non-Goals

- Do not treat every visible button or row action in the current deck as approved final product truth.
- Do not silently rename `Sales Sheet` to `Sales Catalog` without a decision.
- Do not generalize the Client Ledger into a broader ledger framework in this pass.
- Do not infer approval for Purchase Orders, Invoices, Returns, Samples, or Shared Primitives from mere visual presence.

## 4. User Stories

- As an operations user, I want queues and sheets to show more usable data at once so I can work at spreadsheet speed.
- As a sales or fulfillment user, I want the page layout to preserve the real workflow logic I already rely on so the redesign does not make the system feel less capable.
- As an accounting user, I want payment and ledger surfaces to reflect buyer debt and allocation logic clearly so I can trust what I am recording.
- As a product/design reviewer, I want placeholders and decision gates called out explicitly so mockups do not accidentally rewrite the product.

## 5. Requirements

### R-001: Orders Queue must feel global, dense, and directly actionable

- Requirement: Rework the Orders Queue so global search, quick state filtering, higher data density, and direct row actionability are immediately legible.
- Source Comments: C001, C002, C003, C004, C005, C006, C007, C008, C009, C010, C011, C012, C013, C014, C015, C016, C017, C018, C019, C020, C021, C022, C023, C024, C025, C026, C027, C028, C029, C030, C031, C032
- Literal Signal: "Everything needs to be fully global", "the rows can be customized and edited", "show me drafts show me confirmed", "this needs to be wider", "there's too much blank space".
- Evolved Product Interpretation: The queue should read as a serious operating surface with wide scan value, fast filtering, and row-scoped next actions, not a padded review card with a small table in the middle.
- Acceptance Criteria:

1. A first-glance reviewer can tell that search is broad and that queue slices can be filtered quickly.
2. The queue visibly prioritizes row density over decorative padding.
3. Row-level actions stay available without crowding out the primary table.

### R-002: Order-composer related designs must preserve existing workflow semantics

- Requirement: Orders Document and Sales Order related revisions must explicitly preserve real TERP workflow logic and avoid literalizing placeholder controls that would erase auto-populated or governed behaviors.
- Source Comments: C033, C034, C035, C036, C037, C038, C039, C040, C041, C042, C043, C044, C045, C046
- Literal Signal: "all my previous comments ... should be true across all of these modules", "Shouldn't have add row", "This is mostly about ... design layout", "I'm just gonna assume".
- Evolved Product Interpretation: The deck should be treated as a layout proposal that still has to reconcile with seeded entry, existing filters, auto-populated rows, and functional parity.
- Acceptance Criteria:

1. Revision notes or mock annotations make it clear where visible controls are placeholders.
2. Proposed designs do not imply freeform `Add Row` behavior where the real system should derive rows from context.
3. Existing functional affordances called out in the recording are preserved or intentionally relocated.

### R-003: Sales Sheet must support naming review, media-aware output, and pricing context

- Requirement: The Sales Sheet revision must surface the unresolved naming decision, add media/output thinking, and keep pricing-rule behavior intelligible.
- Source Comments: C047, C048, C049, C050, C051, C052, C053, C054, C055, C056, C057, C058, C059, C060, C061, C062
- Literal Signal: "change the name ... from sales sheet to sales catalog", "the images", "creating a PDF", "pricing rules be in effect".
- Evolved Product Interpretation: This page is not only an internal sheet builder; it is also a customer-facing output staging surface, so media and pricing clarity matter.
- Acceptance Criteria:

1. The next revision shows where image/media context lives for Sales Sheet output.
2. Output or PDF-related actions feel intentional rather than bolted on.
3. Naming remains an explicit decision gate until confirmed.

### R-004: Inventory must become a broader, denser governed registry

- Requirement: Rework Inventory to emphasize broad registry scanning, governed editability, and a more spreadsheet-native density profile.
- Source Comments: C063, C064, C065, C066, C067, C068, C069, C070, C071, C072
- Literal Signal: "this needs to be so much bigger and longer", "60-70 rows", "all this needs to be editable again", "location is not gonna be a really big deal at first".
- Evolved Product Interpretation: Inventory should feel like a serious browse-and-govern work surface, not a narrow detail card with a table attached.
- Acceptance Criteria:

1. The registry uses more of the page for row volume and less for framing chrome.
2. Adjustment/governance cues remain clear enough to avoid implying reckless raw edits.
3. Lower-priority metadata does not dominate the hierarchy.

### R-005: Intake must feel expert and non-patronizing

- Requirement: Simplify Intake so it keeps branch clarity and safety, but moves away from overly prescriptive or tutorialized framing.
- Source Comments: C073, C074, C075, C076, C077, C078, C079, C080, C081, C082, C083
- Literal Signal: "This is too prescriptive", "Like it's treating people like babies", "bulk actions", "Filter all that", "add notes", "consolidated into something small".
- Evolved Product Interpretation: Intake should still make the branch model legible, but the interaction tone should trust operators and prioritize the working surface.
- Acceptance Criteria:

1. Secondary instructional regions are reduced enough that the main work areas visibly expand.
2. Bulk actions, filters, and shared notes feel native to the page.
3. Direct Intake vs PO Receiving remains understandable.

### R-006: Fulfillment must model bagging explicitly and prioritize the active work surface

- Requirement: Revise Fulfillment to make bagging a first-class operational model, including bag IDs, auto-bag/manual-bag flows, configurable units-per-bag, and split-bag scenarios, while reducing lower-value side content.
- Source Comments: C084, C085, C086, C087, C088, C089, C090, C091, C092, C093, C094, C095, C096, C097, C098, C099, C100, C101, C102, C103, C104, C105, C106, C107, C108, C109, C110, C111, C112, C113, C114, C115, C116, C117
- Literal Signal: "there needs to be a concept of bags", "the bags need to have their own ID", "manually putting in what bag it's in", "customize how many units can fit in one bag", "click auto bag", "get rid of manifest language", "order contacts is not very important".
- Evolved Product Interpretation: The design should represent actual packing logic, not just a generic shipping sheet with a manifest footer.
- Acceptance Criteria:

1. Bagging logic is clearly part of the primary workflow, not a hidden afterthought.
2. The layout supports both automatic and manual bag assignment.
3. Manifest language is removed or clearly deprioritized in this phase.
4. The main action zone is larger than low-value support panels.

### R-007: Payments must support both buyer-level debt handling and invoice allocation

- Requirement: The Payments revision must clearly support recording payments against buyer debt while still allowing those payments to be applied to specific invoices.
- Source Comments: C118, C119, C120, C121, C122, C123, C124, C125, C126, C127
- Literal Signal: "Outstanding invoices is one interesting way that people should be able to pay", "be able to edit these or add a payment", "it shouldn't necessarily be tied to an invoice", "there should be an option to apply payment to specific invoices".
- Evolved Product Interpretation: Payments should be designed as a receivables surface first and an invoice-allocation tool second.
- Acceptance Criteria:

1. A reviewer can tell that payment entry does not require immediate invoice binding.
2. Specific invoice application remains clearly available.
3. Search and accounts-receivable context are visible enough to support quick accounting decisions.

### R-008: Client Ledger should stay simple, strong, and reusable

- Requirement: Preserve the Client Ledger direction as a clean running-balance review surface and lightweight reusable pattern, without overbuilding.
- Source Comments: C128, C129, C130, C131
- Literal Signal: "this is a good ledger", "not just like client ledger, but also ... expense ledger", "it should get cleaned up", "Don't get too fancy here".
- Evolved Product Interpretation: The ledger pattern is approved in principle, but the immediate priority is clarity and restraint.
- Acceptance Criteria:

1. The ledger still reads clearly as a transaction-history and balance surface.
2. Cleanup improves clarity without adding unnecessary complexity.
3. Reusability is preserved as a future pattern, not overbuilt now.

## 6. UX / Interaction Notes

- The recording repeatedly prefers more data density and less decorative blank space.
- Many visual controls should be treated as placeholders unless the recording explicitly endorsed them.
- The safest design stance is: preserve real TERP logic first, then use this review to tune hierarchy, naming, and operator speed.
- Purchase Orders and Invoices were seen in the deck but not meaningfully reviewed in speech, so they should remain pending.

## 7. Edge Cases and Risks

- If the next revision literalizes placeholder controls, it can accidentally erase seeded entry, auto-population, or existing operational guardrails.
- If Fulfillment bagging remains shallow, the redesign will miss the most specific functional requirement in the recording.
- If Payments remains invoice-only, it will conflict with the stated buyer-debt workflow.
- If `Sales Catalog` is adopted without explicit confirmation, terminology could drift from product reality.

## 8. Rollout and Success Metrics

- First pass: revise the reviewed surfaces only and annotate non-literal controls or open decisions.
- Second pass: run follow-up review on Purchase Orders, Invoices, Returns, Samples, and Shared Primitives.
- Success metrics:

1. Reviewers immediately understand which surfaces are approved direction vs pending review.
2. Revised mocks show materially higher information density.
3. Fulfillment, Payments, and Sales Sheet revisions reflect the recording's functional asks without deleting existing TERP capabilities.

## 9. Open Questions

- Should `Sales Sheet` remain the product term, or should it become `Sales Catalog`?
- Should media/images appear directly in the dense Sales Sheet workspace, only in preview/output, or both?
- What default bag-capacity policy should drive auto-bag in Fulfillment?
- Where should shared notes live across Intake and other operational sheets?
- How much direct editability should Inventory expose before crossing into unsafe freeform mutation?

## 10. Traceability Matrix

| Requirement | Source Comments                                                                                                                                                                                            | Notes                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| R-001       | C001, C002, C003, C004, C005, C006, C007, C008, C009, C010, C011, C012, C013, C014, C015, C016, C017, C018, C019, C020, C021, C022, C023, C024, C025, C026, C027, C028, C029, C030, C031, C032             | Orders Queue density, search, filters, editability                   |
| R-002       | C033, C034, C035, C036, C037, C038, C039, C040, C041, C042, C043, C044, C045, C046                                                                                                                         | Preserve real workflow logic; do not literalize placeholder controls |
| R-003       | C047, C048, C049, C050, C051, C052, C053, C054, C055, C056, C057, C058, C059, C060, C061, C062                                                                                                             | Sales Sheet naming, media, output, pricing                           |
| R-004       | C063, C064, C065, C066, C067, C068, C069, C070, C071, C072                                                                                                                                                 | Inventory density and governed editability                           |
| R-005       | C073, C074, C075, C076, C077, C078, C079, C080, C081, C082, C083                                                                                                                                           | Intake simplification, notes, bulk actions                           |
| R-006       | C084, C085, C086, C087, C088, C089, C090, C091, C092, C093, C094, C095, C096, C097, C098, C099, C100, C101, C102, C103, C104, C105, C106, C107, C108, C109, C110, C111, C112, C113, C114, C115, C116, C117 | Fulfillment bagging and layout priority                              |
| R-007       | C118, C119, C120, C121, C122, C123, C124, C125, C126, C127                                                                                                                                                 | Payments debt-vs-invoice model                                       |
| R-008       | C128, C129, C130, C131                                                                                                                                                                                     | Ledger approval with simplicity guard                                |
