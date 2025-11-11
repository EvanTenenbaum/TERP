# Calendar Custom Fields & Metadata System

## Overview

This document specifies a flexible custom fields and metadata system for calendar events that allows:
1. **Universal Notes** - Free-form text notes available on all event types
2. **Type-Specific Default Fields** - Smart default fields based on event type and TERP business context
3. **Custom Field Creation** - Ability to create and save custom metadata fields
4. **Data Linking** - Integration with existing TERP entities (invoices, payments, clients, orders, etc.)

---

## Design Principles

1. **Flexible but Structured** - Balance between free-form notes and structured data
2. **Context-Aware** - Default fields based on event type and business workflows
3. **No Duplication** - Leverage existing TERP data structures where possible
4. **Progressive Disclosure** - Show relevant fields based on event type
5. **Audit Trail** - Track who added what metadata and when

---

## Database Schema

### 1. Event Metadata Table (New)

```sql
CREATE TABLE calendar_event_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  field_value TEXT,
  field_type ENUM('TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'BOOLEAN', 'REFERENCE') NOT NULL,
  
  -- For reference fields (links to other TERP entities)
  reference_type VARCHAR(50), -- 'invoice', 'payment', 'order', 'client', 'batch', etc.
  reference_id INT,
  
  -- Audit
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_event_id (event_id),
  INDEX idx_field_key (field_key),
  INDEX idx_reference (reference_type, reference_id)
);
```

### 2. Custom Field Definitions Table (New)

```sql
CREATE TABLE calendar_custom_field_definitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_key VARCHAR(100) NOT NULL UNIQUE,
  field_label VARCHAR(200) NOT NULL,
  field_type ENUM('TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'BOOLEAN', 'REFERENCE') NOT NULL,
  reference_type VARCHAR(50), -- For REFERENCE type fields
  
  -- Which event types this field applies to (NULL = all types)
  applicable_event_types JSON, -- Array of event type enums
  
  -- Field configuration
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  validation_rules JSON, -- e.g., {"min": 0, "max": 10000} for numbers
  
  -- Organization
  is_system_field BOOLEAN DEFAULT FALSE, -- System-defined vs user-defined
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_event_types (applicable_event_types(100)),
  INDEX idx_active (is_active)
);
```

### 3. Extend calendar_events Table

```sql
ALTER TABLE calendar_events
ADD COLUMN notes TEXT AFTER description;
```

**Rationale**: Universal notes field is so common it deserves a dedicated column for performance and simplicity.

---

## Default Metadata Fields by Event Type

### External Events

#### INTAKE
**Purpose**: Initial client consultation/intake appointment

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `client_id` | Client | REFERENCE (client) | Required | Link to client record |
| `intake_type` | Intake Type | TEXT | - | First visit, follow-up, etc. |
| `expected_order_value` | Expected Order Value | CURRENCY | - | Estimated deal size |
| `products_of_interest` | Products of Interest | TEXT | - | What products client is interested in |
| `priority_level` | Priority | TEXT | Medium | Low/Medium/High |

#### SHOPPING
**Purpose**: Client visiting to browse/shop

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `client_id` | Client | REFERENCE (client) | Required | Link to client record |
| `shopping_list` | Shopping List | TEXT | - | Products client wants to see |
| `budget_range` | Budget Range | TEXT | - | Client's stated budget |

#### AR_COLLECTION (Customer Payment Drop-off)
**Purpose**: Customer dropping off payment

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `client_id` | Client | REFERENCE (client) | Required | Link to client record |
| `invoice_id` | Invoice | REFERENCE (invoice) | - | Which invoice is being paid |
| `expected_amount` | Expected Amount | CURRENCY | **Required** | How much money expected |
| `payment_method` | Payment Method | TEXT | Cash | Cash/Check/Wire/etc. |
| `payment_id` | Payment Record | REFERENCE (payment) | - | Link to payment after processed |

#### AP_PAYMENT (Vendor Payment Pickup)
**Purpose**: Vendor picking up payment

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `vendor_id` | Vendor | REFERENCE (vendor) | Required | Link to vendor record |
| `bill_id` | Bill | REFERENCE (bill) | - | Which bill is being paid |
| `payment_amount` | Payment Amount | CURRENCY | **Required** | How much money to give |
| `payment_method` | Payment Method | TEXT | Check | Check/Wire/Cash/etc. |
| `check_number` | Check Number | TEXT | - | If paying by check |
| `payment_id` | Payment Record | REFERENCE (payment) | - | Link to payment after processed |

#### MEETING (External)
**Purpose**: Meeting with client or external party

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `client_id` | Client | REFERENCE (client) | - | Link to client if applicable |
| `meeting_type` | Meeting Type | TEXT | - | Sales, support, negotiation, etc. |
| `agenda` | Agenda | TEXT | - | Meeting topics |
| `follow_up_required` | Follow-up Required | BOOLEAN | FALSE | Does this need a follow-up? |
| `related_order_id` | Related Order | REFERENCE (order) | - | If discussing specific order |

