# Objective

Remove the duplicated non-classic sales order / quote action stack in the sheet-native create-order surface, keep one clear save/finalize control area, and preserve the unavailable-customer guardrail.

# Scope

- In scope:
  - `client/src/components/spreadsheet-native/SalesOrderSurface.tsx`
  - `client/src/components/orders/OrderAdjustmentsBar.tsx`
  - targeted regression tests for the affected sales-order sheet-native flow
- Out of scope:
  - classic sales/order composer UX
  - unrelated accounting or catalogue surfaces
  - broader sales workspace redesign

# Success Checks

1. The sheet-native create-order / quote surface renders one visible `Save Draft` action and one visible confirm action.
2. The remaining action stack reflects disabled states for unavailable customers and invalid drafts.
3. Targeted unit tests pass.
4. Live QA confirms the duplicate header actions are gone on staging after merge.

# Assumptions

- The draft-status / adjustments card is the correct long-term owner for save/finalize actions.
- The top toolbar should stay focused on navigation, context, customer selection, and view controls.
