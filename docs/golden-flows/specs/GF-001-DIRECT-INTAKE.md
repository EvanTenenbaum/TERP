# GF-001: Direct Intake Specification

**Version:** 3.0
**Status:** Draft
**Last Updated:** 2026-01-27
**Author:** Claude Agent (GF-PHASE0A-001)
**Reviewed By:** Pending

---

## Problem Statement

### Customer Pain Point

> _"We've been off by 12 pounds."_
> — Customer meeting, January 11, 2026 (MEET-064)

The customer experienced a **12 lb inventory discrepancy** because the person entering the intake receipt didn't communicate with the warehouse stacker. There was no verification step before finalizing the intake, and quantities were never confirmed against the physical count.

### Root Causes

1. No verification workflow between receiver and stacker
2. Quantities entered without physical confirmation
3. No accountability trail for who verified what
4. Discrepancies discovered only after financial impact

### How This Flow Addresses It

GF-001 (Direct Intake) is **Step 1** of a two-step process:

1. **GF-001**: Create the initial intake record with claimed quantities
2. **FEAT-008**: Two-step verification (Farmer Verified → Stacker Verified → Finalized)

This flow creates the initial record. The [Intake Verification System (FEAT-008)](/docs/specs/FEAT-008-INTAKE-VERIFICATION-SPEC.md) adds the accountability layer.

---

## Overview

The Direct Intake flow allows warehouse staff to add inventory batches directly into the system without requiring a Purchase Order. This is the primary method for recording new inventory arrivals from suppliers, capturing product details, quantity, cost (COGS), and storage location in a single transaction.

**Key Distinction**: This flow creates batches in `AWAITING_INTAKE` status, which then require verification before becoming `LIVE` sellable inventory.

---

## Terminology

> Per MEET-066: Terminology was causing user confusion. This section clarifies terms.

| Term               | Definition                                                | Usage                 |
| ------------------ | --------------------------------------------------------- | --------------------- |
| **Intake**         | The process of receiving inventory into the system        | This flow             |
| **Intake Receipt** | The document created during intake, shared with suppliers | Generated post-intake |
| **Purchase**       | ~~Deprecated term~~ - Do not use in intake context        | Removed from UI       |
| **Purchase Order** | A formal order placed with a supplier (different flow)    | GF-002: PO Intake     |
| **Batch**          | A quantity of a single product from a single intake       | Created by this flow  |
| **Lot**            | A grouping of batches from the same supplier delivery     | Created by this flow  |

**UI Changes Made (MEET-066)**:

- Button: "New Purchase" → **"New Intake"**
- Modal title: "New Product Purchase" → **"New Product Intake"**
- Success message updated to use "intake" terminology

---

## Known Issues

| Issue                                       | Status  | Impact                                                                | Workaround                              |
| ------------------------------------------- | ------- | --------------------------------------------------------------------- | --------------------------------------- |
| **BUG-112**: Form fields not rendering      | BLOCKED | Users see "Items: 2, Qty: 0, Value: $0.00" but no visible form fields | None - flow is currently non-functional |
| **BUG-073**: Race condition in autocomplete | Fixed   | Stale search results could appear                                     | Fixed via request ID tracking           |
| **BUG-071**: Orphaned media on failure      | Fixed   | Uploaded files not cleaned up on batch creation failure               | Rollback logic added                    |

**Current Status**: GF-001 is **BLOCKED** by BUG-112. Phase 1 task GF-PHASE1-001 will restore form field rendering.

---

## Success Metrics

| Metric                      | Target      | Measurement                                   |
| --------------------------- | ----------- | --------------------------------------------- |
| Intake completion rate      | > 95%       | Intakes started vs. completed                 |
| Discrepancy rate            | < 1%        | Discrepancies found in FEAT-008 verification  |
| Time to catch discrepancies | < 24 hours  | Time from intake to discrepancy detection     |
| Data entry errors           | < 2%        | Intakes requiring correction post-creation    |
| Form completion time        | < 3 minutes | Time from modal open to successful submission |

---

## User Journey

### 1. Navigation

1. User navigates to **Inventory** page (`/inventory`)
2. User clicks **"New Intake"** button in the page header

### 2. Form Entry

3. **Intake Modal** opens (`PurchaseModal.tsx`)
4. User enters supplier information:
   - **Vendor Name** (required, autocomplete from existing vendors)
   - **Brand Name** (required, autocomplete from existing brands)
5. User enters product information:
   - **Category** (required, dropdown from settings)
   - If category is "Flower":
     - **Strain Name** (required, autocomplete from strain library)
     - Product name is auto-populated from strain name
   - If category is not "Flower":
     - **Product Name** (required, free text)
     - **Strain** (optional, autocomplete)
   - **Grade** (optional/required based on org settings)
