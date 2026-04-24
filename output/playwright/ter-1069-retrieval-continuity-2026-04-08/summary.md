# TER-1069 Runtime Proof

## Environment

- Local proof server: `http://127.0.0.1:3015`
- Runtime mode: local demo auth with `DATABASE_URL` and `TEST_DATABASE_URL` pointed at the local test DB
- Browser driver: headless Playwright via one-off Node scripts

## Captured Cases

### 1. Direct order flow keeps relationship context near commit

- Artifact: `create-order-client-selected.png`
- Route: `/sales?tab=create-order`
- Observed:
  - `Customer Context` card stays visible beside the document
  - quick actions for `Overview`, `Money`, and `Pricing` are present
  - `Commit Continuity` renders the `Direct order flow` badge instead of dropping the operator into a contextless document

### 2. Imported catalogue cut survives the move into the order surface

- Artifact: `create-order-imported-cut-after-reload.png`
- Route: `/sales?tab=create-order&clientId=2`
- Setup:
  - selected `Emerald Valley Collective LLC`
  - wrote a portable sales cut into `sessionStorage`
  - reloaded the document route so the cut could hydrate without being cleared by manual client reselection
- Observed:
  - `Saved cut: Imported LIVE cut`
  - filter summary chips for `Search: Blue Dream`, `Flower`, and `Include unavailable`
  - inventory grid narrowed to the imported cut
  - `Commit Continuity` shows `Imported cut active`
  - imported rows render plain-language unavailable state (`Incoming`, `Still incoming and not ready to sell`)

### 3. Public shared catalogue uses the unified outbound descriptor and terms note

- Artifact: `shared-sales-sheet-proof.png`
- Route: generated local share link backed by a real `salesSheetHistory` row
- Observed:
  - descriptor line renders `Andy Rhan · Indoor · BT-42` on the public page even though the saved row had `brand: null` and only `vendor`
  - footer uses the standardized confirmation language:
    `Pricing, availability, and payment terms are subject to final confirmation.`

### 4. A blocked draft shows the commit warning and disabled finalize state together

- Artifact: `blocked-draft-confirm-disabled.png`
- Route: `/sales?tab=create-order&draftId=51`
- Setup:
  - inserted a local proof draft for client `2` with one `AWAITING_INTAKE` batch returned by the live pricing query
- Observed:
  - `Commit Continuity` shows `1 blocked line`
  - the warning copy reads `This draft only contains unavailable, blocked, or unresolved lines. Replace, recheck, or remove them before confirming the order.`
  - `Confirm Order` is rendered disabled in the same frame as the warning state
