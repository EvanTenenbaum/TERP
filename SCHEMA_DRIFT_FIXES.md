# Schema Drift Fix Recommendations

**Generated:** 12/3/2025, 5:41:11 AM
**Based on validation:** 12/3/2025, 5:41:03 AM

## Summary

Total issues found: 2240

### Issues by Severity

- **High:** 1003
- **Medium:** 1237

## Critical Tables (Priority Fixes)

These tables must be fixed before Phase 2 seeding can proceed.

### ✅ inventory_movements

No issues found.

### 🔴 order_status_history

**Issues:** 12

#### DataType Issues (6)

**Column:** `id`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
id: int('id'),
```

---

**Column:** `order_id`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
order_id: int('order_id'),
```

---

**Column:** `fulfillmentStatus`

- **Problem:** Data type mismatch: DB="enum" vs Drizzle="string"
- **Database Value:** `"enum"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to enum
fulfillmentStatus: enum('fulfillmentStatus'),
```

---

**Column:** `changed_by`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
changed_by: int('changed_by'),
```

---

**Column:** `changed_at`

- **Problem:** Data type mismatch: DB="timestamp" vs Drizzle="date"
- **Database Value:** `"timestamp"`
- **Drizzle Value:** `"date"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from date to timestamp
changed_at: timestamp('changed_at'),
```

---

**Column:** `notes`

- **Problem:** Data type mismatch: DB="text" vs Drizzle="string"
- **Database Value:** `"text"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to text
notes: text('notes'),
```

---

#### Nullable Issues (6)

**Column:** `id`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to id
```

---

**Column:** `order_id`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to order_id
```

---

**Column:** `fulfillmentStatus`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to fulfillmentStatus
```

---

**Column:** `changed_by`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to changed_by
```

---

**Column:** `changed_at`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to changed_at
```

---

**Column:** `notes`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to notes
```

---

### 🔴 invoices

**Issues:** 34

#### DataType Issues (14)

**Column:** `id`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
id: int('id'),
```

---

**Column:** `customerId`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
customerId: int('customerId'),
```

---

**Column:** `subtotal`

- **Problem:** Data type mismatch: DB="decimal" vs Drizzle="string"
- **Database Value:** `"decimal"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to decimal
subtotal: decimal('subtotal'),
```

---

**Column:** `taxAmount`

- **Problem:** Data type mismatch: DB="decimal" vs Drizzle="string"
- **Database Value:** `"decimal"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to decimal
taxAmount: decimal('taxAmount'),
```

---

**Column:** `discountAmount`

- **Problem:** Data type mismatch: DB="decimal" vs Drizzle="string"
- **Database Value:** `"decimal"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to decimal
discountAmount: decimal('discountAmount'),
```

---

**Column:** `totalAmount`

- **Problem:** Data type mismatch: DB="decimal" vs Drizzle="string"
- **Database Value:** `"decimal"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to decimal
totalAmount: decimal('totalAmount'),
```

---

**Column:** `amountPaid`

- **Problem:** Data type mismatch: DB="decimal" vs Drizzle="string"
- **Database Value:** `"decimal"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to decimal
amountPaid: decimal('amountPaid'),
```

---

**Column:** `amountDue`

- **Problem:** Data type mismatch: DB="decimal" vs Drizzle="string"
- **Database Value:** `"decimal"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to decimal
amountDue: decimal('amountDue'),
```

---

**Column:** `status`

- **Problem:** Data type mismatch: DB="enum" vs Drizzle="string"
- **Database Value:** `"enum"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to enum
status: enum('status'),
```

---

**Column:** `notes`

- **Problem:** Data type mismatch: DB="text" vs Drizzle="string"
- **Database Value:** `"text"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to text
notes: text('notes'),
```

---

**Column:** `referenceId`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
referenceId: int('referenceId'),
```

---

**Column:** `createdBy`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
createdBy: int('createdBy'),
```

---

**Column:** `createdAt`

- **Problem:** Data type mismatch: DB="timestamp" vs Drizzle="date"
- **Database Value:** `"timestamp"`
- **Drizzle Value:** `"date"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from date to timestamp
createdAt: timestamp('createdAt'),
```

---

**Column:** `updatedAt`

- **Problem:** Data type mismatch: DB="timestamp" vs Drizzle="date"
- **Database Value:** `"timestamp"`
- **Drizzle Value:** `"date"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from date to timestamp
updatedAt: timestamp('updatedAt'),
```

---

#### Nullable Issues (19)

**Column:** `id`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to id
```

