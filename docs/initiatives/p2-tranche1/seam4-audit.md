# Seam 4 Audit: Retrieval-to-Commit (Order Creator Surface)

**Status**: Current-state audit  
**Date**: 2026-04-07  
**Branch**: p2-phase1-immediate-fixes

---

## 1. File-by-File Data Inventory

### 1.1 `OrderCreatorPage.tsx` — Orchestrator

**Stage: Client Selection (top bar)**

- Customer combobox (name, email) — only buyers shown
- "Referred By" selector (only shown after client selected)
- Validation state indicators (checkmark / error icon) on both fields

**Stage: Item Addition (primary column)**

- `InventoryBrowser` embedded — see §1.6 for detail line rendering
- `LineItemTable` (or `OrdersDocumentLineItemsGrid` in sheet-native variant) — see §1.5
- `OrderAdjustmentPanel` — discount/markup, amount, mode, show-on-document toggle

**Stage: Pricing / Finalization (secondary column)**

- `ClientCommitContextCard` — see §1.7
- `PricingContextPanel` (requires pricing permissions) — order-total-aware pricing context
- `CreditLimitBanner` — only shown for SALE type when user lacks pricing permissions — see §1.8
- `ReferralCreditsPanel` — see §1.4
- `FloatingOrderPreview` — see §1.2
- `OrderTotalsPanel` — see §1.3
- Order Type selector (SALE / QUOTE)
- Save Draft / Save Options / Confirm Order buttons
- Validation error banner when items have errors

**Stage: Customer Drawer (right-side drawer on demand)**

- `ProfileQuickPanel` — overview, money, or sales-pricing sections
- `CreditLimitWidget` (in "money" section) — full credit limit management
- `PricingConfigTab` (in "sales-pricing" section, requires manage permission)

**Credit/Balance data visible in page logic:**

- Credit check mutation fires on finalize (SALE type only)
- `CreditCheckResult` interface carries: `creditLimit`, `currentExposure`, `newExposure`, `availableCredit`, `utilizationPercent`, `enforcementMode` (WARNING/SOFT_BLOCK/HARD_BLOCK)
- Override request flow: `requestCreditOverride` mutation (requires draft to exist first)

**Consignment context visible:** None. No consignment status, consignment terms, or consignment-related fields surface anywhere in the order creation flow.

---

### 1.2 `FloatingOrderPreview.tsx`

**Displayed data:**

- Per line item: `productDisplayName` (or fallback `Item #batchId`), quantity, unitPrice, lineTotal, isSample badge
- Quick-edit mode: editable quantity and price per row
- Quick Stats Bar (when `showInternalMetrics` enabled):
  - Items count
  - Subtotal ($)
  - Total COGS ($) — controlled by `showCogs` prop
  - Average Margin (%) — controlled by `showMargin` prop, color-coded (≥50% green, ≥30% yellow, ≥15% orange, <15% red)
- Totals section: Subtotal, Adjustment (discount/markup), Total
- Internal Margin Info box: Total COGS, Est. Profit, Samples included count

**Credit/balance info:** None  
**Consignment context:** None  
**Stage:** Appears throughout item addition + finalization (sticky sidebar, collapsed by default under `<details>`)

---

### 1.3 `OrderTotalsPanel.tsx`

**Displayed data:**

- Subtotal ($)
- Total COGS ($) — gated by `showCogs`
- Total Margin ($ and %) — gated by `showMargin`, color-coded thresholds (<0% red, <5% orange, <15% yellow, <30% green, 30%+ deep green)
- Adjustment amount (discount/markup)
- **Total** ($) — emphasized
- Warnings list (validation warnings from `useOrderCalculations`)
- Validity badge when order has errors

**Credit/balance info:** None  
**Consignment context:** None  
**Stage:** Finalization sidebar — always visible when items exist

---

### 1.4 `ReferralCreditsPanel.tsx`

**Displayed data:**

- Total available referral credits (prominently styled, green gradient card)
- Count of available referrals
- Total pending credits (amber warning)
- Per-credit detail (up to 3 shown): referred client name + credit amount
- Confirmation dialog shows: Order Total, Credits to Apply, New Total

