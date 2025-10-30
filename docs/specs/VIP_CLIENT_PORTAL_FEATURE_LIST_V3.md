
# VIP Client Portal - Complete Feature List (V3)

**Version:** 3.0  
**Author:** Manus AI  
**Date:** October 30, 2025

This document provides a comprehensive, numbered list of all features in the VIP Client Portal Feature Specification V3, updated based on audio feedback.

---

## AUTHENTICATION & ACCESS

### 1. Password Login
Standard email and password authentication for a single client user.

### 2. Single Sign-On (SSO) - Google
One-click login using Google accounts.

### 3. Single Sign-On (SSO) - Microsoft
One-click login using Microsoft accounts.

### 4. Session Management
JWT-based session management with 30-day expiration.

### 5. Password Reset Flow
Secure password reset via email with time-sensitive reset links.

---

## DASHBOARD & PORTAL MODULES

### 6. Personalized Greeting
Dynamic greeting message (e.g., "Good morning, [Client Name]").

### 7. Modular Dashboard Layout
The dashboard will consist of several distinct modules: Accounts Receivable, Accounts Payable, Credit Utilization, Marketplace Listings, and VIP Tier Status.

### 8. Contextual KPI - Current Balance with Trend
Shows current balance with percentage change from previous period.

### 9. Contextual KPI - Year-to-Date Spend with Tier Progress
Shows YTD spending with progress toward next VIP tier.

### 10. Quick Access Links
One-click shortcuts to frequently used features.

---

## FINANCIAL HUB

### 11. Transaction History Table
Paginated table showing all transactions with date, type, number, amount, and status.

### 12. Transaction History - Date Range Filter
Filter transactions by specific start and end dates.

### 13. Transaction History - Transaction Type Filter
Filter by transaction type (INVOICE, PAYMENT, ORDER, QUOTE, etc.).

### 14. Transaction History - Status Filter
Filter by transaction status (PAID, PENDING, OVERDUE, etc.).

### 15. Transaction Details View
Detailed view of individual transactions with line items and notes.

### 16. Transaction PDF Download
Download PDF copies of invoices and other documents.

### 17. Accounts Receivable (AR) Module
Table displaying all outstanding invoices with invoice number, dates, amount due, and status. Overdue items are listed first and highlighted in red.

### 18. Conditional AR Module Display
The Accounts Receivable module will only be visible if the client has outstanding AR.

### 19. AR Summary Totals
Summary showing total amount outstanding and total amount overdue.

### 20. Accounts Payable (AP) Module
Table displaying all outstanding bills with bill number, dates, amount due, and status. Overdue items are listed first and highlighted in red.

### 21. Conditional AP Module Display
The Accounts Payable module will only be visible if the client has outstanding AP.

### 22. AP Summary Totals
Summary showing total amount owed to the client.
---

## VIP TIER SYSTEM

### 23. VIP Tier Assignment
Automatic assignment to Platinum, Gold, or Silver tier based on performance metrics.

### 24. Tier Status Display
Visual display of current tier with badge/icon.

### 25. Tier Requirements Display
Clear explanation of requirements for each tier.

### 26. Tier Rewards Display
List of benefits and rewards for each tier level.

### 27. Tier Progress Indicator
Visual indicator showing progress toward next tier.

### 28. Data-Driven Tier Recommendations
Specific, actionable advice on how to reach the next tier (e.g., "$5,000 more in transaction volume needed for Platinum").

### 29. Admin-Side Tier Management (Internal)
Internal TERP users can manage the VIP Tier system rules and parameters from the main TERP settings page.

---

## CREDIT CENTER

### 30. Credit Limit Display
Shows client's total approved credit limit.

### 31. Credit Usage Display
Shows amount of credit currently in use.

### 32. Available Credit Display
Shows remaining credit available to the client.

### 33. Credit Utilization Visual
Progress bar or chart illustrating credit utilization percentage.

### 34. Credit History Timeline
Timeline showing recent changes to credit limit with reasons.

### 35. Specific Credit Improvement Recommendations
Data-driven advice based on client's actual data (e.g., "Pay these 2 overdue invoices to improve your credit limit").
---

## MARKETPLACE - NEEDS (I NEED TO BUY)

### 36. My Needs Listings Table
Table showing all active needs listings with product details, quantity, price, status, and expiration.

### 37. Create Need - Separate Form
Dedicated form optimized for posting buying needs.

### 38. Need Form - Strain Selection
Searchable dropdown populated from the strains database.