---

**Column:** `invoiceNumber`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to invoiceNumber
```

---

**Column:** `customerId`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to customerId
```

---

**Column:** `invoiceDate`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to invoiceDate
```

---

**Column:** `dueDate`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to dueDate
```

---

**Column:** `subtotal`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to subtotal
```

---

**Column:** `taxAmount`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to taxAmount
```

---

**Column:** `discountAmount`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to discountAmount
```

---

**Column:** `totalAmount`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to totalAmount
```

---

**Column:** `amountPaid`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to amountPaid
```

---

**Column:** `amountDue`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to amountDue
```

---

**Column:** `status`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to status
```

---

**Column:** `paymentTerms`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to paymentTerms
```

---

**Column:** `notes`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to notes
```

---

**Column:** `referenceType`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to referenceType
```

---

**Column:** `referenceId`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to referenceId
```

---

**Column:** `createdBy`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to createdBy
```

---

**Column:** `createdAt`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to createdAt
```

---

**Column:** `updatedAt`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to updatedAt
```

---

#### Extra Issues (1)

**Column:** `deletedAt`

- **Problem:** Column "deletedAt" exists in Drizzle schema but not in database
- **Database Value:** `null`
- **Drizzle Value:** `"exists"`
- **Severity:** Medium

---

### ✅ ledger_entries

No issues found.

### 🔴 payments

**Issues:** 33

#### DataType Issues (14)

**Column:** `id`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
id: int('id'),
```

---

**Column:** `paymentType`

- **Problem:** Data type mismatch: DB="enum" vs Drizzle="string"
- **Database Value:** `"enum"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to enum
paymentType: enum('paymentType'),
```

---

**Column:** `amount`

- **Problem:** Data type mismatch: DB="decimal" vs Drizzle="string"
- **Database Value:** `"decimal"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to decimal
amount: decimal('amount'),
```

---

**Column:** `paymentMethod`

- **Problem:** Data type mismatch: DB="enum" vs Drizzle="string"
- **Database Value:** `"enum"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to enum
paymentMethod: enum('paymentMethod'),
```

---

**Column:** `bankAccountId`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
bankAccountId: int('bankAccountId'),
```

---

**Column:** `customerId`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
customerId: int('customerId'),
```

---

**Column:** `vendorId`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
vendorId: int('vendorId'),
```

---

**Column:** `invoiceId`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
invoiceId: int('invoiceId'),
```

---

**Column:** `billId`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
billId: int('billId'),
```

---

**Column:** `notes`

- **Problem:** Data type mismatch: DB="text" vs Drizzle="string"
- **Database Value:** `"text"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to text
notes: text('notes'),
```

---

**Column:** `reconciledAt`

- **Problem:** Data type mismatch: DB="timestamp" vs Drizzle="date"
- **Database Value:** `"timestamp"`
- **Drizzle Value:** `"date"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from date to timestamp
reconciledAt: timestamp('reconciledAt'),
```

---

**Column:** `createdBy`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
createdBy: int('createdBy'),
```

---

**Column:** `createdAt`

- **Problem:** Data type mismatch: DB="timestamp" vs Drizzle="date"
- **Database Value:** `"timestamp"`
- **Drizzle Value:** `"date"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from date to timestamp
createdAt: timestamp('createdAt'),
```

---

**Column:** `updatedAt`

- **Problem:** Data type mismatch: DB="timestamp" vs Drizzle="date"
- **Database Value:** `"timestamp"`
- **Drizzle Value:** `"date"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from date to timestamp
updatedAt: timestamp('updatedAt'),
```

---

#### Nullable Issues (18)

**Column:** `id`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to id
```

---

**Column:** `paymentNumber`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to paymentNumber
```

---

**Column:** `paymentType`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to paymentType
```

---

**Column:** `paymentDate`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to paymentDate
```

---

**Column:** `amount`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to amount
```

---

**Column:** `paymentMethod`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to paymentMethod
```

---

**Column:** `referenceNumber`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to referenceNumber
```

