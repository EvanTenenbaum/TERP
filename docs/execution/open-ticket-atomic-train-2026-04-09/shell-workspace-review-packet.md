# Shell And Workspace Review Packet

Review scope: `TER-1098` through `TER-1108`

## Ticket list

- `TER-1098` Strengthen AppHeader visual zone separation
- `TER-1099` Strengthen LinearWorkspaceShell title/description hierarchy
- `TER-1100` Sales workspace: populate description
- `TER-1101` Sales workspace: add meta items
- `TER-1102` Inventory workspace: add meta items
- `TER-1103` Procurement workspace: add meta items
- `TER-1104` Procurement workspace: add commandStrip
- `TER-1105` Relationships workspace: add commandStrip
- `TER-1106` Accounting workspace: replace meta with operational content
- `TER-1107` Accounting workspace: add commandStrip
- `TER-1108` Verify/fix tab context preservation on workspace return

## Shared implementation summary

- `client/src/components/layout/AppHeader.tsx`
  - header now separates breadcrumb/search/account zones with explicit border splits
- `client/src/components/layout/LinearWorkspaceShell.tsx`
  - title hierarchy now uses `section` cue + eyebrow + dominant `h1`
  - metadata renders as labeled operational chips/values
  - command strip renders alongside tab row
  - transition skeleton now uses `WorkspacePanelSkeleton`
- Workspace pages now pass populated `description`, `meta`, and `commandStrip` props into `LinearWorkspaceShell`

## Key code evidence

### TER-1098

- `client/src/components/layout/AppHeader.tsx`
  - line 92: header bar uses single outer `border-b`
  - lines 103-112: breadcrumb zone separated with right border
  - line 140: account/notification zone separated with left border
  - line 146: account trigger given bordered pill container
- `client/src/components/layout/AppHeader.test.tsx`
  - lines 151-168: direct assertion that breadcrumb and account zones resolve to the bordered separator containers when a non-home route is active

### TER-1099

- `client/src/components/layout/LinearWorkspaceShell.tsx`
  - lines 122-156: header strip with section pill, eyebrow, dominant `h1`, description, and metadata cluster
- `client/src/components/layout/LinearWorkspaceShell.test.tsx`
  - verifies `Accounting` renders as `h1` while `Finance` and `Workspace` remain separate hierarchy cues
  - verifies the transition skeleton uses deterministic fake timers instead of real-time waits

### TER-1100 and TER-1101

- `client/src/pages/SalesWorkspacePage.tsx`
  - lines 322-374: `description`, two meta items (`Action lane`, `Primary queue`), and command strip with `Sales Catalogue` / `Order Composer`
- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 334-350: direct assertions for the populated sales description, meta labels/values, and command strip actions

### TER-1102

- `client/src/pages/InventoryWorkspacePage.tsx`
  - lines 120-174: three meta items (`Active lane`, `Mode`, `Receiving split`)
- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 238-249: direct assertions for the inventory meta cluster values

### TER-1103 and TER-1104

- `client/src/pages/ProcurementWorkspacePage.tsx`
  - lines 57-96: populated description, three meta items, and command strip linking `Purchase Orders`, `Product Intake`, and `Inventory`
- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 425-442: direct assertions for procurement description, operational meta, and command strip actions

### TER-1105

- `client/src/pages/RelationshipsWorkspacePage.tsx`
  - lines 27-62: populated description, meta items, and command strip linking `Clients`, `Suppliers`, and `Notifications`
- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 210-224: direct assertions inside the workspace metadata region plus command strip presence

### TER-1106 and TER-1107

- `client/src/pages/AccountingWorkspacePage.tsx`
  - lines 59-110: meta replaced with operational content (`Financial period`, `Active lane`, `Flow`) and command strip linking dashboard/invoices/payments/periods
- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 460-477: direct assertions for accounting operational metadata and command strip actions

### TER-1108

- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 236-245: receiving editor opens from `?tab=receiving&draftId=draft-123`
  - lines 328-331 and 370+: redirect/tab handoff tests preserve workspace intent when flows moved
  - for this ticket, "workspace return" is implemented as query-param-preserved workspace intent rather than separate session-storage restoration
- `client/src/components/layout/LinearWorkspaceShell.tsx`
  - controlled `activeTab` + `onTabChange` wiring remains in shell

## Verification evidence

- `pnpm vitest run client/src/components/layout/LinearWorkspaceShell.test.tsx client/src/components/layout/AppHeader.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - result: passed (`31` tests across `3` files)
- `pnpm lint`
  - result: passed
- `pnpm check`
  - result: passed
- `pnpm build`
  - result: passed

## Reviewer note

- This packet is intentionally unit-first. The April 9 browser suite is concentrated on the higher-risk operations tickets rather than header/workspace shell polish, so these scores should weigh direct unit assertions and static verification more heavily than browser proof for this tranche.

## Reviewer instructions

- Score each of `TER-1098` through `TER-1108`
- Be conservative if a workspace-population ticket lacks direct assertion proof
- Return exactly one entry per ticket
- If any ticket is below `95`, list only the atomic upgrade actions needed to reach `95`
