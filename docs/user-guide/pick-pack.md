# Pick & Pack Module

**Module:** Warehouse Operations  
**Last Updated:** 2025-12-31

---

## Overview

The Pick & Pack module provides warehouse staff with a dedicated interface for order fulfillment. It enables efficient picking, packing, and tracking of orders through the fulfillment process. This module was designed based on user feedback that **scanning is not time-advantageous** - instead, it uses a fast, click-based interface for selecting and grouping items.

---

## Getting Started

### Accessing Pick & Pack

1. Click **Pick & Pack** in the sidebar navigation
2. You'll see the Pick Queue with orders ready for fulfillment

### Interface Overview

```
┌─────────────────────────────────────────────────────────┐
│  Pick & Pack                              [Filter] [⟳]  │
├─────────────────────────────────────────────────────────┤
│  Pick Queue (12 orders)                                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │ ☐ Order #1234 - Acme Corp      Priority: HIGH      ││
│  │   3 items | Created: 10:30 AM  | Status: PENDING   ││
│  ├─────────────────────────────────────────────────────┤│
│  │ ☐ Order #1235 - Best Buds      Priority: NORMAL    ││
│  │   5 items | Created: 10:45 AM  | Status: PICKING   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Pick Queue

### Understanding the Queue

Orders appear in the Pick Queue when their status is **CONFIRMED** by the sales team. The queue shows:

| Column   | Description                     |
| -------- | ------------------------------- |
| Order #  | Unique order identifier         |
| Customer | Client name                     |
| Items    | Number of line items            |
| Priority | HIGH, NORMAL, LOW               |
| Created  | When order was placed           |
| Status   | PENDING, PICKING, PACKED, READY |

### Status Flow

```
CONFIRMED → PENDING → PICKING → PACKED → READY → SHIPPED
    ↑          ↑          ↑         ↑        ↑
  Sales    Pick Queue   Worker   All items  Dispatch
 confirms   appears    claims    packed     ready
```

### Filtering Orders

Use the Filter button to narrow the queue:

- **Priority:** HIGH, NORMAL, LOW
- **Status:** PENDING, PICKING, PACKED
- **Date Range:** Today, This Week, Custom
- **Customer:** Search by name

---

## Picking Orders

### Starting a Pick

1. Click on an order in the queue
2. Click **"Start Picking"** to claim the order
3. Order status changes to **PICKING**
4. Other workers see it's being worked on

### Pick List View

When you open an order, you see the detailed pick list:

```
┌─────────────────────────────────────────────────────────┐
│  Order #1234 - Acme Corp                    [PICKING]   │
├─────────────────────────────────────────────────────────┤
│  ☐ OG-KUSH-AAA-001    Qty: 10 lbs    Loc: A-1-3        │
│  ☐ BLUE-DREAM-002     Qty: 5 lbs     Loc: A-2-1        │
│  ☐ GELATO-003         Qty: 8 lbs     Loc: B-1-2        │
├─────────────────────────────────────────────────────────┤
│  [Select All]  [Pack Selected →]                        │
└─────────────────────────────────────────────────────────┘
```

### Picking Items

1. Physically locate items using the **Location** column
2. Check the checkbox for each item as you pick it
3. Use **"Select All"** for bulk selection

---

## Packing Orders (WS-003)

### Group Bagging/Packing Action

Pack multiple items into bags/containers efficiently.

#### How to Pack

1. **Select Items:**
   - Check boxes for items to pack together
   - Or use "Select All" for entire order

2. **Click "Pack Selected":**
   - A dialog appears for bag assignment

3. **Assign to Bag:**
   | Option | Description |
   |--------|-------------|
   | New Bag | Creates BAG-001, BAG-002, etc. |
   | Existing Bag | Add to previously created bag |

4. **Confirm:**
   - Items are assigned to the bag
   - Visual indicator shows packed status

#### Bag Identification

Bags are automatically numbered within each order:

- `BAG-001` - First bag
- `BAG-002` - Second bag
- etc.

You can also add custom notes to bags (e.g., "Fragile", "Keep Cool").

### Packed Items View

Packed items show:

- ✅ Green checkmark
- Bag identifier
- Packed timestamp
- Who packed it

```
✅ OG-KUSH-AAA-001    Qty: 10 lbs    BAG-001    Packed 11:30 AM
```

---

## Order Completion

### Marking Order Ready

Once all items are packed:

1. Click **"Mark Ready"** button
2. Order status changes to **READY**
3. Order moves to Ready for Dispatch queue

**Note:** You cannot mark an order ready until all items are packed.

### Bulk Actions

For efficiency:

- **"Mark All Packed"** - Packs all remaining items into one bag
- **"Complete Order"** - Packs and marks ready in one action

---

## Printing

### Packing Slip

Generate a packing slip for the order:

1. Open the order
2. Click **"Print Packing Slip"**
3. Slip includes:
   - Order details
   - Item list with quantities
   - Bag assignments
   - Customer info

### Labels

Print bag labels:

1. Select bags to label
2. Click **"Print Labels"**
3. Labels include:
   - Bag ID
   - Order number
   - Customer name
   - Item count

---

## Real-Time Updates

The Pick & Pack module updates in real-time:

- **New orders** appear automatically when sales confirms
- **Status changes** reflect immediately
- **Other workers' claims** show instantly

No need to refresh the page.

---

## Business Rules

| Rule              | Description                                        |
| ----------------- | -------------------------------------------------- |
| Inventory Check   | Items can only be packed if inventory is available |
| Unique Bag IDs    | Bag identifiers are unique within each order       |
| Pack Before Ready | All items must be packed before marking ready      |
| Unpack Override   | Unpacking requires manager approval                |
| Audit Trail       | All actions are logged with user and timestamp     |

---

## Tips & Best Practices

1. **Claim Orders** before starting to prevent duplicate work

2. **Use Locations** to optimize your picking path through the warehouse

3. **Pack by Customer** - Group items logically for the customer

4. **Add Notes** to bags for special handling instructions

5. **Check Inventory** if an item shows unavailable - it may need restocking

6. **Print Slips** before dispatch for verification

---

## Troubleshooting

### "Cannot pack - insufficient inventory"

The item's available quantity is less than ordered. Check with inventory team.

### "Order not appearing in queue"

Order may not be confirmed yet. Check with sales team.

### "Cannot mark ready - items not packed"

All line items must be assigned to bags before completion.

### "Cannot unpack item"

Unpacking requires manager override. Contact a supervisor.

---

## Keyboard Shortcuts

| Shortcut | Action                |
| -------- | --------------------- |
| `Space`  | Toggle item selection |
| `Ctrl+A` | Select all items      |
| `Enter`  | Open Pack dialog      |
| `Esc`    | Cancel/Close dialog   |

---

_For technical issues, contact your system administrator._
