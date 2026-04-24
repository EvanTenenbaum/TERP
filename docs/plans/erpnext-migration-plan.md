# TERP → ERPNext Migration Plan

> **For Hermes:** Use `subagent-driven-development` skill to execute this plan phase-by-phase.
>
> **Goal:** Rebuild TERP's full functional surface on top of ERPNext (Frappe Framework), using ERPNext's built-in modules wherever possible and building a custom Frappe app (`terp_cannabis`) only for THCA-cannabis-specific functionality not covered by ERPNext out of the box.
>
> **Source requirements:** `docs/FUNCTIONAL_BASELINE.md` + `docs/FUNCTIONAL_BASELINE_RUNTIME.md` (commit `db6af0a7`)
>
> **Guiding principle:** If ERPNext has it, use it. Build custom only where ERPNext cannot meet the need. No gold-plating — functionality parity only.

---

## Architecture Decision Record

### ERPNext Covers (use as-is or with minor config)

| TERP Concept | ERPNext DocType |
|---|---|
| Orders (sales) | `Sales Order` |
| Quotes | `Quotation` |
| Invoices | `Sales Invoice` |
| Bills (AP) | `Purchase Invoice` |
| Payments received | `Payment Entry` (Receive) |
| Payments sent | `Payment Entry` (Pay) |
| GL / ledger entries | `GL Entry` / `Journal Entry` |
| Chart of accounts | `Account` |
| Bank accounts | `Bank Account` |
| Bank transactions | `Bank Transaction` |
| Fiscal periods | `Accounting Period` + `Fiscal Year` |
| Expenses | `Expense Claim` |
| Customers (buyers) | `Customer` + custom fields |
| Suppliers (sellers) | `Supplier` + custom fields |
| Purchase orders | `Purchase Order` |
| Returns (sales) | `Sales Return` (Credit Note) |
| Products / items | `Item` + custom fields |
| Batch / lot | `Batch` + custom fields |
| Warehouses / locations | `Warehouse` |
| Stock movements | `Stock Entry` / `Stock Ledger Entry` |
| Pricing rules | `Pricing Rule` + custom extension |
| Payment terms | `Payment Term` + custom types |
| Users | `User` |
| Roles / permissions | `Role` + `DocPerm` |
| Calendar / events | `Event` |
| Todos / tasks | `ToDo` |
| Notifications | `Notification Log` |
| Comments | `Comment` |
| Tags | `Tag` |
| Reports (base) | Frappe Report engine |

### Must Build Custom (new DocTypes in `terp_cannabis` app)

| Custom Concept | Reason ERPNext is insufficient |
|---|---|
| `THCA Strain` | No cannabis strain entity in ERPNext |
| `COGS Rule` | ERPNext COGS is fixed; TERP has LOW/MID/HIGH range model |
| `Pricing Profile` | ERPNext Pricing Rules don't support per-client markup profiles |
| `Sales Catalogue` | No shareable token-based catalogue in ERPNext |
| `Sales Catalogue Item` | Child table |
| `Live Shopping Session` | Not in ERPNext |
| `Live Shopping Participant` | Not in ERPNext |
| `Intake Session` | ERPNext receiving is PO-based; TERP has direct intake |
| `Intake Session Batch` | Child table |
| `Intake Receipt` | ERPNext Purchase Receipt works for PO-based; need custom for full TERP flow |
| `Intake Discrepancy` | Not in ERPNext |
| `Photography Queue` | Not in ERPNext |
| `Sample Request` | Not in ERPNext |
| `Sample Allocation` | Not in ERPNext |
| `Credit Limit` | ERPNext has basic credit limit; TERP has multi-mode enforcement with override workflows |
| `Credit Adjustment` | Not in ERPNext |
| `Credit Override Request` | Not in ERPNext |
| `Client Need` | Not in ERPNext |
| `Supplier Supply` | Not in ERPNext |
| `Match Record` | Not in ERPNext |
| `Workflow Queue Status` | Not in ERPNext |
| `Batch Status History` | Not in ERPNext |
| `VIP Portal Configuration` | Not in ERPNext |
| `VIP Portal Auth` | Not in ERPNext |
| `Feature Flag` | Not in ERPNext |
| `Cash Location` | ERPNext POS has cash but we're not using POS |
| `Shift Audit` | Not in ERPNext |
| `Leaderboard Weight Config` | Not in ERPNext |
| `Leaderboard Rank History` | Not in ERPNext |
| `Farmer Verification Token` | Not in ERPNext |
| `Referral Credit` | Not in ERPNext |
| `Payment Follow-up Template` | Not in ERPNext |

### ERPNext Modules to DISABLE

After installation, hide these modules from all users (via `Module Def` or `hide_modules` in `hooks.py`):

- Manufacturing
- HR & Payroll
- Healthcare
- Point of Sale
- Education
- Agriculture
- Hospitality / Hotels
- Non Profit
- Loans (if present)
- Quality Management (if present)

---

## Repository Structure

```
terp-erpnext/                        ← new GitHub repo
├── apps/
│   └── terp_cannabis/               ← custom Frappe app
│       ├── terp_cannabis/
│       │   ├── __init__.py
│       │   ├── hooks.py             ← event hooks, module defs
│       │   ├── modules.txt          ← module list
│       │   ├── patches.txt          ← migration patches
│       │   ├── doctypes/            ← custom DocTypes
│       │   ├── custom_fields/       ← JSON custom field definitions
│       │   ├── controllers/         ← Python business logic
│       │   ├── services/            ← reusable Python services
│       │   ├── api/                 ← whitelisted API endpoints
│       │   ├── www/                 ← web pages (VIP portal, shared catalogue)
│       │   ├── public/
│       │   │   ├── js/              ← client-side JS overrides
│       │   │   └── css/             ← custom styles
│       │   ├── workspace/           ← desk workspace JSON files
│       │   ├── report/              ← custom reports
│       │   ├── notification/        ← notification templates
│       │   └── fixtures/            ← seed data (accounts, warehouses, etc.)
│       ├── requirements.txt
│       └── setup.py
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile
├── scripts/
│   ├── setup-site.sh
│   └── seed.sh
├── .github/
│   └── workflows/
│       └── ci.yml
└── README.md
```

---

## Phase 0 — Infrastructure Setup

### Task 0.1: Initialize Frappe bench

```bash
pip install frappe-bench
bench init --frappe-branch version-16 terp-bench
cd terp-bench
bench get-app erpnext --branch version-16
bench new-site terp.localhost \
  --mariadb-root-password root \
  --admin-password admin \
  --install-app erpnext
```

**Verify:** `bench --site terp.localhost list-apps` shows `frappe`, `erpnext`.

### Task 0.2: Create custom app scaffold

```bash
cd terp-bench
bench new-app terp_cannabis
# App name: terp_cannabis
# App title: TERP Cannabis
# App publisher: Evan Tenenbaum
# App description: THCA wholesale cannabis ERP
# App email: evan@evanmail.com
# App license: MIT

bench --site terp.localhost install-app terp_cannabis
```

**Files created:** `apps/terp_cannabis/terp_cannabis/hooks.py`, `modules.txt`, etc.

### Task 0.3: Docker Compose for dev environment

