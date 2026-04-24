# TER-1068 Scope Alignment Review

## Verdict

Aligned. The tranche implementation stayed inside the committed TER-1068 seam and did not reopen the spreadsheet-native foundation plan.

## Requirement Match

- `TER-1072` required LIVE-first defaults and plain-language status harmonization.
  - Met by keeping sellable-only inventory as the default state on the order surface.
  - Met by making unavailable inventory opt-in through `includeUnavailable`.
  - Met by replacing icon-only ambiguity with plain-language status text such as `Incoming` and `Still incoming and not ready to sell`.
- `TER-1073` required portable cuts and saved-cut continuity.
  - Met by storing `includeUnavailable` inside shared sales filters.
  - Met by carrying those filters through portable cuts from catalogue to order.
  - Met by persisting and reloading the same filter flag through saved views.

## Explicit Non-Goals That Stayed Out Of Scope

- No redesign of the sales workspace layout.
- No new batch lifecycle or inventory-status model.
- No tracker reshuffle outside the tranche issues.
- No competing initiative-home migration to `docs/initiatives/...`.

## Implementation Shape Check

- The seam was solved by extending existing filter, saved-view, and portable-cut infrastructure rather than creating another state path.
- The server-side change stayed serialization-focused by accepting `includeUnavailable` in saved-view payloads and restoring it from stored JSON.
- The client-side work reused shared filtering helpers so catalogue, order, and inventory browser behavior stays synchronized.

## Remaining Risk

- Full `pnpm test` is still blocked by the repo reset/seed harness and is documented separately in the TER-1068 limitation packet.
