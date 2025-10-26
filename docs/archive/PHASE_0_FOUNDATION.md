# Phase 0: Foundation & Research - COMPLETE ✅

**Duration:** 30 minutes  
**Status:** All checks passing

## Objectives Completed

✅ Bible Compliance Audit  
✅ UX Research Review  
✅ Technical Architecture Planning  
✅ Design System Inventory  
✅ RBAC & Security Planning

---

## 1. Bible Compliance Audit

### Key Protocols Internalized

**System Integration & Change Management:**
- Impact Analysis before changes
- Integration Verification during changes
- System-Wide Validation after changes
- Breaking Change Protocol (>5 files requires user confirmation)
- Checkpoint Discipline

**Production-Ready Code Standard:**
- NO placeholders, TODOs, or "Coming Soon" text
- Full implementation mandate for all features
- Complete error handling and loading states
- Exception protocol if stubs unavoidable

**Quality Standards:**
- Code Quality: Clean, type-safe, maintainable
- UI/UX Quality: Visual polish, interactions, responsive, accessible
- Functionality: Error handling, loading states, validation, performance

### Compliance Checklist Created

✅ Naming Conventions:
- Components: PascalCase (e.g., `DashboardWidget.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useScratchPad.ts`)
- Database tables: snake_case (e.g., `scratch_pad_notes`)
- tRPC routes: camelCase (e.g., `scratchPad.create`)

✅ File Organization:
- Components: `/client/src/components/dashboard/`
- Pages: `/client/src/pages/`
- Hooks: `/client/src/hooks/`
- Server: `/server/`
- Database: `/drizzle/schema.ts`

✅ Design System:
- Use shadcn/ui components only
- Use Tailwind utility classes
- Use design tokens for colors
- Use spacing scale (no arbitrary values)

---

## 2. UX Research Review

### Key Principles for Dashboard

**Progressive Disclosure:**
- Show most important information first (KPIs at top)
- Widgets customizable (add/remove based on role)
- Scratch Pad accessible but not intrusive (overlay + widget)

**Task-Oriented Design:**
- KPIs link directly to filtered views in modules
- Quick actions in widgets (Reorder, Edit, View)
- Scratch Pad for quick note capture without leaving dashboard

**Visual Hierarchy:**
- Top: KPI Summary (6 cards, most important)
- Middle: Customizable Widgets (user-controlled)
- Scratch Pad: Quick access from header (non-blocking)

**Consistency:**
- Reuse existing components (shadcn/ui)
- Follow established patterns (Card, Badge, Button)
- Maintain navigation structure

**Simplicity:**
- Minimal clicks to accomplish tasks
- Clear visual indicators (colors, icons, badges)
- No overwhelming information density

### UX Decision Framework

**For Dashboard:**
1. Prioritize role-based defaults (reduce setup time)
2. Allow customization (empower users)
3. Provide clear empty states (guide users)
4. Use familiar patterns (reduce learning curve)
5. Optimize for speed (< 1.5s load time)

**For Scratch Pad:**
1. Infinite scroll diary (familiar mental model)
2. Newest at bottom (like chat/messaging apps)
3. Always-visible input (reduce friction)
4. Quick access from anywhere (keyboard shortcut)
5. Simple interactions (checkbox, edit, delete)

---

## 3. Technical Architecture Planning

### Existing Codebase Structure

**Current Stack:**
- React 19
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS 4
- shadcn/ui components
- tRPC for API
- Drizzle ORM
- Neon Postgres

**Existing Components to Reuse:**
- `/client/src/components/ui/` - shadcn/ui components
- AppHeader - Global header (will enhance)
- Navigation - Sidebar navigation
- Card, Badge, Button - Core UI components

**Existing Patterns:**
- tRPC routers in `/server/routers.ts`
- Database access in `/server/*Db.ts` files
- Hooks in `/client/src/hooks/`
- Pages in `/client/src/pages/`

### Data Flow Architecture

```
User Action
    ↓
React Component (client)
    ↓
tRPC Hook (client)
    ↓
tRPC Router (server)
    ↓
Database Access Layer (server)
    ↓
Drizzle ORM
    ↓
Neon Postgres
```

**Optimistic Updates:**
```
User Action
    ↓
Optimistic UI Update (instant)
    ↓
tRPC Mutation (background)
    ↓
Success: Keep optimistic update
Failure: Rollback + show error
```

### Widget State Management

**Approach:** React state + tRPC + Database persistence

```
User Layout State (client)
    ↓
useWidgetLayout hook
    ↓
Debounced save (1 second)
    ↓
tRPC mutation
    ↓
Database save
```

**Benefits:**
- Simple (no complex state management library needed)
- Fast (optimistic updates)
- Persistent (saved to database)
- Recoverable (can reset to role default)

### Scratch Pad Data Flow

