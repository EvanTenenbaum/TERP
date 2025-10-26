# Sales Sheet & Pricing Engine Specification

## Overview

A comprehensive sales sheet creation system with dynamic pricing rules engine, allowing users to create customized, shareable inventory lists for clients with automated pricing based on flexible rules.

---

## 1. Pricing Rules Engine

### 1.1 Core Concepts

**Pricing Rule:** A condition-based pricing adjustment that applies markup or markdown to inventory items matching specific criteria.

**Pricing Profile:** A named collection of pricing rules that can be saved and reused across multiple clients.

### 1.2 Rule Structure

Each pricing rule consists of:

1. **Adjustment Type:**
   - Percentage markup (e.g., +20%)
   - Percentage markdown (e.g., -15%)
   - Dollar amount markup (e.g., +$50)
   - Dollar amount markdown (e.g., -$25)

2. **Conditions (Filters):**
   - Category (e.g., "Flower", "Concentrates")
   - Subcategory (e.g., "Indica", "Sativa", "Hybrid")
   - Strain (e.g., "Blue Dream", "OG Kush")
   - Tag (e.g., "Organic", "Top Shelf", "Budget")
   - Price Range (e.g., $50-$150)
   - Grade (e.g., "A", "B", "C")
   - Vendor
   - Any custom metadata fields

3. **Logic:**
   - **AND** - All conditions must match
   - **OR** - Any condition can match
   - **Priority** - Rules applied in order (higher priority first)

### 1.3 Rule Examples

```
Rule 1: Top Shelf Markup
- Condition: Tag = "Top Shelf" AND Grade = "A"
- Adjustment: +25%
- Priority: 1

Rule 2: Bulk Discount
- Condition: Price Range = $100-$500
- Adjustment: -10%
- Priority: 2

Rule 3: Vendor Markup
- Condition: Vendor = "Premium Growers"
- Adjustment: +$20
- Priority: 3

Rule 4: Category Discount
- Condition: Category = "Concentrates" OR Category = "Edibles"
- Adjustment: -15%
- Priority: 4
```

### 1.4 Pricing Profile System

**Profile Structure:**
- Profile Name (e.g., "Retail Standard", "Wholesale Tier 1")
- Description (optional)
- List of Pricing Rules (ordered by priority)
- Created Date
- Last Modified Date

**Profile Management:**
- Create new profile
- Edit existing profile
- Delete profile
- Duplicate profile
- Apply profile to client

### 1.5 Client Pricing Integration

**In Client Profile (Buyers Only):**

**Section: "Pricing Configuration"**

**Option 1: Apply Saved Pricing Profile**
- Dropdown to select from saved profiles
- Shows profile name and description
- One-click apply

**Option 2: Custom Pricing Rules**
- Rule builder interface
- Add multiple rules
- Set priorities
- Option to "Save as Pricing Profile" (checkbox)
  - If checked, prompts for profile name and description
  - Saves for future reuse

**Display:**
- Current pricing configuration (profile name or "Custom Rules")
- List of active rules
- Edit/Remove buttons

---

## 2. Sales Sheet Module

### 2.1 User Flow

1. **Select Client** → Loads client's pricing profile
2. **Browse Inventory** → Real-time filtered table
3. **Add Items** → Build sales sheet
4. **Customize** → Reorder, override prices, select columns
5. **Save/Export** → Save to history, copy to clipboard, PDF, image

### 2.2 UI Layout

**Two-Panel Layout:**

**Left Panel: Inventory Browser (60% width)**
- Search bar (real-time, non-blocking)
- Filter controls (category, strain, grade, etc.)
- Inventory table with columns:
  - Checkbox (select)
  - Strain Name
  - Category
  - Subcategory
  - Available Quantity
  - Base Price
  - **Retail Price** (calculated with pricing rules)
  - Vendor
  - Grade
  - Tags
- Bulk actions: "Select All", "Clear Selection", "Add Selected"

**Right Panel: Sales Sheet Preview (40% width)**
- Client name header
- Item count
- Total value
- Sales sheet table:
  - Drag handle (reorder)
  - Strain Name
  - Quantity Available
  - Retail Price (editable inline)
  - Vendor (optional)
  - Strain (optional)
  - Tags (optional)
  - Remove button
- Column visibility toggles
- Actions:
  - Save to History
  - Copy to Clipboard
  - Export as PDF
  - Export as Image

**Alternative: Stacked Layout (Mobile)**
- Inventory table on top
- Sales sheet below
- Sticky header with client name and actions

### 2.3 Real-Time Inventory Filtering

**Search:**
- Instant search as user types
- Searches: strain name, category, vendor, tags
- No "Search" button required
- Debounced (300ms) to prevent excessive queries

