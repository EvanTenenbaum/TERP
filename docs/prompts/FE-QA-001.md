# FE-QA-001: Replace key={index} Anti-Pattern (27 Files)

<!-- METADATA (for validation) -->
<!-- TASK_ID: FE-QA-001 -->
<!-- TASK_TITLE: Replace key={index} Anti-Pattern (27 Files) -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-14 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** FE-QA-001
**Estimated Time:** 8h
**Module:** Multiple frontend files

## Context

**Background:**
27 files use `key={index}` in React list rendering. This anti-pattern causes:
- State being mixed between list items
- Incorrect re-renders
- Animation glitches
- Input field values jumping between items

**Goal:**
Replace all `key={index}` with stable, unique identifiers.

**Success Criteria:**
- No `key={index}` or `key={i}` in codebase
- All lists use stable unique keys
- No UI regressions

## Implementation Guide

### Step 1: Find All Instances

```bash
grep -rn "key={.*index\|key={i}" client/src/ --include="*.tsx"
```

### Step 2: For Each Instance, Choose Key Strategy

**Option A: Use ID (preferred)**
```tsx
// BEFORE
{items.map((item, index) => <Item key={index} item={item} />)}

// AFTER
{items.map((item) => <Item key={item.id} item={item} />)}
```

**Option B: Use unique field**
```tsx
// If no id, use another unique field
{items.map((item) => <Item key={item.sku} item={item} />)}
```

**Option C: Generate stable key**
```tsx
// If truly no unique field, generate from data
{items.map((item) => <Item key={`${item.name}-${item.type}`} item={item} />)}
```

### Step 3: Common Files to Fix

Based on QA audit, likely files include:
- Form field arrays
- Table rows
- List components
- Dropdown options
- Tab panels

### Step 4: Test Each Change

For each file fixed:
1. Verify list renders correctly
2. Test adding/removing items
3. Test editing items in list
4. Test sorting/filtering

### Step 5: Add Lint Rule

Add ESLint rule to prevent future issues:
```json
{
  "rules": {
    "react/no-array-index-key": "error"
  }
}
```

## Deliverables

- [ ] Find all 27 files with `key={index}`
- [ ] Replace with stable unique keys
- [ ] Test each component after change
- [ ] Add ESLint rule to prevent regression
- [ ] Document key strategy in coding guidelines

## Quick Reference

**Find all instances:**
```bash
grep -rn "key={.*index\|key={i}" client/src/ --include="*.tsx" --include="*.ts"
```

**ESLint rule:**
```json
"react/no-array-index-key": "error"
```
