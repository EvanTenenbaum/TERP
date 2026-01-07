# Wave 6: Features & Technical Debt

**Timeline**: Week 3-4  
**Total Duration**: 20-30 hours  
**Dependencies**: Wave 5 complete  
**Parallel Execution**: Agent 1 and Agent 2 can work simultaneously

---

## Agent 1: Feature Completion

**Role**: Feature Developer  
**Duration**: 20-28 hours

### Task 1: FEATURE-008 - Advanced Filtering & Sorting

**Files**: Various page components and routers  
**Time Estimate**: 6-8 hours

**Requirements**:
- Multi-column sorting on all data tables
- Advanced filter builder (AND/OR conditions)
- Save filter presets
- URL-based filter state (shareable links)

**Implementation**:

```typescript
// client/src/components/ui/AdvancedFilter.tsx
interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: any;
}

interface FilterGroup {
  logic: 'AND' | 'OR';
  conditions: (FilterCondition | FilterGroup)[];
}

interface AdvancedFilterProps {
  fields: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'enum';
    options?: string[];
  }>;
  value: FilterGroup;
  onChange: (filter: FilterGroup) => void;
  onSavePreset?: (name: string, filter: FilterGroup) => void;
}

export function AdvancedFilter({ fields, value, onChange, onSavePreset }: AdvancedFilterProps) {
  // Render filter builder UI
  // Allow adding conditions
  // Allow nesting groups
  // Support save/load presets
}

// URL state management
export function useFilterState<T>(defaultValue: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filter = useMemo(() => {
    const param = searchParams.get('filter');
    return param ? JSON.parse(atob(param)) : defaultValue;
  }, [searchParams]);
  
  const setFilter = useCallback((newFilter: T) => {
    setSearchParams({ filter: btoa(JSON.stringify(newFilter)) });
  }, [setSearchParams]);
  
  return [filter, setFilter] as const;
}
```

**Apply to these pages**:
- [ ] ClientsListPage
- [ ] OrdersPage
- [ ] InvoicesPage
- [ ] ProductsPage
- [ ] InventoryPage

---

### Task 2: FEATURE-010 - Batch Operations

**Files**: Various page components  
**Time Estimate**: 6-8 hours

**Requirements**:
- Select multiple rows in tables
- Bulk actions (delete, update status, export)
- Confirmation dialogs for destructive actions

**Implementation**:

```typescript
// client/src/hooks/useBatchSelection.ts
export function useBatchSelection<T extends { id: number }>() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const selectAll = (items: T[]) => {
    setSelectedIds(new Set(items.map(i => i.id)));
  };
  
  const clearSelection = () => {
    setSelectedIds(new Set());
  };
  
  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected: (id: number) => selectedIds.has(id),
    toggleSelection,
    selectAll,
    clearSelection,
  };
}

// client/src/components/ui/BatchActionBar.tsx
interface BatchActionBarProps {
  selectedCount: number;
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
    requireConfirm?: boolean;
  }>;
  onClear: () => void;
}

export function BatchActionBar({ selectedCount, actions, onClear }: BatchActionBarProps) {
  if (selectedCount === 0) return null;
  
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 flex items-center gap-4">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      {actions.map(action => (
        <Button
          key={action.label}
          variant={action.variant}
          onClick={() => {
            if (action.requireConfirm) {
              // Show confirmation dialog
            } else {
              action.onClick();
            }
          }}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
      <Button variant="ghost" onClick={onClear}>Clear</Button>
    </div>
  );
}
```

**Server-side batch operations**:
```typescript
// server/routers/clients.ts
batchDelete: protectedProcedure
  .input(z.object({ ids: z.array(z.number()) }))
  .mutation(async ({ ctx, input }) => {
    if (input.ids.length === 0) return { deleted: 0 };
    
    const result = await db.delete(clients)
      .where(inArray(clients.id, input.ids));
    
    return { deleted: result.rowCount };
  }),

batchUpdateStatus: protectedProcedure
  .input(z.object({
    ids: z.array(z.number()),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  }))
  .mutation(async ({ ctx, input }) => {
    if (input.ids.length === 0) return { updated: 0 };
    
    const result = await db.update(clients)
      .set({ status: input.status, updatedAt: new Date() })
      .where(inArray(clients.id, input.ids));
    
    return { updated: result.rowCount };
  }),
```