Create `docker/docker-compose.yml`:

```yaml
version: '3'
services:
  mariadb:
    image: mariadb:10.6
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: terp
    ports:
      - "3306:3306"
  redis-cache:
    image: redis:7-alpine
    ports:
      - "13000:6379"
  redis-queue:
    image: redis:7-alpine
    ports:
      - "11000:6379"
  redis-socketio:
    image: redis:7-alpine
    ports:
      - "12000:6379"
```

### Task 0.4: GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mariadb:
        image: mariadb:10.6
        env:
          MYSQL_ROOT_PASSWORD: root
        ports:
          - 3306:3306
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Setup bench
        run: |
          pip install frappe-bench
          bench init --skip-assets frappe-bench
          cd frappe-bench
          bench get-app erpnext --branch version-16
          bench get-app terp_cannabis $GITHUB_WORKSPACE
          bench new-site test_site \
            --mariadb-root-password root \
            --admin-password admin \
            --no-mariadb-socket \
            --db-host 127.0.0.1 \
            --install-app erpnext
          bench --site test_site install-app terp_cannabis
          bench --site test_site run-tests --app terp_cannabis
```

### Task 0.5: Configure site — skip setup wizard, enable developer mode

```bash
bench --site terp.localhost set-config developer_mode 1
bench --site terp.localhost set-config skip_setup_wizard 1
bench --site terp.localhost execute frappe.utils.install.complete_setup_wizard
```

---

## Phase 1 — Company & Base ERPNext Configuration

These are ERPNext standard setup steps. Create a `fixtures/` seed script to automate.

### Task 1.1: Company setup

Create `terp_cannabis/fixtures/company.json`:

```json
{
  "doctype": "Company",
  "company_name": "TERP Cannabis",
  "abbr": "TERP",
  "default_currency": "USD",
  "country": "United States",
  "domain": "Distribution"
}
```

### Task 1.2: Chart of accounts

Map TERP's 9 account types to ERPNext's account tree. The CoA should include:
- Asset: Cash, Checking, Operating Account, Receivables, Inventory Asset
- Liability: Payables, Credit Card, Deferred Revenue
- Equity: Owner's Equity, Retained Earnings
- Revenue: Sales Revenue, Service Revenue
- Expense: COGS, Operating Expenses, Bank Fees

Seed via `fixtures/accounts.json` (array of `Account` doctypes).

### Task 1.3: Warehouses (TERP locations)

Create `fixtures/warehouses.json` with:
- `Main Warehouse` (default)
- `TERP House Premium`
- Support for user-created locations via the `Warehouse` DocType in ERPNext UI

### Task 1.4: Unit of Measure

Add UOMs to match TERP's unit types:

| Code | Name | Category |
|---|---|---|
| LB | Pound | Weight |
| OZ | Ounce | Weight |
| G | Gram | Weight |
| KG | Kilogram | Weight |
| EA | Each | Count |
| ML | Milliliter | Volume |

Seed via `fixtures/uom.json`.

### Task 1.5: Payment Terms

Create `fixtures/payment_terms.json`:
- `Cash on Delivery (COD)` — due on delivery
- `Consignment` — due when sold
- `Net 30`
- `Net 15`

### Task 1.6: Fiscal Year

Seed via `fixtures/fiscal_year.json` — Jan 1 – Dec 31 (annual).

### Task 1.7: Tax Template

Create a zero-tax template (cannabis wholesale is typically not subject to standard sales tax in B2B context). Name: `Cannabis Wholesale - Zero Rate`.

### Task 1.8: Disable irrelevant ERPNext modules

In `terp_cannabis/hooks.py`:

```python
hide_modules = [
    "Manufacturing",
    "HR",
    "Payroll",
    "Healthcare",
    "Point of Sale",
    "Education",
    "Agriculture",
    "Non Profit",
    "Quality Management",
    "Loan Management",
    "Hospitality",
]
```

---

## Phase 2 — Item & Product Catalogue Extensions

ERPNext `Item` DocType is the core product entity. We extend it with cannabis-specific fields via custom fields (not forking the DocType).

### Task 2.1: Custom fields on Item

File: `terp_cannabis/custom_fields/item_custom_fields.json`

Add these fields to `Item`:

| Field Name | Type | Label | Options |
|---|---|---|---|
| `strain` | Link | Strain | THCA Strain |
| `product_grade` | Link | Grade | Product Grade |
| `product_type` | Select | Product Type | Flower\nPre-Roll\nConcentrate\nEdible\nVape\nTincture\nTopical |
| `cogs_mode` | Select | COGS Mode | FIXED\nRANGE |
| `cogs_fixed` | Currency | COGS (Fixed) | |
| `cogs_low` | Currency | COGS Low | |
| `cogs_mid` | Currency | COGS Mid | |
| `cogs_high` | Currency | COGS High | |
| `requires_photography` | Check | Requires Photography | |
| `workflow_status` | Link | Workflow Status | Workflow Queue Status |

Apply via `bench --site terp.localhost migrate` after adding to `hooks.py`:

```python
fixtures = [
    {"dt": "Custom Field", "filters": [["module", "=", "terp_cannabis"]]}
]
```

### Task 2.2: Custom fields on Batch

File: `terp_cannabis/custom_fields/batch_custom_fields.json`

| Field | Type | Label |
|---|---|---|
| `sku` | Data | SKU |
| `batch_status` | Select | Batch Status (Awaiting Intake, Live, Sold Out, Archived) |
| `supplier` | Link | Supplier | Supplier |
| `lot_number` | Data | Lot # |
| `unit_cost` | Currency | Unit COGS |
| `vendor_range_low` | Currency | Vendor Range Low |
| `vendor_range_high` | Currency | Vendor Range High |
| `location_notes` | Small Text | Location Notes |
| `photography_status` | Select | Photo Status (Pending, Shot, Published) |
| `last_movement_date` | Datetime | Last Movement |
| `age_days` | Int | Age (Days) — computed |
| `intake_session` | Link | Intake Session | Intake Session |

### Task 2.3: THCA Strain DocType

File: `terp_cannabis/doctypes/thca_strain/`

Fields:
- `strain_name` (Data, required, title)
- `strain_type` (Select: Indica / Sativa / Hybrid / CBD)
- `description` (Small Text)
- `is_active` (Check, default 1)

Controller: none (simple master data).

### Task 2.4: Product Grade DocType

File: `terp_cannabis/doctypes/product_grade/`

Fields:
- `grade_code` (Data, required) — A, B, C, AA, AAA, etc.
- `grade_label` (Data, required) — Full label
- `description` (Small Text)

Seed: A, B, C, AA, AAA (with Smalls, Shake variants as separate grades).

### Task 2.5: Item Group configuration

Map TERP's categories to ERPNext `Item Group` hierarchy:

```
Cannabis Products (root)
├── Flower
│   ├── Indoor
│   ├── Greenhouse
│   └── Outdoor
├── Pre-Roll
├── Concentrate
├── Edible
├── Vape
├── Tincture
└── Topical
```

Seed via `fixtures/item_group.json`.

---

## Phase 3 — Customer & Supplier Extensions

### Task 3.1: Custom fields on Customer

File: `terp_cannabis/custom_fields/customer_custom_fields.json`

| Field | Type | Label |
|---|---|---|
| `is_seller` | Check | Is Also Supplier |
| `customer_tags` | Table MultiSelect | Tags | Tag |
| `license_number` | Data | License # |
| `referred_by` | Link | Referred By | Customer |
| `credit_limit_mode` | Select | Credit Enforcement | WARNING\|SOFT_BLOCK\|HARD_BLOCK |
| `vip_portal_enabled` | Check | VIP Portal Active |
| `preferred_payment_term` | Link | Preferred Payment Term | Payment Term |
| `sales_rep` | Link | Sales Rep | User |

### Task 3.2: Custom fields on Supplier

| Field | Type | Label |
|---|---|---|
| `license_number` | Data | License # |
| `harvest_reminder_days` | Int | Harvest Reminder Days |
| `verification_email` | Data | Verification Email |
| `is_buyer` | Check | Is Also Customer |
| `supplier_notes` | Small Text | Notes |

### Task 3.3: Client Communication Log DocType

File: `terp_cannabis/doctypes/client_communication_log/`

Fields:
- `customer` (Link → Customer, required)
- `comm_type` (Select: Call / SMS / Email / Meeting / Note)
- `subject` (Data)
- `body` (Long Text)
- `comm_date` (Datetime, default now)
- `logged_by` (Link → User, auto-set from session)
- `follow_up_date` (Date)

Linked from Customer DocType via `links` in `hooks.py`.

### Task 3.4: VIP Portal Configuration DocType

File: `terp_cannabis/doctypes/vip_portal_configuration/`

Fields:
- `customer` (Link → Customer, required, unique)
- `portal_enabled` (Check)
- `enable_live_catalog` (Check)
- `enable_live_shopping` (Check)
- `enable_marketplace` (Check)
- `enable_appointments` (Check)
- `enable_leaderboard` (Check)
- `enable_referrals` (Check)
- `portal_password_hash` (Password)

### Task 3.5: Supplier Harvest Reminder DocType

File: `terp_cannabis/doctypes/supplier_harvest_reminder/`

Fields:
- `supplier` (Link → Supplier)
- `reminder_date` (Date)
- `strain` (Link → THCA Strain)
- `expected_quantity` (Float)
- `notes` (Small Text)
- `status` (Select: Pending / Sent / Acknowledged)

### Task 3.6: Client Note DocType

File: `terp_cannabis/doctypes/client_note/`

Fields:
- `customer` (Link → Customer)
- `note_body` (Long Text)
- `created_by` (Link → User, auto)
- `created_at` (Datetime, auto)
- `is_pinned` (Check)

---

## Phase 4 — Inventory Operations Custom DocTypes

### Task 4.1: Intake Session DocType (Direct Intake — no PO)

File: `terp_cannabis/doctypes/intake_session/`

Fields:
- `session_id` (Data, auto-named)
- `supplier` (Link → Supplier)
- `intake_date` (Datetime, default now)
- `intake_by` (Link → User)
- `status` (Select: Pending / Submitted / Cancelled)
- `warehouse` (Link → Warehouse)
- `notes` (Small Text)
- `items` (Table → Intake Session Batch)

**Controller (`intake_session.py`):**
- On submit: create `Stock Entry` records for each batch item, create `Batch` records, emit notification.

### Task 4.2: Intake Session Batch DocType (child table)

File: `terp_cannabis/doctypes/intake_session_batch/`

Fields:
- `item` (Link → Item)
- `batch_no` (Link → Batch)
- `qty` (Float)
- `unit` (Link → UOM)
- `cogs_mode` (Select: FIXED / RANGE)
- `unit_cogs` (Currency)
- `cogs_low` (Currency)
- `cogs_high` (Currency)
- `location` (Link → Warehouse)
- `notes` (Small Text)
- `status` (Select: New / Received / Error)

### Task 4.3: Farmer Verification Token DocType

File: `terp_cannabis/doctypes/farmer_verification_token/`

Fields:
- `intake_receipt` (Link → Purchase Receipt or Intake Session)
- `supplier` (Link → Supplier)
- `token` (Data, auto-generated UUID)
- `expires_at` (Datetime)
- `verified_at` (Datetime)
- `is_used` (Check)

Web page: `terp_cannabis/www/intake/verify.html` (public, no auth).

### Task 4.4: Photography Queue DocType

File: `terp_cannabis/doctypes/photography_queue/`

Fields:
- `batch_no` (Link → Batch, required)
- `item` (Link → Item)
- `status` (Select: Pending / Shot / Published, default Pending)
- `queued_date` (Date, default today)
- `shot_date` (Date)
- `images` (Table → Photography Queue Image)

Child table `Photography Queue Image`:
- `image` (Attach Image)
- `caption` (Data)
- `uploaded_by` (Link → User)
- `uploaded_at` (Datetime)

**Hook:** On `Batch` creation → auto-create `Photography Queue` entry if `Item.requires_photography = 1`.

### Task 4.5: Sample Request DocType

File: `terp_cannabis/doctypes/sample_request/`

Fields:
- `customer` (Link → Customer)
- `item` (Link → Item)
- `batch_no` (Link → Batch)
- `qty` (Float)
- `unit` (Link → UOM)
- `requested_date` (Date)
- `due_date` (Date)
- `status` (Select: Requested / Allocated / Samples Out / Returned / Expired)
- `location` (Link → Warehouse)
- `allocated_by` (Link → User)
- `notes` (Small Text)

**Controller:** On allocate → create `Stock Entry` (Material Issue) for sample qty.

### Task 4.6: Workflow Queue Status DocType

File: `terp_cannabis/doctypes/workflow_queue_status/`

Fields:
- `status_name` (Data, required)
- `status_color` (Select: Gray / Blue / Green / Yellow / Red / Purple)
- `sort_order` (Int)
- `is_terminal` (Check)
- `description` (Small Text)

Seed: Awaiting Intake, Live, Photographed, Ready to Ship, Sold Out, Archived.

### Task 4.7: Batch Status History DocType

File: `terp_cannabis/doctypes/batch_status_history/`

Fields:
- `batch_no` (Link → Batch)
- `from_status` (Link → Workflow Queue Status)
- `to_status` (Link → Workflow Queue Status)
- `changed_by` (Link → User)
- `changed_at` (Datetime)
- `notes` (Small Text)

---

## Phase 5 — COGS & Pricing

### Task 5.1: COGS Rule DocType

File: `terp_cannabis/doctypes/cogs_rule/`

Fields:
- `rule_name` (Data, required)
- `applies_to` (Select: All Customers / Specific Customer / Customer Group)
- `customer` (Link → Customer, conditional)
- `item_group` (Link → Item Group, optional filter)
- `cogs_mode` (Select: FIXED / RANGE)
- `fixed_cogs` (Currency)
- `cogs_low` (Currency)
- `cogs_mid` (Currency)
- `cogs_high` (Currency)
- `priority` (Int, default 0)
- `is_active` (Check, default 1)

### Task 5.2: Pricing Profile DocType

File: `terp_cannabis/doctypes/pricing_profile/`

Fields:
- `profile_name` (Data, required)
- `customer` (Link → Customer, optional)
- `base_markup_pct` (Percent)
- `min_margin_pct` (Percent)
- `max_discount_pct` (Percent)
- `allow_below_vendor_range` (Check)
- `allow_cogs_override` (Check)
- `allow_margin_override` (Check)
- `rules` (Table → Pricing Profile Rule)

Child `Pricing Profile Rule`:
- `item_group` (Link → Item Group)
- `product_type` (Select: Flower / Pre-Roll / etc.)
- `markup_pct` (Percent)
- `basis` (Select: LOW / MID / HIGH / FIXED)

**Python service** `terp_cannabis/services/pricing_service.py`:
```python
def evaluate_price(item, batch, customer, qty):
    """
    Returns: { unit_price, cogs, margin_pct, margin_usd, applied_rules, overrides }
    """
    ...
