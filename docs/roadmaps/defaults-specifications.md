# TERP: Default Values - Final Specifications

**Date:** October 27, 2025  
**Status:** ✅ Complete - Ready for Implementation  
**Collected From:** User Interview

---

## 1. Master Data Settings

### 1.1 Storage Locations
**Default Site:** Main Warehouse  
**Default Zones:** A, B, C  
**Example Hierarchy:** Yes - create complete location examples like:
- Main Warehouse > Zone A > Rack 1 > Shelf 1 > Bin 1
- Main Warehouse > Zone B > Rack 1 > Shelf 1 > Bin 1
- Main Warehouse > Zone C > Rack 1 > Shelf 1 > Bin 1

---

### 1.2 Product Categories & Subcategories

**Categories:**

1. **Flower**
   - Outdoor
   - Deps
   - Indoor
   - Smalls
   - Trim

2. **Concentrates**
   - Shatter
   - Wax
   - Live Resin
   - Rosin
   - Distillate
   - Crumble
   - Budder

3. **Vapes**
   - Cartridge
   - All in One

4. **Bulk Oil**
   - (no subcategories)

5. **Manufactured Products**
   - Preroll
   - Edible
   - Tincture
   - Topical
   - Accessory

---

### 1.3 Product Grades
**Grade System:** Letter grades (A, B, C, D)  
**Sort Order:** A (highest quality, sort order 1) → D (lowest quality, sort order 4)  
**Descriptions:** 
- A: Top shelf quality
- B: Mid-tier quality
- C: Budget quality
- D: Economy quality

---

### 1.4 Expense Categories
**Default Categories with Parent-Child Support:**

1. **Rent/Lease**
2. **Utilities**
   - Electricity
   - Water
   - Gas
   - Internet/Phone
3. **Payroll/Wages**
   - Salaries
   - Benefits
   - Payroll Taxes
4. **Marketing/Advertising**
   - Digital Advertising
   - Print Advertising
   - Events & Sponsorships
5. **Office Supplies**
6. **Insurance**
7. **Professional Services**
   - Legal
   - Accounting
   - Consulting
8. **Travel**
9. **Maintenance/Repairs**

---

### 1.5 Chart of Accounts
**Preload:** Yes - simplest possible, NOT cannabis-specific

**Structure:**

**ASSETS**
- 1000 - Cash
- 1100 - Accounts Receivable
- 1200 - Inventory

**LIABILITIES**
- 2000 - Accounts Payable

**EQUITY**
- 3000 - Owner's Equity
- 3100 - Retained Earnings

**REVENUE**
- 4000 - Sales Revenue

**EXPENSES**
- 5000 - Cost of Goods Sold
- 5100 - Operating Expenses

---

## 2. Inventory Module

### 2.1 Batch Status
**Default:** AWAITING_INTAKE  
**UX Change:** NOT a dropdown on batch creation - automatically set to AWAITING_INTAKE  
**Auto-Update:** When inventory reaches zero, automatically change status to SOLD_OUT  
**Editable:** Status field only editable when managing existing batches (not during creation)

---

### 2.2 Payment Terms - Purchases
**System Default:** CONSIGNMENT  
**Per-Vendor Defaults:** NO - always use system default  
**Custom Terms:** YES - allow custom NET terms and custom due dates

---

### 2.3 COGS Mode
**Default:** FIXED

---

### 2.4 Stock Level Filter
**Default View:** In Stock

---

## 3. Client Management

### 3.1 Client Needs Priority
**Default:** MEDIUM

---

### 3.2 COGS Adjustment Type
**Default:** FIXED_AMOUNT  
**Special Feature:** Allow specific adjustments on all Flower subcategories  
**Example Use Case:**
- Outdoor: -$200/lb
- Indoor: -$150/lb
- Smalls: -$300/lb
- Deps: -$175/lb
- Trim: -$250/lb

---

### 3.3 Pricing Profile System
**System Default:** Yes - create a default pricing profile in Settings  
**Per-Client:** Each new client starts with the default pricing profile  
**Customization:** Clients can have their pricing profile customized on a per-client basis  
**Security:** ⚠️ **CRITICAL - Clients must NEVER see their pricing profile, markup percentages, or COGS adjustments**  
**Action Item:** Triple check that pricing profiles, COGS adjustments, and markup calculations are completely hidden from client-facing views

---

## 4. Orders & Quotes

### 4.1 Payment Terms - Orders
**System Default:** COD (Cash on Delivery)  
**Per-Client Defaults:** YES - clients can have their own default payment terms that override system default  
**Custom Terms:** YES - allow custom NET terms and custom due dates

---

### 4.2 Per-Line-Item Payment Terms
**Feature:** When creating an invoice, allow different payment terms for each line item (each SKU)  
**UX:** Not prominent - place in expandable "Advanced" section or hidden by default  
**Use Case:** SKU A is COD, SKU B is NET_30, SKU C is CONSIGNMENT - all on same invoice

---

### 4.3 Quote Status
**Default:** DRAFT

---

### 4.4 Sale Status
**Default:** PENDING

