# Staging Verification Playbook — 2026-03-26 Remediation Train

**Target:** `https://terp-staging-yicld.ondigitalocean.app`
**Branch merged:** PR #528 → main (squash-merged 2026-03-27T16:49:57Z)
**Scope:** 37 canonical issues, 113 BUG findings, 113 files changed
**Playbook version:** 1.0

---

## Instructions for AI QA Agents

You are testing a live staging deployment. Each section below is one verification task. For every task:

1. **Navigate** to the exact URL specified
2. **Perform** the exact steps listed
3. **Assert** the expected behavior
4. **Record** PASS or FAIL with a screenshot or DOM evidence
5. **If FAIL:** capture the actual behavior, console errors, and network errors

Login credentials: Use the QA Super Admin account (`qa.superadmin@terp.test` / `TerpQA2026!`).

Do NOT skip tasks. Do NOT assume a task passes because a related task passed. Each task tests a distinct fix.

---

## SECTION 1: Global Infrastructure (TER-899, TER-900, TER-902, TER-859, TER-903)

### 1.1 — HTTP 400 on page load is gone (TER-899)

1. Open browser DevTools → Network tab → filter by status code 400
2. Navigate to `/`
3. Wait for full page load (dashboard renders)
4. **ASSERT:** Zero HTTP 400 responses in the network log
5. Navigate to `/sales`, `/accounting`, `/inventory`
6. **ASSERT:** Zero HTTP 400 responses across all navigations

### 1.2 — HTTP 500 errors reduced (TER-900)

1. Open browser DevTools → Network tab → filter by status code 500
2. Navigate through: `/` → `/sales` → `/accounting` → `/inventory` → `/relationships` → `/settings` → `/calendar` → `/analytics`
3. **ASSERT:** Zero HTTP 500 responses during normal navigation
4. Open the Quick Add Task modal (click the + button or Cmd+K → "Add task")
5. **ASSERT:** The modal opens without 500 errors. The `todoLists.getMyLists` endpoint returns 200.

### 1.3 — Dead route redirects work (TER-859)

| Navigate to | Expected redirect | Expected tab |
|-------------|-------------------|-------------|
| `/suppliers` | `/relationships` | suppliers tab active |
| `/accounts-receivable` | `/accounting` | invoices tab active |
| `/payments` | `/accounting` | payments tab active |
| `/admin` | `/settings` | default settings tab |

For each row:
1. Type the URL directly in the address bar
2. **ASSERT:** URL changes to the expected redirect
3. **ASSERT:** Correct tab is active after redirect

### 1.4 — 404 page for invalid routes (TER-902)

1. Navigate to `/this-page-does-not-exist-abc123`
2. **ASSERT:** A user-friendly "Page Not Found" or "404" message is displayed
3. **ASSERT:** A "Go Home" or navigation link is present
4. **ASSERT:** The page does NOT show a blank screen or the dashboard

### 1.5 — Global search returns results (TER-903)

1. Press `Cmd+K` (or `Ctrl+K`) to open the command palette
2. Type `Sierra` (a known supplier name)
3. Wait 500ms for debounce
4. **ASSERT:** A "Search Results" section appears below the navigation commands
5. **ASSERT:** At least one result containing "Sierra" is listed
6. Click the result
7. **ASSERT:** Navigation occurs to the correct detail page
8. Reopen `Cmd+K`, type `INV-` (partial invoice number)
9. **ASSERT:** Invoice results appear
10. Clear the input to 2 characters or fewer
11. **ASSERT:** Search results disappear, only navigation commands remain
12. Type `xyznonexistent999`
13. **ASSERT:** Message says "No results found for 'xyznonexistent999'" (not generic "No results found")

---

## SECTION 2: Dev Metadata Stripped (TER-887)

For each surface below, navigate to the URL and verify NO internal engineering text is visible.

### 2.1 — Sales Orders surface

1. Navigate to `/sales?tab=orders&surface=sheet-native`
2. **ASSERT:** No text containing "Queue evaluation active"
3. **ASSERT:** No text containing "Workflow target:"
4. **ASSERT:** No text containing "Pilot:" badge
5. **ASSERT:** No text containing "antiDrift" or "releaseGate"
6. **ASSERT:** No text containing "Support-grid release gate"
7. **ASSERT:** No text containing "Spreadsheet runtime armed"
8. The "Selected Order Lines" panel should say "Select an order to take action" or similar user-facing text

