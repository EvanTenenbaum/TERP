# Specification: FEATURE-008 - Advanced Filtering & Search

**Status:** Approved  
**Priority:** MEDIUM  
**Estimate:** 24h  
**Module:** Core/UI  
**Dependencies:** FEATURE-011 (Unified Catalogue)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

As inventory grows, users need powerful filtering and search capabilities to quickly find products, batches, orders, and customers. The current basic filtering is insufficient for power users.

## 2. User Stories

1. **As a salesperson**, I want to filter inventory by multiple criteria, so that I can quickly find what a customer needs.

2. **As a manager**, I want to save filter presets, so that I can quickly access common views.

3. **As a user**, I want to search across all entities, so that I can find anything quickly.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Multi-criteria filtering | Must Have |
| FR-02 | Full-text search | Must Have |
| FR-03 | Filter by date ranges | Must Have |
| FR-04 | Filter by numeric ranges (price, quantity) | Must Have |
| FR-05 | Save filter presets | Should Have |
| FR-06 | Global search (cross-entity) | Should Have |
| FR-07 | Recent searches | Nice to Have |
| FR-08 | Search suggestions/autocomplete | Nice to Have |

## 4. Technical Specification

### 4.1 Filter Schema

```typescript
interface FilterConfig {
  entity: 'products' | 'batches' | 'orders' | 'customers' | 'vendors';
  filters: FilterCriteria[];
  sort: { field: string; direction: 'asc' | 'desc' };
  search?: string;
}

interface FilterCriteria {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
  value: any;
}

// Example: Products with THC > 20%, Indica, in stock
const filter: FilterConfig = {
  entity: 'products',
  filters: [
    { field: 'thcPercent', operator: 'gt', value: 20 },
    { field: 'strainType', operator: 'eq', value: 'INDICA' },
    { field: 'totalQuantity', operator: 'gt', value: 0 }
  ],
  sort: { field: 'name', direction: 'asc' }
};
```

### 4.2 API Contracts

```typescript
// Generic filter endpoint
search.filter = adminProcedure
  .input(z.object({
    entity: z.enum(['products', 'batches', 'orders', 'customers', 'vendors']),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'between']),
      value: z.any()
    })),
    sort: z.object({
      field: z.string(),
      direction: z.enum(['asc', 'desc'])
    }).optional(),
    search: z.string().optional(),
    page: z.number().default(1),
    pageSize: z.number().default(50)
  }))
  .output(z.object({
    results: z.array(z.any()),
    total: z.number(),
    page: z.number()
  }))
  .query(async ({ input }) => {});

// Global search
search.global = adminProcedure
  .input(z.object({
    query: z.string().min(2),
    entities: z.array(z.string()).optional() // Limit to specific entities
  }))
  .output(z.object({
    results: z.array(z.object({
      entity: z.string(),
      id: z.number(),
      title: z.string(),
      subtitle: z.string().nullable(),
      url: z.string()
    })),
    total: z.number()
  }))
  .query(async ({ input }) => {});

// Save/load filter presets
search.savePreset = adminProcedure
  .input(z.object({
    name: z.string(),
    entity: z.string(),
    filters: z.array(z.any()),
    sort: z.any().optional()
  }))
  .output(z.object({ presetId: z.number() }))
  .mutation(async ({ input, ctx }) => {});
```

## 5. UI/UX Specification

### 5.1 Wireframe: Advanced Filter Panel

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Advanced Filters                           [Clear All]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search: [Blue Dream________________] 🔍                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ + Add Filter                                        │   │
│  │                                                     │   │
│  │ [Category ▼] [equals ▼] [Flower ▼]           [X]   │   │
│  │ [THC %    ▼] [greater than ▼] [20___]        [X]   │   │
│  │ [Strain   ▼] [equals ▼] [Indica ▼]           [X]   │   │
│  │ [In Stock ▼] [equals ▼] [Yes ▼]              [X]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Sort by: [Name ▼] [A-Z ▼]                                 │
│                                                             │
│  [Save as Preset]                              [Apply]      │
│                                                             │
│  Saved Presets: [High THC Indica ▼] [Load]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria

- [ ] Multiple filters can be combined
- [ ] All filter operators work correctly
- [ ] Search works across text fields
- [ ] Filter presets can be saved/loaded
- [ ] Global search finds results across entities

## 6. Testing Requirements

- [ ] Filter operator accuracy
- [ ] Search relevance
- [ ] Preset save/load
- [ ] Performance with large datasets

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