---

## 5. Accounting Module

### 5.1 Normal Balance Auto-population
**Auto-populate:** YES  
**Logic:**
- ASSET/EXPENSE → DEBIT
- LIABILITY/EQUITY/REVENUE → CREDIT
**Override:** Allow manual override if needed

---

### 5.2 Payment Methods
**Remove:** CHECK, WIRE, ACH, CREDIT_CARD, DEBIT_CARD, OTHER  
**New Options:** CASH, CRYPTO, CUSTOM  
**Default:** CASH  
**Custom Methods:** Allow users to add custom payment methods  
**Per-Client Defaults:** NO - always use system default

---

### 5.3 Bank Account Type
**Remove:** CHECKING, SAVINGS, MONEY_MARKET, CREDIT_CARD  
**Replace With:** Simple "BANK" as default  
**Custom Locations:** Allow users to add custom payment locations (similar to storage locations)  
**Examples:** Users can define "Crypto Wallet", "Cash Safe", "PayPal", etc.

---

### 5.4 Bank Transaction Type
**Keep Only:** DEPOSIT, WITHDRAWAL  
**Remove:** TRANSFER, FEE, INTEREST  
**Auto-default:**
- Positive amount → DEPOSIT
- Negative amount → WITHDRAWAL
**Philosophy:** Treat as simple cash ledger with no banking complexities

---

## 6. Dashboard Module

### 6.1 Dashboard Layout
**Show:** All widgets by default  
**Layout:** Gallery swipe/carousel view (already built-in)  
**Grouping:** Widgets grouped into sections/areas  
**Freeform Widget:** At the top in default layout (small size)  
**Role Differences:** None - all users see same default layout

---

### 6.2 Default KPIs
**Display in Order:**
1. Sales by Product
2. Sales by Subcategory
3. Sales by Category
4. Sales by Subcategory with Price Range Breakdowns ($300 increments: $0-300, $301-600, $601-900, etc.)
5. Clients with Oldest Open Debt (aging report)
6. Client Leaderboard (top clients by sales/revenue)

---

## 7. Credit System

### 7.1 Credit System Weights
**Confirmed - Keep Current Defaults:**
- Revenue Momentum: 20%
- Cash Collection: 25%
- Profitability: 20%
- Debt Aging: 15%
- Repayment Velocity: 10%
- Tenure: 10%
**Total:** 100%

---

## 8. Pricing Module

### 8.1 Pricing Rule Adjustment Type
**Default:** DOLLAR_MARKUP

---

### 8.2 Dynamic Pricing Adjustment Type
**Default:** FIXED_AMOUNT

---

### 8.3 Advanced Pricing Rule Conditions
**Feature:** Support complex conditional logic with multiple criteria

**Available Conditions:**
- Product (specific product)
- Category (e.g., Flower, Concentrates)
- Subcategory (e.g., Indoor, Outdoor, Smalls)
- Tags (e.g., Organic, Top Shelf)
- Price Range (e.g., $0-300, $301-600)
- Strain (specific strain from strain library)
- Brand (specific brand)
- Grade (A, B, C, D)
- Vendor (specific vendor)

**Logic:** Support AND/OR combinations

**Example Rules:**
- "Apply $50 markup to all Indoor Flower from Brand X with Grade A"
- "Apply $100 markup to all products in $600-900 price range with Organic tag"

---

## 9. Alerts & Notifications

### 9.1 Default Alerts
**Create Only:** Low Inventory Alert  
**No Other Defaults:** System starts with only low inventory alerts configured

---

### 9.2 Low Inventory Alert Configuration
**Default Alerts:** Create 5 alerts (one per Flower subcategory)
- Outdoor: Alert when gross revenue value falls below $100,000
- Deps: Alert when gross revenue value falls below $100,000
- Indoor: Alert when gross revenue value falls below $100,000
- Smalls: Alert when gross revenue value falls below $100,000
- Trim: Alert when gross revenue value falls below $100,000

**Alert Criteria Support:**
- Total number of units (e.g., alert when < 100 units)
- Total merchandise value (e.g., alert when total value < $10,000)

**Conditional Logic:** Same AND/OR logic as pricing rules
- Category/Subcategory
- Product, Tags, Price Range, Strain, Brand, Grade, Vendor

**Example Custom Alerts:**
- "Alert when Indoor Flower from Brand X falls below 50 units"
- "Alert when total value of Grade A products falls below $5,000"

---

### 9.3 Alert Status
**Default:** ACTIVE

---

## 10. Recurring Orders

### 10.1 Frequency Default
**Default:** MONTHLY

---

## 11. Sample Management

### 11.1 Sample Request Status
**Default:** PENDING

---

## 12. Transaction Management

### 12.1 Credit Status
**Default:** ACTIVE

---

## Implementation Notes

### Critical Security Requirements
1. ⚠️ **Pricing Profile Visibility:** Clients must NEVER see:
   - Their pricing profile
   - Markup percentages
   - COGS adjustments
   - Any cost-related information
   
