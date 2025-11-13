# Dashboard V3 - Phase 3: Customization Panel Design

**Date:** November 3, 2025  
**Version:** 3.1.0  
**Status:** Design Specification

---

## Overview

Phase 3 adds advanced customization capabilities to the Dashboard V3, allowing users to personalize their dashboard experience through widget visibility controls, layout presets, and drag-and-drop reordering.

---

## Design Principles

### 1. **Progressive Disclosure**
- Customization features are hidden by default
- Accessed through a "Customize" button in the dashboard header
- Non-intrusive to the primary dashboard experience

### 2. **Instant Feedback**
- Changes apply immediately (no "Save" button required)
- Visual feedback for all interactions
- Smooth animations for state changes

### 3. **Reversibility**
- Easy to reset to default layout
- Layout presets provide quick alternatives
- No permanent changes without user action

### 4. **Simplicity**
- Clear, intuitive controls
- Minimal learning curve
- Consistent with existing TERP UI patterns

---

## Components Architecture

### 1. CustomizationPanel Component

**Location:** `/client/src/components/dashboard/v3/CustomizationPanel.tsx`

**Purpose:** Side panel that slides in from the right when "Customize" is clicked

**Features:**
- Widget visibility toggles
- Layout preset selector
- Reset to default button
- Close button

**UI Structure:**
```
┌─────────────────────────────────┐
│ Customize Dashboard        [X]  │
├─────────────────────────────────┤
│                                 │
│ Layout Presets                  │
│ ○ Executive Overview            │
│ ● Operations Dashboard (active) │
│ ○ Sales Focus                   │
│ ○ Custom                        │
│                                 │
│ Widget Visibility               │
│ ☑ Sales by Client               │
│ ☑ Cash Flow                     │
│ ☑ Transaction Snapshot          │
│ ☐ Inventory Snapshot            │
│ ☑ Total Debt                    │
│ ☑ Sales Comparison              │
│ ☑ Profitability                 │
│ ☑ Matchmaking Opportunities     │
│                                 │
│ [Reset to Default]              │
│                                 │
└─────────────────────────────────┘
```

**State Management:**
- Uses React Context for dashboard preferences
- Persists to localStorage immediately
- Future: Sync with backend user preferences

---

### 2. Layout Presets

**Purpose:** Pre-configured dashboard layouts for different user roles/needs

**Presets:**

#### Executive Overview
- Focus: High-level metrics and trends
- Widgets: Sales Comparison, Profitability, Cash Flow, Total Debt
- Layout: Large widgets, minimal detail

#### Operations Dashboard (Default)
- Focus: Day-to-day operations
- Widgets: All 8 widgets visible
- Layout: Balanced mix of sizes

#### Sales Focus
- Focus: Sales performance and client relationships
- Widgets: Sales by Client, Sales Comparison, Matchmaking Opportunities, Transaction Snapshot
- Layout: Sales widgets prominent

#### Custom
- User-defined configuration
- All widgets available
- User controls visibility and order

**Implementation:**
```typescript
export const LAYOUT_PRESETS: Record<string, DashboardLayout> = {
  executive: {
    id: 'executive',
    name: 'Executive Overview',
    description: 'High-level metrics for decision makers',
    widgets: [
      { id: 'sales-comparison', isVisible: true, size: 'lg' },
      { id: 'profitability', isVisible: true, size: 'lg' },
      { id: 'cash-flow', isVisible: true, size: 'md' },
      { id: 'total-debt', isVisible: true, size: 'md' },
    ],
  },
  operations: {
    id: 'operations',
    name: 'Operations Dashboard',
    description: 'Complete view for day-to-day management',
    widgets: [
      { id: 'sales-by-client', isVisible: true, size: 'md' },
      { id: 'cash-flow', isVisible: true, size: 'md' },
      { id: 'transaction-snapshot', isVisible: true, size: 'sm' },
      { id: 'inventory-snapshot', isVisible: true, size: 'sm' },
      { id: 'total-debt', isVisible: true, size: 'sm' },
      { id: 'sales-comparison', isVisible: true, size: 'md' },
      { id: 'profitability', isVisible: true, size: 'lg' },
      { id: 'matchmaking-opportunities', isVisible: true, size: 'lg' },
    ],
  },
  sales: {
    id: 'sales',
    name: 'Sales Focus',
    description: 'Optimized for sales team',
    widgets: [
      { id: 'sales-by-client', isVisible: true, size: 'lg' },
      { id: 'sales-comparison', isVisible: true, size: 'md' },
      { id: 'matchmaking-opportunities', isVisible: true, size: 'lg' },
      { id: 'transaction-snapshot', isVisible: true, size: 'md' },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Your personalized layout',
    widgets: [], // User-defined
  },
};
```

---

