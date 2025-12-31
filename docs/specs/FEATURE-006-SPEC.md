# Specification: FEATURE-006 - VIP Booking System

**Status:** Approved  
**Priority:** MEDIUM  
**Estimate:** 60h  
**Module:** VIP Portal  
**Dependencies:** FEATURE-011 (Unified Catalogue), WS-008 (Low Stock Alerts)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

VIP customers (vendors/growers) need a way to:
- View available inventory
- See what products are needed (low stock alerts)
- Book/reserve products for future delivery
- Communicate their upcoming harvests

Currently, this is done via phone/text, which is inefficient and error-prone.

## 2. User Stories

1. **As a VIP vendor**, I want to see what products are in demand, so that I can prioritize my offerings.

2. **As a VIP vendor**, I want to book a delivery slot, so that I can plan my schedule.

3. **As a buyer**, I want to see upcoming VIP bookings, so that I can plan inventory intake.

4. **As a VIP vendor**, I want to communicate my harvest schedule, so that buyers can anticipate my offerings.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | VIP login/authentication | Must Have |
| FR-02 | View "Needs" list (low stock items) | Must Have |
| FR-03 | Book delivery slot | Must Have |
| FR-04 | View booking history | Must Have |
| FR-05 | Submit harvest schedule | Should Have |
| FR-06 | View current inventory (read-only) | Should Have |
| FR-07 | Messaging with buyers | Nice to Have |
| FR-08 | Price quotes/negotiation | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model

```sql
-- VIP bookings
CREATE TABLE vip_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL REFERENCES vendors(id),
  booking_date DATE NOT NULL,
  booking_time_slot VARCHAR(50), -- e.g., "Morning", "Afternoon"
  status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  
  -- What they're bringing
  items JSON, -- Array of {productName, estimatedQuantity, estimatedPrice}
  notes TEXT,
  
  -- Confirmation
  confirmed_by INT REFERENCES users(id),
  confirmed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (booking_date),
  INDEX idx_vendor (vendor_id)
);

-- VIP portal access
CREATE TABLE vip_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL REFERENCES vendors(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 API Contracts

```typescript
// VIP Portal APIs (separate auth context)
vip.getNeedsList = vipProcedure
  .output(z.array(z.object({
    categoryName: z.string(),
    productName: z.string().nullable(),
    currentStock: z.number(),
    targetStock: z.number(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  })))
  .query(async () => {});

vip.createBooking = vipProcedure
  .input(z.object({
    bookingDate: z.date(),
    timeSlot: z.string(),
    items: z.array(z.object({
      productName: z.string(),
      estimatedQuantity: z.number(),
      estimatedPrice: z.number().optional()
    })),
    notes: z.string().optional()
  }))
  .output(z.object({ bookingId: z.number() }))
  .mutation(async ({ input, ctx }) => {});

vip.getMyBookings = vipProcedure
  .output(z.array(z.object({
    id: z.number(),
    bookingDate: z.date(),
    timeSlot: z.string(),
    status: z.string(),
    items: z.array(z.object({
      productName: z.string(),
      estimatedQuantity: z.number()
    }))
  })))
  .query(async ({ ctx }) => {});
```

## 5. UI/UX Specification

### 5.1 Wireframe: VIP Portal Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  🌟 VIP Portal - Welcome, Farm A                   [Logout] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 What We Need                           [View All] │   │
│  │                                                     │   │
│  │ 🔴 HIGH: Indica strains (current: 10 oz)           │   │
│  │ 🟡 MED: Sativa strains (current: 25 oz)            │   │
│  │ 🟢 LOW: Hybrid strains (current: 50 oz)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📅 Book a Delivery                      [+ New Booking]│   │
│  │                                                     │   │
│  │ Upcoming:                                           │   │
│  │ • Jan 10 (Morning) - Blue Dream, OG Kush - CONFIRMED│   │
│  │ • Jan 15 (Afternoon) - Sour Diesel - PENDING       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria

- [ ] VIP can log in with separate credentials
- [ ] Needs list shows low-stock items
- [ ] Bookings can be created and viewed
- [ ] Staff can confirm/manage bookings
- [ ] Booking history maintained

## 6. Testing Requirements

- [ ] VIP authentication flow
- [ ] Needs list accuracy
- [ ] Booking CRUD operations
- [ ] Booking confirmation workflow

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