```

### Task 5.3: Custom fields on Sales Order (pricing context)

Add to `Sales Order`:
- `pricing_profile` (Link → Pricing Profile)
- `cogs_visibility` (Select: Show All / COGS Only / Hidden)
- `referral_credit_applied` (Currency)
- `referred_by` (Link → Customer)
- `order_source` (Select: Direct / Sales Catalogue / Live Shopping / VIP Portal)
- `catalogue_ref` (Link → Sales Catalogue)

### Task 5.4: COGS evaluation hook

`terp_cannabis/hooks.py`:

```python
doc_events = {
    "Sales Order": {
        "validate": "terp_cannabis.controllers.order_controller.validate_pricing",
        "on_submit": "terp_cannabis.controllers.order_controller.on_submit",
    }
}
```

`controllers/order_controller.py`:
- `validate_pricing`: for each item line, call `pricing_service.evaluate_price`, populate `rate`, `cogs`, `margin_pct` custom fields.
- `on_submit`: check credit limit, deduct inventory, create `Sales Invoice` (or link existing), fire notifications.

---

## Phase 6 — Credit Management

### Task 6.1: Credit Limit DocType

File: `terp_cannabis/doctypes/credit_limit/`

Fields:
- `customer` (Link → Customer, required, unique)
- `credit_limit` (Currency)
- `enforcement_mode` (Select: WARNING / SOFT_BLOCK / HARD_BLOCK)
- `current_exposure` (Currency, read-only, computed)
- `available_credit` (Currency, read-only, computed)
- `last_updated` (Datetime)

**Python:** `services/credit_service.py`

```python
def check_credit(customer_name, order_total):
    """
    Returns: { status: 'allowed'|'warning'|'requires_override', 
               exposure, limit, available, mode }
    """
    ...

