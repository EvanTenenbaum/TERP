# TERP Unified Feature Roadmap

**Date Created:** November 5, 2025  
**Last Updated:** November 5, 2025  
**Status:** Version 1.0

---

## Overview

This document presents a unified feature roadmap for the TERP system. It is the result of merging:

1.  The user-prioritized features from the original `TERP_Missing_Features_Spreadsheet.csv`.
2.  The critical and high-priority gaps identified from the 15 newly discovered modules.

This roadmap represents the most up-to-date, comprehensive plan for reaching feature completeness.

---


## Phase 0: CRITICAL FOUNDATION - Purchase Order Module

**The absolute top priority is to build the core Purchase Order (PO) module, which is the primary missing piece in the current system.**

| ID | Feature Name | Priority | Est. Effort | Source |
|----|--------------|----------|-------------|--------|
| MF-018 | Purchase Order Creation | CRITICAL | 40.0 | Original Spreadsheet |
| MF-021 | PO Receiving | CRITICAL | 32.0 | Original Spreadsheet |
| MF-022 | PO-to-Bill Matching | CRITICAL | 48.0 | Original Spreadsheet |


## Phase 1: Other Foundational Features

| ID | Feature Name | Priority | Est. Effort | Source |

|----|--------------|----------|-------------|--------|

| MF-018 | Purchase Order Creation | CRITICAL | 40.0 | Original Spreadsheet |

| GAP-078 | Multi-Location & Bin Tracking: Formal intake labeling system (CRITICAL) | Critical | 160-200 hours | Gap Analysis |

| GAP-079 | Multi-Location & Bin Tracking: Bin capacity management | Critical | 160-200 hours | Gap Analysis |

| GAP-080 | Multi-Location & Bin Tracking: Location hierarchy (Warehouse → Zone → Aisle → Bin) | Critical | 160-200 hours | Gap Analysis |

| GAP-081 | Multi-Location & Bin Tracking: Inventory movement audit trail | Critical | 160-200 hours | Gap Analysis |

| GAP-082 | Multi-Location & Bin Tracking: Bin-to-bin transfer workflow | Critical | 160-200 hours | Gap Analysis |

| GAP-083 | Multi-Location & Bin Tracking: Low stock alerts by location | Critical | 160-200 hours | Gap Analysis |

| GAP-084 | Multi-Location & Bin Tracking: Visual warehouse map | Critical | 160-200 hours | Gap Analysis |

| GAP-085 | Multi-Location & Bin Tracking: Location picker with search | Critical | 160-200 hours | Gap Analysis |

| GAP-086 | Multi-Location & Bin Tracking: Bin occupancy visualization | Critical | 160-200 hours | Gap Analysis |

| GAP-087 | Multi-Location & Bin Tracking: Prevent moving inventory to non-existent bins | Critical | 160-200 hours | Gap Analysis |

| GAP-088 | Multi-Location & Bin Tracking: Validate bin capacity before assignment | Critical | 160-200 hours | Gap Analysis |



## Phase 2: High-Priority Core Features

| ID | Feature Name | Priority | Est. Effort | Source |

|----|--------------|----------|-------------|--------|

| MF-002 | User Roles & Permissions | HIGH | 64.0 | Original Spreadsheet |

| MF-005 | Password Reset Flow | HIGH | 16.0 | Original Spreadsheet |

| MF-006 | Session Management | HIGH | 24.0 | Original Spreadsheet |

| MF-007 | Two-Factor Authentication | HIGH | 48.0 | Original Spreadsheet |

| MF-010 | Vendor Directory | HIGH | 16.0 | Original Spreadsheet |

| MF-011 | Vendor Profiles | HIGH | 32.0 | Original Spreadsheet |

| MF-014 | Vendor Product Catalog | HIGH | 32.0 | Original Spreadsheet |

| MF-015 | Vendor Payment Terms | HIGH | 8.0 | Original Spreadsheet |

| MF-016 | Vendor Notes & History | HIGH | 8.0 | Original Spreadsheet |

| MF-021 | PO Receiving | HIGH | 32.0 | Original Spreadsheet |

| MF-022 | PO-to-Bill Matching | HIGH | 48.0 | Original Spreadsheet |

| MF-023 | PO History | HIGH | 8.0 | Original Spreadsheet |

| MF-024 | PO Templates | HIGH | 24.0 | Original Spreadsheet |

| MF-026 | Order Fulfillment Workflow | HIGH | 64.0 | Original Spreadsheet |

| MF-027 | Packing Slips | HIGH | 16.0 | Original Spreadsheet |

| MF-034 | Return Authorization (RMA) | HIGH | 32.0 | Original Spreadsheet |