---

**Column:** `bankAccountId`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to bankAccountId
```

---

**Column:** `customerId`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to customerId
```

---

**Column:** `vendorId`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to vendorId
```

---

**Column:** `invoiceId`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to invoiceId
```

---

**Column:** `billId`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to billId
```

---

**Column:** `notes`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to notes
```

---

**Column:** `isReconciled`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to isReconciled
```

---

**Column:** `reconciledAt`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to reconciledAt
```

---

**Column:** `createdBy`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to createdBy
```

---

**Column:** `createdAt`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to createdAt
```

---

**Column:** `updatedAt`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to updatedAt
```

---

#### Extra Issues (1)

**Column:** `deletedAt`

- **Problem:** Column "deletedAt" exists in Drizzle schema but not in database
- **Database Value:** `null`
- **Drizzle Value:** `"exists"`
- **Severity:** Medium

---

### 🔴 client_activity

**Issues:** 11

#### DataType Issues (5)

**Column:** `id`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
id: int('id'),
```

---

**Column:** `client_id`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
client_id: int('client_id'),
```

---

**Column:** `user_id`

- **Problem:** Data type mismatch: DB="int" vs Drizzle="number"
- **Database Value:** `"int"`
- **Drizzle Value:** `"number"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from number to int
user_id: int('user_id'),
```

---

**Column:** `activity_type`

- **Problem:** Data type mismatch: DB="enum" vs Drizzle="string"
- **Database Value:** `"enum"`
- **Drizzle Value:** `"string"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from string to enum
activity_type: enum('activity_type'),
```

---

**Column:** `created_at`

- **Problem:** Data type mismatch: DB="timestamp" vs Drizzle="date"
- **Database Value:** `"timestamp"`
- **Drizzle Value:** `"date"`
- **Severity:** High

**Recommended Fix:**
```typescript
// Update column type from date to timestamp
created_at: timestamp('created_at'),
```

---

#### Nullable Issues (6)

**Column:** `id`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to id
```

---

**Column:** `client_id`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to client_id
```

---

**Column:** `user_id`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to user_id
```

---

**Column:** `activity_type`

- **Problem:** Nullable mismatch: DB=0 vs Drizzle=false
- **Database Value:** `0`
- **Drizzle Value:** `false`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to activity_type
```

---

**Column:** `metadata`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to metadata
```

---

**Column:** `created_at`

- **Problem:** Nullable mismatch: DB=1 vs Drizzle=true
- **Database Value:** `1`
- **Drizzle Value:** `true`
- **Severity:** Medium

**Recommended Fix:**
```typescript
// Add .notNull() to created_at
```

---

## Other Tables (2150 issues)

These issues should be addressed after critical tables are fixed.

### __drizzle_migrations (3 issues)

- **id**: Column "id" exists in database but not in Drizzle schema
- **hash**: Column "hash" exists in database but not in Drizzle schema
- **created_at**: Column "created_at" exists in database but not in Drizzle schema

### accounts (17 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **accountNumber**: Nullable mismatch: DB=0 vs Drizzle=false
- **accountName**: Nullable mismatch: DB=0 vs Drizzle=false
- **accountType**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 12 more issues_

### alert_configurations (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **user_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **alert_type**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 17 more issues_

### auditLogs (16 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **actorId**: Data type mismatch: DB="int" vs Drizzle="number"
- **actorId**: Nullable mismatch: DB=0 vs Drizzle=false
- **entity**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 11 more issues_

### bankAccounts (19 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **accountName**: Nullable mismatch: DB=0 vs Drizzle=false
- **accountNumber**: Nullable mismatch: DB=0 vs Drizzle=false
- **bankName**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 14 more issues_

### bankTransactions (19 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **bankAccountId**: Data type mismatch: DB="int" vs Drizzle="number"
- **bankAccountId**: Nullable mismatch: DB=0 vs Drizzle=false
- **transactionDate**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 14 more issues_

### batchLocations (14 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batchId**: Data type mismatch: DB="int" vs Drizzle="number"
- **batchId**: Nullable mismatch: DB=0 vs Drizzle=false
- **site**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 9 more issues_