def get_exposure(customer_name):
    """Sum of open Sales Invoices for customer."""
    ...
```

### Task 6.2: Credit Adjustment DocType

File: `terp_cannabis/doctypes/credit_adjustment/`

Fields:
- `customer` (Link → Customer)
- `adjustment_type` (Select: Manual Credit / Refund Credit / Bad Debt Write-Off / Referral Bonus)
- `amount` (Currency)
- `reason` (Small Text)
- `approved_by` (Link → User)
- `applied_date` (Date)

### Task 6.3: Credit Override Request DocType

File: `terp_cannabis/doctypes/credit_override_request/`

Fields:
- `customer` (Link → Customer)
- `sales_order` (Link → Sales Order)
- `requested_by` (Link → User)
- `requested_amount` (Currency)
- `current_limit` (Currency)
- `status` (Select: Pending / Approved / Rejected)
- `reviewed_by` (Link → User)
- `review_notes` (Small Text)

**Permissions:** Only users with role `Accounting Manager` can approve.

### Task 6.4: Bad Debt Write-Off integration

Extend ERPNext's Journal Entry with a `bad_debt_customer` field. Create a `Bad Debt Write-Off` wizard:
- Select customer → list overdue invoices → mark as bad debt → post Journal Entry (Debit: Bad Debt Expense, Credit: Accounts Receivable).

---

## Phase 7 — Sales Catalogue (Shareable Catalogues)

### Task 7.1: Sales Catalogue DocType

File: `terp_cannabis/doctypes/sales_catalogue/`

Fields:
- `catalogue_name` (Data, auto-name)
- `customer` (Link → Customer, optional — null = generic)
- `status` (Select: Draft / Published / Archived)
- `share_token` (Data, auto-generated UUID on first share)
- `token_expires_at` (Datetime, optional)
- `created_by` (Link → User)
- `notes` (Small Text)
- `items` (Table → Sales Catalogue Item)

### Task 7.2: Sales Catalogue Item DocType (child)

File: `terp_cannabis/doctypes/sales_catalogue_item/`

Fields:
- `batch_no` (Link → Batch)
- `item` (Link → Item)
- `qty_available` (Float, fetched)
- `listed_price` (Currency)
- `cogs_basis` (Select: LOW / MID / HIGH / FIXED)
- `notes` (Small Text)

### Task 7.3: Shared catalogue public web page

File: `terp_cannabis/www/shared/sales-sheet.html` and `sales-sheet.py`

```python
# sales-sheet.py (context generator)
import frappe

def get_context(context):
    token = frappe.form_dict.get("token")
    catalogue = frappe.db.get_value(
        "Sales Catalogue", {"share_token": token}, ["name", "customer", "status"], as_dict=True
    )
    if not catalogue or catalogue.status != "Published":
        frappe.throw("Invalid or expired catalogue link", frappe.PermissionError)
    
    items = frappe.get_all(
        "Sales Catalogue Item",
        filters={"parent": catalogue.name},
        fields=["item", "batch_no", "listed_price", "notes", "qty_available"],
    )
    # Strip COGS — never expose to public
    context.catalogue = catalogue
    context.items = items
```

### Task 7.4: Catalogue API endpoints

`terp_cannabis/api/sales_catalogue.py`:

```python
@frappe.whitelist()
def create_catalogue(customer=None, items=None):
    ...

@frappe.whitelist()
def generate_share_token(catalogue_name):
    ...

@frappe.whitelist()
def convert_to_order(catalogue_name, customer):
    """Copy catalogue items into a new Sales Order draft."""
    ...

@frappe.whitelist()
def convert_to_quotation(catalogue_name, customer):
    ...
```

---

## Phase 8 — Demand & Supply Matching

### Task 8.1: Client Need DocType

File: `terp_cannabis/doctypes/client_need/`

Fields:
- `customer` (Link → Customer)
- `item_group` (Link → Item Group)
- `strain` (Link → THCA Strain, optional)
- `product_type` (Select: Flower / etc.)
- `quantity_needed` (Float)
- `unit` (Link → UOM)
- `max_price` (Currency)
- `urgency` (Select: Normal / Urgent)
- `status` (Select: Active / Matched / Fulfilled / Cancelled)
- `notes` (Small Text)
- `expiry_date` (Date)

### Task 8.2: Supplier Supply DocType

File: `terp_cannabis/doctypes/supplier_supply/`

Fields:
- `supplier` (Link → Supplier)
- `item_group` (Link → Item Group)
- `strain` (Link → THCA Strain, optional)
- `product_type` (Select)
- `quantity_available` (Float)
- `unit` (Link → UOM)
- `ask_price` (Currency)
- `status` (Select: Available / Reserved / Sold)
- `notes` (Small Text)
- `expiry_date` (Date)

### Task 8.3: Match Record DocType

File: `terp_cannabis/doctypes/match_record/`

Fields:
- `client_need` (Link → Client Need)
- `supplier_supply` (Link → Supplier Supply)
- `match_score` (Percent)
- `match_reason` (Small Text)
- `status` (Select: Suggested / Accepted / Rejected / Converted)
- `converted_order` (Link → Sales Order)

### Task 8.4: Matchmaking service

`terp_cannabis/services/matchmaking_service.py`:

```python
def find_matches_for_need(need_name):
    """
    Query Supplier Supply records that match the Client Need's
    item_group, product_type, strain (if specified), quantity, price range.
    Score each match (0–100).
    Return sorted list of { supplier_supply, score, reason }.
    """
    ...

