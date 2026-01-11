# TERP-INIT-016: Sales Sheet Module - Complete Implementation Roadmap

**Version:** 1.0
**Date:** January 11, 2026
**Status:** Ready for Implementation
**Priority:** High
**Risk Level:** Low (most infrastructure already exists)

---

## Executive Summary

The Sales Sheet module was originally built in October 2025 but has become **orphaned** during the architectural transition to the Unified Sales & Live Shopping System. This roadmap provides atomic, actionable tasks to restore full functionality, integrate with Live Shopping, and deliver a polished, production-ready experience.

**Current State:**
- Backend: 100% complete (14 tRPC endpoints, 6 database tables)
- Frontend: 95% complete (components built, need polish)
- Navigation: **BROKEN** (no sidebar link)
- Integration: **MISSING** (no conversion to Live Shopping/Orders)
- Documentation: Complete but outdated

**Target State:**
- Fully accessible via sidebar navigation
- Seamless integration with Live Shopping sessions
- One-click conversion to Orders
- Shareable links for client self-service
- Mobile-responsive, production-polished UI

**Total Estimated Effort:** 16-22 hours (2-3 days)

---

## Architecture Context

### Current System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     UNIFIED SALES SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐    ┌──────────────────┐                  │
│   │  Live Shopping   │◄───┤   Sales Sheet    │◄─── NEEDS LINK   │
│   │   (Complete)     │    │   (Orphaned)     │                  │
│   └────────┬─────────┘    └────────┬─────────┘                  │
│            │                       │                             │
│            ▼                       ▼                             │
│   ┌──────────────────────────────────────────┐                  │
│   │           Unified Order Model            │                  │
│   │  (orders table with origin tracking)     │                  │
│   └──────────────────────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Flow (Target)

```
Sales Sheet Created → Share with Client → Client Reviews
         │                                      │
         ▼                                      ▼
   Convert to Order  ◄────────────────► Start Live Session
         │                                      │
         ▼                                      ▼
   Order Confirmed  ◄────────────────►  Order Confirmed
```

---

## Phase 1: Foundation & Navigation (2-3 hours)

### TERP-TASK-016-01: Restore Sidebar Navigation

**Goal:** Make Sales Sheet accessible from the main navigation

**Priority:** CRITICAL
**Risk:** None
**Dependencies:** None

**Technical Tasks:**

1. **Add Navigation Item**
   - Edit `client/src/config/navigation.ts`
   - Add Sales Sheets entry to the sales group
   - Position after "Invoices" in navigation order
   - Use appropriate icon (Layers or FileText)

   ```typescript
   {
     name: "Sales Sheets",
     path: "/sales-sheets",
     icon: Layers,
     group: "sales",
     ariaLabel: "Create and manage sales sheets for clients",
   },
   ```

2. **Import Icon**
   - Add `Layers` to lucide-react imports in navigation.ts

3. **Verify Route Exists**
   - Confirm `/sales-sheets` route in App.tsx maps to SalesSheetCreatorPage
   - Test navigation works end-to-end

**Acceptance Criteria:**
- [ ] Sales Sheets appears in sidebar under "Sales" group
- [ ] Clicking link navigates to /sales-sheets
- [ ] Active state styling works correctly
- [ ] Mobile navigation includes Sales Sheets

**Testing:**
- [ ] Desktop: Click Sales Sheets in sidebar, verify navigation
- [ ] Mobile: Open hamburger menu, verify Sales Sheets visible
- [ ] Refresh on /sales-sheets, verify page loads

---

### TERP-TASK-016-02: Add Missing API Procedure

**Goal:** Add `salesSheets.list` procedure required by E2E tests

**Priority:** HIGH
**Risk:** Low
**Dependencies:** None

**Technical Tasks:**

1. **Add List Procedure to Router**
   - Edit `server/routers/salesSheets.ts`
   - Add `list` procedure with pagination support

   ```typescript
   list: protectedProcedure
     .use(requirePermission("orders:read"))
     .input(z.object({
       clientId: z.number().optional(),
       limit: z.number().positive().max(100).default(20),
       offset: z.number().nonnegative().default(0),
     }).optional())
     .query(async ({ ctx, input }) => {
       // Return paginated list of sales sheet history
     }),
   ```

