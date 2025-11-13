# Client Management System - Comprehensive Specification

## Executive Summary

Build a production-ready **Client Management System** for the TERP ERP that provides a unified view of all clients (buyers, sellers, brands, referees, contractors) with comprehensive transaction history, payment tracking, role management, and collaboration features.

---

## Core Requirements

### 1. Client List View (Table)

**Primary Display**
- **Table-based layout** similar to the vendor list screenshot
- **Columns**:
  - **TERI Client Code** (Primary identifier, always visible)
  - **Client Type Badges** (Buyer, Seller, Brand, Referee, Contractor - visual badges)
  - **Total Spent** (Lifetime purchases)
  - **Total Profit** (Lifetime profit margin)
  - **Avg Profit Margin** (Percentage)
  - **Total Amount Owed** (Outstanding debt)
  - **Oldest Debt** (Days since oldest unpaid invoice)
  - **Tags** (Custom tags, filterable)
  - **Actions** (View Profile, Edit, etc.)

**Key Features**:
- **Quick Filters**: Filter by client type (Buyer, Seller, Brand, etc.), tags, debt status
- **Search**: Global search by TERI client code, tags, or client type
- **Sorting**: Sort by any column (spent, profit, debt, etc.)
- **Pagination**: Handle large client lists efficiently
- **Responsive**: Mobile-friendly table with horizontal scroll or card view

**Privacy & Security**:
- **TERI Client Code Only**: No personally identifiable information (PII) in the table
- **PII Access**: Name, contact info, address only visible in individual client profile

---

### 2. Client Profile Page

**Profile Header**
- **TERI Client Code** (Prominent display)
- **Client Name** (Editable)
- **Contact Information** (Phone, Email, Address - Editable)
- **Client Type Badges** (Buyer, Seller, Brand, Referee, Contractor - Multi-select)
- **Tags** (Custom tags with autocomplete)
- **Quick Stats**:
  - Total Spent
  - Total Profit
  - Avg Profit Margin
  - Total Owed
  - Oldest Debt

**Transaction History Section**
- **Table View** of all transactions:
  - Transaction ID
  - Transaction Type (Invoice, Payment, Quote, Order, etc.)
  - Date
  - Amount
  - Payment Status (Paid, Pending, Overdue)
  - Payment Date (if paid)
  - Actions (View Details, Edit)
- **Search within transactions**: Filter by date range, transaction type, amount, status
- **Click to expand**: View full transaction details inline or in modal
- **Edit capability**: Modify transaction details if needed
- **Payment tracking**: Show payment history for each transaction

**Freeform Note Widget**
- **Single instance** per client profile
- **Embedded widget** for client-specific notes
- **Full features**: Templates, comments, activity log
- **Auto-linked** to client ID

**Activity Log**
- Track all changes to client profile
- Track all transactions
- Track all notes and comments

---

### 3. Client Types & Roles

**Multi-Role Support**
- Clients can have **multiple roles** simultaneously:
  - **Buyer**: Purchases products
  - **Seller**: Sells products to TERP
  - **Brand**: Brand partner or affiliate
  - **Referee**: Referral source
  - **Contractor**: Service provider

**Visual Representation**
- **Badges**: Color-coded badges for each role
- **Icons**: Distinct icons for quick identification
- **Filtering**: Filter by single or multiple roles

---

### 4. Tags System

**Tag Management**
- **Custom tags**: User-defined tags (e.g., "VIP", "High-Risk", "Preferred Vendor")
- **Autocomplete**: Tag input with autocomplete from existing tags
- **Multi-tag**: Clients can have multiple tags
- **Color-coded**: Optional color coding for tags
- **Search/Filter**: Include tags in global search and filters

---

### 5. Add New Client Flow

**Onboarding Wizard**
- **Step 1: Basic Information**
  - TERI Client Code (Auto-generated or manual)
  - Client Name
  - Contact Info (Phone, Email, Address)
- **Step 2: Client Types**
  - Select one or more roles (Buyer, Seller, Brand, Referee, Contractor)
- **Step 3: Tags & Notes**
  - Add custom tags
  - Optional initial note
- **Step 4: Review & Create**
  - Review all information
  - Create client

**Validation**
- TERI Client Code must be unique
- Required fields: Code, Name, at least one client type
- Optional fields: Contact info, tags, notes

---

## Database Schema

### `clients` Table
```sql
CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teri_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  is_buyer BOOLEAN DEFAULT FALSE,
  is_seller BOOLEAN DEFAULT FALSE,
  is_brand BOOLEAN DEFAULT FALSE,
  is_referee BOOLEAN DEFAULT FALSE,
  is_contractor BOOLEAN DEFAULT FALSE,
  tags JSON,
  total_spent DECIMAL(15, 2) DEFAULT 0,
  total_profit DECIMAL(15, 2) DEFAULT 0,
  avg_profit_margin DECIMAL(5, 2) DEFAULT 0,
  total_owed DECIMAL(15, 2) DEFAULT 0,
  oldest_debt_days INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_teri_code (teri_code),
  INDEX idx_tags (tags),
  INDEX idx_total_owed (total_owed)
);
```

