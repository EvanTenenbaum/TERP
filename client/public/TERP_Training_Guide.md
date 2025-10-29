# TERP: A Visual Training Guide

Welcome to TERP! This guide provides a visual walkthrough of the key features and workflows in your new ERP system. We focus on what TERP does and how it can make your work easier, with a special look at the intelligent features working behind the scenes.

---

## Module 1: Dashboard - Your Command Center

The TERP dashboard is your central hub for real-time business insights. It provides a customizable, at-a-glance view of your most important metrics.

### Key Highlights

- **Customizable Data Cards**: Choose the metrics that matter most to you.
- **Real-time Updates**: See live data on sales, inventory, and orders.
- **Drill-Down Navigation**: Click any metric to dive deeper into the details.

### Visual Walkthrough

**1. Dashboard Overview**

Your dashboard provides a comprehensive overview of your business, including sales data, inventory levels, and top-performing clients.

![Dashboard Overview](terp_training_screenshots/01_dashboard_overview.webp)

**2. Customizing Your Dashboard**

Tailor the dashboard to your needs by selecting which data cards are visible. This allows you to focus on the information that is most relevant to your role.

![Dashboard Customization](terp_training_screenshots/02_dashboard_customize.webp)

### Backend Intelligence

The dashboard isn't just a static display. It's powered by a real-time data pipeline that constantly updates your metrics. The system automatically calculates trends, alerts you to important changes (like low inventory), and highlights urgent tasks (like pending orders) without any manual intervention.

---

## Module 2: Inventory Management - Know Your Stock

TERP's inventory system is designed for precision and control. It allows you to track your stock from intake to sale, with a powerful batch system and detailed location management.

### Key Highlights

- **Batch System**: Every product is tracked as a unique batch, giving you granular control.
- **Location Hierarchy**: A 5-level system (Site → Zone → Rack → Shelf → Bin) for precise physical tracking.
- **Status Workflow**: A clear lifecycle for each batch, from `AWAITING_INTAKE` to `SOLD`.
- **COGS Tracking**: Manage your cost of goods sold with either fixed or range-based costing.

### Visual Walkthrough

**1. Inventory Overview**

The main inventory page gives you a high-level view of your stock, including total value, average cost, and stock levels by category.

![Inventory Overview](terp_training_screenshots/03_inventory_overview.webp)

### Backend Intelligence

TERP's inventory system is packed with smart features:

- **Automatic Profitability Calculation**: The system instantly calculates margin, markup, and ROI for every batch.
- **Price Simulation Tool**: Test different pricing strategies to see the potential impact on your profits before you commit.
- **Smart Filters**: TERP remembers your filter preferences, so you can quickly return to your most-used views.

---

## Module 3: Orders & Fulfillment - From Quote to Delivery

TERP streamlines your entire order process, from creating quotes to managing returns. The unified system makes it easy to track every order from start to finish.

### Key Highlights

- **Unified Order System**: Manage both quotes and sales orders in one integrated view.
- **Simple 3-Step Fulfillment**: A clear and simple `PENDING` → `PACKED` → `SHIPPED` workflow.
- **Integrated Returns**: Process returns directly from the original order, automatically updating inventory.
- **Complete Status History**: Every action is logged, providing a full audit trail for each order.

### Visual Walkthrough

**1. Orders Overview**

The orders page shows all your confirmed orders, with clear status indicators and key information at a glance.

![Orders Overview](terp_training_screenshots/04_orders_overview.webp)

*Note: The detailed order view, including the fulfillment workflow and returns interface, appears to be under development as it currently returns a "Page Not Found" error. The functionality is built in the backend and will be accessible here once the UI is fully deployed.*

### Backend Intelligence

- **Automated Inventory Decrements**: When an order is marked as shipped, the inventory is automatically and instantly updated.
- **Transactional Integrity**: All status changes are logged with a timestamp and user ID, ensuring a reliable audit trail.
- **Real-time Restocking**: When a return is processed, the inventory is immediately updated to reflect the restocked items.

---

## Module 4: Client Management - Know Your Customers

TERP provides a comprehensive client management system to help you build strong customer relationships and track every interaction.

### Key Highlights

- **Complete Client Profiles**: All your customer information in one place.
- **Communication Logging**: Keep a record of every call, email, and meeting.
- **Needs Tracking**: Document what your clients are looking for to better serve them.
- **Full Order History**: See every transaction a client has made.

### Visual Walkthrough

**1. Clients Overview**

The clients page provides a complete list of your customers, with powerful search and filtering capabilities.

![Clients Overview](terp_training_screenshots/05_clients_overview.webp)

### Backend Intelligence

- **Automatic Timelines**: All communications are automatically sorted into a chronological timeline for each client.
- **Smart Matching**: The system can match client needs against your available inventory, helping you find sales opportunities.
- **Data-Driven Insights**: Analyze purchase history to understand customer behavior and provide better service.

---

## Important Note on Feature Availability

During our review, we noticed that some pages and features returned a "Page Not Found" error, including:

- **Analytics Page**
- **Accounting Reports (Income Statement, Balance Sheet)**
- **Detailed Order Views**

This indicates that while the backend functionality for these features is in place, the user interface may not be fully deployed yet. This guide focuses on the features that are currently live and accessible. As the remaining pages are deployed, this guide will be updated.

This concludes the initial version of the TERP Visual Training Guide. We will continue to expand this guide as more features become available.