6. User enters quantity:
   - **Quantity** (required, positive decimal)
7. User enters cost information:
   - **COGS Mode** (required): Fixed or Range
   - If Fixed: **Unit COGS** (required)
   - If Range: **Min COGS** and **Max COGS** (required, min < max)
8. User enters payment terms:
   - **Payment Terms** (required): COD, NET_7, NET_15, NET_30, CONSIGNMENT, PARTIAL
   - If COD or PARTIAL: **Amount Paid** (required)
9. User selects storage location:
   - **Warehouse/Site** (optional, dropdown from settings)
10. User optionally uploads media files:
    - **Product Media** (images/videos)

### 3. Submission

11. User clicks **"Create Intake"** button
12. If media files exist, they are uploaded first
13. System validates all inputs
14. System creates all required entities in a single transaction
15. Success toast notification displayed
16. Modal closes automatically
17. Inventory list refreshes with new batch

### 4. Post-Intake Verification (FEAT-008)

> This section describes what happens AFTER GF-001 completes.

18. System generates **Intake Receipt** document
19. Shareable link/PDF sent to supplier for acknowledgment
20. Supplier marks receipt as **"Farmer Verified"**
21. Warehouse stacker verifies physical quantities
22. Stacker marks as **"Stacker Verified"** or flags **discrepancy**
23. If discrepancy: notification sent to **receipt creator** (not generic admin)
24. Admin resolves discrepancy
25. Batch status transitions to `LIVE` (sellable)

**State Machine (FEAT-008)**:

```
PENDING → FARMER_VERIFIED → STACKER_VERIFIED → FINALIZED
                                    ↓
                               DISPUTED (requires resolution)
```

### 5. Alternative Paths

**Cancellation:**

- User can click "Cancel" or close modal at any step
- No data is saved

**Validation Failure:**

- Toast error displayed with specific message
- Form remains open for correction

**Media Upload Failure:**

- Error toast displayed
- Form remains open for retry

**Batch Creation Failure:**

- Uploaded media files are automatically deleted (rollback)
- Error toast displayed
- Form remains open for retry

---

## UI States

| State                        | Trigger                          | Display                                               |
| ---------------------------- | -------------------------------- | ----------------------------------------------------- |
| **Modal Closed**             | Default state / Cancel / Success | Modal hidden, Inventory list visible                  |
| **Modal Open - Empty**       | Click "New Intake"               | Empty form with required field indicators             |
| **Modal Open - Filling**     | User typing                      | Input fields populated, autocomplete dropdowns appear |
| **Vendor Autocomplete Open** | Focus on vendor field + typing   | Dropdown with matching vendors below input            |
| **Brand Autocomplete Open**  | Focus on brand field + typing    | Dropdown with matching brands below input             |
| **Flower Mode**              | Category = "Flower"              | Strain field required, product name auto-filled       |
| **Non-Flower Mode**          | Category != "Flower"             | Product name required, strain optional                |
| **COGS Fixed Mode**          | Select "Fixed Price" radio       | Single "Unit COGS" input visible                      |
| **COGS Range Mode**          | Select "Price Range" radio       | "Min COGS" and "Max COGS" inputs visible              |
| **Amount Paid Visible**      | Payment Terms = COD or PARTIAL   | "Amount Paid" input field appears                     |
| **Media Files Added**        | Upload files                     | File list with names and remove buttons               |
| **Submitting**               | Click "Create Intake"            | Button shows loading spinner, disabled                |
| **Validation Error**         | Submit with invalid data         | Toast error, form remains open                        |
| **Success**                  | Successful creation              | Success toast, modal closes                           |

---

## API Endpoints

### Primary Endpoint: `inventory.intake`

| Property              | Value                              |
| --------------------- | ---------------------------------- |
| **Endpoint**          | `inventory.intake` (tRPC mutation) |
| **Method**            | POST (via tRPC)                    |
| **Permission**        | `inventory:create`                 |
| **Actor Attribution** | `ctx.user.id` (never from input)   |

#### Request Shape

```typescript
{
  vendorName: string;           // Required, 1-255 chars, alphanumeric + spaces/hyphens
  brandName: string;            // Required, 1-255 chars
  productName: string;          // Required, 1-255 chars
  category: string;             // Required, 1-100 chars
  subcategory?: string;         // Optional, max 100 chars
  grade?: string;               // Optional, max 50 chars
  strainId?: number | null;     // Optional, positive integer
  quantity: number;             // Required, positive decimal, max 2 decimal places
  cogsMode: "FIXED" | "RANGE";  // Required
  unitCogs?: string;            // Required if cogsMode=FIXED, decimal string 0-1,000,000
  unitCogsMin?: string;         // Required if cogsMode=RANGE
  unitCogsMax?: string;         // Required if cogsMode=RANGE, must be > unitCogsMin
  paymentTerms: "COD" | "NET_7" | "NET_15" | "NET_30" | "CONSIGNMENT" | "PARTIAL";
  location: {
    site: string;               // Required, uppercase alphanumeric
    zone?: string;              // Optional, alphanumeric
    rack?: string;              // Optional, alphanumeric
    shelf?: string;             // Optional, alphanumeric
    bin?: string;               // Optional, alphanumeric
  };
  metadata?: Record<string, unknown>;  // Optional JSON
  mediaUrls?: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
}
```

