# Client Management System - Documentation

## Overview

The Client Management System is a comprehensive solution for managing clients in the TERP ERP system. It provides a privacy-first approach where clients are referenced by TERI codes in list views, with detailed information accessible only in individual client profiles.

## Features

### 1. Client List Table View
- **Full-width data table** with 9 columns
- **TERI Code-based privacy**: Only TERI codes visible in list view
- **Search functionality**: Search by TERI code
- **Advanced filtering**:
  - Filter by client types (Buyer, Seller, Brand, Referee, Contractor)
  - Filter by debt status (All, Has Debt, No Debt)
- **Pagination**: 50 clients per page
- **Color-coded badges** for client types
- **Highlighted debt amounts** (red for overdue)
- **Tag display**: Shows first 2 tags + count
- **Responsive design** with mobile support

### 2. Client Profile Page
- **Client Header**: TERI code, name, contact info, type badges
- **Quick Stats Cards**:
  - Total Spent
  - Total Profit
  - Avg Profit Margin
  - Amount Owed (with oldest debt days)
- **Tabbed Interface**:
  - **Overview Tab**: Client information and recent activity
  - **Transactions Tab**: All transactions with search and filters
  - **Payments Tab**: Completed payments only
  - **Notes Tab**: Embedded Freeform Note Widget

### 3. Transaction Management
- **Transaction Types**: INVOICE, PAYMENT, QUOTE, ORDER, REFUND, CREDIT
- **Payment Status**: PAID, PENDING, OVERDUE, PARTIAL
- **Transaction History**: Searchable table with all transaction details
- **Payment History**: Separate view for completed payments
- **Record Payment**: Dialog to record payments for unpaid transactions
- **Payment Tracking**: Track payment dates and amounts

### 4. Add New Client Wizard
- **3-Step Wizard**:
  - **Step 1**: Basic Information (TERI Code, Name, Email, Phone, Address)
  - **Step 2**: Client Types (Multi-select checkboxes)
  - **Step 3**: Tags (Add custom or select from existing)
- **Form Validation**: TERI Code and Name required, at least one client type
- **Tag Autocomplete**: Suggested tags from existing clients
- **Clean Navigation**: Next, Back, Cancel buttons

### 5. Tags System
- **Custom Tags**: Add custom tags to clients
- **Tag Autocomplete**: Suggested tags from existing clients
- **Tag Filtering**: Filter clients by tags in list view
- **Tag Management**: Add/remove tags from client profiles

### 6. Multi-Role Support
- **Buyer**: Client purchases products or services
- **Seller**: Client sells products or services to you
- **Brand**: Client represents a brand or manufacturer
- **Referee**: Client provides referrals or references
- **Contractor**: Client provides contract services
- **Multiple Roles**: Clients can have multiple roles

### 7. Freeform Note Widget Integration
- **Embedded in Client Profile**: Notes tab with full Freeform Note Widget
- **Auto-save**: Notes auto-save with 1-second debounce
- **Rich Text Editing**: Tiptap editor with hierarchical checkboxes
- **Collaboration**: Comments and activity log
- **Templates**: 6 pre-defined templates

## Database Schema

### Tables

#### `clients`
- `id`: Primary key
- `teriCode`: Unique TERI code (indexed)
- `name`: Client name (private)
- `email`: Email address (private)
- `phone`: Phone number (private)
- `address`: Address (private)
- `isBuyer`: Boolean flag
- `isSeller`: Boolean flag
- `isBrand`: Boolean flag
- `isReferee`: Boolean flag
- `isContractor`: Boolean flag
- `tags`: JSON array of tags
- `totalSpent`: Numeric (calculated)
- `totalProfit`: Numeric (calculated)
- `avgProfitMargin`: Numeric (calculated)
- `totalOwed`: Numeric (calculated)
- `oldestDebtDays`: Integer (calculated)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### `client_transactions`
- `id`: Primary key
- `clientId`: Foreign key to clients
- `transactionType`: ENUM (INVOICE, PAYMENT, QUOTE, ORDER, REFUND, CREDIT)
- `transactionNumber`: String (optional)
- `transactionDate`: Date
- `amount`: Numeric
- `paymentStatus`: ENUM (PAID, PENDING, OVERDUE, PARTIAL)
- `paymentDate`: Date (optional)
- `paymentAmount`: Numeric (optional)
- `notes`: Text (optional)
- `metadata`: JSON (optional)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### `client_activity`
- `id`: Primary key
- `clientId`: Foreign key to clients
- `userId`: Foreign key to users
- `activityType`: String
- `metadata`: JSON (optional)
- `createdAt`: Timestamp

#### `client_notes`
- `id`: Primary key
- `clientId`: Foreign key to clients (unique)
- `noteId`: Foreign key to freeform_notes
- `createdAt`: Timestamp

