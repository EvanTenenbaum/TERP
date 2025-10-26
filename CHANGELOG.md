# Changelog

All notable changes to the TERP Modern ERP Interface project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Sales Sheet Module Implementation (Phases 1-6) - October 25, 2025

**Status:** ✅ Production Ready

#### Phase 1: Backend Foundation
**Added**
- Complete pricing engine with rule-based calculations (`server/pricingEngine.ts`)
- Sales sheet database operations module (`server/salesSheetsDb.ts`)
- Database schema for pricing rules, profiles, templates, and history
- Support for 4 adjustment types: % markup, % markdown, $ markup, $ markdown
- Condition matching engine with AND/OR logic
- Priority-based rule application system
- Client pricing integration functions
- tRPC endpoints for pricing and sales sheets (19 total endpoints)

**Database Tables Created**
- `pricing_rules` - Pricing adjustment rules with conditions
- `pricing_profiles` - Collections of pricing rules
- `sales_sheet_templates` - Saved configurations for reuse
- `sales_sheet_history` - Completed sales sheets with item tracking

#### Phase 2: Pricing Rules UI & Client Integration
**Added**
- PricingRulesPage with full CRUD functionality (`client/src/pages/PricingRulesPage.tsx`)
- PricingProfilesPage with profile management (`client/src/pages/PricingProfilesPage.tsx`)
- PricingConfigTab component for client pricing configuration (`client/src/components/pricing/PricingConfigTab.tsx`)
- Pricing tab in ClientProfilePage for applying profiles to clients
- Visual rule builder with condition management
- Profile application to clients with one-click apply
- Active pricing rules display per client

**Features**
- Create, edit, delete pricing rules with dialog forms
- Configure adjustment types and values
- Add/remove conditions with key-value pairs
- Set logic type (AND/OR) and priority
- Create and manage pricing profiles
- Select rules for profiles with priority assignment
- Apply profiles to clients from client profile page

#### Phase 3: Sales Sheet Core
**Added**
- SalesSheetCreatorPage with two-panel layout (`client/src/pages/SalesSheetCreatorPage.tsx`)
- InventoryBrowser component with search and selection (`client/src/components/sales/InventoryBrowser.tsx`)
- SalesSheetPreview component with live preview (`client/src/components/sales/SalesSheetPreview.tsx`)
- Client selection dropdown with automatic pricing loading
- Real-time inventory with client-specific pricing calculation
- Duplicate prevention for items already in sheet
- Bulk and single item selection
- Total value calculation

**Features**
- Two-panel layout (60% inventory browser, 40% preview)
- Search and filter inventory
- Table view with base price, retail price, and markup %
- Select All, Clear Selection, Add Selected bulk actions
- Visual feedback for selected items
- Live preview of selected items with totals

#### Phase 4-5: Customization & Export
**Added**
- Drag-and-drop item reordering using @dnd-kit
- Inline price override functionality with visual indicators
- Copy to clipboard export (plain text format)
- Export as PDF using jsPDF
- Export as PNG image using html2canvas
- Save to history with item count tracking
- Price override badges and strike-through original prices
- Reset button for price overrides

**Dependencies Added**
- `@dnd-kit/core@6.3.1`
- `@dnd-kit/sortable@10.0.0`
- `@dnd-kit/utilities@3.2.2`
- `html2canvas@1.4.1`
- `jspdf@3.0.3`

**Features**
- Smooth drag-and-drop with visual feedback
- Click any price to override with input field
- Save/Cancel/Reset buttons for overrides
- Multiple export formats with success notifications
- Persistent storage in database

#### Phase 6: Testing & Polish
**Fixed**
- All TypeScript errors resolved (0 errors)
- Import paths for schema types corrected
- Database field references aligned with schema
- Missing `itemCount` field added to sales sheet history
- Template creation updated to match schema structure
- Optional field handling (`createdBy`) fixed
- Batch table field references corrected

**Changed**
- Development server running successfully
- All navigation links functional
- Error handling with toast notifications
- Loading states for async operations
- Responsive design considerations

**Navigation & Routing**
- Added `/pricing/rules` route for Pricing Rules management
- Added `/pricing/profiles` route for Pricing Profiles management
- Added `/sales-sheets` route for Sales Sheet Creator
- Added "Sales Sheets" to sidebar with Layers icon
- Added "Pricing Rules" to sidebar with Tag icon
- Added "Pricing Profiles" to sidebar with TrendingUp icon

**Documentation**
- Updated `docs/SALES_SHEET_IMPLEMENTATION_STATUS.md` with complete status
- Created `docs/SALES_SHEET_HANDOFF_COMPLETE.md` for handoff
- Updated `CHANGELOG.md` with all changes
- Updated `PROJECT_CONTEXT.md` with new module information

---

### Inventory Module Enhancements (Phases 1-8)

#### Phase 1: Status Workflow Simplification
**Added**
- Simplified batch status workflow by removing QC_PENDING status
- Direct transitions from AWAITING_INTAKE to LIVE or QUARANTINED
- Streamlined COGS mode options (FIXED and RANGE only)

**Removed**
- QC_PENDING status from all batch workflows
- FLOOR COGS mode from cost calculation options
- Unnecessary complexity in status transitions

**Changed**
- Updated VALID_TRANSITIONS map to reflect new simplified workflow
- Modified seed data to use LIVE status instead of QC_PENDING

#### Phase 2: Batch Detail Drawer Enhancement
**Added**
- Comprehensive BatchDetailDrawer component with slide-out panel
- Quick Stats section showing On Hand, Available, Reserved, and Quarantine quantities
- Product Details section with category, subcategory, grade, and strain information
- Cost Details section displaying COGS mode, unit COGS, and payment terms
- Storage Locations section with warehouse/site breakdown
- Audit Trail section showing complete batch history with timestamps

