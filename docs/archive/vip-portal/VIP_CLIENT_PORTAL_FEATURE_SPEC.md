
# VIP Client Portal Feature Specification

**Version:** 1.0  
**Author:** Manus AI  
**Date:** October 30, 2025  
**Status:** In-Progress

## 1. Introduction

This document outlines the feature specification for the TERP VIP Client Portal. The portal is a secure, client-facing web application designed to provide high-value clients with direct access to their account information, transaction history, and credit status. It also serves as a bidirectional marketplace for clients to post their product needs and available supply, feeding valuable data into the internal TERP Needs Matching Engine.

### 1.1. Goals and Objectives

The primary goals of the VIP Client Portal are to:

*   **Enhance Client Engagement:** Provide a self-service platform for clients to access their data 24/7.
*   **Increase Transparency:** Offer clients clear visibility into their transaction history, financial standing, and credit status.
*   **Improve Data Acquisition:** Capture client needs and supply directly, improving the accuracy and timeliness of data for the internal Needs Matching Engine.
*   **Strengthen Client Relationships:** Provide value-added features like the anonymized leaderboard and actionable recommendations to foster loyalty and growth.
*   **Reduce Administrative Overhead:** Offload common client inquiries to the self-service portal, freeing up internal resources.

### 1.2. Scope

This specification covers the design and functionality of the client-facing portal. It includes user authentication, the main dashboard, and the following key features:

*   Transaction History
*   Accounts Receivable & Payable
*   Anonymized Leaderboard
*   Credit Limit & Usage
*   Marketplace (Client Needs & Supply)

This document does **not** cover the internal workings of the Needs Matching Engine, which will consume the data from the portal but will not be visible to the client.

## 2. User Roles and Permissions

The client portal will have a single user role:

*   **VIP Client:** A client who has been granted access to the portal by a TERP administrator.

### 2.1. Permissions

VIP Clients will have the following permissions within the portal:

*   View their own client profile and account information.
*   View their complete transaction history, including invoices, payments, and orders.
*   View their current Accounts Receivable (AR) and Accounts Payable (AP) status.
*   View their credit limit, usage, and recommendations for improvement.
*   View their anonymized ranking on the client leaderboard.
*   Create, view, update, and manage their own product needs and supply listings.
*   They will **not** be able to view any other client's data, listings, or matches.

## 3. Authentication

The VIP Client Portal will leverage the existing TERP authentication system to ensure secure access. The authentication flow will be as follows:

### 3.1. Login

*   Clients will access the portal via a dedicated URL (e.g., `portal.terp.com`).
*   A login page will be presented, requiring the client's registered email address and password.
*   The system will authenticate the user against the existing `users` table in the TERP database.
*   Upon successful authentication, a JWT session token will be generated and stored in a secure, HTTP-only cookie, as per the current `simpleAuth.ts` implementation.

### 3.2. Session Management

*   The session will persist for 30 days, as defined in the existing authentication configuration.
*   The portal will automatically log the user out after the session expires.
*   A "Logout" button will be available to manually terminate the session.

### 3.3. Password Reset

*   A "Forgot Password" link will be available on the login page.
*   This will initiate a secure password reset flow, sending a time-sensitive reset link to the client's registered email address.

## 4. Main Dashboard

The dashboard will be the landing page after the client logs in. It will provide a high-level overview of their account and quick access to the portal's main features. The dashboard will be composed of several widgets, each displaying key information.

### 4.1. Key Performance Indicators (KPIs)

A summary row at the top of the dashboard will display the following KPIs:

*   **Current Balance:** The client's total outstanding balance (AR - AP).
*   **Credit Utilization:** The percentage of the credit limit currently in use.
*   **Leaderboard Rank:** The client's current rank on the anonymized leaderboard.
*   **Active Listings:** The number of active needs and supply listings.

### 4.2. Dashboard Widgets

The main area of the dashboard will feature the following widgets:

*   **Recent Transactions:** A list of the 5 most recent transactions (invoices, payments, orders).
*   **Credit Summary:** A visual representation of the client's credit limit and usage.
*   **My Marketplace:** A summary of the client's active needs and supply listings.
*   **Leaderboard Snapshot:** A simplified view of the client's leaderboard position.

## 5. Transaction History

The Transaction History page will provide clients with a comprehensive and searchable view of all their past transactions. This feature is read-only and is designed to provide complete transparency.

### 5.1. Data Display

