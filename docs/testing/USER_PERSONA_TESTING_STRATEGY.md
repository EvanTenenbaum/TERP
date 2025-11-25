# User Persona-Based Testing Strategy for TERP

**Date:** November 24, 2025  
**Approach:** Test each module from the perspective of actual users performing real workflows

---

## Why Persona-Based Testing?

**Previous Testing Flaw:** Element-focused testing (clicking buttons, opening modals) without understanding **why** a user would do that or **what** they're trying to accomplish.

**Persona-Based Testing:** Adopt the mindset, goals, and workflows of actual users to identify:
- Missing features that users need
- Broken workflows that prevent task completion
- Confusing UX that doesn't match user mental models
- Data validation issues in real-world scenarios
- Integration gaps between modules

---

## TERP User Personas

### Persona 1: Owner/Manager (Sarah)
**Role:** Business owner of cannabis dispensary  
**Goals:** Monitor business health, make strategic decisions, track profitability  
**Daily Tasks:**
- Check dashboard for sales, cash flow, inventory value
- Review analytics for trends and insights
- Monitor debt (AR/AP)
- Assess profitability by product, client, time period
- Make pricing and purchasing decisions

**Modules Used:** Dashboard, Analytics, Accounting (high-level), Settings  
**Key Workflows:**
1. Morning business health check
2. Weekly sales trend analysis
3. Monthly profitability review
4. Quarterly strategic planning

---

### Persona 2: Sales Manager (Marcus)
**Role:** Manages client relationships and sales operations  
**Goals:** Maximize sales, maintain client satisfaction, optimize pricing  
**Daily Tasks:**
- Create and manage orders for clients
- Generate sales sheets for client meetings
- Update pricing rules and profiles
- Track client purchase history and preferences
- Identify upsell opportunities
- Manage matchmaking between buyers and sellers

**Modules Used:** Orders, Clients, Sales Sheets, Pricing Rules, Pricing Profiles, Matchmaking  
**Key Workflows:**
1. Create new order for existing client
2. Onboard new client and set pricing profile
3. Generate sales sheet for client meeting
4. Review client purchase history before call
5. Match buyer need with available inventory
6. Update pricing based on market conditions

---

### Persona 3: Inventory Manager (Lisa)
**Role:** Manages product inventory and stock levels  
**Goals:** Prevent stockouts, minimize waste, track batches, optimize storage  
**Daily Tasks:**
- Monitor inventory levels across locations
- Record new product purchases (batches)
- Adjust inventory for waste, samples, theft
- Transfer inventory between locations
- Track batch compliance data
- Generate inventory reports

**Modules Used:** Inventory, Locations, Purchase Orders (receiving)  
**Key Workflows:**
1. Receive new product purchase and create batch
2. Adjust inventory for waste/samples
3. Transfer inventory between locations
4. Check stock levels before sales meeting
5. Track batch from purchase to sale (compliance)
6. Identify slow-moving inventory

---

### Persona 4: Accountant (David)
**Role:** Manages financial records and compliance  
**Goals:** Accurate books, timely collections, vendor payment management, tax compliance  
**Daily Tasks:**
- Record cash collections from clients
- Record payments to vendors
- Track accounts receivable aging
- Track accounts payable aging
- Reconcile cash accounts
- Generate financial reports
- Manage chart of accounts

**Modules Used:** Accounting, Orders (invoicing), Purchase Orders (bills)  
**Key Workflows:**
1. Record daily cash collections
2. Apply payment to specific invoices
3. Review AR aging and follow up on overdue accounts
4. Process vendor bills and schedule payments
5. Month-end close and reconciliation
6. Generate financial statements

---

### Persona 5: Operations Manager (Jennifer)
**Role:** Coordinates daily operations and team tasks  
**Goals:** Ensure smooth operations, meet deadlines, coordinate team  
**Daily Tasks:**
- Manage workflow queue (orders to fulfill, tasks to complete)
- Schedule team meetings and deliveries
- Assign and track tasks
- Coordinate between departments
- Monitor operational metrics

**Modules Used:** Workflow Queue, Calendar, Todo Lists  
**Key Workflows:**
1. Morning standup - review workflow queue
2. Assign order fulfillment tasks to team
3. Schedule delivery appointments
4. Track task completion
5. Coordinate inventory transfers with sales
6. Manage team calendar

---