#### Response Shape

```typescript
{
  success: true;
  batch: {
    id: number;
    code: string; // Auto-generated batch code (e.g., "B-2026-01-0001")
    sku: string; // Auto-generated SKU
    productId: number;
    lotId: number;
    batchStatus: "AWAITING_INTAKE";
    grade: string | null;
    onHandQty: string; // Decimal as string (e.g., "100.00")
    unitCogs: string | null;
    createdAt: Date;
    // ... other batch fields
  }
}
```

### Supporting Endpoints

| Endpoint                                  | Method | Purpose              | Request                                      | Response                                              |
| ----------------------------------------- | ------ | -------------------- | -------------------------------------------- | ----------------------------------------------------- |
| `inventory.vendors`                       | GET    | Autocomplete vendors | `{ query?: string }`                         | `{ items: Vendor[] }`                                 |
| `inventory.brands`                        | GET    | Autocomplete brands  | `{ query?: string }`                         | `{ items: Brand[] }`                                  |
| `inventory.uploadMedia`                   | POST   | Upload media file    | `{ fileData, fileName, fileType, batchId? }` | `{ success, url, fileName, fileType, fileSize }`      |
| `inventory.deleteMedia`                   | POST   | Delete media file    | `{ url }`                                    | `{ success, url }`                                    |
| `settings.categories.list`                | GET    | Get categories       | none                                         | `Category[]`                                          |
| `settings.grades.list`                    | GET    | Get grades           | none                                         | `Grade[]`                                             |
| `settings.locations.list`                 | GET    | Get locations        | none                                         | `Location[]`                                          |
| `organizationSettings.getDisplaySettings` | GET    | Get display settings | none                                         | `{ display: { showGradeField, gradeFieldRequired } }` |

---

## Data Model

### Tables Created/Modified by GF-001

| Table            | Operation            | Description                                           |
| ---------------- | -------------------- | ----------------------------------------------------- |
| `vendors`        | Find or Create       | Supplier record (uses `clients` with `isSeller=true`) |
| `brands`         | Find or Create       | Brand record linked to vendor                         |
| `products`       | Find or Create       | Product record linked to brand                        |
| `lots`           | Create               | Lot record for batch grouping                         |
| `batches`        | Create               | Main inventory batch record                           |
| `batchLocations` | Create               | Physical storage location                             |
| `auditLogs`      | Create               | Audit trail entry                                     |
| `payables`       | Create (conditional) | Created if ownershipType = CONSIGNED                  |

### Tables Created by FEAT-008 (Post-Intake)

| Table                  | Operation            | Description                                   |
| ---------------------- | -------------------- | --------------------------------------------- |
| `intake_receipts`      | Create               | Receipt document for verification             |
| `intake_receipt_items` | Create               | Line items with expected vs actual quantities |
| `intake_discrepancies` | Create (conditional) | Tracking resolution of quantity discrepancies |

### Entity Relationships

```
vendors (1) ──────┬── brands (many)
                  │
                  └── lots (many)

brands (1) ────────── products (many)

products (1) ─────── batches (many)

lots (1) ──────────── batches (many)

batches (1) ───────┬── batchLocations (many)
                   │
                   ├── auditLogs (many, polymorphic)
                   │
                   └── intake_receipt_items (many) [FEAT-008]
```

### Key Fields Created

**batches table:**

| Field           | Type          | Value                             |
| --------------- | ------------- | --------------------------------- |
| `code`          | varchar(50)   | Auto-generated unique batch code  |
| `sku`           | varchar(100)  | Auto-generated unique SKU         |
| `productId`     | int           | FK to products.id                 |
| `lotId`         | int           | FK to lots.id                     |
| `batchStatus`   | enum          | `"AWAITING_INTAKE"`               |
| `grade`         | varchar(10)   | From input                        |
| `cogsMode`      | enum          | `"FIXED"` or `"RANGE"`            |
| `unitCogs`      | decimal(12,4) | From input (FIXED mode)           |
| `unitCogsMin`   | decimal(12,4) | From input (RANGE mode)           |
| `unitCogsMax`   | decimal(12,4) | From input (RANGE mode)           |
| `paymentTerms`  | enum          | From input                        |
| `ownershipType` | enum          | `"CONSIGNED"` or `"OFFICE_OWNED"` |
| `onHandQty`     | decimal(15,4) | From input quantity               |
| `reservedQty`   | decimal(15,4) | `"0"`                             |
| `quarantineQty` | decimal(15,4) | `"0"`                             |
| `holdQty`       | decimal(15,4) | `"0"`                             |
| `defectiveQty`  | decimal(15,4) | `"0"`                             |
| `sampleQty`     | decimal(15,4) | `"0"`                             |
| `metadata`      | text          | JSON with mediaFiles if uploaded  |
| `createdAt`     | timestamp     | Auto-generated                    |

