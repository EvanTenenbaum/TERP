# Deep Pass Review - 2026-03-19 Figma Review

Generated: 2026-03-19
Run: `2026-03-19-figma-review`
Video: `/Users/evan/Downloads/CleanShot 2026-03-19 at 13.57.10.mp4`
Transcript: `/Users/evan/spec-erp-docker/TERP/TERP/artifacts/video-feedback/2026-03-19-figma-review/02_transcripts/transcript.json`
Timeline: `/Users/evan/spec-erp-docker/TERP/TERP/artifacts/video-feedback/2026-03-19-figma-review/04_timeline/comment_timeline.json`

## Session Framing

This recording is not a literal sign-off on every visible control in the deck.

The strongest meta-signal in the review is:

- treat the presentation as a layout and workflow-direction pass
- preserve real TERP functionality even if a proposed mock omits it
- do not assume every visible button is a real required action
- do not add fake spreadsheet controls where the underlying module would auto-populate or govern the action differently

The user repeatedly treated the designs as provisional shells that still need to be dialed into actual workflow logic. That framing should govern all revisions that come out of this recording.

## Coverage Map

| Time Window   | Surface                               | Review Depth | Evidence                                                 |
| ------------- | ------------------------------------- | ------------ | -------------------------------------------------------- |
| `00:00-02:55` | Orders Queue                          | deep         | `C001-C026`, frame anchors around `00:01:00`, `00:02:30` |
| `02:55-05:00` | Orders Document / Sales Order context | deep         | `C027-C046`, frame anchors around `00:03:00`, `00:04:20` |
| `05:02-07:21` | Sales Sheet                           | medium-deep  | `C047-C062`, frame anchors around `00:05:20`, `00:07:00` |
| `07:23-08:31` | Inventory Sheet                       | medium       | `C063-C072`, frame anchor around `00:08:00`              |
| `08:31-10:48` | Intake                                | medium-deep  | `C073-C083`, frame anchors around `00:09:00`, `00:10:00` |
| `11:23-14:21` | Fulfillment                           | deep         | `C084-C117`, frame anchors around `00:12:00`, `00:13:00` |
| `14:21-15:33` | Payments                              | medium       | `C118-C127`, frame anchor around `00:15:00`              |
| `15:34-16:59` | Client Ledger                         | light-medium | `C128-C131`, frame anchor around `00:16:00`              |

Seen but not substantively reviewed:

- Purchase Orders was visually present during the Intake to Fulfillment transition.
- Invoices was visually present during the Fulfillment to Payments transition.

Not reviewed in this recording:

- Returns
- Samples
- Shared Primitives as a standalone system page

## Cross-Cutting Directives

1. Global search matters everywhere it is operationally meaningful.
   Evidence: `C004-C007`, `C118-C121`

2. Density and usable spreadsheet real estate are underpowered across the deck.
   Evidence: `C020-C032`, `C051`, `C063-C067`, `C074-C077`, `C114-C116`

3. Rows, columns, and visible sheet regions should be directly editable or quickly actionable unless the field is inherently immutable or governed.
   Evidence: `C008-C019`, `C033-C041`, `C068-C069`, `C121`

4. Preserve prior functionality and do not let new mockups accidentally delete known behaviors.
   Evidence: `C026`, `C040-C046`, `C057-C062`, `C121-C127`

5. Do not interpret placeholder controls literally.
   Evidence: `C035-C046`
   The recording explicitly reframed parts of the mock as layout placeholders rather than final workflow truth.

6. Avoid overly instructional or patronizing UI.
   Evidence: `C074-C076`

7. Cross-module utility expectations recur:

- quick filters
- bulk actions
- shared notes visibility
- output/export support
- fast review without modal detours

## Surface Findings

### Orders Queue

What was explicitly requested:

- search must be broad and global enough to find orders by client, brand, or equivalent operational handles
- queue rows should be customizable and editable
- the queue should support quick filter states like draft vs confirmed
- the page needs materially more width and less blank padding

What was approved in principle:

- the overall layout direction was seen as promising
- focused-order context on the right is acceptable if it does not steal too much grid width

What should not be over-literalized:

- the user did not approve every exact action label or button placement
- the approval was about density, discoverability, and direct actionability

Source comments: `C001-C032`

### Orders Document / Sales Order context

What was explicitly requested:

- preserve the "start here" composition logic
- preserve column editing patterns across modules
- keep previously available filters and workflow controls
- avoid fake actions like `Add Row` when the real workflow should auto-populate or be governed by upstream context

What was implied but important:

- this slide was being judged partly as a placeholder shell
- actual functionality parity matters more than literal mock control count

Source comments: `C033-C046`

### Sales Sheet

What was explicitly requested:

- explore whether `Sales Sheet` should be renamed to `Sales Catalog`
- add image/media support, especially for PDF or customer-facing output use cases
- preserve pricing-rule behavior and make it adjustable where relevant
- keep the same density and real-estate improvements requested elsewhere

Interpretation rule:

- naming is a decision gate, not a decided change

Source comments: `C047-C062`

### Inventory Sheet

What was explicitly requested:

- the surface is too small and too padded
- the registry should show many more rows at once
- editable interactions should remain available for governed inventory work
- location is not the highest-priority dimension early on

Interpretation rule:

- the user was not asking for reckless freeform quantity editing
- they were asking for a denser, faster registry while keeping meaningful control

Source comments: `C063-C072`

### Intake

What was explicitly requested:

- the page is too prescriptive
- the workflow should feel more operator-native and less tutorialized
- bulk actions, filtering, and shared notes matter here
- the layout should consolidate secondary panels so the main work areas can expand

Source comments: `C073-C083`

### Fulfillment

What was explicitly requested:

- bagging needs to become a first-class operational concept
- each bag should have its own ID
- operators need manual and automatic bag assignment flows
- units-per-bag should be configurable
- split-bag scenarios must be supported
- remove `manifest` language for now
- de-emphasize `order contacts`
- keep the primary active work region large and fast

This is the most functionally specific section of the recording.

Source comments: `C084-C117`

### Payments

What was explicitly requested:

- support buyer-level payment entry, not just invoice-bound payment
- still allow applying payment to specific invoices
- keep outstanding invoices and accounts-receivable context legible
- search and editing should be fast from the payments surface

Source comments: `C118-C127`

### Client Ledger

What was explicitly requested:

- the ledger pattern is good and reusable
- it could generalize beyond just client debt
- do not overcomplicate it right now

Interpretation rule:

- this is positive directional approval, not detailed visual sign-off

Source comments: `C128-C131`

## Second-Pass Context Guards

These guards should be carried into any follow-up revision prompt:

1. "Do not delete or narrow existing TERP behavior just because the current mock does not show it."
2. "Treat visible buttons and row actions as provisional unless the recording explicitly endorsed them."
3. "When in doubt, preserve workflow logic and use the recording mainly to guide density, hierarchy, naming, and operator speed."
4. "If a surface was only visible and not actually discussed, mark it pending review instead of silently treating it as approved."

## Recommended Revision Priority

1. Orders Queue / Orders Document / Sales Order composition
2. Sales Sheet naming plus media/output support
3. Intake simplification
4. Fulfillment bagging model
5. Payments payment-model clarity
6. Ledger cleanup without overbuilding

## Follow-Up Needed

- Run a dedicated review on Purchase Orders and Invoices because they were visible but not verbally reviewed.
- Run a dedicated review on Returns, Samples, and Shared Primitives because this recording provides no reliable approval signal for them.
