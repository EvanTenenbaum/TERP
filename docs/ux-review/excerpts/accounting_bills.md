# Baseline excerpt for `Bills`

**Route:** `/accounting?tab=bills` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `Bills` (accounting)

* **Route:** Embedded in `/accounting?tab=bills`.
* **Features:** Filterable/sortable table; detail sheet with `BillStatusActions` state machine and `BillStatusTimeline`; create bill dialog; aging badges; deep-link via `?billId=`.

---

## Runtime supplement (if any)

- **Appointments** — "Today & next 7 days" · `View all` · empty state shown: "No upcoming appointments — No appointments scheduled for the next 7 days".
- **Cash Position** — "What you have vs. what you owe" · `Manage` · live message "You're short $551,981.62 after scheduled bills." · rows: Cash on Hand `$0.00`, Scheduled Payables `$551,981.62` ("Bills already scheduled to go out"), Available After Bills `-$551,981.62`. Footer: "Updated 04/22 9:59 PM" and `Review Bills` button.
- **Money In vs. Out** — "What customers owe you vs. what you owe suppliers" · `View Clients` · alert message "You owe suppliers $125,561.41 more than customers owe you — collect faster." · table: Customers owe you `$963,103.66` (`Collect` action), You owe suppliers `$1,088,665.07` (`Pay` action), Net Position `$-125,561.41`.
- **Suppliers Waiting to Be Paid** — "You've sold their product — now they need to get paid." · `Pay Bills` · empty: "All suppliers are paid up. No sold-out batches with outstanding balances."
- **What's In Stock** — "38,185.26 units across 9 categories — worth $34,215,625" · `View All →` · toggle **By Category / By Price** · table ranks categories by inventory value (Flower, Topical, Edible, Pre-Roll, Vape, Concentrate, Tincture, Vapes, Edibles) with Units Available and Inventory Value columns, plus a Total row.
- **Inventory Aging** — four status chips (`Fresh (0-7d): 0 · 0 units`, `Moderate (8-14d): 0 · 0 units`, `Aging (15-30d): 1 · 1 units`, `Critical (30+d): 178 · 38184 units`) · sub-header "Items Over 2 Weeks Old · 179 batches - $34,215,625 value at risk" · two filter buttons (`Aging` / `Critical`) · `View All`.
- **Top 5 Oldest Items** — each card shows product name, SKU, and age-in-days (all showed "60d"): Bespoke Flower – adrenalin (SKU-0108-0118-198), Gorgeous Flower – hawk (SKU-0101-0108-197), Cereal Milk – Greenhouse A Smalls (SKU-0239-0088-195), Biscotti – Greenhouse AA Smalls (SKU-0236-0058-192), Zkittlez – Outdoor AAA Smalls (SKU-0234-0131-190).
- **SKU Status Browser** — "303 total" · `View All` · helper text "Click to see SKU counts by status".

**Primary actions visible:** `Collect`, `Pay`, `Pay Bills`, `Review Bills`, `Manage`, `View Clients`, `View All` / `View All →`, `By Category`, `By Price`, `Aging`, `Critical`.

- **Dashboard** (default)
- **Invoices**
- **Bills**
- **Payments**
- **General Ledger**
- **Chart of Accounts**
- **Expenses**
- **Bank Accounts**
- **Bank Transactions**
- **Fiscal Periods**