---

## Business Rules

### Validation Rules

| Rule ID | Rule                                                    | Implementation                   |
| ------- | ------------------------------------------------------- | -------------------------------- |
| BR-001  | Vendor name required, 1-255 chars                       | Zod schema validation            |
| BR-002  | Brand name required, 1-255 chars                        | Zod schema validation            |
| BR-003  | Product name required, 1-255 chars                      | Zod schema validation            |
| BR-004  | Category required, 1-100 chars                          | Zod schema validation            |
| BR-005  | Quantity must be positive (> 0)                         | Zod schema validation + frontend |
| BR-006  | Quantity max 2 decimal places                           | Zod schema validation            |
| BR-007  | If cogsMode=FIXED, unitCogs required                    | Zod refinement                   |
| BR-008  | If cogsMode=RANGE, unitCogsMin and unitCogsMax required | Zod refinement                   |
| BR-009  | unitCogsMin must be < unitCogsMax                       | Zod refinement + frontend        |
| BR-010  | COGS values must be between 0 and 1,000,000             | Zod schema validation            |
| BR-011  | If paymentTerms=COD or PARTIAL, amountPaid required     | Frontend validation              |
| BR-012  | Location site uppercase alphanumeric                    | Zod schema validation            |
| BR-013  | Grade required if org setting `gradeFieldRequired=true` | Frontend conditional validation  |
| BR-014  | For Flower category, strain is required                 | Frontend conditional validation  |

### Business Logic Rules

| Rule ID | Rule                                                    | Implementation                       |
| ------- | ------------------------------------------------------- | ------------------------------------ |
| BL-001  | Vendor created if not exists                            | `findOrCreate` utility               |
| BL-002  | Brand created if not exists (linked to vendor)          | `findOrCreate` utility               |
| BL-003  | Product created if not exists (linked to brand)         | `findOrCreate` utility               |
| BL-004  | Lot code auto-generated with unique sequence            | `inventoryUtils.generateLotCode()`   |
| BL-005  | Batch code auto-generated with unique sequence          | `inventoryUtils.generateBatchCode()` |
| BL-006  | SKU auto-generated from brand + product + date          | `inventoryUtils.generateSKU()`       |
| BL-007  | Initial batch status is `AWAITING_INTAKE`               | Hardcoded in service                 |
| BL-008  | ownershipType = CONSIGNED if paymentTerms = CONSIGNMENT | Service logic                        |
| BL-009  | Payable created for CONSIGNED batches                   | `payablesService.createPayable()`    |
| BL-010  | All operations in single database transaction           | `db.transaction()` wrapper           |
| BL-011  | Audit log created with action "CREATED"                 | Service logic                        |
| BL-012  | Media files stored in metadata JSON                     | Service logic                        |

### Notification Rules (FEAT-008)

| Rule ID | Rule                                                                   | Implementation                |
| ------- | ---------------------------------------------------------------------- | ----------------------------- |
| NR-001  | Discrepancy notifications go to **receipt creator**, not generic admin | `intake_receipts.createdBy`   |
| NR-002  | Farmer verification notification sent when receipt shared              | Email/SMS to supplier contact |
| NR-003  | Stacker assignment notification when farmer verifies                   | In-app notification           |

---

## Error States

| Error                                        | Cause                                    | Recovery                           |
| -------------------------------------------- | ---------------------------------------- | ---------------------------------- |
| "Please fill in all required fields"         | Vendor or Brand empty                    | Enter required fields              |
| "Please select a strain for flower products" | Flower category without strain           | Select a strain                    |
| "Please enter a product name"                | Non-flower without product name          | Enter product name                 |
| "Please select a grade"                      | Grade required by org settings but empty | Select a grade                     |
| "Please enter a valid quantity"              | Quantity empty or <= 0                   | Enter positive quantity            |
| "Please enter a valid unit COGS"             | FIXED mode with empty/invalid COGS       | Enter valid COGS                   |
| "Please enter both min and max COGS"         | RANGE mode missing min or max            | Enter both values                  |
| "Min COGS must be less than max COGS"        | min >= max in RANGE mode                 | Correct COGS values                |
| "Please enter the amount paid"               | COD/PARTIAL without amount               | Enter amount paid                  |
| "Failed to create intake: {message}"         | Backend validation error                 | Review and correct inputs          |
| "Storage not configured"                     | Media upload without storage setup       | Contact admin to configure storage |
| "Database not available"                     | Database connection issue                | Retry, contact admin               |
| Network timeout                              | Request timeout                          | Retry submission                   |