2. **Implement Database Query**
   - Add `listSalesSheets` function to `server/salesSheetsDb.ts`
   - Support filtering by clientId
   - Support pagination with limit/offset
   - Order by createdAt DESC

3. **Add Type Exports**
   - Ensure return types are properly exported for client use

**Acceptance Criteria:**
- [ ] `salesSheets.list` returns paginated results
- [ ] Filtering by clientId works
- [ ] E2E tests for sales sheets pass
- [ ] No TypeScript errors

**Testing:**
- [ ] Call endpoint with no params, verify results
- [ ] Call with clientId filter, verify filtered results
- [ ] Call with pagination, verify offset/limit work
- [ ] Run E2E test suite for sales sheets

---

## Phase 2: UI Polish & Bug Fixes (4-5 hours)

### TERP-TASK-016-03: Client Selection Enhancement

**Goal:** Improve client selection UX with search and recent clients

**Priority:** MEDIUM
**Risk:** Low
**Dependencies:** TERP-TASK-016-01

**Technical Tasks:**

1. **Add Client Search**
   - Implement debounced search input in SalesSheetCreatorPage
   - Filter client dropdown as user types
   - Show "No clients found" empty state

2. **Add Recent Clients Section**
   - Track recently selected clients in localStorage
   - Show last 5 clients as quick-select buttons
   - Clear recent clients option

3. **Display Client Pricing Profile**
   - Show active pricing profile name when client selected
   - Add link to view/edit pricing profile
   - Display client tier (if applicable)

4. **Add Client Quick Create**
   - "Add New Client" button in dropdown
   - Opens minimal client creation modal
   - Auto-selects newly created client

**Acceptance Criteria:**
- [ ] Client search filters dropdown in real-time
- [ ] Recent clients appear as quick-select buttons
- [ ] Pricing profile displayed for selected client
- [ ] Quick create modal works and auto-selects

**Testing:**
- [ ] Type in search, verify filtering
- [ ] Select client, refresh, verify recent clients
- [ ] Verify pricing profile displays correctly
- [ ] Create new client, verify auto-selection

---

### TERP-TASK-016-04: Inventory Browser Enhancement

**Goal:** Improve inventory browsing with better filters and performance

**Priority:** MEDIUM
**Risk:** Low
**Dependencies:** TERP-TASK-016-01

**Technical Tasks:**

1. **Add Category Filters**
   - Multi-select dropdown for categories
   - Multi-select dropdown for subcategories
   - Filter chips showing active filters
   - "Clear All" button

2. **Add Price Range Filter**
   - Min/max price inputs
   - Apply filter on blur or enter
   - Show range in filter chips

3. **Add Stock Filter**
   - Toggle for "In Stock Only"
   - Show out-of-stock items grayed out (not hidden)
   - Badge showing stock level

4. **Implement Virtual Scrolling**
   - Use react-virtual for large inventory lists
   - Maintain scroll position on filter change
   - Show loading skeleton during fetch

5. **Add Batch Preview**
   - Hover card showing batch details
   - COA link if available
   - Quick add button in preview

**Acceptance Criteria:**
- [ ] Category/subcategory filters work
- [ ] Price range filter works
- [ ] Stock filter shows/hides appropriately
- [ ] Virtual scrolling handles 1000+ items
- [ ] Batch preview shows on hover

**Testing:**
- [ ] Filter by category, verify results
- [ ] Filter by price range, verify results
- [ ] Toggle stock filter, verify behavior
- [ ] Load 1000 items, verify smooth scrolling
- [ ] Hover over batch, verify preview appears

---

### TERP-TASK-016-05: Sales Sheet Preview Polish

**Goal:** Polish the sales sheet preview with better UX

**Priority:** MEDIUM
**Risk:** Low
**Dependencies:** TERP-TASK-016-01

