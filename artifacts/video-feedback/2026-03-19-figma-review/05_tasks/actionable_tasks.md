# Actionable Tasks - 2026-03-19-figma-review

Generated: 2026-03-19
Timeline Source: /Users/evan/spec-erp-docker/TERP/TERP/artifacts/video-feedback/2026-03-19-figma-review/04_timeline/comment_timeline.json

## Authoring Rules

- Keep each task linked to source comments (`C###`).
- Keep `Literal Request` and `Evolved Recommendation` separate.
- Use plain language and testable acceptance criteria.

## Task T-001: Make Orders Queue feel global, editable, and spreadsheet-dense

- Source Comments: C001, C002, C003, C004, C005, C006, C007, C008, C009, C010, C011, C012, C013, C014, C015, C016, C017, C018, C019, C020, C021, C022, C023, C024, C025, C026, C027, C028, C029, C030, C031, C032
- Literal Request (verbatim or near-verbatim): "Everything needs to be fully global", "the rows can be customized and edited", "show me drafts show me confirmed", "this needs to be wider", "there's too much blank space", "things should be a little more compact".
- Problem Observed: The Orders Queue deck slide suggests the right workflow direction, but it still reads as too padded and not yet trustworthy enough as a high-density operational queue.
- Proposed Change: Increase queue width, reduce dead space, make row presentation customizable, retain direct row actions, and surface fast state filters for common queue slices.
- Evolved Recommendation (smarter but faithful): Keep the queue as a fast triage sheet with strong global search, compact status-oriented scanning, and row-scoped actions, while preserving right-side context only if it does not steal too much primary grid width.
- Acceptance Criteria:

1. The revised queue layout shows materially more queue rows or visible row data before scrolling.
2. Search affordances clearly imply cross-entity lookup, not a narrow order-ID search only.
3. Quick filter states such as drafts and confirmed orders are visible without requiring a deep secondary menu.
4. Row-level direct actionability remains visible without turning the queue into a button wall.

- Non-Goals:

1. Finalize exact backend search scope in the mock.
2. Lock every exact action label from the current slide.

- Notes / Constraints / Edge Cases: This task is about operational feel and discoverability, not approving every visible control as final product truth.
- Confidence: High

## Task T-002: Preserve real order-composer behavior and do not take placeholder controls literally

- Source Comments: C033, C034, C035, C036, C037, C038, C039, C040, C041, C042, C043, C044, C045, C046
- Literal Request (verbatim or near-verbatim): "all my previous comments ... should be true across all of these modules", "Shouldn't have add row", "This is mostly about ... design layout", "I'm just gonna assume that will be kind of general".
- Problem Observed: The recording explicitly warned against reading proposed sheet controls as a literal replacement for real TERP functionality.
- Proposed Change: Add a revision guardrail that proposed designs must preserve seeded entry, auto-population logic, and existing workflow behaviors even if the current mock does not show them directly.
- Evolved Recommendation (smarter but faithful): Treat the Orders Document and Sales Order related slides as layout/composition proposals that must be reconciled against actual workflow contracts before implementation, especially around auto-populated rows and governed actions.
- Acceptance Criteria:

1. Revision notes explicitly mark non-literal placeholder controls as provisional.
2. Designs do not imply freeform `Add Row` behavior where the real workflow should auto-populate or derive rows from context.
3. Existing filters and prior functional affordances called out in the recording are preserved or intentionally relocated, not silently removed.

- Non-Goals:

1. Reconstruct full implementation specs for every order-composer action from this recording alone.

- Notes / Constraints / Edge Cases: This is a cross-cutting interpretation rule for the design pass, not only a single-page visual tweak.
- Confidence: High

## Task T-003: Rework Sales Sheet naming, media support, and output readiness

