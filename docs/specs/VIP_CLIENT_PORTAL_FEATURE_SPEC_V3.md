
# VIP Client Portal Feature Specification

**Version:** 3.0  
**Author:** Manus AI  
**Date:** October 30, 2025  
**Status:** Final

## 1. Introduction

This document outlines the feature specification for the TERP VIP Client Portal. The portal is a secure, client-facing web application designed to provide high-value clients with direct access to their account information, transaction history, and credit status. It also serves as a bidirectional marketplace for clients to post their product needs and available supply, feeding valuable data into the internal TERP Needs Matching Engine.

### 1.1. Goals and Objectives

The primary goals of the VIP Client Portal are to:

*   **Provide Information:** Offer clients a centralized and transparent source for their account data.
*   **Streamline Data Acquisition:** Capture client needs and supply directly, improving the accuracy and timeliness of data for the internal Needs Matching Engine.
*   **Strengthen Client Relationships:** Provide value-added features like the VIP Tier System and actionable recommendations to foster loyalty and growth.

### 1.2. Scope

This specification covers the design and functionality of the client-facing portal. It includes:

*   User Authentication (Single User)
*   Modular Dashboard
*   Financial Hub (Informational)
*   VIP Tier System
*   Credit Center
*   Marketplace (Client Needs & Supply)

---

## 2. Authentication

The portal will feature a secure authentication system for a single user per VIP client.

### 2.1. Authentication Methods

*   **Password Login:** Standard email and password authentication.
*   **Single Sign-On (SSO):** Integration with Google and Microsoft for one-click login.

### 2.2. Session Management

*   The session will persist for 30 days, as defined in the existing authentication configuration.
*   A "Logout" button will be available to manually terminate the session.

### 2.3. Password Reset

*   A "Forgot Password" link will be available on the login page.
*   This will initiate a secure password reset flow, sending a time-sensitive reset link to the client's registered email address.

---

## 3. Dashboard and Portal Modules

The dashboard will be a clean, informational landing page that provides a high-level overview of the client's account through a series of distinct modules.

### 3.1. Modular Layout

The dashboard will feature the following modules:

*   **Accounts Receivable:** A summary of outstanding invoices.
*   **Accounts Payable:** A summary of outstanding bills.
*   **Credit Utilization:** A visualization of the client's credit status.
*   **Marketplace Listings:** A snapshot of active needs and supply listings.
*   **VIP Tier Status:** The client's current VIP tier and progress.

### 3.2. Key Performance Indicators (KPIs)

A summary row will display the following KPIs:

*   **Current Balance:** The client's total outstanding balance (AR - AP).
*   **Credit Utilization:** The percentage of the credit limit currently in use.

---

## 4. Financial Hub (Informational)

This section provides a clear and concise overview of the client's financial position. This section is for informational purposes only; no payments can be made through the portal.

### 4.1. Accounts Receivable (AR)

A table will display all outstanding invoices. Overdue invoices will be listed first and highlighted in red for emphasis. This module will only be visible if the client has outstanding AR.

### 4.2. Accounts Payable (AP)

A similar table will display all outstanding bills from the client. Overdue bills will be listed first and highlighted in red. This module will only be visible if the client has outstanding AP.

### 4.3. Transaction History

A paginated table will provide a comprehensive, searchable view of all past transactions, with options to filter by date range, transaction type, and status. Clients can also download PDF copies of original documents.

---

## 5. VIP Tier System

The VIP Tier System is designed to reward client loyalty and engagement.

### 5.1. Tiers and Rewards

Clients are assigned to Platinum, Gold, or Silver tiers based on performance metrics, with each tier offering a different level of rewards and benefits.

### 5.2. Admin-Side Management

Internal TERP users will have the ability to manage the rules and parameters of the VIP Tier System from the main TERP settings page.

---

## 6. Credit Center

This section provides clients with a transparent view of their credit status.

### 6.1. Credit Summary

A dedicated page will display the client's credit limit, credit usage, and available credit, along with a visual representation of their credit utilization.

### 6.2. Credit History

A simplified credit history will be available, showing recent changes to the credit limit and the primary reason for the change.

### 6.3. Improvement Suggestions

The portal will provide actionable advice on how clients can improve their credit standing, based on their specific account data.

---

## 7. Marketplace (Client Needs & Supply)

This section allows clients to directly input their product needs and available supply.

### 7.1. Needs (I Need to Buy)

*   A dedicated form for submitting needs.
*   The expiration duration for a need is a **required** field.

### 7.2. Supply (I Have to Sell)

*   A dedicated form for submitting supply.
*   The strain field allows users to select an existing strain or **input a new one**.
*   The form includes a field for selecting from a list of **predefined tags**.
*   The asking price field supports a **price range (min/max)** or a single firm price.

---

## 8. Admin-Side Features (Internal)

To provide better client management, the following features will be available to internal TERP users:

### 8.1. VIP Client Last Login Tracking

Internal users can view the last login date and time for each VIP client to track portal engagement and adoption.
