# Wave 6: Features & Technical Debt (Post-Thursday)

**Agent Role**: Full Stack Developer(s)  
**Duration**: 20-30 hours (can split between 2 agents)  
**Priority**: P3  
**Timeline**: Week 3-4  
**Can Run Parallel With**: Independent tasks can run parallel

---

## Overview

Complete remaining features and address technical debt for long-term stability.

---

## Task 6A: Advanced Filtering & Sorting (FEATURE-008)

**Time Estimate**: 8-10 hours

### Create Reusable Filter System

```typescript
// client/src/components/filters/FilterBuilder.tsx

interface FilterConfig {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: { value: string; label: string }[];
}

interface FilterBuilderProps {
  config: FilterConfig[];
  value: Record<string, unknown>;
  onChange: (filters: Record<string, unknown>) => void;
}

export function FilterBuilder({ config, value, onChange }: FilterBuilderProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {config.map(filter => (
        <FilterField
          key={filter.field}
          config={filter}
          value={value[filter.field]}
          onChange={(val) => onChange({ ...value, [filter.field]: val })}
        />
      ))}
      
      {Object.keys(value).length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          Clear All
        </Button>
      )}
    </div>
  );
}
```

### Server-Side Filter Handler

```typescript
// server/utils/filterBuilder.ts

interface FilterParams {
  filters: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export function buildFilterQuery<T extends PgTable>(
  table: T,
  params: FilterParams
) {
  const conditions: SQL[] = [];
  
  for (const [field, value] of Object.entries(params.filters)) {
    if (value === undefined || value === null || value === '') continue;
    
    const column = table[field as keyof T];
    if (!column) continue;
    
    if (typeof value === 'string') {
      conditions.push(ilike(column, `%${value}%`));
    } else if (typeof value === 'number') {
      conditions.push(eq(column, value));
    } else if (typeof value === 'boolean') {
      conditions.push(eq(column, value));
    } else if (Array.isArray(value) && value.length > 0) {
      conditions.push(inArray(column, value));
    }
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}
```

### Apply to All List Pages

```typescript
// Example: client/src/pages/ProductsPage.tsx

const filterConfig: FilterConfig[] = [
  { field: 'name', label: 'Name', type: 'text' },
  { field: 'category', label: 'Category', type: 'select', options: categories },
  { field: 'archived', label: 'Status', type: 'select', options: [
    { value: 'false', label: 'Active' },
    { value: 'true', label: 'Archived' },
  ]},
];

export function ProductsPage() {
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ field: 'name', order: 'asc' });
  
  const { data } = trpc.products.list.useQuery({
    filters,
    sortBy: sort.field,
    sortOrder: sort.order,
  });
  
  return (
    <>
      <FilterBuilder config={filterConfig} value={filters} onChange={setFilters} />
      <SortableTable data={data} sort={sort} onSort={setSort} />
    </>
  );
}
```

---

## Task 6B: Batch Operations (FEATURE-012)

**Time Estimate**: 6-8 hours

### Create Batch Selection Hook

```typescript
// client/src/hooks/useBatchSelection.ts

export function useBatchSelection<T extends { id: number }>() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  
  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const selectAll = (items: T[]) => {
    setSelected(new Set(items.map(i => i.id)));
  };
  
  const clear = () => setSelected(new Set());
  
  const isSelected = (id: number) => selected.has(id);
  const isAllSelected = (items: T[]) => 
    items.length > 0 && items.every(i => selected.has(i.id));
  
  return {
    selected: Array.from(selected),
    selectedCount: selected.size,
    toggle,
    selectAll,
    clear,
    isSelected,
    isAllSelected,
  };
}
```

### Batch Action Bar

```typescript
// client/src/components/BatchActionBar.tsx

interface BatchActionBarProps {
  selectedCount: number;
  actions: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }[];
  onClear: () => void;
}

export function BatchActionBar({ selectedCount, actions, onClear }: BatchActionBarProps) {
  if (selectedCount === 0) return null;
  
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
      <span className="font-medium">{selectedCount} selected</span>
      
      <div className="flex gap-2">
        {actions.map(action => (
          <Button
            key={action.label}
            variant={action.variant || 'default'}
            size="sm"
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
      
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
```

### Server-Side Batch Operations

