# April 9 Ticket Roadmap

## Current Truth

- Safe execution base: latest `origin/main` in `/Users/evan/spec-erp-docker/TERP/worktrees/open-ticket-atomic-train-20260409`
- Base commit: `f1a1abb2`
- Dirty primary checkout prevented a direct pull or rebase in place
- Canonical in-scope set is all 48 tickets created on April 9, 2026: `TER-1092` through `TER-1139`
- Current implemented tranche: notifications cluster (`TER-1129` through `TER-1133`)

## Scope Correction

Earlier planning narrowed to the still-open subset created on April 9, 2026. The correct scope for this run is broader: all 48 tickets created that day, including:

- foundation tickets that create shared primitives
- tickets already completed that still need to remain in the dependency map
- later tickets blocked by those shared primitives

## Canonical Execution Order

1. Foundation
2. Shell and header
3. Workspace population
4. Notifications
5. Sales and orders
6. Inventory
7. Procurement
8. Relationships
9. Accounting
10. Cross-cutting audits

This is the right order because the foundation tickets create shared status, empty-state, and skeleton primitives that later tickets depend on directly.

## Dependency Map

- `TER-1095` (`UI-F4`) depends on `TER-1092` (`UI-F1`)
- `TER-1096` (`UI-F5`) depends on `TER-1093` (`UI-F2`)
- `TER-1109` (`UI-SO1`) depends on `TER-1092` (`UI-F1`)

Execution rule:
- Do not call later badge-standardization or empty-state audit work complete until the foundation primitives exist and the downstream surfaces are actually wired to them.

## Train Breakdown

### Train 0: Foundation

Tickets:
- `TER-1092` `[UI-F1]` Create canonical status to badge-variant map
- `TER-1093` `[UI-F2]` Create operational empty state component
- `TER-1094` `[UI-F3]` Improve workspace transition skeleton
- `TER-1095` `[UI-F4]` Audit and fix all `variant="default"` on operational status badges
- `TER-1096` `[UI-F5]` Audit and fix generic empty states
- `TER-1097` `[UI-F6]` Audit for raw ISO timestamp display

Why first:
- creates the shared primitives and audit baseline for later clusters
- removes repeated reinvention across status, empty, and loading states

### Train 1: Shell And Header

Tickets:
- `TER-1098` `[UI-H1]` Strengthen `AppHeader` visual zone separation
- `TER-1099` `[UI-H2]` Strengthen `LinearWorkspaceShell` title and description hierarchy

Why second:
- shared shell polish affects every workspace and should settle before workspace-specific population work

### Train 2: Workspace Population

Tickets:
- `TER-1100` `[UI-W1]` Sales workspace description
- `TER-1101` `[UI-W2]` Sales workspace meta items
- `TER-1102` `[UI-W3]` Inventory workspace meta items
- `TER-1103` `[UI-W4]` Procurement workspace meta items
- `TER-1104` `[UI-W5]` Procurement workspace command strip
- `TER-1105` `[UI-W6]` Relationships workspace command strip
- `TER-1106` `[UI-W7]` Accounting workspace operational meta
- `TER-1107` `[UI-W8]` Accounting workspace command strip
- `TER-1108` `[UI-W9]` Verify or fix tab context preservation on workspace return

Why third:
- fills out the shared shell once hierarchy and layout are settled

### Train 3: Notifications

Tickets:
- `TER-1129` `[UI-NT1]`
- `TER-1130` `[UI-NT2]`
- `TER-1131` `[UI-NT3]`
- `TER-1132` `[UI-NT4]`
- `TER-1133` `[UI-NT5]`

Status:
- implemented locally

What landed:
- FYI vs needs-action grouping
- stronger unread distinction
- urgent and exception row tinting
- inline mark-read action
- contextual empty-state copy
- fixed the pre-existing broken `group-hover` affordance

