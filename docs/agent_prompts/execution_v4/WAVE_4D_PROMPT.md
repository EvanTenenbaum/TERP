# Wave 4D: Loading States & Skeletons

**Agent Role**: Frontend Developer  
**Duration**: 4-5 hours  
**Priority**: P2  
**Dependencies**: Wave 3 complete  
**Can Run Parallel With**: Wave 4A, 4B, 4C (different file domains)

---

## Overview

Create reusable loading skeleton components and add them to all data-heavy pages for better perceived performance and UX.

---

## File Domain

**Your files**: 
- `client/src/components/ui/skeleton.tsx` (create)
- `client/src/components/ui/loading-state.tsx` (create)
- Page-specific loading states (coordinate with 4B)

**Do NOT modify**: 
- `server/**/*` (Wave 4A/4C domain)
- Empty state logic (Wave 4B domain)

---

## Task 1: Create Skeleton Components (1.5 hours)

```typescript
// client/src/components/ui/skeleton.tsx

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

// Table skeleton
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  showHeader = true,
}: { 
  rows?: number; 
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex gap-4 p-4 border-b bg-muted/30">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn(
                "h-4",
                colIndex === 0 ? "w-24" : "flex-1"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card skeleton
export function CardSkeleton({ 
  showImage = false,
  showFooter = false,
}: { 
  showImage?: boolean;
  showFooter?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {showImage && (
        <Skeleton className="h-32 w-full rounded-md" />
      )}
      <div className="space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      {showFooter && (
        <div className="flex justify-between pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      )}
    </div>
  );
}

// Grid of cards skeleton
export function GridSkeleton({ 
  items = 6,
  columns = 3,
  showImage = false,
}: { 
  items?: number;
  columns?: number;
  showImage?: boolean;
}) {
  return (
    <div className={cn(
      "grid gap-4",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-3",
      columns === 4 && "grid-cols-4",
    )}>
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} showImage={showImage} />
      ))}
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ 
  fields = 4,
  showSubmit = true,
}: { 
  fields?: number;
  showSubmit?: boolean;
}) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showSubmit && (
        <div className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  );
}

// Stats/KPI skeleton
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

// List skeleton
export function ListSkeleton({ 
  items = 5,
  showAvatar = false,
}: { 
  items?: number;
  showAvatar?: boolean;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          {showAvatar && (
            <Skeleton className="h-10 w-10 rounded-full" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

// Detail page skeleton
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      {/* Stats */}
      <StatsSkeleton count={4} />
      
      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <CardSkeleton />
        </div>
        <div>
          <CardSkeleton showFooter />
        </div>
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className={`w-full rounded`} style={{ height }} />
    </div>
  );
}
```

---

## Task 2: Create Loading State Component (30 min)

```typescript
// client/src/components/ui/loading-state.tsx

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md',
  className,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-muted-foreground",
        sizeClasses[size]
      )} />
      {message && (
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

// Inline loading spinner
export function LoadingSpinner({ 
  size = 'sm',
  className,
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <Loader2 className={cn(
      "animate-spin",
      sizeClasses[size],
      className
    )} />
  );
}

// Full page loading
export function PageLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingState message={message} size="lg" />
    </div>
  );
}

// Button loading state
export function ButtonLoading({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <LoadingSpinner className="mr-2" />
      {children || 'Loading...'}
    </>
  );
}
```

---

## Task 3: Add Loading States to Pages (2 hours)

### OrdersPage

```typescript
// client/src/pages/OrdersPage.tsx

import { TableSkeleton, StatsSkeleton } from '@/components/ui/skeleton';

export function OrdersPage() {
  const { data, isLoading, error } = trpc.orders.list.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <StatsSkeleton count={4} />
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  // ... rest of component
}
```

### ClientsPage

```typescript
// client/src/pages/ClientsPage.tsx

export function ClientsPage() {
  const { data, isLoading } = trpc.clients.list.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  // ... rest of component
}
```

### InventoryPage

```typescript
// client/src/pages/InventoryPage.tsx

export function InventoryPage() {
  const { data, isLoading } = trpc.inventory.list.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <TableSkeleton rows={10} columns={7} />
      </div>
    );
  }

  // ... rest of component
}
```