### batch_status_history (14 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batchId**: Data type mismatch: DB="int" vs Drizzle="number"
- **batchId**: Nullable mismatch: DB=0 vs Drizzle=false
- **fromStatusId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 9 more issues_

### batches (45 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **code**: Nullable mismatch: DB=0 vs Drizzle=false
- **sku**: Nullable mismatch: DB=0 vs Drizzle=false
- **productId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 40 more issues_

### billLineItems (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **billId**: Data type mismatch: DB="int" vs Drizzle="number"
- **billId**: Nullable mismatch: DB=0 vs Drizzle=false
- **productId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 17 more issues_

### bills (33 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **billNumber**: Nullable mismatch: DB=0 vs Drizzle=false
- **vendorId**: Data type mismatch: DB="int" vs Drizzle="number"
- **vendorId**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 28 more issues_

### brands (11 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **vendorId**: Data type mismatch: DB="int" vs Drizzle="number"
- **vendorId**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 6 more issues_

### calendar_event_attachments (14 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **event_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **event_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **filename**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 9 more issues_

### calendar_event_history (18 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **event_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **event_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **change_type**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 13 more issues_

### calendar_event_participants (18 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **event_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **event_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 13 more issues_

### calendar_event_permissions (14 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **event_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **event_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **grant_type**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 9 more issues_

### calendar_events (50 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **title**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 45 more issues_

### calendar_recurrence_instances (23 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **parent_event_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **parent_event_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **instance_date**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 18 more issues_

### calendar_recurrence_rules (24 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **frequency**: Data type mismatch: DB="enum" vs Drizzle="string"
- **frequency**: Nullable mismatch: DB=0 vs Drizzle=false
- **interval**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 19 more issues_

### calendar_reminders (19 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **event_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **event_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 14 more issues_

### calendar_views (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **user_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 7 more issues_

### categories (11 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 6 more issues_

### client_catalog_views (10 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 5 more issues_

### client_communications (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **communicationType**: Column "communicationType" exists in database but not in Drizzle schema

_... and 10 more issues_

### client_credit_limits (32 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **credit_limit**: Data type mismatch: DB="decimal" vs Drizzle="string"

_... and 27 more issues_

### client_draft_interests (8 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batch_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 3 more issues_

### client_interest_list_items (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **interest_list_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **interest_list_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batch_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 10 more issues_

### client_interest_lists (27 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **submitted_at**: Data type mismatch: DB="timestamp" vs Drizzle="date"

_... and 22 more issues_

### client_meeting_history (21 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **event_id**: Column "event_id" exists in database but not in Drizzle schema

_... and 16 more issues_

### client_needs (38 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **strain**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 33 more issues_

### client_notes (8 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **note_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 3 more issues_

### client_price_alerts (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batch_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 10 more issues_

### client_transactions (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **transaction_type**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 17 more issues_

### clients (41 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **teri_code**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **email**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 36 more issues_

### cogsHistory (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batchId**: Data type mismatch: DB="int" vs Drizzle="number"
- **batchId**: Nullable mismatch: DB=0 vs Drizzle=false
- **oldCogs**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 10 more issues_

### cogs_rules (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 17 more issues_

### comment_mentions (10 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **comment_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **comment_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **mentioned_user_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 5 more issues_

### comments (18 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **commentable_type**: Nullable mismatch: DB=0 vs Drizzle=false
- **commentable_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **commentable_id**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 13 more issues_

### creditApplications (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **creditId**: Data type mismatch: DB="int" vs Drizzle="number"
- **creditId**: Nullable mismatch: DB=0 vs Drizzle=false
- **invoiceId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 10 more issues_

### credit_audit_log (19 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **event_type**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 14 more issues_

### credit_signal_history (29 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **revenue_momentum**: Data type mismatch: DB="decimal" vs Drizzle="string"

_... and 24 more issues_

### credit_system_settings (34 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **revenue_momentum_weight**: Data type mismatch: DB="int" vs Drizzle="number"
- **revenue_momentum_weight**: Nullable mismatch: DB=0 vs Drizzle=false
- **cash_collection_weight**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 29 more issues_

### credits (23 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **creditNumber**: Nullable mismatch: DB=0 vs Drizzle=false
- **clientId**: Data type mismatch: DB="int" vs Drizzle="number"
- **clientId**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 18 more issues_