### Internal Events

#### MEETING (Internal)
**Purpose**: Internal team meeting

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `meeting_type` | Meeting Type | TEXT | - | Standup, planning, review, etc. |
| `agenda` | Agenda | TEXT | - | Meeting topics |
| `action_items` | Action Items | TEXT | - | Tasks assigned during meeting |

#### PHOTOS
**Purpose**: Product photography session

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `batch_ids` | Batches | TEXT | - | Which batches being photographed |
| `product_ids` | Products | TEXT | - | Which products being photographed |
| `photo_type` | Photo Type | TEXT | - | Product shots, lifestyle, etc. |
| `photographer` | Photographer | REFERENCE (user) | - | Who is doing the photography |

#### BLOCKED_TIME (Do Not Book)
**Purpose**: Time block to prevent scheduling

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `reason` | Reason | TEXT | - | Why this time is blocked |
| `is_recurring` | Recurring Block | BOOLEAN | FALSE | Weekly block (e.g., lunch) |

#### SHIFT
**Purpose**: Employee shift/work schedule

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `shift_type` | Shift Type | TEXT | - | Opening, closing, mid, etc. |
| `role` | Role | TEXT | - | What role during this shift |
| `coverage_for` | Covering For | REFERENCE (user) | - | If covering for someone |

#### VACATION
**Purpose**: Employee time off

| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `vacation_type` | Type | TEXT | - | PTO, sick, personal, etc. |
| `approval_status` | Approval Status | TEXT | Pending | Pending/Approved/Denied |
| `approved_by` | Approved By | REFERENCE (user) | - | Who approved |

### Existing Event Types (Enhanced)

#### TRAINING
| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `training_topic` | Topic | TEXT | - | What is being trained |
| `trainer` | Trainer | REFERENCE (user) | - | Who is conducting training |
| `materials_link` | Materials | TEXT | - | Link to training materials |

#### PAYMENT_DUE
| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `bill_id` | Bill | REFERENCE (bill) | - | Which bill is due |
| `amount_due` | Amount Due | CURRENCY | **Required** | How much is due |
| `payment_status` | Status | TEXT | Pending | Pending/Paid/Overdue |

#### DEADLINE
| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `project_name` | Project | TEXT | - | What project this deadline is for |
| `deliverable` | Deliverable | TEXT | - | What is due |
| `assigned_to` | Assigned To | REFERENCE (user) | - | Who is responsible |

#### TASK
| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `task_status` | Status | TEXT | Not Started | Not Started/In Progress/Complete |
| `assigned_to` | Assigned To | REFERENCE (user) | - | Who is responsible |
| `related_order_id` | Related Order | REFERENCE (order) | - | If task is order-related |

#### MILESTONE
| Field Key | Label | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| `project_name` | Project | TEXT | - | What project this milestone is for |
| `milestone_type` | Type | TEXT | - | Launch, completion, review, etc. |
| `completion_criteria` | Criteria | TEXT | - | What defines completion |

---

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)
1. Create `calendar_event_metadata` table
2. Create `calendar_custom_field_definitions` table
3. Add `notes` column to `calendar_events`
4. Seed system default field definitions
5. Create API endpoints for metadata CRUD

### Phase 2: UI Integration (Week 2)
1. Add notes field to event creation/edit form
2. Dynamic metadata fields based on event type
3. Custom field management UI (admin)
4. Metadata display in event details

### Phase 3: Advanced Features (Week 3)
1. Reference field autocomplete (link to invoices, payments, etc.)
2. Metadata search and filtering
3. Bulk metadata operations
4. Metadata templates

---

## API Endpoints

### Event Metadata

```typescript
// Get all metadata for an event
GET /api/trpc/calendar.getEventMetadata?eventId=123

// Set/update metadata field
POST /api/trpc/calendar.setEventMetadata
{
  eventId: 123,
  fieldKey: "expected_amount",
  fieldValue: "500.00",
  fieldType: "CURRENCY"
}

// Delete metadata field
DELETE /api/trpc/calendar.deleteEventMetadata
{
  eventId: 123,
  fieldKey: "expected_amount"
}
```

### Custom Field Definitions

```typescript
// Get all field definitions (optionally filtered by event type)
GET /api/trpc/calendar.getCustomFieldDefinitions?eventType=AR_COLLECTION

// Create custom field definition
POST /api/trpc/calendar.createCustomFieldDefinition
{
  fieldKey: "custom_tracking_code",
  fieldLabel: "Tracking Code",
  fieldType: "TEXT",
  applicableEventTypes: ["SHOPPING", "INTAKE"],
  isRequired: false
}

// Update custom field definition
PUT /api/trpc/calendar.updateCustomFieldDefinition
{
  id: 5,
  fieldLabel: "Updated Label",
  isActive: true
}
```

---

## UI/UX Considerations

### Event Creation/Edit Form

