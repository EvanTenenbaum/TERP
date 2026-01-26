# PERF-001: Database Schema Index Audit

**Generated:** 2025-11-30
**Tool:** Gemini API (gemini-2.0-flash-exp)
**Schema:** drizzle/schema.ts

---

Okay, here's an analysis of the provided Drizzle ORM schema, identifying missing foreign key indexes, recommending composite indexes, and prioritizing them by impact.

## Missing Foreign Key Indexes

- **Table:** `brands`, **Column:** `vendorId`, **Reason:** Frequently used to retrieve brands associated with a specific vendor. Lack of index will cause full table scans.
- **Table:** `products`, **Column:** `brandId`, **Reason:** Used to find products belonging to a specific brand. A large number of products per brand makes indexing essential.
- **Table:** `products`, **Column:** `strainId`, **Reason:** Used to efficiently retrieve products of a specific strain, especially with a large strain library.
- **Table:** `productSynonyms`, **Column:** `productId`, **Reason:** Used when querying synonyms for a product. Could be performance bottleneck with growing product and synonym count.
- **Table:** `productMedia`, **Column:** `productId`, **Reason:** Used to fetch media associated with a specific product. Lack of index leads to slow media retrieval.
- **Table:** `productMedia`, **Column:** `uploadedBy`, **Reason:** Useful for auditing or filtering media uploads by specific users.
- **Table:** `productTags`, **Column:** `productId`, **Reason:** Many-to-many relationship. Essential for retrieving tags associated with a product.
- **Table:** `productTags`, **Column:** `tagId`, **Reason:** Many-to-many relationship. Essential for retrieving products associated with a tag.
- **Table:** `lots`, **Column:** `vendorId`, **Reason:** Used to retrieve lots associated with a specific vendor. Important for filtering and reporting.
- **Table:** `batches`, **Column:** `productId`, **Reason:** Find batches for a product. Critical for inventory and sales operations.
- **Table:** `batches`, **Column:** `lotId`, **Reason:** Find batches within a specific lot. Used for tracing inventory from intake.
- **Table:** `paymentHistory`, **Column:** `batchId`, **Reason:** Essential for tracking payment history for a given batch.
- **Table:** `paymentHistory`, **Column:** `vendorId`, **Reason:** Useful for analyzing payment trends for each vendor
- **Table:** `paymentHistory`, **Column:** `recordedBy`, **Reason:** Auditing payment history.
- **Table:** `batchLocations`, **Column:** `batchId`, **Reason:** Critical for efficiently retrieving the locations of a batch. Fundamental to warehouse management.
- **Table:** `sales`, **Column:** `batchId`, **Reason:** Find sales for a batch. High frequency queries relating to inventory tracking and COGS.
- **Table:** `sales`, **Column:** `productId`, **Reason:** Used to retrieve sales information for a specific product. Important for sales reporting.
- **Table:** `sales`, **Column:** `customerId`, **Reason:** Analytics on customer purchase history.
- **Table:** `sales`, **Column:** `createdBy`, **Reason:** Auditing sales data.
- **Table:** `cogsHistory`, **Column:** `batchId`, **Reason:** Essential for auditing COGS changes for a batch.
- **Table:** `cogsHistory`, **Column:** `changedBy`, **Reason:** Auditing COGS changes.
- **Table:** `auditLogs`, **Column:** `actorId`, **Reason:** Useful to retrieve audit logs made by specific users.
- **Table:** `auditLogs`, **Column:** `entityId`, **Reason:** Audit log lookup by Entity ID in combination with entity type.
- **Table:** `subcategories`, **Column:** `categoryId`, **Reason:** Used to retrieve subcategories associated with a category. Essential for hierarchical product organization.
- **Table:** `ledgerEntries`, **Column:** `accountId`, **Reason:** Retrieving ledger entries for a particular account. Core to financial reporting.
- **Table:** `ledgerEntries`, **Column:** `referenceId`, **Reason:** Retrieving ledger entries for a particular reference (invoice, bill, etc.).
- **Table:** `ledgerEntries`, **Column:** `fiscalPeriodId`, **Reason:** Crucial for retrieving entries within a specific fiscal period.
- **Table:** `ledgerEntries`, **Column:** `postedBy`, **Reason:** Auditing ledger postings
- **Table:** `ledgerEntries`, **Column:** `createdBy`, **Reason:** Auditing ledger entries
- **Table:** `invoices`, **Column:** `customerId`, **Reason:** Used for querying invoices for a customer, fundamental to AR operations.
- **Table:** `invoices`, **Column:** `referenceId`, **Reason:** Retrieving invoices associated with a particular order or contract.
- **Table:** `invoices`, **Column:** `createdBy`, **Reason:** Auditing invoice creation.
- **Table:** `invoiceLineItems`, **Column:** `invoiceId`, **Reason:** Essential for quickly retrieving line items for an invoice.
- **Table:** `invoiceLineItems`, **Column:** `productId`, **Reason:** Report on revenue by product on invoices.
- **Table:** `invoiceLineItems`, **Column:** `batchId`, **Reason:** Report on product inventory by batch on invoices.
- **Table:** `bills`, **Column:** `vendorId`, **Reason:** Used for querying bills from a vendor, crucial for AP operations.
- **Table:** `bills`, **Column:** `referenceId`, **Reason:** Retrieving bills related to a specific purchase order or service.
- **Table:** `bills`, **Column:** `createdBy`, **Reason:** Auditing bill creation.
- **Table:** `billLineItems`, **Column:** `billId`, **Reason:** Critical for fetching line items associated with a bill.
- **Table:** `billLineItems`, **Column:** `productId`, **Reason:** Report on cost by product on bills.
- **Table:** `billLineItems`, **Column:** `lotId`, **Reason:** Report on material inventory by lot on bills.
- **Table:** `payments`, **Column:** `bankAccountId`, **Reason:** Retrieving payments associated with a bank account.
- **Table:** `payments`, **Column:** `customerId`, **Reason:** Retrieving payment records for a customer (AR).
- **Table:** `payments`, **Column:** `vendorId`, **Reason:** Retrieving payment records for a vendor (AP).
- **Table:** `payments`, **Column:** `invoiceId`, **Reason:** Retrieving payment records for an invoice (AR).
- **Table:** `payments`, **Column:** `billId`, **Reason:** Retrieving payment records for a bill (AP).
- **Table:** `payments`, **Column:** `createdBy`, **Reason:** Audit payment creation
- **Table:** `bankTransactions`, **Column:** `bankAccountId`, **Reason:** Essential for retrieving transactions for a bank account.
- **Table:** `bankTransactions`, **Column:** `paymentId`, **Reason:** Linking transactions to payments for reconciliation.
- **Table:** `expenseCategories`, **Column:** `parentCategoryId`, **Reason:** Used to traverse expense category hierarchy.
- **Table:** `expenseCategories`, **Column:** `ledgerAccountId`, **Reason:** Used for linking chart of accounts.
- **Table:** `expenses`, **Column:** `categoryId`, **Reason:** Reporting on expense by category.
- **Table:** `expenses`, **Column:** `vendorId`, **Reason:** Analysis of spend on a per vendor basis.
- **Table:** `expenses`, **Column:** `bankAccountId`, **Reason:** Linking expenses to bank accounts for reconciliation.
- **Table:** `expenses`, **Column:** `billId`, **Reason:** Linking bill to expense to show which expense a bill related to.
- **Table:** `expenses`, **Column:** `createdBy`, **Reason:** Auditing expense creation.
- **Table:** `freeformNotes`, **Column:** `userId`, **Reason:** Essential for filtering notes by user.
- **Table:** `noteComments`, **Column:** `parentCommentId`, **Reason:** Used for threaded comment retrieval.
- **Table:** `noteActivity`, **Column:** `userId`, **Reason:** Required for filtering the Activity of a specific user.
- **Table:** `creditSystemSettings`, **Column:** `updatedBy`, **Reason:** Used to track who last updated settings.
- **Table:** `creditAuditLog`, **Column:** `triggeredBy`, **Reason:** Audit trail purposes, track who triggered the audit log event.
- **Table:** `pricingProfiles`, **Column:** `createdBy`, **Reason:** Auditing
- **Table:** `orders`, **Column:** `clientNeedId`, **Reason:** Link orders to client needs.
- **Table:** `orders`, **Column:** `packedBy`, **Reason:** Finding packed by a particular user.
- **Table:** `orders`, **Column:** `shippedBy`, **Reason:** Finding shipped by a particular user.
- **Table:** `returns`, **Column:** `processedBy`, **Reason:** Find returns by a particular user.
- **Table:** `sampleInventoryLog`, **Column:** `createdBy`, **Reason:** Auditing sample creation
- **Table:** `transactions`, **Column:** `createdBy`, **Reason:** Auditing transaction creation.
- **Table:** `transactionLinks`, **Column:** `createdBy`, **Reason:** Auditing creation.
- **Table:** `credits`, **Column:** `transactionId`, **Reason:** Useful for looking up the originating transaction for a credit.
- **Table:** `credits`, **Column:** `createdBy`, **Reason:** Used to track who created the credit.
- **Table:** `creditApplications`, **Column:** `appliedBy`, **Reason:** Used to track who applied the credit.
- **Table:** `inventoryMovements`, **Column:** `performedBy`, **Reason:** Audit inventory change by users.
- **Table:** `sampleRequests`, **Column:** `fulfilledBy`, **Reason:** Useful to find those sample requests fulfilled by user.
- **Table:** `sampleRequests`, **Column:** `cancelledBy`, **Reason:** Useful to find those sample requests cancelled by a certain user.
- **Table:** `inventoryAlerts`, **Column:** `acknowledgedBy`, **Reason:** Track who acknowledged alerts
- **Table:** `inventoryViews`, **Column:** `createdBy`, **Reason:** Track who made a particular inventory view.
- **Table:** `salesSheetVersions`, **Column:** `createdBy`, **Reason:** Tracking version history
- **Table:** `tagGroups`, **Column:** `createdBy`, **Reason:** Useful to retrieve tags created by specific users.
- **Table:** `tagGroupMembers`, **Column:** `groupId`, **Reason:** Essential for retrieving tags within a tag group.
- **Table:** `intakeSessions`, **Column:** `vendorId`, **Reason:** Useful for lookups on a per vendor basis
- **Table:** `intakeSessions`, **Column:** `receivedBy`, **Reason:** Used to audit who received the batch intake.
- **Table:** `intakeSessionBatches`, **Column:** `intakeSessionId`, **Reason:** Required for retrieving batches within an intake session.
- **Table:** `recurringOrders`, **Column:** `createdBy`, **Reason:** track recurring order creation
- **Table:** `recurringOrders`, **Column:** `clientId`, **Reason:** Lookups on client level.
- **Table:** `alertConfigurations`, **Column:** `userId`, **Reason:** Used to filter alerts for the current user.
- **Table:** `clientNeeds`, **Column:** `createdBy`, **Reason:** Used to track who last updated client needs.
- **Table:** `vendorSupply`, **Column:** `createdBy`, **Reason:** Used to track who last updated vendor supply.
- **Table:** `vendorSupply`, **Column:** `vendorId`, **Reason:** Lookups on a per vendor basis.
- **Table:** `matchRecords`, **Column:** `historicalOrderId`, **Reason:** Retrieve matches involving specific orders
- **Table:** `matchRecords`, **Column:** `inventoryBatchId`, **Reason:** Find matches by inventory batch
- **Table:** `matchRecords`, **Column:** `vendorSupplyId`, **Reason:** Find matches by vendor supply
- **Table:** `matchRecords`, **Column:** `actionedBy`, **Reason:** Finding matches that were actioned by someone
- **Table:** `matchRecords`, **Column:** `saleOrderId`, **Reason:** Link matches back to sales.
- **Table:** `vipPortalConfigurations`, **Column:** `clientId`, **Reason:** Retrieve all configurations for a client.
- **Table:** `orderLineItems`, **Column:** `orderId`, **Reason:** Required for order-line item reports and lookups.
- **Table:** `orderLineItems`, **Column:** `batchId`, **Reason:** Required for order-line item reports and lookups.
- **Table:** `orderAuditLog`, **Column:** `orderId`, **Reason:** Auditing
- **Table:** `orderAuditLog`, **Column:** `userId`, **Reason:** Auditing
- **Table:** `todoLists`, **Column:** `ownerId`, **Reason:** Used to filter to-do lists by owner.
- **Table:** `todoListMembers`, **Column:** `listId`, **Reason:** Used to access member list of todo lists.
- **Table:** `todoListMembers`, **Column:** `userId`, **Reason:** Used to look up to do list assignments per user.
- **Table:** `todoListMembers`, **Column:** `addedBy`, **Reason:** Auditing purpose.
- **Table:** `todoTasks`, **Column:** `listId`, **Reason:** Essential for retrieving tasks within a to-do list.
- **Table:** `todoTasks`, **Column:** `assignedTo`, **Reason:** Used for filtering assigned tasks.
- **Table:** `todoTasks`, **Column:** `completedBy`, **Reason:** Find tasks completed by particular user.
- **Table:** `todoTasks`, **Column:** `createdBy`, **Reason:** Audit trail tracking
- **Table:** `todoTaskActivity`, **Column:** `taskId`, **Reason:** Used to get task related activity logs.
- **Table:** `todoTaskActivity`, **Column:** `userId`, **Reason:** Used to filter by task related activity logs.
- **Table:** `comments`, **Column:** `userId`, **Reason:** Filter comments by user.
- **Table:** `commentMentions`, **Column:** `commentId`, **Reason:** Essential for retrieving mentions within a comment.
- **Table:** `commentMentions`, **Column:** `mentionedByUserId`, **Reason:** Essential for retrieving mentions within a comment.
- **Table:** `inboxItems`, **Column:** `userId`, **Reason:** Show inbox per user.
- **Table:** `calendarEvents`, **Column:** `createdBy`, **Reason:** Required to find those users who created event.
- **Table:** `calendarEvents`, **Column:** `assignedTo`, **Reason:** Used to filter events for the assigned person.
- **Table:** `calendarEvents`, **Column:** `clientId`, **Reason:** v3.2 Optimization
- **Table:** `calendarEvents`, **Column:** `vendorId`, **Reason:** v3.2 Optimization
- **Table:** `calendarEventParticipants`, **Column:** `eventId`, **Reason:** Essential for retrieving participants for an event.
- **Table:** `calendarEventParticipants`, **Column:** `addedBy`, **Reason:** Auditing event invitation tracking
- **Table:** `calendarRecurrenceInstances`, **Column:** `parentEventId`, **Reason:** Used to see recurrent parent events.
- **Table:** `calendarReminders`, **Column:** `eventId`, **Reason:** Look ups relating to a particular event.
- **Table:** `calendarReminders`, **Column:** `userId`, **Reason:** Show reminders on user level.
- **Table:** `calendarEventHistory`, **Column:** `eventId`, **Reason:** Audit and changes related to particular event.
- **Table:** `calendarEventHistory`, **Column:** `changedBy`, **Reason:** Auditing.
- **Table:** `calendarEventAttachments`, **Column:** `eventId`, **Reason:** Essential for quickly retrieving the files for an event.
- **Table:** `calendarEventAttachments`, **Column:** `uploadedBy`, **Reason:** Auditing event file uploads
- **Table:** `calendarViews`, **Column:** `userId`, **Reason:** Used to load event views for each user.
- **Table:** `calendarEventPermissions`, **Column:** `grantedBy`, **Reason:** Useful to track who gave these permissions.
- **Table:** `clientMeetingHistory`, **Column:** `calendarEventId`, **Reason:** Relates the records to an event.
- **Table:** `calendarEventInvitations`, **Column:** `eventId`, **Reason:** Essential to retrieve invitee list per event.
- **Table:** `calendarEventInvitations`, **Column:** `userId`, **Reason:** Show who got invited per user.
- **Table:** `calendarEventInvitations`, **Column:** `clientId`, **Reason:** Show who got invited per client.
- **Table:** `calendarEventInvitations`, **Column:** `overriddenBy`, **Reason:** Auditing invite modification.
- **Table:** `calendarEventInvitations`, **Column:** `createdBy`, **Reason:** Auditing.
- **Table:** `calendarEventInvitations`, **Column:** `participantId`, **Reason:** Link events to participants.
- **Table:** `calendarInvitationHistory`, **Column:** `invitationId`, **Reason:** Audit invitation action.
- **Table:** `calendarInvitationHistory`, **Column:** `performedBy`, **Reason:** Audit
- **Table:** `batchStatusHistory`, **Column:** `changedBy`, **Reason:** Required to track batch status changes.
- **Table:** `batchStatusHistory`, **Column:** `fromStatusId`, **Reason:** Helps identify the sequence of transitions.
- **Table:** `workflowStatuses`, **Column:** `isActive`, **Reason:** Helps list active workflows.
- **Table:** `deployments`, **Column:** `commitSha`, **Reason:** Used to help look up deploys by commit
- **Table:** `roles`, **Column:** `createdBy`, **Reason:** Used to help look up deploys by user
- **Table:** `permissions`, **Column:** `createdBy`, **Reason:** Used to help look up deploys by user
- **Table:** `rolePermissions`, **Column:** `roleId`, **Reason:** Used to look up role permissions
- **Table:** `userRoles`, **Column:** `userId`, **Reason:** Used to look up user roles
- **Table:** `userPermissionOverrides`, **Column:** `userId`, **Reason:** Used to look up user overrides

