# TERP User Flow Mapping

**Date Created:** November 5, 2025  
**Last Updated:** November 5, 2025  
**Status:** Draft - Living Document

---

## Overview

This document maps the potential user flows for the 15 major feature modules discovered in the TERP codebase. It also incorporates direct user feedback to define constraints and exclusions for future development.

Each section outlines the primary user journeys, the actors involved, and specific functionalities that should be included or explicitly excluded based on your comments.

---

## Table of Contents

- [DF-001: Calendar & Event Management System](#calendar-event-management-system)
- [DF-002: Task Management & Todo Lists](#task-management-todo-lists)
- [DF-003: Advanced Accounting Module](#advanced-accounting-module)
- [DF-004: Freeform Notes & Commenting System](#freeform-notes-commenting-system)
- [DF-005: VIP Customer Portal](#vip-customer-portal)
- [DF-006: Client Needs Management (CRM)](#client-needs-management-(crm))
- [DF-007: Intelligent Product-Client Matchmaking](#intelligent-product-client-matchmaking)
- [DF-008: Advanced Pricing Profiles & Rules](#advanced-pricing-profiles-rules)
- [DF-009: Inbox & Notification Center](#inbox-notification-center)
- [DF-010: Product Intake Management](#product-intake-management)
- [DF-011: Scratch Pad / Quick Notes](#scratch-pad-/-quick-notes)
- [DF-012: Advanced Dashboard System](#advanced-dashboard-system)
- [DF-013: Multi-Location & Bin Tracking](#multi-location-bin-tracking)
- [DF-014: Customer Credit Management](#customer-credit-management)
- [DF-015: Sample Management System](#sample-management-system)

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
**Status:** Partially Implemented

Foundation for multi-location warehouse management and bin-level tracking. User notes this needs enhancement for formal intake labeling system.

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

_No specific user flows mapped yet. Requires further analysis._



### Exclusions & User-Defined Constraints

_No specific exclusions noted for this module._

---