### Persona 6: Procurement Manager (Robert)
**Role:** Manages vendor relationships and purchasing  
**Goals:** Secure reliable supply, negotiate prices, manage vendor performance  
**Daily Tasks:**
- Create purchase orders for vendors
- Track purchase order status
- Receive and verify deliveries
- Manage vendor relationships
- Negotiate pricing and terms
- Monitor vendor performance

**Modules Used:** Vendors, Purchase Orders, Inventory (receiving)  
**Key Workflows:**
1. Create purchase order for restock
2. Send PO to vendor
3. Track PO delivery status
4. Receive delivery and verify against PO
5. Resolve discrepancies with vendor
6. Evaluate vendor performance

---

### Persona 7: Customer Service Rep (Amanda)
**Role:** Handles client issues and returns  
**Goals:** Resolve client issues quickly, maintain satisfaction, process returns  
**Daily Tasks:**
- Process product returns
- Handle client complaints
- Update client information
- Track return reasons and trends
- Coordinate with sales on client issues

**Modules Used:** Returns, Clients, Orders  
**Key Workflows:**
1. Process client return request
2. Determine return eligibility
3. Issue credit or refund
4. Restock returned product (if applicable)
5. Track return reasons for quality issues
6. Update client notes with issue resolution

---

### Persona 8: VIP Client (Michael - Dispensary Owner)
**Role:** Wholesale buyer purchasing from cannabis distributor  
**Goals:** Browse available products, place orders easily, track order status  
**Daily Tasks:**
- Browse product catalog
- Check product availability and pricing
- Place orders for store inventory
- Track order status
- View purchase history
- Manage account information

**Modules Used:** VIP Portal (separate interface)  
**Key Workflows:**
1. Log into VIP portal
2. Browse product catalog by category
3. Add products to cart
4. Submit order
5. Track order fulfillment status
6. View purchase history and reorder

---

### Persona 9: Admin (Evan)
**Role:** System administrator and configuration  
**Goals:** Configure system, manage users, set business rules  
**Daily Tasks:**
- Create and manage user accounts
- Set user roles and permissions
- Configure COGS settings
- Configure credit settings
- Manage pricing rules
- Configure system settings

**Modules Used:** Settings, User Roles, COGS Settings, Credit Settings, Pricing Rules  
**Key Workflows:**
1. Onboard new employee (create user account)
2. Set role-based permissions
3. Configure COGS calculation method
4. Set client credit limits
5. Create new pricing rule
6. Update system configuration

---

## Testing Execution Plan

For each persona, I will:

1. **Adopt the persona's mindset** - Think about their goals, constraints, and daily pressures
2. **Execute their key workflows** - Actually try to complete their tasks end-to-end
3. **Document workflow gaps** - Where can't they complete their task?
4. **Document UX issues** - Where is the interface confusing or inefficient?
5. **Document data issues** - Where is data missing, incorrect, or not validated?
6. **Document integration gaps** - Where do modules fail to work together?

---

## Expected Findings

This approach will likely reveal:

- **Workflow blockers** - Missing features that prevent task completion
- **Integration gaps** - Data doesn't flow between modules as expected
- **UX confusion** - Interface doesn't match user mental model
- **Missing reports** - Users can't get the information they need
- **Data validation gaps** - System accepts invalid data
- **Permission issues** - Users can't access what they need (or can access what they shouldn't)

---

## Execution Strategy

**Phase 1: High-Impact Personas (6-8 hours)**
- Sales Manager (Marcus) - Most complex workflows
- Inventory Manager (Lisa) - Critical for operations
- VIP Client (Michael) - Unique interface, customer-facing

**Phase 2: Financial & Operations (4-6 hours)**
- Accountant (David) - Financial accuracy critical
- Operations Manager (Jennifer) - Coordination workflows
- Owner/Manager (Sarah) - Executive view

**Phase 3: Supporting Roles (3-4 hours)**
- Procurement Manager (Robert) - Supply chain
- Customer Service (Amanda) - Returns and support
- Admin (Evan) - Configuration and permissions

**Total Estimated Time:** 13-18 hours

---

## Success Criteria

**Minimum Success:**
- Each persona can complete at least 1 critical workflow end-to-end
- All workflow blockers documented
- All integration gaps identified

**Full Success:**
- Each persona can complete all key workflows
- All UX issues documented
- All data validation gaps identified
- All permission issues identified
- Comprehensive persona-based bug report created

---

**Beginning execution now in fully autonomous mode.**