### dashboard_kpi_configs (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **role**: Data type mismatch: DB="enum" vs Drizzle="string"
- **role**: Nullable mismatch: DB=0 vs Drizzle=false
- **kpiType**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 7 more issues_

### dashboard_widget_layouts (19 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **userId**: Data type mismatch: DB="int" vs Drizzle="number"
- **userId**: Nullable mismatch: DB=1 vs Drizzle=true
- **role**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 14 more issues_

### deployments (27 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **commitSha**: Nullable mismatch: DB=0 vs Drizzle=false
- **commitMessage**: Data type mismatch: DB="text" vs Drizzle="string"
- **commitMessage**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 22 more issues_

### expenseCategories (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **categoryName**: Nullable mismatch: DB=0 vs Drizzle=false
- **parentCategoryId**: Data type mismatch: DB="int" vs Drizzle="number"
- **parentCategoryId**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 7 more issues_

### expenses (33 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **expenseNumber**: Nullable mismatch: DB=0 vs Drizzle=false
- **expenseDate**: Nullable mismatch: DB=0 vs Drizzle=false
- **categoryId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 28 more issues_

### fiscalPeriods (17 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **periodName**: Nullable mismatch: DB=0 vs Drizzle=false
- **startDate**: Nullable mismatch: DB=0 vs Drizzle=false
- **endDate**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 12 more issues_

### freeform_notes (17 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **userId**: Data type mismatch: DB="int" vs Drizzle="number"
- **userId**: Nullable mismatch: DB=0 vs Drizzle=false
- **title**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 12 more issues_

### grades (13 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 8 more issues_

### inbox_items (25 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **user_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **source_type**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 20 more issues_

### intake_session_batches (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **intake_session_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **intake_session_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batch_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 17 more issues_

### intake_sessions (30 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **session_number**: Nullable mismatch: DB=0 vs Drizzle=false
- **vendor_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **vendor_id**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 25 more issues_

### inventoryAlerts (28 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **inventoryAlertType**: Column "inventoryAlertType" exists in database but not in Drizzle schema
- **batchId**: Data type mismatch: DB="int" vs Drizzle="number"
- **batchId**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 23 more issues_

### inventoryMovements (18 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batchId**: Data type mismatch: DB="int" vs Drizzle="number"
- **batchId**: Nullable mismatch: DB=0 vs Drizzle=false
- **inventoryMovementType**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 13 more issues_

### inventoryViews (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **filters**: Nullable mismatch: DB=0 vs Drizzle=false
- **createdBy**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 7 more issues_

### invoiceLineItems (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **invoiceId**: Data type mismatch: DB="int" vs Drizzle="number"
- **invoiceId**: Nullable mismatch: DB=0 vs Drizzle=false
- **productId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 17 more issues_

### leaderboard_configurations (9 issues)

- **id**: Column "id" exists in database but not in Drizzle schema
- **user_id**: Column "user_id" exists in database but not in Drizzle schema
- **widget_key**: Column "widget_key" exists in database but not in Drizzle schema
- **metric_id**: Column "metric_id" exists in database but not in Drizzle schema
- **time_period**: Column "time_period" exists in database but not in Drizzle schema

_... and 4 more issues_

### leaderboard_scores (40 issues)

- **id**: Column "id" exists in database but not in Drizzle schema
- **client_id**: Column "client_id" exists in database but not in Drizzle schema
- **calculated_at**: Column "calculated_at" exists in database but not in Drizzle schema
- **total_revenue**: Column "total_revenue" exists in database but not in Drizzle schema
- **total_revenue_ytd**: Column "total_revenue_ytd" exists in database but not in Drizzle schema

_... and 35 more issues_

### ledgerEntries (28 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **entryNumber**: Nullable mismatch: DB=0 vs Drizzle=false
- **entryDate**: Nullable mismatch: DB=0 vs Drizzle=false
- **accountId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 23 more issues_

### locations (13 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **site**: Nullable mismatch: DB=0 vs Drizzle=false
- **zone**: Nullable mismatch: DB=1 vs Drizzle=true
- **rack**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 8 more issues_

### lots (13 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **code**: Nullable mismatch: DB=0 vs Drizzle=false
- **vendorId**: Data type mismatch: DB="int" vs Drizzle="number"
- **vendorId**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 8 more issues_

