# Wave 4B: Error Handling & UX Polish

**Agent Role**: Frontend Developer  
**Duration**: 8-10 hours  
**Priority**: P2 - MEDIUM  
**Timeline**: Week 2  
**Dependencies**: Thursday deployment stable  
**Can Run Parallel With**: Wave 4A

---

## Context

You are improving the user experience by adding empty states, loading skeletons, and better error messages. These don't block functionality but make the app feel more polished and professional.

---

## Tasks

### Task 1: UX-001 - Empty State for Analytics Page

**File**: `client/src/pages/AnalyticsPage.tsx`  
**Time Estimate**: 1 hour

**Problem**: When no data exists, the page shows a blank area instead of a helpful message.

**Implementation**:
```tsx
// Create reusable EmptyState component if not exists
// client/src/components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// In AnalyticsPage.tsx
{data?.length === 0 ? (
  <EmptyState
    icon={<ChartBarIcon className="h-12 w-12" />}
    title="No analytics data yet"
    description="Analytics will appear here once you have orders and transactions."
  />
) : (
  // Render charts
)}
```

---

### Task 2: UX-002 - Empty State for Calendar Page

**File**: `client/src/pages/CalendarPage.tsx`  
**Time Estimate**: 1 hour

**Implementation**:
```tsx
{events?.length === 0 ? (
  <EmptyState
    icon={<CalendarIcon className="h-12 w-12" />}
    title="No events scheduled"
    description="Your calendar is empty. Schedule a delivery or meeting to get started."
    action={{
      label: "Add Event",
      onClick: () => setShowAddEventModal(true)
    }}
  />
) : (
  // Render calendar
)}
```

---

### Task 3: UX-003 - Empty State for Photography Page

**File**: `client/src/pages/PhotographyPage.tsx`  
**Time Estimate**: 1 hour

**Implementation**:
```tsx
{photos?.length === 0 ? (
  <EmptyState
    icon={<CameraIcon className="h-12 w-12" />}
    title="No photos uploaded"
    description="Upload product photos to showcase your inventory."
    action={{
      label: "Upload Photos",
      onClick: () => setShowUploadModal(true)
    }}
  />
) : (
  // Render photo grid
)}
```

---

### Task 4: UX-004 - Loading Skeletons for Tables

**Files**: Various page components  
**Time Estimate**: 2-3 hours

**Create reusable TableSkeleton**:
```tsx
// client/src/components/ui/TableSkeleton.tsx
interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 py-3 border-b">
        {Array(columns).fill(0).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array(rows).fill(0).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-4 border-b">
          {Array(columns).fill(0).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Usage in pages
{isLoading ? (
  <TableSkeleton columns={6} rows={10} />
) : (
  <DataTable data={data} columns={columns} />
)}
```

**Apply to these pages**:
- [ ] ClientsListPage
- [ ] OrdersPage
- [ ] InvoicesPage
- [ ] ProductsPage
- [ ] InventoryPage
- [ ] SamplesPage

---

### Task 5: UX-005 - Improve Error Messages

**Files**: Various  
**Time Estimate**: 2-3 hours

**Create ErrorDisplay component**:
```tsx
// client/src/components/ui/ErrorDisplay.tsx
interface ErrorDisplayProps {
  error: Error | TRPCClientError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  // Parse error type
  const errorCode = error?.data?.code;
  
  let title = "Something went wrong";
  let description = error.message;
  let icon = <ExclamationCircleIcon />;
  
  if (errorCode === 'UNAUTHORIZED') {
    title = "Please log in";
    description = "You need to be logged in to view this page.";
    icon = <LockClosedIcon />;
  } else if (errorCode === 'FORBIDDEN') {
    title = "Access denied";
    description = "You don't have permission to view this resource.";
    icon = <ShieldExclamationIcon />;
  } else if (errorCode === 'NOT_FOUND') {
    title = "Not found";
    description = "The resource you're looking for doesn't exist.";
    icon = <QuestionMarkCircleIcon />;
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-red-400">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
```

**Apply to pages with error states**:
- [ ] Replace generic error messages
- [ ] Add retry buttons where appropriate
- [ ] Use correct error codes (FORBIDDEN vs UNAUTHORIZED)

---

### Task 6: UX-006 - Toast Notifications

**Time Estimate**: 1-2 hours

**Add toast notifications for actions**:
```tsx
// Using react-hot-toast or similar
import toast from 'react-hot-toast';

// Success notifications
toast.success('Order created successfully');
toast.success('Client saved');
toast.success('Payment recorded');

// Error notifications
toast.error('Failed to save. Please try again.');

// Info notifications
toast.info('Changes saved');
```

**Add to these actions**:
- [ ] Order creation
- [ ] Client creation/update
- [ ] Payment recording
- [ ] Product creation
- [ ] Batch updates
- [ ] Settings changes

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/wave-4b-ux-polish

# Create shared components first
git add client/src/components/ui/EmptyState.tsx
git add client/src/components/ui/TableSkeleton.tsx
git add client/src/components/ui/ErrorDisplay.tsx
git commit -m "feat: Add reusable UX components

- EmptyState for empty data scenarios
- TableSkeleton for loading states
- ErrorDisplay for error handling"

# Add empty states to pages
git add client/src/pages/AnalyticsPage.tsx
git add client/src/pages/CalendarPage.tsx
git add client/src/pages/PhotographyPage.tsx
git commit -m "feat(UX-001,002,003): Add empty states to pages

- Analytics shows helpful message when no data
- Calendar shows message and add event button
- Photography shows upload prompt"

# Add loading skeletons
git add client/src/pages/*.tsx
git commit -m "feat(UX-004): Add loading skeletons to tables

- All data tables show skeleton while loading
- Improves perceived performance"

# Improve error messages
git add client/src/components/ui/ErrorDisplay.tsx
git add client/src/pages/*.tsx
git commit -m "feat(UX-005): Improve error messages

- Distinguish between auth and permission errors
- Add retry buttons
- User-friendly error descriptions"

# Add toast notifications
git add client/src/components/*.tsx
git add client/src/pages/*.tsx
git commit -m "feat(UX-006): Add toast notifications

- Success toasts for completed actions
- Error toasts for failures
- Consistent feedback across app"

# Push and create PR
git push origin feat/wave-4b-ux-polish
```

---

## Success Criteria

- [ ] All pages have empty states
- [ ] All tables show loading skeletons
- [ ] Error messages are clear and actionable
- [ ] Toast notifications for all major actions
- [ ] Consistent UX patterns across app

---

## Handoff

When complete, update the roadmap and create a PR. These changes can be deployed independently of Wave 4A.