**Technical Tasks:**

1. **Improve Drag-and-Drop**
   - Add animation during drag
   - Show drop zone indicators
   - Maintain accessibility (keyboard reorder)

2. **Enhance Price Override UI**
   - Modal for price override with reason input
   - Show original price with strikethrough
   - Track override history

3. **Add Item Notes**
   - Per-item notes field
   - Notes appear in exports
   - Character limit with counter

4. **Improve Totals Display**
   - Real-time total calculation
   - Show item count
   - Show average price per item
   - Show margin (staff view only)

5. **Add Undo/Redo**
   - Track changes for undo
   - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
   - Visual indicator when changes can be undone

**Acceptance Criteria:**
- [ ] Drag-and-drop animates smoothly
- [ ] Price override modal works
- [ ] Item notes can be added and appear in exports
- [ ] Totals update in real-time
- [ ] Undo/redo works for item changes

**Testing:**
- [ ] Drag item, verify animation
- [ ] Override price, verify display
- [ ] Add notes, verify in export
- [ ] Add/remove items, verify totals
- [ ] Make changes, test undo/redo

---

## Phase 3: Export & Sharing (4-5 hours)

### TERP-TASK-016-06: Export Enhancement

**Goal:** Improve export options with better formatting

**Priority:** HIGH
**Risk:** Low
**Dependencies:** TERP-TASK-016-05

**Technical Tasks:**

1. **Improve Copy to Clipboard**
   - Format for WhatsApp/Signal (plain text)
   - Include client name and date
   - Include totals and item count
   - Success toast notification

   ```
   Sales Sheet for ABC Dispensary
   Date: January 11, 2026

   1. Blue Dream - $150/unit (10 available)
   2. OG Kush - $180/unit (5 available)

   Total Items: 2
   Total Value: $330

   ---
   Generated by TERP
   ```

2. **Improve PDF Export**
   - Professional header with logo
   - Client information section
   - Styled table with alternating rows
   - Footer with totals and timestamp
   - Filename: `SalesSheet_[Client]_[Date].pdf`

3. **Improve Image Export**
   - High-resolution PNG output
   - Match PDF styling
   - Optimize for sharing
   - Filename: `SalesSheet_[Client]_[Date].png`

4. **Add CSV Export**
   - Export as CSV for spreadsheet import
   - Include all visible columns
   - Proper escaping for special characters

**Acceptance Criteria:**
- [ ] Copy to clipboard produces formatted text
- [ ] PDF has professional styling
- [ ] Image export is high-resolution
- [ ] CSV export opens correctly in Excel/Sheets
- [ ] All exports include correct data

**Testing:**
- [ ] Copy, paste into WhatsApp, verify formatting
- [ ] Generate PDF, open in viewer
- [ ] Generate image, verify quality
- [ ] Generate CSV, open in spreadsheet app

---

### TERP-TASK-016-07: Shareable Links

**Goal:** Enable sharing sales sheets via URL for client access

**Priority:** HIGH
**Risk:** Medium (security considerations)
**Dependencies:** TERP-TASK-016-06

**Technical Tasks:**

1. **Generate Share Token**
   - Create cryptographically secure token
   - Store in `share_token` column (already exists)
   - Set expiration date (configurable)

2. **Create Public View Route**
   - Add `/shared/sales-sheet/:token` route
   - Public (no auth required)
   - Read-only view of sales sheet

3. **Create Client View Component**
   - Show sales sheet items
   - Allow selection/quantity adjustment
   - Submit selections button
   - No pricing (or configured visibility)

4. **Implement View Tracking**
   - Increment `view_count` on access
   - Update `last_viewed_at` timestamp
   - Track selections in `sales_sheet_selections` table

5. **Add Share Dialog**
   - Generate and display share URL
   - Copy link button
   - QR code for mobile scanning
   - Expiration date selector
   - Revoke link option

6. **Security Measures**
   - Rate limiting on public endpoint
   - Token expiration enforcement
   - No sensitive data exposure (COGS, margin)