### match_records (28 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_need_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_need_id**: Nullable mismatch: DB=1 vs Drizzle=true
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 23 more issues_

### note_activity (11 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **noteId**: Data type mismatch: DB="int" vs Drizzle="number"
- **noteId**: Nullable mismatch: DB=0 vs Drizzle=false
- **userId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 6 more issues_

### note_comments (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **noteId**: Data type mismatch: DB="int" vs Drizzle="number"
- **noteId**: Nullable mismatch: DB=0 vs Drizzle=false
- **userId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 10 more issues_

### order_audit_log (11 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **order_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **order_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **action**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 6 more issues_

### order_line_items (32 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **order_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **order_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batch_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 27 more issues_

### orders (70 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **order_number**: Nullable mismatch: DB=0 vs Drizzle=false
- **orderType**: Data type mismatch: DB="enum" vs Drizzle="string"
- **orderType**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 65 more issues_

### paymentHistory (16 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batchId**: Data type mismatch: DB="int" vs Drizzle="number"
- **batchId**: Nullable mismatch: DB=0 vs Drizzle=false
- **vendorId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 11 more issues_

### paymentMethods (14 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **code**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"

_... and 9 more issues_

### permissions (8 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 3 more issues_

### pricing_defaults (10 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **category**: Column "category" exists in database but not in Drizzle schema
- **default_margin_percent**: Data type mismatch: DB="decimal" vs Drizzle="string"
- **default_margin_percent**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 5 more issues_

### pricing_profiles (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 7 more issues_

### pricing_rules (19 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 14 more issues_

### productMedia (13 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **productId**: Data type mismatch: DB="int" vs Drizzle="number"
- **productId**: Nullable mismatch: DB=0 vs Drizzle=false
- **url**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 8 more issues_

### productSynonyms (7 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **productId**: Data type mismatch: DB="int" vs Drizzle="number"
- **productId**: Nullable mismatch: DB=0 vs Drizzle=false
- **synonym**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 2 more issues_

### productTags (9 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **productId**: Data type mismatch: DB="int" vs Drizzle="number"
- **productId**: Nullable mismatch: DB=0 vs Drizzle=false
- **tagId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 4 more issues_

### products (17 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **brandId**: Data type mismatch: DB="int" vs Drizzle="number"
- **brandId**: Nullable mismatch: DB=0 vs Drizzle=false
- **strainId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 12 more issues_

### products_with_strain_family (16 issues)

- **id**: Column "id" exists in database but not in Drizzle schema
- **brandId**: Column "brandId" exists in database but not in Drizzle schema
- **strainId**: Column "strainId" exists in database but not in Drizzle schema
- **nameCanonical**: Column "nameCanonical" exists in database but not in Drizzle schema
- **category**: Column "category" exists in database but not in Drizzle schema

_... and 11 more issues_

### recurring_orders (25 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **frequency**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 20 more issues_

### returns (14 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **order_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **order_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **items**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 9 more issues_

### role_permissions (8 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **role_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **role_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **permission_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 3 more issues_

### roles (11 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 6 more issues_

### sales (23 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batchId**: Data type mismatch: DB="int" vs Drizzle="number"
- **batchId**: Nullable mismatch: DB=0 vs Drizzle=false
- **productId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 18 more issues_

### salesSheetVersions (18 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **templateId**: Data type mismatch: DB="int" vs Drizzle="number"
- **templateId**: Nullable mismatch: DB=0 vs Drizzle=false
- **versionNumber**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 13 more issues_

### sales_sheet_history (17 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **created_by**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 12 more issues_

### sales_sheet_templates (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 17 more issues_

### sampleAllocations (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **clientId**: Data type mismatch: DB="int" vs Drizzle="number"
- **clientId**: Nullable mismatch: DB=0 vs Drizzle=false
- **monthYear**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 7 more issues_

### sampleRequests (33 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **clientId**: Data type mismatch: DB="int" vs Drizzle="number"
- **clientId**: Nullable mismatch: DB=0 vs Drizzle=false
- **requestedBy**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 28 more issues_

### sample_inventory_log (16 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **batch_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **batch_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **order_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 11 more issues_