2. **Action Item:** Triple check all client-facing views to ensure complete hiding of:
   - Pricing profiles
   - COGS adjustments
   - Markup calculations
   - Cost data

---

### UX Improvements Required

1. **Batch Status:** Remove dropdown on creation, auto-set to AWAITING_INTAKE
2. **Auto-Status Updates:** Auto-change to SOLD_OUT when inventory = 0
3. **Per-Line-Item Payment Terms:** Add to invoice creation (in advanced section)
4. **Custom Payment Methods:** Build interface similar to storage locations
5. **Custom Bank Account Types:** Build interface similar to storage locations
6. **Gallery View Dashboard:** Ensure all widgets display in swipe/carousel mode
7. **Freeform Widget:** Position at top, small size by default

---

### Feature Enhancements Required

1. **COGS Adjustments by Subcategory:**
   - Allow different fixed amounts per Flower subcategory
   - UI to configure per-subcategory adjustments
   - Apply automatically during pricing calculations

2. **Advanced Pricing Rules Engine:**
   - Support multiple condition types (product, category, subcategory, tags, price range, strain, brand, grade, vendor)
   - AND/OR logic combinations
   - Priority/order of rule application
   - Rule conflict resolution

3. **Advanced Low Inventory Alerts:**
   - Support unit-based and value-based thresholds
   - Same conditional logic as pricing rules
   - Multiple alerts per category/subcategory
   - Configurable alert delivery (dashboard, email, both)

4. **Custom Payment Methods:**
   - User-defined payment method types
   - Similar to storage location management
   - Default to CASH, CRYPTO, plus custom additions

5. **Custom Bank Account Types:**
   - User-defined account location types
   - Default to "BANK" plus custom additions
   - Examples: Crypto Wallet, Cash Safe, PayPal, etc.

6. **KPI Price Range Breakdowns:**
   - Sales by Subcategory with $300 increments
   - Configurable increment amounts
   - Visual breakdown display

---

### Database Schema Changes Required

1. **Payment Methods Enum:**
   - Change from: `["CASH", "CHECK", "WIRE", "ACH", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]`
   - Change to: `["CASH", "CRYPTO", "CUSTOM"]`
   - Add `customPaymentMethods` table for user-defined methods

2. **Bank Account Type Enum:**
   - Change from: `["CHECKING", "SAVINGS", "MONEY_MARKET", "CREDIT_CARD"]`
   - Change to: `["BANK", "CUSTOM"]`
   - Add `customBankAccountTypes` table for user-defined types

3. **Bank Transaction Type Enum:**
   - Change from: `["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "INTEREST"]`
   - Change to: `["DEPOSIT", "WITHDRAWAL"]`

4. **COGS Adjustments:**
   - Add support for per-subcategory adjustments in `clients` table or new `clientCogsAdjustments` table

5. **Pricing Rules:**
   - Enhance `pricingRules` table to support multiple condition types
   - Add JSON field for complex condition logic

6. **Alert Configurations:**
   - Enhance `alertConfigurations` table to support value-based and unit-based thresholds
   - Add JSON field for complex condition logic

---

### Seed Scripts to Create

1. `seed-locations.ts` - Main Warehouse with zones A, B, C
2. `seed-categories.ts` - All product categories and subcategories
3. `seed-grades.ts` - Letter grades A, B, C, D
4. `seed-expense-categories.ts` - Standard expense categories with parent-child
5. `seed-chart-of-accounts.ts` - Basic Chart of Accounts
6. `seed-dashboard-layouts.ts` - All widgets in gallery view with Freeform at top
7. `seed-dashboard-kpis.ts` - 6 default KPIs in specified order
8. `seed-credit-system-settings.ts` - Credit weights
9. `seed-low-inventory-alerts.ts` - 5 Flower subcategory alerts at $100k threshold
10. `seed-default-pricing-profile.ts` - System default pricing profile

---

### Testing Checklist

- [ ] Fresh database initialization populates all defaults
- [ ] Batch creation auto-sets AWAITING_INTAKE status
- [ ] Batch auto-updates to SOLD_OUT when inventory = 0
- [ ] Payment terms default to CONSIGNMENT for purchases
- [ ] Payment terms default to COD for orders
- [ ] Per-client payment terms override system defaults
- [ ] Custom payment methods can be added
- [ ] Custom bank account types can be added
- [ ] Bank transactions auto-default based on amount sign
- [ ] Normal balance auto-populates based on account type
- [ ] Dashboard shows all widgets in gallery view
- [ ] Freeform widget appears at top (small)
- [ ] All 6 KPIs display in correct order
- [ ] Low inventory alerts trigger at $100k for each Flower subcategory
- [ ] Pricing profiles completely hidden from client-facing views
- [ ] COGS adjustments can be set per Flower subcategory
- [ ] Advanced pricing rules support all condition types
- [ ] Advanced pricing rules support AND/OR logic
- [ ] All defaults can be customized by users
- [ ] "Restore Defaults" functionality works for all settings

---

**Status:** ✅ Specifications Complete - Ready for Implementation  
**Next Step:** Begin Phase 1 implementation (Master Data & Foundation)

