# Wave 4B: Empty States

**Agent Role**: Frontend Developer  
**Duration**: 5-6 hours  
**Priority**: P2  
**Dependencies**: Wave 3 complete  
**Can Run Parallel With**: Wave 4A, 4C, 4D (different file domains)

---

## ⚠️ WAVE 3 FINDINGS - PRIORITY UPDATES

**Wave 3 testing discovered critical database errors on the live site:**

1. **Samples API Database Error** - `samples.getAll` returns query failure
2. **Calendar API Database Error** - `calendar.getEvents` returns query failure

**These pages MUST have robust error states that handle API failures gracefully.**

---

## Overview

Add proper empty state AND error state handling to all pages that currently show blank content when no data exists or when API calls fail. This improves UX by providing helpful messaging and actions.

---

## File Domain

**Your files**: `client/src/pages/*.tsx`, `client/src/components/ui/empty-state.tsx`
**Do NOT modify**: `server/**/*` (Wave 4A/4C domain), utility files (Wave 4C domain)

---

## Task 1: Create Reusable Empty State Components (1 hour)

### Create Base Component

```typescript
// client/src/components/ui/empty-state.tsx

import { cn } from '@/lib/utils';
import { Button } from './button';
import { 
  Search, Inbox, AlertCircle, Calendar, BarChart3, 
  Bell, Camera, FileText, CheckSquare, Package,
  Users, ShoppingCart, FileSpreadsheet, FlaskConical
} from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  secondaryAction,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground opacity-50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoSearchResults({ 
  searchTerm,
  onClear 
}: { 
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12" />}
      title="No results found"
      description={searchTerm 
        ? `No items match "${searchTerm}". Try adjusting your search or filters.`
        : "Try adjusting your search or filters to find what you're looking for."
      }
      action={onClear ? { label: "Clear filters", onClick: onClear } : undefined}
    />
  );
}

export function NoDataYet({ 
  entity,
  action 
}: { 
  entity: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <EmptyState
      icon={<Inbox className="h-12 w-12" />}
      title={`No ${entity} yet`}
      description={`Get started by creating your first ${entity.toLowerCase()}.`}
      action={action}
    />
  );
}

export function ErrorState({ 
  title = "Something went wrong",
  description,
  onRetry,
  showSupport = false,
}: { 
  title?: string;
  description?: string;
  onRetry?: () => void;
  showSupport?: boolean;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-destructive" />}
      title={title}
      description={description ?? "An error occurred while loading this content. Please try again."}
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
      secondaryAction={showSupport ? { 
        label: "Contact Support", 
        onClick: () => window.open('mailto:support@terp.com', '_blank') 
      } : undefined}
    />
  );
}

// Database error state - for known API failures
export function DatabaseErrorState({
  entity,
  onRetry,
}: {
  entity: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-amber-500" />}
      title={`Unable to load ${entity}`}
      description="There was a problem connecting to the database. This may be a temporary issue. Please try again or contact support if the problem persists."
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
      secondaryAction={{ 
        label: "Contact Support", 
        onClick: () => window.open('mailto:support@terp.com', '_blank') 
      }}
    />
  );
}

// Page-specific empty states
export const emptyStates = {
  analytics: {
    icon: <BarChart3 className="h-12 w-12" />,
    title: "No analytics data yet",
    description: "Analytics will appear once you have orders and transactions in the system.",
  },
  calendar: {
    icon: <Calendar className="h-12 w-12" />,
    title: "No events scheduled",
    description: "Your calendar is empty. Create an appointment or task to get started.",
  },
  notifications: {
    icon: <Bell className="h-12 w-12" />,
    title: "No notifications",
    description: "You're all caught up! New notifications will appear here.",
  },
  photography: {
    icon: <Camera className="h-12 w-12" />,
    title: "No photos to review",
    description: "There are no batches awaiting photography. Photos will appear here when batches need imaging.",
  },
  reports: {
    icon: <FileText className="h-12 w-12" />,
    title: "No reports available",
    description: "Reports will be generated as you accumulate data in the system.",
  },
  todos: {
    icon: <CheckSquare className="h-12 w-12" />,
    title: "No tasks",
    description: "You have no tasks assigned. Tasks will appear here when created or assigned to you.",
  },
  spreadsheet: {
    icon: <FileSpreadsheet className="h-12 w-12" />,
    title: "No inventory data",
    description: "The spreadsheet view will populate once you have inventory batches in the system.",
  },
  orders: {
    icon: <ShoppingCart className="h-12 w-12" />,
    title: "No orders yet",
    description: "Orders will appear here once customers start placing them.",
  },
  clients: {
    icon: <Users className="h-12 w-12" />,
    title: "No clients yet",
    description: "Add your first client to start managing your customer relationships.",
  },
  inventory: {
    icon: <Package className="h-12 w-12" />,
    title: "No inventory",
    description: "Your inventory is empty. Create a purchase order to receive new stock.",
  },
  samples: {
    icon: <FlaskConical className="h-12 w-12" />,
    title: "No samples yet",
    description: "Sample requests will appear here when clients request product samples.",
  },
};
```