**Filters:**
- Category dropdown (multi-select)
- Subcategory dropdown (multi-select)
- Grade dropdown (multi-select)
- Vendor dropdown (multi-select)
- Price range slider
- Availability toggle (In Stock only)
- Tags multi-select

**Filter UI:**
- Collapsible filter panel (doesn't block inventory view)
- Active filters shown as badges (removable)
- "Clear All Filters" button

### 2.4 Add to Sheet Logic

**Selection:**
- Individual: Click checkbox on row
- Bulk: "Select All" button (selects all filtered items)
- Visual feedback: Selected rows highlighted

**Add Action:**
- "Add Selected" button (shows count: "Add 5 items")
- Adds items to sales sheet
- **Duplicate Prevention:** If item already in sheet, shows warning and skips

**Sales Sheet Updates:**
- Items appear instantly in right panel
- Default sort: Order added
- User can drag to reorder

### 2.5 Sales Sheet Customization

**Column Visibility:**
- Checkboxes to show/hide:
  - Retail Price (always visible)
  - Available Quantity
  - Vendor
  - Strain
  - Tags
  - Pricing Rule Applied

**Price Override:**
- Click on price to edit inline
- Shows original price (strikethrough) and new price
- Override badge indicator
- Reset button to revert to rule-based price

**Reordering:**
- Drag handle on each row
- Smooth drag-and-drop animation
- Auto-saves order

**Deletion:**
- Trash icon on each row
- Confirmation dialog (optional)
- Removed item returns to inventory table

### 2.6 Template Views

**Purpose:** Save and reuse sales sheet configurations (filters, selected items, column visibility)

**Types:**
1. **Client-Specific Templates**
   - Saved under specific client profile
   - Only visible when creating sheet for that client
   - Example: "Weekly Restock", "Top Shelf Only"

2. **Universal Templates**
   - Available for all clients
   - Example: "Budget Selection", "Premium Mix"

**Template Management:**
- "Save as Template" button
- Prompts for:
  - Template name
  - Template type (Client-specific or Universal)
  - Description (optional)
- "Load Template" dropdown
  - Shows templates for current client + universal templates
  - One-click load (applies filters, selections, column visibility)

**Template Storage:**
- Template name
- Client ID (null for universal)
- Filters (JSON)
- Selected item IDs
- Column visibility settings
- Created date
- Last used date

### 2.7 Save to History

**Sales Sheet History:**
- Stored in `sales_sheet_history` table
- Fields:
  - Client ID
  - Created by (user ID)
  - Created date
  - Items (JSON array)
  - Total value
  - Template used (if any)
  - Notes (optional)

**History View (in Client Profile):**
- Table of past sales sheets
- Columns: Date, Created By, Item Count, Total Value
- Actions: View, Duplicate, Export

### 2.8 Export Options

#### 2.8.1 Copy to Clipboard (WhatsApp/Signal Format)

**Format:**
```
Sales Sheet for [Client Name]
Date: [MM/DD/YYYY]

1. Blue Dream - $150 (10 units available)
2. OG Kush - $180 (5 units available)
3. Gorilla Glue - $200 (8 units available)
...

Total Items: 15
Total Value: $2,450

---
Generated by TERP ERP
```

**Features:**
- Plain text, well-formatted
- Numbered list
- Includes key info (price, quantity)
- Footer with totals
- Copies to clipboard with one click
- Success notification: "Copied! Ready to paste."

#### 2.8.2 Export as PDF

**Layout:**
- Header: Company logo, client name, date
- Table: All selected columns
- Footer: Total items, total value, generated by
- Professional styling (borders, alternating row colors)

**Implementation:**
- Use `jsPDF` or server-side PDF generation
- Filename: `SalesSheet_[ClientName]_[Date].pdf`

#### 2.8.3 Export as Image

**Format:**
- PNG or JPEG
- Screenshot-style capture of sales sheet table
- Includes header and footer
- High resolution (suitable for sharing)

**Implementation:**
- Use `html2canvas` to capture sales sheet div
- Download as image file
- Filename: `SalesSheet_[ClientName]_[Date].png`

---

## 3. Database Schema

### 3.1 Pricing Rules

```sql
CREATE TABLE pricing_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  adjustment_type ENUM('PERCENT_MARKUP', 'PERCENT_MARKDOWN', 'DOLLAR_MARKUP', 'DOLLAR_MARKDOWN') NOT NULL,
  adjustment_value DECIMAL(10, 2) NOT NULL,
  conditions JSON NOT NULL, -- { category: "Flower", grade: "A", ... }
  logic_type ENUM('AND', 'OR') DEFAULT 'AND',
  priority INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.2 Pricing Profiles

```sql
CREATE TABLE pricing_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSON NOT NULL, -- Array of rule IDs with priorities
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.3 Client Pricing Configuration

```sql
ALTER TABLE clients ADD COLUMN pricing_profile_id INT;
ALTER TABLE clients ADD COLUMN custom_pricing_rules JSON; -- For custom rules not saved as profile
ALTER TABLE clients ADD FOREIGN KEY (pricing_profile_id) REFERENCES pricing_profiles(id) ON DELETE SET NULL;
```

### 3.4 Sales Sheet Templates

```sql
CREATE TABLE sales_sheet_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_id INT, -- NULL for universal templates
  filters JSON NOT NULL,
  selected_items JSON NOT NULL, -- Array of inventory item IDs
  column_visibility JSON NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3.5 Sales Sheet History

```sql
CREATE TABLE sales_sheet_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  created_by INT NOT NULL,
  template_id INT,
  items JSON NOT NULL, -- Array of { itemId, price, quantity, overridePrice }
  total_value DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES sales_sheet_templates(id) ON DELETE SET NULL
);
```

---

## 4. API Endpoints (tRPC)

### 4.1 Pricing Rules

- `pricingRules.list` - Get all pricing rules
- `pricingRules.getById` - Get single rule
- `pricingRules.create` - Create new rule
- `pricingRules.update` - Update existing rule
- `pricingRules.delete` - Delete rule
- `pricingRules.calculatePrice` - Calculate price for item with rules

### 4.2 Pricing Profiles

- `pricingProfiles.list` - Get all profiles
- `pricingProfiles.getById` - Get single profile
- `pricingProfiles.create` - Create new profile
- `pricingProfiles.update` - Update existing profile
- `pricingProfiles.delete` - Delete profile
- `pricingProfiles.applyToClient` - Apply profile to client

### 4.3 Sales Sheets

- `salesSheets.getInventoryWithPricing` - Get inventory with calculated prices for client
- `salesSheets.createTemplate` - Save new template
- `salesSheets.getTemplates` - Get templates (client-specific + universal)
- `salesSheets.loadTemplate` - Load template configuration
- `salesSheets.saveToHistory` - Save completed sales sheet
- `salesSheets.getHistory` - Get sales sheet history for client
- `salesSheets.exportPDF` - Generate PDF export
- `salesSheets.exportImage` - Generate image export

---

## 5. Implementation Phases

### Phase 1: Pricing Rules Engine (Backend)
- Database schema for pricing rules and profiles
- tRPC endpoints for CRUD operations
- Price calculation logic
- Rule condition matching engine

### Phase 2: Client Pricing Integration
- Add pricing section to client profile
- UI for selecting/creating pricing rules
- Save as profile functionality
- Apply profile to client

### Phase 3: Sales Sheet Creator (Core)
- Client selection
- Real-time inventory table with filters
- Add to sheet functionality
- Duplicate prevention

### Phase 4: Sales Sheet Customization
- Drag-and-drop reordering
- Column visibility toggles
- Inline price override
- Delete items

### Phase 5: Templates System
- Template creation UI
- Template storage
- Load template functionality
- Client-specific vs universal logic

### Phase 6: Export & History
- Copy to clipboard (formatted text)
- PDF export
- Image export
- Save to history
- History view in client profile

---

## 6. UX Considerations

### 6.1 Performance
- Real-time filtering with debounce (300ms)
- Virtualized table for large inventory lists (>100 items)
- Optimistic UI updates (instant feedback)
- Lazy load sales sheet history

### 6.2 Mobile Responsiveness
- Stacked layout on mobile (inventory → sales sheet)
- Touch-friendly drag handles
- Simplified filter UI (drawer/modal)
- Responsive table (horizontal scroll)

### 6.3 Accessibility
- Keyboard navigation for table
- Screen reader labels for all actions
- Focus management for modals
- Color contrast compliance

### 6.4 Error Handling
- Graceful handling of pricing rule errors
- Fallback to base price if rule fails
- Clear error messages for duplicate items
- Network error recovery

---

## 7. Future Enhancements

- **Multi-currency support** - Different pricing for different currencies
- **Quantity-based pricing** - Bulk discounts based on quantity ordered
- **Time-based pricing** - Different prices for different time periods
- **Client-specific discounts** - Override pricing rules per client
- **Sales sheet analytics** - Track which items are most popular
- **Email export** - Send sales sheet directly to client
- **Live collaboration** - Multiple users editing same sales sheet
- **Version history** - Track changes to sales sheets over time

---

## 8. Success Metrics

- **Time to create sales sheet:** < 2 minutes
- **Pricing rule accuracy:** 100% (no manual price errors)
- **Export success rate:** > 99%
- **User satisfaction:** > 4.5/5 stars
- **Adoption rate:** > 80% of sales team using within 1 month

---

**Status:** Ready for implementation  
**Priority:** High  
**Estimated Effort:** 40-60 hours (6 phases)

