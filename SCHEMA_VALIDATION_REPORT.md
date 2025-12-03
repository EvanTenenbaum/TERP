# Schema Validation Report

**Generated:** 12/3/2025, 5:44:01 AM

## Executive Summary

- **Total Tables:** 119
- **Total Columns:** 1311
- **Total Issues:** 2240

### Issues by Severity

- 🔴 **Critical:** 0
- 🟠 **High:** 1003
- 🟡 **Medium:** 1237
- ⚪ **Low:** 0

## Critical Tables (Seeding Priority)

These tables must be fixed before Phase 2 seeding can proceed.

### inventoryMovements

**Issues:** 18

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `batchId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `batchId`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="enum" vs Drizzle="string"
  - Column: `inventoryMovementType`
  - DB Value: `"enum"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `inventoryMovementType`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `quantityChange`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `quantityBefore`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `quantityAfter`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `referenceType`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `referenceId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `referenceId`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="text" vs Drizzle="string"
  - Column: `reason`
  - DB Value: `"text"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `reason`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `performedBy`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `performedBy`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `createdAt`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `createdAt`
  - DB Value: `0`
  - Drizzle Value: `false`

### order_status_history

**Issues:** 12

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `order_id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `order_id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="enum" vs Drizzle="string"
  - Column: `fulfillmentStatus`
  - DB Value: `"enum"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `fulfillmentStatus`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `changed_by`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `changed_by`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `changed_at`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `changed_at`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="text" vs Drizzle="string"
  - Column: `notes`
  - DB Value: `"text"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `notes`
  - DB Value: `1`
  - Drizzle Value: `true`

### invoices

**Issues:** 34

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `invoiceNumber`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `customerId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `customerId`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `invoiceDate`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `dueDate`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `subtotal`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `subtotal`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `taxAmount`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `taxAmount`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `discountAmount`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `discountAmount`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `totalAmount`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `totalAmount`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `amountPaid`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `amountPaid`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `amountDue`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `amountDue`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="enum" vs Drizzle="string"
  - Column: `status`
  - DB Value: `"enum"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `status`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `paymentTerms`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="text" vs Drizzle="string"
  - Column: `notes`
  - DB Value: `"text"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `notes`
  - DB Value: `1`
  - Drizzle Value: `true`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `referenceType`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `referenceId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `referenceId`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `createdBy`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `createdBy`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `createdAt`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `createdAt`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `updatedAt`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `updatedAt`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Extra** (Medium): Column "deletedAt" exists in Drizzle schema but not in database
  - Column: `deletedAt`
  - DB Value: `null`
  - Drizzle Value: `"exists"`

### ledgerEntries

**Issues:** 28

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `entryNumber`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `entryDate`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `accountId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `accountId`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `debit`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `debit`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `credit`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `credit`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="text" vs Drizzle="string"
  - Column: `description`
  - DB Value: `"text"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `description`
  - DB Value: `1`
  - Drizzle Value: `true`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `referenceType`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `referenceId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `referenceId`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `fiscalPeriodId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `fiscalPeriodId`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `isManual`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `isPosted`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `postedAt`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `postedAt`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `postedBy`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `postedBy`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `createdBy`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `createdBy`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `createdAt`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `createdAt`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Extra** (Medium): Column "deletedAt" exists in Drizzle schema but not in database
  - Column: `deletedAt`
  - DB Value: `null`
  - Drizzle Value: `"exists"`

### payments

**Issues:** 33

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `paymentNumber`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="enum" vs Drizzle="string"
  - Column: `paymentType`
  - DB Value: `"enum"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `paymentType`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `paymentDate`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="decimal" vs Drizzle="string"
  - Column: `amount`
  - DB Value: `"decimal"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `amount`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="enum" vs Drizzle="string"
  - Column: `paymentMethod`
  - DB Value: `"enum"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `paymentMethod`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `referenceNumber`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `bankAccountId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `bankAccountId`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `customerId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `customerId`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `vendorId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `vendorId`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `invoiceId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `invoiceId`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `billId`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `billId`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="text" vs Drizzle="string"
  - Column: `notes`
  - DB Value: `"text"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `notes`
  - DB Value: `1`
  - Drizzle Value: `true`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `isReconciled`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `reconciledAt`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `reconciledAt`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `createdBy`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `createdBy`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `createdAt`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `createdAt`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `updatedAt`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `updatedAt`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Extra** (Medium): Column "deletedAt" exists in Drizzle schema but not in database
  - Column: `deletedAt`
  - DB Value: `null`
  - Drizzle Value: `"exists"`

### client_activity