### 3. Widget Visibility Toggles

**Purpose:** Allow users to show/hide specific widgets

**Behavior:**
- Checkbox list of all available widgets
- Toggling immediately adds/removes widget from dashboard
- Hidden widgets are removed from layout (not just hidden with CSS)
- Smooth fade-out animation when hiding
- Smooth fade-in animation when showing

**Implementation:**
- Uses React Context to manage visibility state
- Updates dashboard layout in real-time
- Persists to localStorage

---

### 4. Drag-and-Drop Reordering

**Purpose:** Allow users to rearrange widgets on the dashboard

**Library:** `@dnd-kit/core` and `@dnd-kit/sortable` (already installed)

**Behavior:**
- Drag handle appears on hover (6 dots icon)
- Drag preview shows widget outline
- Drop zones highlighted during drag
- Smooth animation when reordering
- Grid auto-adjusts to new layout

**Implementation:**
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';

function DashboardWithDnD() {
  const [widgets, setWidgets] = useState(visibleWidgets);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgets} strategy={verticalListSortingStrategy}>
        {widgets.map((widget) => (
          <SortableWidget key={widget.id} id={widget.id}>
            {/* Widget content */}
          </SortableWidget>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

### 5. Dashboard Preferences Context

**Purpose:** Global state management for dashboard customization

**Location:** `/client/src/contexts/DashboardPreferencesContext.tsx`

**State:**
```typescript
interface DashboardPreferencesState {
  activeLayoutId: string;
  customLayout: DashboardLayout;
  widgetVisibility: Record<string, boolean>;
  widgetOrder: string[];
}

interface DashboardPreferencesActions {
  setActiveLayout: (layoutId: string) => void;
  toggleWidgetVisibility: (widgetId: string) => void;
  reorderWidgets: (newOrder: string[]) => void;
  resetToDefault: () => void;
}
```

**Persistence:**
- Saves to `localStorage` on every change
- Key: `terp-dashboard-preferences-${userId}`
- Future: Sync with backend via tRPC

---

## User Flows

### Flow 1: Change Layout Preset

1. User clicks "Customize" button in dashboard header
2. Customization panel slides in from right
3. User selects a different preset (e.g., "Sales Focus")
4. Dashboard immediately rearranges to show selected preset
5. Panel remains open for further customization
6. User clicks [X] or clicks outside to close panel

**Duration:** ~3 seconds

---

### Flow 2: Toggle Widget Visibility

1. User opens customization panel
2. User unchecks "Inventory Snapshot" widget
3. Inventory widget fades out and is removed from layout
4. Other widgets smoothly reflow to fill the space
5. User checks "Inventory Snapshot" again
6. Widget fades in at its original position

**Duration:** ~2 seconds per toggle

---

### Flow 3: Reorder Widgets (Drag-and-Drop)

1. User hovers over a widget
2. Drag handle (6 dots) appears in widget header
3. User clicks and drags the widget
4. Drop zones are highlighted
5. User drops widget in new position
6. Widgets smoothly animate to new positions
7. New order is saved automatically

**Duration:** ~5 seconds

---

### Flow 4: Reset to Default

1. User opens customization panel
2. User clicks "Reset to Default" button
3. Confirmation dialog appears: "Reset dashboard to default layout?"
4. User clicks "Reset"
5. Dashboard animates back to default "Operations Dashboard" layout
6. All widgets become visible again
7. Success toast: "Dashboard reset to default"

**Duration:** ~4 seconds

---

## Visual Design

### Customization Panel

**Width:** 320px  
**Background:** White (light mode) / Dark gray (dark mode)  
**Shadow:** Large shadow for depth  
**Animation:** Slide in from right (300ms ease-out)

**Sections:**
- Header with title and close button
- Layout presets (radio buttons)
- Widget visibility (checkboxes)
- Reset button (bottom)

**Spacing:**
- Padding: 24px
- Section gap: 32px
- Item gap: 12px

---

### Drag Handle

**Icon:** 6 dots (⋮⋮)  
**Position:** Top-left of widget header  
**Visibility:** Hidden by default, appears on hover  
**Cursor:** `grab` (changes to `grabbing` when dragging)

---

### Drop Zones

**Visual:** Dashed border, blue tint  
**Animation:** Pulse effect  
**Feedback:** Highlights when dragging over

---

### Animations

**Widget Fade In/Out:** 200ms ease-in-out  
**Widget Reorder:** 300ms cubic-bezier(0.4, 0, 0.2, 1)  
**Panel Slide:** 300ms ease-out  
**Hover Effects:** 150ms ease-in-out

---

## Accessibility

### Keyboard Navigation

- **Tab:** Navigate through customization controls
- **Space/Enter:** Toggle checkboxes and radio buttons
- **Escape:** Close customization panel
- **Arrow Keys:** Navigate within preset/widget lists

### Screen Readers

- All controls have proper ARIA labels
- Widget visibility changes announced
- Layout changes announced
- Drag-and-drop has keyboard alternative (arrow keys + space)

### Focus Management

- Focus trapped in panel when open
- Focus returns to "Customize" button when closed
- Clear focus indicators on all interactive elements

---

## Performance Considerations

### Optimization Strategies

1. **Debounced Saves:** Wait 500ms after last change before saving to localStorage
2. **Memoization:** Use `React.memo` for widget components
3. **Lazy Loading:** Load customization panel only when opened
4. **Efficient Reordering:** Use `arrayMove` from @dnd-kit for O(1) reordering
5. **Minimal Re-renders:** Use React Context with selective subscriptions

### Performance Targets

- Panel open/close: < 300ms
- Widget toggle: < 200ms
- Drag-and-drop: 60fps
- Layout switch: < 500ms

---

## Implementation Plan

### Phase 3.1: Core Customization Infrastructure
- [ ] Create DashboardPreferencesContext
- [ ] Implement localStorage persistence
- [ ] Create CustomizationPanel component
- [ ] Add "Customize" button to DashboardHeader

### Phase 3.2: Layout Presets
- [ ] Define preset configurations
- [ ] Implement preset selector UI
- [ ] Add preset switching logic
- [ ] Test all presets

### Phase 3.3: Widget Visibility Toggles
- [ ] Create widget visibility checkboxes
- [ ] Implement toggle logic
- [ ] Add fade in/out animations
- [ ] Test visibility persistence

### Phase 3.4: Drag-and-Drop
- [ ] Integrate @dnd-kit
- [ ] Create SortableWidget wrapper
- [ ] Add drag handles
- [ ] Implement reorder logic
- [ ] Add keyboard alternative

### Phase 3.5: Polish & Testing
- [ ] Add reset to default functionality
- [ ] Implement confirmation dialogs
- [ ] Add success/error toasts
- [ ] Accessibility audit
- [ ] Cross-browser testing

---

## Future Enhancements (Phase 4+)

### Backend Persistence
- Sync preferences with backend via tRPC
- Store in `userDashboardPreferences` table
- Sync across devices

### Advanced Customization
- Widget-specific settings (e.g., default time periods)
- Custom widget sizes (resize handles)
- Multiple custom layouts (save/load)
- Share layouts with team members

### Analytics
- Track which layouts are most popular
- Track which widgets are most/least used
- Use data to improve default layouts

---

## Technical Specifications

### New Files

```
/client/src/
├── contexts/
│   └── DashboardPreferencesContext.tsx
├── components/
│   └── dashboard/
│       └── v3/
│           ├── CustomizationPanel.tsx
│           ├── SortableWidget.tsx
│           └── DragHandle.tsx
└── lib/
    └── constants/
        └── dashboardPresets.ts
```

### Dependencies

Already installed:
- `@dnd-kit/core`: ^6.1.0
- `@dnd-kit/sortable`: ^8.0.0
- `@dnd-kit/utilities`: ^3.2.2

### Type Definitions

```typescript
// Add to /client/src/types/dashboard.ts

export interface DashboardPreferences {
  userId: string;
  activeLayoutId: string;
  customLayout: DashboardLayout;
  widgetVisibility: Record<string, boolean>;
  widgetOrder: string[];
  lastModified: Date;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon?: string;
  widgets: WidgetState[];
}
```

---

## Success Metrics

### User Experience
- ✅ Customization panel opens in < 300ms
- ✅ Widget visibility toggles respond in < 200ms
- ✅ Drag-and-drop maintains 60fps
- ✅ All interactions have clear visual feedback
- ✅ Keyboard navigation works for all features

### Code Quality
- ✅ Zero TypeScript errors
- ✅ All components properly typed
- ✅ Accessibility standards met (WCAG AA)
- ✅ Performance targets achieved
- ✅ Cross-browser compatibility

### User Adoption
- Target: 50% of users customize their dashboard within first week
- Target: 80% of customizations use preset layouts
- Target: Average 2-3 widgets hidden per user

---

## Conclusion

Phase 3 transforms the Dashboard V3 from a static layout into a fully customizable command center. Users can tailor their dashboard to their specific role and preferences, improving efficiency and user satisfaction. The implementation follows TERP's design principles of simplicity, clarity, and progressive disclosure.

**Next Steps:**
1. Review and approve this design specification
2. Begin implementation of Phase 3.1 (Core Infrastructure)
3. Iterate based on user feedback
4. Plan Phase 4 (Advanced Features)

---

**Status:** Ready for Implementation ✅  
**Estimated Development Time:** 8-12 hours  
**Priority:** High
