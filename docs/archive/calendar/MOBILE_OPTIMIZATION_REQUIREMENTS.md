# Calendar Mobile Optimization Requirements

**Status**: 📋 Planned  
**Priority**: 🟠 MEDIUM  
**Estimated Effort**: 2-3 days  
**Dependencies**: Phase 1 & Phase 2 backend improvements

---

## Overview

The TERP Calendar System currently lacks mobile-specific optimizations, making it difficult to use on smartphones and tablets. This document outlines the requirements for mobile optimization to improve the user experience on mobile devices.

---

## Current Issues

### 1. Layout Issues
- Calendar grid is too wide for mobile screens
- Event cards are not touch-friendly (too small)
- Navigation sidebar takes up too much space
- Date picker is difficult to use on touch devices

### 2. Performance Issues
- Large event lists cause slow scrolling on mobile
- No lazy loading for events
- Heavy DOM rendering for calendar grids

### 3. UX Issues
- No swipe gestures for navigation
- No pull-to-refresh
- No mobile-specific views (list vs grid)
- Small tap targets (< 44px)

---

## Requirements

### 1. Responsive Breakpoints

Implement responsive breakpoints for:
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md)
- **Desktop**: > 1024px (lg)

### 2. Mobile-Specific Views

#### Month View (Mobile)
- Switch to list view instead of grid
- Show events grouped by date
- Collapsible date sections
- Infinite scroll with pagination

#### Week View (Mobile)
- Horizontal scroll for days
- Vertical scroll for time slots
- Snap to current day
- Compact time labels

#### Day View (Mobile)
- Full-screen event list
- Swipe left/right to change days
- Pull-to-refresh to reload events

### 3. Touch-Friendly Components

#### Event Cards
- Minimum height: 60px
- Minimum tap target: 44x44px
- Clear visual hierarchy
- Swipe actions (edit, delete)

#### Date Picker
- Native mobile date picker
- Large touch targets
- Clear month/year navigation
- Quick date shortcuts (Today, Tomorrow, Next Week)

#### Navigation
- Bottom navigation bar (mobile)
- Hamburger menu for secondary actions
- Floating action button (FAB) for "Create Event"

### 4. Performance Optimizations

#### Lazy Loading
- Load events on-demand as user scrolls
- Implement virtual scrolling for large lists
- Prefetch next page of events

#### Caching
- Cache event data in localStorage
- Implement optimistic UI updates
- Background sync for offline support

#### Rendering
- Use React.memo for event components
- Implement windowing for long lists
- Debounce scroll events

### 5. Gestures & Interactions

#### Swipe Gestures
- Swipe left/right to navigate days/weeks
- Swipe down to refresh events
- Swipe on event card for quick actions

#### Touch Interactions
- Long-press to show event details
- Pinch-to-zoom on calendar grid (optional)
- Tap-and-hold to create event at specific time

### 6. Mobile-Specific Features

#### Quick Actions
- Floating Action Button (FAB) for "Create Event"
- Quick filters (Today, This Week, This Month)
- Search bar at top

#### Notifications
- Push notifications for event reminders
- Badge count for upcoming events
- In-app notification center

#### Offline Support
- Cache events for offline viewing
- Queue mutations for sync when online
- Show offline indicator

---

## Implementation Plan

### Phase 1: Responsive Layout (1 day)
1. Add responsive breakpoints to calendar components
2. Implement mobile-specific layout for month view
3. Update navigation for mobile (bottom bar)
4. Test on various screen sizes

### Phase 2: Touch Interactions (1 day)
1. Increase tap target sizes
2. Add swipe gestures for navigation
3. Implement pull-to-refresh
4. Add floating action button

### Phase 3: Performance (1 day)
1. Implement lazy loading for events
2. Add virtual scrolling for long lists
3. Optimize rendering with React.memo
4. Add caching layer

### Phase 4: Testing & Polish (0.5 days)
1. Test on real mobile devices
2. Fix any layout issues
3. Optimize performance
4. Update documentation

---

## Technical Approach

