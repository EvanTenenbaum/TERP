# VIP Client Portal - Admin Configuration System

**Version:** 1.0  
**Author:** Manus AI  
**Date:** October 30, 2025  
**Status:** Final

## Overview

This document outlines the admin-side configuration system that allows internal TERP users to customize and control what is displayed in each VIP Client Portal. This provides granular control over the client experience on a per-client basis.

---

## Configuration Scope

ERP administrators will be able to configure the following for each VIP client:

### 1. Module-Level Control
Which major sections of the portal are visible to the client.

### 2. Feature-Level Control
Within each enabled module, which specific features and data elements are displayed.

---

## Admin Interface Design

The configuration interface will be accessible from the main TERP application, integrated into the client management section.

### Location
**Path:** Client Profile → VIP Portal Settings

### Interface Structure

The configuration interface will use a clean, hierarchical design with toggle switches for modules and expandable sections for feature-level controls.

---

## Configurable Modules and Features

### Module 1: Dashboard
**Module Toggle:** Show/Hide entire Dashboard

**Feature-Level Controls (when module is enabled):**
- [ ] Show Personalized Greeting
- [ ] Show Current Balance KPI
- [ ] Show YTD Spend KPI
- [ ] Show Quick Access Links

---

### Module 2: Accounts Receivable
**Module Toggle:** Show/Hide Accounts Receivable

**Feature-Level Controls (when module is enabled):**
- [ ] Show AR Summary Totals
- [ ] Show Invoice Details Table
- [ ] Allow PDF Downloads
- [ ] Highlight Overdue Items in Red

**Conditional Logic:** This module automatically hides if the client has no outstanding AR, regardless of settings.

---

### Module 3: Accounts Payable
**Module Toggle:** Show/Hide Accounts Payable

**Feature-Level Controls (when module is enabled):**
- [ ] Show AP Summary Totals
- [ ] Show Bill Details Table
- [ ] Allow PDF Downloads
- [ ] Highlight Overdue Items in Red

**Conditional Logic:** This module automatically hides if the client has no outstanding AP, regardless of settings.

---

### Module 4: Transaction History
**Module Toggle:** Show/Hide Transaction History

**Feature-Level Controls (when module is enabled):**
- [ ] Show All Transaction Types
- [ ] Allow Date Range Filtering
- [ ] Allow Transaction Type Filtering
- [ ] Allow Status Filtering
- [ ] Show Transaction Details View
- [ ] Allow PDF Downloads

**Advanced Options:**
- Limit visible transaction history to: [Dropdown: All Time / Last 12 Months / Last 6 Months / Last 3 Months]

---

### Module 5: VIP Tier System
**Module Toggle:** Show/Hide VIP Tier System

**Feature-Level Controls (when module is enabled):**
- [ ] Show Current Tier Badge
- [ ] Show Tier Requirements
- [ ] Show Tier Rewards
- [ ] Show Progress to Next Tier
- [ ] Show Tier Recommendations

---

### Module 6: Credit Center
**Module Toggle:** Show/Hide Credit Center

**Feature-Level Controls (when module is enabled):**
- [ ] Show Credit Limit
- [ ] Show Credit Usage
- [ ] Show Available Credit
- [ ] Show Credit Utilization Visual
- [ ] Show Credit History Timeline
- [ ] Show Credit Improvement Recommendations

---

### Module 7: Marketplace - Needs (I Need to Buy)
**Module Toggle:** Show/Hide Marketplace Needs

**Feature-Level Controls (when module is enabled):**
- [ ] Allow Creating New Needs
- [ ] Show Active Needs Listings
- [ ] Allow Editing Needs
- [ ] Allow Canceling Needs
- [ ] Show Saved Templates
- [ ] Require Expiration Duration

**Advanced Options:**
- Default expiration duration: [Dropdown: 1 day / 5 days / 1 week / 1 month]

---

### Module 8: Marketplace - Supply (I Have to Sell)
**Module Toggle:** Show/Hide Marketplace Supply

**Feature-Level Controls (when module is enabled):**
- [ ] Allow Creating New Supply Listings
- [ ] Show Active Supply Listings
- [ ] Allow Editing Supply
- [ ] Allow Canceling Supply
- [ ] Show Saved Templates
- [ ] Allow New Strain Entry
- [ ] Show Tag Selection

**Advanced Options:**
- Default expiration duration: [Dropdown: 1 day / 5 days / 1 week / 1 month]
- Price input type: [Dropdown: Single Price / Price Range / Both]

---

## Configuration Templates

To streamline setup, the system will include predefined configuration templates:

### Template 1: Full Access
All modules and features enabled. Recommended for top-tier VIP clients.

### Template 2: Financial Only
Only AR, AP, Transaction History, and Credit Center enabled. For clients who only need financial visibility.

### Template 3: Marketplace Only
Only Marketplace modules enabled. For clients who primarily use the portal to post needs and supply.

### Template 4: Basic
Dashboard, AR, AP, and VIP Tier System only. A minimal but informative portal.

**Custom:** Administrators can create and save their own templates for reuse.

---

## User Interface Recommendations

### Toggle Switch Design
Use modern toggle switches (on/off) for all module and feature controls, with clear labels and visual feedback.

### Expandable Sections
Module-level controls are always visible. Feature-level controls appear in an expandable section below each module when the module is enabled.

### Save Behavior
- **Auto-save:** Changes are saved automatically as they are made.
- **Apply Changes:** A prominent "Apply Changes" button at the bottom that immediately updates the client's portal.
- **Preview:** An optional "Preview Portal" button that shows what the client will see based on current settings.

### Bulk Actions
- **Apply Template:** Dropdown to select and apply a predefined template.
- **Copy from Another Client:** Copy portal settings from another VIP client.

---

## Database Schema Considerations

A new table will be required to store portal configurations:

**Table:** `vip_portal_configurations`

**Columns:**
- `id` (Primary Key)
- `client_id` (Foreign Key to `clients` table)
- `module_dashboard_enabled` (Boolean)
- `module_ar_enabled` (Boolean)
- `module_ap_enabled` (Boolean)
- `module_transaction_history_enabled` (Boolean)
- `module_vip_tier_enabled` (Boolean)
- `module_credit_center_enabled` (Boolean)
- `module_marketplace_needs_enabled` (Boolean)
- `module_marketplace_supply_enabled` (Boolean)
- `features_config` (JSON - stores all feature-level toggles)
- `advanced_options` (JSON - stores advanced options like default expirations)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

---

## API Endpoints

New tRPC endpoints will be created for managing configurations:

- `admin.vipPortal.getConfig(clientId)` - Get current configuration for a client
- `admin.vipPortal.updateConfig(clientId, config)` - Update configuration
- `admin.vipPortal.applyTemplate(clientId, templateName)` - Apply a predefined template
- `admin.vipPortal.copyConfig(sourceClientId, targetClientId)` - Copy config from one client to another
- `admin.vipPortal.previewPortal(clientId)` - Generate a preview of the portal based on current settings

---

## Implementation Priority

**Phase 1 (MVP):**
- Module-level toggles for all 8 modules
- Basic template system (Full Access, Financial Only, Marketplace Only, Basic)
- Simple save/apply functionality

**Phase 2 (Enhanced):**
- Feature-level controls for all modules
- Advanced options (default expirations, transaction history limits, etc.)
- Preview functionality

**Phase 3 (Advanced):**
- Custom template creation and management
- Copy configuration from another client
- Bulk configuration updates for multiple clients

---

This configuration system provides maximum flexibility while maintaining simplicity for administrators. It ensures that each VIP client receives a tailored portal experience that matches their specific needs and relationship with TERP.