### 2.2 — Purchase Orders surface

1. Navigate to `/purchasing?surface=sheet-native`
2. **ASSERT:** No "Sheet-native Pilot · PO Queue + Detail" badge
3. **ASSERT:** No "Workflow target:" text

### 2.3 — Quotes surface

1. Navigate to `/sales?tab=quotes&surface=sheet-native`
2. **ASSERT:** No "Registry evaluation active" text
3. **ASSERT:** Text says "Select a quote to take action" or similar

### 2.4 — Sheet mode toggle button

1. On any sheet-native surface, find the surface toggle button
2. **ASSERT:** Button text reads "Spreadsheet View" (NOT "Sheet-Native Pilot")

### 2.5 — Invoices, Returns, Payments, Fulfillment, Intake, Samples, Client Ledger surfaces

For each of these surfaces, navigate to the respective tab and:
1. **ASSERT:** No "Pilot:" badge anywhere on the page
2. **ASSERT:** No `releaseGateIds` or `antiDriftSummary` text visible
3. **ASSERT:** No `import.meta.env.DEV`-gated debug panels visible

---

## SECTION 3: Settings & Security (TER-880)

### 3.1 — User creation form has no prefilled credentials

1. Navigate to `/settings` → Access Control → Users tab
2. Click "Create New User" (or equivalent button)
3. **ASSERT:** Username/email field is EMPTY (not prefilled with admin credentials)
4. **ASSERT:** Password field is EMPTY (not prefilled)
5. **ASSERT:** Password field has `autocomplete="new-password"` attribute (inspect DOM)
6. **ASSERT:** Username field has `autocomplete="off"` attribute (inspect DOM)

### 3.2 — Password minimum length is 8

1. In the Create User form, enter a valid username
2. Enter password "abc" (3 chars) and try to submit
3. **ASSERT:** Validation error — password must be at least 8 characters
4. Enter password "abcd1234" (8 chars)
5. **ASSERT:** Password validation passes (no length error)

### 3.3 — User Roles tab loads (BUG-079 TypeError fix)

1. Navigate to `/settings` → Access Control → User Roles tab
2. Wait up to 10 seconds
3. **ASSERT:** The roles table renders with data (not stuck on "Loading users and roles...")
4. **ASSERT:** No TypeError in browser console

### 3.4 — Delete user has confirmation dialog (BUG-082)

1. In the Users list, find a test user
2. Click the delete/remove action
3. **ASSERT:** A confirmation dialog appears (not immediate deletion)
4. **ASSERT:** The dialog requires a reason or explicit confirmation
5. Cancel the dialog
6. **ASSERT:** User is NOT deleted

---

## SECTION 4: Data Pollution Cleaned (TER-886)

### 4.1 — Analytics top clients exclude deleted records

1. Navigate to `/analytics`
2. Look at the Top Clients leaderboard
3. **ASSERT:** No client named "Test Client 1772572173661" or similar numeric-ID test names
4. **ASSERT:** No client named "wer werwert"

### 4.2 — Users list excludes deleted users

1. Navigate to `/settings` → Access Control → Users
2. **ASSERT:** No clearly deleted/test users appear (unless they have active roles)

### 4.3 — Calendar events exclude test data

1. Navigate to `/calendar`
2. Browse through current month
3. **ASSERT:** No events titled "QA Chain Event" with numeric IDs
4. **ASSERT:** No lorem-ipsum events ("UNLEASH LEADING-EDGE INFRASTRUCTURES", etc.)

---

## SECTION 5: Sales Orders (TER-871)

### 5.1 — Invoice button gating (BUG-012)

1. Navigate to `/sales?tab=orders&surface=sheet-native`
2. Click a row with status "DRAFT"
3. **ASSERT:** "Generate Invoice" button is NOT visible or is disabled
4. Click a row with status "PACKED" or "SHIPPED"
5. **ASSERT:** "Generate Invoice" button IS visible and enabled