---

## Invariants

| ID      | Invariant                                              | Verification                                   |
| ------- | ------------------------------------------------------ | ---------------------------------------------- |
| INV-001 | `onHandQty >= 0` after intake                          | `onHandQty = input.quantity` (always positive) |
| INV-002 | `reservedQty = 0` after intake                         | Hardcoded in service                           |
| INV-003 | `quarantineQty = 0` after intake                       | Hardcoded in service                           |
| INV-004 | `holdQty = 0` after intake                             | Hardcoded in service                           |
| INV-005 | `defectiveQty = 0` after intake                        | Hardcoded in service                           |
| INV-006 | `batchStatus = AWAITING_INTAKE` after intake           | Hardcoded in service                           |
| INV-007 | Batch.code is unique                                   | Database unique constraint                     |
| INV-008 | Batch.sku is unique                                    | Database unique constraint                     |
| INV-009 | Lot.code is unique                                     | Database unique constraint                     |
| INV-010 | Audit log exists for every batch created               | Service creates audit log in same transaction  |
| INV-011 | All entities created atomically (all or nothing)       | Database transaction                           |
| INV-012 | Media files cleaned up on batch creation failure       | Rollback logic in frontend                     |
| INV-013 | Actor attribution from `ctx.user.id`, never from input | `getAuthenticatedUserId(ctx)`                  |

---

## Cross-Flow Touchpoints

| Flow                              | Relationship            | Impact                                                    | Documentation                                                     |
| --------------------------------- | ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| **FEAT-008: Intake Verification** | Immediate next step     | Creates intake receipt, enables two-step verification     | [FEAT-008 Spec](/docs/specs/FEAT-008-INTAKE-VERIFICATION-SPEC.md) |
| **GF-002: PO Intake**             | Alternative intake path | Uses same `batches` table, different entry point          | Pending spec                                                      |
| **GF-003: Batch QC**              | Verification step       | Batches in `AWAITING_INTAKE` status await QC verification | Pending spec                                                      |
| **GF-004: Photography**           | Optional workflow       | Batch status can transition to `PHOTOGRAPHY_COMPLETE`     | Pending spec                                                      |
| **GF-005: Status Change**         | Status management       | Direct intake creates batch in `AWAITING_INTAKE` status   | Pending spec                                                      |
| **GF-006: Quantity Adjustment**   | Quantity updates        | Intaked batches can have quantities adjusted              | Pending spec                                                      |
| **GF-007: Inventory Management**  | Inventory listing       | New batches appear in inventory list immediately          | Pending spec                                                      |
| **GF-008: Sales/Orders**          | Order fulfillment       | Batches must reach `LIVE` status before sale              | Pending spec                                                      |
| **GF-009: Consignment Payables**  | Financial tracking      | CONSIGNED batches create payables automatically           | Pending spec                                                      |
| **GF-010: Vendor Management**     | Vendor records          | Intake can create new vendor records                      | Pending spec                                                      |

### Batch Status Lifecycle

```
                    GF-001 Creates
                         │
                         ▼
               ┌─────────────────┐
               │ AWAITING_INTAKE │ ◄── Initial state
               └────────┬────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
   ┌────────────┐ ┌──────────┐ ┌────────────┐
   │ QUARANTINED│ │   LIVE   │ │  PHOTO-    │
   │            │ │ (sellable)│ │  GRAPHY_   │
   └────────────┘ └──────────┘ │  COMPLETE  │
                        │      └────────────┘
                        ▼
                 ┌──────────┐
                 │ SOLD_OUT │
                 └──────────┘
                        │
                        ▼
                 ┌──────────┐
                 │  CLOSED  │
                 └──────────┘
```

---

## State Diagram

```
                    ┌─────────────────┐
                    │                 │
  User clicks ──────►  Modal Open     │
  "New Intake"      │  (Empty Form)   │
                    │                 │
                    └────────┬────────┘
                             │
                             │ User fills form
                             ▼
                    ┌─────────────────┐
                    │                 │
                    │  Form Filling   │◄──────────┐
                    │                 │           │
                    └────────┬────────┘           │
                             │                    │
                             │ Click Submit       │ Validation
                             ▼                    │ Error
                    ┌─────────────────┐           │
                    │                 │           │
                    │  Validating     ├───────────┘
                    │                 │
                    └────────┬────────┘
                             │
                             │ Validation Pass
                             ▼
                    ┌─────────────────┐
                    │                 │
                    │  Uploading      │◄───┐
                    │  Media (if any) │    │ Retry
                    │                 │    │
                    └────────┬────────┘    │
                             │             │
                             │ Upload      │ Upload
                             │ Success     │ Failure
                             ▼             │
                    ┌─────────────────┐    │
                    │                 │    │
                    │  Creating       ├────┘
                    │  Batch          │
                    │                 │
                    └────────┬────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             │ Success       │ Failure       │
             ▼               ▼               │
    ┌─────────────┐  ┌─────────────────┐     │
    │             │  │                 │     │
    │  Modal      │  │  Media Rollback │─────┘
    │  Closes     │  │  (cleanup)      │
    │             │  │                 │
    └──────┬──────┘  └─────────────────┘
           │
           │ FEAT-008 begins
           ▼
    ┌─────────────────┐
    │  Intake Receipt │
    │  Generated      │
    └─────────────────┘
```