def get_all_suggested_matches():
    """Bulk match pass — run as scheduled job."""
    ...
```

Register as a daily background job in `hooks.py`:

```python
scheduler_events = {
    "daily": ["terp_cannabis.services.matchmaking_service.get_all_suggested_matches"]
}
```

---

## Phase 9 — Live Shopping

### Task 9.1: Live Shopping Session DocType

File: `terp_cannabis/doctypes/live_shopping_session/`

Fields:
- `session_title` (Data)
- `host` (Link → User)
- `customer` (Link → Customer, optional)
- `room_code` (Data, auto-generated 6-char alphanumeric)
- `status` (Select: Scheduled / Active / Paused / Ended)
- `start_time` (Datetime)
- `end_time` (Datetime)
- `items` (Table → Live Shopping Item)
- `converted_order` (Link → Sales Order)

### Task 9.2: Live Shopping Participant DocType

File: `terp_cannabis/doctypes/live_shopping_participant/`

Fields:
- `session` (Link → Live Shopping Session)
- `customer` (Link → Customer)
- `joined_at` (Datetime)
- `left_at` (Datetime)
- `interest_flags` (Table → Live Shopping Interest)

### Task 9.3: Live Shopping Item child

Fields on `Live Shopping Item`:
- `item` (Link → Item)
- `batch_no` (Link → Batch)
- `listed_price` (Currency)
- `status` (Select: Pending / Presented / Passed / Interest / Committed)

### Task 9.4: Live Shopping API

`terp_cannabis/api/live_shopping.py`:

```python
@frappe.whitelist()
def start_session(session_name): ...

@frappe.whitelist()
def pause_session(session_name): ...

@frappe.whitelist()
def end_session(session_name): ...

@frappe.whitelist()
def mark_interest(session_name, item_name, customer): ...

@frappe.whitelist()
def convert_to_order(session_name): ...
```

---

## Phase 10 — VIP Portal

The VIP Portal is a public Frappe web application. It uses a separate auth cookie from the main ERPNext session.

### Task 10.1: VIP Portal Login page

File: `terp_cannabis/www/vip-portal/login.html` + `login.py`

- Renders email + password form
- On POST: calls `vip_portal_api.login` whitelisted endpoint
- Sets a `vip_session` HTTP-only cookie (separate from main Frappe session)

### Task 10.2: VIP Portal Dashboard page

File: `terp_cannabis/www/vip-portal/dashboard.html` + `dashboard.py`

- Requires `vip_session` cookie — redirects to `/vip-portal/login` if missing
- Fetches and renders: outstanding balance, YTD spend, recent transactions, live catalog, appointments, marketplace needs/supply
- Shows only modules that are enabled in `VIP Portal Configuration` for this customer

### Task 10.3: VIP Portal Impersonation

`terp_cannabis/api/vip_portal.py`:

```python
@frappe.whitelist()
def generate_impersonation_token(customer_name):
    """Admin only. Creates a one-time token stored in VIP Portal Configuration."""
    frappe.only_for("Accounts Manager")
    ...

@frappe.whitelist(allow_guest=True)
def exchange_impersonation_token(token):
    """Validates token, creates VIP session, returns session key."""
    ...
```

Web page: `terp_cannabis/www/vip-portal/impersonate.html` — consumes the token and sets the VIP session cookie.

### Task 10.4: VIP Portal Session Ended page

File: `terp_cannabis/www/vip-portal/session-ended.html`

Static Jinja page rendered when impersonation ends.

### Task 10.5: VIP Live Catalog

`terp_cannabis/www/vip-portal/catalog.html` + `catalog.py`

- Requires VIP session
- Shows live inventory filtered to items available for the customer's tier
- "Express Interest" button → creates `Client Need` record
- "Price Alert" → saved price threshold

---

## Phase 11 — Extended Accounting

Most accounting is handled by ERPNext natively. These tasks add cannabis-specific extensions.

### Task 11.1: Installment Payment DocType

File: `terp_cannabis/doctypes/installment_payment/`

Fields:
- `sales_invoice` (Link → Sales Invoice)
- `customer` (Link → Customer)
- `schedule` (Table → Installment Schedule Item)
- `status` (Select: Active / Completed / Defaulted)

Child `Installment Schedule Item`:
- `due_date` (Date)
- `amount` (Currency)
- `payment_entry` (Link → Payment Entry)
- `status` (Select: Pending / Paid / Overdue)

### Task 11.2: Crypto Payment DocType

File: `terp_cannabis/doctypes/crypto_payment/`

Fields:
- `payment_entry` (Link → Payment Entry)
- `crypto_currency` (Select: USDC / USDT / BTC / ETH)
- `wallet_address` (Data)
- `transaction_hash` (Data)
- `exchange_rate` (Float)
- `usd_amount` (Currency)

### Task 11.3: Transaction Fee DocType

File: `terp_cannabis/doctypes/transaction_fee/`

Fields:
- `payment_entry` (Link → Payment Entry)
- `fee_type` (Select: ACH / Wire / Credit Card Processing / Crypto)
- `fee_amount` (Currency)
- `charged_to` (Select: Company / Customer)

### Task 11.4: Cash Location DocType

File: `terp_cannabis/doctypes/cash_location/`

Fields:
- `location_name` (Data)
- `warehouse` (Link → Warehouse)
- `current_balance` (Currency, computed)
- `is_active` (Check)

### Task 11.5: Shift Audit DocType

File: `terp_cannabis/doctypes/shift_audit/`

Fields:
- `cash_location` (Link → Cash Location)
- `shift_open_by` (Link → User)
- `shift_open_at` (Datetime)
- `shift_close_by` (Link → User)
- `shift_close_at` (Datetime)
- `opening_balance` (Currency)
- `closing_balance` (Currency)
- `expected_balance` (Currency)
- `variance` (Currency, computed)
- `transactions` (Table → Shift Transaction)

### Task 11.6: Invoice Dispute DocType

File: `terp_cannabis/doctypes/invoice_dispute/`

Fields:
- `sales_invoice` (Link → Sales Invoice)
- `customer` (Link → Customer)
- `dispute_reason` (Select: Wrong Amount / Wrong Items / Damaged / Other)
- `dispute_notes` (Small Text)
- `status` (Select: Open / Under Review / Resolved / Escalated)
- `resolution_notes` (Small Text)
- `opened_by` (Link → User)
- `resolved_by` (Link → User)

### Task 11.7: Payment Follow-Up Template DocType

File: `terp_cannabis/doctypes/payment_followup_template/`

Fields:
- `template_name` (Data)
- `channel` (Select: SMS / Email / Note)
- `subject_template` (Data) — supports `{customer_name}`, `{amount}`, `{days_overdue}` tokens
- `body_template` (Long Text)

Seed 3 default templates (7-day, 30-day, 60-day follow-up).

---

## Phase 12 — Calendar & Scheduling Extensions

### Task 12.1: Appointment Request DocType

File: `terp_cannabis/doctypes/appointment_request/`

Fields:
- `customer` (Link → Customer)
- `requested_date` (Date)
- `requested_time` (Time)
- `appointment_type` (Select: Intake / Delivery / Sales Meeting / Other)
- `notes` (Small Text)
- `status` (Select: Pending / Approved / Rejected / Rescheduled)
- `event` (Link → Event) — set on approve

### Task 12.2: Time Off Request DocType

File: `terp_cannabis/doctypes/time_off_request/`

Fields:
- `user` (Link → User)
- `from_date` (Date)
- `to_date` (Date)
- `reason` (Small Text)
- `status` (Select: Pending / Approved / Rejected)
- `reviewed_by` (Link → User)

### Task 12.3: Hour Tracking DocType

File: `terp_cannabis/doctypes/hour_tracking/`

Fields:
- `user` (Link → User)
- `clock_in` (Datetime)
- `clock_out` (Datetime)
- `break_minutes` (Int, default 0)
- `hours_worked` (Float, computed)
- `notes` (Small Text)

### Task 12.4: Custom fields on Event

| Field | Type | Label |
|---|---|---|
| `event_category` | Select | Category (Order Delivery / Intake Appointment / Payment Due / Other) |
| `customer` | Link | Customer | Customer |
| `sales_order` | Link | Related Order | Sales Order |
| `purchase_order` | Link | Related PO | Purchase Order |

---

## Phase 13 — Admin & Feature Flags

### Task 13.1: Feature Flag DocType

File: `terp_cannabis/doctypes/feature_flag/`

Fields:
- `flag_name` (Data, required, unique)
- `description` (Small Text)
- `is_enabled` (Check)
- `enabled_for_roles` (Table → Feature Flag Role) — if set, only these roles see it
- `enabled_for_users` (Table → Feature Flag User) — individual overrides

**API:** `terp_cannabis/api/feature_flags.py`

```python
@frappe.whitelist()
def get_flags():
    """Returns {flag_name: bool} map for current user."""
    ...
