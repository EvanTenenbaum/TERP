# TERP Mobile Responsiveness Fix - Implementation Prompt

## Context

You are working on the TERP application, a cannabis ERP system built with React, TypeScript, and Tailwind CSS. A comprehensive mobile responsiveness audit has been completed and documented in `docs/qa/MOBILE_TESTING_FINDINGS.md`. Your task is to implement all the fixes identified in that report.

## Repository

- **Repo:** `EvanTenenbaum/TERP`
- **Clone:** `gh repo clone EvanTenenbaum/TERP`
- **Branch:** Create a new branch `fix/mobile-responsiveness-fixes`

## Pre-Implementation Steps

1. Read the full audit report at `docs/qa/MOBILE_TESTING_FINDINGS.md`
2. Review the existing mobile patterns documented in `docs/MOBILE_RESPONSIVE_PATTERNS.md`
3. Study the existing mobile implementations as reference:
   - `client/src/hooks/useMobile.tsx` - Mobile detection hook
   - `client/src/components/layout/MobileNav.tsx` - Mobile navigation
   - `client/src/pages/Inventory.tsx` - Example of proper mobile card view implementation (look for `md:hidden` sections)

---

## Task 1: Fix Table Overflow Issues (HIGH PRIORITY)

**Problem:** 11 pages have `<Table>` components without horizontal scroll handling, causing content to be cut off on mobile.

**Files to fix:**

```
client/src/pages/Orders.tsx
client/src/pages/LocationsPage.tsx
client/src/pages/ProductsPage.tsx
client/src/pages/VendorsPage.tsx
client/src/pages/PricingProfilesPage.tsx
client/src/pages/PricingRulesPage.tsx
client/src/pages/PurchaseOrdersPage.tsx
client/src/pages/ReturnsPage.tsx
client/src/pages/LeaderboardPage.tsx
client/src/pages/LiveShoppingPage.tsx
client/src/pages/PhotographyPage.tsx
```

**Pattern to apply:**

```tsx
// BEFORE:
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>...</TableBody>
</Table>

// AFTER:
<div className="overflow-x-auto">
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>...</TableBody>
  </Table>
</div>
```

**Verification:** After each fix, run `pnpm check` to ensure no TypeScript errors.

---

## Task 2: Fix Dialog/Modal Mobile Sizing (HIGH PRIORITY)

**Problem:** Some dialogs use fixed `max-w-2xl` without mobile-responsive width.

**Files to fix:**

```
client/src/pages/ClientProfilePage.tsx
client/src/pages/PricingProfilesPage.tsx
```

**Pattern to apply:**

```tsx
// BEFORE:
<DialogContent className="max-w-2xl">

// AFTER:
<DialogContent className="w-full sm:max-w-2xl">
```

Also check for any `SheetContent` components that don't have `w-full` for mobile.

---

## Task 3: Improve Touch Targets (MEDIUM PRIORITY)

**Problem:** Many buttons use `size="sm"` which creates touch targets smaller than the recommended 44px minimum.

**Files to audit and fix:**

```
client/src/pages/AnalyticsPage.tsx
client/src/pages/ClientsListPage.tsx
client/src/pages/MatchmakingServicePage.tsx
client/src/pages/NeedsManagementPage.tsx
client/src/pages/PhotographyPage.tsx
client/src/pages/PurchaseOrdersPage.tsx
client/src/pages/ReturnsPage.tsx
client/src/pages/Settings.tsx
client/src/pages/LeaderboardPage.tsx
```

**Pattern to apply:**

```tsx
// BEFORE:
<Button size="sm" variant="outline">Action</Button>

// AFTER (for important actions):
<Button size="sm" variant="outline" className="min-h-[44px] sm:min-h-0">Action</Button>

// OR for icon-only buttons:
<Button size="sm" variant="ghost" className="h-9 w-9 sm:h-8 sm:w-8">
  <Icon className="h-4 w-4" />
</Button>
```

