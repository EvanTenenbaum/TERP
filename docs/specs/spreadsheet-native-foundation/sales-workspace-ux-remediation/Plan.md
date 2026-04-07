# Milestones

1. Build the roadmap from live/runtime/source truth.
2. QA the roadmap and rebuild it into atomic execution tasks.
3. Implement the first UI/UX remediation wave against the current in-tree worktree.
4. Verify the wave with targeted tests and browser-observable proof.

# Atomic Tasks

1. `UX-001` Route guard for malformed order-document deep links
   - Depends on: none
   - Owned paths:
     - `client/src/pages/SalesWorkspacePage.tsx`
     - `client/src/pages/SalesWorkspacePage.test.tsx`
   - UI outcome:
     - `/sales?tab=sales-sheets&surface=sheet-native&ordersView=document` no longer lands on Sales Catalogue.
   - Proof:
     - Vitest redirect assertion for the malformed URL
     - Regression assertion that the redirect target is the canonical sheet-native orders document path
2. `UX-002` Do-not-break guard for valid Sales Catalogue routes
   - Depends on: `UX-001`
   - Owned paths:
     - `client/src/pages/SalesWorkspacePage.tsx`
     - `client/src/pages/SalesWorkspacePage.test.tsx`
   - UI outcome:
     - Normal catalogue routes still mount the catalogue surface.
   - Proof:
     - Vitest assertion that a valid `tab=sales-sheets` route does not redirect
3. `UX-003` Create-order entry context inside the sheet-native order composer
   - Depends on: none
   - Owned paths:
     - `client/src/pages/OrderCreatorPage.tsx`
     - `client/src/pages/OrderCreatorPage.visibility.test.tsx`
   - UI outcome:
     - Users landing on the create-order tab see explicit “start a new order” framing instead of the generic document-sheet label.
   - Proof:
     - Vitest coverage for create-order-specific heading/copy
     - Vitest coverage that the generic orders-document framing remains intact for the queue/document route
4. `UX-004` Document shell context alignment for create-order vs orders queue entry
   - Depends on: `UX-003`
   - Owned paths:
     - `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
     - `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx`
   - UI outcome:
     - The document wrapper context matches how the user arrived, reducing queue-vs-create ambiguity.
   - Proof:
     - Vitest assertion for create-order entry context text
     - Vitest assertion that queue/document entry still exposes the expected navigation affordances
5. `UX-005` Normalize sheet/classic toggle active-state behavior
   - Depends on: none
   - Owned paths:
     - `client/src/components/spreadsheet-native/SheetModeToggle.tsx`
     - `client/src/components/spreadsheet-native/SheetModeToggle.test.tsx`
   - UI outcome:
     - Active mode is visually obvious and accessible in both directions.
   - Proof:
     - Vitest coverage for active/inactive variants
     - Vitest coverage for `aria-pressed` state
6. `UX-006` Mobile command-strip layout fix for the mode toggle
   - Depends on: `UX-005`
   - Owned paths:
     - `client/src/components/spreadsheet-native/SheetModeToggle.tsx`
     - `client/src/index.css`
   - UI outcome:
     - The mode toggle no longer clips or crowds the command strip on narrow screens.
   - Proof:
     - Local browser/mobile viewport screenshot or equivalent runtime evidence
     - CSS/class-level assertion where practical
7. `UX-007` Stronger mobile tab overflow cue
   - Depends on: none
   - Owned paths:
     - `client/src/components/layout/LinearWorkspaceShell.tsx`
     - `client/src/index.css`
   - UI outcome:
     - Hidden tabs remain discoverable without redesigning the tab system.
   - Proof:
     - Mobile runtime screenshot of the overflow cue
     - Visual confirmation that hidden tabs remain reachable by horizontal scroll
8. `UX-008` Verification closeout
   - Depends on: `UX-001` through `UX-007`
   - Owned paths:
     - tests and verification artifacts only
   - UI outcome:
     - The first remediation wave closes with proof rather than narrative.
   - Proof:
     - Targeted Vitest runs for changed files
     - `pnpm check`
     - `pnpm lint` and `pnpm build` unless blocked by unrelated existing worktree failures
     - Browser evidence for the touched UI flow when practical
9. `UX-009` Rename the user-facing create-order entry to “New Order”
   - Depends on: `UX-003`
   - Owned paths:
     - `client/src/pages/SalesWorkspacePage.tsx`
     - `client/src/pages/ConsolidatedWorkspaces.test.tsx`
     - `client/src/pages/Help.tsx`
     - `tests-e2e/comprehensive-staging.spec.ts`
   - UI outcome:
     - The sales workspace entry reads as an action-oriented “New Order” flow instead of the more ambiguous “Create Order.”
   - Proof:
     - Vitest coverage for the sales workspace tabs
     - Touched-file eslint on the updated page/test/doc files

# Waves

- Wave 1:
  - `UX-001`
  - `UX-002`
- Wave 2:
  - `UX-003`
  - `UX-004`
- Wave 3:
  - `UX-005`
  - `UX-006`
  - `UX-007`
- Wave 4:
  - `UX-008`
- Wave 5:
  - `UX-009`

# Dependencies

- The route canonicalization must land before browser proof on the malformed staging URL can be considered fixed.
- The create-order framing and wrapper context should move together so the tab/document combination does not send mixed signals.
- The toggle-state normalization should land before mobile layout proof so the screenshots reflect the final control treatment.

# Owned Paths

- `docs/specs/spreadsheet-native-foundation/sales-workspace-ux-remediation/*`
- `client/src/pages/SalesWorkspacePage.tsx`
- `client/src/pages/SalesWorkspacePage.test.tsx`
- `client/src/pages/OrderCreatorPage.tsx`
- `client/src/pages/OrderCreatorPage.visibility.test.tsx`
- `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
- `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx`
- `client/src/components/spreadsheet-native/SheetModeToggle.tsx`
- `client/src/components/spreadsheet-native/SheetModeToggle.test.tsx`
- `client/src/components/layout/LinearWorkspaceShell.tsx`
- `client/src/index.css`

# Verification Plan

- Route-level Vitest coverage for malformed and valid sales workspace URLs
- Order-composer Vitest coverage for create-order framing and wrapper context
- New toggle-state Vitest coverage for active styles and `aria-pressed`
- `pnpm check`
- `pnpm lint` and `pnpm build` if unrelated worktree failures do not block trustworthy signal
- Local or runtime browser evidence for the mobile command strip and tab overflow cue