| MF-035 | Return Reasons | HIGH | 8.0 | Original Spreadsheet |

| MF-036 | Return Receiving | HIGH | 32.0 | Original Spreadsheet |

| MF-037 | Refund Processing | HIGH | 24.0 | Original Spreadsheet |

| MF-038 | Restocking Fees | HIGH | 8.0 | Original Spreadsheet |

| MF-039 | Return Analytics | HIGH | 24.0 | Original Spreadsheet |

| MF-040 | Inventory Adjustments | HIGH | 32.0 | Original Spreadsheet |

| MF-043 | Inventory Transfers | HIGH | 32.0 | Original Spreadsheet |

| MF-044 | Inventory Reservations | HIGH | 32.0 | Original Spreadsheet |

| MF-046 | Expiration Date Management | HIGH | 24.0 | Original Spreadsheet |

| MF-047 | Inventory Valuation Methods | HIGH | 48.0 | Original Spreadsheet |

| MF-048 | Dead Stock Identification | HIGH | 16.0 | Original Spreadsheet |

| MF-050 | Multi-Warehouse Management | HIGH | 120.0 | Original Spreadsheet |

| MF-051 | Bin/Location Tracking | HIGH | 32.0 | Original Spreadsheet |

| MF-052 | Custom Report Builder | HIGH | 120.0 | Original Spreadsheet |

| MF-054 | Financial Reports | HIGH | 80.0 | Original Spreadsheet |

| MF-055 | Sales Reports | HIGH | 40.0 | Original Spreadsheet |

| MF-056 | Inventory Reports | HIGH | 40.0 | Original Spreadsheet |

| MF-057 | AR Aging Report | HIGH | 16.0 | Original Spreadsheet |

| MF-058 | AP Aging Report | HIGH | 16.0 | Original Spreadsheet |

| MF-059 | Profitability Analysis | HIGH | 64.0 | Original Spreadsheet |

| MF-062 | Export to Excel/PDF | HIGH | 16.0 | Original Spreadsheet |

| GAP-017 | Advanced Accounting Module: PDF generation for invoices, bills, and financial reports (matching UI) | High | 100-140 hours | Gap Analysis |

| GAP-018 | Advanced Accounting Module: Automated invoice reminders | High | 100-140 hours | Gap Analysis |

| GAP-019 | Advanced Accounting Module: Multi-currency support | High | 100-140 hours | Gap Analysis |

| GAP-020 | Advanced Accounting Module: Tax calculation engine | High | 100-140 hours | Gap Analysis |

| GAP-021 | Advanced Accounting Module: Invoice preview before sending | High | 100-140 hours | Gap Analysis |

| GAP-022 | Advanced Accounting Module: Batch payment recording | High | 100-140 hours | Gap Analysis |

| GAP-023 | Advanced Accounting Module: Ensure invoice totals match line items | High | 100-140 hours | Gap Analysis |

| GAP-024 | Advanced Accounting Module: Prevent negative payments | High | 100-140 hours | Gap Analysis |

| GAP-039 | Intelligent Product-Client Matchmaking: AI/ML model training on historical sales data | High | 120-160 hours | Gap Analysis |

| GAP-040 | Intelligent Product-Client Matchmaking: Confidence scoring for matches | High | 120-160 hours | Gap Analysis |

| GAP-041 | Intelligent Product-Client Matchmaking: Feedback loop to improve matching over time | High | 120-160 hours | Gap Analysis |

| GAP-042 | Intelligent Product-Client Matchmaking: Batch matching for multiple clients | High | 120-160 hours | Gap Analysis |

| GAP-043 | Intelligent Product-Client Matchmaking: Match review and approval interface | High | 120-160 hours | Gap Analysis |

| GAP-044 | Intelligent Product-Client Matchmaking: Match history and analytics | High | 120-160 hours | Gap Analysis |

| GAP-045 | Intelligent Product-Client Matchmaking: Ensure products are in stock before matching | High | 120-160 hours | Gap Analysis |

| GAP-046 | Intelligent Product-Client Matchmaking: Validate client budget constraints | High | 120-160 hours | Gap Analysis |

| GAP-061 | Product Intake Management: Integration with formal labeling system | High | 120-160 hours | Gap Analysis |

| GAP-062 | Product Intake Management: Barcode/QR code generation for intake items | High | 120-160 hours | Gap Analysis |

| GAP-063 | Product Intake Management: Automatic bin assignment based on product type | High | 120-160 hours | Gap Analysis |

| GAP-064 | Product Intake Management: Intake session approval workflow | High | 120-160 hours | Gap Analysis |

