# Inventory Features

**Module:** Inventory Management  
**Last Updated:** 2025-12-31

---

## Overview

The Inventory module manages all product batches, stock levels, and intake processes. It supports the complex workflows required for cannabis inventory including flower intake, quality tracking, and compliance documentation.

---

## Batch Management

### Understanding Batches

A **batch** represents a specific lot of product with:

- Unique batch code
- SKU
- Quantity on hand
- Cost of goods (COGS)
- Quality attributes
- Compliance data

### Viewing Inventory

1. Navigate to **Inventory**
2. See all batches with:
   - Code and SKU
   - Available quantity
   - Reserved quantity
   - Location
   - Status

### Filtering Inventory

Filter by:

- **Status:** Active, Low Stock, Out of Stock
- **Category:** Flower, Concentrate, Edible, etc.
- **Location:** Warehouse section
- **Vendor:** Source supplier

---

## Complex Flower Intake Flow (WS-007)

Handle incoming flower shipments with full documentation.

### Intake Process

#### Step 1: Create Intake Record

1. Navigate to **Inventory → Intake**
2. Click **"+ New Intake"**
3. Enter shipment details:
   - Vendor
   - Expected items
   - PO number (if applicable)

#### Step 2: Receive Items

For each item in the shipment:

| Field      | Description              |
| ---------- | ------------------------ |
| Product    | Select or create product |
| Batch Code | Unique identifier        |
| Quantity   | Amount received          |
| Unit       | lbs, oz, units           |
| Unit Cost  | Cost per unit            |
| Location   | Storage location         |

#### Step 3: Quality Check

Document quality attributes:

```
┌─────────────────────────────────────────┐
│  Quality Assessment                      │
├─────────────────────────────────────────┤
│  Appearance:    ★★★★☆                   │
│  Aroma:         ★★★★★                   │
│  Moisture:      12.5%                   │
│  THC %:         24.3%                   │
│  CBD %:         0.8%                    │
│  Terpenes:      Limonene, Myrcene       │
│  Notes:         Dense buds, good trim   │
└─────────────────────────────────────────┘
```

#### Step 4: Compliance Documentation

Attach required documents:

- COA (Certificate of Analysis)
- Manifest
- Photos
- Test results

#### Step 5: Complete Intake

1. Review all entries
2. Click **"Complete Intake"**
3. Inventory is updated
4. Vendor bill is optionally created

---

## Low Stock & Needs-Based Alerts (WS-008)

Get notified when inventory needs attention.

### Alert Types

| Alert             | Trigger                  | Action          |
| ----------------- | ------------------------ | --------------- |
| **Low Stock**     | Below minimum threshold  | Reorder         |
| **Out of Stock**  | Zero available           | Urgent reorder  |
| **Expiring Soon** | Within expiration window | Sell or dispose |
| **Quality Issue** | Failed QC check          | Quarantine      |

### Configuring Alerts

1. Navigate to **Settings → Inventory Alerts**
2. Set thresholds:
   - Low stock threshold (e.g., 10 units)
   - Expiration warning days (e.g., 30 days)
3. Choose notification method:
   - In-app notification
   - Email
   - Dashboard widget

### Viewing Alerts

- **Dashboard:** Alert widget shows urgent items
- **Inventory:** Filter by "Needs Attention"
- **Notifications:** Bell icon in header

---

## Inventory Movement SOP Flow (WS-009)

Track inventory movements with proper procedures.

### Movement Types

| Type           | Description              |
| -------------- | ------------------------ |
| **Intake**     | Receiving new inventory  |
| **Transfer**   | Moving between locations |
| **Adjustment** | Correcting quantities    |
| **Sale**       | Sold to customer         |
| **Return**     | Customer return          |
| **Disposal**   | Waste or destruction     |

### Recording a Movement

1. Navigate to **Inventory → Movements**
2. Click **"+ New Movement"**
3. Select movement type
4. Enter details:
   - Batch
   - Quantity
   - From/To location
   - Reason
5. Attach documentation if required
6. Submit for approval (if configured)

### Movement Approval

For certain movements (e.g., adjustments, disposals):

1. Movement is submitted
2. Manager receives notification
3. Manager reviews and approves/rejects
4. Inventory is updated on approval

---

## Photography Module (WS-010)

Capture and manage product photos.

### Taking Photos

1. Open batch detail page
2. Click **"Add Photos"**
3. Options:
   - Upload from device
   - Take with camera (mobile)
   - Import from file

### Photo Requirements

| Type        | Purpose            | Guidelines                 |
| ----------- | ------------------ | -------------------------- |
| **Primary** | Main product image | White background, centered |
| **Detail**  | Close-up features  | Show trichomes, color      |
| **Package** | Packaging shot     | Include labels             |
| **COA**     | Certificate scan   | Legible, full document     |

### Photo Management

- **Set Primary:** Choose main display image
- **Reorder:** Drag to arrange
- **Delete:** Remove unwanted photos
- **Download:** Export for marketing

---

## Stock Levels

### Available vs Reserved

| Type          | Description             |
| ------------- | ----------------------- |
| **On Hand**   | Total physical quantity |
| **Reserved**  | Committed to orders     |
| **Available** | On Hand - Reserved      |

### Checking Availability

Before creating orders, check:

```
Batch: OG-KUSH-001
On Hand:    100 lbs
Reserved:    35 lbs
─────────────────────
Available:   65 lbs
```

### Reservations

Inventory is reserved when:

- Order is confirmed
- Quote is converted
- Manual hold is placed

Reservations are released when:

- Order is cancelled
- Order is shipped
- Hold is removed

---

## Locations

### Location Hierarchy

```
Warehouse A
├── Section 1
│   ├── Shelf A-1-1
│   ├── Shelf A-1-2
│   └── Shelf A-1-3
├── Section 2
│   └── ...
└── Cold Storage
    └── ...
```

### Managing Locations

1. Navigate to **Settings → Locations**
2. Create warehouse structure
3. Assign batches to locations

### Location-Based Picking

Pick & Pack uses locations to:

- Optimize picking routes
- Show item locations to workers
- Track inventory position

---

## Reports

### Inventory Valuation

View total inventory value:

- By category
- By location
- By vendor
- At cost vs. market value

### Movement History

Track all inventory changes:

- Filter by date range
- Filter by movement type
- Export to CSV

### Aging Report

See how long inventory has been on hand:

- 0-30 days
- 31-60 days
- 61-90 days
- 90+ days

---

## Tips & Best Practices

1. **Complete Intake Thoroughly** - Document everything during receiving

2. **Set Appropriate Thresholds** - Avoid stockouts with proper alerts

3. **Use Locations** - Accurate locations speed up picking

4. **Take Quality Photos** - Good images help sales

5. **Regular Cycle Counts** - Verify physical matches system

6. **Document Adjustments** - Always note reasons for changes

---

## Troubleshooting

### "Cannot reserve - insufficient quantity"

Available quantity is less than requested. Check other reservations.

### "Batch not found"

Verify batch code. May be archived or deleted.

### "Movement requires approval"

Certain movements need manager sign-off. Wait for approval.

### "Cannot delete batch with reservations"

Cancel or fulfill orders first, then delete.

---

_For technical issues, contact your system administrator._