**Changed**
- Enhanced batch viewing experience with detailed information panels
- Improved visual hierarchy and information organization

#### Phase 3: Edit Batch Modal
**Added**
- EditBatchModal component for batch modifications
- Location management with add/remove/update capabilities
- Quantity adjustment tracking (intake, sales, adjustments, waste)
- Reason tracking for all batch modifications
- Comprehensive validation for quantity and location changes
- Automatic audit log creation for all edits

**Changed**
- Batch editing now uses dedicated modal instead of inline editing
- All changes require reason documentation for audit compliance

#### Phase 4: Intake Flow Enhancement
**Added**
- AWAITING_INTAKE status for new batch creation workflow
- Vendor autocomplete with debounced search
- Brand autocomplete with debounced search
- Product name input with strain autocomplete
- COGS mode selector (FIXED and RANGE)
- Payment terms selector (COD, NET_7, NET_15, NET_30, CONSIGNMENT, PARTIAL)
- Warehouse/site location selector
- Media upload functionality for batch documentation
- Conditional "Amount Paid" field for COD and PARTIAL payments
- Comprehensive form validation

**Changed**
- PurchaseModal now creates batches with AWAITING_INTAKE status
- Enhanced intake workflow with better data capture

#### Phase 5: Inventory UI - Table & Search
**Added**
- "Intake" button for AWAITING_INTAKE batches in table actions
- Clickable "Awaiting Intake" dashboard card for instant filtering
- Visual feedback for active filters (blue border, count banner)
- "Clear Filter" and "View All" buttons for filter management
- Status-based table filtering functionality

**Changed**
- Table actions now conditional based on batch status
- Dashboard cards are now interactive and trigger table filters

#### Phase 6: Dashboard Cards Redesign
**Added**
- Total Inventory Value card showing sum of all batch values
- Avg Value per Unit card displaying average COGS
- Stock Levels by Category chart with progress bars and values
- Stock Levels by Subcategory chart with detailed breakdown
- Clickable Low Stock card for filtering
- Backend API endpoint for dashboard statistics (inventory.dashboardStats)

**Removed**
- QC Pending card (no longer relevant after Phase 1)
- Quarantined and On Hold cards (consolidated into status filters)

**Changed**
- Dashboard now focuses on financial metrics and stock levels
- All dashboard cards are clickable and trigger table filters
- Enhanced visual design with charts and progress bars

#### Phase 7: COGS Management & Sales Tracking
**Added**
- CogsEditModal component for batch COGS updates
- Retroactive update options (Prospective, Retroactive, Both)
- Impact calculation showing affected sales count and profit change
- Edit COGS button in BatchDetailDrawer Cost Details section
- Payment History section in BatchDetailDrawer
- Sales History section in BatchDetailDrawer
- Backend functions: salesDb.ts for sales tracking
- Backend functions: cogsManagement.ts for COGS updates
- tRPC endpoints: cogs.calculateImpact and cogs.updateBatchCogs
- COGS history auditing with change tracking

**Changed**
- Batch COGS can now be updated after creation
- All COGS changes are tracked in audit log
- Payment and sales history integrated into batch details

#### Phase 8: Advanced Table Features & Mobile Optimization
**Added**
- Multi-field search across SKU, product name, brand, vendor, category, subcategory, and grade
- Search result highlighting with yellow background
- Advanced filtering system with collapsible filter panel
- Status filter (multi-select checkboxes)
- Category and subcategory filters (dropdowns)
- Stock level filter (In Stock, Low Stock, Out of Stock)
- Vendor filter (multi-select checkboxes)
- Brand filter (multi-select checkboxes)
- Grade filter (multi-select checkboxes)
- Payment status filter (multi-select checkboxes)
- Active filter chips with remove buttons
- Column sorting for all table columns (ascending → descending → none)
- Visual sort indicators (up/down arrows)
- useInventoryFilters hook for filter state management
- useInventorySort hook for sort state management
- SearchHighlight component for search term highlighting
- AdvancedFilters component with comprehensive filter controls
- FilterChips component for active filter display
- SortControls component for sortable table headers

**Changed**
- Search now queries multiple fields simultaneously
- Table headers are now clickable for sorting
- Filter panel is collapsible for better space management
- Enhanced search debouncing (150ms delay)

### Bug Fixes
**Fixed**
- Removed all placeholder messages ("coming soon" text) from production code
- Fixed status transition logic after QC_PENDING removal
- Corrected COGS mode validation to only allow FIXED and RANGE
- Updated all status enums to reflect simplified workflow

### Technical Improvements
**Added**
- Comprehensive TypeScript type safety across all inventory components
- Client-side filtering for advanced filter combinations
- Debounced search for better performance
- Optimized dashboard statistics calculation
- Enhanced error handling with user-friendly messages

**Changed**
- Improved component organization and code structure
- Enhanced reusability of inventory-related hooks and components
- Better separation of concerns between UI and business logic

---

## Project Information

**Technology Stack:**
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui components
- tRPC for type-safe API
- Drizzle ORM for database
- MySQL database

**Development Principles:**
- Production-ready code only (no placeholders or TODOs)
- Comprehensive type safety
- User-centric design
- Performance optimization
- Accessibility compliance

---

**Note:** This changelog documents the complete Inventory Module Enhancement initiative (Phases 1-8) completed in October 2025. All features are production-ready and have passed comprehensive QA testing.