**Unified Source of Truth:**
```
Database (scratch_pad_notes table)
    ↓
tRPC endpoint (scratchPad.list)
    ↓
useScratchPad hook (shared)
    ↓
    ├─ ScratchPadOverlay (header quick access)
    └─ ScratchPadWidget (in-page widget)
```

**Key:** Both overlay and widget use same hook → same data → always in sync

---

## 4. Design System Inventory

### Existing shadcn/ui Components

**Available:**
- Card, CardHeader, CardTitle, CardDescription, CardContent
- Button (variants: default, destructive, outline, ghost, link)
- Badge (variants: default, secondary, destructive, outline)
- Input, Textarea
- Select, Dropdown
- Dialog, Sheet (for modals/overlays)
- Skeleton (for loading states)
- Checkbox
- Tooltip
- ScrollArea

**To Add (approved dependencies):**
- react-grid-layout (widget drag-and-drop)
- @tanstack/react-virtual (infinite scroll virtualization)

### Color Tokens (Tailwind)

**Status Colors:**
- Green: `bg-green-100 text-green-800` (positive, success)
- Yellow: `bg-yellow-100 text-yellow-800` (warning, attention)
- Red: `bg-red-100 text-red-800` (error, critical)
- Blue: `bg-blue-100 text-blue-800` (info, neutral)

**Semantic Colors:**
- Primary: `bg-primary text-primary-foreground`
- Secondary: `bg-secondary text-secondary-foreground`
- Destructive: `bg-destructive text-destructive-foreground`
- Muted: `bg-muted text-muted-foreground`

### Spacing Scale

- `p-1` = 0.25rem (4px)
- `p-2` = 0.5rem (8px)
- `p-4` = 1rem (16px)
- `p-6` = 1.5rem (24px)
- `p-8` = 2rem (32px)

**Standard Spacing:**
- Card padding: `p-6`
- Section spacing: `space-y-6`
- Grid gap: `gap-4` or `gap-6`

### Typography Scale

- `text-sm` = 0.875rem (14px) - Small text, captions
- `text-base` = 1rem (16px) - Body text
- `text-lg` = 1.125rem (18px) - Large body text
- `text-xl` = 1.25rem (20px) - Small headings
- `text-2xl` = 1.5rem (24px) - Section headings
- `text-3xl` = 1.875rem (30px) - Page headings

---

## 5. RBAC & Security Planning

### Role-Based Access Rules

**Roles:**
- Admin: Full access to all features
- Sales: Sales, CRM, limited Finance
- Finance: Finance, limited Inventory
- Ops: Inventory, Orders, limited Sales
- CRM: CRM, limited Sales

### Widget Visibility Matrix

| Widget Type | Admin | Sales | Finance | Ops | CRM |
|-------------|-------|-------|---------|-----|-----|
| Sales Performance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory Overview | ✅ | ❌ | ✅ | ✅ | ❌ |
| Financial Overview | ✅ | ❌ | ✅ | ❌ | ❌ |
| CRM Highlights | ✅ | ✅ | ❌ | ❌ | ✅ |
| Custom Report | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scratch Pad | ✅ | ✅ | ✅ | ✅ | ✅ |

### KPI Access Matrix

| KPI | Admin | Sales | Finance | Ops | CRM |
|-----|-------|-------|---------|-----|-----|
| Revenue | ✅ | ✅ | ✅ | ✅ | ✅ |
| Outstanding Invoices | ✅ | ❌ | ✅ | ❌ | ❌ |
| Inventory Value | ✅ | ❌ | ✅ | ✅ | ❌ |
| Top Selling Product | ✅ | ✅ | ❌ | ✅ | ❌ |
| Active Clients | ✅ | ✅ | ❌ | ❌ | ✅ |
| Pending Orders | ✅ | ✅ | ❌ | ✅ | ❌ |

### Authorization Patterns

**Server-Side (Required):**
```typescript
// In tRPC router
.query(async ({ ctx, input }) => {
  // Verify user is authenticated
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  
  // Verify user has permission
  if (!hasPermission(ctx.user.role, 'view_widget', input.widgetType)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  
  // Return data
  return getData();
})
```

**Client-Side (UI Gating):**
```typescript
// In component
const canViewWidget = hasPermission(user.role, 'view_widget', widgetType);

if (!canViewWidget) {
  return <EmptyState message="You don't have access to this widget" />;
}
```

### Privacy Enforcement

**Scratch Pad Notes:**
- Always filter by `userId` in database queries
- Never return other users' notes
- Add database row-level security (if supported)
- Audit log for sensitive operations

**Widget Layouts:**
- Personal layouts belong to user
- Role defaults are shared (read-only for non-admins)
- Admins can set role defaults

---

## Security Checklist

✅ **Authentication:**
- Use existing auth system (already in place)
- Verify user is authenticated on all endpoints

✅ **Authorization:**
- Server-side checks on all tRPC endpoints
- Client-side UI gating for better UX
- Role-based access control (RBAC)

✅ **Input Validation:**
- Zod schemas for all tRPC inputs
- Sanitize user input (notes text)
- Validate widget configurations