The transaction history will be displayed in a paginated table with the following columns:

*   **Date:** The date of the transaction.
*   **Type:** The type of transaction (e.g., INVOICE, PAYMENT, ORDER, QUOTE).
*   **Number:** The unique identifier for the transaction (e.g., invoice number).
*   **Amount:** The total amount of the transaction.
*   **Status:** The current status of the transaction (e.g., PAID, PENDING, OVERDUE).

### 5.2. Filtering and Sorting

Clients will be able to filter and sort their transaction history by:

*   **Date Range:** A specific start and end date.
*   **Transaction Type:** One or more transaction types.
*   **Status:** One or more transaction statuses.

### 5.3. Transaction Details

Clicking on a transaction in the table will open a detailed view, showing all line items, associated notes, and a link to download a PDF copy of the original document (where applicable).

## 6. Accounts Receivable & Payable

This section will provide a clear and concise overview of the client's financial position, separated into Accounts Receivable (what they owe) and Accounts Payable (what is owed to them).

### 6.1. Accounts Receivable (AR)

A table will display all outstanding invoices, including:

*   **Invoice Number:** The unique identifier for the invoice.
*   **Issue Date:** The date the invoice was issued.
*   **Due Date:** The date the invoice is due.
*   **Amount Due:** The outstanding balance on the invoice.
*   **Status:** The current status (e.g., DUE, OVERDUE).

A summary at the top will show the total amount outstanding and the total amount overdue.

### 6.2. Accounts Payable (AP)

A similar table will display all outstanding bills from the client, including:

*   **Bill Number:** The unique identifier for the bill.
*   **Issue Date:** The date the bill was issued.
*   **Due Date:** The date the bill is due.
*   **Amount Due:** The outstanding balance on the bill.
*   **Status:** The current status (e.g., DUE, PENDING APPROVAL).

A summary at the top will show the total amount owed to the client.

## 7. Anonymized Leaderboard

The Anonymized Leaderboard is a feature designed to foster a sense of friendly competition and encourage positive engagement. It will display the client's rank among other VIP clients without revealing any sensitive information.

### 7.1. Display