**Modes:**

- Preview mode (no orderId): shows credits, indicates "can be applied after finalize"
- Apply mode (with orderId): allows selecting and applying credits

**Credit/balance info:** Referral credits only — not AR balance, not credit limit  
**Consignment context:** None  
**Stage:** Finalization sidebar — appears once client is selected and has referral credits

---

### 1.5 `LineItemTable.tsx`

**Displayed data per line:**
| Column | Details |
|---|---|
| Checkbox | Multi-select for bulk actions |
| # | Row index |
| Product | `productDisplayName` |
| Qty | Editable quantity (via `LineItemRow`) |
| COGS/Unit | Via `COGSInput` component — shows current value, basis badge, below-vendor-range badge |
| Gross Margin | Via LineItemRow — percent + dollar |
| Price/Unit | Editable unit price |
| Total | Line total |
| Actions | Remove, Change Lot (if productId exists) |

**Bulk actions toolbar** (when rows selected):

- Duplicate, Delete selected
- Bulk Margin % input + Apply
- Bulk COGS input + reason + Apply

**Footer:** Item count, running total

**Credit/balance info:** None  
**Consignment context:** None — no indication whether batch is owned vs. consigned  
**Stage:** Item addition + pricing

---

### 1.6 `COGSInput.tsx`

**Displayed data:**

- Current COGS value ($)
- Summary badge: Fixed / Override / LOW / MID / HIGH / Manual / "Manual below range"
- "Below vendor" destructive badge when value < vendor range minimum
- Popover editor:
  - Default COGS value
  - Vendor range (min-max) when mode=RANGE
  - Range basis selector: Low / Mid / High / Manual
  - COGS per unit input
  - Below-range warning with reason explanation
  - Reason textarea (required when below range, recommended for manual)
  - Latest reason display

**Credit/balance info:** None  
**Consignment context:** None — no indicator of whether the COGS range comes from a consignment agreement vs. a purchase  
**Stage:** Item-level pricing (embedded in LineItemTable)

---

### 1.7 `ClientCommitContextCard.tsx` (additional key component)

**Displayed data:**

- Customer name
- Last touch date (relative: "Touched today", "Touched 3d ago")
- Client roles (up to 3 badges)
- Referrer name (if exists)
- Open Quotes count
- Drafts count (salesSheetDrafts + orderDrafts)
- Active Needs count
- Recent Sales (up to 3): order number, date, total amount
- Action buttons: Overview, Money, Pricing (opens drawer)

**Credit/balance info:** None directly — opens to "Money" drawer which has CreditLimitWidget  
**Consignment context:** None  
**Stage:** Finalization sidebar — appears once client is selected

---

### 1.8 `CreditLimitBanner.tsx` (additional key component)

**Displayed data:**

- Credit limit ($)
- Current exposure ($)
- After-this-order exposure ($)
- Utilization percent + progress bar
- Alert states: No Limit Set / Credit Available / High Utilization (75-90%) / Warning (90-100%) / Exceeded (100%+)

**Shown only when:** orderType=SALE AND user lacks pricing permissions (acts as fallback for non-pricing users)

**Credit/balance info:** ✅ Full credit picture — but only for non-pricing users  
**Consignment context:** None  
**Stage:** Finalization sidebar, conditional display

---

## 2. Stage-by-Stage Visibility Map

| Stage                | What's Visible                                                                                                                    | What's Missing                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Client Selection** | Customer name, email, referral selector                                                                                           | Payment history, AR balance, days-sales-outstanding, credit tier, consignment flag                                                                          |
| **Item Addition**    | Product name, available qty, COGS (base/range), client price, gross margin, applied pricing rules, batch status warnings          | Consignment indicator per batch, vendor payment status, batch age/freshness, inventory velocity                                                             |
| **Pricing**          | COGS override with range/basis, margin %, price/unit, line totals, pricing profile rules                                          | Cost-to-serve metrics, historical price for this client, price trend vs. last order                                                                         |
| **Finalization**     | Subtotal, COGS, margin, total, adjustment, referral credits, credit limit (conditionally), open quotes/drafts/needs, recent sales | **Full AR snapshot**, payment terms, average payment speed, outstanding invoice count, consignment exposure, blended margin target, order-vs-quota progress |