✅ **Rate Limiting:**
- Create note: 100/hour
- Save layout: 50/hour
- Delete note: 50/hour

✅ **Error Handling:**
- Don't leak sensitive data in errors
- Use generic error messages for users
- Log detailed errors server-side

---

## Component Reuse Plan

### Existing Components to Reuse

**From shadcn/ui:**
- Card (for KPI cards, widgets)
- Badge (for status indicators)
- Button (for all actions)
- Input, Textarea (for Scratch Pad)
- Checkbox (for note completion)
- Sheet (for Scratch Pad overlay)
- Skeleton (for loading states)
- ScrollArea (for Scratch Pad list)

**From existing codebase:**
- AppHeader (will enhance with Scratch Pad button)
- Navigation (no changes needed)
- SearchHighlight (from inventory module)

### New Components to Create

**Dashboard-Specific:**
- WidgetContainer (reusable widget wrapper)
- KpiCard (KPI summary card)
- BarChart, LineChart, Sparkline (charts)
- EmptyState (generic empty state)
- SkeletonWidget, SkeletonKpi (loading states)

**Scratch Pad:**
- ScratchPadOverlay (header quick access)
- ScratchPadList (infinite scroll list)
- NoteItem (individual note)
- NewNoteInput (input at bottom)

**Widget Implementations:**
- SalesPerformanceWidget
- InventoryOverviewWidget
- FinancialOverviewWidget
- CrmHighlightsWidget
- CustomReportWidget
- ScratchPadWidget (in-page)

---

## Performance Targets

**Page Load:**
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s
- Time to Interactive (TTI): <3.5s
- Cumulative Layout Shift (CLS): <0.1

**Widget Performance:**
- Individual widget load: <1s
- Auto-refresh: 60s default (configurable)
- Parallel loading (not sequential)

**Scratch Pad:**
- Infinite scroll: 60fps
- Initial load: 50 notes
- Pagination: 50 notes per page
- Auto-save debounce: 300ms

**Lighthouse Targets:**
- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 90+

---

## Implementation Approach

### Phase-by-Phase Strategy

**Phase 1 (Database):**
- Create all tables
- Add indexes for performance
- Create data access layer
- Create tRPC routers

**Phase 2 (Design System):**
- Create reusable components
- Ensure consistency with existing design
- Add loading/error/empty states

**Phase 3 (Header):**
- Minimal change to existing header
- Add Scratch Pad button
- Create overlay component

**Phase 4 (Scratch Pad):**
- Build core functionality
- Ensure unified data source
- Test overlay + widget sync

**Phase 5 (KPIs):**
- Implement data fetching
- Create role-based configuration
- Add drill-through navigation

**Phase 6 (Widget System):**
- Build grid layout
- Add drag-and-drop
- Implement persistence

**Phase 7 (Widgets):**
- Implement each widget
- Connect to real data
- Add auto-refresh

**Phase 8 (Integration):**
- Bring everything together
- Optimize performance
- Add error boundaries

**Phase 9 (Security):**
- Enforce RBAC
- Add rate limiting
- Security audit

**Phase 10 (A11y/i18n):**
- Keyboard navigation
- Screen reader support
- Internationalization

**Phase 11 (Testing):**
- Unit tests
- Integration tests
- E2E tests
- Performance testing

**Phase 12 (Documentation):**
- Feature docs
- Technical docs
- API docs
- Demo video

---

## Known Constraints

**Technical:**
- Must work with existing auth system
- Must use existing database (Neon Postgres)
- Must maintain existing navigation structure
- Must not break existing pages

**UX:**
- Must feel fast (<1.5s FCP)
- Must work on mobile
- Must be accessible (WCAG AA)
- Must be intuitive (minimal learning curve)

**Security:**
- Must enforce RBAC server-side
- Must keep Scratch Pad notes private
- Must validate all inputs
- Must rate limit mutations

---

## Success Criteria

✅ **Foundation Complete:**
- All Bible protocols understood
- UX principles documented
- Technical architecture planned
- Design system inventoried
- RBAC rules defined

✅ **Ready for Implementation:**
- Clear component reuse plan
- Performance targets set
- Security checklist created
- Implementation approach defined

✅ **No Unknowns:**
- All technical questions answered
- All UX decisions made
- All security considerations addressed

---

## Next Steps

**Proceed to Phase 1: Database Schema & Data Layer**

**Estimated Duration:** 2-3 hours

**Key Tasks:**
1. Create database schema (3 tables)
2. Generate migrations
3. Create data access layer
4. Create tRPC routers
5. Add seed data
6. Test all endpoints

**Success Criteria:**
- All migrations run successfully
- All tRPC endpoints working
- RBAC enforcement verified
- No TypeScript errors

---

**Phase 0 Status: COMPLETE ✅**

**Checkpoint:** Not needed for research phase  
**Next Phase:** Phase 1 - Database Schema & Data Layer