```

Called on page load; result cached in `localStorage` with TTL.

### Task 13.2: Organization Settings DocType

File: `terp_cannabis/doctypes/organization_settings/`

This is a **Single** DocType (only one instance).

Fields:
- `show_grade_field` (Check)
- `require_grade` (Check)
- `show_expected_delivery_date` (Check)
- `enable_packaged_unit_type` (Check)
- `cogs_display_mode` (Select: Everyone / Admin Only / Hidden)
- `show_cogs_in_orders` (Check)
- `show_margin_in_orders` (Check)
- `default_warehouse` (Link → Warehouse)

### Task 13.3: Referral Credit DocType

File: `terp_cannabis/doctypes/referral_credit/`

Fields:
- `referrer_customer` (Link → Customer)
- `referred_customer` (Link → Customer)
- `credit_amount` (Currency)
- `trigger_order` (Link → Sales Order)
- `status` (Select: Pending / Applied / Expired)
- `applied_to_invoice` (Link → Sales Invoice)

### Task 13.4: Leaderboard Weight Config DocType

File: `terp_cannabis/doctypes/leaderboard_weight_config/`

Fields:
- `metric_name` (Data)
- `weight_pct` (Percent)
- `description` (Small Text)

Seed: Order Volume (30%), Payment Speed (25%), Order Frequency (20%), Referrals (15%), Loyalty (10%).

### Task 13.5: Leaderboard Rank History DocType

File: `terp_cannabis/doctypes/leaderboard_rank_history/`

Fields:
- `customer` (Link → Customer)
- `rank_date` (Date)
- `rank` (Int)
- `master_score` (Float)
- `financial_score` (Float)
- `engagement_score` (Float)
- `reliability_score` (Float)
- `growth_score` (Float)

**Scheduled job** (weekly): compute scores for all customers, insert rank history.

---

## Phase 14 — Workspaces & Desk UI

Frappe Workspaces replace TERP's sidebar navigation. Each workspace is a JSON file defining the shortcuts, links, and widgets visible on a module's home page.

### Task 14.1: Sales Workspace

File: `terp_cannabis/workspace/Sales.json`

Sections:
- **Quick Links:** New Sales Order, New Quotation, Open Orders, Sales Catalogues
- **Shortcuts:** Sales Order list, Quotation list, Sales Return list, Live Shopping Sessions, Client Needs
- **Reports:** Revenue Trends, Top Clients, AR Aging
- **Onboarding:** How to create an order

### Task 14.2: Inventory / Operations Workspace

File: `terp_cannabis/workspace/Inventory.json`

Sections:
- **Quick Links:** New Intake Session, Open Receiving (Purchase Receipts), Shipping Queue, Photography Queue
- **Shortcuts:** Batch list, Intake Session list, Sample Request list, Warehouse Transfer list
- **Reports:** Inventory Aging, Shrinkage Report, Batch Status Summary

### Task 14.3: Procurement Workspace

File: `terp_cannabis/workspace/Procurement.json`

Sections:
- **Quick Links:** New Purchase Order, Expected Today filter, Receive Stock
- **Shortcuts:** Purchase Order list, Supplier list, Harvest Reminders
- **Reports:** AP Aging, Vendor Payables

### Task 14.4: Relationships Workspace

File: `terp_cannabis/workspace/Relationships.json`

Sections:
- **Quick Links:** New Customer, New Supplier, Communication Log
- **Shortcuts:** Customer list, Supplier list, Client Needs list, Supplier Supply list, Match Records
- **Reports:** Top Clients, Client Leaderboard

### Task 14.5: Finance Workspace

File: `terp_cannabis/workspace/Finance.json`

Sections:
- **Quick Links:** Create Invoice, Record Payment, Pay Vendor, Post Journal Entry
- **Shortcuts:** Sales Invoice list, Purchase Invoice list, Payment Entry list, GL, Chart of Accounts, Bank Accounts, Fiscal Years
- **Reports:** AR Aging, AP Aging, Cash Flow, Balance Sheet, Profit & Loss

### Task 14.6: Credits Workspace

File: `terp_cannabis/workspace/Credits.json`

Sections:
- **Quick Links:** Credit Limits, Pending Overrides, Credit Adjustments
- **Shortcuts:** Credit Limit list, Credit Adjustment list, Credit Override Request list, Bad Debt Write-Offs
- **Reports:** Credit Exposure Summary, Overdue AR

### Task 14.7: Admin Workspace

File: `terp_cannabis/workspace/Admin.json`

Sections:
- **Quick Links:** User Management, Roles, Feature Flags, Organization Settings
- **Shortcuts:** User list, Role list, Feature Flag list, Audit Log, System Health

### Task 14.8: Dashboard (Owner Command Center)

Frappe Dashboard with:
- **Charts:** Revenue Trends (line), AR Aging (bar), Inventory by Category (donut)
- **Number Cards:** Open Orders, Outstanding Receivables, Cash Collected (7d), Fulfilled Today
- **Shortcuts:** Same as Sales Quick Actions in TERP

File: `terp_cannabis/dashboard/TERP Owner Command Center.json`

---

## Phase 15 — Reports

All reports use Frappe's Script Report system (Python + optional JS filters).

### Task 15.1: Inventory Aging Report

File: `terp_cannabis/report/inventory_aging/`

Columns: SKU, Product, Supplier, Batch, Qty On Hand, Age (Days), Category, Status, Unit Cost, Total Value, Age Bucket (0-7d / 8-14d / 15-30d / 30d+)

Filters: Item Group, Warehouse, Status, Min Age Days

Query: `Stock Ledger Entry` joined with `Batch` custom fields.

### Task 15.2: AR Aging Report

Use ERPNext's built-in `Accounts Receivable` report — it already handles aging buckets (Current, 30, 60, 90, 90+). No custom build needed.

### Task 15.3: AP Aging Report

Use ERPNext's built-in `Accounts Payable` report similarly.

### Task 15.4: Shrinkage Report

File: `terp_cannabis/report/shrinkage_report/`

Columns: Date Range, Batch, Product, Qty Lost, Unit Cost, Shrinkage Value, Reason, Entered By

Filters: Date From, Date To, Warehouse, Item Group

Query: `Stock Entry` records of type `Material Issue` where custom reason = "Shrinkage".

### Task 15.5: Revenue Trends Report

File: `terp_cannabis/report/revenue_trends/`

Columns: Month, Revenue, Orders, Avg Order Value, Unique Clients

Filters: Date Range, Item Group, Sales Rep

Query: `Sales Invoice` grouped by month.

### Task 15.6: Top Clients Report

File: `terp_cannabis/report/top_clients/`

Columns: Rank, Customer, Total Orders, Revenue, Avg Order Value, Outstanding Balance, Days Since Last Order

Filters: Date Range, Min Revenue

### Task 15.7: Inventory Snapshot (Dashboard Data Source)

Python function `terp_cannabis/api/dashboard.py`:

```python
@frappe.whitelist()
def get_inventory_snapshot():
    """Returns: { categories: [{name, units, value}], total_units, total_value, aging_buckets }"""
    ...