---

## Task 2: UPDATE SAMPLES PAGE (PRIORITY - Wave 3 Finding) (45 min)

**Wave 3 found: `samples.getAll` returns database query failure on live site**

```typescript
// client/src/pages/SamplesPage.tsx (or wherever samples are rendered)

import { EmptyState, ErrorState, DatabaseErrorState, emptyStates } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';

export function SamplesPage() {
  const { data, isLoading, error, refetch } = trpc.samples.getAll.useQuery();

  if (isLoading) {
    return <LoadingState message="Loading samples..." />;
  }

  // CRITICAL: Handle the known database error gracefully
  if (error) {
    console.error('[SamplesPage] API Error:', error);
    
    // Check if it's a database-related error
    const isDbError = error.message?.toLowerCase().includes('database') ||
                      error.message?.toLowerCase().includes('query') ||
                      error.message?.toLowerCase().includes('relation') ||
                      error.data?.code === 'INTERNAL_SERVER_ERROR';
    
    if (isDbError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Samples</h1>
          <DatabaseErrorState
            entity="samples"
            onRetry={() => refetch()}
          />
        </div>
      );
    }
    
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Samples</h1>
        <ErrorState
          title="Failed to load samples"
          description={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Samples</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Sample Request
          </Button>
        </div>
        <EmptyState
          {...emptyStates.samples}
          action={{
            label: "Create Sample Request",
            onClick: () => setShowCreateModal(true),
          }}
        />
      </div>
    );
  }

  return (
    // ... existing samples rendering
  );
}
```

---

## Task 3: UPDATE CALENDAR PAGE (PRIORITY - Wave 3 Finding) (45 min)

**Wave 3 found: `calendar.getEvents` returns database query failure on live site**

```typescript
// client/src/pages/CalendarPage.tsx

import { EmptyState, ErrorState, DatabaseErrorState, emptyStates } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function CalendarPage() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>();
  const { data: events, isLoading, error, refetch } = trpc.calendar.getEvents.useQuery(
    { start: dateRange?.start!, end: dateRange?.end! },
    { enabled: !!dateRange }
  );

  // CRITICAL: Handle the known database error gracefully
  if (error) {
    console.error('[CalendarPage] API Error:', error);
    
    const isDbError = error.message?.toLowerCase().includes('database') ||
                      error.message?.toLowerCase().includes('query') ||
                      error.message?.toLowerCase().includes('relation') ||
                      error.message?.toLowerCase().includes('calendar_events') ||
                      error.data?.code === 'INTERNAL_SERVER_ERROR';
    
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
        
        {isDbError ? (
          <DatabaseErrorState
            entity="calendar events"
            onRetry={() => refetch()}
          />
        ) : (
          <ErrorState
            title="Failed to load calendar"
            description={error.message}
            onRetry={() => refetch()}
          />
        )}
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading calendar..." />;
  }

  // Calendar always renders, but show message if no events
  const hasEvents = events && events.length > 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {!hasEvents && !isLoading && (
        <Alert className="mb-4">
          <Calendar className="h-4 w-4" />
          <AlertTitle>No events this month</AlertTitle>
          <AlertDescription>
            Create an appointment or task to see it on your calendar.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-4">
          <FullCalendar
            // ... calendar config
            events={events || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Task 4: Update AnalyticsPage (30 min)

```typescript
// client/src/pages/AnalyticsPage.tsx

import { EmptyState, ErrorState, emptyStates } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';

export function AnalyticsPage() {
  const { data, isLoading, error, refetch } = trpc.analytics.getDashboard.useQuery();

  if (isLoading) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load analytics"
        description={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  // Check if there's meaningful data
  const hasData = data && (
    data.totalRevenue > 0 || 
    data.totalOrders > 0 || 
    (data.revenueTrend && data.revenueTrend.length > 0)
  );

  if (!hasData) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <EmptyState
          {...emptyStates.analytics}
          action={{
            label: "Create your first order",
            onClick: () => navigate('/orders/create'),
          }}
        />
      </div>
    );
  }

  return (
    // ... existing analytics rendering
  );
}
```

---

## Task 5: Update NotificationsPage (30 min)

```typescript
// client/src/pages/NotificationsPage.tsx

