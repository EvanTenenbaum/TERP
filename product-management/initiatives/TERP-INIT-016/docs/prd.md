# TERP-INIT-016: Sales Sheet Module - Product Requirements Document

## Overview

The Sales Sheet module enables staff to create curated, shareable inventory lists for clients with dynamic pricing. This document defines the complete requirements for restoring and enhancing the module.

## Problem Statement

The Sales Sheet module was built in October 2025 but has become inaccessible due to:
1. Missing navigation link in sidebar
2. Incomplete integration with the newer Live Shopping system
3. Missing conversion workflows to orders

Staff cannot easily create and share customized inventory lists with clients, leading to:
- Manual copy/paste of inventory data
- Inconsistent pricing across communications
- No tracking of what was shared with clients
- Lost sales opportunities

## Goals

1. **Restore Access** - Make Sales Sheets accessible from sidebar navigation
2. **Enable Sharing** - Allow staff to share sheets via link, copy, PDF, or image
3. **Enable Conversion** - One-click conversion to Order or Live Shopping session
4. **Track Engagement** - Know when clients view shared sheets and what they select

## User Stories

### Staff User Stories

**US-001: Create Sales Sheet**
> As a sales rep, I want to create a customized sales sheet for a client, so I can share relevant inventory with proper pricing.

**US-002: Add Items to Sheet**
> As a sales rep, I want to browse and filter inventory to add items to my sheet, so I can quickly build a curated list.

**US-003: Customize Sheet**
> As a sales rep, I want to reorder items, override prices, and add notes, so the sheet is tailored to my client's needs.

**US-004: Export Sheet**
> As a sales rep, I want to copy the sheet as text, export as PDF, or export as image, so I can share it via my preferred channel.

**US-005: Share via Link**
> As a sales rep, I want to generate a shareable link, so my client can view the sheet without logging in.

**US-006: Track Engagement**
> As a sales rep, I want to see when a client viewed my sheet and what they selected, so I can follow up effectively.

**US-007: Convert to Order**
> As a sales rep, I want to convert a sales sheet to an order with one click, so I don't have to re-enter items.

**US-008: Start Live Session**
> As a sales rep, I want to start a Live Shopping session from a sheet, so we can discuss items in real-time.

### Client User Stories

**US-009: View Shared Sheet**
> As a client, I want to view a shared sales sheet via link, so I can see what's available without logging in.

**US-010: Select Items**
> As a client, I want to mark items I'm interested in and adjust quantities, so my sales rep knows what to prepare.

## Functional Requirements

### FR-001: Navigation
- Sales Sheets must appear in sidebar navigation under "Sales" group
- Route: `/sales-sheets`
- Icon: Layers or FileText
- Accessible on desktop and mobile

### FR-002: Client Selection
- Dropdown to select client
- Search/filter clients by name
- Show recent clients (last 5)
- Display client's pricing profile when selected
- Option to create new client inline

### FR-003: Inventory Browser
- Display available inventory with pricing
- Real-time search (debounced 300ms)
- Filters: category, subcategory, price range, stock level
- Add items to sheet with checkbox or button
- Show calculated retail price based on client's pricing profile
- Virtual scrolling for large lists

### FR-004: Sales Sheet Preview
- Display selected items with drag-and-drop reordering
- Inline price override with reason tracking
- Per-item notes
- Remove individual items or clear all
- Real-time total calculation
- Show margin (staff view only)
- Undo/redo support

### FR-005: Draft Management
- Auto-save every 30 seconds
- Save named drafts
- Load from drafts
- Delete drafts

### FR-006: Export
- Copy to clipboard (formatted for WhatsApp/Signal)
- Export as PDF (professional styling)
- Export as image (PNG, high-resolution)
- Export as CSV

### FR-007: Shareable Links
- Generate unique share token
- Configurable expiration
- Public access route (no auth required)
- Track views and last viewed timestamp
- Revoke link option

### FR-008: Client View (Shared Link)
- Read-only view of sheet items
- Item selection with quantity adjustment
- Submit selections button
- No sensitive data (COGS, margin)
- Mobile-responsive

### FR-009: Conversion to Order
- One-click conversion button
- Choose order type (Draft or Confirmed)
- Validate inventory availability
- Create order with SALES_SHEET origin
- Link order to source sheet
- Redirect to order page

### FR-010: Conversion to Live Session
- One-click start session button
- Pre-populate session cart with sheet items
- Preserve pricing overrides
- Redirect to Live Shopping console

### FR-011: Templates
- Save sheet as reusable template
- Universal or client-specific templates
- Load template into new sheet
- Template versioning
- Template management page

### FR-012: History
- List all past sales sheets
- Filter by client, date, status
- View conversion status
- Quick actions (view, duplicate, delete)

## Non-Functional Requirements

### NFR-001: Performance
- Page load < 2 seconds
- Search response < 300ms
- PDF generation < 3 seconds
- Support 1000+ inventory items

### NFR-002: Reliability
- Auto-save prevents data loss
- Graceful error handling
- Offline-resilient draft storage

### NFR-003: Security
- Share tokens cryptographically secure
- No sensitive data in client view
- Rate limiting on public endpoints
- Token expiration enforced

### NFR-004: Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigable
- Screen reader compatible
- Color contrast compliant

### NFR-005: Mobile
- Responsive design
- Touch-friendly controls
- Native share integration

## Data Model

### Existing Tables
- `salesSheetTemplates` - Template storage
- `salesSheetHistory` - Saved sheets
- `salesSheetDrafts` - Auto-saved drafts
- `salesSheetVersions` - Version control

### Columns to Use
- `share_token` - Unique token for sharing
- `share_url` - Full share URL
- `view_count` - Times viewed
- `last_viewed_at` - Last view timestamp

### New Table
- `sales_sheet_selections` - Client selections from shared link

## API Endpoints

### Existing
- `salesSheets.getInventory` - Get inventory with pricing
- `salesSheets.save` - Save finalized sheet
- `salesSheets.getHistory` - Get sheet history
- `salesSheets.getById` - Get sheet by ID
- `salesSheets.delete` - Delete sheet
- `salesSheets.createTemplate` - Create template
- `salesSheets.getTemplates` - List templates
- `salesSheets.loadTemplate` - Load template
- `salesSheets.saveDraft` - Save draft
- `salesSheets.getDrafts` - List drafts

### New Required
- `salesSheets.list` - List sheets with pagination
- `salesSheets.generateShareUrl` - Generate share token
- `salesSheets.getByToken` - Public: get sheet by token
- `salesSheets.updateSelections` - Public: save client selections
- `salesSheets.convertToOrder` - Convert to order
- `salesSheets.convertToLiveSession` - Start live session

## Success Metrics

- **Adoption:** 80% of sales staff using within 2 weeks
- **Efficiency:** Time to create sheet < 2 minutes
- **Engagement:** 50% of shared links viewed
- **Conversion:** 30% of sheets convert to orders
- **Satisfaction:** User feedback score > 4/5

## Dependencies

- Live Shopping module (for session conversion)
- Pricing Engine (for dynamic pricing)
- Order module (for order conversion)
- Client module (for client selection)

## Out of Scope

- Email sending (future enhancement)
- Bulk sheet generation
- AI-suggested items
- External CRM integration