## Recommended Composite Indexes

- **Table:** `productTags`, Columns: `(tagId, productId)`, Use Case: Optimizes reverse lookup: "Find all products with a given tag." Complementary to the existing `productId`, `tagId` index.
- **Table:** `batchLocations`, Columns: `(site, zone, rack, shelf, bin)`, Use Case: Optimizes finding inventory by precise location when a full location hierarchy is specified.
- **Table:** `ledgerEntries`, Columns: `(accountId, entryDate)`, Use Case: Speeds up retrieving ledger entries for an account within a date range.
- **Table:** `transactions`, Columns: `(clientId, transactionDate)`, Use Case: Improves performance of listing transaction history for clients, a common reporting scenario.
- **Table:** `transactions`, Columns: `(transactionType, transactionDate)`, Use Case: Improves performance of listing transactions of a particular type.
- **Table:** `credits`, Columns: `(clientId, status)`, Use Case: Efficiently retrieve all credits for a customer based on their status (active, used, etc.).
- **Table:** `recurringOrders`, Columns: `(status, nextGenerationDate)`, Use Case: Efficiently identify which orders need to be generated next.
- **Table:** `clientNeeds`, Columns: `(clientId, status)`, Use Case: Quick retrieval of needs for client
- **Table:** `clientNeeds`, Columns: `(strainId, status)`, Use Case: Quick retrieval of active need by strain ID
- **Table:** `clientNeeds`, Columns: `(category, status)`, Use Case: Quick retrieval of active need by category
- **Table:** `calendarEvents`, Columns: `(assignedTo, startDate, endDate)`, Use Case: Improves fetching events for a user within a date range.
- **Table:** `calendarEventPermissions`, Columns: `(eventId, permission)`, Use Case: Optimize permissions check
- **Table:** `batchStatusHistory`, Columns: `(batchId, createdAt)`, Use Case: Optimizes retrieving the chronological history of batch status changes.