### InvoicesPage

```typescript
// client/src/pages/InvoicesPage.tsx

export function InvoicesPage() {
  const { data, isLoading } = trpc.invoices.list.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <StatsSkeleton count={4} />
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  // ... rest of component
}
```

### DashboardPage

```typescript
// client/src/pages/DashboardPage.tsx

export function DashboardPage() {
  const { data, isLoading } = trpc.dashboard.getOverview.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <StatsSkeleton count={4} />
        <div className="grid grid-cols-2 gap-6">
          <ChartSkeleton height={300} />
          <ChartSkeleton height={300} />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <ListSkeleton items={5} showAvatar />
          <ListSkeleton items={5} />
          <ListSkeleton items={5} />
        </div>
      </div>
    );
  }

  // ... rest of component
}
```

---

## Task 4: Add Loading to Modals and Drawers (1 hour)

```typescript
// client/src/components/modals/ClientDetailModal.tsx

export function ClientDetailModal({ clientId, open, onClose }) {
  const { data, isLoading } = trpc.clients.getById.useQuery(
    { id: clientId },
    { enabled: open && !!clientId }
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {isLoading ? (
          <DetailSkeleton />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{data?.name}</DialogTitle>
            </DialogHeader>
            {/* ... content */}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

```typescript
// client/src/components/inventory/BatchDetailDrawer.tsx

export function BatchDetailDrawer({ batchId, open, onClose }) {
  const { data, isLoading } = trpc.inventory.getById.useQuery(
    { id: batchId },
    { enabled: open && !!batchId }
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px]">
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <StatsSkeleton count={3} />
            <FormSkeleton fields={5} showSubmit={false} />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{data?.code}</SheetTitle>
            </SheetHeader>
            {/* ... content */}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

---

## Git Workflow

```bash
git checkout -b feat/wave-4d-loading-states

# Create skeleton components
git add client/src/components/ui/skeleton.tsx
git commit -m "feat(UX-3): Add comprehensive skeleton components"

# Create loading state components
git add client/src/components/ui/loading-state.tsx
git commit -m "feat(UX-4): Add loading state components"

# Update pages
git add client/src/pages/OrdersPage.tsx
git commit -m "feat(LOAD-1): Add loading skeleton to OrdersPage"

git add client/src/pages/ClientsPage.tsx
git commit -m "feat(LOAD-2): Add loading skeleton to ClientsPage"

git add client/src/pages/InventoryPage.tsx
git commit -m "feat(LOAD-3): Add loading skeleton to InventoryPage"

git add client/src/pages/InvoicesPage.tsx
git commit -m "feat(LOAD-4): Add loading skeleton to InvoicesPage"

git add client/src/pages/DashboardPage.tsx
git commit -m "feat(LOAD-5): Add loading skeleton to DashboardPage"

# Update modals/drawers
git add client/src/components/modals/*.tsx client/src/components/inventory/*.tsx
git commit -m "feat(LOAD-6): Add loading states to modals and drawers"

# Push and create PR
git push origin feat/wave-4d-loading-states
gh pr create --title "Wave 4D: Loading States & Skeletons" --body "
## Summary
Add loading skeleton components for better perceived performance.

## Changes
- Created comprehensive skeleton component library
- Added loading states to all major pages
- Added loading states to modals and drawers

## Testing
- [ ] All pages show skeletons while loading
- [ ] Skeletons match actual content layout
- [ ] No layout shift when content loads
- [ ] Modals/drawers show loading state

## Parallel Safety
Only creates new UI components and adds loading states
"
```

---

## Success Criteria

- [ ] Skeleton components created
- [ ] LoadingState components created
- [ ] OrdersPage has loading skeleton
- [ ] ClientsPage has loading skeleton
- [ ] InventoryPage has loading skeleton
- [ ] InvoicesPage has loading skeleton
- [ ] DashboardPage has loading skeleton
- [ ] Modals show loading state
- [ ] No layout shift on load

---

## Handoff

After Wave 4D completion:

1. PR ready for review
2. Screenshots of loading states
3. Coordinate merge timing with Wave 4A/4B/4C

**Merge Order**: 4D can merge last (depends on 4B for EmptyState imports)