### `client_transactions` Table
```sql
CREATE TABLE client_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  transaction_type ENUM('INVOICE', 'PAYMENT', 'QUOTE', 'ORDER', 'REFUND', 'CREDIT') NOT NULL,
  transaction_number VARCHAR(100),
  transaction_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_status ENUM('PAID', 'PENDING', 'OVERDUE', 'PARTIAL') DEFAULT 'PENDING',
  payment_date DATE,
  payment_amount DECIMAL(15, 2),
  notes TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client_id (client_id),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_payment_status (payment_status)
);
```

### `client_activity` Table
```sql
CREATE TABLE client_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  user_id INT NOT NULL,
  activity_type ENUM('CREATED', 'UPDATED', 'TRANSACTION_ADDED', 'PAYMENT_RECORDED', 'NOTE_ADDED', 'TAG_ADDED', 'TAG_REMOVED') NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_client_id (client_id)
);
```

### `client_notes` Table
```sql
CREATE TABLE client_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  note_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (note_id) REFERENCES freeform_notes(id) ON DELETE CASCADE,
  UNIQUE KEY unique_client_note (client_id, note_id)
);
```

---

## API Endpoints (tRPC)

### Clients
- `clients.list` - Get all clients (with pagination, filters, search)
- `clients.getById` - Get single client by ID
- `clients.getByTeriCode` - Get client by TERI code
- `clients.create` - Create new client
- `clients.update` - Update client information
- `clients.delete` - Delete client (soft delete)
- `clients.search` - Search clients by code, tags, type
- `clients.getStats` - Get client statistics (total spent, profit, debt)

### Client Transactions
- `clients.transactions.list` - Get all transactions for a client
- `clients.transactions.getById` - Get single transaction
- `clients.transactions.create` - Create new transaction
- `clients.transactions.update` - Update transaction
- `clients.transactions.delete` - Delete transaction
- `clients.transactions.recordPayment` - Record payment for transaction
- `clients.transactions.search` - Search transactions within client

### Client Activity
- `clients.activity.list` - Get activity log for client

### Client Tags
- `clients.tags.getAll` - Get all unique tags across clients
- `clients.tags.add` - Add tag to client
- `clients.tags.remove` - Remove tag from client

---

## UI/UX Design

### Client List Page
**Layout**:
- Header with "Clients" title and "Add New Client" button
- Search bar and filter chips
- Data table with sortable columns
- Pagination controls

**Interactions**:
- Click row to open client profile
- Hover to show quick actions (Edit, View, Delete)
- Click column headers to sort
- Click filter chips to toggle filters

### Client Profile Page
**Layout**:
- Breadcrumb navigation (Clients > [TERI Code])
- Profile header with client info and badges
- Tabbed interface:
  - **Overview**: Quick stats and summary
  - **Transactions**: Transaction history table
  - **Notes**: Freeform note widget
  - **Activity**: Activity log
- Edit button in header

**Interactions**:
- Click "Edit" to open edit modal
- Click transaction row to expand details
- Search within transactions
- Add notes, comments, tags inline

### Add New Client Modal
**Layout**:
- Multi-step wizard with progress indicator
- Form fields with validation
- "Back", "Next", "Cancel", "Create" buttons

**Interactions**:
- Auto-generate TERI code or allow manual entry
- Checkbox selection for client types
- Tag input with autocomplete
- Real-time validation feedback

---

## Key Features Summary

✅ **Table View** - Sortable, filterable, searchable client list
✅ **TERI Code Privacy** - PII only in profile, not in list view
✅ **Multi-Role Support** - Clients can be Buyer, Seller, Brand, Referee, Contractor
✅ **Transaction History** - Full transaction log with payment tracking
✅ **Payment Tracking** - Record payments, track payment dates
✅ **Tags System** - Custom tags with autocomplete and filtering
✅ **Freeform Notes** - Embedded note widget per client
✅ **Activity Log** - Complete audit trail
✅ **Add New Client** - Guided onboarding wizard
✅ **Search & Filter** - Global search, quick filters, advanced filters
✅ **Responsive Design** - Mobile-friendly table and profile views

---

## Implementation Phases

### Phase 1: Database & Backend
- Create database schema (clients, transactions, activity, notes)
- Implement tRPC endpoints
- Data access layer with CRUD operations

### Phase 2: Client List View
- Build data table component
- Implement search and filters
- Add pagination and sorting

### Phase 3: Client Profile Page
- Build profile header with stats
- Implement transaction history table
- Integrate Freeform Note Widget

### Phase 4: Add New Client Flow
- Build multi-step wizard
- Implement form validation
- TERI code generation

### Phase 5: Tags & Activity
- Implement tags system
- Build activity log
- Add tag autocomplete

### Phase 6: Testing & Refinement
- Comprehensive testing
- UI/UX polish
- Performance optimization

---

## Success Criteria

✅ Users can view all clients in a sortable, filterable table
✅ TERI code is the only identifier in the list view (privacy)
✅ Client profile shows complete transaction history with payment tracking
✅ Users can add notes to each client via embedded Freeform Note Widget
✅ Tags can be added, searched, and filtered
✅ Add new client flow is intuitive and validates input
✅ System is responsive and performant with 1000+ clients
✅ Zero TypeScript errors, production-ready code

---

**Last Updated**: October 24, 2025
**Version**: 1.0.0
**Author**: TERP Development Team

