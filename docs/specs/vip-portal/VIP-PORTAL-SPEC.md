# VIP Portal Spec

## Overview

The VIP Portal is a customer-facing dashboard that provides clients with a real-time view of their account status, orders, and other key information.

## Key Features

- **Dashboard:** KPI cards, recent activity, quick actions
- **Orders:** View order history, track shipments
- **Financials:** View invoices, statements, and make payments
- **Appointments:** Book appointments with account managers
- **Notifications:** Receive real-time updates

## Task Breakdown

| Task ID  | Title                                | Description                                                            |
| -------- | ------------------------------------ | ---------------------------------------------------------------------- |
| VIP-F-01 | Fix Dashboard KPI Rendering          | Ensure all KPI cards render correctly and handle loading/error states. |
| VIP-F-02 | Fix Catalog Rendering                | Ensure product catalog displays correctly with images and pricing.     |
| VIP-F-03 | Fix AR/AP Amount Display             | Ensure financial amounts are formatted correctly.                      |
| VIP-M-01 | Implement Mobile-First Navigation    | Create a responsive navigation menu for mobile devices.                |
| VIP-A-01 | Make KPIs Actionable                 | Link KPI cards to filtered views.                                      |
| VIP-A-02 | Make Financials Actionable           | Link invoices to PDF downloads.                                        |
| VIP-A-03 | Implement Interest List Flow         | Allow clients to express interest in out-of-stock items.               |
| VIP-C-01 | Implement Appointment Booking UI     | Client-facing slot selection, booking form, and confirmation.          |
| VIP-C-02 | Implement In-App Notification System | Integrate with the unified notification service.                       |
| VIP-B-01 | Implement PDF Generation             | Generate PDFs for invoices and bills.                                  |