**Acceptance Criteria:**
- [ ] Share URL generated and copyable
- [ ] Client can view sheet without login
- [ ] Client can make selections
- [ ] View count tracks correctly
- [ ] Expired links show appropriate message

**Testing:**
- [ ] Generate share link, open in incognito
- [ ] Make selections as client, verify stored
- [ ] Wait for expiration, verify link fails
- [ ] Check view count increments
- [ ] Verify no COGS/margin visible to client

---

## Phase 4: Integration (4-5 hours)

### TERP-TASK-016-08: Convert to Order

**Goal:** Enable one-click conversion of sales sheet to order

**Priority:** HIGH
**Risk:** Medium
**Dependencies:** TERP-TASK-016-07

**Technical Tasks:**

1. **Add Conversion Endpoint**
   - Create `salesSheets.convertToOrder` procedure
   - Accept sheet ID and optional order type (DRAFT/CONFIRMED)
   - Create order with `origin: 'SALES_SHEET'`
   - Link via `sales_sheet_id` column

2. **Implement Conversion Logic**
   - Map sales sheet items to order items
   - Preserve pricing overrides
   - Validate inventory availability
   - Handle partial availability (warning)

3. **Add Conversion UI**
   - "Convert to Order" button in preview
   - Confirmation dialog with order type selection
   - Success redirect to new order
   - Error handling for unavailable items

4. **Track Conversion History**
   - Store conversion in `order_mode_transitions` table
   - Link order back to sales sheet
   - Show conversion status on sales sheet

**Acceptance Criteria:**
- [ ] Convert button visible in preview
- [ ] Clicking opens confirmation dialog
- [ ] Order created with correct items
- [ ] Order has SALES_SHEET origin
- [ ] Redirect to order page on success

**Testing:**
- [ ] Create sheet, convert to draft order
- [ ] Create sheet, convert to confirmed order
- [ ] Verify order items match sheet
- [ ] Check order origin is SALES_SHEET
- [ ] Verify inventory validation works

---

### TERP-TASK-016-09: Convert to Live Session

**Goal:** Enable starting a Live Shopping session from a sales sheet

**Priority:** MEDIUM
**Risk:** Medium
**Dependencies:** TERP-TASK-016-08

**Technical Tasks:**

1. **Add Session Conversion Endpoint**
   - Create `salesSheets.convertToLiveSession` procedure
   - Accept sheet ID
   - Create Live Shopping session
   - Pre-populate cart with sheet items

2. **Implement Cart Pre-Population**
   - Copy sheet items to session cart
   - Preserve pricing overrides as session overrides
   - Validate inventory availability

3. **Add Session Start UI**
   - "Start Live Session" button in preview
   - Confirmation with session options
   - Redirect to Live Shopping console

4. **Two-Way Linking**
   - Store `salesSheetId` in session
   - Show "From Sales Sheet" indicator in Live Shopping
   - Allow returning to original sheet

**Acceptance Criteria:**
- [ ] Start session button visible
- [ ] Session created with items pre-loaded
- [ ] Pricing preserved from sheet
- [ ] Redirect to Live Shopping console
- [ ] Session shows origin indicator

**Testing:**
- [ ] Create sheet with 5 items
- [ ] Convert to session
- [ ] Verify session cart has items
- [ ] Verify pricing matches
- [ ] Complete session flow

---

### TERP-TASK-016-10: Unified Sales Portal Integration

**Goal:** Show Sales Sheets in the Unified Sales Portal kanban

**Priority:** MEDIUM
**Risk:** Low
**Dependencies:** TERP-TASK-016-08

**Technical Tasks:**

1. **Add Sales Sheets Column**
   - Add "Sales Sheets" as first column in kanban
   - Or integrate into existing column structure

2. **Implement Data Fetching**
   - Fetch active sales sheets
   - Show client name, item count, total value
   - Show creation date and status

3. **Add Drag-and-Drop Conversion**
   - Drag sheet to "Orders" column to convert
   - Drag sheet to "Live Sessions" to start session
   - Confirmation on drop

