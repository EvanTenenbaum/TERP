# Uncovered Issues - Specification

This document outlines the specifications for fixing issues that were not previously covered in the roadmap.

## 1. Inventory Fetch Errors (BUG-050)

**Problem:** Creating an Order or Quote requires selecting inventory, but the inventory fetch repeatedly fails. The UI leaves “Add Item” active, misleading the user.

**Goal:** Fix the inventory fetch error and provide a better user experience.

**Acceptance Criteria:**
- [ ] Inventory items load successfully when creating an Order or Quote.
- [ ] The “Add Item” button is disabled if inventory fails to load.
- [ ] A user-friendly error message is displayed if inventory fails to load.

## 2. Unimplemented Workflows (FEATURE-020)

**Problem:** Key procurement steps such as requisition approval, vendor selection, purchase-order generation, receiving/inspection, and invoice matching are absent. Modules like Fulfillment, Pick & Pack, Procurement, Returns, and Samples display empty tables or placeholder text.

**Goal:** Implement the core procurement and fulfillment workflows.

**Acceptance Criteria:**
- [ ] **Procurement:**
    - [ ] Create and approve requisitions.
    - [ ] Select vendors and generate purchase orders.
- [ ] **Fulfillment:**
    - [ ] Implement Pick & Pack workflow.
    - [ ] Implement Returns workflow.
- [ ] **Samples:**
    - [ ] Implement sample request and tracking workflow.

## 3. No Meaningful Reporting (FEATURE-021)

**Problem:** Dashboard metrics display zeros or placeholders. There is no procurement-specific dashboard summarizing open requests, orders, receipts, or supplier performance.

**Goal:** Implement meaningful reporting and dashboards.

**Acceptance Criteria:**
- [ ] Dashboard metrics display real data.
- [ ] A procurement-specific dashboard is created with relevant metrics.

## 4. No Contact or Help Pages (FEATURE-022)

**Problem:** There is no accessible “About,” “Contact,” or policy pages, which reduces trust.

**Goal:** Create “About,” “Contact,” and policy pages.

**Acceptance Criteria:**
- [ ] An “About” page is created with company information.
- [ ] A “Contact” page is created with a contact form.
- [ ] A “Privacy Policy” page is created.
- [ ] A “Terms of Service” page is created.