- Source Comments: C047, C048, C049, C050, C051, C052, C053, C054, C055, C056, C057, C058, C059, C060, C061, C062
- Literal Request (verbatim or near-verbatim): "change the name ... from sales sheet to sales catalog", "the one thing that I don't see ... is like the images", "shows the images if we're creating a PDF", "pricing rules be in effect".
- Problem Observed: The Sales Sheet direction is strong, but the recording flags unresolved naming, missing media/image context, and output-focused needs for PDF/catalog generation.
- Proposed Change: Treat naming as a decision gate, add visible media/output thinking to the design, and make pricing-rule behavior legible.
- Evolved Recommendation (smarter but faithful): Keep the builder workflow but evolve the page into a more explicit customer-priced catalog builder that can support both operator editing and outward-facing output generation, without prematurely renaming the product until terminology is confirmed.
- Acceptance Criteria:

1. The next revision shows how images/media enter the Sales Sheet workflow or output path.
2. The page makes save/share/output/convert actions easier to understand at a glance.
3. A naming decision is surfaced explicitly as `Sales Sheet` vs `Sales Catalog`, not silently assumed.
4. Pricing-rule context remains visible enough that the selected client meaningfully changes the sheet.

- Non-Goals:

1. Finalize brand terminology without product confirmation.
2. Fully design the PDF renderer in this pass.

- Notes / Constraints / Edge Cases: The recording implies image support matters especially for outward-facing output, not necessarily for every dense internal browsing state.
- Confidence: Medium

## Task T-004: Make Inventory a wider, denser, governed registry

- Source Comments: C063, C064, C065, C066, C067, C068, C069, C070, C071, C072
- Literal Request (verbatim or near-verbatim): "this needs to be so much bigger and longer", "60-70 rows", "all this needs to be editable again", "location is not gonna be a really big deal at first".
- Problem Observed: The Inventory slide still feels cramped and overdesigned relative to the operational expectation of a broad registry view.
- Proposed Change: Expand the primary inventory grid, reduce decorative padding, preserve governed editability, and de-emphasize low-priority metadata like location when it competes with row volume.
- Evolved Recommendation (smarter but faithful): Present Inventory as a high-density browse-and-govern sheet with strong quantity and state visibility, while keeping adjustment actions governed rather than making the registry feel like a loose spreadsheet.
- Acceptance Criteria:

1. The revised Inventory mock visibly favors more registry rows over padding and oversized side chrome.
2. Governed actions remain clear so editability does not read as unsafe freeform mutation.
3. Lower-priority details such as location no longer dominate the first-read hierarchy.

- Non-Goals:

1. Guarantee literal direct-cell editing for every field.

- Notes / Constraints / Edge Cases: The recording supports editability, but not at the expense of inventory controls and auditability.
- Confidence: High

## Task T-005: Simplify Intake and make it operator-native

- Source Comments: C073, C074, C075, C076, C077, C078, C079, C080, C081, C082, C083
- Literal Request (verbatim or near-verbatim): "This is too prescriptive", "Like it's treating people like babies", "bulk actions are gonna be necessary", "Filter all that", "there's gonna need to be a way to add notes", "this can be consolidated into something small so these two things can be big".
- Problem Observed: The Intake concept is directionally useful but currently overexplains itself and gives too much real estate to instructional framing instead of operator throughput.
- Proposed Change: Compress explanatory chrome, enlarge the working table and focus panel, and surface bulk actions, filtering, and shared-note support more naturally.
- Evolved Recommendation (smarter but faithful): Keep the explicit Intake vs PO Receiving branch logic, but make the page feel like an expert tool rather than a guided walkthrough.
- Acceptance Criteria:

1. The next Intake revision devotes more width and height to the main working surfaces than to instructional or validation copy.
2. Bulk actions and filter affordances are visible without turning the page into a cluttered command bar.
3. There is a clear place for notes that other operators can later see.

- Non-Goals:

1. Remove the branch distinction between direct intake and PO-linked receiving.

- Notes / Constraints / Edge Cases: The user criticized tone and density, not the existence of validation itself.
- Confidence: High

## Task T-006: Turn Fulfillment bagging into a real operational model