### CSS/Styling
```css
/* Mobile-first approach */
.calendar-grid {
  display: grid;
  grid-template-columns: 1fr; /* Single column on mobile */
}

@media (min-width: 640px) {
  .calendar-grid {
    grid-template-columns: repeat(7, 1fr); /* 7 columns on tablet+ */
  }
}

/* Touch-friendly tap targets */
.event-card {
  min-height: 60px;
  padding: 12px;
  touch-action: manipulation;
}

.tap-target {
  min-width: 44px;
  min-height: 44px;
}
```

### React Components
```tsx
// Mobile-specific calendar view
const MobileCalendarView = () => {
  const { events, loadMore, hasMore } = useInfiniteEvents();
  
  return (
    <div className="mobile-calendar">
      <PullToRefresh onRefresh={refetch}>
        <InfiniteScroll
          dataLength={events.length}
          next={loadMore}
          hasMore={hasMore}
        >
          {events.map(event => (
            <SwipeableEventCard
              key={event.id}
              event={event}
              onSwipeLeft={() => handleEdit(event)}
              onSwipeRight={() => handleDelete(event)}
            />
          ))}
        </InfiniteScroll>
      </PullToRefresh>
    </div>
  );
};
```

### API Integration
```typescript
// Use pagination API for mobile
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['events', filters],
  queryFn: ({ pageParam = 0 }) =>
    api.calendar.getEvents({
      ...filters,
      limit: 20, // Smaller limit for mobile
      offset: pageParam,
      includeTotalCount: true,
    }),
  getNextPageParam: (lastPage) =>
    lastPage.pagination.hasMore
      ? lastPage.pagination.offset + lastPage.pagination.limit
      : undefined,
});
```

---

## Testing Checklist

### Device Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (standard)
- [ ] iPad (tablet)
- [ ] Android phone (various sizes)
- [ ] Android tablet

### Functionality Testing
- [ ] Create event on mobile
- [ ] Edit event on mobile
- [ ] Delete event with swipe
- [ ] Navigate between days/weeks/months
- [ ] Pull-to-refresh works
- [ ] Infinite scroll works
- [ ] Search works on mobile
- [ ] Filters work on mobile

### Performance Testing
- [ ] Smooth scrolling with 100+ events
- [ ] Fast initial load time (< 2s)
- [ ] No jank during animations
- [ ] Efficient memory usage

### UX Testing
- [ ] All tap targets are at least 44x44px
- [ ] Text is readable without zooming
- [ ] Forms are easy to fill out
- [ ] Navigation is intuitive
- [ ] No horizontal scrolling (except intentional)

---

## Dependencies

### Backend (Already Implemented)
- ✅ Pagination API (`limit`, `offset`, `includeTotalCount`)
- ✅ Batch permission checking (performance)
- ✅ Database index on recurrence instances

### Frontend (To Be Implemented)
- 📋 Responsive CSS with Tailwind breakpoints
- 📋 React Query for infinite scrolling
- 📋 Swipeable component library
- 📋 Pull-to-refresh component
- 📋 Virtual scrolling library (react-window or react-virtuoso)

---

## Success Metrics

### Performance
- **Initial Load Time**: < 2 seconds on 3G
- **Time to Interactive**: < 3 seconds on 3G
- **Scroll FPS**: > 55 FPS on mobile devices

### UX
- **Mobile Bounce Rate**: < 30% (down from current)
- **Mobile Session Duration**: > 2 minutes (up from current)
- **Mobile Event Creation Rate**: > 50% of desktop rate

### Accessibility
- **Lighthouse Mobile Score**: > 90
- **Touch Target Compliance**: 100% (all targets > 44px)
- **Viewport Meta Tag**: Properly configured

---

## References

- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/inputs/touchscreen-gestures)
- [Material Design - Mobile Guidelines](https://material.io/design/layout/responsive-layout-grid.html)
- [React Query - Infinite Queries](https://tanstack.com/query/latest/docs/react/guides/infinite-queries)

---

## Notes

- Mobile optimization should be done **after** Phase 1 and Phase 2 backend improvements are deployed
- Consider using a mobile-first CSS approach (start with mobile, add desktop styles)
- Test on real devices, not just browser DevTools
- Consider progressive web app (PWA) features for better mobile experience
- Offline support can be added in a future phase if needed