---

## Acceptance Criteria

> From GOLDEN_FLOWS_PROD_READY_PLAN_2026-01-27.md

| ID     | Criterion                                      | Verification                      |
| ------ | ---------------------------------------------- | --------------------------------- |
| AC-001 | Form fields render on page load                | Visual inspection                 |
| AC-002 | "Add Row" button creates visible input fields  | Click test                        |
| AC-003 | Form submission creates inventory batch        | Database query                    |
| AC-004 | Batch appears in inventory list after creation | UI verification                   |
| AC-005 | Audit log created for new batch                | Database query                    |
| AC-006 | Media files uploaded and linked to batch       | File storage + metadata check     |
| AC-007 | CONSIGNED batches create payable record        | Database query                    |
| AC-008 | Error messages display for validation failures | Form submission with invalid data |
| AC-009 | Autocomplete returns matching vendors/brands   | Type in search fields             |
| AC-010 | Modal closes on successful submission          | UI verification                   |

---

## Adversarial Test Scenarios

> Per QA Protocol v3.0: Every specification must include adversarial test scenarios that probe the system's defenses using 5 lenses: Input Fuzzing, State-Based Attacks, Business Logic Attacks, Concurrency, and Authorization.

### Input Fuzzing Tests

| ID     | Target Field    | Attack Vector                            | Expected Behavior                         | Business Rule |
| ------ | --------------- | ---------------------------------------- | ----------------------------------------- | ------------- |
| AT-001 | `vendorName`    | Empty string `""`                        | Validation error: "Vendor name required"  | BR-001        |
| AT-002 | `vendorName`    | Null value                               | Validation error: "Vendor name required"  | BR-001        |
| AT-003 | `vendorName`    | 256+ characters                          | Validation error: "Max 255 characters"    | BR-001        |
| AT-004 | `vendorName`    | SQL injection `'; DROP TABLE batches;--` | Sanitized, no SQL execution               | N/A           |
| AT-005 | `vendorName`    | XSS `<script>alert('xss')</script>`      | HTML escaped in output                    | N/A           |
| AT-006 | `vendorName`    | Unicode RTL override `\u202E`            | Sanitized or rejected                     | N/A           |
| AT-007 | `quantity`      | Zero `0`                                 | Validation error: "Must be positive"      | BR-005        |
| AT-008 | `quantity`      | Negative `-100`                          | Validation error: "Must be positive"      | BR-005        |
| AT-009 | `quantity`      | Non-numeric `"abc"`                      | Type error, rejected                      | BR-005        |
| AT-010 | `quantity`      | Extremely large `999999999999`           | Validation error or overflow handling     | BR-005        |
| AT-011 | `quantity`      | More than 2 decimals `100.999`           | Truncated or rejected per BR-006          | BR-006        |
| AT-012 | `unitCogs`      | Negative `-50.00`                        | Validation error: "Must be >= 0"          | BR-010        |
| AT-013 | `unitCogs`      | Over max `1000001`                       | Validation error: "Max 1,000,000"         | BR-010        |
| AT-014 | `unitCogsMin`   | Greater than `unitCogsMax`               | Validation error: "Min must be < Max"     | BR-009        |
| AT-015 | `unitCogsMin`   | Equal to `unitCogsMax`                   | Validation error: "Min must be < Max"     | BR-009        |
| AT-016 | `category`      | Non-existent category `"InvalidCat"`     | Validation error or graceful handling     | BR-004        |
| AT-017 | `strainId`      | Non-existent ID `999999`                 | Validation error: "Strain not found"      | BR-014        |
| AT-018 | `strainId`      | Negative ID `-1`                         | Validation error: "Invalid strain ID"     | BR-014        |
| AT-019 | `location.site` | Lowercase `"warehouse1"`                 | Validation error or auto-uppercase        | BR-012        |
| AT-020 | `location.site` | Special chars `"WARE@HOUSE!"`            | Validation error: "Alphanumeric only"     | BR-012        |
| AT-021 | `paymentTerms`  | Invalid enum `"NET_999"`                 | Validation error: "Invalid payment terms" | N/A           |
| AT-022 | `mediaUrls`     | Malicious URL `javascript:alert(1)`      | Rejected or sanitized                     | N/A           |
| AT-023 | `metadata`      | Deeply nested object (100+ levels)       | Rejected or depth-limited                 | N/A           |
| AT-024 | `metadata`      | Oversized JSON (10MB+)                   | Rejected: payload too large               | N/A           |

