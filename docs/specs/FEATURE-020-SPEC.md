# Specification: FEATURE-020 - Tags System Revamp

**Status:** Approved  
**Priority:** MEDIUM  
**Estimate:** 20h  
**Module:** Core/Tags  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The current tagging system is inconsistent and underutilized. A revamped, unified tagging system would enable:
- Flexible categorization across all entities
- Better filtering and search
- Custom workflows based on tags

## 2. User Stories

1. **As a user**, I want to add tags to any entity, so that I can organize and filter data my way.

2. **As a manager**, I want to define standard tags, so that the team uses consistent terminology.

3. **As a user**, I want to filter by tags, so that I can quickly find related items.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Add/remove tags on any entity | Must Have |
| FR-02 | Tag management (create, edit, delete) | Must Have |
| FR-03 | Tag colors/icons | Should Have |
| FR-04 | Tag categories/groups | Should Have |
| FR-05 | Filter by tags | Must Have |
| FR-06 | Tag suggestions (autocomplete) | Should Have |
| FR-07 | Bulk tagging | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model

```sql
-- Tags master table
CREATE TABLE tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280', -- Hex color
  icon VARCHAR(50), -- Icon name
  category VARCHAR(50), -- Group tags
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- System tags can't be deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category)
);

-- Polymorphic tag assignments
CREATE TABLE tag_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tag_id INT NOT NULL REFERENCES tags(id),
  entity_type VARCHAR(50) NOT NULL, -- 'product', 'batch', 'order', 'customer', 'vendor'
  entity_id INT NOT NULL,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tag_entity (tag_id, entity_type, entity_id),
  INDEX idx_entity (entity_type, entity_id)
);
```

### 4.2 API Contracts

```typescript
// Tag CRUD
tags.create = adminProcedure
  .input(z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    category: z.string().optional(),
    description: z.string().optional()
  }))
  .output(z.object({ tagId: z.number(), slug: z.string() }))
  .mutation(async ({ input }) => {});

tags.list = adminProcedure
  .input(z.object({
    category: z.string().optional(),
    search: z.string().optional()
  }))
  .output(z.array(z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    color: z.string(),
    category: z.string().nullable(),
    usageCount: z.number()
  })))
  .query(async ({ input }) => {});

// Assign/remove tags
tags.assign = adminProcedure
  .input(z.object({
    tagId: z.number(),
    entityType: z.enum(['product', 'batch', 'order', 'customer', 'vendor']),
    entityId: z.number()
  }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input, ctx }) => {});

tags.remove = adminProcedure
  .input(z.object({
    tagId: z.number(),
    entityType: z.string(),
    entityId: z.number()
  }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input }) => {});

// Get tags for entity
tags.getForEntity = adminProcedure
  .input(z.object({
    entityType: z.string(),
    entityId: z.number()
  }))
  .output(z.array(z.object({
    id: z.number(),
    name: z.string(),
    color: z.string()
  })))
  .query(async ({ input }) => {});
```

## 5. UI/UX Specification

### 5.1 Wireframe: Tag Input Component

```
┌─────────────────────────────────────────────────────────────┐
│  Tags: [VIP] [Premium] [Indoor] [+ Add Tag]                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Search or create tag: [Org___]                      │   │
│  │                                                     │   │
│  │ Suggestions:                                        │   │
│  │ • Organic                                           │   │
│  │ • Oregon Grown                                      │   │
│  │ ─────────────────────────────────────────           │   │
│  │ + Create "Org" as new tag                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria

- [ ] Tags can be created with name and color
- [ ] Tags can be assigned to any entity
- [ ] Tags display on entity views
- [ ] Filter by tag works
- [ ] Tag autocomplete works

## 6. Testing Requirements

- [ ] Tag CRUD operations
- [ ] Tag assignment/removal
- [ ] Filter by tag accuracy
- [ ] Autocomplete suggestions

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
