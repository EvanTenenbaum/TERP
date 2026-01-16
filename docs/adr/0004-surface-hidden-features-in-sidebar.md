# ADR-0004: Surface Hidden Features in Sidebar Navigation

**Status:** Proposed
**Date:** 2026-01-11
**Author:** Manus Agent
**Deciders:** Product Owner

## Context

During a comprehensive audit of the TERP application, 7 hidden features were discovered that exist in the codebase but are not accessible via the main sidebar navigation. Users must know direct URLs or Command Palette shortcuts to access these features, creating significant discoverability issues.

The hidden features identified were:
1. **Vendors** (`/vendors`) - Only accessible via direct URL
2. **Pick & Pack** (`/pick-pack`) - Only accessible via direct URL
3. **Todo Lists** (`/todos`) - Only accessible via Command Palette (T)
4. **Interest List** (`/interest-list`) - Only accessible via Command Palette
5. **Photography Queue** (`/photography`) - Only accessible via direct URL
6. **Matchmaking** (`/matchmaking`) - Accessible via Dashboard widget
7. **Analytics** (`/analytics`) - Accessible via Dashboard widget

This creates several problems:
- New users cannot discover these features
- Support burden increases with "where is X?" questions
- Feature adoption is artificially limited
- User workflows are disrupted by having to remember URLs

## Decision

We will add 5 of the 7 hidden features to the sidebar navigation:

| Feature | Sidebar Section | Rationale |
|---------|-----------------|-----------|
| Interest List | SALES (after Orders) | Core sales workflow for tracking client interests |
| Pick & Pack | SALES (after Interest List) | Core fulfillment workflow for warehouse staff |
| Photography | INVENTORY (after Batches) | Operational workflow for inventory team |
| Vendors | INVENTORY (after Purchase Orders) | Essential for purchasing decisions |
| Todo Lists | ADMIN (before Feature Flags) | Productivity feature for all users |

The remaining 2 features (Matchmaking, Analytics) will NOT be added because:
- They have adequate access via Dashboard widgets
- Adding them would create redundant navigation paths
- They are contextual features best accessed from their primary context

## Consequences

### Positive

- All core features discoverable within 2 clicks from any page
- Reduced support tickets asking "where is X feature?"
- Increased adoption of previously hidden features
- Consistent navigation experience for all users
- New users can explore full application capabilities

### Negative

- Sidebar becomes slightly longer (5 additional items)
- Users familiar with Command Palette shortcuts may not benefit
- Minor increase in visual complexity

### Neutral

- No changes to feature functionality
- No changes to URL structure
- Command Palette shortcuts remain available

## Alternatives Considered

### Alternative 1: Add All 7 Features to Sidebar

Add all hidden features including Matchmaking and Analytics.

**Rejected because:** Matchmaking and Analytics already have adequate access via Dashboard widgets. Adding them would create redundant navigation paths and increase sidebar length unnecessarily.

### Alternative 2: Create New "Operations" Section

Create a new sidebar section called "Operations" for Pick & Pack, Photography, and Todo Lists.

**Rejected because:** This would add a 5th top-level section, increasing cognitive load. The features fit naturally into existing sections based on their primary user personas.

### Alternative 3: Feature Flag All New Items

Put all new sidebar items behind feature flags for gradual rollout.

**Rejected because:** These features already exist and work. The issue is discoverability, not stability. Feature flags would delay the fix without benefit.

## Implementation Notes

Changes are made to `/client/src/config/navigation.ts`:

```typescript
// NAV-001: Added Interest List for tracking client product interests
{
  name: "Interest List",
  path: "/interest-list",
  icon: Heart,
  group: "sales",
  ariaLabel: "Track client product interests and convert to orders",
},
// NAV-002: Added Pick & Pack for order fulfillment workflow
{
  name: "Pick & Pack",
  path: "/pick-pack",
  icon: PackageOpen,
  group: "sales",
  ariaLabel: "Order fulfillment and packing workflow",
},
// NAV-003: Added Photography Queue for product photography workflow
{
  name: "Photography",
  path: "/photography",
  icon: Camera,
  group: "inventory",
  ariaLabel: "Product photography queue and workflow management",
},
// NAV-004: Added Vendors for vendor management and inventory visibility
{
  name: "Vendors",
  path: "/vendors",
  icon: Building2,
  group: "inventory",
  ariaLabel: "Vendor management with products and inventory",
},
// NAV-005: Added Todo Lists for task management
{
  name: "Todo Lists",
  path: "/todos",
  icon: CheckSquare,
  group: "admin",
  ariaLabel: "Personal task management and todo lists",
},
```

New Lucide icons imported:
- `Heart` - Interest List
- `PackageOpen` - Pick & Pack
- `Camera` - Photography
- `Building2` - Vendors
- `CheckSquare` - Todo Lists

## Related Decisions

- [FEAT-017](./0003-drizzle-orm-selection.md) - Feature Flags direct access (similar pattern)
- [UX-010] - System Settings rename (navigation clarity precedent)

## References

- [Hidden Features Investigation Report](/terp-quickref/hidden_features_investigation.md)
- [TERP Navigation Roadmap](/terp-quickref/TERP_Navigation_Roadmap.md)