### State-Based Attack Tests

| ID     | Attack Vector                                  | Expected Behavior                                     | Invariant |
| ------ | ---------------------------------------------- | ----------------------------------------------------- | --------- |
| AT-025 | Submit same form twice rapidly (double-click)  | Idempotent: only one batch created OR second rejected | INV-007   |
| AT-026 | Submit while network disconnected              | Graceful error, no partial state                      | INV-011   |
| AT-027 | Close modal during media upload                | Upload cancelled, no orphan files                     | INV-012   |
| AT-028 | Submit with stale vendor autocomplete data     | Re-validates vendor exists at submit time             | BL-001    |
| AT-029 | Concurrent intakes with same lot code          | Unique constraint prevents duplicate                  | INV-009   |
| AT-030 | Transaction timeout mid-creation               | Full rollback, no partial entities                    | INV-011   |
| AT-031 | Database connection lost during commit         | Full rollback, error shown to user                    | INV-011   |
| AT-032 | Media upload succeeds but batch creation fails | Media files cleaned up (rollback)                     | INV-012   |
| AT-033 | Refresh page after submission started          | Previous submission completes or rolls back cleanly   | INV-011   |

### Authorization Attack Tests

| ID     | Attack Vector                                  | Expected Behavior                          | Business Rule  |
| ------ | ---------------------------------------------- | ------------------------------------------ | -------------- |
| AT-034 | Submit without `inventory:create` permission   | 403 Forbidden                              | API Permission |
| AT-035 | Include `createdBy` in input payload           | Ignored - actor from `ctx.user.id` only    | INV-013        |
| AT-036 | Include `organizationId` different from user's | Ignored or rejected - scoped to user's org | N/A            |
| AT-037 | Unauthenticated request                        | 401 Unauthorized                           | N/A            |
| AT-038 | Expired session token                          | 401 Unauthorized, redirect to login        | N/A            |
| AT-039 | Access vendor from different organization      | Rejected - vendor not found in user's org  | BL-001         |

### Business Logic Attack Tests

| ID     | Attack Vector                                          | Expected Behavior                                  | Business Rule |
| ------ | ------------------------------------------------------ | -------------------------------------------------- | ------------- |
| AT-040 | Flower category without strain                         | Validation error: "Strain required for Flower"     | BR-014        |
| AT-041 | COD payment terms without amount paid                  | Validation error: "Amount paid required"           | BR-011        |
| AT-042 | PARTIAL payment without amount paid                    | Validation error: "Amount paid required"           | BR-011        |
| AT-043 | FIXED cogsMode without unitCogs                        | Validation error: "Unit COGS required"             | BR-007        |
| AT-044 | RANGE cogsMode without min/max                         | Validation error: "Min and Max COGS required"      | BR-008        |
| AT-045 | COGS manipulation: set min=0, max=1000000              | Allowed but flagged for review (wide range)        | BR-009        |
| AT-046 | Grade required by org but submitted empty              | Validation error: "Grade required"                 | BR-013        |
| AT-047 | CONSIGNMENT terms expect payable creation              | Verify payable record created with correct amounts | BL-009        |
| AT-048 | Non-CONSIGNMENT should not create payable              | Verify no payable record created                   | BL-009        |
| AT-049 | Attempt to create batch with status != AWAITING_INTAKE | Input ignored, status forced to AWAITING_INTAKE    | INV-006       |
| AT-050 | Attempt to set non-zero reservedQty                    | Input ignored, reservedQty forced to 0             | INV-002       |

### Concurrency Tests

| ID     | Attack Vector                             | Expected Behavior                                | Invariant        |
| ------ | ----------------------------------------- | ------------------------------------------------ | ---------------- |
| AT-051 | 10 users submit intake simultaneously     | All succeed with unique batch/lot codes          | INV-007, INV-009 |
| AT-052 | Same user submits 5 intakes in 1 second   | All succeed or rate-limited                      | INV-007          |
| AT-053 | Autocomplete search during batch creation | Autocomplete returns consistent results          | N/A              |
| AT-054 | Vendor updated while user types in form   | Form submission uses vendor state at submit time | BL-001           |
| AT-055 | Category deleted while form is open       | Validation error at submit: "Category not found" | BR-004           |

### Edge Case Tests

