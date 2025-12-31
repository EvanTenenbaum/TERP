# Specification: WS-011 - Quick Customer Creation

**Status:** Approved  
**Priority:** MEDIUM  
**Estimate:** 4h  
**Module:** Sales/Customers  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

During live sales, staff often encounter new buyers who need to be added to the system immediately. The current customer creation flow requires too many fields, blocking the sales process. Staff need a **one-field quick-add** option that creates a customer with just a name, allowing the sale to proceed without friction.

## 2. User Stories

1. **As a salesperson**, I want to create a new customer with just their name, so that I can complete the sale without delay.

2. **As a salesperson**, I want to add customer details later, so that I don't have to gather all information during a busy sale.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Create customer with only name required | Must Have |
| FR-02 | Quick-add accessible from order screen | Must Have |
| FR-03 | Auto-select newly created customer | Must Have |
| FR-04 | Flag for "incomplete profile" | Should Have |
| FR-05 | Reminder to complete profile later | Nice to Have |

## 4. Technical Specification

### 4.1 API Contract

```typescript
customers.quickCreate = adminProcedure
  .input(z.object({
    name: z.string().min(1).max(255)
  }))
  .output(z.object({
    customerId: z.number(),
    customerName: z.string(),
    isIncomplete: z.boolean()
  }))
  .mutation(async ({ input, ctx }) => {
    // Create customer with minimal data
    // Set is_incomplete = true
  });
```

### 4.2 Data Model Changes

```sql
ALTER TABLE customers ADD COLUMN is_profile_incomplete BOOLEAN DEFAULT FALSE;
```

## 5. UI/UX Specification

### 5.1 Wireframe: Quick Add in Order Screen

```
┌─────────────────────────────────────────────────────────────┐
│  Customer: [Search customers...              ▼]             │
│            ┌─────────────────────────────────┐              │
│            │ No results for "John Smith"     │              │
│            │                                 │              │
│            │ [+ Quick Add "John Smith"]      │              │
│            └─────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria

- [ ] Customer created with single field (name)
- [ ] Quick-add option appears when search has no results
- [ ] New customer auto-selected after creation
- [ ] Profile marked as incomplete
- [ ] Full profile editable later

## 6. Testing Requirements

- [ ] Quick create with valid name
- [ ] Quick create with empty name (validation error)
- [ ] Auto-selection after creation
- [ ] Incomplete flag set correctly

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
