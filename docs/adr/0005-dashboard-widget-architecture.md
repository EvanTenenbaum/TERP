# ADR-0005: Dashboard Widget Architecture

**Status**: Accepted
**Date**: 2026-03-05
**Decision Makers**: Evan Tenenbaum, Engineering Team
**Context**: Session B / S4 — Owner Command Center evolution

## Context

The Owner Command Center Dashboard has grown from 6 widgets to 9+ with the addition of appointments, SKU status browser, and price-bracket grouping. Each widget follows a consistent but undocumented pattern. As we add more widgets, we need explicit architecture guidance to prevent inconsistency and technical debt.

## Decision

### Widget Component Pattern (MANDATORY)

Every dashboard widget MUST follow this structure:

```tsx
export const OwnerXxxWidget = memo(function OwnerXxxWidget() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = trpc.router.procedure.useQuery(
    args,
    { refetchInterval: 60000 } // 1-minute refresh
  );

  if (error) return <Card><EmptyState variant="xxx" ... /></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plain-Language Title</CardTitle>
        <p className="text-xs text-muted-foreground">Contextual subtitle</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton /> : <ActualContent />}
      </CardContent>
    </Card>
  );
});
```

### Key Architectural Rules

1. **One query per widget** — each widget owns its own data fetching. No prop-drilling data from the dashboard page.
2. **`memo()` wrapping** — all widgets use `React.memo` to prevent re-renders when sibling widgets update.
3. **60-second refetch** — all queries use `refetchInterval: 60000` for live data without overwhelming the API.
4. **Plain-language copy** — every metric should have a human-readable summary, not just a raw number.
5. **Action CTAs** — each widget should provide a clear next step (link to relevant page).
6. **3-state rendering** — loading (Skeleton), error (EmptyState), data (actual content).
7. **No shared state** — widgets are fully independent. Dashboard page is layout-only.

### Grid Layout Strategy

The dashboard uses a 12-column CSS Grid (`grid-cols-1 lg:grid-cols-12`) with 3 conceptual rows:

| Row | Purpose          | Widgets                                          | Priority                             |
| --- | ---------------- | ------------------------------------------------ | ------------------------------------ |
| 1   | Daily Pulse      | Today at a Glance, Appointments, Cash Position   | Shows what needs attention RIGHT NOW |
| 2   | Money Flow       | Money In vs. Out, Suppliers Waiting, Quick Cards | Financial health overview            |
| 3   | Inventory Health | What's In Stock, SKU Status, Price Brackets      | Stock-level monitoring               |

### Widget Sizing

- **Primary widgets**: `lg:col-span-5` (wider, more data)
- **Secondary widgets**: `lg:col-span-4` (medium)
- **Compact widgets**: `lg:col-span-3` (summary only)

### Adding New Widgets

1. Create component in `client/src/components/dashboard/owner/`
2. Follow the pattern above (memo, query, 3-state rendering)
3. Import and place in `OwnerCommandCenterDashboard.tsx`
4. Use existing tRPC endpoints — create new ones only if no suitable query exists
5. Include plain-language summary text, not just numbers

## Alternatives Considered

1. **Shared data fetching at dashboard level** — Rejected. Widget independence is more maintainable and allows lazy loading.
2. **WidgetContainer wrapper component** — Exists (`DashboardGrid.tsx`, `WidgetContainer.tsx`) but is NOT used by owner widgets. The overhead of abstracting Card/CardHeader isn't worth it for 9 widgets.
3. **Server-sent events for real-time updates** — Deferred. 60-second polling is sufficient for owner dashboard use cases.

## Consequences

- Positive: Consistent widget behavior, easy to add new widgets, no coordination needed between widgets
- Positive: Plain-language copy makes dashboard useful for non-technical users
- Negative: Each widget makes its own API call (9 queries on page load). Acceptable for owner dashboard with ~1 concurrent user.
- Negative: No shared data means some information is fetched multiple times (e.g., inventory counts). Acceptable tradeoff for independence.