**Issues:** 11

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `client_id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `client_id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="int" vs Drizzle="number"
  - Column: `user_id`
  - DB Value: `"int"`
  - Drizzle Value: `"number"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `user_id`
  - DB Value: `0`
  - Drizzle Value: `false`

- **DataType** (High): Data type mismatch: DB="enum" vs Drizzle="string"
  - Column: `activity_type`
  - DB Value: `"enum"`
  - Drizzle Value: `"string"`

- **Nullable** (Medium): Nullable mismatch: DB=0 vs Drizzle=false
  - Column: `activity_type`
  - DB Value: `0`
  - Drizzle Value: `false`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `metadata`
  - DB Value: `1`
  - Drizzle Value: `true`

- **DataType** (High): Data type mismatch: DB="timestamp" vs Drizzle="date"
  - Column: `created_at`
  - DB Value: `"timestamp"`
  - Drizzle Value: `"date"`

- **Nullable** (Medium): Nullable mismatch: DB=1 vs Drizzle=true
  - Column: `created_at`
  - DB Value: `1`
  - Drizzle Value: `true`

## All Issues by Category

### Missing (107)

- **__drizzle_migrations.id**: Column "id" exists in database but not in Drizzle schema
- **__drizzle_migrations.hash**: Column "hash" exists in database but not in Drizzle schema
- **__drizzle_migrations.created_at**: Column "created_at" exists in database but not in Drizzle schema
- **batches.batchStatus**: Column "batchStatus" exists in database but not in Drizzle schema
- **calendar_events.module_record_id**: Column "module_record_id" exists in database but not in Drizzle schema
- **calendar_events.meeting_url**: Column "meeting_url" exists in database but not in Drizzle schema
- **calendar_events.recurrence_rule_id**: Column "recurrence_rule_id" exists in database but not in Drizzle schema
- **calendar_events.parent_event_id**: Column "parent_event_id" exists in database but not in Drizzle schema
- **calendar_events.updated_by**: Column "updated_by" exists in database but not in Drizzle schema
- **calendar_recurrence_instances.created_at**: Column "created_at" exists in database but not in Drizzle schema

_... and 97 more_

### Extra (33)

- **batches.status**: Column "status" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.eventId**: Column "eventId" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.byDay**: Column "byDay" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.byMonthDay**: Column "byMonthDay" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.byWeekOfMonth**: Column "byWeekOfMonth" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.byDayOfWeekInMonth**: Column "byDayOfWeekInMonth" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.byMonth**: Column "byMonth" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.count**: Column "count" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.exceptionDates**: Column "exceptionDates" exists in Drizzle schema but not in database
- **calendar_reminders.relativeMinutes**: Column "relativeMinutes" exists in Drizzle schema but not in database

_... and 23 more_

### DataType (896)

- **accounts.id**: Data type mismatch: DB="int" vs Drizzle="number"
- **accounts.accountType**: Data type mismatch: DB="enum" vs Drizzle="string"
- **accounts.parentAccountId**: Data type mismatch: DB="int" vs Drizzle="number"
- **accounts.normalBalance**: Data type mismatch: DB="enum" vs Drizzle="string"
- **accounts.description**: Data type mismatch: DB="text" vs Drizzle="string"
- **accounts.createdAt**: Data type mismatch: DB="timestamp" vs Drizzle="date"
- **accounts.updatedAt**: Data type mismatch: DB="timestamp" vs Drizzle="date"
- **alert_configurations.id**: Data type mismatch: DB="int" vs Drizzle="number"
- **alert_configurations.user_id**: Data type mismatch: DB="int" vs Drizzle="number"
- **alert_configurations.alert_type**: Data type mismatch: DB="enum" vs Drizzle="string"

_... and 886 more_

### Nullable (1204)

- **accounts.id**: Nullable mismatch: DB=0 vs Drizzle=false
- **accounts.accountNumber**: Nullable mismatch: DB=0 vs Drizzle=false
- **accounts.accountName**: Nullable mismatch: DB=0 vs Drizzle=false
- **accounts.accountType**: Nullable mismatch: DB=0 vs Drizzle=false
- **accounts.parentAccountId**: Nullable mismatch: DB=1 vs Drizzle=true
- **accounts.isActive**: Nullable mismatch: DB=0 vs Drizzle=false
- **accounts.normalBalance**: Nullable mismatch: DB=0 vs Drizzle=false
- **accounts.description**: Nullable mismatch: DB=1 vs Drizzle=true
- **accounts.createdAt**: Nullable mismatch: DB=0 vs Drizzle=false
- **accounts.updatedAt**: Nullable mismatch: DB=0 vs Drizzle=false

_... and 1194 more_