4. **Add Quick Actions**
   - View button
   - Edit button
   - Convert dropdown (to Order, to Session)
   - Delete/Archive button

**Acceptance Criteria:**
- [ ] Sales Sheets appear in portal
- [ ] Can drag to convert
- [ ] Quick actions work
- [ ] Integration is seamless

**Testing:**
- [ ] Create sheet, verify appears in portal
- [ ] Drag to Orders, verify conversion
- [ ] Use quick actions, verify functionality

---

## Phase 5: Templates & History (2-3 hours)

### TERP-TASK-016-11: Template Management UI

**Goal:** Create UI for managing reusable sales sheet templates

**Priority:** LOW
**Risk:** Low
**Dependencies:** TERP-TASK-016-05

**Technical Tasks:**

1. **Add Template Save Dialog**
   - "Save as Template" button in preview
   - Name and description inputs
   - Universal vs client-specific toggle

2. **Add Template Load UI**
   - "Load Template" dropdown in creator
   - Show template preview on hover
   - Filter by client-specific and universal

3. **Add Template Management Page**
   - List all templates
   - Edit/delete templates
   - Usage statistics

4. **Implement Template Versioning**
   - Track versions when template updated
   - Allow rollback to previous version
   - Show version history

**Acceptance Criteria:**
- [ ] Can save current sheet as template
- [ ] Can load template into new sheet
- [ ] Template management page works
- [ ] Versioning tracks changes

**Testing:**
- [ ] Save template, verify appears in list
- [ ] Load template, verify items populated
- [ ] Edit template, verify version created
- [ ] Delete template, verify removed

---

### TERP-TASK-016-12: History & Analytics

**Goal:** Add history viewing and basic analytics

**Priority:** LOW
**Risk:** Low
**Dependencies:** TERP-TASK-016-11

**Technical Tasks:**

1. **Add History Page**
   - List all past sales sheets
   - Filter by client, date range, status
   - Show conversion status

2. **Add Analytics Dashboard**
   - Most popular items
   - Client engagement metrics
   - Conversion rates
   - Export frequency

3. **Add Client Profile Integration**
   - Show sales sheet history in client profile
   - Quick create from client profile
   - View client's templates

**Acceptance Criteria:**
- [ ] History page shows all sheets
- [ ] Filters work correctly
- [ ] Analytics display meaningful metrics
- [ ] Client profile integration works

**Testing:**
- [ ] Create multiple sheets, verify history
- [ ] Apply filters, verify results
- [ ] Check analytics accuracy
- [ ] View client profile, verify sheets shown

---

## Phase 6: Mobile & Accessibility (2-3 hours)

### TERP-TASK-016-13: Mobile Responsiveness

**Goal:** Ensure full functionality on mobile devices

**Priority:** MEDIUM
**Risk:** Low
**Dependencies:** TERP-TASK-016-05

**Technical Tasks:**

1. **Implement Stacked Layout**
   - Inventory browser on top (mobile)
   - Sales sheet preview below
   - Sticky header with actions

2. **Touch-Friendly Controls**
   - Larger touch targets (44x44 min)
   - Swipe to remove items
   - Touch-friendly drag handles

3. **Mobile Filter UI**
   - Collapsible filter drawer
   - Full-screen filter modal option
   - Clear all filters button

4. **Responsive Export**
   - Mobile-friendly share dialog
   - Native share sheet integration
   - QR code for easy URL sharing

**Acceptance Criteria:**
- [ ] Works on iPhone/Android screens
- [ ] Touch controls are usable
- [ ] Filters work on mobile
- [ ] Exports work on mobile

**Testing:**
- [ ] Test on iPhone 12/13 size
- [ ] Test on iPad
- [ ] Test touch interactions
- [ ] Test all export options on mobile

---

### TERP-TASK-016-14: Accessibility Compliance

**Goal:** Ensure WCAG 2.1 AA compliance

**Priority:** MEDIUM
**Risk:** Low
**Dependencies:** TERP-TASK-016-13

