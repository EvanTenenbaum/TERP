# Wave 4B: Empty States

**Agent Role**: Frontend Developer  
**Duration**: 5-6 hours  
**Priority**: P2  
**Dependencies**: Wave 3 complete  
**Can Run Parallel With**: Wave 4A, 4C, 4D (different file domains)

---

## Overview

Add proper empty state handling to all pages that currently show blank content when no data exists. This improves UX by providing helpful messaging and actions.

---

## File Domain

**Your files**: `client/src/pages/*.tsx`, `client/src/components/ui/empty-state.tsx`
**Do NOT modify**: `server/**/*` (Wave 4A domain), utility files (Wave 4C domain)

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
  Users, ShoppingCart, FileSpreadsheet
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
  onRetry 
}: { 
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-destructive" />}
      title={title}
      description={description ?? "An error occurred while loading this content. Please try again."}
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
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
};
```

---

## Task 2: Update AnalyticsPage (30 min)

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

## Task 3: Update CalendarPage (30 min)

```typescript
// client/src/pages/CalendarPage.tsx

export function CalendarPage() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>();
  const { data: events, isLoading, error, refetch } = trpc.calendar.getEvents.useQuery(
    { start: dateRange?.start!, end: dateRange?.end! },
    { enabled: !!dateRange }
  );

  if (isLoading) {
    return <LoadingState message="Loading calendar..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load calendar"
        description={error.message}
        onRetry={() => refetch()}
      />
    );
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

## Task 4: Update NotificationsPage (30 min)

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

## Task 5: Update Remaining Pages (2 hours)

Apply the same pattern to:

### PhotographyPage
```typescript
if (!batches || batches.length === 0) {
  return <EmptyState {...emptyStates.photography} />;
}
```

### ReportsPage
```typescript
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

## Task 6: Add Empty States to List Components (1 hour)

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
git commit -m "feat(UX-1): Add reusable empty state components"

# Update pages one by one
git add client/src/pages/AnalyticsPage.tsx
git commit -m "fix(BUG-061): Add empty state to AnalyticsPage"

git add client/src/pages/CalendarPage.tsx
git commit -m "fix(BUG-062): Add empty state to CalendarPage"

git add client/src/pages/NotificationsPage.tsx
git commit -m "fix(BUG-063): Add empty state to NotificationsPage"

git add client/src/pages/PhotographyPage.tsx
git commit -m "fix(BUG-064): Add empty state to PhotographyPage"

git add client/src/pages/ReportsPage.tsx
git commit -m "fix(BUG-065): Add empty state to ReportsPage"

git add client/src/pages/SpreadsheetViewPage.tsx
git commit -m "fix(BUG-066): Add empty state to SpreadsheetViewPage"

git add client/src/pages/TodoPage.tsx
git commit -m "fix(BUG-067): Add empty state to TodoPage"

# Update DataTable
git add client/src/components/DataTable.tsx
git commit -m "feat(UX-2): Add empty state support to DataTable"

# Push and create PR
git push origin feat/wave-4b-empty-states
gh pr create --title "Wave 4B: Empty States" --body "
## Summary
Add proper empty state handling to all pages.

## Changes
- Created reusable EmptyState component
- Fixed BUG-061 through BUG-067
- Added empty state support to DataTable

## Testing
- [ ] Each page shows appropriate empty state when no data
- [ ] Empty states have helpful messaging
- [ ] Action buttons work correctly
- [ ] Loading states still work

## Parallel Safety
Only touches client/src/pages/*.tsx and UI components
"
```

---

## Success Criteria

- [ ] EmptyState component created
- [ ] All 7 pages have empty states (BUG-061 to BUG-067)
- [ ] Empty states have appropriate icons
- [ ] Empty states have helpful descriptions
- [ ] Action buttons navigate correctly
- [ ] No blank pages when data is empty

---

## Handoff

After Wave 4B completion:

1. PR ready for review
2. Screenshots of each empty state
3. Coordinate merge timing with Wave 4A/4C/4D

**Merge Order**: 4B can merge after 4A (no conflicts)
