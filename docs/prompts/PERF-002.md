# PERF-002: Add React.memo to Components

<!-- METADATA (for validation) -->
<!-- TASK_ID: PERF-002 -->
<!-- TASK_TITLE: Add React.memo to Components -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-30 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** PERF-002  
**Priority:** P1 (HIGH - PERFORMANCE)  
**Estimated Time:** 24 hours  
**Module:** React Components, Frontend Performance

---

## 📋 Table of Contents

1. [Context](#context)
2. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
3. [Phase 2: Session Startup](#phase-2-session-startup)
4. [Phase 3: Implementation](#phase-3-implementation)
5. [Phase 4: Completion](#phase-4-completion)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

**Background:**
The TERP frontend has many complex components that re-render unnecessarily, causing performance issues especially on pages with large lists (dashboard widgets, inventory lists, order lists). Adding React.memo to expensive components will prevent unnecessary re-renders and improve UI responsiveness.

**Goal:**
Identify expensive components that re-render frequently and wrap them with React.memo to optimize rendering performance.

**Success Criteria:**

- [ ] Top 20 expensive components identified
- [ ] React.memo added to dashboard widgets
- [ ] React.memo added to list item components
- [ ] React.memo added to complex forms
- [ ] Custom comparison functions added where needed
- [ ] Performance measurements show improvement
- [ ] All tests passing
- [ ] Zero TypeScript errors

---

## 🚨 MANDATORY: Use Gemini API for Code Generation

**ALL code generation and analysis MUST use Google Gemini API:**

```python
from google import genai
import os
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
```

**Full instructions:** `docs/GEMINI_API_USAGE.md` | **This is non-negotiable.**

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-PERF-002-$(openssl rand -hex 4).md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1. `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2. Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3. If clear, add your session to the file.
4. Commit and push **immediately**:
   ```bash
   git add docs/ACTIVE_SESSIONS.md
   git commit -m "Register session for PERF-002"
   git push origin main
   ```
5. **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate.

### Step 1.3: Verify Environment

```bash
node --version
pnpm --version
git status
```

### Step 1.4: Verify Permissions

Test your push access: `git push --dry-run origin main`

---

## Phase 2: Session Startup

**Objective:** Set up your workspace and update the roadmap.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b perf-002-react-memo
```

### Step 2.2: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Find the PERF-002 task and update status to `⏳ IN PROGRESS`.

### Step 2.3: Update Session File Progress

Update your session file with your progress.

---

## Phase 3: Implementation

**Objective:** Identify expensive components and add React.memo.

### Step 3.1: Identify Expensive Components

**Action:** Analyze component tree to find frequently re-rendering components.

**Use Gemini API to analyze components:**

```python
from google import genai
import os
import glob

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Get all component files
component_files = glob.glob('client/src/components/**/*.tsx', recursive=True)

# Analyze with Gemini
for file_path in component_files[:20]:  # Top 20 files
    with open(file_path, 'r') as f:
        content = f.read()
    
    response = client.models.generate_content(
        model='gemini-2.0-flash-exp',
        contents=f"""Analyze this React component for memoization opportunities:

1. Does it receive props that change frequently?
2. Does it render expensive child components?
3. Does it perform expensive computations?
4. Would React.memo improve performance?

Component file: {file_path}

{content}

Output:
- Should memoize: Yes/No
- Reason: [explanation]
- Custom comparison needed: Yes/No
"""
    )
    
    print(f"\n{file_path}:")
    print(response.text)
```

**Priority Components to Memoize:**

1. **Dashboard Widgets:**
   - `client/src/components/dashboard/v3/KPICard.tsx`
   - `client/src/components/dashboard/v3/RecentActivityWidget.tsx`
   - `client/src/components/dashboard/v3/QuickActionsWidget.tsx`

2. **List Items:**
   - `client/src/components/inventory/InventoryListItem.tsx`
   - `client/src/components/orders/OrderListItem.tsx`
   - `client/src/components/clients/ClientListItem.tsx`

3. **Complex Forms:**
   - `client/src/components/orders/OrderCreatorForm.tsx`
   - `client/src/components/inventory/PurchaseModal.tsx`

**Document:** Create `docs/PERF-002-COMPONENT-ANALYSIS.md` with findings.

### Step 3.2: Add React.memo to Dashboard Widgets

**Action:** Wrap dashboard widgets with React.memo.

**Example - KPICard.tsx:**

```typescript
import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
}

// Before
export function KPICard({ title, value, change, icon }: KPICardProps) {
  return (
    <div className="kpi-card">
      {/* ... */}
    </div>
  );
}

// After
export const KPICard = React.memo(function KPICard({ 
  title, 
  value, 
  change, 
  icon 
}: KPICardProps) {
  return (
    <div className="kpi-card">
      {/* ... */}
    </div>
  );
});
```

**Use Gemini API to generate memoized versions:**

```python
response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=f"""Convert this React component to use React.memo:

{component_content}

Rules:
1. Wrap with React.memo
2. Add display name for debugging
3. Add custom comparison function if needed
4. Preserve all existing functionality
5. Maintain TypeScript types

Generate the complete memoized component.
"""
)
```

### Step 3.3: Add React.memo to List Items

**Action:** Memoize list item components to prevent re-renders when parent list updates.

**Example - InventoryListItem.tsx:**

```typescript
import React from 'react';

interface InventoryListItemProps {
  batch: Batch;
  onSelect?: (id: number) => void;
  isSelected?: boolean;
}

export const InventoryListItem = React.memo(
  function InventoryListItem({ batch, onSelect, isSelected }: InventoryListItemProps) {
    return (
      <div className="inventory-item">
        {/* ... */}
      </div>
    );
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    // Only re-render if batch data or selection state changes
    return (
      prevProps.batch.id === nextProps.batch.id &&
      prevProps.batch.updatedAt === nextProps.batch.updatedAt &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);
```

**Components to memoize:**
- `InventoryListItem.tsx`
- `OrderListItem.tsx`
- `ClientListItem.tsx`
- `VendorListItem.tsx`
- `BatchCard.tsx`

### Step 3.4: Add React.memo to Complex Forms

**Action:** Memoize form components that have expensive validation or rendering logic.

**Example - OrderCreatorForm.tsx:**

```typescript
import React from 'react';

interface OrderCreatorFormProps {
  initialData?: Partial<Order>;
  onSubmit: (data: Order) => void;
  onCancel: () => void;
}

export const OrderCreatorForm = React.memo(
  function OrderCreatorForm({ initialData, onSubmit, onCancel }: OrderCreatorFormProps) {
    // Expensive form logic
    return (
      <form>
        {/* ... */}
      </form>
    );
  }
);
```

**Components to memoize:**
- `OrderCreatorForm.tsx`
- `PurchaseModal.tsx`
- `ClientForm.tsx`
- `ProductForm.tsx`

### Step 3.5: Add Custom Comparison Functions

**Action:** For components with complex props, add custom comparison functions.

**When to use custom comparison:**
- Props include objects or arrays
- Props include callback functions
- Only specific prop changes should trigger re-render

**Example:**

```typescript
export const ComplexComponent = React.memo(
  function ComplexComponent({ data, config, onUpdate }: Props) {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Custom comparison logic
    return (
      prevProps.data.id === nextProps.data.id &&
      prevProps.data.version === nextProps.data.version &&
      JSON.stringify(prevProps.config) === JSON.stringify(nextProps.config)
      // Note: onUpdate function reference doesn't matter
    );
  }
);
```

### Step 3.6: Measure Performance

**Action:** Use React DevTools Profiler to measure re-render performance.

**Create performance test script** `scripts/measure-render-performance.tsx`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { performance } from 'perf_hooks';

async function measureComponentPerformance() {
  console.log('Measuring component render performance...\n');

  // Test 1: Dashboard KPI Cards
  const start1 = performance.now();
  // Render dashboard with 4 KPI cards
  // Trigger parent re-render
  // Measure if KPI cards re-render
  const time1 = performance.now() - start1;
  console.log(`Dashboard KPI Cards: ${time1.toFixed(2)}ms`);

  // Test 2: Inventory List (100 items)
  const start2 = performance.now();
  // Render inventory list with 100 items
  // Update one item
  // Measure how many items re-render
  const time2 = performance.now() - start2;
  console.log(`Inventory List (100 items): ${time2.toFixed(2)}ms`);

  console.log('\nPerformance measurement complete.');
}

measureComponentPerformance();
```

**Document results** in `docs/PERF-002-PERFORMANCE-RESULTS.md`:
- Before React.memo: [render times, re-render counts]
- After React.memo: [render times, re-render counts]
- Performance improvement: [percentage]

### Step 3.7: Update Tests

**Action:** Ensure all component tests still pass with React.memo.

**Note:** React.memo doesn't change component behavior, so tests should pass without changes. If tests fail, investigate why.

```bash
pnpm test
```

### Step 3.8: Verify TypeScript

```bash
pnpm check
```

**Expected:** Zero TypeScript errors.

---

## Phase 4: Completion

**Objective:** Finalize implementation and create completion report.

### Step 4.1: Create Completion Report

**File:** `docs/PERF-002-COMPLETION-REPORT.md`

**Include:**
- Summary of components memoized (count and list)
- Performance measurement results
- Re-render reduction percentage
- Any issues encountered
- Recommendations for future optimization

### Step 4.2: Update Roadmap

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Update PERF-002:
- Change status to `✅ COMPLETE`
- Add completion date: `(Completed: YYYY-MM-DD)`
- Add actual time spent
- Link to completion report

### Step 4.3: Update ACTIVE_SESSIONS.md

Mark your session as complete.

### Step 4.4: Commit and Push

```bash
git add .
git commit -m "Complete PERF-002: Add React.memo to components

- Memoized [X] dashboard widgets
- Memoized [X] list item components
- Memoized [X] complex forms
- Re-render reduction: [X]%
- All tests passing"
git push origin perf-002-react-memo:main
```

**Note:** Push directly to main (no PR needed per protocol).

### Step 4.5: Archive Session

Move session file from `docs/sessions/active/` to `docs/sessions/completed/`.

---

## ⚡ Quick Reference

**Key Files:**
- `client/src/components/dashboard/v3/*.tsx` - Dashboard widgets
- `client/src/components/inventory/*.tsx` - Inventory components
- `client/src/components/orders/*.tsx` - Order components
- `client/src/components/clients/*.tsx` - Client components

**React.memo Pattern:**
```typescript
export const Component = React.memo(
  function Component(props: Props) {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Optional custom comparison
    return prevProps.id === nextProps.id;
  }
);
```

**Key Commands:**
```bash
# Run tests
pnpm test

# Type check
pnpm check

# Run dev server to test performance
pnpm dev
```

---

## 🆘 Troubleshooting

**Issue:** Tests fail after adding React.memo
- **Solution:** Check if tests rely on component reference equality; update tests if needed

**Issue:** Component still re-renders unnecessarily
- **Solution:** Add custom comparison function to check specific props

**Issue:** TypeScript errors with React.memo
- **Solution:** Ensure component props interface is properly typed

**Issue:** Performance doesn't improve
- **Solution:** Verify parent components aren't forcing re-renders; check if props are being recreated on each render

---

## 📊 Expected Deliverables

1. ✅ Component analysis document (`docs/PERF-002-COMPONENT-ANALYSIS.md`)
2. ✅ Memoized dashboard widgets (4+ components)
3. ✅ Memoized list items (5+ components)
4. ✅ Memoized complex forms (3+ components)
5. ✅ Performance measurement results (`docs/PERF-002-PERFORMANCE-RESULTS.md`)
6. ✅ Completion report (`docs/PERF-002-COMPLETION-REPORT.md`)
7. ✅ All tests passing
8. ✅ Zero TypeScript errors
9. ✅ Session archived

---

**Last Updated:** November 30, 2025