```
┌─────────────────────────────────────┐
│ Create Event: AR Collection         │
├─────────────────────────────────────┤
│ Title: [Customer Payment - ABC Corp]│
│ Date: [11/15/2025] Time: [2:00 PM] │
│ Location: [Front Desk]              │
│                                      │
│ ─── Payment Details ───             │
│ Client: [ABC Corp ▼]                │
│ Invoice: [INV-2025-123 ▼]           │
│ Expected Amount: [$500.00] ⭐       │
│ Payment Method: [Cash ▼]            │
│                                      │
│ ─── Notes ───                       │
│ [Free-form notes here...]           │
│                                      │
│ ─── Custom Fields ───               │
│ + Add Custom Field                  │
│                                      │
│ [Cancel]              [Save Event]  │
└─────────────────────────────────────┘
```

**Key UX Principles:**
- ⭐ = Required field
- ▼ = Dropdown with autocomplete
- Default fields shown based on event type
- Custom fields collapsed by default (progressive disclosure)
- Notes always visible (universal field)

### Event Details View

```
┌─────────────────────────────────────┐
│ Customer Payment - ABC Corp          │
│ AR Collection • Nov 15, 2025 2:00 PM│
├─────────────────────────────────────┤
│ 📍 Front Desk                        │
│ 👤 Client: ABC Corp                  │
│                                      │
│ Payment Details                      │
│ Invoice: INV-2025-123               │
│ Expected: $500.00                   │
│ Method: Cash                         │
│                                      │
│ Notes                                │
│ Customer called ahead to confirm.   │
│ Bring receipt book.                 │
│                                      │
│ [Edit Event] [Delete]               │
└─────────────────────────────────────┘
```

---

## Data Validation Rules

### Currency Fields
- Must be positive number
- Max 2 decimal places
- Format: `$X,XXX.XX`

### Reference Fields
- Must exist in referenced table
- Show entity name/number in UI
- Validate on save

### Required Fields
- Marked with ⭐ in UI
- Prevent save if missing
- Show validation error

---

## Migration Strategy

### Step 1: Schema Migration
```sql
-- Run migration 0011
CREATE TABLE calendar_event_metadata ...
CREATE TABLE calendar_custom_field_definitions ...
ALTER TABLE calendar_events ADD COLUMN notes TEXT ...
```

### Step 2: Seed Default Fields
```sql
-- Insert system default field definitions
INSERT INTO calendar_custom_field_definitions 
  (field_key, field_label, field_type, applicable_event_types, is_system_field)
VALUES
  ('expected_amount', 'Expected Amount', 'CURRENCY', '["AR_COLLECTION", "AP_PAYMENT", "PAYMENT_DUE"]', TRUE),
  ('client_id', 'Client', 'REFERENCE', '["INTAKE", "SHOPPING", "AR_COLLECTION", "MEETING"]', TRUE),
  ...
```

### Step 3: Backward Compatibility
- Existing events work without metadata
- Metadata is optional by default
- No breaking changes to existing API

---

## Testing Strategy

### Unit Tests
- Metadata CRUD operations
- Field validation
- Reference field resolution

### Integration Tests
- Event creation with metadata
- Metadata search/filter
- Custom field definitions

### E2E Tests
- Create event with AR_COLLECTION type
- Verify expected_amount field appears
- Fill in metadata and save
- Verify metadata persists and displays

---

## Performance Considerations

### Indexing
- Index on `event_id` for fast metadata lookup
- Index on `field_key` for field-based queries
- Index on `reference_type` + `reference_id` for reverse lookups

### Caching
- Cache custom field definitions (rarely change)
- Cache metadata for frequently accessed events
- Invalidate on update

### Query Optimization
- Eager load metadata with events when needed
- Use JOIN for reference field resolution
- Paginate metadata for events with many fields

---

## Security & Permissions

### Field-Level Permissions
- System fields cannot be deleted (only deactivated)
- Custom fields can only be created by admins
- Field values respect event permissions

### Audit Trail
- Track who created/updated each metadata entry
- Track when field definitions change
- Include in event audit log

---

## Future Enhancements

### Phase 4 (Future)
1. **Metadata Templates** - Save common field combinations
2. **Conditional Fields** - Show fields based on other field values
3. **Calculated Fields** - Auto-calculate values (e.g., balance due)
4. **Metadata Reporting** - Aggregate metadata across events
5. **Metadata Validation** - Advanced validation rules (regex, ranges, etc.)
6. **Field Dependencies** - Required if another field is filled
7. **Metadata History** - Track changes to metadata over time

---

## Summary

This custom fields system provides:
- ✅ **Flexibility** - Add any custom field needed
- ✅ **Structure** - Smart defaults based on event type
- ✅ **Integration** - Links to existing TERP entities
- ✅ **Simplicity** - Universal notes field for quick entry
- ✅ **Scalability** - Supports unlimited custom fields
- ✅ **Audit** - Full tracking of who added what when
- ✅ **No Duplication** - Leverages existing TERP data structures

**Schema Impact:**
- 2 new tables (`calendar_event_metadata`, `calendar_custom_field_definitions`)
- 1 new column (`notes` on `calendar_events`)
- Minimal migration risk