---

### Task 3: FEATURE-012 - Dashboard Customization

**Files**: `client/src/pages/DashboardPage.tsx`, new components  
**Time Estimate**: 8-12 hours

**Requirements**:
- Drag-and-drop widget arrangement
- Show/hide widgets
- Widget size options
- Save layout per user

**Implementation**:

```typescript
// client/src/components/dashboard/DashboardGrid.tsx
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Widget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'leaderboard';
  title: string;
  size: 'small' | 'medium' | 'large';
  visible: boolean;
  config?: Record<string, any>;
}

interface DashboardLayout {
  widgets: Widget[];
  columns: number;
}

export function DashboardGrid({ layout, onLayoutChange }: {
  layout: DashboardLayout;
  onLayoutChange: (layout: DashboardLayout) => void;
}) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const widgets = Array.from(layout.widgets);
    const [reordered] = widgets.splice(result.source.index, 1);
    widgets.splice(result.destination.index, 0, reordered);
    
    onLayoutChange({ ...layout, widgets });
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="grid grid-cols-12 gap-4"
          >
            {layout.widgets
              .filter(w => w.visible)
              .map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={getWidgetSizeClass(widget.size)}
                    >
                      <WidgetRenderer widget={widget} />
                    </div>
                  )}
                </Draggable>
              ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

// Save layout to user preferences
const saveLayoutMutation = trpc.userPreferences.saveDashboardLayout.useMutation();

const handleSaveLayout = () => {
  saveLayoutMutation.mutate({ layout });
};
```

---

## Agent 2: Technical Debt

**Role**: Tech Debt Developer  
**Duration**: 23-32 hours

### Task 4: TECH-001 - Fix Schema Drift

**Files**: `server/db/schema.ts`, migration files  
**Time Estimate**: 4-6 hours

**Requirements**:
- Audit database schema vs Drizzle schema
- Fix any mismatches
- Create migration to sync

**Process**:
```bash
# Generate schema diff
pnpm drizzle-kit introspect:pg

# Compare with existing schema
diff server/db/schema.ts server/db/introspected-schema.ts

# Create migration for any differences
pnpm drizzle-kit generate:pg

# Review and apply
pnpm drizzle-kit push:pg
```

---

### Task 5: TECH-002 - Remove DigitalOcean Seed Job

**Files**: `.do/app.yaml` or DigitalOcean App Platform config  
**Time Estimate**: 30 minutes

**Action**:
```yaml
# Remove this job from app spec:
jobs:
  - name: seed-fill-gaps
    kind: PRE_DEPLOY
    # ... remove entire job block
```

---

### Task 6: TECH-003 - Fix Test Mock Chains

**Files**: `server/__tests__/**/*.ts`  
**Time Estimate**: 4-6 hours

**Requirements**:
- Audit all test files for broken mock chains
- Fix mock implementations
- Ensure tests pass

**Common Issues**:
```typescript
// Bad: Mock doesn't match implementation
jest.mock('../db', () => ({
  query: jest.fn(), // Missing methods
}));

// Good: Complete mock
jest.mock('../db', () => ({
  query: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([]),
}));
```

---

### Task 7: TECH-007 - Integration Tests

**Files**: New test files  
**Time Estimate**: 8-12 hours

**Requirements**:
- End-to-end tests for critical flows
- API integration tests
- Database integration tests

