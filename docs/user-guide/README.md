# TERP User Guide

**Version:** 1.0.0  
**Last Updated:** 2025-12-31

---

## Welcome to TERP

TERP is a comprehensive Cannabis ERP (Enterprise Resource Planning) system designed to streamline your business operations. This guide covers all major features and workflows to help you get the most out of the platform.

---

## Quick Start

1. **Login** at [https://terp-app-b9s35.ondigitalocean.app](https://terp-app-b9s35.ondigitalocean.app)
2. Navigate using the **sidebar menu** on the left
3. Use the **global search** (top bar) to quickly find clients, orders, or products
4. Check the **Dashboard** for key metrics and alerts

**New to TERP?** Start with the [Getting Started Guide](./getting-started.md) for a complete walkthrough.

---

## Feature Guides

### Accounting & Finance

- [Accounting Features](./accounting.md) - Quick payments, journal entries, chart of accounts
  - WS-001: Receive Client Payment (Cash Drop-off)
  - WS-002: Pay Vendor (Cash Out)
  - WS-006: Immediate Tab Screenshot/Receipt

### Warehouse Operations

- [Pick & Pack Module](./pick-pack.md) - Order fulfillment and packing
  - WS-003: Group Bagging/Packing Action
  - WS-009: Inventory Movement SOP Flow

### Sales & CRM

- [Sales Features](./sales.md) - Order management and customer relationships
  - WS-004: Multi-Order & Referral Credit System
  - WS-011: Quick Customer Creation
  - WS-012: Customer Preferences & Purchase History
  - WS-015: Customer Wishlist Field

### Inventory Management

- [Inventory Features](./inventory.md) - Stock management and tracking
  - WS-007: Complex Flower Intake Flow
  - WS-008: Low Stock & Needs-Based Alerts
  - WS-010: Photography Module

### Task Management

- [Task Management](./tasks.md) - SOPs and task tracking
  - WS-013: Simple Task Management (Non-Inventory SOPs)

### Vendor Management

- [Vendor Features](./vendors.md) - Supplier relationships
  - WS-014: Vendor "Harvesting Again" Reminder

---

## Core Modules

| Module          | Description                             | Primary Users         |
| --------------- | --------------------------------------- | --------------------- |
| **Dashboard**   | Overview metrics, alerts, quick actions | All users             |
| **Inventory**   | Batch management, stock levels, intake  | Warehouse, Purchasing |
| **Sales**       | Orders, quotes, sales sheets            | Sales team            |
| **Clients**     | Customer profiles, credit, history      | Sales, Accounting     |
| **Accounting**  | Payments, invoices, ledger              | Accounting team       |
| **Pick & Pack** | Order fulfillment, packing              | Warehouse             |
| **Calendar**    | Scheduling, reminders                   | All users             |
| **Analytics**   | Reports, leaderboards                   | Management            |
| **Admin**       | User management, settings               | Administrators        |

---

## Navigation

### Sidebar Menu

The sidebar provides access to all major modules:

```
📊 Dashboard
📦 Inventory
💰 Sales
👥 Clients
🧾 Accounting
📋 Pick & Pack
📅 Calendar
📈 Analytics
⚙️ Settings
```

### Global Search

Press `/` or click the search bar to search across:

- Clients (by name, email, phone, TERI code)
- Products (by code, SKU)
- Quotes (by number, notes)

### Quick Actions

Access common tasks quickly from the Dashboard:

- **+ New Order** - Create a sales order
- **+ New Client** - Add a customer
- **Receive Payment** - Record client payment
- **Pay Vendor** - Record vendor payment

---

## Getting Help

### In-App Help

- Hover over icons for tooltips
- Click `?` icons for contextual help
- Check the notification bell for alerts

### Support Resources

- [Getting Started](./getting-started.md) - Quick start guide for new users
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [FAQ](./FAQ.md) - Frequently asked questions
- [API Documentation](../api/README.md) - For developers
- [Developer Guide](../dev-guide/README.md) - Technical documentation

---

## Keyboard Shortcuts

| Shortcut | Action               |
| -------- | -------------------- |
| `/`      | Focus global search  |
| `Esc`    | Close modal/dialog   |
| `Tab`    | Navigate form fields |
| `Enter`  | Submit form          |
| `Ctrl+S` | Save current form    |

---

## Browser Requirements

TERP works best with modern browsers:

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

---

_For technical issues, contact your system administrator._
