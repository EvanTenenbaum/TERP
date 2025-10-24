# Changelog

All notable changes to the TERP Modern ERP Interface project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

