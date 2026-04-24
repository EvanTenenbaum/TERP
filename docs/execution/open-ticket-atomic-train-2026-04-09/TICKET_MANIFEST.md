# April 9 Ticket Manifest

This manifest is the flat index for all 48 tickets created on April 9, 2026.

## Foundation

- `TER-1092` [UI-F1] Create canonical status→badge-variant map
- `TER-1093` [UI-F2] Create operational empty state component
- `TER-1094` [UI-F3] Improve workspace transition skeleton
- `TER-1095` [UI-F4] Audit and fix all `variant="default"` on operational status badges
- `TER-1096` [UI-F5] Audit and fix generic empty states
- `TER-1097` [UI-F6] Audit for raw ISO timestamp display

## Shell And Header

- `TER-1098` [UI-H1] Strengthen AppHeader visual zone separation
- `TER-1099` [UI-H2] Strengthen LinearWorkspaceShell title/description hierarchy

## Workspace Population

- `TER-1100` [UI-W1] Sales workspace: populate description
- `TER-1101` [UI-W2] Sales workspace: add meta items
- `TER-1102` [UI-W3] Inventory workspace: add meta items
- `TER-1103` [UI-W4] Procurement workspace: add meta items
- `TER-1104` [UI-W5] Procurement workspace: add commandStrip
- `TER-1105` [UI-W6] Relationships workspace: add commandStrip
- `TER-1106` [UI-W7] Accounting workspace: replace meta with operational content
- `TER-1107` [UI-W8] Accounting workspace: add commandStrip
- `TER-1108` [UI-W9] Verify/fix tab context preservation on workspace return

## Sales And Orders

- `TER-1109` [UI-SO1] Wire badge map into OrdersWorkSurface payment status badges
- `TER-1110` [UI-SO2] Add overdue/blocked row-level visual distinction
- `TER-1111` [UI-SO3] Consolidate inspector Quick Actions into primary + overflow
- `TER-1112` [UI-SO4] Add Due Date column and verify orders table columns at 1280px
- `TER-1113` [UI-SO5] Set default sort to prioritize actionable orders

## Inventory

- `TER-1114` [UI-IV1] Add exception indicator to inventory view
- `TER-1115` [UI-IV2] Couple summary/status bar to active tab state
- `TER-1116` [UI-IV3] Verify intake rows show direct vs PO-linked distinction
- `TER-1117` [UI-IV4] Verify classic/sheet-native modes not both visible

## Procurement

- `TER-1118` [UI-PR1] Make ETA column always visible in PO table
- `TER-1119` [UI-PR2] Add receiving status column to PO table
- `TER-1120` [UI-PR3] Add overdue PO row-level visual distinction
- `TER-1121` [UI-PR4] Handle redirect tabs visibly in Procurement workspace

## Relationships

- `TER-1122` [UI-RP1] Fix ClientProfilePage role badges to use semantic colors
- `TER-1123` [UI-RP2] Add "last activity" column to client table
- `TER-1124` [UI-RP3] Add "status" column to client table
- `TER-1125` [UI-RP4] Verify scroll/filter preservation on table→profile navigation

## Accounting

- `TER-1126` [UI-AC1] Add financial period to workspace header meta
- `TER-1127` [UI-AC2] Replace plain-text loading states with table-shaped skeletons
- `TER-1128` [UI-AC3] Verify summary dashboard cards reflect active filters

## Notifications

- `TER-1129` [UI-NT1] Split notifications into FYI vs needs-action categories
- `TER-1130` [UI-NT2] Strengthen unread notification row visual distinction
- `TER-1131` [UI-NT3] Differentiate urgent/exception notifications visually
- `TER-1132` [UI-NT4] Add inline "mark read" button per notification row
- `TER-1133` [UI-NT5] Add contextual empty states per notification category

## Cross-Cutting Audits

- `TER-1134` [UI-XA1] Audit column header / row prefix duplication
- `TER-1135` [UI-XA2] Verify page title is visually dominant on all workspace pages
- `TER-1136` [UI-XA3] Verify primary action columns visible at 1280px
- `TER-1137` [UI-XA4] Verify cross-module contextual links exist
- `TER-1138` [UI-XA5] Verify key workflows reachable in ≤3 clicks
- `TER-1139` [UI-XA6] Verify workflow confirmations exist

## Explicit Dependencies

- `TER-1095` blocked by `TER-1092`
- `TER-1096` blocked by `TER-1093`
- `TER-1109` blocked by `TER-1092`