```typescript
// server/routers/products.ts

batchUpdate: protectedProcedure
  .input(z.object({
    ids: z.array(z.number()).min(1).max(100),
    updates: z.object({
      category: z.string().optional(),
      archived: z.boolean().optional(),
    }),
  }))
  .mutation(async ({ ctx, input }) => {
    // Validate user can update all items
    await validateBatchPermission(ctx.user.id, input.ids);
    
    const result = await db
      .update(products)
      .set(input.updates)
      .where(inArray(products.id, input.ids));
    
    console.log(`[Batch] User ${ctx.user.id} updated ${input.ids.length} products`);
    
    return { updated: input.ids.length };
  }),

batchDelete: protectedProcedure
  .input(z.object({
    ids: z.array(z.number()).min(1).max(100),
  }))
  .mutation(async ({ ctx, input }) => {
    await validateBatchPermission(ctx.user.id, input.ids);
    
    // Soft delete
    const result = await db
      .update(products)
      .set({ archived: true, archivedAt: new Date() })
      .where(inArray(products.id, input.ids));
    
    return { deleted: input.ids.length };
  }),
```

---

## Task 6C: Address TODO/FIXME Items

**Time Estimate**: 4-6 hours

### Find All TODOs

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" server/ client/src/
```

### Categorize and Prioritize

```markdown
## TODO Audit

### Critical (Fix Now)
| File | Line | TODO | Action |
|------|------|------|--------|
| auth.ts | 45 | TODO: Add rate limiting | Implement |
| ... | ... | ... | ... |

### Important (Fix Soon)
| File | Line | TODO | Action |
|------|------|------|--------|
| ... | ... | ... | ... |

### Nice to Have (Backlog)
| File | Line | TODO | Action |
|------|------|------|--------|
| ... | ... | ... | ... |

### Remove (Outdated)
| File | Line | TODO | Action |
|------|------|------|--------|
| ... | ... | ... | Remove |
```

### Fix or Document Each

```typescript
// Before
// TODO: Add validation
const data = input;

// After (if fixing)
const data = schema.parse(input);

// After (if deferring)
// TODO(P2): Add input validation for edge cases
// Tracked in: FEATURE-XXX
const data = input;
```

---

## Task 6D: Remove DigitalOcean Seed Job

**Time Estimate**: 1 hour

### Update App Spec

```yaml
# .do/app.yaml

# REMOVE this section:
# jobs:
#   - name: seed-fill-gaps
#     kind: PRE_DEPLOY
#     ...

# Keep only necessary jobs
jobs:
  - name: migrate
    kind: PRE_DEPLOY
    run_command: pnpm drizzle-kit push:pg
```

### Verify and Deploy

```bash
# Validate app spec
doctl apps spec validate .do/app.yaml

# Update app
doctl apps update $APP_ID --spec .do/app.yaml

# Verify job removed
doctl apps get $APP_ID --format Jobs
```

---

## Task 6E: Performance Optimization

**Time Estimate**: 4-6 hours

### Add Database Indexes

```sql
-- migrations/add_performance_indexes.sql

-- Frequently filtered columns
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY idx_orders_client_id ON orders(client_id);
CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at);

CREATE INDEX CONCURRENTLY idx_invoices_status ON invoices(status);
CREATE INDEX CONCURRENTLY idx_invoices_due_date ON invoices(due_date);

CREATE INDEX CONCURRENTLY idx_batches_status ON batches(status);
CREATE INDEX CONCURRENTLY idx_batches_product_id ON batches(product_id);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_orders_client_status 
  ON orders(client_id, status);

CREATE INDEX CONCURRENTLY idx_invoices_client_status 
  ON invoices(client_id, status);
```

### Add Query Caching

```typescript
// server/utils/cache.ts

import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await fn();
  await redis.setex(key, ttl, JSON.stringify(result));
  return result;
}

// Usage
const dashboard = await cached(
  `dashboard:${userId}`,
  60, // 1 minute
  () => getDashboardData(userId)
);
```

---

## Git Workflow

```bash
# Feature work
git checkout -b feat/wave-6-features

git add client/src/components/filters/
git commit -m "feat(FEATURE-008): Add advanced filtering system"

git add client/src/hooks/useBatchSelection.ts
git add client/src/components/BatchActionBar.tsx
git commit -m "feat(FEATURE-012): Add batch operations"

# Tech debt
git checkout -b chore/wave-6-tech-debt

git add [files with fixed TODOs]
git commit -m "chore: Address TODO items

Fixed:
- auth.ts: Added rate limiting
- ...

Deferred (tracked):
- FEATURE-XXX: ...
"

git add .do/app.yaml
git commit -m "chore: Remove seed-fill-gaps PRE_DEPLOY job"

git add migrations/add_performance_indexes.sql
git commit -m "perf: Add database indexes for common queries"
```

---

## Success Criteria

- [ ] Advanced filtering on all list pages
- [ ] Batch operations working
- [ ] All critical TODOs addressed
- [ ] Seed job removed from DO
- [ ] Performance indexes added
- [ ] Query caching implemented
- [ ] No regression in existing features