### 5.2 — Row click populates detail panel (BUG-015, TER-852, TER-911)

1. Click any order row in the grid
2. **ASSERT:** The inspector/detail panel updates with the order's data
3. **ASSERT:** No page hang or 60-second timeout
4. **ASSERT:** "Selected Order Lines" panel shows the order's line items (not "No order selected")

### 5.3 — Payment status display (BUG-019)

1. Click a confirmed order row
2. Look at the Payment field in the summary cards or inspector
3. **ASSERT:** Shows "See Accounting tab" (NOT a bare "-" or "No payment" for orders that have payments)

### 5.4 — Inspector toggle (TER-853)

1. Click an order row — inspector should appear
2. Click "Hide Details" or the toggle button
3. **ASSERT:** Inspector closes
4. Click "View Details" or the toggle button
5. **ASSERT:** Inspector opens with the selected order's data
6. Click a DIFFERENT order row
7. **ASSERT:** Inspector updates to show the new order's data

---

## SECTION 6: Sales Quotes (TER-870)

### 6.1 — Quote filter excludes order records (BUG-006)

1. Navigate to `/sales?tab=quotes&surface=sheet-native`
2. **ASSERT:** Only rows with QUOTE type are shown (no ORD-... IDs)

### 6.2 — New Quote creates a quote, not a sales order (BUG-007, BUG-008)

1. On the quotes tab, click "New Quote" (or navigate via tab)
2. **ASSERT:** Tab label says "New Quote" (not "New Sales Order")
3. **ASSERT:** The order creator form has Order Type set to "QUOTE" (not "SALE")
4. If you see a dropdown for order type, verify it's pre-selected to "Quote"

### 6.3 — Quote conversion dialog (BUG-009, BUG-010, BUG-011)

1. Select a quote row and click "Convert to Order" (if available)
2. **ASSERT:** A confirmation dialog appears with `aria-describedby` attribute (inspect DOM)
3. If the quote is valid, confirm the conversion
4. **ASSERT:** On success, you are navigated to the created order's page
5. **ASSERT:** On failure, a user-friendly error message is shown (not raw enum names)

---

## SECTION 7: Shipping (TER-875)

### 7.1 — Queue date context (BUG-046)

1. Navigate to the shipping/fulfillment queue
2. **ASSERT:** Status summary cards have a date label ("Queue totals as of [date]")

### 7.2 — ID tooltip (BUG-047)

1. Hover over the "Order #" column header
2. **ASSERT:** A tooltip explains ID formats ("S-... = Sale order, O-... = Draft/quote order")

### 7.3 — No duplicate close button (BUG-048)

1. Click an order row to open the details drawer/inspector
2. **ASSERT:** Only ONE close button is visible (the X button, NOT both X and ChevronLeft)

### 7.4 — Currency formatting (BUG-049)

1. Look at order totals in the shipping queue
2. **ASSERT:** Totals display as properly formatted currency ("$1,234.56", not "1234.56")

### 7.5 — Drawer doesn't block actions (BUG-050)

1. Open the details drawer for an order
2. Try to click "Pack All to One Bag" or other action buttons
3. **ASSERT:** Buttons are clickable — the drawer backdrop does NOT intercept pointer events

---

## SECTION 8: Demand & Supply (TER-888)

### 8.1 — Add Need opens modal (not navigation)

1. Navigate to `/demand-supply` (or wherever the D&S/Matchmaking page is)
2. Click "Add Need"
3. **ASSERT:** A modal/dialog opens (NOT a navigation to `/clients`)
4. **ASSERT:** The modal has fields: Client selector, Product/Strain, Quantity, Priority, Notes
5. **ASSERT:** The URL did NOT change

### 8.2 — Add Supply opens modal (not navigation)

1. Click "Add Supply"
2. **ASSERT:** A modal/dialog opens (NOT a navigation to `/vendor-supply`)
3. **ASSERT:** The modal has fields: Supplier selector, Product/Strain, Quantity, Unit Price, Notes
4. **ASSERT:** Submit button is disabled while `isPending` (no double-submit)

---

## SECTION 9: Invoices & Accounting (TER-876, TER-892, TER-893)