### scratch_pad_notes (13 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **userId**: Data type mismatch: DB="int" vs Drizzle="number"
- **userId**: Nullable mismatch: DB=0 vs Drizzle=false
- **content**: Data type mismatch: DB="text" vs Drizzle="string"

_... and 8 more issues_

### sequences (10 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **prefix**: Nullable mismatch: DB=0 vs Drizzle=false
- **currentValue**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 5 more issues_

### strains (18 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **standardizedName**: Nullable mismatch: DB=0 vs Drizzle=false
- **aliases**: Data type mismatch: DB="text" vs Drizzle="string"

_... and 13 more issues_

### subcategories (13 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **categoryId**: Data type mismatch: DB="int" vs Drizzle="number"
- **categoryId**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 8 more issues_

### tagGroupMembers (8 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **groupId**: Data type mismatch: DB="int" vs Drizzle="number"
- **groupId**: Nullable mismatch: DB=0 vs Drizzle=false
- **tagId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 3 more issues_

### tagGroups (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 7 more issues_

### tagHierarchy (8 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **parentTagId**: Data type mismatch: DB="int" vs Drizzle="number"
- **parentTagId**: Nullable mismatch: DB=0 vs Drizzle=false
- **childTagId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 3 more issues_

### tags (11 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **standardizedName**: Nullable mismatch: DB=0 vs Drizzle=false
- **category**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 6 more issues_

### todo_list_members (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **list_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **list_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 7 more issues_

### todo_lists (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **description**: Data type mismatch: DB="text" vs Drizzle="string"
- **description**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 7 more issues_

### todo_task_activity (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **task_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **task_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 10 more issues_

### todo_tasks (28 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **list_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **list_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **title**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 23 more issues_

### transactionLinks (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **parentTransactionId**: Data type mismatch: DB="int" vs Drizzle="number"
- **parentTransactionId**: Nullable mismatch: DB=0 vs Drizzle=false
- **childTransactionId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 10 more issues_

### transactions (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **transactionNumber**: Nullable mismatch: DB=0 vs Drizzle=false
- **transactionType**: Data type mismatch: DB="enum" vs Drizzle="string"
- **transactionType**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 17 more issues_

### userDashboardPreferences (10 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **userId**: Data type mismatch: DB="int" vs Drizzle="number"
- **userId**: Nullable mismatch: DB=0 vs Drizzle=false
- **activeLayout**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 5 more issues_

### user_permission_overrides (10 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **permission_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **permission_id**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 5 more issues_

### user_roles (8 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **user_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **role_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **role_id**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 3 more issues_

### users (15 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **openId**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Data type mismatch: DB="text" vs Drizzle="string"
- **name**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 10 more issues_

### vendorNotes (12 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **vendorId**: Data type mismatch: DB="int" vs Drizzle="number"
- **vendorId**: Nullable mismatch: DB=0 vs Drizzle=false
- **userId**: Data type mismatch: DB="int" vs Drizzle="number"

_... and 7 more issues_

### vendor_supply (33 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **vendor_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **vendor_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **strain**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 28 more issues_

### vendors (13 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **contactName**: Nullable mismatch: DB=1 vs Drizzle=true
- **contactEmail**: Nullable mismatch: DB=1 vs Drizzle=true

_... and 8 more issues_

### vip_portal_auth (22 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **email**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 17 more issues_

### vip_portal_configurations (25 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **client_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **client_id**: Nullable mismatch: DB=0 vs Drizzle=false
- **module_dashboard_enabled**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 20 more issues_

### workflow_statuses (13 issues)

- **id**: Data type mismatch: DB="int" vs Drizzle="number"
- **id**: Nullable mismatch: DB=0 vs Drizzle=false
- **name**: Nullable mismatch: DB=0 vs Drizzle=false
- **slug**: Nullable mismatch: DB=0 vs Drizzle=false
- **color**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 8 more issues_

## Implementation Checklist

- [ ] Review all critical table fixes above
- [ ] Apply fixes to `drizzle/schema.ts`
- [ ] Add comment: `// SCHEMA DRIFT FIX: Updated to match actual database structure (SEED-001)`
- [ ] Run `pnpm validate:schema:fixes` to verify
- [ ] Commit changes
- [ ] Proceed to Phase 2 seeding