## Priority Ranking

Here are the top 10 most important indexes to add, prioritized by estimated impact:

1.  **Table:** `batchLocations`, **Column:** `batchId`, **Reason:** Critical for efficiently retrieving the locations of a batch. Fundamental to warehouse management. Lowers latency for critical inventory operations.
2.  **Table:** `productTags`, **Column:** `productId`, **Reason:** Many-to-many relationship. Essential for retrieving tags associated with a product. Fundamental to product discovery and filtering.
3.  **Table:** `sales`, **Column:** `batchId`, **Reason:** Find sales for a batch. High frequency queries relating to inventory tracking and COGS. High query frequency on a potentially large table.
4.  **Table:** `ledgerEntries`, **Column:** `accountId`, **Reason:** Retrieving ledger entries for a particular account. Core to financial reporting. Essential for financial reporting performance.
5.  **Table:** `orderLineItems`, **Column:** `orderId`, **Reason:** Required for order-line item reports and lookups. Essential for financial operations and visibility
6.  **Table:** `invoices`, **Column:** `customerId`, **Reason:** Used for querying invoices for a customer, fundamental to AR operations. Required for AR efficiency
7.  **Table:** `batches`, **Column:** `productId`, **Reason:** Find batches for a product. Critical for inventory and sales operations. Wide impact.
8.  **Table:** `recurringOrders`, Columns: `(status, nextGenerationDate)`, Use Case: Efficiently identify which orders need to be generated next. Affects operations and revenue.
9.  **Table:** `sampleRequests`, **Column:** `clientId`, **Reason:** Used for retrieving the current sample requests for a client
10. **Table:** `transactions`, Columns: `(clientId, transactionDate)`, Use Case: Improves performance of listing transaction history for clients, a common reporting scenario.