**Implementation**:
```typescript
// server/__tests__/integration/orderFlow.test.ts
describe('Order Creation Flow', () => {
  beforeAll(async () => {
    // Setup test database
    await setupTestDb();
  });
  
  afterAll(async () => {
    // Cleanup
    await teardownTestDb();
  });
  
  it('should create order with inventory', async () => {
    // Create test client
    const client = await createTestClient();
    
    // Create test products
    const products = await createTestProducts(3);
    
    // Create order
    const order = await api.orders.create({
      clientId: client.id,
      items: products.map(p => ({ productId: p.id, quantity: 10 })),
    });
    
    expect(order.id).toBeDefined();
    expect(order.status).toBe('DRAFT');
    expect(order.items).toHaveLength(3);
  });
  
  it('should update inventory on order completion', async () => {
    // ... test inventory deduction
  });
  
  it('should create invoice on order completion', async () => {
    // ... test invoice creation
  });
});
```

---

### Task 8: TODO-001 - Address TODO Items

**Files**: Various (35 TODO items)  
**Time Estimate**: 6-8 hours

**Process**:
```bash
# Find all TODOs
grep -rn "TODO\|FIXME\|HACK" server/ client/src/ --include="*.ts" --include="*.tsx"

# Categorize by priority:
# - Security: Fix immediately
# - Performance: Schedule for later
# - Code quality: Fix if time permits
# - Feature: Add to backlog
```

**Triage Template**:
```markdown
| File | Line | TODO | Priority | Action |
|------|------|------|----------|--------|
| auth.ts | 45 | TODO: Add rate limiting | High | Fix now |
| utils.ts | 123 | TODO: Optimize this loop | Low | Defer |
| ... | ... | ... | ... | ... |
```

---

## Git Workflow

### Agent 1:
```bash
git checkout -b feat/wave-6-features

git add client/src/components/ui/AdvancedFilter.tsx
git add client/src/pages/*.tsx
git commit -m "feat(FEATURE-008): Add advanced filtering

- Multi-column sorting
- Filter builder with AND/OR
- URL state for shareable filters
- Filter presets"

git add client/src/hooks/useBatchSelection.ts
git add client/src/components/ui/BatchActionBar.tsx
git add server/routers/*.ts
git commit -m "feat(FEATURE-010): Add batch operations

- Multi-select in tables
- Bulk delete, status update, export
- Confirmation dialogs"

git add client/src/components/dashboard/*
git add server/routers/userPreferences.ts
git commit -m "feat(FEATURE-012): Add dashboard customization

- Drag-and-drop widgets
- Show/hide widgets
- Size options
- Per-user layout saving"

git push origin feat/wave-6-features
```

### Agent 2:
```bash
git checkout -b chore/wave-6-tech-debt

git add server/db/schema.ts server/db/migrations/*
git commit -m "fix(TECH-001): Fix schema drift

- Synced Drizzle schema with database
- Added missing columns
- Fixed type mismatches"

git add .do/app.yaml
git commit -m "chore(TECH-002): Remove seed-fill-gaps job

- Job no longer needed
- Prevents unnecessary runs on deploy"

git add server/__tests__/**/*.ts
git commit -m "fix(TECH-003): Fix test mock chains

- Updated mocks to match implementations
- All tests now pass"

git add server/__tests__/integration/*
git commit -m "test(TECH-007): Add integration tests

- Order flow tests
- Payment flow tests
- Inventory tests"

git add server/**/*.ts client/src/**/*.tsx
git commit -m "chore(TODO-001): Address TODO items

- Fixed 20 high-priority TODOs
- Deferred 15 low-priority to backlog"

git push origin chore/wave-6-tech-debt
```

---

## Success Criteria

### Agent 1:
- [ ] Advanced filtering works on all pages
- [ ] Batch operations work correctly
- [ ] Dashboard customization saves per user
- [ ] No regressions in existing functionality

### Agent 2:
- [ ] Schema matches database
- [ ] DO seed job removed
- [ ] All tests pass
- [ ] Integration tests cover critical flows
- [ ] TODO count reduced by 50%+

---

## Final Checklist

After Wave 6 completion:

- [ ] All P0 bugs fixed
- [ ] All P1 bugs fixed
- [ ] Core features complete
- [ ] Test coverage > 60%
- [ ] TODO count < 15
- [ ] No critical security issues
- [ ] Documentation updated