## API Endpoints (tRPC)

### Client Endpoints
- `clients.list`: List clients with pagination and filters
- `clients.count`: Get total count for pagination
- `clients.getById`: Get single client by ID
- `clients.getByTeriCode`: Get client by TERI code
- `clients.create`: Create new client
- `clients.update`: Update client
- `clients.delete`: Delete client

### Transaction Endpoints
- `clients.transactions.list`: List transactions for a client
- `clients.transactions.getById`: Get single transaction by ID
- `clients.transactions.create`: Create new transaction
- `clients.transactions.update`: Update transaction
- `clients.transactions.recordPayment`: Record payment for transaction
- `clients.transactions.delete`: Delete transaction

### Activity Endpoints
- `clients.activity.list`: List activity log for a client

### Tag Endpoints
- `clients.tags.getAll`: Get all unique tags
- `clients.tags.add`: Add tag to client
- `clients.tags.remove`: Remove tag from client

### Note Endpoints
- `clients.notes.getNoteId`: Get note ID for client
- `clients.notes.linkNote`: Link note to client

## Usage Examples

### Creating a New Client

```typescript
const createClient = trpc.clients.create.useMutation();

await createClient.mutateAsync({
  teriCode: "KJ",
  name: "Ethan",
  email: "ethan@example.com",
  phone: "555-5678",
  isBuyer: true,
  isSeller: false,
  tags: ["VIP", "Wholesale"],
});
```

### Recording a Payment

```typescript
const recordPayment = trpc.clients.transactions.recordPayment.useMutation();

await recordPayment.mutateAsync({
  transactionId: 123,
  paymentDate: new Date(),
  paymentAmount: 1000.00,
});
```

### Searching Clients

```typescript
const { data: clients } = trpc.clients.list.useQuery({
  search: "KJ",
  clientTypes: ["buyer"],
  hasDebt: true,
  limit: 50,
  offset: 0,
});
```

## Privacy & Security

### TERI Code Privacy
- **List View**: Only TERI codes are visible
- **Profile View**: Full client information (name, email, phone, address) is visible
- **Access Control**: All endpoints require authentication

### Data Protection
- **Authentication Required**: All API endpoints require user authentication
- **Activity Logging**: All changes are logged in the activity table
- **Audit Trail**: Complete history of all client interactions

## UI/UX Design Principles

### Information Hierarchy
- **TERI Code First**: TERI codes are the primary identifier
- **Progressive Disclosure**: Detailed information only in profile view
- **Visual Cues**: Color-coded badges for client types and payment status

### Scannable Layout
- **Card-based Design**: Clean cards with whitespace
- **Table View**: Easy-to-scan table with clear column headers
- **Status Indicators**: Color-coded badges for quick status recognition

### Responsive Design
- **Mobile Support**: Responsive layout for all screen sizes
- **Touch-friendly**: Large buttons and touch targets
- **Adaptive Grid**: Grid layout adapts to screen size

## Performance Considerations

### Pagination
- **50 clients per page**: Prevents performance issues with large datasets
- **Server-side Pagination**: Efficient database queries
- **Count Optimization**: Separate count query for pagination

### Search Optimization
- **Indexed TERI Code**: Fast search by TERI code
- **Debounced Search**: Prevents excessive API calls
- **Filtered Queries**: Efficient filtering on database side

### Caching
- **tRPC Query Caching**: Automatic caching of query results
- **Optimistic Updates**: Immediate UI updates for mutations
- **Refetch on Success**: Automatic refetch after mutations

## Future Enhancements

### Potential Features
- **Bulk Import**: Import clients from CSV
- **Export to CSV**: Export client list to CSV
- **Advanced Analytics**: Client lifetime value, churn rate, etc.
- **Email Integration**: Send emails directly from client profile
- **Document Attachments**: Attach documents to client profiles
- **Custom Fields**: User-defined custom fields for clients
- **Client Portal**: Allow clients to view their own data

### Integration Opportunities
- **Accounting System**: Sync with accounting module
- **Inventory System**: Link transactions to inventory
- **CRM Integration**: Integrate with external CRM systems
- **Email Marketing**: Integrate with email marketing platforms

## Troubleshooting

### Common Issues

#### Client Not Found
- **Cause**: Invalid client ID or TERI code
- **Solution**: Verify client exists in database

#### Transaction Not Updating
- **Cause**: Missing required fields or invalid data
- **Solution**: Check form validation and ensure all required fields are filled

#### Tags Not Saving
- **Cause**: Duplicate tags or empty tag strings
- **Solution**: Ensure tags are unique and non-empty

#### Payment Status Not Updating
- **Cause**: Payment amount or date missing
- **Solution**: Ensure both payment amount and date are provided

## Support

For issues or questions, please contact the development team or submit a ticket at https://help.manus.im

---

**Last Updated**: October 24, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅

