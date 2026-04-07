# P2 Immediate Fixes — Requirements

## Context

Adversarial review of PRs 567/568 found 3 P0 issues in already-shipped work. These must be fixed before continuing with new seam work.

## User Stories

### US-1: Accounting contact info on overdue invoices

**As an** accounting user chasing overdue payments
**I want to** see the customer's phone and email directly on the overdue invoices view
**So that** I can call or text them immediately without clicking through to their profile

**Acceptance Criteria:**

- [ ] Customer email is visible on overdue invoice rows (tooltip, inline, or column)
- [ ] Customer phone is visible on overdue invoice rows
- [ ] Data comes from the existing `customerEmail`/`customerPhone` fields already returned by `accounting.ts:278-279`
- [ ] No additional API calls needed — data is already in the response
- [ ] Contact info does NOT bloat the table width — use tooltip or compact display

### US-2: Copy for Chat copies curated selection

**As an** operator building a sales catalogue for a client
**I want** Copy for Chat to copy my curated sheet items, not all filtered inventory
**So that** the text I paste into iMessage/WhatsApp matches what I selected

**Acceptance Criteria:**

- [ ] Copy for Chat uses `selectedItems` (curated sheet) not `inventoryRows` (all filtered)
- [ ] Button disabled state reflects selected items count, not filtered inventory count
- [ ] Chat text includes item count matching the curated selection
- [ ] If no items are selected, button is disabled with tooltip "Select items first"

### US-3: Payment dialog double-submit prevention

**As an** accounting user recording a payment
**I want** the system to prevent duplicate payment submissions
**So that** I don't accidentally record the same payment twice

**Acceptance Criteria:**

- [ ] Submit button is immediately disabled after first click (before mutation starts)
- [ ] Uses a ref-based guard, not just `isPending` (which has propagation delay)
- [ ] Second rapid click within the mutation window is silently ignored
- [ ] Guard resets on mutation completion (success or error)

### US-4: Post-merge QA validation

**As the** PM/QA owner
**I want** browser proof of all 6 completed areas working on staging
**So that** we have evidence the merge didn't introduce regressions

**Acceptance Criteria:**

- [ ] Playwright screenshots for all 6 areas, with features in ACTIVE (not disabled) state
- [ ] Copy for Chat screenshot shows button enabled and clipboard interaction
- [ ] Overdue invoices screenshot shows contact info visible
- [ ] All screenshots taken on staging (not localhost)
- [ ] summary.json updated with all checks passing (no "disabled" entries)
