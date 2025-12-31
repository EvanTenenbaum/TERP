# Specification: WS-014 - Vendor "Harvesting Again" Reminders

**Status:** Approved  
**Priority:** MEDIUM  
**Estimate:** 8h  
**Module:** Vendors  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

Maintaining vendor relationships requires proactive outreach, especially around harvest times. Currently, there's no systematic way to track when vendors will have new product available. A simple "Expected Harvest Date" field with automated reminders would enable timely vendor outreach.

## 2. User Stories

1. **As a buyer**, I want to record when a vendor expects to harvest, so that I can reach out at the right time.

2. **As a buyer**, I want to receive reminders before vendor harvest dates, so that I don't miss sourcing opportunities.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | "Expected Harvest Date" field on vendor profile | Must Have |
| FR-02 | Dashboard widget showing upcoming harvests | Must Have |
| FR-03 | Automated reminder X days before harvest | Should Have |
| FR-04 | Log outreach history | Should Have |
| FR-05 | Recurring harvest schedules | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
ALTER TABLE vendors ADD COLUMN expected_harvest_date DATE;
ALTER TABLE vendors ADD COLUMN harvest_reminder_days INT DEFAULT 7;
ALTER TABLE vendors ADD COLUMN harvest_notes TEXT;

CREATE TABLE vendor_outreach_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT NOT NULL REFERENCES vendors(id),
  outreach_type ENUM('CALL', 'TEXT', 'EMAIL', 'VISIT', 'OTHER') NOT NULL,
  notes TEXT,
  next_harvest_date DATE,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 API Contracts

```typescript
vendors.setHarvestDate = adminProcedure
  .input(z.object({
    vendorId: z.number(),
    expectedHarvestDate: z.date(),
    reminderDays: z.number().default(7),
    notes: z.string().optional()
  }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input }) => {});

vendors.getUpcomingHarvests = adminProcedure
  .input(z.object({ daysAhead: z.number().default(30) }))
  .output(z.array(z.object({
    vendorId: z.number(),
    vendorName: z.string(),
    expectedHarvestDate: z.date(),
    daysUntil: z.number(),
    notes: z.string().nullable(),
    lastOutreach: z.date().nullable()
  })))
  .query(async ({ input }) => {});

vendors.logOutreach = adminProcedure
  .input(z.object({
    vendorId: z.number(),
    outreachType: z.enum(['CALL', 'TEXT', 'EMAIL', 'VISIT', 'OTHER']),
    notes: z.string().optional(),
    nextHarvestDate: z.date().optional()
  }))
  .output(z.object({ logId: z.number() }))
  .mutation(async ({ input, ctx }) => {});
```

## 5. UI/UX Specification

### 5.1 Wireframe: Vendor Profile - Harvest Section

```
┌─────────────────────────────────────────────────────────────┐
│  🌱 Harvest Schedule                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Expected Harvest: [Jan 15, 2025    📅]                    │
│  Remind me: [7] days before                                │
│  Notes: [Usually has Blue Dream and OG Kush___]            │
│                                                             │
│  📞 Outreach History                         [+ Log Contact]│
│  ─────────────────────────────────────────                  │
│  • Dec 28 - Called, confirmed Jan 15 harvest (John)        │
│  • Dec 15 - Texted, no response (Jane)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Wireframe: Dashboard Widget

```
┌─────────────────────────────────────────────────────────────┐
│  🌱 Upcoming Harvests                              [View All]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • Farm A - Jan 15 (in 16 days) - Last contact: Dec 28     │
│  • Farm B - Jan 20 (in 21 days) - ⚠️ No recent contact     │
│  • Farm C - Jan 25 (in 26 days) - Last contact: Dec 20     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Acceptance Criteria

- [ ] Harvest date field on vendor profile
- [ ] Dashboard widget shows upcoming harvests
- [ ] Outreach can be logged
- [ ] Reminder notification sent X days before

## 6. Testing Requirements

- [ ] Harvest date CRUD
- [ ] Upcoming harvests query
- [ ] Outreach logging
- [ ] Reminder notification trigger

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