### 9.1 — No duplicate invoice rows (BUG-053)

1. Navigate to `/accounting?tab=invoices&surface=sheet-native`
2. **ASSERT:** No two rows share the same invoice ID

### 9.2 — PAID invoices show $0 due (BUG-054, BUG-055, BUG-057)

1. Find a row with status "PAID"
2. **ASSERT:** Amount Due shows "$0.00" (NOT a negative value like "-$136.90")
3. **ASSERT:** Amount Paid does NOT exceed Total Amount

### 9.3 — GL status for DRAFT invoices (BUG-058)

1. Find a DRAFT invoice and open its inspector
2. **ASSERT:** GL status shows "Not Posted" or "Pending" (NOT "Active" or "Posted")

### 9.4 — Invoice status filter pills work (TER-892)

1. Click the "Draft" filter pill/tab
2. **ASSERT:** Only DRAFT invoices are shown (row count changes from "All")
3. Click "Sent"
4. **ASSERT:** Only SENT invoices shown
5. Click "All" to reset
6. **ASSERT:** All invoices shown again

### 9.5 — Bills detail drawer has content (TER-893)

1. Navigate to `/accounting?tab=bills`
2. Click any bill row
3. **ASSERT:** The drawer/sheet opens with bill details (supplier, amount, date, status)
4. **ASSERT:** Line items section is visible (if the bill has line items)
5. **ASSERT:** NOT just a "Close" button with empty content

### 9.6 — Accounting tab labels (BUG-052)

1. Navigate to `/accounting`
2. **ASSERT:** No tab labeled "Keep queues in focus" or "Open analysis"
3. **ASSERT:** No "Start here" or "Flow:" internal copy in the workspace header

---

## SECTION 10: Purchase Orders (TER-925, TER-872)

### 10.1 — PO totals are NOT negative (TER-925 — CRITICAL)

1. Navigate to `/purchasing?surface=sheet-native`
2. Look at PO total amounts in the grid
3. **ASSERT:** ALL totals display as positive values ($500.00, $6,054.00)
4. **ASSERT:** No totals display as negative ($-500.00, $-6,054.00)

### 10.2 — Expected Delivery Date column (BUG-022)

1. Look at the "EXPECTED" column
2. **ASSERT:** Shows "Not set" for POs without dates (NOT bare "—" dashes)

### 10.3 — Receiving confirmation (BUG-025)

1. Select a CONFIRMED PO row
2. Click "Start Receiving"
3. **ASSERT:** A confirmation dialog appears before navigating to the receiving form
4. Confirm the dialog
5. **ASSERT:** You are taken to the receiving/intake form for that PO

### 10.4 — No rollout badge (BUG-021)

1. On the PO surface
2. **ASSERT:** No "Sheet-native Pilot · PO Queue + Detail" badge visible

---

## SECTION 11: Inventory (TER-874, TER-873, TER-889, TER-895)

### 11.1 — Intake: no blank default rows (BUG-034)

1. Navigate to `/inventory?tab=intake&surface=sheet-native`
2. **ASSERT:** The grid does NOT start with 5 blank pending rows
3. **ASSERT:** "All changes saved" is NOT shown when no valid data exists

### 11.2 — Intake: location dropdown deduplicated (BUG-036)

1. Click a row's location dropdown/combobox
2. **ASSERT:** "Main Warehouse" appears only ONCE (not repeated multiple times)

### 11.3 — Receiving row click opens detail (TER-889)

1. Navigate to the Receiving tab
2. Click any PO row
3. **ASSERT:** The intake picker/receiving detail form opens for that PO
4. **ASSERT:** The form shows the PO's line items

### 11.4 — Samples row click opens inspector (TER-895)

1. Navigate to `/inventory?tab=samples&surface=sheet-native`
2. Click any sample row
3. **ASSERT:** The inspector/detail panel opens showing sample details
4. **ASSERT:** The URL or selection state reflects the clicked sample

### 11.5 — Receiving: bulk actions disabled without selection (BUG-033)

1. On the receiving surface, ensure NO line items are selected
2. **ASSERT:** "Apply Grade" and "Apply Location" buttons are disabled/greyed out
3. Select one or more line items
4. **ASSERT:** Buttons become enabled