### 39. Need Form - Category Selection
Dropdown populated from the products database.

### 40. Need Form - Subcategory Selection
Dependent dropdown based on selected category.

### 41. Need Form - Grade Input
Text input for product grade.

### 42. Need Form - Quantity Input
Input for quantity needed.

### 43. Need Form - Maximum Price Input
Input for maximum price willing to pay.

### 44. Need Form - Expiration Duration Selector (Required)
Dropdown with preset durations (1 day, 5 days, 1 week, 1 month). This field is mandatory.

### 45. Need Form - Default Expiration (5 days)
System default expiration of 5 days, customizable per listing.

### 46. Need Form - Intelligent Defaults
Auto-fill form fields based on client's past buying activity.

### 47. Need Form - Saved Templates
Ability to save common needs as templates for one-click posting.

### 48. Edit Need Listing
Edit existing active need listings.

### 49. Cancel Need Listing
Cancel/delete active need listings.

---

## MARKETPLACE - SUPPLY (I HAVE TO SELL)

### 50. My Supply Listings Table
Table showing all active supply listings with product details, quantity, price, status, and expiration.

### 51. Create Supply - Separate Form
Dedicated form optimized for posting selling supply.

### 52. Supply Form - Strain Selection/Creation
Allows selection from a searchable dropdown of existing strains or inputting a new strain name.

### 53. Supply Form - Tag Selection
Allows selection from a list of existing, predefined tags. Users cannot create new tags.

### 54. Supply Form - Category Selection
Dropdown populated from the products database.

### 55. Supply Form - Subcategory Selection
Dependent dropdown based on selected category.

### 56. Supply Form - Grade Input
Text input for product grade.

### 57. Supply Form - Quantity Input
Input for quantity available.

### 58. Supply Form - Asking Price (Range or Firm)
Allows for a price range (min/max). If only one value is entered, it is treated as a firm price.

### 59. Supply Form - Expiration Duration Selector
Dropdown with preset durations (1 day, 5 days, 1 week, 1 month).

### 60. Supply Form - Default Expiration (5 days)
System default expiration of 5 days, customizable per listing.

### 61. Supply Form - Intelligent Defaults
Auto-fill form fields based on client's past selling activity.

### 62. Supply Form - Saved Templates
Ability to save common supply items as templates for one-click posting.

### 63. Edit Supply Listing
Edit existing active supply listings.

### 64. Cancel Supply Listing
Cancel/delete active supply listings.
---

## TECHNICAL & INFRASTRUCTURE

### 65. Mobile-First Responsive Design
Fully responsive design optimized for mobile devices.

### 66. Consistent UI/UX with Main TERP App
Design language consistent with the main TERP application.

### 67. Fast Performance & Optimized Loading
Optimized data loading with minimal latency.

### 68. tRPC API Endpoints
New set of tRPC endpoints prefixed with `/portal` for all portal functionality.

### 69. Database Integration
Direct integration with existing TERP MySQL database (client_needs, vendor_supply, clients, etc.).

---

## ADMIN-SIDE FEATURES (INTERNAL)

### 70. VIP Client Last Login Tracking
Internal TERP users can view the last login date and time for each VIP client to track portal engagement.

---

**Total Features: 70**

## ADMIN-SIDE CONFIGURATION SYSTEM (INTERNAL)

### 71. VIP Portal Configuration Interface
Admin interface accessible from Client Profile → VIP Portal Settings for configuring each client's portal.

### 72. Module-Level Toggles
Toggle switches to enable/disable entire modules (Dashboard, AR, AP, Transaction History, VIP Tier, Credit Center, Marketplace Needs, Marketplace Supply).

### 73. Feature-Level Controls
Expandable sections under each module with checkboxes to control specific features within that module.

### 74. Configuration Templates
Predefined templates (Full Access, Financial Only, Marketplace Only, Basic) for quick setup.

### 75. Custom Template Creation
Ability to create and save custom configuration templates for reuse.

### 76. Copy Configuration
Copy portal settings from one VIP client to another.

### 77. Portal Preview
Preview what the client will see based on current configuration settings.

### 78. Advanced Options
Module-specific advanced options (e.g., default expiration durations, transaction history limits, price input types).

### 79. Auto-Save Configuration
Automatic saving of configuration changes as they are made.

### 80. Apply Changes Button
Prominent button to immediately apply configuration changes to the client's live portal.

---

**Total Features: 80**