**Note:** Focus on action buttons that users frequently tap. Export/secondary buttons can remain small.

---

## Task 4: Add Mobile Card Views (ENHANCEMENT)

**Problem:** Some data-heavy pages only have table views, which are hard to use on mobile.

**Reference implementation:** Look at `client/src/pages/Inventory.tsx` lines 659-943 for the pattern:

```tsx
{
  /* Desktop table */
}
<div className="overflow-x-auto hidden md:block">
  <Table>...</Table>
</div>;

{
  /* Mobile cards */
}
<div className="md:hidden space-y-4">
  {items.map(item => (
    <Card key={item.id}>
      <CardContent className="p-4">{/* Compact card layout */}</CardContent>
    </Card>
  ))}
</div>;
```

**Pages to enhance (if time permits):**

- `client/src/pages/Orders.tsx` - Add mobile order cards
- `client/src/pages/ProductsPage.tsx` - Add mobile product cards

---

## Task 5: Update Playwright Config for Mobile Testing

**File:** `playwright.config.ts`

**Add mobile device projects:**

```typescript
// Add to the projects array:
{
  name: 'Mobile Chrome',
  use: { ...devices['Pixel 5'] },
},
{
  name: 'Mobile Safari',
  use: { ...devices['iPhone 13'] },
},
{
  name: 'Tablet',
  use: { ...devices['iPad (gen 7)'] },
},
```

---

## Commit Strategy

Create separate commits for each task:

1. `fix(mobile): add overflow-x-auto to tables for horizontal scrolling`
2. `fix(mobile): add responsive sizing to dialogs and modals`
3. `fix(mobile): improve touch target sizes for action buttons`
4. `feat(mobile): add mobile card views for Orders page` (if implemented)
5. `test(e2e): add mobile device projects to Playwright config`

---

## Testing Checklist

Before submitting PR:

- [ ] `pnpm check` passes (no TypeScript errors)
- [ ] `pnpm lint` passes (or only pre-existing warnings)
- [ ] Manually test each fixed page in Chrome DevTools mobile view (Pixel 5, 393x851)
- [ ] Verify tables scroll horizontally on mobile
- [ ] Verify dialogs fit on mobile screens
- [ ] Verify buttons are easily tappable

---

## PR Template

**Title:** `fix(mobile): comprehensive mobile responsiveness improvements`

**Body:**

```markdown
## Summary

Implements mobile responsiveness fixes identified in the QA audit (docs/qa/MOBILE_TESTING_FINDINGS.md).

## Changes

- Added horizontal scroll handling to 11 table components
- Added responsive sizing to dialog/modal components
- Improved touch target sizes for action buttons
- [Optional] Added mobile card views for Orders page
- Added mobile device projects to Playwright config

## Testing

- [ ] Tested on Pixel 5 viewport (393x851)
- [ ] Tested on iPad viewport (810x1080)
- [ ] All TypeScript checks pass
- [ ] No visual regressions on desktop

## Related

- Audit report: docs/qa/MOBILE_TESTING_FINDINGS.md
- Mobile patterns: docs/MOBILE_RESPONSIVE_PATTERNS.md
```

---

## Important Notes

1. **Do NOT push directly to main** - create a PR for review
2. **Use `--no-verify` if pre-commit hooks fail** due to pre-existing ESLint errors unrelated to your changes
3. **The app is live at** https://terp-app-b9s35.ondigitalocean.app - you can test there after deployment
4. **Prioritize Tasks 1 and 2** - these are the highest impact fixes

---

## Success Criteria

The goal is to make TERP fully usable on mobile devices, especially tablets which are commonly used in warehouse and dispensary environments. After implementation:

- All tables should scroll horizontally on mobile without breaking page layout
- All dialogs/modals should fit within mobile viewport
- Primary action buttons should be easily tappable (44px minimum touch target)
- Users should be able to complete all critical workflows on a tablet device
