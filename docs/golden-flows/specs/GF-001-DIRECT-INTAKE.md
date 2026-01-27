# GF-001: Direct Intake Specification

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-01-27
**Author:** Claude Agent (GF-PHASE0A-001)

---

## Overview

The Direct Intake flow allows warehouse staff to add inventory batches directly into the system without requiring a Purchase Order. This is the primary method for recording new inventory arrivals from suppliers, capturing product details, quantity, cost (COGS), and storage location in a single transaction.

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

11. User clicks **"Create Purchase"** button
12. If media files exist, they are uploaded first
13. System validates all inputs
14. System creates all required entities in a single transaction
15. Success toast notification displayed
16. Modal closes automatically
17. Inventory list refreshes with new batch

### 4. Alternative Paths

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
| **COGS Fixed Mode**          | Select "Fixed Price" radio       | Single "Unit COGS" input visible                      |
| **COGS Range Mode**          | Select "Price Range" radio       | "Min COGS" and "Max COGS" inputs visible              |
| **Amount Paid Visible**      | Payment Terms = COD or PARTIAL   | "Amount Paid" input field appears                     |
| **Media Files Added**        | Upload files                     | File list with names and remove buttons               |
| **Submitting**               | Click "Create Purchase"          | Button shows loading spinner, disabled                |
| **Validation Error**         | Submit with invalid data         | Toast error, form remains open                        |
| **Success**                  | Successful creation              | Success toast, modal closes                           |

---

## API Endpoints

### Primary Endpoint: `inventory.intake`

| Property       | Value                              |
| -------------- | ---------------------------------- |
| **Endpoint**   | `inventory.intake` (tRPC mutation) |
| **Method**     | POST (via tRPC)                    |
| **Permission** | `inventory:create`                 |

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

### Tables Created/Modified

| Table            | Operation            | Description                          |
| ---------------- | -------------------- | ------------------------------------ |
| `vendors`        | Find or Create       | Supplier record                      |
| `brands`         | Find or Create       | Brand record linked to vendor        |
| `products`       | Find or Create       | Product record linked to brand       |
| `lots`           | Create               | Lot record for batch grouping        |
| `batches`        | Create               | Main inventory batch record          |
| `batchLocations` | Create               | Physical storage location            |
| `auditLogs`      | Create               | Audit trail entry                    |
| `payables`       | Create (conditional) | Created if ownershipType = CONSIGNED |

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
                   └── auditLogs (many, polymorphic)
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

| ID      | Invariant                                        | Verification                                   |
| ------- | ------------------------------------------------ | ---------------------------------------------- |
| INV-001 | `onHandQty >= 0` after intake                    | `onHandQty = input.quantity` (always positive) |
| INV-002 | `reservedQty = 0` after intake                   | Hardcoded in service                           |
| INV-003 | `quarantineQty = 0` after intake                 | Hardcoded in service                           |
| INV-004 | `holdQty = 0` after intake                       | Hardcoded in service                           |
| INV-005 | `defectiveQty = 0` after intake                  | Hardcoded in service                           |
| INV-006 | `batchStatus = AWAITING_INTAKE` after intake     | Hardcoded in service                           |
| INV-007 | Batch.code is unique                             | Database unique constraint                     |
| INV-008 | Batch.sku is unique                              | Database unique constraint                     |
| INV-009 | Lot.code is unique                               | Database unique constraint                     |
| INV-010 | Audit log exists for every batch created         | Service creates audit log in same transaction  |
| INV-011 | All entities created atomically (all or nothing) | Database transaction                           |
| INV-012 | Media files cleaned up on batch creation failure | Rollback logic in frontend                     |

---

## Cross-Flow Touchpoints

| Flow                             | Relationship            | Impact                                                    |
| -------------------------------- | ----------------------- | --------------------------------------------------------- |
| **GF-002: PO Intake**            | Alternative intake path | Uses same `batches` table, different status workflow      |
| **GF-003: Batch QC**             | Next step               | Batches in `AWAITING_INTAKE` status await QC verification |
| **GF-004: Photography**          | Optional next step      | Batch status can transition to `PHOTOGRAPHY_COMPLETE`     |
| **GF-005: Status Change**        | Status management       | Direct intake creates batch in `AWAITING_INTAKE` status   |
| **GF-006: Quantity Adjustment**  | Quantity updates        | Intaked batches can have quantities adjusted              |
| **GF-007: Inventory Management** | Inventory listing       | New batches appear in inventory list immediately          |
| **GF-008: Sales/Orders**         | Order fulfillment       | Batches must reach `LIVE` status before sale              |
| **GF-009: Consignment Payables** | Financial tracking      | CONSIGNED batches create payables automatically           |
| **GF-010: Vendor Management**    | Vendor records          | Intake can create new vendor records                      |

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
    └─────────────┘  └─────────────────┘
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

- [CLAUDE.md](/CLAUDE.md) - Agent protocol and development standards
- [MASTER_ROADMAP.md](/docs/roadmaps/MASTER_ROADMAP.md) - Project roadmap
- [GOLDEN_FLOWS_BETA_ROADMAP.md](/docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md) - Golden flows roadmap