@frappe.whitelist()
def get_operational_kpis():
    """Returns: { open_orders, outstanding_ar, cash_collected_7d, fulfilled_today }"""
    ...
```

### Task 15.8: Leaderboard Report

File: `terp_cannabis/report/client_leaderboard/`

Columns: Rank, Customer, Master Score, Financial Score, Engagement Score, Reliability Score, Growth Score, Last Order Date

Uses `Leaderboard Rank History` for current week's snapshot.

---

## Phase 16 — Notification System

Frappe's `Notification` DocType lets you configure email/in-app notifications on DocType events. We configure these instead of building from scratch.

### Task 16.1: Configure Frappe Notifications

File: `terp_cannabis/fixtures/notification.json` — array of `Notification` records:

| Event | Document Type | Condition | Recipients | Channel |
|---|---|---|---|---|
| New order submitted | Sales Order | always | `assigned_to`, owner | In-App + Email |
| Invoice overdue | Sales Invoice | `due_date < today and status != 'Paid'` | Accounts Manager | In-App |
| Credit override requested | Credit Override Request | always | Accounts Manager | In-App + Email |
| Low stock | Batch | `qty < threshold` | Inventory Manager | In-App |
| PO expected today | Purchase Order | `expected_delivery == today` | Procurement role | In-App |
| Sample due to return | Sample Request | `due_date == today` | owner | In-App |
| New live shopping session | Live Shopping Session | `status == 'Active'` | customer's sales rep | In-App |

### Task 16.2: Vendor Payable Alert

Scheduled job (daily) in `terp_cannabis/services/vendor_payable_service.py`:

```python
def check_vendor_payables():
    """
    For each batch with status 'Sold Out', check if linked Purchase Invoice is unpaid.
    If unpaid, create/update notification for Accounts Manager.
    """
    ...
