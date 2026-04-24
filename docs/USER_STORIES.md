# TERP User Stories

> **Source:** `docs/FUNCTIONAL_BASELINE.md` + `docs/FUNCTIONAL_BASELINE_RUNTIME.md`  
> **Generated:** 2026-04-23 | **Revised:** 2026-04-23  
> **Coverage:** Every user-facing function, flow, tab, action, and conditional state documented in the functional baseline. Revised per QA: 30 stories updated, 34 new stories added.  
> **Format:** `As a [role], I want to [action], so that [outcome].`
>
> **Roles used:**
> - **Owner** — business operator / admin with full access
> - **Sales Rep** — handles orders, quotes, and client outreach
> - **Sales Manager** — oversees sales team; can confirm/override
> - **Inventory Manager** — manages batches, intake, receiving, photography
> - **Fulfillment Staff** — warehouse pick/pack execution
> - **Accounting Manager** — invoices, bills, payments, GL
> - **Procurement Manager** — purchase orders, supplier relations
> - **Auditor** — read-only access for compliance
> - **Any Staff** — applies to all authenticated internal users
> - **VIP Client** — external buyer with portal access
> - **Supplier/Farmer** — external supplier confirming intake receipts

---

## Table of Contents

1. [Authentication & Session](#1-authentication--session)
2. [Global Shell & Navigation](#2-global-shell--navigation)
3. [Dashboard — Owner Command Center](#3-dashboard--owner-command-center)
4. [Sales Workspace — Orders](#4-sales-workspace--orders)
5. [Sales Workspace — Quotes](#5-sales-workspace--quotes)
6. [Sales Workspace — Pick List](#6-sales-workspace--pick-list)
7. [Sales Workspace — Returns](#7-sales-workspace--returns)
8. [Sales Workspace — Sales Catalogues](#8-sales-workspace--sales-catalogues)
9. [Sales Workspace — Live Shopping (Staff)](#9-sales-workspace--live-shopping-staff)
10. [Order Creation Flow](#10-order-creation-flow)
11. [Inventory Workspace — Inventory Browser](#11-inventory-workspace--inventory-browser)
12. [Inventory Workspace — Direct Intake](#12-inventory-workspace--direct-intake)
13. [Inventory Workspace — Product Intake / Receiving](#13-inventory-workspace--product-intake--receiving)
14. [Inventory Workspace — Shipping / Fulfillment](#14-inventory-workspace--shipping--fulfillment)
15. [Inventory Workspace — Photography](#15-inventory-workspace--photography)
16. [Inventory Workspace — Samples](#16-inventory-workspace--samples)
17. [Warehouse Pick/Pack (Mobile)](#17-warehouse-pickpack-mobile)
18. [Shrinkage Report](#18-shrinkage-report)
19. [Purchase Orders / Procurement](#19-purchase-orders--procurement)
20. [Relationships — Clients Directory](#20-relationships--clients-directory)
21. [Relationships — Suppliers Directory](#21-relationships--suppliers-directory)
22. [Client Profile — Overview](#22-client-profile--overview)
23. [Client Profile — Sales & Pricing](#23-client-profile--sales--pricing)
24. [Client Profile — Money](#24-client-profile--money)
25. [Client Profile — Supply & Inventory](#25-client-profile--supply--inventory)
26. [Client Profile — Activity](#26-client-profile--activity)
27. [Client Ledger](#27-client-ledger)
28. [VIP Portal Config (Admin)](#28-vip-portal-config-admin)
29. [Demand & Supply — Matchmaking](#29-demand--supply--matchmaking)
30. [Demand & Supply — Client Needs](#30-demand--supply--client-needs)
31. [Demand & Supply — Interest List](#31-demand--supply--interest-list)
32. [Demand & Supply — Vendor Supply](#32-demand--supply--vendor-supply)
33. [Accounting — Dashboard](#33-accounting--dashboard)
34. [Accounting — Invoices](#34-accounting--invoices)
35. [Accounting — Bills](#35-accounting--bills)
36. [Accounting — Payments](#36-accounting--payments)
37. [Accounting — General Ledger](#37-accounting--general-ledger)
38. [Accounting — Chart of Accounts](#38-accounting--chart-of-accounts)
39. [Accounting — Expenses](#39-accounting--expenses)
40. [Accounting — Bank Accounts](#40-accounting--bank-accounts)
41. [Accounting — Bank Transactions](#41-accounting--bank-transactions)
42. [Accounting — Fiscal Periods](#42-accounting--fiscal-periods)
43. [Cash Locations](#43-cash-locations)
44. [Client Credits](#44-client-credits)
45. [Pricing Rules](#45-pricing-rules)
46. [Pricing Profiles](#46-pricing-profiles)
47. [COGS Settings](#47-cogs-settings)
48. [Analytics](#48-analytics)
49. [Leaderboard](#49-leaderboard)
50. [Calendar](#50-calendar)
51. [Scheduling](#51-scheduling)
52. [Time Clock](#52-time-clock)
53. [Notifications Hub](#53-notifications-hub)
54. [Todo Lists & Tasks](#54-todo-lists--tasks)
55. [Global Search](#55-global-search)
56. [Workflow Queue](#56-workflow-queue)
57. [Products / Strain Catalog](#57-products--strain-catalog)
58. [Settings — Access Control (Users & RBAC)](#58-settings--access-control-users--rbac)
59. [Settings — Master Data](#59-settings--master-data)
60. [Settings — Organization](#60-settings--organization)
61. [Settings — Developer / Feature Flags](#61-settings--developer--feature-flags)
62. [User Account (My Account)](#62-user-account-my-account)
63. [VIP Portal — Client Login & Session](#63-vip-portal--client-login--session)
64. [VIP Portal — Dashboard Modules](#64-vip-portal--dashboard-modules)
65. [VIP Portal — Live Shopping (Client)](#65-vip-portal--live-shopping-client)
66. [VIP Portal — Appointments (Client)](#66-vip-portal--appointments-client)
67. [VIP Portal — Document Downloads](#67-vip-portal--document-downloads)
68. [VIP Portal — Marketplace (Client)](#68-vip-portal--marketplace-client)
69. [Admin Impersonation of VIP Client](#69-admin-impersonation-of-vip-client)
70. [Farmer / Supplier Intake Verification](#70-farmer--supplier-intake-verification)
71. [Global UI Features](#71-global-ui-features)
72. [System & Admin Tools](#72-system--admin-tools)

---

## 1. Authentication & Session

**US-001** — As any staff member, I want to log in with my username and password, so that I can access the ERP securely from any browser.

**US-002** — As any staff member, I want to be redirected to my original destination after login, so that I don't lose my place when my session expires.

**US-003** — As any staff member, I want to log out and have my session fully revoked, so that my account is immediately inaccessible from all devices and browsers.

**US-004** — As an Admin, I want to revoke all active sessions for a specific user, so that I can immediately lock out a compromised or offboarded account.

**US-005** — As any staff member, I want my password change to immediately invalidate all existing tokens, so that old sessions can't be reused after a credential rotation.

**US-006** — As any staff member, I want unauthenticated visits to protected routes to redirect me to login (with my return URL preserved), so that I land back at the right page after signing in.

**US-007** — As a developer, I want a test-token endpoint (dev/test environments only) that issues a session cookie, so that E2E tests can authenticate without UI interaction.

---

## 2. Global Shell & Navigation

**US-008** — As any staff member, I want a persistent left sidebar with grouped navigation (Sell, Buy, Operations, Relationships, Finance, Admin), so that I can reach any major workspace in one click.

**US-009** — As any staff member, I want the sidebar to collapse to an icon-only rail on desktop and remember my preference, so that I can maximize working space without losing navigation access.

**US-010** — As any staff member, I want the sidebar to open as a full-screen drawer on mobile and auto-close when I navigate, so that it doesn't block content on small screens.

**US-011** — As any staff member, I want "Sales Quick Actions" always pinned at the top of the sidebar (New Order, Active Orders, Sales Catalogue, Recent Customers, Today's Shipments), so that the most common actions are one click away.

**US-012** — As any staff member, I want breadcrumbs under the top bar on every page (except the dashboard), so that I always know where I am in the navigation hierarchy.

**US-013** — As any staff member, I want the active sidebar item to be visually highlighted with a left accent border, so that my current location is always obvious.

**US-014** — As any staff member, I want feature-flag-gated sidebar items to appear as skeleton rows while flag data loads, so that the nav doesn't shift unexpectedly when flags resolve.

**US-015** — As any staff member, I want the account dropdown in the top bar (My Account, Notifications, Command Palette, System Settings, theme toggle, density toggle, version, Sign Out), so that personal and system controls are always accessible.

**US-016** — As any staff member, I want to switch between light and dark mode from the account menu, so that I can use the UI comfortably in any lighting.

**US-017** — As any staff member, I want to toggle between compact and comfortable UI density from the account menu, so that I can optimize for screen real estate or readability.

**US-018** — As any staff member, I want to be shown a "new version available" banner with a one-click reload, so that I'm always running the latest build without a hard refresh.

**US-019** — As any staff member, I want a global error boundary on every route that resets when I navigate away, so that a crash in one component doesn't lock me out of the rest of the app.

---

## 3. Dashboard — Owner Command Center

**US-020** — As the Owner, I want a single-screen daily dashboard showing today's date, a live freshness timestamp, and four top KPI cards (Open Orders, Fulfilled Today, Outstanding Receivables, Cash Collected 7d), so that I can absorb the health of the business at a glance.

**US-021** — As the Owner, I want the Open Orders KPI card to show the count and total dollar value of all in-flight orders, so that I know how much revenue is in motion.

**US-022** — As the Owner, I want the Outstanding Receivables KPI card to show the AR balance and count of open invoices, so that I know what's owed to the business.

**US-023** — As the Owner, I want the Cash Collected (7d) card to show this week's collections vs. last week's, and display "N/A vs last week" when last week was $0, so that I can track collection momentum.

**US-024** — As the Owner, I want a Cash Position panel showing Cash on Hand, Scheduled Payables, and Available After Bills — with a conditional alert "You're short $X after scheduled bills" when the net is negative, so that I can make same-day cash decisions.

**US-025** — As the Owner, I want a Money In vs. Out panel showing what customers owe me vs. what I owe suppliers, with conditional "collect faster" messaging when I'm net-negative, so that I can prioritize AR collection.

**US-026** — As the Owner, I want an Appointments panel showing upcoming appointments for the next 7 days (with "No upcoming appointments" empty state), so that I can prepare for client interactions.

**US-027** — As the Owner, I want a Suppliers Waiting to Be Paid panel that lists sold-out batches with outstanding supplier balances, with "All suppliers are paid up" when the queue is clear, so that I pay suppliers promptly after turning their product.

**US-028** — As the Owner, I want a What's In Stock panel showing total units, categories, total value, and a Category/Price toggle for the breakdown table, so that I can see my inventory position at a glance.

**US-029** — As the Owner, I want an Inventory Aging panel with chips for Fresh (0-7d), Moderate (8-14d), Aging (15-30d), and Critical (30+d) batch counts, so that I know which inventory is at risk of becoming unsellable.

**US-030** — As the Owner, I want a Top 5 Oldest Items panel showing the five most aged batches with product name, SKU, and age in days, so that I can take immediate action on the most critical stock.

**US-031** — As the Owner, I want a SKU Status Browser widget (collapsed by default) showing total SKU count, so that I can drill into status-level inventory detail when needed.

**US-032** — As the Owner, I want each dashboard widget to independently handle loading, empty, and error states, so that one failing widget doesn't take down the entire dashboard.

**US-033** — As the Owner, I want every dashboard widget to link through to the relevant filtered workspace (e.g., clicking a KPI navigates to the appropriate surface), so that I can act on dashboard signals without re-navigating.

**US-034** — As the Owner, I want the "Today at a Glance" band to show a degraded "Unable to load daily snapshot" state when the backend call fails, so that I know there's a data problem rather than see stale numbers.

---

## 4. Sales Workspace — Orders

**US-035** — As a Sales Rep, I want the Orders tab to be the default view in the Sales workspace, so that I land on the most important queue without extra clicks.

**US-036** — As a Sales Rep, I want a spreadsheet-native orders queue showing Stage, Order #, Client, Created date, Lines, Total, and "Next" action per row, so that I can work the queue efficiently without opening individual records.

**US-037** — As a Sales Rep, I want the "Next" column to show contextual actions (e.g., "Review pricing" for drafts, "Confirm" for ready orders), so that I always know the next step for each order.

**US-038** — As a Sales Rep, I want to toggle between Spreadsheet View and Standard View, so that I can choose the interface that fits my workflow.

**US-039** — As a Sales Rep, I want to click an order row to expand linked line items and action context without leaving the queue, so that I can review and act without context-switching.

**US-040** — As a Sales Rep, I want a "New Order" button that opens an order creation drawer while preserving my place in the orders queue, so that I can create orders without losing my current context.

**US-041** — As a Sales Rep, I want keyboard shortcuts in the orders grid (Click to select, Shift+Click to extend, Ctrl+Click to multi-select, Ctrl+C to copy, Ctrl+A to select all), so that I can work the queue at spreadsheet speed.

**US-042** — As any Staff, I want to see all draft and confirmed orders in a single queue with a Stage column (Draft / Confirmed), so that the full team can monitor the sales pipeline.

---

## 5. Sales Workspace — Quotes

**US-043** — As a Sales Rep, I want a Quotes tab showing all quotes with columns for Quote #, Client, Created, Valid Until, Status, and Total, so that I can manage the entire quoting pipeline in one view.

**US-044** — As a Sales Rep, I want to create a new quote from the Quotes tab, so that I can capture client intent before committing to an order.

**US-045** — As a Sales Rep, I want to filter quotes by status (Unsent, Sent, Converted), so that I can focus on the quotes that need my attention.

**US-046** — As a Sales Rep, I want to convert an accepted quote into a confirmed sales order, so that the quoting-to-order handoff is seamless.

**US-047** — As a Sales Rep, I want quote status to progress through `QUOTE_DRAFT` (Unsent) → `QUOTE_SENT` (Sent) → `CONVERTED` (promoted to Sale) or `REJECTED`, so that I can track where each quote is in the client's decision process and hand it off to an order when the client accepts.

---

## 6. Sales Workspace — Pick List

**US-048** — As Fulfillment Staff, I want a Pick List tab in Sales showing all open orders with order number, client, line items (batch + qty + location), and status, so that I can prepare warehouse picks from any device.

**US-049** — As Fulfillment Staff, I want to filter the pick list by status (All, Pending, Partial, Fulfilled) and by date range, so that I can focus on today's shipments.

**US-050** — As Fulfillment Staff, I want to export the pick list to CSV, so that I can print or share it with warehouse staff who don't use the system.

**US-051** — As Fulfillment Staff, I want a notice when the list is truncated at 500 results, so that I know to apply filters rather than assume I'm seeing all orders.

---

## 7. Sales Workspace — Returns

**US-052** — As a Sales Rep, I want a Returns tab showing all RMAs with Return ID, Order ID, Reason, Processed By, Processed At, Notes, and GL Status, so that I can track the full return history.

**US-053** — As a Sales Rep, I want to initiate a return by selecting a source order and specific line items, specifying quantity returned and reason (Defective, Wrong Item, Not As Described, Customer Changed Mind, Other), so that the return is traceable to its origin order.

**US-054** — As a Sales Rep, I want the return state machine to progress through Draft → Received → Inspected → Restocked or Disposed → Closed, so that every return has a clear resolution path.

**US-055** — As an Accounting Manager, I want to view the GL reversal status for each return (ReturnGLStatus), so that I can confirm that accounting entries were correctly reversed.

**US-056** — As a Sales Rep, I want to see summary stats on the Returns tab (Total Returns, Defective count, reason breakdown), so that I can report return trends without building a report.

---

## 8. Sales Workspace — Sales Catalogues

**US-057** — As a Sales Rep, I want to build a sales catalogue by selecting a client and adding inventory items, so that I can present a curated, branded view of available product.

**US-058** — As a Sales Rep, I want to save catalogue drafts, so that I can build them iteratively without losing progress.

**US-059** — As a Sales Rep, I want to share a catalogue via a token-based public link that strips internal fields (vendor, batchSku, COGS, base price, markup, appliedRules), so that clients only see the information appropriate for them.

**US-060** — As a Sales Rep, I want to convert a catalogue directly into a Sales Order or Quote from the sales-sheets surface, so that I don't have to re-enter line items.

**US-061** — As a Sales Rep, I want to launch a live shopping session from a saved catalogue, so that I can sell from it in real time.

**US-062** — As a VIP Client, I want to view a shared catalogue via a public URL (no login required), so that I can browse available product without needing a system account.

---

## 9. Sales Workspace — Live Shopping (Staff)

**US-063** — As a Sales Rep, I want to create a live shopping session with a title, room code, notes, and expected clients, so that I can run a structured, real-time sales event.

**US-064** — As a Sales Rep, I want to see a list of all sessions with status badges (Active, Scheduled, etc.) and counts (Active, Scheduled, Total, Converted), so that I can manage my upcoming and past sessions.

**US-065** — As a Sales Rep, I want to start, pause, and end a live shopping session, so that I can control the session lifecycle.

**US-066** — As a Sales Rep, I want to see which clients are currently in the room and what items they've requested during a live session, so that I can respond in real time.

**US-067** — As a Sales Rep, I want to deep-link directly to a specific session by sessionId, so that I can share a direct link to an active session with my team.

---

## 10. Order Creation Flow

**US-068** — As a Sales Rep, I want multiple entry points to create a new order (sidebar quick action, orders queue CTA, Ctrl+N hotkey, "N" hotkey, command palette, client profile, matchmaking match, interest list, and a shared sales catalogue), so that I can start an order from wherever I'm working.

**US-069** — As a Sales Rep, I want to search for and select an existing client from a combobox, or quick-create a new client inline, so that I don't leave the order surface to add a new client.

**US-070** — As a Sales Rep, I want to see the client's commit context (linked need, sales-sheet cut) and a quick profile panel when I select a client, so that I have the right context for the order I'm building.

**US-071** — As a Sales Rep, I want to choose between SALE and QUOTE as the document type, so that the same surface handles both workflows.

**US-072** — As a Sales Rep, I want to add line items from an inventory browser, with each line auto-populating product name, base price, COGS mode, unit COGS, retail price, applied pricing rules, and markup, so that I don't have to manually look up pricing.

**US-073** — As a Sales Rep, I want to edit quantity, unit price, and margin per line, and flag overrides (below vendor range, COGS override, margin override) with required reasons, so that any deviation from standard pricing is documented.

**US-074** — As a Sales Rep, I want to mark specific line items as samples, so that sample transactions are tracked separately from revenue.

**US-075** — As a Sales Rep, I want to apply order-level adjustments (flat or % discount/fee) and control which adjustments appear on the client-facing document, so that I can negotiate flexibly while keeping documents clean.

**US-076** — As a Sales Rep, I want to see live order totals and a floating preview of the document as I build the order, so that I can catch errors before finalizing.

**US-077** — As a Sales Rep, I want the order to auto-save in draft (debounced) while I'm working, so that I never lose progress.

**US-078** — As a Sales Rep, I want to run a credit check before finalizing, with enforcement modes (Warning / Soft Block / Hard Block), so that I know immediately if the order exceeds the client's credit limit.

**US-079** — As a Sales Manager, I want to receive and approve credit override requests when an order exceeds a client's hard limit, so that I'm in control of credit exceptions.

**US-080** — As a Sales Rep, I want to finalize (confirm) the order via a single action (Send / Confirm / Create Invoice dropdown), which deducts inventory, triggers invoice creation, and fires notifications, so that the order handoff to fulfillment and finance is automatic.

**US-081** — As a Sales Rep, I want the order state machine to progress: DRAFT → CONFIRMED → PARTIAL → SHIPPED/FULFILLED → CLOSED, with VOID/CANCELLED as terminal states, so that I can track every order through its lifecycle.

**US-082** — As a Sales Rep, I want to void or cancel a confirmed order (with an audit trail), so that I can correct mistakes without deleting records.

**US-083** — As a Sales Rep, I want to duplicate an existing order, so that I can re-order for a repeat client quickly.

**US-084** — As a Sales Rep, I want to attach documents to an order and generate a receipt, so that paperwork is centralized with the transaction.

**US-085** — As a Sales Rep, I want keyboard shortcuts in the order surface (Ctrl+S to save, Ctrl+Enter to finalize, Ctrl+Z to undo in grid, Tab to navigate cells), so that I can work at keyboard speed.

**US-086** — As a Sales Rep, I want referral credits applied via a "Referred By" selector and referral credits panel, so that referral incentives are tracked at the order level.

---

## 11. Inventory Workspace — Inventory Browser

**US-087** — As an Inventory Manager, I want to see the full inventory in a spreadsheet-native grid showing SKU, product, supplier/lot, quantity, and price, with a stat strip (total batches, units, and dollar value), so that I know exactly what's in stock.

**US-088** — As an Inventory Manager, I want to filter the inventory view and save custom filter views, so that I can quickly switch between common views (e.g., "available now," by category).

**US-089** — As an Inventory Manager, I want to export the inventory to CSV, so that I can share it with people who don't use the system.

**US-090** — As an Inventory Manager, I want to deep-link directly to a specific batch (via `?batchId=`), so that I can share a link that highlights the exact item.

**US-091** — As an Inventory Manager, I want to adjust batch quantity from the inventory grid (with a shrinkage flag and reason), so that I can correct discrepancies without creating a full intake record.

**US-092** — As an Inventory Manager, I want the inventory to show separate sections for "Awaiting Intake" and "Live" batches, so that I can distinguish unprocessed stock from available inventory.

---

## 12. Inventory Workspace — Direct Intake

**US-093** — As an Inventory Manager, I want to create inventory batches without a Purchase Order using the Direct Intake surface (supplier, lot, batches, quantities, cost, locations, images), so that I can quickly receive product that arrives informally.

**US-094** — As an Inventory Manager, I want to add multiple rows in the intake grid and submit them individually or all at once, so that I can process bulk receipts efficiently.

**US-095** — As an Inventory Manager, I want the COGS mode and location to be pre-filled in the intake grid, with support for fill-down to apply values to multiple rows, so that I can intake large quantities without repetitive data entry.

**US-096** — As an Inventory Manager, I want to undo mistakes in the intake grid (Ctrl+Z), so that I can correct errors before submitting.

**US-097** — As an Inventory Manager, I want to toggle between the sheet-native pilot surface and the classic intake UI, so that I can fall back if the new surface has issues.

---

## 13. Inventory Workspace — Product Intake / Receiving

**US-098** — As an Inventory Manager, I want to see all Purchase Orders in CONFIRMED or RECEIVING status in the receiving tab, so that I know which POs are ready to be received.

**US-099** — As an Inventory Manager, I want to click a PO row to launch the receiving draft editor (deep-linked via `?draftId=`), so that I can complete a PO-linked receiving without manual data re-entry.

**US-100** — As an Inventory Manager, I want to record per-line received quantities, shortages, discrepancies, sample toggles, location routing, and notes inside the receiving draft, so that the intake is accurate and fully documented.

**US-101** — As an Inventory Manager, I want to submit the receiving draft to create intake receipt rows, update PO item quantities, and create inventory batches, so that the system reflects what was actually received.

**US-102** — As an Inventory Manager, I want the system to optionally email the supplier a verification link on receiving submission, so that the supplier can confirm or flag discrepancies on their side.

**US-103** — As an Inventory Manager, I want to view a history of past intake drafts and a gallery of attached images for each, so that I can audit any receiving event.

---

## 14. Inventory Workspace — Shipping / Fulfillment

**US-104** — As Fulfillment Staff, I want a shipping queue showing orders by status (Pending, Partial, Ready, Shipped) with item/bag counts per order, so that I can triage the fulfillment queue.

**US-105** — As Fulfillment Staff, I want to filter the shipping queue by status and sort order, so that I can prioritize ready-to-ship orders.

**US-106** — As Fulfillment Staff, I want to refresh the shipping queue, so that newly confirmed orders appear without a page reload.

**US-107** — As Fulfillment Staff, I want to toggle between the sheet-native fulfillment surface and the classic pick/pack UI, so that I can choose the interface that matches my workflow.

---

## 15. Inventory Workspace — Photography

**US-108** — As an Inventory Manager, I want a photography queue showing batches with Pending, In Progress, and Completed status, so that I know which products still need photos.

**US-109** — As an Inventory Manager, I want to open a shoot desk for a batch and upload multiple photos (with upload progress), so that product images are centralized in the system.

**US-110** — As an Inventory Manager, I want to mark a batch as "photography complete" after uploading, so that the photography workflow has a clear done state.

**US-111** — As an Inventory Manager, I want to select all "Ready to Review" batches at once for bulk action, so that I can process photography queues efficiently.

---

## 16. Inventory Workspace — Samples

**US-112** — As a Sales Rep, I want to request a sample by specifying client, product, quantity, and expected return date, so that sample tracking begins at the moment of allocation.

**US-113** — As an Inventory Manager, I want to see all samples in a list with columns for ID, Product, Client, Status, Requested Date, Due Date, Location, and Actions, so that I know exactly where every sample is.

**US-114** — As an Inventory Manager, I want to filter samples by lane (All, Samples Out, Samples Return) and by status (Requested, Out, Returned, Consumed, Lost), so that I can manage different stages of the sample lifecycle.

**US-115** — As an Inventory Manager, I want to see an "Expiring Samples" section highlighting samples past their expected return date, so that I can follow up before they become losses.

**US-116** — As an Inventory Manager, I want to update a sample's location, mark it returned, or record it as consumed or lost, so that the inventory reflects the sample's real disposition.

**US-117** — As an Inventory Manager, I want to ship a sample to a vendor using the VendorShipDialog, so that supplier-bound samples are tracked separately from client samples.

---

## 17. Warehouse Pick/Pack (Mobile)

**US-118** — As Fulfillment Staff, I want a mobile/tablet-optimized pick/pack page with touch targets ≥44px showing orders by status, so that I can fulfill orders on the warehouse floor without a desktop.

**US-119** — As Fulfillment Staff, I want to select an order and see its line items with batch and location, so that I know exactly where to go to pick each item.

**US-120** — As Fulfillment Staff, I want to scan a barcode or tap an item to mark it as picked, so that the picking process is accurate without manual data entry.

**US-121** — As Fulfillment Staff, I want to complete the pack workflow for an order (attaching a bag identifier and marking all items packed), so that the order transitions to Ready status automatically.

**US-122** — As Fulfillment Staff, I want to search and filter orders on the mobile pick/pack surface, so that I can quickly locate a specific order in a busy queue.

---

## 18. Shrinkage Report

**US-123** — As an Inventory Manager, I want a dedicated shrinkage report showing by-batch shrinkage and a reason breakdown, so that I can identify where inventory losses are occurring.

**US-124** — As an Inventory Manager, I want to export shrinkage data, so that I can analyze losses in a spreadsheet or share with ownership.

---

## 19. Purchase Orders / Procurement

**US-125** — As a Procurement Manager, I want to create a Purchase Order with supplier, expected delivery date, and line items (product, qty, price, category, subcategory), so that every procurement is formally documented.

**US-126** — As a Procurement Manager, I want to save a PO as a draft and edit it before confirming, so that I can build complex orders iteratively.

**US-127** — As a Procurement Manager, I want to confirm a PO (locking most fields and generating a PO number), so that the order is officially placed with the supplier.

**US-128** — As a Procurement Manager, I want to record a deposit or fee against a PO, so that advance payments are tracked against the purchase.

**US-129** — As a Procurement Manager, I want to attach documents to a PO (e.g., invoices, contracts), so that all PO paperwork is in one place.

**US-130** — As a Procurement Manager, I want to cancel a PO and archive it, so that cancelled orders are preserved for audit without cluttering the active queue.

**US-131** — As a Procurement Manager, I want to split a PO, so that I can receive partial deliveries as separate transactions.

**US-132** — As a Procurement Manager, I want to see the PO status progress: Draft → Confirmed → Sent → Receiving → Received, so that I know the exact state of every procurement.

**US-133** — As a Procurement Manager, I want an "Expected Today" quick-filter that shows POs with an expected delivery date ≤ end of day, so that I can prioritize what needs to be received today.

**US-134** — As a Procurement Manager, I want to filter POs by supplier using a left-rail supplier facet, so that I can focus on one supplier's orders.

**US-135** — As a Procurement Manager, I want to export the PO list to CSV, so that I can share the procurement pipeline with finance or ownership.

**US-136** — As a Procurement Manager, I want to initiate receiving from the PO row (which routes to the receiving surface with `draftId`), so that the PO-to-inventory handoff is one click.

**US-137** — As a Procurement Manager, I want to send harvest/intake reminder emails to suppliers via the system (`vendorReminders` router), so that suppliers are proactively notified of upcoming expected delivery dates without manual outreach.

---

## 20. Relationships — Clients Directory

**US-138** — As a Sales Rep, I want a clients directory showing Code Name, Relationship type, Status, Last Activity, contact handles, LTV, Debt, and Orders, so that I can assess clients at a glance.

**US-139** — As a Sales Rep, I want to search and filter the clients list, so that I can quickly find a specific client.

**US-140** — As a Sales Rep, I want to quick-add a new client from the directory, so that I can onboard a new buyer without navigating away from my current context.

**US-141** — As any Staff, I want to see aggregate stats on the clients list (Total, With Debt, LTV), so that customer base health is visible across the team.

---

## 21. Relationships — Suppliers Directory

**US-142** — As a Procurement Manager, I want a suppliers directory showing Name, Relationship type, Contact, Value, and Orders, so that I can review my supplier network.

**US-143** — As a Procurement Manager, I want dual-role clients (buyer + supplier) to appear in both the Clients and Suppliers tabs, so that I don't manage them in two separate records.

**US-144** — As a Procurement Manager, I want to add a new supplier from the directory, so that I can onboard a new source without a separate flow.

---

## 22. Client Profile — Overview

**US-145** — As a Sales Rep, I want to open a client's 360° profile showing KPIs (Net Position, Credit Limit, Open Work, Last Touch), core identity, roles, tags, signals, and VIP portal status, so that I have everything I need before a client interaction.

**US-146** — As a Sales Rep, I want relationship signals surfaced on the profile (e.g., "Overdue transactions," "Supplier details missing"), so that I can spot relationship health issues without digging.

**US-147** — As a Sales Rep, I want to see lifetime value, profit, average margin, and open quotes for a client, so that I can understand the commercial relationship at a glance.

**US-148** — As a Sales Rep, I want to edit a client's profile (name, contact, roles, tags, notes) from a dialog, so that the record stays accurate.

**US-149** — As a Sales Rep, I want to write freeform notes on the client profile, so that context and observations are preserved with the record.

**US-150** — As a Sales Rep, I want to add comments (with mention support) on the client profile, so that team members can collaborate on client notes.

---

## 23. Client Profile — Sales & Pricing

**US-151** — As a Sales Manager, I want to configure per-client pricing (pricing profile and rule overrides) from the client profile, so that custom pricing agreements are enforced automatically on orders.

**US-152** — As a Sales Rep, I want to see a client's active needs from the profile's Sales & Pricing tab, so that I can quickly turn a need into an order.

**US-153** — As an Admin, I want to configure VIP portal settings and live catalog config from the client profile's Sales & Pricing tab, so that portal access is managed in context.

---

## 24. Client Profile — Money

**US-154** — As a Sales Manager, I want to see a client's credit status, consignment range, and ledger timeline from the Money tab, so that I can assess credit risk before taking an order.

**US-155** — As a Sales Rep, I want to see all invoices, orders, and payments for a client from the Money tab, so that I have a full financial history in one view.

**US-156** — As a Sales Rep, I want to use one-click payment follow-up templates (auto-generated SMS/email subject and notes) from the Money tab, so that collections outreach is fast and consistent.

**US-157** — As a Sales Manager, I want to see the client's credit capacity and adjust it from the Money tab, so that credit limits reflect current relationship status.

---

## 25. Client Profile — Supply & Inventory

**US-158** — As a Procurement Manager, I want to see a supplier client's profile section with supplier-specific data (contact, license, payment terms), batch/lot history, and active supply entries, so that I have the supplier's full picture in one place.

**US-159** — As a Procurement Manager, I want to see the supplier's recent Purchase Orders from the Supply & Inventory tab, so that I can track order history without leaving the profile.

---

## 26. Client Profile — Activity

**US-160** — As a Sales Rep, I want to log a communication (call, SMS, email, meeting, note) with subject and body from the client profile's Activity tab, so that every client interaction is recorded.

**US-161** — As a Sales Rep, I want to see a full communication timeline on the client profile, so that I know exactly what's been said and when.

**US-162** — As a Sales Rep, I want to book a meeting/appointment with a client from the Activity tab, so that the booking is logged in context.

---

## 27. Client Ledger

**US-163** — As an Accounting Manager, I want a dedicated client ledger view showing all invoices for a client (or all clients) with status filters (All, Draft, Sent, Viewed, Partial, Paid, Overdue, Void), so that I can manage AR in a filtered, focused view.

**US-164** — As an Accounting Manager, I want to create an invoice, mark it sent, record a payment, void it, download a PDF, or print from the ledger surface, so that all invoice actions are available without navigating away.

---

## 28. VIP Portal Config (Admin)

**US-165** — As an Admin, I want to configure which VIP portal modules are enabled per client (dashboard, live catalog, live shopping, AR, AP, transaction history, VIP tier, credit center, marketplace needs/supply), so that each client sees only the features relevant to them.

**US-166** — As an Admin, I want granular toggles within each VIP portal module (e.g., `ar.showSummaryTotals`, `dashboard.showGreeting`), so that I can fine-tune the portal experience per client.

**US-167** — As an Admin, I want to preview a client's VIP portal from the config page, so that I can verify the experience before sharing portal access.

---

## 29. Demand & Supply — Matchmaking

**US-168** — As a Sales Rep, I want a matchmaking hub showing client needs, supplier supply, and algorithm-suggested matches with score badges side-by-side, so that I can identify and act on supply-demand opportunities.

**US-169** — As a Sales Rep, I want to filter matches by strain, category, grade, and price, so that I can narrow down to the most relevant opportunities.

**US-170** — As a Sales Rep, I want to convert a suggested match directly into a draft order, so that I can close a supply-demand gap without re-entering data.

**US-171** — As a Sales Rep, I want to override or dismiss a suggested match, so that I can keep the matchmaking queue clean and accurate.

**US-172** — As a Sales Rep, I want to trigger a match computation/update, so that the suggested matches reflect the latest needs and supply data.

---

## 30. Demand & Supply — Client Needs

**US-173** — As a Sales Rep, I want to create a client need with status, priority (Urgent/High/Medium/Low), strain, category/subcategory, grade, qty range, client, and notes, so that sourcing requirements are formally tracked.

**US-174** — As a Sales Rep, I want to filter needs by status, priority, strain, grade, and category, so that I can focus on the most urgent sourcing gaps.

**US-175** — As a Sales Rep, I want to fulfill or cancel a need, so that the needs queue stays current and reflects actual sourcing outcomes.

**US-176** — As a Sales Rep, I want to attach a need to a match, so that the sourcing pipeline from need → match → order is tracked end-to-end.

**US-177** — As a Sales Rep, I want to see "Smart Opportunities" sub-tab alongside all needs, so that I can discover cross-sell opportunities the system has identified.

---

## 31. Demand & Supply — Interest List

**US-178** — As a Sales Rep, I want to see all client interest entries (products clients have expressed interest in but not yet bought) in a filterable, sortable table, so that I can prioritize follow-up outreach.

**US-179** — As a Sales Rep, I want to multi-select interest entries and export them to CSV, so that I can share an interest report with management.

**US-180** — As a Sales Rep, I want to convert an interest entry directly into an order, so that I can act on expressed demand immediately.

**US-181** — As a Sales Rep, I want to remove stale interest entries, so that the list reflects current demand signals.

**US-182** — As a Sales Rep, I want to see top-product and trending-category stats on the interest list, so that I can understand demand patterns.

---

## 32. Demand & Supply — Vendor Supply

**US-183** — As a Procurement Manager, I want to create a supplier supply announcement with vendor, strain, product name, category/subcategory, grade, quantity available, unit price, available-until, and notes, so that supplier availability is formally tracked.

**US-184** — As a Procurement Manager, I want to edit and delete supply entries, so that the supply list stays current.

**US-185** — As a Procurement Manager, I want to assign a supply entry to a matching client need, so that the demand-supply pipeline is closed in the system.

---

## 33. Accounting — Dashboard

**US-186** — As an Accounting Manager, I want the accounting dashboard to surface overdue AR/AP alerts, a reconciliation summary, GL reversal viewer, and KPI data cards, so that I have a financial control center without running reports.

**US-187** — As an Accounting Manager, I want an alert banner when the overdue invoice count exceeds the threshold (25), directing me to the overdue queue, so that I never miss a collection crisis.

**US-188** — As an Accounting Manager, I want AR and AP aging tables (Current, 30d, 60d, 90d, 90+d) with dollar amounts and counts per bucket, so that I can prioritize collection and payment by age.

**US-189** — As an Accounting Manager, I want Top Debtor cards showing the clients with the highest outstanding balances by aging bucket, so that I can direct collection efforts to the highest-impact accounts.

**US-190** — As an Accounting Manager, I want a reconciliation summary showing outstanding invoices, unrecorded payments (AR and AP), and last reconciliation date, so that I know the accuracy of our books at any moment.

**US-191** — As an Accounting Manager, I want a "Pay Supplier" quick action on the accounting dashboard, so that I can process vendor payments without navigating to the Bills tab.

---

## 34. Accounting — Invoices

**US-192** — As an Accounting Manager, I want a spreadsheet-native invoices surface showing Invoice #, Client, Invoice Date, Due Date, Total, Amount Due, Paid %, and Status for all 520+ invoices, so that I can manage the full AR queue in one view.

**US-193** — As an Accounting Manager, I want to filter invoices by status (All, Draft, Sent, Viewed, Partial, Paid, Overdue, Void), so that I can work specific segments of the AR queue.

**US-194** — As an Accounting Manager, I want to create an invoice, mark it sent, record a payment, void it, download a PDF, and print — all from the invoices surface, so that AR management doesn't require navigation.

**US-195** — As an Accounting Manager, I want to record a payment against one or more invoices from the invoice row, so that AR is updated immediately when cash is received.

**US-196** — As an Accounting Manager, I want to open a dispute on an invoice (invoiceDisputes), so that contested receivables are formally flagged and tracked.

**US-197** — As an Accounting Manager, I want to write off bad debt on an invoice (permission-gated), so that uncollectable receivables are properly expensed.

**US-198** — As an Accounting Manager, I want to perform a GL reversal on an invoice (admin-permissioned), so that incorrectly posted accounting entries can be corrected.

**US-199** — As an Accounting Manager, I want to deep-link to a specific payment record on the Payments surface via `?invoiceId=`, `?orderId=`, or `?paymentId=`, so that links from invoices and orders open the correct payment record directly.

---

## 35. Accounting — Bills

**US-200** — As an Accounting Manager, I want a bills queue showing Bill #, Vendor, Date, Due, Total, Due Amount, and Status, so that I can manage all AP in one surface.

**US-201** — As an Accounting Manager, I want to create a bill (vendor, line items, amount, due date), so that supplier invoices are formally entered.

**US-202** — As an Accounting Manager, I want the bill state machine to progress: Draft → Pending → Approved → Partial → Paid, with Overdue and Voided as additional statuses, so that every bill has a clear approval and payment path.

**US-203** — As an Accounting Manager, I want a status timeline (BillStatusTimeline) on the bill detail sheet, so that I can audit every state change.

**US-204** — As an Accounting Manager, I want to filter bills by status (All, Draft, Pending, Approved, Partial, Paid, Overdue, Void), so that I can work specific AP segments.

**US-205** — As an Accounting Manager, I want to pay a vendor directly from the bill surface (PayVendorModal), so that AP payments are recorded in context.

**US-206** — As an Accounting Manager, I want aging badges on overdue bills, so that the oldest payables are visually prioritized.

---

## 36. Accounting — Payments

**US-207** — As an Accounting Manager, I want a payments registry showing Payment #, Date, Type (Received/Sent), Method, Amount, Invoice, and Reference for all recorded payments, so that I have a complete transaction ledger.

**US-208** — As an Accounting Manager, I want to record a payment by selecting invoice(s), payment method, bank account, amount, date, and reference number, so that cash receipts are immediately reflected in AR.

**US-209** — As an Accounting Manager, I want to support installment payments, so that orders paid in tranches are accurately tracked.

**US-210** — As an Accounting Manager, I want to support crypto payments, so that non-traditional settlement methods are recorded in the system.

**US-211** — As a Sales Manager, I want to configure payment terms per client or per order (Consignment, Cash, COD) via `paymentTerms.*`, so that the system enforces the agreed settlement structure at the point of order creation.

**US-212** — As an Accounting Manager, I want to record transaction fees alongside a payment, so that all cost-of-collection is captured.

**US-213** — As an Accounting Manager, I want to filter payments by type (Received/Sent), so that I can separately review AR and AP cash flows.

**US-214** — As an Accounting Manager, I want to void a payment, so that incorrect entries can be reversed.

---

## 37. Accounting — General Ledger

**US-215** — As an Accounting Manager, I want to browse all ledger entries with filters for account, fiscal period, and date range, so that I can audit the complete accounting record.

**US-216** — As an Accounting Manager, I want to create manual journal entries (with debit/credit line items), so that I can post adjustments not generated by system workflows.

**US-217** — As an Accounting Manager, I want to reverse a ledger entry (permission-gated), so that incorrect postings can be corrected with a proper reversing entry.

**US-218** — As an Accounting Manager, I want to export the general ledger, so that I can share it with external accountants.

---

## 38. Accounting — Chart of Accounts

**US-219** — As an Accounting Manager, I want to see all accounts in a hierarchical table with account number, name, type (Asset/Liability/Equity/Revenue/Expense), normal balance, and active status, so that the chart of accounts is always visible.

**US-220** — As an Accounting Manager, I want to create, edit, and delete accounts (when allowed), so that the chart stays current with business structure.

**US-221** — As an Accounting Manager, I want to activate and deactivate accounts, so that old accounts are hidden from dropdowns without being deleted.

---

## 39. Accounting — Expenses

**US-222** — As an Accounting Manager, I want to create an expense with category, amount, date, and reimbursable flag, so that operational costs are tracked alongside revenue.

**US-223** — As an Accounting Manager, I want to manage expense categories (CRUD), so that expenses are consistently classified.

**US-224** — As an Accounting Manager, I want to mark an expense as reimbursed, so that outstanding reimbursements are tracked.

**US-225** — As an Accounting Manager, I want to filter expenses by category and by "reimbursable only," so that I can generate reimbursement reports.

---

## 40. Accounting — Bank Accounts

**US-226** — As an Accounting Manager, I want to create and manage bank accounts (name, account number, bank, type, balance), so that all financial accounts are tracked in the system.

**US-227** — As an Accounting Manager, I want to see total cash balance across all bank accounts, so that I have an instant cash position.

**US-228** — As an Accounting Manager, I want to filter accounts by type (Checking, Savings, Credit Card, Money Market), so that I can review specific account categories.

**US-229** — As an Accounting Manager, I want to deactivate a bank account, so that closed accounts are retained for history without cluttering active dropdowns.

---

## 41. Accounting — Bank Transactions

**US-230** — As an Accounting Manager, I want to view all bank transactions (date, type, description, reference, amount, reconciled flag), so that I can match transactions to GL entries.

**US-231** — As an Accounting Manager, I want to create a bank transaction manually, so that I can record transfers or adjustments not generated by the system.

**US-232** — As an Accounting Manager, I want to mark a bank transaction as reconciled, so that I can track reconciliation status line by line.

**US-233** — As an Accounting Manager, I want to filter transactions by type (Deposit, Withdrawal, Transfer, Fee) and reconciliation status, so that I can focus on unreconciled items.

**US-234** — As an Accounting Manager, I want to export bank transactions to CSV, so that I can perform bank reconciliation in a spreadsheet.

---

## 42. Accounting — Fiscal Periods

**US-235** — As an Accounting Manager, I want to create a fiscal period with a start and end date, so that the accounting year is formally structured.

**US-236** — As an Accounting Manager, I want to open and close fiscal periods, so that I can control which periods accept new journal entries.

**US-237** — As an Accounting Manager, I want to lock a fiscal period, so that closed books can't be accidentally modified.

**US-238** — As an Accounting Manager, I want a warning when I try to close a period with existing journal entries, so that I don't accidentally lock incomplete periods.

---

## 43. Cash Locations

**US-239** — As an Accounting Manager, I want to create and manage physical cash register locations, so that cash is tracked by location rather than pooled.

**US-240** — As an Accounting Manager, I want to record deposits and withdrawals at each cash location, so that per-location cash balances are accurate.

**US-241** — As an Accounting Manager, I want to transfer cash between locations, so that inter-location movements are tracked.

**US-242** — As an Accounting Manager, I want to open and close shifts at each cash location, so that daily cash reconciliation is structured around shifts.

**US-243** — As an Accounting Manager, I want shift audit reports with variance detection, so that cash discrepancies are flagged immediately.

**US-244** — As an Accounting Manager, I want an alert for negative cash balance or missing shift audits, so that cash anomalies surface before they become problems.

**US-245** — As an Accounting Manager, I want to download an audit log for any location or shift, so that cash handling is fully auditable.

---

## 44. Client Credits

**US-246** — As a Sales Manager, I want a credits dashboard showing credit capacity, exposure, and utilization per client, so that I can manage credit risk across the portfolio.

**US-247** — As a Sales Manager, I want to create credit adjustments (increase/decrease a client's credit limit), so that limits reflect current relationship and risk.

**US-248** — As a Sales Manager, I want to review and approve credit override requests submitted when an order exceeds a client's limit, so that I control credit exceptions.

**US-249** — As an Accounting Manager, I want to apply a credit balance to an invoice, so that client credits reduce outstanding AR directly.

**US-250** — As an Accounting Manager, I want to write off bad debt (permission-gated) and restore it if a client later pays, so that uncollectable receivables are properly handled.

**US-251** — As the Owner or Admin, I want credit visibility gated (`creditVisibilitySettings`) so that only authorized users see credit fields in order creation and client profiles, so that sensitive margin and credit data is protected from front-line staff.

---

## 45. Pricing Rules

**US-252** — As a Sales Manager, I want to create pricing rules with scope (global, by category, by client, by profile) and markup/markdown configuration, so that pricing is systematically enforced.

**US-253** — As a Sales Manager, I want to activate and deactivate individual pricing rules, so that I can run time-limited promotions without deleting rules.

**US-254** — As a Sales Manager, I want to search the pricing rules table, so that I can quickly find the rule I need to edit.

**US-255** — As a Sales Manager, I want to edit and delete pricing rules, so that outdated or incorrect rules are corrected.

---

## 46. Pricing Profiles

**US-256** — As a Sales Manager, I want to create named pricing profiles that bundle multiple rules with priority ordering, so that I can assign a complete pricing package to a client.

**US-257** — As a Sales Manager, I want to assign a pricing profile to a client from the client profile's Sales & Pricing tab, so that client-specific pricing is enforced automatically on all orders.

**US-258** — As a Sales Manager, I want to edit a pricing profile (add/remove rules, change priority), so that profiles evolve with business relationships.

---

## 47. COGS Settings

**US-259** — As the Owner, I want to configure the global COGS calculation mode on the COGS Settings page (`/settings/cogs` → Global Settings tab) — choosing between Fixed cost or Range-based (LOW/MID/HIGH basis) — so that cost accounting is consistently applied across all transactions.

**US-260** — As the Owner, I want to set per-client COGS overrides on the COGS Settings Client Adjustments tab, so that individually negotiated cost structures are enforced for specific clients without altering global defaults.

**US-261** — As the Owner, I want to configure who sees COGS and margin information (COGS Display Mode — e.g. Admin Only) in Organization Settings, so that sensitive cost data is restricted to authorized finance users.

---

## 48. Analytics

**US-262** — As the Owner, I want an analytics dashboard with KPI tiles (Total Revenue, Period Revenue, Avg Order Value, Outstanding Balance, Total Orders, Active Clients, Batches, Payments Received), so that I can benchmark the business at any time granularity.

**US-263** — As the Owner, I want to select a time period (day/week/month/quarter/year/all) for analytics, so that I can compare performance across any time horizon.

**US-264** — As the Owner, I want revenue trends data (period, revenue, orders, avg order) with granularity appropriate to the selected period, so that I can spot seasonality and growth trends.

**US-265** — As the Owner, I want a Top Clients table showing revenue leaders, so that I can recognize and protect key relationships.

**US-266** — As the Owner, I want to export analytics data as CSV or JSON (summary, revenue, clients, inventory), so that I can do deeper analysis in external tools.

---

## 49. Leaderboard

**US-267** — As a Sales Manager, I want a client leaderboard sorted by master score or YTD revenue, so that I can gamify client engagement and track performance trends.

**US-268** — As a Sales Manager, I want to filter the leaderboard by client type (All/Customer/Supplier/Dual) and metric category (Master/Financial/Engagement/Reliability/Growth), so that I can view rankings that are relevant to specific business questions.

**US-269** — As a Sales Manager, I want to customize the weights that drive the master score, so that the ranking formula reflects my business priorities.

**US-270** — As a Sales Manager, I want to export the leaderboard, so that I can share rankings with clients or management.

**US-271** — As a Sales Manager, I want to click a client row in the leaderboard to go to their full profile, so that I can act on ranking insights immediately.

---

## 50. Calendar

**US-272** — As any Staff, I want a calendar with Month, Week, Day, and Agenda views, so that I can review the schedule at any level of detail.

**US-273** — As any Staff, I want to create, edit, and delete calendar events with recurrence rules, participants, and reminders, so that scheduling is managed in the ERP without a separate tool.

**US-274** — As any Staff, I want to filter the calendar by calendar, owner, and category (Invitations, Requests, Time Off, Intake Appointments, Order Deliveries, Payment Due), so that I see only the events relevant to my role.

**US-275** — As a Sales Manager, I want to see client appointment requests in the Calendar (Requests tab) and approve or reject them, so that appointment scheduling is managed without email.

**US-276** — As a Manager, I want to view and manage team time-off requests from the Time Off tab, so that scheduling conflicts are visible before they happen.

**US-276a** — As any Staff, I want a Calendar Invitations tab showing pending event invitations for me (`PendingInvitationsWidget`), so that I can accept or decline event invitations without leaving the calendar.

**US-277** — As any Staff, I want pending appointment request counts and time-off request counts to appear on the Requests and Time Off tab labels respectively, so that action items are visible without clicking each tab.

---

## 51. Scheduling

**US-278** — As an Operations Manager, I want a scheduling surface with Calendar, Shifts, and Deliveries tabs (plus week/month/day calendar views), so that physical resource allocation is centrally managed.

**US-279** — As an Operations Manager, I want to create and manage room bookings (admin can also manage room definitions), so that meeting rooms and lab spaces are reserved without double-booking.

**US-280** — As an Operations Manager, I want to see a shift schedule and delivery schedule widget, so that staffing and delivery timing are visible in one place.

---

## 52. Time Clock

**US-281** — As any Staff, I want to clock in and clock out, so that my working hours are recorded in the ERP.

**US-282** — As any Staff, I want to start and end breaks during my shift, so that break time is accurately excluded from working hours.

**US-283** — As any Staff, I want to view a weekly timesheet grouped by day, week, or employee, so that I can verify my hours before a pay period closes.

**US-284** — As a Manager, I want to see timesheet reports for all employees, so that payroll is calculated from accurate time data.

**US-285** — As any Staff, I want a live clock status badge showing whether I'm clocked in, out, or on break, so that I always know my current time-clock state.

---

## 53. Notifications Hub

**US-286** — As any Staff, I want a notifications bell in the top bar with an unread count badge, so that I know when something needs my attention without navigating away.

**US-287** — As any Staff, I want to open a notification tray from the bell and see the latest notifications in reverse-chronological order, with "Mark read" per item and "Mark all read" in bulk, so that I can clear my notification queue quickly.

**US-288** — As any Staff, I want to click a notification to navigate to the relevant resource (normalized link), so that notifications are actionable, not just informational.

**US-289** — As any Staff, I want a full notifications hub with tabs for System Notifications, Alerts, and Todo Lists, so that I can review all types of notifications in one place.

**US-290** — As any Staff, I want alerts for low-stock, needs-matching, and workflow events in the Alerts tab, so that business exceptions surface without requiring me to check multiple surfaces.

**US-291** — As any Staff, I want the Notifications Hub Alerts tab to surface low-stock, needs-matching, and workflow alerts (distinct from system notifications), so that business exceptions surface without checking multiple surfaces. *(Notification preference toggles live in My Account — see US-337.)*

---

## 54. Todo Lists & Tasks

**US-292** — As any Staff, I want to create a named todo list and add tasks with title, list, priority, due date, and assignee, so that personal and team work items are tracked in the ERP.

**US-293** — As any Staff, I want to create a task quickly from anywhere using Ctrl+Shift+T (quick-add task modal), so that I can capture action items without interrupting my current workflow.

**US-294** — As any Staff, I want to see a grid of my todo lists on the Notifications/Todos tab, so that I have a dashboard of all my task lists.

**US-295** — As any Staff, I want to complete, uncomplete, edit, and delete tasks within a list, so that I can manage my work-in-progress items.

**US-296** — As any Staff, I want todo list stats (completed, overdue, in-progress count badges), so that I can see progress without expanding every task.

**US-297** — As any Staff, I want to delete a todo list with a confirmation dialog, so that I can clean up completed projects without accidental deletion.

---

## 55. Global Search

**US-298** — As any Staff, I want to submit a search query and see results grouped by Quotes, Orders, Customers, and Products & Batches, so that I can find anything in the system with one search.

**US-299** — As any Staff, I want to open the command palette (Ctrl+K) and type to search all system entities with a 30ms debounce, so that I can navigate and find records without using the mouse.

**US-300** — As any Staff, I want to click a search result row to navigate directly to the relevant surface, so that search results are actionable in one click.

**US-301** — As any Staff, I want an empty state with operational guidance when no results match my search, so that I'm directed to the right place rather than just seeing a blank page.

---

## 56. Workflow Queue

**US-302** — As an Inventory Manager, I want a kanban board view of the workflow queue showing batches by custom status, so that I can visualize the flow of product through operations.

**US-303** — As an Inventory Manager, I want to add batches to workflow statuses by searching and selecting, with priority assignment, so that I can manage operational priorities.

**US-304** — As an Inventory Manager, I want to drag and drop batches between workflow columns, so that I can update status quickly.

**US-305** — As an Operations Manager, I want to create, rename, reorder, color-code, and delete workflow statuses, so that the kanban reflects our actual operational flow.

**US-306** — As an Operations Manager, I want to set a "completed" flag on a workflow status, so that done states are differentiated from in-progress states.

**US-307** — As an Operations Manager, I want a workflow history view showing all batch status changes, so that I can audit how product has moved through operations.

**US-308** — As an Operations Manager, I want workflow analytics showing throughput and bottleneck metrics, so that I can identify and address process constraints.

---

## 57. Products / Strain Catalog

**US-309** — As an Inventory Manager, I want to search and browse all strains and products in the catalog, so that I can look up any product without leaving the system.

**US-310** — As an Inventory Manager, I want to create a new strain with name, category (Indica/Sativa/Hybrid), and description, so that new genetics are registered in the catalog before intake.

**US-311** — As an Inventory Manager, I want to edit and delete strain records, so that the catalog stays accurate as products evolve.

**US-312** — As an Inventory Manager, I want strain categories displayed with color badges in the catalog list, so that product types are visually distinguishable.

---

## 58. Settings — Access Control (Users & RBAC)

**US-313** — As an Admin, I want to create new users with username (min 3 chars), password (min 8 chars), and display name, so that new employees have system access on day one.

**US-314** — As an Admin, I want to reset any user's password, so that I can handle locked-out employees without database access.

**US-315** — As an Admin, I want to see all users with their roles, email, and last login date, so that I can audit active system access.

**US-316** — As an Admin, I want to assign and remove roles from users, so that permissions are managed through roles rather than individual grants.

**US-317** — As an Admin, I want to create and manage roles with named permission bundles, so that I can define standardized access patterns for different job functions.

**US-318** — As an Admin, I want to assign, remove, and bulk-replace permissions on roles, so that permission sets can be updated in bulk.

**US-319** — As an Admin, I want to list all available permissions organized by module, so that I can understand what can be granted.

**US-320** — As an Admin, I want to disable and re-enable user accounts, so that I can revoke access without deleting records.

---

## 59. Settings — Master Data

**US-321** — As an Admin, I want to manage locations (warehouses, rooms) from Settings, so that inventory and scheduling have accurate location references.

**US-322** — As an Admin, I want to manage product categories and subcategories, so that the product catalog is consistently organized.

**US-323** — As an Admin, I want to manage product tags (including tag hierarchies and tag groups via `advancedTagFeatures`), so that products can be classified with flexible, multi-level attributes.

**US-323a** — As an Admin, I want to manage product grades in Settings → Master Data (`productGrades` router), and control grade field visibility and requirement in Organization Settings, so that quality tiers are consistently applied across intake, inventory, and orders.

**US-324** — As an Admin, I want to manage tag hierarchies and tag groups, so that the tagging system reflects complex product classification schemes.

---

## 60. Settings — Organization

**US-325** — As an Admin, I want to configure organization-wide settings (grade field visibility and requirement, PO expected delivery display, packaged unit type, COGS display mode), so that the system's behavior matches organizational policies.

**US-326** — As any Staff, I want to set personal display preferences (Default Warehouse, Show COGS in Orders, Show Margin in Orders, Show Grade Field, Hide Expected Delivery), so that the UI reflects my workflow needs.

**US-327** — As an Admin, I want to define custom unit types (code, name, category, description) beyond the built-in set (EA, G, OZ, LB, KG, ML), so that the system handles non-standard product measurements.

**US-328** — As an Admin, I want to manage calendar definitions (calendars configuration), so that the scheduling system has the right calendars for each team.

**US-329** — As an Admin, I want to configure custom finance statuses, so that accounting workflows reflect our business terminology.

---

## 61. Settings — Developer / Feature Flags

**US-330** — As an Admin, I want to see all feature flags with their current state (enabled/disabled) in a table, so that I know which pilot features are active.

**US-331** — As an Admin, I want to toggle a feature flag system-wide, so that I can enable or disable pilot surfaces for all users at once.

**US-332** — As an Admin, I want to add role overrides and user overrides on individual flags, so that I can run A/B tests or give specific users early access.

**US-333** — As an Admin, I want to view the audit history for each feature flag, so that I can trace when and why a flag was changed.

**US-334** — As an Admin, I want to manage VIP impersonation from the Developer tab (VIPImpersonationManager), so that admin sessions are initiated from a controlled, audited surface.

---

## 62. User Account (My Account)

**US-335** — As any Staff, I want to update my profile name and email, so that my identity in the system is current.

**US-336** — As any Staff, I want to change my password (requires current password; new password min 8 chars on account change), so that I can rotate credentials on my own schedule.

**US-337** — As any Staff, I want to set my notification preferences (in-app, email, appointment reminders, order updates, system alerts), so that I receive only the alerts I care about.

**US-338** — As any Staff, I want to see the last-updated timestamp on my notification preferences, so that I know when they were last configured.

---

## 63. VIP Portal — Client Login & Session

**US-339** — As a VIP Client, I want to log in to the VIP portal with my email and password, so that I can access my account securely.

**US-340** — As a VIP Client, I want a friendly "forgot password" message directing me to contact support, so that I know how to recover access.

**US-341** — As a VIP Client, I want my session persisted locally so that I don't have to re-login on every visit, so that the portal is convenient for regular use.

**US-342** — As a VIP Client, I want to log out and have my local session cleared, so that my account is protected on shared devices.

**US-343** — As a VIP Client, I want a friendly "session ended" page when my impersonation session is closed by an admin, so that the experience is clear and not confusing.

---

## 64. VIP Portal — Dashboard Modules

**US-344** — As a VIP Client, I want a VIP dashboard showing my current balance, YTD spend, and quick links (when enabled), so that I have a financial summary of my relationship with the supplier.

**US-345** — As a VIP Client, I want to browse a live catalog of available inventory pre-filtered to my account (when enabled), so that I can see what's available to order.

**US-346** — As a VIP Client, I want to see my AR invoices and what I owe (when AR module is enabled), so that I can track my outstanding bills.

**US-347** — As a VIP Client, I want to see my AP balance (what the supplier owes me, when AP module is enabled), so that I can track credits due.

**US-348** — As a VIP Client, I want to see my full transaction history (when enabled), so that I have a complete record of our business relationship.

**US-349** — As a VIP Client, I want to see my VIP tier badge, so that I understand my status in the loyalty/tier program.

**US-350** — As a VIP Client, I want to see a leaderboard (when enabled), so that I can see how I rank among other clients.

**US-351** — As a VIP Client, I want VIP-specific notifications via a VIP notification bell, so that I'm alerted to important events in my portal.

---

## 65. VIP Portal — Live Shopping (Client)

**US-352** — As a VIP Client, I want to enter a room code to join an active live shopping session, so that I can participate in a real-time buying event.

**US-353** — As a VIP Client, I want to browse items, request products, and see my confirmed selections during a live shopping session (three-status workflow: browsing → requesting → confirmed), so that I can shop interactively with the supplier.

**US-354** — As a VIP Client, I want the system to auto-detect if there's an active session I can join, so that I don't need a room code if a session is already running for my account.

---

## 66. VIP Portal — Appointments (Client)

**US-355** — As a VIP Client, I want to choose a calendar and appointment type, pick a date in the next 14 days, select a time slot, add notes, and submit an appointment request, so that I can book a meeting with my account rep without using email.

**US-356** — As a VIP Client, I want a confirmation screen showing my request ID, date, and time after submitting, so that I know the request was received.

---

## 67. VIP Portal — Document Downloads

**US-357** — As a VIP Client, I want to select an invoice and download its PDF, so that I have a formatted invoice for my own records.

**US-358** — As a VIP Client, I want to select a bill and download its PDF, so that I have a formatted bill for payment processing.

---

## 68. VIP Portal — Marketplace (Client)

**US-359** — As a VIP Client, I want to submit a marketplace need (strain, category, grade, qty range, notes), so that my sourcing requirements are formally communicated to the supplier.

**US-360** — As a VIP Client, I want to view my submitted needs and their status, so that I can track whether my requests are being filled.

**US-361** — As a VIP Client, I want to offer supply (product, strain, qty, price, available-until) to the marketplace, so that I can sell through the supplier's network.

**US-362** — As a VIP Client, I want to view referral credits I've earned and their application status, so that I can track incentives from referred business.

---

## 69. Admin Impersonation of VIP Client

**US-363** — As an Admin, I want to initiate a VIP portal impersonation session for any client from Settings → Developer → VIP Access, which generates a one-time token and opens the portal in a new tab, so that I can troubleshoot a client's portal experience.

**US-364** — As an Admin, I want the impersonation session to display a persistent amber "Impersonation mode active — all actions are logged" banner in the VIP portal, so that any action taken during impersonation is clearly attributed to an admin override.

**US-365** — As an Admin, I want the impersonation session to be stored in sessionStorage (tab-specific), so that it ends automatically when the tab is closed.

**US-366** — As an Auditor, I want to view the VIP impersonation audit log (`vipPortalAdmin.audit`), so that I can review a complete record of when and by whom admin access to a client's portal was used.

---

## 70. Farmer / Supplier Intake Verification

**US-367** — As a Supplier/Farmer, I want to receive a verification link by email after an intake receipt is submitted, so that I'm notified that my product has been logged in the system.

**US-368** — As a Supplier/Farmer, I want to view the intake receipt items and quantities at the verification URL (no login required), so that I can confirm what was received without a system account.

**US-369** — As a Supplier/Farmer, I want to confirm all items or flag discrepancies per item with notes, and then sign and confirm the receipt, so that any receiving errors are formally documented.

**US-370** — As an Inventory Manager, I want discrepancies submitted by the farmer to be recorded in `intakeDiscrepancies`, so that I can investigate and resolve them.

---

## 71. Global UI Features

**US-371** — As any Staff, I want a command palette (Ctrl+K) with pinned actions, recently visited pages, full navigation, and contextual actions, so that I can navigate the entire system without a mouse.

**US-372** — As any Staff, I want the command palette to support live search (≥1 character, 30ms debounce) across quotes, orders, relationships, and products, so that I can find any entity from the palette without leaving my current page.

**US-373** — As any Staff, I want global keyboard shortcuts (Ctrl+K command palette, Ctrl+N new sale, Ctrl+Shift+T quick-add task, N new order, I inventory, C customers, Esc close dialogs), so that power users can operate the system without a mouse.

**US-374** — As any Staff, I want a keyboard shortcuts modal accessible via "?" that lists all shortcuts grouped by Navigation, Actions, Quick Navigation, and Command Palette, so that I can learn the shortcuts without documentation.

**US-375** — As any Staff, I want toast notifications (success, error, info) to appear globally — success toasts dismiss automatically, error toasts persist until manually closed — so that I know the result of every action without watching the UI for state changes.

**US-376** — As any Staff, I want page-level error boundaries (`PageErrorBoundary`, keyed on location) that reset automatically when I navigate to a different route, so that a single page crash doesn't strand me in a broken state.

**US-376a** — As the Owner, I want each dashboard widget wrapped in its own `ComponentErrorBoundary`, so that a single failing widget (e.g. a broken KPI card) doesn't take down the entire dashboard — other panels remain usable.

---

## 72. System & Admin Tools

**US-377** — As an Admin, I want a system metrics page showing uptime, memory usage, and event loop lag, so that I can monitor application health without server access.

**US-378** — As an Admin, I want an admin setup page (one-time utility) to promote all users to admin with an env-protected setup key, so that the system can be bootstrapped on first deployment.

**US-379** — As an Admin, I want access to admin data tools (import, migrations, quick fix, schema push, data augment) gated to admin role, so that destructive operations require elevated access.

**US-380** — As an Auditor, I want to view the audit log for any entity, so that I can trace the history of every create/update/delete action.

**US-381** — As an Admin, I want a /help page with a searchable, categorized help catalog (Dashboard, Inventory, Sales & Orders, Clients, Analytics, Accounting), so that users have in-app documentation without leaving the system.

**US-382** — As any Staff, I want a friendly 404 page with a "Go Home" button when I navigate to a non-existent route, so that routing errors are recoverable via the Go Home button without needing the browser back button.

**US-383** — As an Admin, I want receipt generation for orders, so that clients receive formatted proof-of-purchase.

**US-384** — As any Staff, I want service billing (billable services separate from product sales), so that non-inventory revenue is captured.

**AC-001 (Acceptance Criterion — not a user story)** — All tRPC mutations are Zod-validated server-side and return typed `TRPCError` on failure. Invalid data is rejected at the API boundary and never persisted. This constraint applies to all user-facing mutations across the system.

---


---

## 73. Additional Stories (US-386 to US-420)

*New stories addressing missing coverage identified in QA review.*

---

### Command Palette and Navigation

**US-386** -- As any Staff, I want the Command Palette to show a "Recently Opened" group with the top 5 previously visited pages (excluding the current page, pulled from useRecentPages), so that I can return to recent work in one keystroke.

**US-387** -- As any Staff, I want to press `I` (not in an input) to navigate instantly to Inventory, and `C` to navigate to Customers, so that the most common operational jumps require no mouse interaction.

**US-388** -- As any Staff, I want to press `?` to open the keyboard shortcuts reference modal, so that I can discover shortcuts without leaving my current context.

---

### Inventory

**US-389** -- As an Inventory Manager, I want to initiate an inter-location warehouse transfer (moving a batch or partial quantity between two warehouse locations via warehouseTransfers), so that physical stock moves are reflected in the system immediately.

**US-390** -- As an Inventory Manager, I want to roll back or reset a receiving draft via the reset action in the receiving draft editor, so that I can discard a partially-entered receipt and start fresh without corrupting the PO record.

---

### Sales

**US-391** -- As a Sales Rep, I want the Quotes tab to offer a spreadsheet-native mode toggle (QuotesPilotSurface), so that I can choose between the classic quotes list and the sheet-native surface that matches the Orders tab experience.

**US-392** -- As a Sales Rep, I want the Returns tab to offer a spreadsheet-native mode toggle (ReturnsPilotSurface), so that I can process returns in the same spreadsheet-first workflow used across the rest of the sales workspace.

---

### Procurement

**US-393** -- As a Procurement Manager, I want to initiate a vendor return from a received PO (selecting items and quantities to return to the supplier), so that supplier-side discrepancies and defective product are formally documented and tracked in vendorReturns.

**US-394** -- As a Procurement Manager, I want to add line-item fees (separate from deposits) to a Purchase Order, so that all costs associated with a procurement -- including handling, freight, and brokerage fees -- are captured on the PO before it is confirmed.

---

### Accounting

**US-395** -- As an Accounting Manager, I want a GL Reversal Viewer on the accounting dashboard (GLReversalViewer component), so that I can see and act on pending GL reversals without navigating to the General Ledger tab.

**US-396** -- As an Accounting Manager, I want to filter the General Ledger by Trial Balance view, so that I can see account-level debit and credit totals for any period without exporting to a spreadsheet.

**US-397** -- As an Accounting Manager, I want to deep-link directly to a specific bill via ?billId= on the Bills surface, so that links from notifications and dashboard alerts open the correct bill record immediately.

**US-398** -- As an Accounting Manager, I want to export the expenses list to CSV from the Expenses surface, so that I can share expense reports with external accountants or import into payroll systems.

**US-399** -- As an Accounting Manager, I want to see expense category breakdown cards on the Expenses surface (in addition to the main table), so that I can see spending by category at a glance without filtering.

**US-400** -- As an Accounting Manager, I want a vendor payables alert panel that surfaces suppliers who have sold-out batches with outstanding balances (vendorPayables, MEET-005), so that I am proactively reminded to pay suppliers whose product has already been sold.

**US-401** -- As an Accounting Manager, I want to record non-inventory service billing (serviceBilling, MEET-009) -- billable services that appear on invoices but do not deplete batch inventory -- so that consulting, brokerage, and service revenue is captured in the ERP alongside product revenue.

---

### Client Profile and Credits

**US-402** -- As an Accounting Manager, I want to see a Consignment Range Panel on the client Money tab showing the consignment window and terms for supplier-side clients, so that consignment payment obligations are visible in the client financial context.

**US-403** -- As a Sales Rep, I want Receive Money and Pay Money quick-action buttons in the client profile header, so that I can initiate a payment or receipt from the client profile without navigating to the Accounting workspace.

**US-404** -- As an Accounting Manager, I want to restore a bad debt write-off when a previously written-off client pays (badDebt restore action), so that recovered receivables are correctly re-entered into the books rather than creating a duplicate record.

**US-405** -- As a Sales Manager, I want a referral credits management surface where I can view and configure referral credit rules and track earned credits across all clients (referralCredits, referralCreditSettings), so that the referral program is managed in one place rather than being visible only at order-creation time.

**US-406** -- As an Auditor, I want to view the credit audit log (creditAuditLog) for any client, so that I can trace every credit limit change, adjustment, and override approval with actor and timestamp.

---

### Calendar

**US-407** -- As any Staff, I want a dedicated Calendar Invitations tab (PendingInvitationsWidget) showing event invitations sent to me, so that I can accept or decline meeting requests without leaving the calendar.

---

### Scheduling

**US-408** -- As an Operations Manager, I want the Scheduling page to surface a Today Appointments panel and a Live Queue panel, so that I can see what is happening right now on the operations floor without building a filtered calendar query.

---

### Account

**US-409** -- As any Staff, I want to set theme (light/dark), regional settings (timezone and date format), and language (default: English) in My Account, so that my personal display preferences persist across sessions.

---

### Feature Flags

**US-410** -- As an Admin, I want to create a new feature flag from the Feature Flags settings page using a create-flag dialog, so that new pilot features can be registered in the system without a code deploy.

---

### VIP Portal

**US-411** -- As a VIP Client, I want access to a Credit Center module in my portal (when enabled via vipPortalConfigurations), so that I can see my current credit balance, utilization, and credit history with the supplier.

**US-412** -- As the Owner or Admin, I want to configure VIP tier rules and thresholds (vipTiers router, FEAT-019), so that clients are automatically assigned to tiers based on their business volume and loyalty metrics.

**US-413** -- As a VIP Client, I want to receive VIP-specific alerts (vipAlerts), so that I am notified of events relevant to my account (new catalogue items, appointment confirmations, invoice due dates) within the portal.

---

### Slice-v1-lab Pages

**US-414** -- As a Developer or Designer, I want the /slice-v1-lab/purchase-orders page to provide a PO queue with column toggle (GridColumnsPopover), create PO CTA, drawer detail view with line items and receiving launch, and history dialog, so that the slice-v1 layout can be evaluated as a candidate for future PO surface redesigns.

**US-415** -- As a Developer or Designer, I want the /slice-v1-lab/product-intake page to provide a detailed receiving draft editor with source PO summary, per-line received qty, shortages, samples, location selector, history, gallery, waypoints, and discrepancy tracking, so that the slice-v1 layout can be evaluated for intake workflows.

**US-416** -- As a Developer or Designer, I want the /slice-v1-lab/inventory page to provide a slice-lab inventory browser with columns for SKU, product, status, on-hand, cost, supplier, and images plus drawer detail and grid preferences, so that the layout can be evaluated against the current inventory browse surface.

---

### Operations

**US-417** -- As any Staff, I want to manage office supply needs through the system (officeSupply router, MEET-055), so that internal supply requests are tracked in the same ERP used for product operations.

---

### Todo Lists

**US-418** -- As any Staff, I want to navigate from a todo list card on the Notifications Todos tab directly to that list detail page (/todos/:listId), so that I can view and manage individual tasks without staying inside the hub.

---

### Error Handling

**US-419** -- As the Owner, I want each dashboard widget isolated in its own ComponentErrorBoundary so that a crash in one widget (for example a failed KPI query) leaves all other panels functional and clearly shows only the affected panel error rather than a full-page failure.

---

*Total: 419 user stories across 73 domain areas + AC-001 (technical acceptance criterion).*