Proof:
- `pnpm vitest run client/src/components/notifications/InlineNotificationPanel.test.tsx client/src/components/notifications/NotificationBell.test.tsx client/src/pages/NotificationsPage.test.tsx`
- `pnpm check`
- `pnpm build`

### Train 4: Sales And Orders

Tickets:
- `TER-1109` `[UI-SO1]`
- `TER-1110` `[UI-SO2]`
- `TER-1111` `[UI-SO3]`
- `TER-1112` `[UI-SO4]`
- `TER-1113` `[UI-SO5]`

Notes:
- `TER-1109` is blocked on `TER-1092`

### Train 5: Inventory

Tickets:
- `TER-1114` `[UI-IV1]`
- `TER-1115` `[UI-IV2]`
- `TER-1116` `[UI-IV3]`
- `TER-1117` `[UI-IV4]`

### Train 6: Procurement

Tickets:
- `TER-1118` `[UI-PR1]`
- `TER-1119` `[UI-PR2]`
- `TER-1120` `[UI-PR3]`
- `TER-1121` `[UI-PR4]`

### Train 7: Relationships

Tickets:
- `TER-1122` `[UI-RP1]`
- `TER-1123` `[UI-RP2]`
- `TER-1124` `[UI-RP3]`
- `TER-1125` `[UI-RP4]`

### Train 8: Accounting

Tickets:
- `TER-1126` `[UI-AC1]`
- `TER-1127` `[UI-AC2]`
- `TER-1128` `[UI-AC3]`

### Train 9: Cross-Cutting Audits

Tickets:
- `TER-1134` `[UI-XA1]`
- `TER-1135` `[UI-XA2]`
- `TER-1136` `[UI-XA3]`
- `TER-1137` `[UI-XA4]`
- `TER-1138` `[UI-XA5]`
- `TER-1139` `[UI-XA6]`

Why last:
- these are broad validation tickets that should verify the underlying work after the concrete clusters land

## Ticket Coverage Checklist

All 48 tickets are covered in this roadmap:

- Foundation: `TER-1092` to `TER-1097`
- Shell and header: `TER-1098` to `TER-1099`
- Workspace population: `TER-1100` to `TER-1108`
- Sales and orders: `TER-1109` to `TER-1113`
- Inventory: `TER-1114` to `TER-1117`
- Procurement: `TER-1118` to `TER-1121`
- Relationships: `TER-1122` to `TER-1125`
- Accounting: `TER-1126` to `TER-1128`
- Notifications: `TER-1129` to `TER-1133`
- Cross-cutting audits: `TER-1134` to `TER-1139`

## Updated Next Wave

The next implementation wave should not start with relationships anymore. It should start with Foundation:

- `TER-1092`
- `TER-1093`
- `TER-1094`

Then:
- `TER-1095`
- `TER-1096`
- `TER-1097`

Reason:
- this is the dependency-safe order
- later tickets rely on these shared patterns
- it prevents rework in sales, procurement, and cross-cutting audits

## Train Gates

### Entry Gate For Any Train

- The ticket is in the April 9, 2026 set
- Dependencies are satisfied or explicitly handled in the same tranche
- Owned paths do not collide with already-active work
- The proof plan is explicit before coding begins

### Exit Gate For Any Train

- Implementation exists on the real runtime path
- Targeted verification is green or the blocker is explicit
- Browser proof exists for user-facing changes when the ticket is browser-facing
- Tracker state can be updated from evidence, not code existence alone

## Future Adversarial Review Rubric

When a bounded tranche is complete, score each implemented task out of 100 using the same rubric:

- 30 points: request coverage and behavior correctness
- 20 points: proof quality and reproducibility
- 20 points: regression resistance and negative-path handling
- 15 points: wiring into real runtime paths
- 15 points: UX and operator clarity on the changed surface

Promotion rule:
- below 85: not ready, requires another implementation pass
- 85 to 94: functionally solid but not yet at the requested bar
- 95 plus: acceptable final target for this run
