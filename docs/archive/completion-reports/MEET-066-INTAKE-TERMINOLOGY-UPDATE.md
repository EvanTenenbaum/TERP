# MEET-066: Intake Flow Terminology Update

## Summary

This document tracks the terminology update from "Purchase" to "Intake" in the context of receiving products.

## Terminology Map

| Current Term        | New Term          | Context                                                        |
| ------------------- | ----------------- | -------------------------------------------------------------- |
| Purchase            | Intake            | Receiving product from supplier                                |
| Purchase Order      | Intake Order      | Before receiving (NOTE: Keep "Purchase Order" for PO workflow) |
| Purchase Receipt    | Intake Receipt    | After receiving                                                |
| New Purchase button | New Intake button | Action button on Inventory page                                |
| Purchase Date       | Intake Date       | Date product was received                                      |

## Important Distinction

- **"Purchase Orders"** - Remains unchanged. This refers to the PO workflow for ordering from suppliers.
- **"Intake"** - Used for the receiving/verification process when product arrives.

## Files Updated (Backend)

### Schema and Router (Tasks 2.C.1 and 2.C.2)

- `/home/user/TERP/drizzle/schema.ts` - Added intake_receipts, intake_receipt_items, intake_discrepancies tables
- `/home/user/TERP/server/routers/intakeReceipts.ts` - New router for intake verification workflow
- `/home/user/TERP/server/routers.ts` - Router registration

## Files Updated (Frontend - Task 2.C.3)

### Inventory Page

- `/home/user/TERP/client/src/pages/Inventory.tsx`
  - Line 533: "New Purchase" -> "New Intake" (button text)
  - Line 196: "Purchase Date" -> "Intake Date" (export column label)

### Purchase Modal (now Intake Modal)

- `/home/user/TERP/client/src/components/inventory/PurchaseModal.tsx`
  - Dialog title: "New Product Purchase" -> "New Product Intake"
  - Dialog description: Updated text
  - Toast messages: "purchase" -> "intake"

## Files That Should NOT Be Changed

These files use "purchase" in different contexts:

### Purchase Orders (PO Workflow)

- `/home/user/TERP/client/src/pages/PurchaseOrdersPage.tsx` - PO management (supplier ordering)
- `/home/user/TERP/client/src/components/clients/SupplierProfileSection.tsx` - Supplier PO history

### Client Purchase Behavior

- `/home/user/TERP/client/src/components/clients/PurchasePatternsWidget.tsx` - Client purchase history analysis

### VIP Portal / Live Shopping

- `/home/user/TERP/client/src/components/vip-portal/LiveShoppingSession.tsx` - "TO_PURCHASE" status for customer actions

### Vendor Supply

- `/home/user/TERP/client/src/pages/VendorSupplyPage.tsx` - "PURCHASED" status for vendor supply items

## Recommended Future Updates

The following could be updated in a future iteration for consistency:

1. **Component Renaming**
   - `PurchaseModal.tsx` -> `IntakeModal.tsx`
   - `showPurchaseModal` state -> `showIntakeModal`
   - `createPurchaseMutation` -> `createIntakeMutation`

2. **Navigation Item** (if needed)
   - Consider adding "Intake Verification" to navigation when the full intake verification UI is implemented

## Related Specs

- FEAT-008: Intake Verification System
- MEET-064: Intake Receipt Tool
- MEET-065: Verification Process
- MEET-066: Intake Flow Terminology (this document)

## Status

- [x] Backend schema updates (Task 2.C.1)
- [x] Backend router implementation (Task 2.C.2)
- [x] User-facing terminology updates (Task 2.C.3)
- [ ] Component file renaming (future iteration)

---

Created: 2026-01-13
Sprint: 2, Track C
