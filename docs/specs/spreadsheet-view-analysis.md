# Spreadsheet View Analysis - User Workflow Documentation

## Source: Inventory Spreadsheet Screenshot

### Column Structure (Left to Right)
| Column | Header | Description | Sample Values |
|--------|--------|-------------|---------------|
| A | Vendor Code / Date | Combined field: Date header rows (5/27, 6/13, etc.) + Vendor codes (A3, S7, J75, B17) | A3, S7, J75, B17, dates |
| B | Source (brand) | Vendor/Brand name | Snow, Seven, Dr Jones, Berny |
| C | Category | Product category | Deps (Deps = Dispensary?) |
| D | Item | Product/Strain name | White Runts, Pink Certs, Kush Cake, Gelonade, etc. |
| E | Available | Current available quantity | 0, 23, 4, 9, 5, etc. |
| F | Intake | Original intake quantity | 29, 18, 20, 40, 2, 14, etc. |
| G | Ticket | Unit price/ticket price | 0.175, 0.1, 0.2, 0.4, 0.25, 0.35, etc. |
| H | Sub | Subtotal (calculated: Intake × Ticket) | 5.075, 1.8, 4, 8, 0.5, 3.15, etc. |
| I | Notes | Free-form notes | "0.2 flex ok, try for 0.3", price ranges like "0.45-0.425" |
| J | Confirm intake / change of inventory count | Status indicator | "Ofc", "ofc", "C" (confirmed?) |
| K+ | Additional columns | Appear to be empty or for additional tracking | |

### Key Observations - Inventory Sheet
1. **Date-based grouping**: Rows are grouped by date (5/27, 6/13, 6/20, 6/25, 6/30, 7/2, 7/4)
2. **Vendor code prefix**: Each item row starts with a vendor code (A3, S7, J75, B17)
3. **Color coding**: 
   - Orange/tan cells in "Confirm intake" column = "C" status
   - Cyan/teal cells = "Ofc" or "ofc" status
4. **Calculated fields**: Sub appears to be Intake × Ticket
5. **Notes contain negotiation info**: Price flexibility notes like "0.2 flex ok, try for 0.3"

---

## Source: Client Tab Spreadsheet Screenshot

### Header Row Summary Values
| Position | Value | Description |
|----------|-------|-------------|
| Top | 41.096 | Appears to be running total |
| | 3.865 | Secondary metric |
| | 1434.7515 | Cumulative value |
| | 1393.656 | Another cumulative value |

### Column Structure
| Column | Header | Description | Sample Values |
|--------|--------|-------------|---------------|
| A | W | Week/Date identifier | 7/7, 6/27, 6/26, 6/24, 6/20, 6/19 |
| B | # | Vendor/Batch code | B17, S10, M15, S7, T5, A4, D14 |
| C | Item | Product/Strain name | Melonade, Runtz cake, Monkey Skittles, etc. |
| D | # | Quantity ordered | 2, 1, 3, 4, 5 |
| E | Tic | Ticket/Unit price | 0.95, 1.05, 1.2, 0.65, 0.225, etc. |
| F | T | Total (Qty × Tic) | 1.9, 2.1, 1.2, 0.65, 0.675, etc. |
| G | In | Intake/Invoice amount | 100, 140 (green highlight for payments) |
| H | Note | Order notes | "Pack 1 less of each", "Friendly order:" |
| I | P | Paid indicator | X, x |
| J | Iv | Invoice indicator | X, x |
| K | C | Confirmed indicator | (appears empty in sample) |

### Key Observations - Client Sheet
1. **Date-based organization**: Orders grouped by date (7/7, 6/27, 6/26, 6/24, 6/20, 6/19)
2. **Order grouping**: Multiple items under same date = single order
3. **Payment tracking**: Green highlighted rows (7/7, 6/24) show payment amounts (100, 140)
4. **Status columns**: P (Paid), Iv (Invoiced), C (Confirmed) use X/x markers
5. **Running totals at top**: Summary calculations for client account
6. **Notes for special instructions**: "Pack 1 less of each", "Friendly order:"

---

## Data Mapping to TERP ERP

### Inventory Sheet → TERP Entities
| Spreadsheet Field | TERP Entity | TERP Field |
|-------------------|-------------|------------|
| Vendor Code | lots | code |
| Source (brand) | vendors/clients (isSeller) | name |
| Category | products | category |
| Item | products | name |
| Available | batches | onHandQty |
| Intake | batches | (original quantity from intake) |
| Ticket | batches | unitCogs |
| Sub | (calculated) | Intake × Ticket |
| Notes | batches | metadata or notes |
| Confirm status | batches | batchStatus |

### Client Sheet → TERP Entities
| Spreadsheet Field | TERP Entity | TERP Field |
|-------------------|-------------|------------|
| W (Date) | orders | createdAt |
| # (Vendor code) | lots/batches | code |
| Item | products | name |
| # (Qty) | order items | quantity |
| Tic | order items | unitPrice |
| T (Total) | order items | lineTotal |
| In (Payment) | payments | amount |
| Note | orders | notes |
| P (Paid) | orders | paymentStatus |
| Iv (Invoiced) | orders | invoiceId |
| C (Confirmed) | orders | confirmedAt |

---

## User Workflow Patterns

### Inventory Management
1. Receive product from vendor on specific date
2. Assign vendor code (A3, S7, etc.)
3. Record intake quantity and ticket price
4. Track available quantity as sales occur
5. Confirm intake with status marker

### Client Order Management
1. Record orders by date
2. Link to vendor/batch codes
3. Track quantities and pricing
4. Mark payment status
5. Mark invoice status
6. Track running totals per client