---

## SECTION 12: Calendar (TER-883, TER-884, TER-898)

### 12.1 — Create Event form is NOT empty (TER-898)

1. Navigate to `/calendar`
2. Click "Create Event"
3. **ASSERT:** The form has pre-populated fields (today's date, 09:00–10:00 default times)
4. **ASSERT:** Title, Start Date, End Date, Start Time, End Time fields are visible and editable
5. **ASSERT:** Calendar selector has a default value (not empty)

### 12.2 — Event form validation (BUG-099)

1. Clear the Title field and click Submit
2. **ASSERT:** Validation error appears — title is required
3. Clear the Calendar selector
4. **ASSERT:** Validation error — calendar is required

### 12.3 — Admin can edit events (BUG-094)

1. As QA Super Admin, find an existing event (created by another user if possible)
2. Click to edit it
3. **ASSERT:** The edit form opens (NOT a "Permission denied" error)
4. Make a small change and save
5. **ASSERT:** Save succeeds

### 12.4 — Calendar filters use proper terminology (TER-884, BUG-095, BUG-096)

1. Open the calendar filter panel
2. **ASSERT:** No filter label says "VENDORS" (should say "Suppliers")
3. **ASSERT:** Filter labels use title case ("In Progress") not raw uppercase ("IN PROGRESS")

---

## SECTION 13: Relationships & Credits (TER-879, TER-878, TER-877, TER-896)

### 13.1 — Credit limit false alarm fixed (BUG-070)

1. Navigate to a client's detail page where credit limit is $0 (default)
2. **ASSERT:** No credit exposure warning banner is shown

### 13.2 — Transaction history no duplicates (BUG-077)

1. On a client detail page, scroll to transaction/payment history
2. **ASSERT:** No duplicate rows (same ID appearing twice)

### 13.3 — Supplier profile empty state (BUG-074)

1. Navigate to a client with supplier role but minimal data
2. **ASSERT:** Supplier profile section shows "Not set" for empty fields (NOT blank dashes)

### 13.4 — Credit adjustment form uses searchable selector (TER-878, BUG-063)

1. Navigate to the credit adjustment page/form
2. **ASSERT:** Client selector is a searchable dropdown/combobox (NOT a raw numeric ID input)
3. **ASSERT:** Submit button is disabled until all required fields are filled
4. Try to submit with empty fields
5. **ASSERT:** Inline validation errors appear (not just a generic toast)

### 13.5 — Payment reference display (TER-877, BUG-062)

1. Navigate to `/accounting?tab=payments&surface=sheet-native`
2. Look at the Reference column
3. **ASSERT:** Empty references show "No reference" (NOT bare "-")

### 13.6 — Add Supplier form renders (TER-896)

1. Navigate to `/relationships` → Suppliers tab
2. Click "Add Supplier"
3. **ASSERT:** A form/dialog opens (NOT nothing/no response)

---

## SECTION 14: Mobile Navigation (TER-885, TER-891)

### 14.1 — Sidebar close button visible (BUG-102)

1. Resize browser to mobile width (< 768px)
2. Open the navigation drawer
3. **ASSERT:** Close button/icon is visible within the viewport (NOT clipped off-screen)

### 14.2 — Drawer auto-closes on navigation (BUG-103)

1. On mobile, open the nav drawer
2. Tap any navigation link (e.g., "Sales")
3. **ASSERT:** The drawer closes automatically after navigation
4. **ASSERT:** The Sales page renders (NOT the drawer covering it)

### 14.3 — Header icon toggles correctly (BUG-111)

1. On mobile, the header should show a menu icon (hamburger)
2. Tap to open nav
3. **ASSERT:** Icon changes to X (close)
4. Tap X
5. **ASSERT:** Icon changes back to menu (hamburger)

### 14.4 — My Account accessible on mobile (TER-891)

1. On mobile, look for the user avatar in the header
2. Tap it
3. **ASSERT:** Navigates to `/account` (My Account page)

---

## SECTION 15: Feature Flags Admin (TER-881)

### 15.1 — Operator-facing language (BUG-083, BUG-084)

1. Navigate to `/settings` → Developer/Feature Flags tab
2. **ASSERT:** No internal support-tooling jargon (no "Support tooling" labels)
3. **ASSERT:** Flags are grouped by module in card sections
4. **ASSERT:** Raw internal identifiers (openId, key) are NOT visible to non-superadmin users

---

## SECTION 16: Notifications (TER-894)

### 16.1 — Sub-filter tabs respond to clicks (BUG-098)

1. Navigate to `/notifications`
2. Click "Unread" filter tab
3. **ASSERT:** List filters to show only unread items
4. Click "All"
5. **ASSERT:** All items shown again

### 16.2 — Mark All Read button exists (BUG-099)

1. On the notifications page
2. **ASSERT:** A "Mark All Read" button is visible
3. Click it
4. **ASSERT:** All items are marked as read (or the button disables if nothing to mark)

---

## SECTION 17: Analytics (TER-882, TER-905)

### 17.1 — Navigation says "Analytics" not "Reports" (BUG-086)

1. Look at the left sidebar navigation
2. **ASSERT:** Menu item says "Analytics" (NOT "Reports")

### 17.2 — Dashboard KPI labels are clear (TER-905)

1. Navigate to `/` (dashboard)
2. **ASSERT:** Card says "Today's Sales" (NOT "Today's Orders")
3. **ASSERT:** Subtitle says "invoices" (NOT "units")

### 17.3 — Inventory Value card respects COGS visibility (TER-959)

1. As admin, navigate to `/analytics`
2. **ASSERT:** Inventory Value card is visible showing estimated COGS value
3. Log in as a non-admin user (if available)
4. Navigate to `/analytics`
5. **ASSERT:** Inventory Value card is NOT visible (COGS data hidden)

---

## SECTION 18: Remaining Fixes

### 18.1 — Sales Catalogue tab routing (TER-890)

1. Navigate to `/sales?tab=sales-sheets`
2. **ASSERT:** The Sales Catalogues panel renders (NOT the Orders Queue)

### 18.2 — New Sales Order tab label (TER-897)

1. Navigate to `/sales`
2. Look at the tab bar
3. **ASSERT:** Tab says "Create Order" (NOT "New Sales Order")

### 18.3 — COGS display mode defaults to admin-only (TER-959)

1. Navigate to `/settings` → Organization
2. Find the COGS Display Mode setting
3. **ASSERT:** Default is "Admin Only" (NOT "Visible to All Users")
4. **ASSERT:** The COGS section is only visible if you have admin/manage permissions

---

## Execution checklist

| Section | Tasks | Verified by | PASS/FAIL |
|---------|-------|-------------|-----------|
| 1. Global Infrastructure | 5 tasks | | |
| 2. Dev Metadata | 5 tasks | | |
| 3. Settings & Security | 4 tasks | | |
| 4. Data Pollution | 3 tasks | | |
| 5. Sales Orders | 4 tasks | | |
| 6. Sales Quotes | 3 tasks | | |
| 7. Shipping | 5 tasks | | |
| 8. Demand & Supply | 2 tasks | | |
| 9. Invoices & Accounting | 6 tasks | | |
| 10. Purchase Orders | 4 tasks | | |
| 11. Inventory | 5 tasks | | |
| 12. Calendar | 4 tasks | | |
| 13. Relationships & Credits | 6 tasks | | |
| 14. Mobile Navigation | 4 tasks | | |
| 15. Feature Flags | 1 task | | |
| 16. Notifications | 2 tasks | | |
| 17. Analytics | 3 tasks | | |
| 18. Remaining | 3 tasks | | |
| **TOTAL** | **69 tasks** | | |

---

## Failure handling

If any task fails:
1. Capture: screenshot, URL, console errors, network errors
2. Record the exact step that failed
3. Classify severity: P0 (blocking), P1 (major), P2 (minor), P3 (cosmetic)
4. File the failure in the verification report with the task ID (e.g., "FAIL 5.2 — row click does not populate detail panel")
5. Do NOT stop testing — continue with remaining tasks

A PASS requires all 69 tasks green. Any P0 or P1 failure blocks the production promotion.
