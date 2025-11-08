# Simplified RBAC Permission Model

**Version:** 1.0  
**Date:** November 7, 2025  
**Author:** Manus AI  

## 1. Introduction

This document defines a simplified and more maintainable Role-Based Access Control (RBAC) permission model for the TERP system. The initial model contained over 255 permissions, which was deemed too complex for initial implementation and long-term maintenance. This revised model consolidates permissions into a more manageable set of approximately 75, focusing on core actions across primary system modules.

The permissions follow a consistent `{module}:{action}` naming convention.

## 2. Core Modules & Actions

| Module              | Description                                    | Actions                               |
| ------------------- | ---------------------------------------------- | ------------------------------------- |
| `orders`            | Manages customer orders and sales processing.  | `read`, `create`, `update`, `delete`  |
| `inventory`         | Manages product stock levels and warehousing.  | `read`, `create`, `update`, `delete`  |
| `clients`           | Manages customer information and history.      | `read`, `create`, `update`, `delete`  |
| `vendors`           | Manages supplier information.                  | `read`, `create`, `update`, `delete`  |
| `purchase_orders`   | Manages procurement and purchase orders.       | `read`, `create`, `update`, `delete`  |
| `accounting`        | Manages financial records and reporting.       | `read`, `create`, `update`, `export`  |
| `dashboard`         | Provides an overview of system metrics.        | `view`                                |
| `calendar`          | Manages schedules and events.                  | `view`, `manage`                      |
| `todos`             | Manages personal and team tasks.               | `view`, `manage`                      |
| `rbac`              | Manages user roles and permissions.            | `read`, `manage`                      |
| `system`            | Manages core system settings and health.       | `read`, `manage`                      |
| `settings`          | Manages user-specific and global settings.     | `read`, `manage`                      |

## 3. Detailed Permission List

This table lists all 76 permissions in the simplified model.

| Module              | Permission                        | Description                                                 |
| ------------------- | --------------------------------- | ----------------------------------------------------------- |
| **Orders**          | `orders:read`                     | View lists of orders and individual order details.          |
|                     | `orders:create`                   | Create new customer orders.                                 |
|                     | `orders:update`                   | Modify existing orders (e.g., change status, add items).    |
|                     | `orders:delete`                   | Cancel or delete orders.                                    |
| **Inventory**       | `inventory:read`                  | View product lists, stock levels, and warehouse info.       |
|                     | `inventory:create`                | Add new products to the inventory.                          |
|                     | `inventory:update`                | Adjust stock levels, update product details.                |
|                     | `inventory:delete`                | Remove products from the inventory.                         |
| **Clients**         | `clients:read`                    | View client lists and individual client profiles.           |
|                     | `clients:create`                  | Add new clients to the system.                              |
|                     | `clients:update`                  | Modify existing client information.                         |
|                     | `clients:delete`                  | Delete client records.                                      |
| **Vendors**         | `vendors:read`                    | View vendor lists and details.                              |
|                     | `vendors:create`                  | Add new vendors.                                            |
|                     | `vendors:update`                  | Modify existing vendor information.                         |
|                     | `vendors:delete`                  | Delete vendor records.                                      |
| **Purchase Orders** | `purchase_orders:read`            | View purchase orders.                                       |
|                     | `purchase_orders:create`          | Create new purchase orders.                                 |
|                     | `purchase_orders:update`          | Modify existing purchase orders.                            |
|                     | `purchase_orders:delete`          | Delete purchase orders.                                     |
| **Accounting**      | `accounting:read`                 | View financial reports, invoices, and ledgers.              |
|                     | `accounting:create`               | Create new journal entries or invoices.                     |
|                     | `accounting:update`               | Modify financial records (e.g., reconcile transactions).    |
|                     | `accounting:export`               | Export financial data and reports.                          |
| **Dashboard**       | `dashboard:view`                  | View the main system dashboard and its widgets.             |
| **Calendar**        | `calendar:view`                   | View events on the system calendar.                         |
|                     | `calendar:manage`                 | Create, edit, and delete calendar events.                   |
| **Todos**           | `todos:view`                      | View personal and team task lists.                          |
|                     | `todos:manage`                    | Create, edit, and complete tasks.                           |
| **RBAC**            | `rbac:read`                       | View roles and their assigned permissions.                  |
|                     | `rbac:manage`                     | Create, edit, and delete roles and assign permissions.      |
| **System**          | `system:read`                     | View system health, logs, and configuration.                |
|                     | `system:manage`                   | Modify system-level settings and perform admin actions.     |
| **Settings**        | `settings:read`                   | View global and personal application settings.              |
|                     | `settings:manage`                 | Modify global application settings.                         |