| ID     | Attack Vector                              | Expected Behavior                      | Notes  |
| ------ | ------------------------------------------ | -------------------------------------- | ------ |
| AT-056 | Exactly 255 character vendor name          | Accepted (boundary value)              | BR-001 |
| AT-057 | Quantity = 0.01 (minimum positive)         | Accepted                               | BR-005 |
| AT-058 | Quantity = 0.001 (exceeds decimal limit)   | Truncated to 0.00 or rejected          | BR-006 |
| AT-059 | COGS min=0, max=0.01                       | Accepted (minimum valid range)         | BR-009 |
| AT-060 | All optional fields omitted                | Batch created with null/default values | N/A    |
| AT-061 | Maximum allowed media files (10?)          | All uploaded and linked                | N/A    |
| AT-062 | Media file at max size limit               | Uploaded successfully                  | N/A    |
| AT-063 | Media file exceeding max size              | Rejected: "File too large"             | N/A    |
| AT-064 | Unicode in product name (emoji, CJK chars) | Accepted and displayed correctly       | BR-003 |
| AT-065 | Very long product name (255 chars)         | Accepted (boundary value)              | BR-003 |

### Test Execution Matrix

| Priority  | Test Category    | Count  | Automation Target    |
| --------- | ---------------- | ------ | -------------------- |
| P0        | Authorization    | 6      | E2E + API tests      |
| P0        | Input Validation | 24     | Unit + API tests     |
| P1        | Business Logic   | 11     | Integration tests    |
| P1        | State-Based      | 9      | E2E + manual testing |
| P2        | Concurrency      | 5      | Load testing         |
| P2        | Edge Cases       | 10     | Unit tests           |
| **Total** |                  | **65** |                      |

### Test Data Requirements

```typescript
// Adversarial test data fixtures
export const adversarialTestData = {
  // Input Fuzzing
  sqlInjection: "'; DROP TABLE batches;--",
  xssPayload: "<script>alert('xss')</script>",
  unicodeRTL: "\u202Ereversed",
  maxString: "A".repeat(256),
  deeplyNested: JSON.parse('{"a":'.repeat(100) + "1" + "}".repeat(100)),

  // Boundary Values
  minQuantity: 0.01,
  maxQuantity: 999999999.99,
  minCogs: "0.00",
  maxCogs: "1000000.00",

  // Invalid Enums
  invalidPaymentTerms: "NET_999",
  invalidCogsMode: "VARIABLE",
  invalidCategory: "NotARealCategory",

  // Authorization
  differentOrgVendorId: 999999,
  maliciousCreatedBy: 1, // Should be ignored
};
```

---

## Appendix

### File Locations

| Component           | Path                                                |
| ------------------- | --------------------------------------------------- |
| Inventory Page      | `client/src/pages/Inventory.tsx`                    |
| Purchase Modal      | `client/src/components/inventory/PurchaseModal.tsx` |
| Inventory Router    | `server/routers/inventory.ts`                       |
| Intake Service      | `server/inventoryIntakeService.ts`                  |
| Validation Schema   | `server/_core/validation.ts`                        |
| Database Schema     | `drizzle/schema.ts`                                 |
| Inventory Utilities | `server/inventoryUtils.ts`                          |
| Inventory DB Layer  | `server/inventoryDb.ts`                             |

### Related Documentation

| Document                                                                                               | Purpose                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------------ |
| [FEAT-008-INTAKE-VERIFICATION-SPEC.md](/docs/specs/FEAT-008-INTAKE-VERIFICATION-SPEC.md)               | Two-step verification workflow |
| [MEET-066 Completion Report](/docs/archive/completion-reports/MEET-066-INTAKE-TERMINOLOGY-UPDATE.md)   | Terminology changes            |
| [GOLDEN_FLOWS_BETA_ROADMAP.md](/docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md)                            | Phase 0/1 tasks                |
| [GOLDEN_FLOWS_PROD_READY_PLAN_2026-01-27.md](/docs/reports/GOLDEN_FLOWS_PROD_READY_PLAN_2026-01-27.md) | Current blockers               |
| [TERP_Final_Unified_Report.md](/docs/meeting-analysis-2026-01-11/TERP_Final_Unified_Report.md)         | Customer meeting notes         |
| [CLAUDE.md](/CLAUDE.md)                                                                                | Agent protocol                 |

### Revision History

| Version | Date       | Author       | Changes                                                                                                                              |
| ------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2026-01-27 | Claude Agent | Initial specification                                                                                                                |
| 2.0     | 2026-01-27 | Claude Agent | Added problem statement, terminology, known issues, success metrics, FEAT-008 integration, acceptance criteria                       |
| 3.0     | 2026-01-27 | Claude Agent | Added 65 adversarial test scenarios per QA Protocol v3.0 (input fuzzing, state-based, auth, business logic, concurrency, edge cases) |
