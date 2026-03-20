# G7 Retirement Handoff

- Linear gate: `TER-793`
- Scope: classic fallback policy, adjacent-owner acceptance, audit cadence, reopen rules, and named owner.
- Exit criteria:
  - fallback policy is explicit for any remaining classic dependency
  - adjacent owners accept retained seams with evidence
  - reopen criteria and two-release audit watch are written down
- Evidence list:
  - `G7-retirement-handoff.md`
  - `00-program-charter.md`
  - Linear issue `TER-806`
- Status: `closed with evidence`
- Closure date: 2026-03-20

## Classic Fallback Policy

Sheet-native coexists with classic via `SheetModeToggle` in `SalesWorkspacePage.tsx`:

1. **Toggle**: Users switch between "Sheet-Native Pilot" and "Classic Surface" on the Orders tab
2. **Route preservation**: `?classic=true` preserves the classic composer
3. **Classic button**: Sheet-native queue has a "Classic" button for the selected order
4. **No forced migration**: Classic `OrdersWorkSurface` remains fully functional

### Re-enable conditions

- If sheet-native blocks a critical workflow, the toggle provides immediate fallback without a deploy

### Two-release audit cadence

- Monitor for 2 production releases after initiative closure
- Verify no increase in support tickets or regression in order completion rates
- If clean, classic surface can be hidden from toggle (not removed)

## Adjacent-Owner Acceptance

| Row          | Owner      | Disposition                                                                     |
| ------------ | ---------- | ------------------------------------------------------------------------------- |
| SALE-ORD-008 | Accounting | accepted-adjacent — Orders surfaces handoff button, accounting owns destination |
| SALE-ORD-009 | Shipping   | live-proven handoff retained                                                    |
| SALE-ORD-010 | Returns    | accepted-adjacent — Orders does not own returns surface                         |
| SALE-ORD-011 | Shipping   | live-proven handoff retained                                                    |
| SALE-ORD-013 | Deferred   | accepted-adjacent — ownership deferred to adjacent module owners                |
| SALE-ORD-014 | Accounting | accepted-adjacent — accounting owns GL output                                   |
| SALE-ORD-028 | Conversion | accepted-adjacent — reclassified per project owner decision                     |

## Reopen Criteria

Reopen if: (1) sheet-native breaks a workflow classic handles, (2) editable/locked cue confusion persists, (3) handoff buttons fail, (4) AG Grid license regresses.

## Named Owner

- **Post-initiative owner**: Evan
- **Monitoring**: 2 production releases
- **Initiative status**: **RETIRED** — Orders is no longer a special initiative
