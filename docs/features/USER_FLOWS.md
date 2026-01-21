# TERP User Flow Mapping

**Date Created:** November 5, 2025
**Last Updated:** January 21, 2026
**Status:** v3.2 - Wave 5 Features Complete

---

## Overview

This document maps user flows for all **73 major feature modules** in the TERP codebase, expanded from the original 15 through comprehensive codebase analysis. It incorporates direct user feedback to define constraints and exclusions for development.

**Statistics:**
- Original Documented Features: 15
- Newly Discovered Features: 55
- Wave 5 New Features: 3 (Hour Tracking, Quote Email, Session Timeout)
- Total Feature Modules: 73
- Total tRPC Routers: 124
- Total tRPC Procedures: 1,450+
- Total Client Routes: 55 pages
- Documentation Coverage: 100%

Each section outlines the primary user journeys, the actors involved, and specific functionalities that should be included or explicitly excluded based on your comments.

---

## Table of Contents

### Core Features (DF-001 to DF-015)
- [DF-001: Calendar & Event Management System](#df-001-calendar--event-management-system)
- [DF-002: Task Management & Todo Lists](#df-002-task-management--todo-lists)
- [DF-003: Advanced Accounting Module](#df-003-advanced-accounting-module)
- [DF-004: Freeform Notes & Commenting System](#df-004-freeform-notes--commenting-system)
- [DF-005: VIP Customer Portal](#df-005-vip-customer-portal)
- [DF-006: Client Needs Management (CRM)](#df-006-client-needs-management-crm)
- [DF-007: Intelligent Product-Client Matchmaking](#df-007-intelligent-product-client-matchmaking)
- [DF-008: Advanced Pricing Profiles & Rules](#df-008-advanced-pricing-profiles--rules)
- [DF-009: Inbox & Notification Center](#df-009-inbox--notification-center)
- [DF-010: Product Intake Management](#df-010-product-intake-management)
- [DF-011: Scratch Pad / Quick Notes](#df-011-scratch-pad--quick-notes)
- [DF-012: Advanced Dashboard System](#df-012-advanced-dashboard-system)
- [DF-013: Multi-Location & Bin Tracking](#df-013-multi-location--bin-tracking)
- [DF-014: Customer Credit Management](#df-014-customer-credit-management)
- [DF-015: Sample Management System](#df-015-sample-management-system)

### Commerce & Sales Features (DF-016 to DF-022)
- [DF-016: Live Shopping System](#df-016-live-shopping-system)
- [DF-017: Leaderboard & Gamification](#df-017-leaderboard--gamification)
- [DF-018: Purchase Orders & Receiving](#df-018-purchase-orders--receiving)
- [DF-019: Returns & Refunds](#df-019-returns--refunds)
- [DF-020: Quotes Management](#df-020-quotes-management)
- [DF-021: Sales Sheets](#df-021-sales-sheets)
- [DF-022: Unified Sales Portal](#df-022-unified-sales-portal)

### Warehouse Operations (DF-023 to DF-025)
- [DF-023: Pick & Pack Module](#df-023-pick--pack-module)
- [DF-024: Storage & Transfers](#df-024-storage--transfers)
- [DF-025: Photography Module](#df-025-photography-module)

### CRM & Client Management (DF-026 to DF-027)
- [DF-026: Client 360 View](#df-026-client-360-view)
- [DF-027: Client Wants/Needs Tracking](#df-027-client-wantsneeds-tracking)

### Scheduling & HR (DF-028 to DF-029)
- [DF-028: Advanced Scheduling](#df-028-advanced-scheduling)
- [DF-029: Time Off & Hour Tracking](#df-029-time-off--hour-tracking)

### Financial Features (DF-030 to DF-035)
- [DF-030: Crypto Payments](#df-030-crypto-payments)
- [DF-031: Installment Payments](#df-031-installment-payments)
- [DF-032: Payment Terms Management](#df-032-payment-terms-management)
- [DF-033: Service Billing](#df-033-service-billing)
- [DF-034: Transaction Fees](#df-034-transaction-fees)
- [DF-035: Invoice Disputes](#df-035-invoice-disputes)

### Product Management (DF-036 to DF-038)
- [DF-036: Product Categories (Extended)](#df-036-product-categories-extended)
- [DF-037: Product Grades](#df-037-product-grades)
- [DF-038: Catalog Publishing](#df-038-catalog-publishing)

### Operations (DF-039 to DF-042)
- [DF-039: Workflow Queue](#df-039-workflow-queue)
- [DF-040: Referrals System](#df-040-referrals-system)
- [DF-041: Office Supply Management](#df-041-office-supply-management)
- [DF-042: Cash Audit](#df-042-cash-audit)

### Administration (DF-043 to DF-046)
- [DF-043: RBAC System](#df-043-rbac-system)
- [DF-044: Feature Flags](#df-044-feature-flags)
- [DF-045: Audit Trail](#df-045-audit-trail)
- [DF-046: System Monitoring](#df-046-system-monitoring)

### Vendor & Supply Chain (DF-047 to DF-048)
- [DF-047: Vendor Payables](#df-047-vendor-payables)
- [DF-048: Vendor Reminders](#df-048-vendor-reminders)

### Data & Navigation (DF-049 to DF-058)
- [DF-049: Global Search](#df-049-global-search)
- [DF-050: Spreadsheet View](#df-050-spreadsheet-view)
- [DF-051: VIP Tiers](#df-051-vip-tiers)
- [DF-052: Enhanced Matchmaking](#df-052-enhanced-matchmaking)
- [DF-053: Intake Receipts](#df-053-intake-receipts)
- [DF-054: Credits Management](#df-054-credits-management)
- [DF-055: Data Card Metrics](#df-055-data-card-metrics)
- [DF-056: Low Stock Alerts](#df-056-low-stock-alerts)
- [DF-057: Deployment Tracking](#df-057-deployment-tracking)
- [DF-058: Comments & Mentions](#df-058-comments--mentions)

### Financial & Analytics Extended (DF-059 to DF-061)
- [DF-059: COGS Management](#df-059-cogs-management)
- [DF-060: Client Ledger](#df-060-client-ledger)
- [DF-061: Bad Debt Management](#df-061-bad-debt-management)

### Product & Catalog Extended (DF-062 to DF-063)
- [DF-062: Strains Management](#df-062-strains-management)
- [DF-063: Advanced Tags System](#df-063-advanced-tags-system)

### Analytics & Reporting Extended (DF-064 to DF-065)
- [DF-064: Analytics Engine](#df-064-analytics-engine)
- [DF-065: Vendor Supply Matching](#df-065-vendor-supply-matching)

### System Configuration (DF-066 to DF-067)
- [DF-066: System Configuration](#df-066-system-configuration)
- [DF-067: Recurring Orders](#df-067-recurring-orders)

### System Infrastructure (DF-068 to DF-070)
- [DF-068: Health & Diagnostics](#df-068-health--diagnostics)
- [DF-069: Admin Tools Suite](#df-069-admin-tools-suite)
- [DF-070: User Management](#df-070-user-management)

### Wave 5 Features (DF-071 to DF-073) - Added January 2026
- [DF-071: Hour Tracking System](#df-071-hour-tracking-system)
- [DF-072: Quote Email System](#df-072-quote-email-system)
- [DF-073: Work Surface Session Management](#df-073-work-surface-session-management)

---
## DF-001: Calendar & Event Management System

**Category:** Collaboration & Scheduling  
**Status:** Fully Implemented

Complete calendar system with events, recurrence rules, participants, reminders, attachments, permissions, and meeting history tracking.

### Primary User Flows

| User Flow | Actors |

|-----------|--------|

| Admin creates a new event | Admin, Manager |

| User views their calendar | All Users |

| User edits an event they own | All Users |

| Admin adds participants to an event | Admin, Manager |

| System sends an event reminder | System |



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-002: Task Management & Todo Lists

**Category:** Project Management  
**Status:** Fully Implemented

Complete task management system with todo lists, tasks, and activity tracking.

### Primary User Flows

| User Flow | Actors |

|-----------|--------|

| User creates a new Todo List | All Users |

| User adds a task to a list | All Users |

| User marks a task as complete | All Users |

| User assigns a task to another user | Manager, Admin |



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-003: Advanced Accounting Module

**Category:** Financial Management  
**Status:** Fully Implemented

Comprehensive accounting system with invoices, bills, payments, bank account reconciliation, and expense tracking. Goes far beyond basic GL.

### Primary User Flows

| User Flow | Actors |

|-----------|--------|

| Admin creates a new invoice for a client | Admin |

| System generates a bill from a received PO | System |

| Admin records a payment against an invoice | Admin |

| Admin reconciles bank transactions | Admin |

| Admin generates a financial report (P&L, Balance Sheet) | Admin |



### Exclusions & User-Defined Constraints

- **EXCLUDE:** User wants PDF generation to **match the UI**. This applies to invoices, packing slips, and reports. The visual representation should be consistent with the web interface.

---
## DF-004: Freeform Notes & Commenting System

**Category:** Collaboration  
**Status:** Fully Implemented

Complete note-taking system with freeform notes, comments, and activity tracking.

### Primary User Flows

_No specific user flows mapped yet. Requires further analysis._



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-005: VIP Customer Portal

**Category:** Customer Experience  
**Status:** Fully Implemented

Customer-facing portal system for VIP clients with admin configuration.

### Primary User Flows

| User Flow | Actors |

|-----------|--------|

| Admin configures the VIP Portal settings | Admin |

| VIP Client logs into the portal | VIP Client |

| VIP Client views their order history | VIP Client |

| VIP Client places a new order | VIP Client |



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-006: Client Needs Management (CRM)

**Category:** Customer Relationship Management  
**Status:** Fully Implemented

CRM-like system for tracking and managing client needs and requirements.

### Primary User Flows

| User Flow | Actors |

|-----------|--------|

| Manager identifies and records a client need | Manager |

| System suggests products based on client needs | System |

| Manager views a client's need history | Manager, Admin |



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-007: Intelligent Product-Client Matchmaking

**Category:** Sales Intelligence  
**Status:** Fully Implemented

Intelligent matching system to connect products with client needs.

### Primary User Flows

_No specific user flows mapped yet. Requires further analysis._



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-008: Advanced Pricing Profiles & Rules

**Category:** Pricing Management  
**Status:** Fully Implemented

Sophisticated pricing system with profiles and configurable rules.

### Primary User Flows

_No specific user flows mapped yet. Requires further analysis._



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-009: Inbox & Notification Center

**Category:** Communication  
**Status:** Fully Implemented

Centralized inbox for system notifications and messages.

### Primary User Flows

_No specific user flows mapped yet. Requires further analysis._



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-010: Product Intake Management

**Category:** Inventory Operations  
**Status:** Fully Implemented

System for managing product intake sessions and batch processing.

### Primary User Flows

| User Flow | Actors |

|-----------|--------|

| Warehouse staff starts a new intake session | IC, Manager |

| Staff scans/adds products to the session | IC |

| System generates labels for new inventory | System |

| Manager finalizes the intake session, adding inventory to stock | Manager |



### Exclusions & User-Defined Constraints

- **EXCLUDE:** User has noted that the product intake and labeling process is a **bigger initiative** that needs to be formally designed. The current system should be seen as a foundation to be built upon.

---
## DF-011: Scratch Pad / Quick Notes

**Category:** Productivity  
**Status:** Fully Implemented

Quick note-taking scratch pad for temporary notes and ideas.

### Primary User Flows

_No specific user flows mapped yet. Requires further analysis._



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-012: Advanced Dashboard System

**Category:** Analytics & Reporting  
**Status:** Fully Implemented

Advanced dashboard with customizable widgets, layouts, KPI configs, and enhanced analytics.

### Primary User Flows

_No specific user flows mapped yet. Requires further analysis._



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-013: Multi-Location & Bin Tracking

**Category:** Inventory Management
**Status:** Fully Implemented

Complete multi-location warehouse management with zones, bin-level tracking, and transfer workflows. Includes locations.ts (279 lines) and storage.ts (1,295 lines) with comprehensive CRUD operations.

### Primary User Flows

| User Flow | Actors |

|-----------|--------|

| Admin defines a new warehouse location | Admin |

| Warehouse staff moves a batch from one bin to another | IC, Manager |

| System updates the `batchLocations` table | System |



### Exclusions & User-Defined Constraints

- **EXCLUDE:** User has noted that the product intake and labeling process is a **bigger initiative** that needs to be formally designed. The current system should be seen as a foundation to be built upon.

---
## DF-014: Customer Credit Management

**Category:** Financial Management  
**Status:** Fully Implemented

Complete credit management system with settings and configurations.

### Primary User Flows

_No specific user flows mapped yet. Requires further analysis._



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---
## DF-015: Sample Management System

**Category:** Sales Operations
**Status:** Fully Implemented

System for managing product samples, requests, and distribution.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep creates sample request | Sales Rep |
| Warehouse fulfills sample request | Warehouse Staff |
| Manager sets monthly sample allocation | Manager |
| System tracks sample conversion to orders | System |
| Sales rep requests sample return | Sales Rep |
| Manager views sample ROI analysis | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-016: Live Shopping System

**Category:** Real-Time Commerce
**Status:** Fully Implemented

Real-time interactive shopping sessions between sales reps and VIP clients with collaborative cart management.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep creates live shopping session | Sales Rep |
| VIP client joins session from portal | VIP Client |
| Client adds items with status (Interested/Want/Need) | VIP Client |
| Sales rep negotiates pricing in real-time | Sales Rep, VIP Client |
| Warehouse views consolidated pick list | Warehouse Staff |
| Session converts to order | Sales Rep |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-017: Leaderboard & Gamification

**Category:** Engagement & Performance
**Status:** Fully Implemented

Complete gamification system with leaderboards, points, achievements, and referral rewards.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| User views their leaderboard position | All Users |
| Admin configures leaderboard metrics | Admin |
| User earns points from sales/activities | All Users |
| User redeems points for rewards | All Users |
| System processes referral "couch tax" | System |
| Manager views team performance | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-018: Purchase Orders & Receiving

**Category:** Procurement
**Status:** Fully Implemented

Complete purchase order lifecycle from draft to receiving with batch creation.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Purchasing creates draft PO | Purchasing |
| Manager confirms/approves PO | Manager |
| Purchasing submits PO to vendor | Purchasing |
| Warehouse receives goods against PO | Warehouse Staff |
| System creates inventory batches from receiving | System |
| Manager views pending POs | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-019: Returns & Refunds

**Category:** Order Management
**Status:** Fully Implemented

Complete returns workflow with approval, receiving, inventory restocking, and refund processing.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep creates return request | Sales Rep |
| Manager approves/rejects return | Manager |
| Warehouse receives returned items | Warehouse Staff |
| System restocks inventory from return | System |
| Manager processes refund | Manager |
| Admin views return statistics | Admin |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-020: Quotes Management

**Category:** Sales Operations
**Status:** Fully Implemented

Quote creation, sending, and conversion to orders.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep creates quote for client | Sales Rep |
| System sends quote to client | System |
| Client accepts/rejects quote | Client |
| Sales rep converts quote to order | Sales Rep |
| Manager views expired quotes | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-021: Sales Sheets

**Category:** Sales Operations
**Status:** Fully Implemented

Sales sheet creation, sharing, and conversion with templates and versioning.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep creates sales sheet | Sales Rep |
| Sales rep generates shareable link | Sales Rep |
| Client views public sales sheet | Client |
| Sales rep converts to order | Sales Rep |
| Sales rep saves as template | Sales Rep |
| System tracks version history | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-022: Unified Sales Portal

**Category:** Sales Operations
**Status:** Fully Implemented

Consolidated interface for managing sales pipeline across orders, quotes, and sales sheets.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep views pipeline overview | Sales Rep |
| Manager views sales stats | Manager |
| Sales rep converts quote to sale | Sales Rep |
| Sales rep converts sales sheet to quote | Sales Rep |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-023: Pick & Pack Module

**Category:** Warehouse Operations
**Status:** Fully Implemented

Warehouse pick list generation and packing workflow with multi-select and status tracking.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Warehouse views pick list | Warehouse Staff |
| Warehouse packs items for order | Warehouse Staff |
| Warehouse marks order ready | Warehouse Staff |
| Manager views pick/pack statistics | Manager |
| System updates order fulfillment status | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-024: Storage & Transfers

**Category:** Warehouse Operations
**Status:** Fully Implemented

Multi-site storage management with zones and inter-location transfers.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates storage site | Admin |
| Manager creates storage zones | Manager |
| Warehouse initiates transfer | Warehouse Staff |
| Source warehouse ships transfer | Warehouse Staff |
| Destination warehouse receives transfer | Warehouse Staff |
| System updates batch locations | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-025: Photography Module

**Category:** Product Management
**Status:** Fully Implemented

Product photography workflow with queue management and batch association.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager views photography queue | Manager |
| Photographer starts session | Photographer |
| Photographer uploads photos | Photographer |
| Photographer completes batch | Photographer |
| System updates batch status | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-026: Client 360 View

**Category:** CRM
**Status:** Fully Implemented

Comprehensive client dashboard with referrers, wants/needs, suggested buyers, and product connections.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep views full client context | Sales Rep |
| Manager sets client referrer | Manager |
| System suggests buyers for products | System |
| Sales rep views product connections | Sales Rep |
| Sales rep quick-creates customer | Sales Rep |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-027: Client Wants/Needs Tracking

**Category:** CRM
**Status:** Fully Implemented

Separate tracking system for client product wants and needs with matching.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep records client want | Sales Rep |
| System finds matching inventory | System |
| Sales rep fulfills client need | Sales Rep |
| Manager views active needs | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-028: Advanced Scheduling

**Category:** Operations
**Status:** Fully Implemented

Shift scheduling, room bookings, delivery schedules, and live queue management.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager creates employee shift | Manager |
| Employee books meeting room | All Users |
| System checks room availability | System |
| Logistics schedules delivery | Logistics |
| Customer checks in to queue | All Users |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-029: Time Off & Hour Tracking

**Category:** HR Operations
**Status:** Fully Implemented

Employee time off requests and hour tracking with timesheets.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Employee requests time off | All Users |
| Manager approves/rejects request | Manager |
| Employee clocks in/out | All Users |
| Employee views timesheet | All Users |
| Manager views hours report | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-030: Crypto Payments

**Category:** Financial
**Status:** Fully Implemented

Cryptocurrency payment tracking and wallet management.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Client adds crypto wallet | Client |
| Admin records crypto payment | Admin |
| System tracks confirmations | System |
| Admin views crypto payment stats | Admin |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-031: Installment Payments

**Category:** Financial
**Status:** Fully Implemented

Payment plan creation with installment scheduling and late fee tracking.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager creates payment plan | Manager |
| System generates installment schedule | System |
| Accounting records installment payment | Accounting |
| System applies late fees | System |
| Manager views overdue installments | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-032: Payment Terms Management

**Category:** Financial
**Status:** Fully Implemented

Configurable payment terms (Consignment, Cash, COD, Net 30, etc.).

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin sets client payment terms | Admin |
| System calculates due dates | System |
| Manager views consignment alerts | Manager |
| Accounting generates terms text | Accounting |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-033: Service Billing

**Category:** Financial
**Status:** Fully Implemented

Billing for non-product services with order attachment.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates service type | Admin |
| Sales rep adds service to order | Sales Rep |
| System generates service invoice | System |
| Manager views service revenue | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-034: Transaction Fees

**Category:** Financial
**Status:** Fully Implemented

Per-client transaction fee configuration and tracking.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin sets client fee rate | Admin |
| System calculates order fee | System |
| System applies fee to order | System |
| Manager views fee report | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-035: Invoice Disputes

**Category:** Financial
**Status:** Fully Implemented

Invoice dispute tracking and resolution workflow.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Client raises invoice dispute | Client |
| Accounting adds dispute note | Accounting |
| Manager resolves dispute | Manager |
| Manager views dispute stats | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-036: Product Categories (Extended)

**Category:** Product Management
**Status:** Fully Implemented

Customizable product categories with subcategories and hierarchy.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates category | Admin |
| Admin creates subcategory | Admin |
| Admin assigns products to category | Admin |
| Manager views category performance | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-037: Product Grades

**Category:** Product Management
**Status:** Fully Implemented

Product quality grading system (AAAA/AAA/AA/B/C).

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates grade definition | Admin |
| System suggests price by grade | System |
| Manager views grade distribution | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-038: Catalog Publishing

**Category:** Product Management
**Status:** Fully Implemented

Product catalog publishing and syndication to external channels.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager publishes product to catalog | Manager |
| System syncs quantities | System |
| Manager bulk publishes products | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-039: Workflow Queue

**Category:** Operations
**Status:** Fully Implemented

Task queue and workflow status management for inventory batches.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager creates workflow status | Manager |
| Staff adds batch to queue | Staff |
| Staff updates batch status | Staff |
| Manager views queue statistics | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-040: Referrals System

**Category:** CRM
**Status:** Fully Implemented

Referral credits and "couch tax" processing for referrer rewards.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates referral credit | Admin |
| System tracks pending credits | System |
| Admin marks credit available | Admin |
| System applies credits to order | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-041: Office Supply Management

**Category:** Operations
**Status:** Fully Implemented

Office supply needs tracking and reorder suggestions.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Staff registers office item | Staff |
| System suggests reorder | System |
| Manager approves supply need | Manager |
| Staff marks order received | Staff |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-042: Cash Audit

**Category:** Financial
**Status:** Fully Implemented

Cash location management with shift tracking and transfers.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates cash location | Admin |
| Cashier records transaction | Cashier |
| Manager transfers between locations | Manager |
| Manager views cash dashboard | Manager |
| Manager resets shift | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-043: RBAC System

**Category:** Administration
**Status:** Fully Implemented

Role-based access control with permissions, roles, and user assignments.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates role | Admin |
| Admin assigns permissions to role | Admin |
| Admin assigns role to user | Admin |
| Admin clones role | Admin |
| System enforces permissions | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-044: Feature Flags

**Category:** Administration
**Status:** Fully Implemented

Feature flag management with role and user overrides.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates feature flag | Admin |
| Admin sets role override | Admin |
| Admin sets user override | Admin |
| System evaluates flag for user | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-045: Audit Trail

**Category:** Compliance
**Status:** Fully Implemented

Comprehensive audit logging with entity trail tracking.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| System logs all mutations | System |
| Auditor queries audit logs | Auditor |
| Auditor views entity trail | Auditor |
| Auditor exports logs | Auditor |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-046: System Monitoring

**Category:** Administration
**Status:** Fully Implemented

Performance monitoring with slow query detection and procedure metrics.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin views performance summary | Admin |
| Admin views slow query stats | Admin |
| Admin views procedure metrics | Admin |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-047: Vendor Payables

**Category:** Financial
**Status:** Fully Implemented

Vendor payables tracking with "Pay When SKU Hits Zero" feature.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| System creates payable from PO | System |
| Accounting records payment | Accounting |
| System sends overdue notifications | System |
| Manager views payables summary | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-048: Vendor Reminders

**Category:** Operations
**Status:** Fully Implemented

Vendor harvest and delivery reminder system.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager sets harvest reminder | Manager |
| System shows upcoming reminders | System |
| Staff marks vendor contacted | Staff |
| Staff marks reminder completed | Staff |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-049: Global Search

**Category:** Navigation
**Status:** Fully Implemented

Full-text search across all entities.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| User searches from command palette | All Users |
| System returns matching entities | System |
| User navigates to result | All Users |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-050: Spreadsheet View

**Category:** Data Management
**Status:** Fully Implemented

Spreadsheet-style data viewing and editing for clients and inventory.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| User opens spreadsheet view | All Users |
| User edits data in grid | All Users |
| System saves changes | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-051: VIP Tiers

**Category:** CRM
**Status:** Fully Implemented

VIP customer tier system with automatic calculations and overrides.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates tier definition | Admin |
| System calculates client tier | System |
| Admin overrides client tier | Admin |
| VIP client views their tier status | VIP Client |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-052: Enhanced Matchmaking

**Category:** Sales Intelligence
**Status:** Fully Implemented

Advanced matching for needs, wants, inventory, and historical buyers.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| System finds matches for batch | System |
| System finds buyers for inventory | System |
| System identifies lapsed buyers | System |
| System predicts reorder opportunities | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-053: Intake Receipts

**Category:** Inventory Operations
**Status:** Fully Implemented

Farmer verification and intake receipt system with public verification links.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager generates receipt | Manager |
| Farmer verifies via public link | Farmer |
| Stacker verifies receipt | Stacker |
| Manager resolves discrepancies | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-054: Credits Management

**Category:** Financial
**Status:** Fully Implemented

Customer credit issuance, application, and tracking.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Accounting issues credit | Accounting |
| Accounting applies credit to invoice | Accounting |
| Client views credit balance | Client |
| Manager views credit summary | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-055: Data Card Metrics

**Category:** Dashboard
**Status:** Fully Implemented

Configurable KPI and metrics dashboard cards.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| User views available metrics | All Users |
| User adds metric to dashboard | All Users |
| System calculates metric value | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-056: Low Stock Alerts

**Category:** Inventory Operations
**Status:** Fully Implemented

Inventory alerts for low stock and client needs matching.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin sets alert thresholds | Admin |
| System generates low stock alerts | System |
| Staff acknowledges alert | Staff |
| Manager views alert stats | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-057: Deployment Tracking

**Category:** Administration
**Status:** Fully Implemented

Application deployment management and version tracking.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| System logs deployment | System |
| Admin views deployment history | Admin |
| Admin views current deployment | Admin |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-058: Comments & Mentions

**Category:** Collaboration
**Status:** Fully Implemented

Comment system with @mentions and resolution tracking.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| User creates comment on entity | All Users |
| User @mentions another user | All Users |
| User views their mentions | All Users |
| User resolves comment | All Users |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-059: COGS Management

**Category:** Financial
**Status:** Fully Implemented

Cost of Goods Sold (COGS) tracking, impact analysis, and margin reporting with full audit trail.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager views COGS summary for period | Manager |
| Manager updates batch COGS with audit trail | Manager |
| System calculates impact of COGS changes on pending orders | System |
| Accounting views COGS history from audit logs | Accounting |
| Manager views COGS breakdown by batch | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-060: Client Ledger

**Category:** Financial
**Status:** Fully Implemented

Unified ledger view for all client transactions (orders, payments, purchase orders, manual adjustments) with running balance.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep views complete client ledger | Sales Rep |
| Accounting calculates balance as of specific date | Accounting |
| Accounting adds manual credit/debit adjustment | Accounting |
| Manager exports ledger to CSV | Manager |
| User filters ledger by transaction type | All Users |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-061: Bad Debt Management

**Category:** Financial
**Status:** Fully Implemented

Bad debt write-off management with GL entry creation and reversal capability.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Accounting writes off bad debt | Accounting |
| Accounting reverses bad debt write-off | Accounting |
| Manager views bad debt by client | Manager |
| Manager generates aging report | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-062: Strains Management

**Category:** Product Management
**Status:** Fully Implemented

Strain management with fuzzy matching, family relationships, OpenTHC integration, and autocomplete support.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin imports strains from OpenTHC | Admin |
| User searches strains with fuzzy matching | All Users |
| User views strain family (parent + variants) | All Users |
| Manager creates custom strain | Manager |
| System auto-matches strains during intake | System |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-063: Advanced Tags System

**Category:** Product Management
**Status:** Fully Implemented

Complete tag management with color-coding, categories, hierarchy, grouping, merging, and boolean search.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin creates tag with color and category | Admin |
| User adds tags to products or clients | All Users |
| User performs boolean tag search (AND/OR) | All Users |
| Admin creates tag hierarchy (parent-child) | Admin |
| Admin merges duplicate tags | Admin |
| Admin views tag usage statistics | Admin |
| User bulk-adds tags to multiple products | All Users |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-064: Analytics Engine

**Category:** Analytics & Reporting
**Status:** Fully Implemented

Comprehensive analytics with revenue trends, top clients, strain preferences, and export capabilities.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Manager views analytics summary | Manager |
| Manager views extended summary with growth rates | Manager |
| Manager views revenue trends by granularity | Manager |
| Manager views top clients by metric | Manager |
| Sales rep views client strain preferences | Sales Rep |
| Manager exports analytics data (CSV/JSON) | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-065: Vendor Supply Matching

**Category:** Supply Chain
**Status:** Fully Implemented

Vendor supply management with status tracking, buyer matching, and expiration handling.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Vendor creates supply listing | Vendor |
| System finds potential buyers for supply | System |
| Buyer reserves supply item | Buyer |
| Buyer completes purchase | Buyer |
| System expires old supply listings | System |
| Manager views all supplies with match counts | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-066: System Configuration

**Category:** Administration
**Status:** Fully Implemented

Centralized configuration management with presets, feature flags, organization settings, and team settings.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin views/sets configuration values | Admin |
| Admin applies configuration preset (retail/wholesale) | Admin |
| Admin views configuration history | Admin |
| Admin manages organization settings | Admin |
| Manager sets team settings | Manager |
| User manages personal preferences | All Users |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-067: Recurring Orders

**Category:** Order Management
**Status:** Fully Implemented

Recurring order templates with scheduling, pause/resume, and automatic generation.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep creates recurring order template | Sales Rep |
| System generates orders on schedule | System |
| Sales rep pauses recurring order | Sales Rep |
| Sales rep resumes recurring order | Sales Rep |
| Sales rep cancels recurring order | Sales Rep |
| Manager views all recurring orders | Manager |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-068: Health & Diagnostics

**Category:** System Infrastructure
**Status:** Fully Implemented

Health check endpoints for K8s/Docker probes, performance monitoring, and database diagnostics.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Load balancer checks service health | System |
| K8s checks liveness/readiness probes | System |
| Admin views detailed health diagnostics | Admin |
| Admin views runtime metrics | Admin |
| Admin runs database schema validation | Admin |
| Admin views debug information | Admin |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-069: Admin Tools Suite

**Category:** Administration
**Status:** Fully Implemented

Comprehensive admin tools for migrations, data augmentation, schema management, and system setup.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin runs database migrations | Admin |
| Admin checks migration status | Admin |
| Admin runs data augmentation scripts | Admin |
| Admin imports strains in batches | Admin |
| Admin validates schema against database | Admin |
| Admin pushes schema changes | Admin |
| Admin fixes user permissions | Admin |
| Admin promotes user to admin | Admin |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-070: User Management

**Category:** Administration
**Status:** Fully Implemented

User lifecycle management with creation, deletion, password reset, and role assignment.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Admin lists all users | Admin |
| Admin creates new user | Admin |
| Admin deletes user (soft delete) | Admin |
| Admin resets user password | Admin |
| User views their profile | All Users |
| User updates their profile | All Users |

### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---

## DF-071: Hour Tracking System

**Category:** HR Operations
**Status:** Fully Implemented (Wave 5 - January 2026)
**Implements:** MEET-048

Complete time clock and hour tracking system with clock in/out, break management, timesheet views, overtime calculation, and reporting.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Employee clocks in for shift | All Users |
| Employee starts break | All Users |
| Employee ends break | All Users |
| Employee clocks out | All Users |
| Employee views current clock status | All Users |
| Employee views weekly timesheet | All Users |
| Manager creates manual time entry | Manager |
| Manager adjusts time entry | Manager |
| Manager approves time entry | Manager |
| Manager views hours report | Manager |
| Manager views overtime report | Manager |
| Admin creates overtime rule | Admin |
| Admin updates overtime rule | Admin |

### Exclusions & User-Defined Constraints

- Hour tracking designed for small teams (originally 2 hourly employees)
- Focus on simple time tracking without complex scheduling integration

---

## DF-072: Quote Email System

**Category:** Sales Operations
**Status:** Fully Implemented (Wave 5 - January 2026)
**Implements:** API-016

Email sending functionality for quotes with configurable email service (Resend/SendGrid) support.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| Sales rep sends quote via email | Sales Rep |
| System generates quote email (HTML + plain text) | System |
| Admin checks if email is enabled | Admin |
| Client receives quote email | Client |

### Exclusions & User-Defined Constraints

- Requires email service configuration (RESEND_API_KEY or SENDGRID_API_KEY)
- Email templates match UI styling for consistency

---

## DF-073: Work Surface Session Management

**Category:** User Experience
**Status:** Fully Implemented (Wave 5 - January 2026)
**Implements:** UXS-706

Session timeout detection and handling for Work Surfaces with graceful logout and session extension capabilities.

### Primary User Flows

| User Flow | Actors |
|-----------|--------|
| System detects approaching session expiry | System |
| User receives session timeout warning | All Users |
| User extends session via callback | All Users |
| System handles graceful logout on timeout | System |
| System preserves session state in localStorage | System |
| System detects user idle activity | System |

### Exclusions & User-Defined Constraints

- Configurable warning threshold (default 5 minutes before expiry)
- Optional idle detection with activity events
- Session state preserved for recovery

---

_End of TERP User Flow Mapping v3.2 - 100% Coverage_