The leaderboard will be presented as a list of rankings (e.g., #1, #2, #3), with the client's own rank highlighted. All other entries will be anonymized, showing only the rank and a generic identifier (e.g., "Client A," "Client B").

### 7.2. Ranking Logic

The ranking will be determined by a proprietary algorithm that takes into account various factors, including:

*   **Transaction Volume:** The total value of transactions over a specific period.
*   **Payment History:** The timeliness and consistency of payments.
*   **Engagement:** The frequency and quality of interactions with the platform.

The exact weighting of these factors will be managed internally and will not be exposed to the client.

### 7.3. Improvement Suggestions

To make the leaderboard more actionable, the portal will provide simple, pre-built phrases to guide clients on how to improve their ranking. These suggestions will be based on their current performance and will be displayed prominently on the leaderboard page. Examples include:

*   "To improve your rank, consider increasing your transaction volume."
*   "Paying your invoices on time is a great way to climb the leaderboard."

## 8. Credit Limit & Usage

This section will provide clients with a clear and transparent view of their credit status, leveraging the data from the TERP Credit Intelligence System.

### 8.1. Credit Summary

A dedicated page will display the following information:

*   **Credit Limit:** The client's total approved credit limit.
*   **Credit Usage:** The amount of credit currently in use.
*   **Available Credit:** The remaining credit available to the client.

This information will be presented both numerically and visually, using a progress bar or a similar graphic to illustrate credit utilization.

### 8.2. Credit History

A simplified credit history will be available, showing recent changes to the credit limit and the primary reason for the change. For example:

*   **October 2025:** Credit limit increased to $50,000 (Reason: Consistent on-time payments).
*   **July 2025:** Credit limit increased to $40,000 (Reason: Increased transaction volume).

### 8.3. Improvement Suggestions

Similar to the leaderboard, this section will provide actionable advice on how clients can increase their credit limit. These suggestions will be based on the logic from the Credit Intelligence System and will be presented in a clear and easy-to-understand format. Examples include:

*   "To increase your credit limit, focus on paying down your outstanding balance."
*   "A consistent history of on-time payments is a key factor in credit limit reviews."

## 9. Marketplace (Client Needs & Supply)

This section of the portal allows clients to directly input what products they are looking for (Needs) and what products they have available to sell (Supply). This data is then used by the internal TERP Needs Matching Engine to identify potential opportunities. The client will not see any matches or other clients' listings.

### 9.1. My Listings

A central page will display the client's active needs and supply listings in two separate tables. Each table will show:

*   **Listing Type:** Need or Supply.
*   **Product Details:** Key product information (e.g., strain, category).
*   **Quantity:** The amount needed or available.
*   **Price:** The target price (for needs) or asking price (for supply).
*   **Status:** The current status of the listing (e.g., ACTIVE, EXPIRED).
*   **Expires:** The date the listing is set to expire.

Clients will be able to edit or cancel their active listings from this page.

### 9.2. Creating a New Listing

A unified form will be used to create both need and supply listings. The form will be standardized to align with the existing TERP product data structure.

#### 9.2.1. Input Fields

The form will include the following fields, leveraging the existing schema from `client_needs` and `vendor_supply`:

*   **Listing Type:** A toggle to select either "I Need" or "I Have to Sell."
*   **Product Specification:**
    *   **Strain:** A searchable dropdown populated from the `strains` table.
    *   **Category:** A dropdown populated from the `products` table.
    *   **Subcategory:** A dependent dropdown based on the selected category.
    *   **Grade:** A text input for the product grade.
*   **Quantity & Pricing:**
    *   **Quantity:** The amount of product needed or for sale.
    *   **Price:** The maximum price the client is willing to pay (for needs) or the asking price (for supply).
*   **Expiration:**
    *   **Expires In:** A dropdown with options for the listing's duration (e.g., 1 day, 5 days, 1 week, 1 month).
    *   The default expiration will be 5 days, but the client can change this on a per-listing basis. The default can also be changed by a TERP administrator in the main application.

### 9.3. Data Integration

*   **Needs:** When a client submits a "Need" listing, a new record will be created in the `client_needs` table.
*   **Supply:** When a client submits a "Supply" listing, a new record will be created in the `vendor_supply` table, with the `vendorId` linked to the client's ID.

This direct data entry will ensure that the Needs Matching Engine has the most current and accurate information to work with.

## 10. Technical Implementation

### 10.1. Technology Stack

*   **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui (consistent with the main TERP application).
*   **Backend:** A new set of tRPC endpoints will be created to serve the portal, following the existing patterns in the TERP codebase.
*   **Database:** The portal will use the existing TERP MySQL database.

### 10.2. API Endpoints

A new set of tRPC routers will be created for the portal, prefixed with `/portal`. These will include:

*   `portal.auth.login`: Authenticate the client and return a session token.
*   `portal.auth.logout`: Terminate the client's session.
*   `portal.dashboard.getKPIs`: Fetch the key performance indicators for the dashboard.
*   `portal.transactions.list`: Get a paginated list of the client's transactions.
*   `portal.ar.list`: Get a list of the client's outstanding invoices.
*   `portal.ap.list`: Get a list of the client's outstanding bills.
*   `portal.leaderboard.getRank`: Get the client's anonymized leaderboard rank.
*   `portal.credit.getSummary`: Get the client's credit limit and usage.
*   `portal.marketplace.listNeeds`: Get a list of the client's active needs.
*   `portal.marketplace.listSupply`: Get a list of the client's active supply listings.
*   `portal.marketplace.createNeed`: Create a new need listing.
*   `portal.marketplace.createSupply`: Create a new supply listing.

### 10.3. Database Schema

No major schema changes are anticipated, as the portal will primarily read from and write to existing tables. The `vendor_supply` table will be used to store client supply listings, with the `vendorId` referencing the client's ID.

## 11. UI/UX Considerations

*   **Simplicity and Clarity:** The portal should be intuitive and easy to navigate, with a clean and modern design.
*   **Mobile-First:** The portal must be fully responsive and optimized for mobile devices.
*   **Consistency:** The UI should be consistent with the design language of the main TERP application.
*   **Performance:** The portal should be fast and responsive, with optimized data loading and minimal latency.

## 12. Future Enhancements

*   **Email Notifications:** Proactive email alerts for significant account activities.
*   **Two-Factor Authentication (2FA):** Enhanced security for client accounts.
*   **Document Uploads:** Allow clients to upload documents directly to their profile.
*   **Direct Communication:** A secure messaging feature for clients to communicate with their account manager.

This specification provides a comprehensive blueprint for the VIP Client Portal. By leveraging the existing TERP infrastructure and data models, the portal can be developed efficiently while providing significant value to both the clients and the internal team.