| GAP-065 | Product Intake Management: Discrepancy reporting (expected vs. actual quantities) | High | 120-160 hours | Gap Analysis |

| GAP-066 | Product Intake Management: Mobile-friendly intake interface for warehouse staff | High | 120-160 hours | Gap Analysis |

| GAP-067 | Product Intake Management: Intake session history and audit trail | High | 120-160 hours | Gap Analysis |

| GAP-068 | Product Intake Management: Validate product SKUs during intake | High | 120-160 hours | Gap Analysis |

| GAP-069 | Product Intake Management: Prevent duplicate intake sessions | High | 120-160 hours | Gap Analysis |



## Phase 3: Medium-Priority Enhancements

| ID | Feature Name | Priority | Est. Effort | Source |

|----|--------------|----------|-------------|--------|

| MF-063 | Bulk Data Import | MEDIUM | 64.0 | Original Spreadsheet |

| MF-064 | Bulk Data Export | MEDIUM | 16.0 | Original Spreadsheet |

| MF-065 | Data Validation Rules | MEDIUM | 32.0 | Original Spreadsheet |

| MF-066 | Import Templates | MEDIUM | 8.0 | Original Spreadsheet |

| MF-067 | Import History | MEDIUM | 24.0 | Original Spreadsheet |

| MF-068 | Duplicate Detection | MEDIUM | 48.0 | Original Spreadsheet |

| MF-069 | Bulk Price Updates | MEDIUM | 24.0 | Original Spreadsheet |

| MF-070 | Bulk Status Changes | MEDIUM | 16.0 | Original Spreadsheet |

| MF-071 | Bulk Tag Assignment | MEDIUM | 8.0 | Original Spreadsheet |

| MF-072 | Bulk Delete | MEDIUM | 8.0 | Original Spreadsheet |

| MF-075 | Communication History | MEDIUM | 32.0 | Original Spreadsheet |

| MF-076 | Internal Notes on Communications | MEDIUM | 8.0 | Original Spreadsheet |

| MF-077 | Notification Preferences | MEDIUM | 24.0 | Original Spreadsheet |

| MF-080 | Push Notifications | MEDIUM | 24.0 | Original Spreadsheet |

| MF-082 | System Audit Log Viewer | MEDIUM | 32.0 | Original Spreadsheet |

| MF-083 | User Activity Tracking | MEDIUM | 32.0 | Original Spreadsheet |

| MF-084 | Data Retention Policies | MEDIUM | 48.0 | Original Spreadsheet |

| MF-087 | Global Search | MEDIUM | 64.0 | Original Spreadsheet |

| MF-088 | Saved Searches | MEDIUM | 24.0 | Original Spreadsheet |

| MF-089 | Advanced Filters | MEDIUM | 48.0 | Original Spreadsheet |

| MF-090 | Search History | MEDIUM | 8.0 | Original Spreadsheet |

| MF-096 | Recurring Billing | MEDIUM | 32.0 | Original Spreadsheet |

| MF-097 | Payment Plans | MEDIUM | 32.0 | Original Spreadsheet |

| MF-101 | Shopify Integration | LOW | 80.0 | Original Spreadsheet |

| MF-107 | Mobile-Optimized UI | LOW | 40.0 | Original Spreadsheet |

| MF-110 | Offline Mode | LOW | 160.0 | Original Spreadsheet |

| MF-111 | Barcode Scanning | LOW | 32.0 | Original Spreadsheet |

| MF-114 | Task Assignment | LOW | 32.0 | Original Spreadsheet |

| MF-115 | Team Calendar | LOW | 16.0 | Original Spreadsheet |

| MF-116 | Activity Feed | LOW | 32.0 | Original Spreadsheet |

| MF-118 | Data Visualization | LOW | 64.0 | Original Spreadsheet |

| MF-119 | KPI Dashboards | LOW | 40.0 | Original Spreadsheet |

| MF-120 | Trend Analysis | LOW | 32.0 | Original Spreadsheet |

| MF-121 | Anomaly Detection | LOW | 64.0 | Original Spreadsheet |

| MF-122 | Workflow Automation | LOW | 120.0 | Original Spreadsheet |

| MF-126 | Custom Fields | LOW | 64.0 | Original Spreadsheet |

| MF-127 | Custom Views | LOW | 24.0 | Original Spreadsheet |

| MF-132 | Contextual Help | LOW | 32.0 | Original Spreadsheet |

| MF-133 | Knowledge Base | LOW | 40.0 | Original Spreadsheet |

| EX-017 | PDF Generation | EXCLUDED | 0.0 | Original Spreadsheet |