export function NotificationsPage() {
  const { data: notifications, isLoading, error, refetch } = trpc.notifications.list.useQuery();

  if (isLoading) {
    return <LoadingState message="Loading notifications..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load notifications"
        description={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <EmptyState
          {...emptyStates.notifications}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="outline" onClick={markAllAsRead}>
          Mark all as read
        </Button>
      </div>
      
      <div className="space-y-2">
        {notifications.map(notification => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
}
```

---

## Task 6: Update Remaining Pages (1.5 hours)

Apply the same pattern to:

### PhotographyPage
```typescript
if (error) {
  return <ErrorState title="Failed to load photos" onRetry={() => refetch()} />;
}
if (!batches || batches.length === 0) {
  return <EmptyState {...emptyStates.photography} />;
}
```

### ReportsPage
```typescript
if (error) {
  return <ErrorState title="Failed to load reports" onRetry={() => refetch()} />;
}
if (!reports || reports.length === 0) {
  return (
    <EmptyState 
      {...emptyStates.reports}
      action={{
        label: "View Analytics",
        onClick: () => navigate('/analytics'),
      }}
    />
  );
}
```

### TodoPage
```typescript
if (error) {
  return <ErrorState title="Failed to load tasks" onRetry={() => refetch()} />;
}
if (!tasks || tasks.length === 0) {
  return (
    <EmptyState 
      {...emptyStates.todos}
      action={{
        label: "Create Task",
        onClick: () => setShowCreateModal(true),
      }}
    />
  );
}
```

### SpreadsheetViewPage
```typescript
if (error) {
  return <ErrorState title="Failed to load spreadsheet data" onRetry={() => refetch()} />;
}
if (!data || data.rows.length === 0) {
  return (
    <EmptyState 
      {...emptyStates.spreadsheet}
      action={{
        label: "View Inventory",
        onClick: () => navigate('/inventory'),
      }}
    />
  );
}
```

---

## Task 7: Add Empty States to List Components (30 min)

Update data tables and lists to show empty states:

```typescript
// client/src/components/DataTable.tsx

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  error?: Error | null;
  emptyState?: {
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
  onRetry?: () => void;
}

export function DataTable<T>({ 
  data, 
  columns, 
  isLoading, 
  error,
  emptyState,
  onRetry 
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={5} columns={columns.length} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load data"
        description={error.message}
        onRetry={onRetry}
      />
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <EmptyState
        icon={<Inbox className="h-12 w-12" />}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
      />
    );
  }

  return (
    <Table>
      {/* ... table rendering */}
    </Table>
  );
}
```

---

## Git Workflow

```bash
git checkout -b feat/wave-4b-empty-states

# Create empty state components
git add client/src/components/ui/empty-state.tsx
git commit -m "feat(UX-1): Add comprehensive empty state components

- Add base EmptyState component
- Add NoSearchResults, NoDataYet, ErrorState presets
- Add DatabaseErrorState for known API failures (Wave 3 finding)
- Add page-specific empty state configs"

# PRIORITY: Fix Samples page (Wave 3 finding)
git add client/src/pages/SamplesPage.tsx
git commit -m "fix(QA-050): Add error handling to Samples page

Wave 3 found samples.getAll returns DB error on live site.
- Add DatabaseErrorState for graceful error handling
- Add empty state for when no samples exist
- Add loading state"

# PRIORITY: Fix Calendar page (Wave 3 finding)
git add client/src/pages/CalendarPage.tsx
git commit -m "fix: Add error handling to Calendar page

Wave 3 found calendar.getEvents returns DB error on live site.
- Add DatabaseErrorState for graceful error handling
- Add empty state alert for no events
- Add loading state"

# Update remaining pages
git add client/src/pages/AnalyticsPage.tsx
git commit -m "feat(BUG-061): Add empty state to AnalyticsPage"

git add client/src/pages/NotificationsPage.tsx
git commit -m "feat(BUG-063): Add empty state to NotificationsPage"

# ... continue for other pages

git push origin feat/wave-4b-empty-states
gh pr create --title "Wave 4B: Empty States (includes Wave 3 fixes)" --body "
## Summary
Add proper empty state and error handling to all pages.

## Wave 3 Findings Addressed
- **QA-050**: Samples page now handles database errors gracefully
- **Calendar**: Calendar page now handles database errors gracefully

## Changes
- Created comprehensive empty state component library
- Added DatabaseErrorState for known API failures
- Added empty states to all data-heavy pages
- Added error states with retry functionality

## Testing
- [ ] Samples page shows friendly error when API fails
- [ ] Calendar page shows friendly error when API fails
- [ ] All pages show appropriate empty states
- [ ] Retry buttons work correctly
- [ ] No blank pages when data is empty
"
```

---

## Success Criteria

- [ ] **Samples page handles DB error gracefully** (Wave 3 priority)
- [ ] **Calendar page handles DB error gracefully** (Wave 3 priority)
- [ ] EmptyState components created
- [ ] DatabaseErrorState component created
- [ ] AnalyticsPage has empty state
- [ ] NotificationsPage has empty state
- [ ] PhotographyPage has empty state
- [ ] ReportsPage has empty state
- [ ] TodoPage has empty state
- [ ] SpreadsheetViewPage has empty state
- [ ] All error states have retry functionality
- [ ] No blank pages when data is empty or API fails

---

## Handoff

After Wave 4B completion:

1. PR ready for review
2. Document which pages were updated
3. Note: Wave 4C should investigate the ROOT CAUSE of Samples/Calendar DB errors
4. Merge after Wave 4A, 4C, 4D to avoid conflicts