- Source Comments: C084, C085, C086, C087, C088, C089, C090, C091, C092, C093, C094, C095, C096, C097, C098, C099, C100, C101, C102, C103, C104, C105, C106, C107, C108, C109, C110, C111, C112, C113, C114, C115, C116, C117
- Literal Request (verbatim or near-verbatim): "there needs to be a concept of bags", "the bags need to have their own ID", "manually putting in what bag it's in", "customize how many units can fit in one bag", "click auto bag", "get rid of manifest language", "order contacts is not very important".
- Problem Observed: Fulfillment is the most functionally rich part of the recording and the current design still understates the bagging model, overstates lower-value side content, and risks making the primary pick/pack surface too small.
- Proposed Change: Elevate bagging, support bag IDs plus auto-bag/manual-bag flows, allow configurable units-per-bag, support split-bag cases, remove manifest-heavy language for now, and shrink low-value side panels.
- Evolved Recommendation (smarter but faithful): Reframe Fulfillment around an active pick/bag/output workflow where bagging is first-class operational state, while document-output or contact context stays secondary.
- Acceptance Criteria:

1. The next revision visibly supports bag IDs and bag assignment logic as core workflow objects.
2. The design makes room for both automatic and manual bagging paths.
3. The primary active work surface is larger than the low-value support panels.
4. Manifest terminology is removed or clearly deprioritized.

- Non-Goals:

1. Finalize the exact algorithm for auto-bag distribution.

- Notes / Constraints / Edge Cases: The recording explicitly calls out split-bag cases and per-item packing rules, so the design should not imply one-bag-per-line simplicity.
- Confidence: High

## Task T-007: Clarify Payments around buyer debt first and invoice application second

- Source Comments: C118, C119, C120, C121, C122, C123, C124, C125, C126, C127
- Literal Request (verbatim or near-verbatim): "Outstanding invoices is one interesting way that people should be able to pay", "you should be able to search ... globally", "be able to edit these or add a payment", "it shouldn't necessarily be tied to an invoice", "there should be an option to apply payment to specific invoices".
- Problem Observed: The Payments direction is good, but the recording wants a stronger model distinction between recording money against buyer debt vs allocating that payment to invoices.
- Proposed Change: Keep invoice application visible, but make buyer-level payment entry the core mental model with receivable context nearby.
- Evolved Recommendation (smarter but faithful): Design Payments as a buyer-debt management surface that can optionally allocate or reconcile against invoices, rather than treating invoice payment as the only entry path.
- Acceptance Criteria:

1. The page clearly supports recording payment without requiring immediate invoice selection.
2. Applying a payment to specific invoices remains clearly available.
3. Search and edit affordances feel fast enough for accounting operations.
4. Accounts-receivable context is visible enough to understand debt status quickly.

- Non-Goals:

1. Redesign the full accounting workspace outside the payments surface.

- Notes / Constraints / Edge Cases: The recording tolerates invoice-led entry, but not invoice-only payment logic.
- Confidence: High

## Task T-008: Keep the Client Ledger simple, useful, and reusable

- Source Comments: C128, C129, C130, C131
- Literal Request (verbatim or near-verbatim): "this is a good ledger", "not just like client ledger, but also ... expense ledger", "it should get cleaned up", "Don't get too fancy here".
- Problem Observed: The ledger direction is positively received, but the user explicitly does not want premature sophistication.
- Proposed Change: Clean up the ledger, preserve the useful pattern, and keep the first revision grounded in simple reviewable transaction history.
- Evolved Recommendation (smarter but faithful): Use the client ledger as a durable pattern for future ledger-style surfaces, but keep this iteration tight, readable, and operationally plain.
- Acceptance Criteria:

1. The ledger still reads clearly as a running-balance review surface.
2. Cleanup improves clarity without introducing decorative complexity.
3. The pattern remains reusable for adjacent ledger use cases later.

- Non-Goals:

1. Build a generalized multi-ledger framework in this design pass.

- Notes / Constraints / Edge Cases: This section should be treated as directional approval with a simplicity warning, not as a request for more feature depth.
- Confidence: Medium
