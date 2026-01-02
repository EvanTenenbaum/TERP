# VIP-M-001: Mobile-First UI Redesign

**Priority:** HIGH
**Estimate:** 16 hours
**Status:** Not Started
**Depends On:** VIP-F-001

---

## Overview

The VIP Portal must be redesigned with a mobile-first approach. Research shows that 83% of B2B buyers prefer digital ordering, and a significant portion of these interactions occur on mobile devices. The current portal has responsive elements but is not truly mobile-first.

---

## Problem Statement

| Issue | Impact |
|-------|--------|
| Tab navigation is not accessible on small screens | Users cannot access all features on mobile |
| KPI cards do not stack properly on mobile | Information is cut off or unreadable |
| Catalog filters are not mobile-friendly | Users cannot effectively browse products |
| No persistent navigation on mobile | Users get lost in the portal |

---

## Design Principles

1. **Mobile-First:** Design for 375px viewport first, then enhance for larger screens
2. **Thumb-Friendly:** All interactive elements must be at least 44x44px and reachable with one hand
3. **Progressive Disclosure:** Show essential information first, allow users to drill down for details
4. **Offline Awareness:** Show clear indicators when network connectivity is poor

---

## Tasks

### Task 1: Implement Mobile Navigation (8h)

Replace the current horizontal tab bar with a mobile-first navigation pattern:

**Option A: Bottom Navigation Bar (Recommended)**
- Fixed bottom bar with 5 primary tabs: Dashboard, Catalog, Receivables, Payables, More
- "More" opens a sheet with secondary tabs: My Needs, My Supply, Settings
- Active tab is highlighted with the brand color

**Option B: Hamburger Menu**
- Persistent hamburger icon in the top-left corner
- Opens a full-screen overlay with all navigation options
- Current page is highlighted

**Implementation:**
```tsx
// Use a media query to switch between desktop tabs and mobile navigation
const isMobile = useMediaQuery('(max-width: 768px)');

return isMobile ? <MobileBottomNav /> : <DesktopTabs />;
```

### Task 2: Redesign Dashboard for Mobile (4h)

The dashboard must provide immediate value on a small screen:

1. **Hero KPI:** Display the most important KPI (Outstanding Balance) prominently at the top
2. **KPI Grid:** Stack remaining KPIs in a 2-column grid
3. **Quick Actions:** Add a row of quick action buttons (View Catalog, Pay Invoice, Contact Support)
4. **Recent Activity:** Show a collapsible list of recent activity

**Wireframe:**
```
+---------------------------+
| Outstanding Balance       |
| $29,091,319.23           |
+---------------------------+
| Credit    | VIP Status    |
| 0%        | Silver        |
+---------------------------+
| [Catalog] [Pay] [Support] |
+---------------------------+
| Recent Activity           |
| > Invoice INV-000021 paid |
| > New catalog items       |
+---------------------------+
```

### Task 3: Redesign Catalog for Mobile (4h)

The catalog must be easy to browse on mobile:

1. **Search Bar:** Sticky at the top, always visible
2. **Filter Chips:** Horizontal scrollable row of filter chips below search
3. **Product Cards:** Full-width cards with image, name, category, and price
4. **Add to Draft:** Prominent "Add" button on each card
5. **Draft Summary:** Floating action button (FAB) showing draft count, opens draft drawer

**Wireframe:**
```
+---------------------------+
| [Search products...]      |
| [Flower] [Edibles] [+]    |
+---------------------------+
| Product Name              |
| Category | $XX.XX         |
| [Add to Draft]            |
+---------------------------+
| Product Name              |
| Category | $XX.XX         |
| [Add to Draft]            |
+---------------------------+
|                     [3]   | <- FAB with draft count
+---------------------------+
```

---

## Acceptance Criteria

1. Portal is fully functional on a 375px viewport (iPhone SE)
2. All navigation options are accessible on mobile
3. No horizontal scrolling is required on any page
4. All interactive elements are at least 44x44px
5. Page load time is under 3 seconds on a 3G connection

---

## Testing

1. **Device Testing:** Test on iPhone SE, iPhone 14, Samsung Galaxy S21, and iPad
2. **Lighthouse Audit:** Achieve a mobile performance score of 80+
3. **User Testing:** Conduct 3 user tests with actual clients on mobile devices

---

## Dependencies

- VIP-F-001 must be complete (frontend rendering bugs fixed)