**Technical Tasks:**

1. **Keyboard Navigation**
   - All actions accessible via keyboard
   - Logical tab order
   - Focus indicators visible
   - Skip links where appropriate

2. **Screen Reader Support**
   - Proper ARIA labels
   - Live regions for dynamic updates
   - Accessible table markup
   - Error announcements

3. **Color Contrast**
   - Verify all text meets 4.5:1 ratio
   - Don't rely on color alone
   - High contrast mode support

4. **Focus Management**
   - Focus trap in modals
   - Return focus after modal close
   - Focus indicators for all interactive elements

**Acceptance Criteria:**
- [ ] All keyboard navigable
- [ ] Screen reader announces correctly
- [ ] Color contrast passes
- [ ] Focus management works

**Testing:**
- [ ] Navigate with keyboard only
- [ ] Test with VoiceOver/NVDA
- [ ] Run axe/lighthouse audit
- [ ] Test with high contrast mode

---

## Dependency Graph

```
TERP-TASK-016-01 (Navigation) ─────────────────────────────────────┐
         │                                                          │
         ├──────────────────────────────────────────────────────────┤
         │                                                          │
         ▼                                                          ▼
TERP-TASK-016-02 (API)      TERP-TASK-016-03 (Client Selection)
         │                           │
         │                           ▼
         │                  TERP-TASK-016-04 (Inventory Browser)
         │                           │
         │                           ▼
         │                  TERP-TASK-016-05 (Preview Polish)
         │                           │
         └───────────────────────────┼───────────────────────────────┐
                                     │                               │
                                     ▼                               ▼
                            TERP-TASK-016-06 (Export)    TERP-TASK-016-11 (Templates)
                                     │                               │
                                     ▼                               ▼
                            TERP-TASK-016-07 (Sharing)   TERP-TASK-016-12 (History)
                                     │
                                     ▼
                            TERP-TASK-016-08 (Convert to Order)
                                     │
                                     ├───────────────────────────────┐
                                     ▼                               ▼
                            TERP-TASK-016-09 (Live Session) TERP-TASK-016-10 (Portal)
                                     │
                                     ▼
                            TERP-TASK-016-13 (Mobile)
                                     │
                                     ▼
                            TERP-TASK-016-14 (Accessibility)
```

---

## Timeline Summary

| Task | Description | Duration | Dependencies | Priority |
|------|-------------|----------|--------------|----------|
| 016-01 | Restore Sidebar Navigation | 30 min | None | CRITICAL |
| 016-02 | Add Missing API Procedure | 1-2 hr | None | HIGH |
| 016-03 | Client Selection Enhancement | 2 hr | 016-01 | MEDIUM |
| 016-04 | Inventory Browser Enhancement | 2-3 hr | 016-01 | MEDIUM |
| 016-05 | Sales Sheet Preview Polish | 2 hr | 016-01 | MEDIUM |
| 016-06 | Export Enhancement | 2 hr | 016-05 | HIGH |
| 016-07 | Shareable Links | 3 hr | 016-06 | HIGH |
| 016-08 | Convert to Order | 2 hr | 016-07 | HIGH |
| 016-09 | Convert to Live Session | 2 hr | 016-08 | MEDIUM |
| 016-10 | Unified Sales Portal Integration | 2 hr | 016-08 | MEDIUM |
| 016-11 | Template Management UI | 2 hr | 016-05 | LOW |
| 016-12 | History & Analytics | 2 hr | 016-11 | LOW |
| 016-13 | Mobile Responsiveness | 2 hr | 016-05 | MEDIUM |
| 016-14 | Accessibility Compliance | 2 hr | 016-13 | MEDIUM |
| **TOTAL** | | **16-22 hr** | | |

---

## Recommended Implementation Order

### Sprint 1: Core Functionality (Day 1)
1. **TERP-TASK-016-01** - Navigation (30 min) ⚡ QUICK WIN
2. **TERP-TASK-016-02** - API Procedure (1-2 hr)
3. **TERP-TASK-016-05** - Preview Polish (2 hr)
4. **TERP-TASK-016-06** - Export Enhancement (2 hr)