```

Register in `hooks.py` scheduler_events daily.

### Task 16.3: Alert Configuration DocType

File: `terp_cannabis/doctypes/alert_configuration/`

Fields:
- `alert_name` (Data)
- `alert_type` (Select: Low Stock / Overdue Invoice / Vendor Payable / Credit Warning / Sample Due)
- `threshold_value` (Float, optional)
- `notify_roles` (Table → Alert Role)
- `is_enabled` (Check)

---

## Phase 17 — Custom JavaScript (Desk Enhancements)

These JS files are loaded globally on ERPNext's Desk to enhance the UI.

### Task 17.1: Command Palette override

File: `terp_cannabis/public/js/command_palette.js`

ERPNext has an `Awesome Bar` (Ctrl+G). We extend it with TERP-style quick-launch:

- `Ctrl+K` → open extended command palette modal with sections:
  - Pinned: New Order, New Intake, Inventory, Customers
  - Navigation: all workspaces
  - Actions: New Sales Order, Record Receiving, Expected Deliveries Today, Sales Catalogue
  - Search: real-time search against Customer, Sales Order, Item, Batch

Register in `hooks.py`:

```python
app_include_js = ["/assets/terp_cannabis/js/command_palette.js"]
```

### Task 17.2: Global keyboard shortcuts

File: `terp_cannabis/public/js/shortcuts.js`

- `Ctrl+N` → `/app/sales-order/new-sales-order-1`
- `N` (not in input) → same
- `I` → `/app/batch` (inventory)
- `C` → `/app/customer`

### Task 17.3: Spreadsheet-enhanced list view for key DocTypes

File: `terp_cannabis/public/js/spreadsheet_list.js`

Using Frappe's built-in `List View` with column overrides, create enhanced grid views for:
- `Sales Order` — columns: Stage, Order #, Client, Date, Lines, Total, Next Action
- `Batch` — columns: SKU, Product, Supplier, Lot, Qty, Price, COGS, Margin, Status
- `Purchase Order` — columns: PO #, Supplier, Expected, Items, Total, Status

This uses Frappe's `frappe.views.ListView` extension pattern.

### Task 17.4: Custom Item form (cannabis fields section)

File: `terp_cannabis/public/js/item_form.js`

```javascript
frappe.ui.form.on('Item', {
    refresh(frm) {
        // Show/hide cannabis fields based on item_group
        // Show COGS range fields only if cogs_mode === 'RANGE'
        frm.toggle_display(['cogs_low', 'cogs_mid', 'cogs_high'], 
            frm.doc.cogs_mode === 'RANGE');
        frm.toggle_display('cogs_fixed', 
            frm.doc.cogs_mode === 'FIXED');
    },
    cogs_mode(frm) {
        frm.trigger('refresh');
    }
});
```

### Task 17.5: Sales Order custom form enhancements

File: `terp_cannabis/public/js/sales_order_form.js`

```javascript
frappe.ui.form.on('Sales Order', {
    customer(frm) {
        // Load credit status, show warning if near limit
        // Load applicable pricing profile
        // Show client's recent orders summary
    },
    validate(frm) {
        // Client-side credit pre-check
    },
    on_submit(frm) {
        // Refresh dashboard widgets
    }
});
```

### Task 17.6: Notification bell enhancement

File: `terp_cannabis/public/js/notification_bell.js`

Extend ERPNext's existing notification bell (in the Navbar) to:
- Show real-time unread count badge
- Include TERP-specific notification types in the dropdown
- Link notifications to the correct Frappe DocType forms

---

## Phase 18 — Roles & Permissions

### Task 18.1: Define TERP roles

Create these custom roles in `fixtures/role.json`:

- `TERP Owner` — full access, RBAC bypass
- `TERP Accounts Manager` — all accounting, invoice, payment, GL access
- `TERP Sales Rep` — orders, quotes, customers (no COGS by default)
- `TERP Inventory Manager` — batches, intake, receiving, shipping, photography
- `TERP Fulfillment` — pick/pack, shipping only
- `TERP Auditor` — read-only across all modules
- `TERP VIP Client` — VIP portal access only (not Desk)

### Task 18.2: DocPerm configuration for custom DocTypes

Each custom DocType JSON includes `permissions` array:

```json
"permissions": [
    { "role": "TERP Owner", "read": 1, "write": 1, "create": 1, "delete": 1 },
    { "role": "TERP Accounts Manager", "read": 1, "write": 1, "create": 1 },
    { "role": "TERP Sales Rep", "read": 1, "write": 1, "create": 1 },
    { "role": "TERP Auditor", "read": 1 }
]
```

Permissions per DocType:

| DocType | Owner | Accounts Mgr | Sales Rep | Inventory Mgr | Fulfillment | Auditor |
|---|---|---|---|---|---|---|
| Sales Order | RWC | R | RWC | R | R | R |
| Purchase Order | RWC | R | R | RWC | R | R |
| Credit Limit | RWCD | RWC | R | | | R |
| Credit Override Request | RWC | RWC | RC | | | R |
| Bad Debt Write-Off | RWC | RWC | | | | R |
| Intake Session | RWC | R | R | RWCD | R | R |
| Sales Catalogue | RWC | R | RWC | R | R | R |
| COGS Rule | RWCD | RWCD | R | R | | R |
| Pricing Profile | RWCD | RWCD | R | | | R |
| Feature Flag | RWCD | | | | | R |

---

## Phase 19 — Seed Data & Fixtures

All seed data should be committed to `terp_cannabis/fixtures/` as JSON arrays and loaded via:

```bash
bench --site terp.localhost import-fixtures --app terp_cannabis
```

Or via `hooks.py`:
```python
fixtures = [
    "THCA Strain",
    "Product Grade",
    "Workflow Queue Status",
    "Leaderboard Weight Config",
    {"dt": "Custom Field", "filters": [["module", "=", "terp_cannabis"]]},
    {"dt": "Property Setter", "filters": [["module", "=", "terp_cannabis"]]},
]
```

Seed content:
- **Strains:** ~20 common THCA strains (Blue Dream, OG Kush, Gelato, etc.)
- **Grades:** A, B, C, AA, AAA, Indoor, Outdoor, Greenhouse, Smalls, Shake, Pre-Ground
- **Workflow Statuses:** Awaiting Intake, Live, Photographed, Ready to Ship, Sold Out, Archived
- **Roles:** 7 TERP roles
- **Unit Types:** LB, OZ, G, KG, EA, ML
- **Payment Terms:** COD, Consignment, Net-30, Net-15
- **Item Groups:** Cannabis category hierarchy
- **Notification Templates:** 3 payment follow-up templates
- **Leaderboard Weights:** 5 metrics

---

## Phase 20 — Deployment

### Task 20.1: Production-ready Docker image

`docker/Dockerfile`:

```dockerfile
FROM frappe/erpnext:v16
# Add custom app
RUN bench get-app https://github.com/EvanTenenbaum/terp-erpnext --branch main
```

Or use Frappe's official Docker Compose production stack with the app as a mount.

### Task 20.2: DigitalOcean deployment (optional — use same DO account as current TERP)

Options:
1. **Frappe Cloud** — managed, easiest. `frappecloud.com` — handles ERPNext hosting + upgrades. Add custom app via GitHub.
2. **DO Droplet** — self-managed bench. ~4GB RAM minimum for single-server.
3. **DO Kubernetes** — for horizontal scaling (overkill for now).

Recommended: **Frappe Cloud** for launch (no ops overhead, handles Redis, MariaDB, workers, SSL, CDN). Can self-host later.

### Task 20.3: GitHub App setup

- Repo: `github.com/EvanTenenbaum/terp-erpnext`
- Branch protection: `main` requires PR + CI green
- Frappe Cloud connects directly to this repo and auto-deploys on merge to `main`

---

## Execution Order

Execute phases in this order (later phases depend on earlier):

```
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20
```

Phases 8 (Demand/Supply), 9 (Live Shopping), 11 (Accounting Extensions), 12 (Calendar), and 13 (Admin) can run in parallel with each other after Phase 7.

Phase 17 (Frontend JS) can begin as soon as Phase 0 is complete and develop alongside all others.

---

## What This Plan Explicitly Does NOT Build

Per the "no extra functionality" constraint, the following are intentionally excluded:

- Manufacturing / production planning (no cannabis manufacturing operations)
- HR / Payroll (no employee management)
- Point of Sale (no retail, wholesale only)
- Healthcare (irrelevant)
- Agriculture module (irrelevant — we have our own supplier model)
- Quality Management module (not in TERP baseline)
- E-commerce / Website module (VIP portal handles this)
- Multi-currency (USD only per TERP baseline)
- Multi-company (single company per TERP baseline)
- Loan Management (not in TERP baseline)
- Budgeting (not in TERP baseline)

---

## Key Technical Notes

1. **Frappe version:** Use ERPNext v16 (latest stable as of April 2026). Do not use v14/v15.
2. **Database:** MariaDB 10.6+ (Frappe does not support PostgreSQL).
3. **Python:** 3.11+
4. **All custom DocTypes** must include `is_submittable: 0` unless they need a submit/cancel workflow (Intake Session and Sales Catalogue are submittable; most others are not).
5. **Naming conventions:** All custom DocType names should be title-case space-separated (Frappe convention) — `THCA Strain`, `Sales Catalogue`, `Credit Limit` etc.
6. **Custom fields** applied to ERPNext built-in DocTypes must go through `Custom Field` DocType (not by editing ERPNext source) — this ensures upgradability.
7. **No hard deletes** — use `is_cancelled` or `docstatus = 2` (ERPNext's built-in cancel) rather than deleting records.
8. **Actor attribution** — all mutations must use `frappe.session.user` not client-provided user fields.
9. **The VIP portal** runs under a separate URL prefix `/vip-portal/*` using Frappe's `www/` web page system, completely isolated from the main Desk auth.
10. **Spreadsheet views** — ERPNext's new `frappe.views.ListView` in v16 supports AG Grid-style column customization. Use this rather than building a custom grid from scratch.
