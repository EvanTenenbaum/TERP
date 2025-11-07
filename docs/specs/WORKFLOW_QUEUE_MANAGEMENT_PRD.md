# PRD: Workflow Queue Management

**Author**: Manus AI  
**Date**: November 6, 2025  
**Status**: DRAFT
**Roadmap ID**: 1.3

---

## 1. Overview

This document outlines the requirements for a **Workflow Queue Management** system. This feature will provide operational teams with a clear, Kanban-style view of products as they move through various stages of the intake and preparation process. The goal is to improve efficiency, reduce bottlenecks, and provide clarity on what needs to be done, by whom, and when.

## 2. Problem Statement

Currently, there is no centralized way to track the status of a product as it moves from initial check-in to being ready for sale. Teams like photography, quality assurance, and inventory management work in silos, leading to inefficiencies, delays, and a lack of visibility. It is difficult to know how many products are in the queue for photography or which items are ready for final inspection. This creates a significant operational bottleneck.

## 3. Goals

-   **Increase Operational Efficiency**: Provide a clear, actionable list of tasks for each team.
-   **Improve Visibility**: Allow managers to see the status of all products in the workflow at a glance.
-   **Reduce Bottlenecks**: Identify which stages are causing delays and reallocate resources accordingly.
-   **Enhance Accountability**: Clearly assign tasks and queues to specific user roles.

## 4. User Scenarios

-   **As an Inventory Check-in Clerk**, I want to see a list of all products that have been delivered but not yet checked in, so I can process them.
-   **As a Product Photographer**, I want to see a queue of all products that have been checked in and are ready for photography, so I can work through my task list efficiently.
-   **As a QA Manager**, I want to see how many items are pending quality assurance, so I can manage my team's workload.
-   **As an Operations Manager**, I want to view all queues to understand the overall health of the product pipeline and identify bottlenecks.

## 5. Core Features & Requirements

### 5.1. Product Status Field

-   A new, mandatory `status` field must be added to the `products` table in the database schema (`drizzle/schema.ts`).
-   This field should be an `enum` with a predefined set of statuses. The initial set of statuses will be:
    -   `Pending Check-in`
    -   `Pending Photography`
    -   `Pending Quality Assurance`
    -   `Ready for Sale`
    -   `On Hold`
    -   `Archived`
-   The status list must be easily extensible for future additions.

### 5.2. Workflow Queue View Page

-   A new, dedicated page in the application titled "Workflow Queues".
-   This page will display products in a Kanban-style board, with columns representing each status.
-   Each product will be represented as a card, showing key information (e.g., Product Name, SKU, Date Received).
-   **Drag-and-Drop Functionality**: Users should be able to drag a product card from one status column to the next to update its status.

### 5.3. Role-Based Queue Visibility

-   The Workflow Queue page will be integrated with the **User Roles & Permissions** system (Roadmap ID 1.2).
-   System administrators can configure which roles have permission to view which queues and which roles can transition items between statuses.
-   For example, the "Photography" role might only see the `Pending Photography` queue and only have permission to move items to `Pending Quality Assurance`.

### 5.4. Status Transitions from Item Page

-   In addition to the Kanban board, users should be able to update a product's status directly from the individual inventory item page.
-   This will be a dropdown menu showing the available next statuses, governed by the user's permissions.

## 6. Technical Considerations

-   **Real-time Updates**: The Kanban board should ideally update in real-time (or near real-time) as statuses change. WebSockets or a polling mechanism could be considered.
-   **Performance**: The queue view must be performant, even with thousands of products. Efficient database queries and frontend virtualization will be necessary.
-   **Dependency**: This feature is highly dependent on the **User Roles & Permissions** system (1.2) for its access control logic.

## 7. Testing Requirements

-   **Unit Tests**: For the status transition logic.
-   **Integration Tests**: To verify that status changes are correctly saved to the database and that role-based permissions are enforced.
-   **End-to-End Tests**: To simulate a user dragging a card from one column to another and verifying the UI and database are updated correctly. Test the role-based visibility to ensure users only see the queues they are supposed to.

## 8. Success Metrics

-   The system is successful if a manager can configure role-based queues and an operational user can efficiently manage their tasks using the Kanban view.
-   A measurable reduction in the time it takes for a product to move from `Pending Check-in` to `Ready for Sale`.
-   Positive feedback from operational teams that the new system has improved their workflow.