**Sprint 1 Deliverable:** Accessible, polished sales sheet with great exports

### Sprint 2: Sharing & Conversion (Day 2)
5. **TERP-TASK-016-07** - Shareable Links (3 hr)
6. **TERP-TASK-016-08** - Convert to Order (2 hr)
7. **TERP-TASK-016-09** - Convert to Live Session (2 hr)

**Sprint 2 Deliverable:** Full sharing and conversion workflow

### Sprint 3: Enhancement & Polish (Day 3)
8. **TERP-TASK-016-03** - Client Selection (2 hr)
9. **TERP-TASK-016-04** - Inventory Browser (2-3 hr)
10. **TERP-TASK-016-10** - Portal Integration (2 hr)

**Sprint 3 Deliverable:** Enhanced UX and full system integration

### Sprint 4: Optional Enhancements (Future)
11. **TERP-TASK-016-11** - Template Management
12. **TERP-TASK-016-12** - History & Analytics
13. **TERP-TASK-016-13** - Mobile Responsiveness
14. **TERP-TASK-016-14** - Accessibility

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Inventory availability conflicts | Medium | Medium | Validate at conversion time, show warnings |
| Share link security exposure | High | Low | Token expiration, rate limiting, no sensitive data |
| Live Session state complexity | Medium | Medium | Thorough testing, clear state management |
| Mobile UI regressions | Low | Medium | Responsive testing on real devices |
| Breaking existing exports | Medium | Low | E2E tests for all export formats |

---

## Success Metrics

### Functional
- [ ] Sales Sheets accessible from sidebar navigation
- [ ] All export formats working (Copy, PDF, Image, CSV)
- [ ] Shareable links functional with client access
- [ ] One-click conversion to Order works
- [ ] One-click conversion to Live Session works
- [ ] Unified Sales Portal shows Sales Sheets

### Performance
- [ ] Page loads in < 2 seconds
- [ ] Inventory search responds in < 300ms
- [ ] PDF generation in < 3 seconds
- [ ] Share link loads in < 1 second

### Quality
- [ ] Zero critical bugs in production
- [ ] All E2E tests passing
- [ ] Mobile responsive on all screen sizes
- [ ] Accessibility audit passes (WCAG 2.1 AA)

---

## Files to Modify

### Navigation
- `client/src/config/navigation.ts` - Add sidebar link

### API
- `server/routers/salesSheets.ts` - Add list procedure, conversion endpoints
- `server/salesSheetsDb.ts` - Add list function, conversion functions

### Frontend
- `client/src/pages/SalesSheetCreatorPage.tsx` - Enhance client selection, add conversions
- `client/src/components/sales/SalesSheetPreview.tsx` - Polish, add conversion buttons
- `client/src/components/sales/InventoryBrowser.tsx` - Add filters, virtual scrolling
- `client/src/components/sales/DraftControls.tsx` - Template save/load

### New Files
- `client/src/pages/SharedSalesSheetPage.tsx` - Public client view
- `client/src/pages/SalesSheetHistoryPage.tsx` - History view
- `client/src/components/sales/ShareDialog.tsx` - Share link modal
- `client/src/components/sales/ConversionDialog.tsx` - Conversion confirmation

### Routes
- `client/src/App.tsx` - Add shared sales sheet route

---

## Post-Implementation

### Monitoring
- Track usage analytics (sheets created, shared, converted)
- Monitor export success rates
- Track share link engagement

### Maintenance
- Update export templates as branding changes
- Keep pricing calculations in sync with pricing engine
- Review share link security periodically

### Future Enhancements
- Email integration (send sheets directly)
- Bulk sheet generation
- AI-suggested items based on client history
- Integration with external CRM systems

---

**Status:** Ready for Implementation
**Approval Required:** No (restoration of existing feature)
**Implementation Start:** Immediate
**Estimated Completion:** 2-3 days
