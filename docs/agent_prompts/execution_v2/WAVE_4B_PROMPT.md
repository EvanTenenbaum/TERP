# Wave 4B: Error Handling & UX Polish (Post-Thursday)

**Agent Role**: Frontend Developer  
**Duration**: 8-10 hours  
**Priority**: P2  
**Timeline**: Week 2  
**Can Run Parallel With**: Wave 4A

---

## Overview

Improve error handling, add empty states, and polish user experience across all pages.

---

## Task 1: Add Empty States to All Pages

**Time Estimate**: 4-5 hours

### Create Reusable Empty State Component

```typescript
// client/src/components/ui/EmptyState.tsx

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

### Apply to All Pages

```markdown
## Empty State Audit

| Page | Has Empty State | Implemented |
|------|-----------------|-------------|
| ProductsPage | ❌ | ⬜ |
| SamplesPage | ❌ | ⬜ |
| ClientsListPage | ✅ | ✅ |
| OrdersPage | ❌ | ⬜ |
| InvoicesPage | ❌ | ⬜ |
| InventoryPage | ❌ | ⬜ |
| CalendarPage | ❌ | ⬜ |
| ReportsPage | ❌ | ⬜ |
| AnalyticsPage | ❌ | ⬜ |
```

### Example Implementation

```typescript
// client/src/pages/ProductsPage.tsx

export function ProductsPage() {
  const { data: products, isLoading } = trpc.products.list.useQuery();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-12 w-12" />}
        title="No products yet"
        description="Get started by adding your first product to the catalog."
        action={{
          label: "Add Product",
          onClick: () => setShowAddModal(true),
        }}
      />
    );
  }

  return (
    // ... render products
  );
}
```

---

## Task 2: Improve Error Boundaries

**Time Estimate**: 2 hours

### Create Page-Level Error Boundary

```typescript
// client/src/components/ErrorBoundary.tsx

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    // Report to error tracking
    if (typeof Sentry !== 'undefined') {
      Sentry.captureException(error, { extra: errorInfo });
    }
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="bg-muted p-4 rounded text-xs overflow-auto max-w-full mb-4">
              {this.state.error.message}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
          
          <div className="flex gap-2">
            <Button onClick={this.handleReset}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Wrap All Routes

```typescript
// client/src/App.tsx

<Route 
  path="/products" 
  element={
    <ErrorBoundary>
      <ProductsPage />
    </ErrorBoundary>
  } 
/>
```

---

## Task 3: Add Loading States

**Time Estimate**: 1.5 hours

### Create Skeleton Components

```typescript
// client/src/components/ui/Skeleton.tsx

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/50">
        {Array(columns).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="flex gap-4 p-4">
          {Array(columns).fill(0).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
```

---

## Task 4: Improve Form Validation UX

**Time Estimate**: 1.5 hours

### Create Form Error Display

```typescript
// client/src/components/ui/FormError.tsx

interface FormErrorProps {
  error?: string;
  touched?: boolean;
}

export function FormError({ error, touched }: FormErrorProps) {
  if (!error || !touched) return null;
  
  return (
    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {error}
    </p>
  );
}

// Usage with react-hook-form
<Input {...register('email')} />
<FormError 
  error={errors.email?.message} 
  touched={touchedFields.email} 
/>
```

### Add Inline Validation

```typescript
// client/src/hooks/useFormValidation.ts

export function useFormValidation<T extends z.ZodSchema>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validate = (data: unknown) => {
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        const path = err.path.join('.');
        fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };
  
  const validateField = (field: string, value: unknown) => {
    // Validate single field for real-time feedback
  };
  
  return { errors, validate, validateField };
}
```

---

## Task 5: Add Toast Notifications

**Time Estimate**: 1 hour

### Create Toast System

```typescript
// client/src/components/ui/Toast.tsx

import { Toaster, toast } from 'sonner';

export { Toaster, toast };

// Usage patterns
toast.success('Order created successfully');
toast.error('Failed to save changes');
toast.warning('You have unsaved changes');
toast.info('New updates available');

// With action
toast.error('Failed to load data', {
  action: {
    label: 'Retry',
    onClick: () => refetch(),
  },
});

// With duration
toast.success('Saved', { duration: 2000 });
```

### Add to All Mutations

```typescript
// Example: client/src/pages/ClientsListPage.tsx

const createClient = trpc.clients.create.useMutation({
  onSuccess: () => {
    toast.success('Client created successfully');
    refetch();
  },
  onError: (error) => {
    toast.error(`Failed to create client: ${error.message}`);
  },
});
```

---

## Git Workflow

```bash
git checkout -b fix/wave-4b-ux-polish

git add client/src/components/ui/EmptyState.tsx
git commit -m "feat: Add reusable EmptyState component"

git add client/src/pages/*.tsx
git commit -m "feat: Add empty states to all pages"

git add client/src/components/ErrorBoundary.tsx
git commit -m "feat: Improve error boundary with better UX"

git add client/src/components/ui/Skeleton.tsx
git commit -m "feat: Add skeleton loading components"

git add client/src/components/ui/FormError.tsx
git commit -m "feat: Improve form validation UX"

git add client/src/components/ui/Toast.tsx
git commit -m "feat: Add toast notification system"

git push origin fix/wave-4b-ux-polish
```

---

## Success Criteria

- [ ] All pages have empty states
- [ ] Error boundaries on all routes
- [ ] Loading skeletons on all pages
- [ ] Form validation improved
- [ ] Toast notifications added
- [ ] No blank screens anywhere