---

## 3. Identified Gaps

### 3.1 Critical Gaps (Risk Recognition Before Commit)

| Gap                                           | Impact                                                                                                                          | Where It Should Surface                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **No AR balance / aging summary**             | Operator can't see if client is current or 90+ days past due before creating a new order                                        | `ClientCommitContextCard` or a new "Financial Health" card in secondary column      |
| **No outstanding invoice count/amount**       | Commits new goods without knowing total unpaid invoices                                                                         | `ClientCommitContextCard` → new "Money at a Glance" section                         |
| **No payment velocity / average days-to-pay** | Can't assess if client reliably pays within terms                                                                               | `ClientCommitContextCard` or credit drawer summary                                  |
| **No consignment indicator per batch**        | Operator doesn't know if they're selling owned inventory vs. consigned goods (different risk/margin implications)               | `InventoryBrowser` item column, `LineItemTable` product column, `COGSInput` context |
| **No consignment terms visibility**           | COGS range for consignment batches may have different meaning (settlement price vs. purchase price)                             | `COGSInput` popover, `InventoryBrowser` price columns                               |
| **Credit limit banner is conditional**        | Only shows for non-pricing users — pricing users get `PricingContextPanel` instead, but that panel's credit coverage is unclear | Should always show credit context regardless of permission level                    |
| **No blended margin vs. target**              | Order-level margin shown but not compared to client's target margin or org-level minimum                                        | `OrderTotalsPanel` — add target margin comparison                                   |

### 3.2 Important Gaps (Efficiency / Decision Quality)

| Gap                                          | Impact                                                                                   | Where It Should Surface                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **No order-vs-quota or sales target**        | Can't see if this order moves the needle toward monthly/quarterly targets                | Secondary column widget                             |
| **No historical price comparison**           | No way to see "last time we sold this to this client at $X"                              | `InventoryBrowser` or `LineItemTable` hover/tooltip |
| **No inventory velocity / sell-through**     | Can't prioritize fast-moving vs. slow-moving SKUs                                        | `InventoryBrowser` additional column or badge       |
| **No category/subcategory in LineItemTable** | Product column only shows `productDisplayName` — no category context                     | Add category badge or subtitle in product column    |
| **No batch age in order context**            | Age/freshness info exists in Inventory WorkSurface but doesn't carry into order creation | `InventoryBrowser` should show aging badge          |
| **No "last ordered" indicator**              | Recent Sales in ClientCommitContextCard shows orders but not which products were in them | Per-item "last sold to this client" indicator       |

### 3.3 Minor Gaps (Polish / Completeness)

| Gap                                                                           | Where                            |
| ----------------------------------------------------------------------------- | -------------------------------- |
| Vendor payment status (paid/pending/overdue) not shown in order context       | InventoryBrowser supplier column |
| No quick-link to client's full profile from order page (only drawer)          | ClientCommitContextCard          |
| Pricing rules summary not visible in LineItemTable (only in InventoryBrowser) | LineItemRow tooltip              |
| Sample count not prominent — buried in FloatingOrderPreview internal metrics  | OrderTotalsPanel                 |

---

## 4. Summary

The order creation surface has **strong COGS/margin visibility** and **good pricing rule integration**, but it **lacks financial health context** for the client relationship. An operator can see how profitable a line item is, but cannot quickly assess:

1. Whether the client is a payment risk (no AR aging, no payment speed)
2. Whether the inventory is consigned (no consignment indicators anywhere)
3. Whether the order aligns with margin targets (no target comparison)
4. Whether the credit picture is complete (conditional banner display)

**The single biggest gap is: the operator has no consolidated "should I trust this client with more goods?" signal visible at the moment of commitment.**

The `ClientCommitContextCard` is the natural home for this — it already shows recent sales and open artifacts, but needs financial health metrics (AR balance, payment speed, credit utilization) to complete the risk picture.
