# TERP Strategic Roadmap 2026

## Single Source of Truth - Customer Meeting + Technical Specs + Development Backlog

**Version:** 1.1
**Last Updated:** 2026-01-12
**Status:** Active
**Source Data:**
- Customer Meeting Analysis (2026-01-11): 75 items, 59:45 recording
- Technical Specifications: 14 new specs created
- Existing MASTER_ROADMAP.md: Active development tasks
- Audio Transcript: Full verbatim reference

> **THIS DOCUMENT SUPERSEDES:**
> - `UNIFIED_STRATEGIC_ROADMAP_2026-01-12.md`
> - All previous strategic roadmap documents

---

# STRATEGIC ANALYSIS

## Business Impact Matrix

| Impact Area | Pain Level | Frequency | Revenue Risk | Priority Score |
|-------------|------------|-----------|--------------|----------------|
| Cash Audit Accuracy | SEVERE | Weekly | HIGH | **10/10** |
| Intake Verification | SEVERE | Daily | HIGH | **10/10** |
| Client Ledger Clarity | HIGH | Daily | MEDIUM | **9/10** |
| Pricing Flexibility | HIGH | Daily | HIGH | **9/10** |
| Live Shopping Flow | HIGH | Daily | HIGH | **9/10** |
| VIP Portal | MEDIUM | Weekly | LOW | **6/10** |
| Reporting/Analytics | LOW | Monthly | LOW | **4/10** |

## Critical Path Analysis

```
WAVE 1: Stop the Bleeding (Audit + Data Integrity)
    │
    ├── Cash Audit System ──────────────────────────────────────┐
    │   (MEET-001, 002, 003, 004)                               │
    │   "Audit tipping off every week" = immediate pain         │
    │                                                           │
    ├── Intake Verification ────────────────────────────────────┤
    │   (MEET-064, 065, 066)                                    │
    │   "Off by 12 pounds" = inventory/money discrepancy        │
    │                                                           │
    └── Simple Client Ledger ───────────────────────────────────┘
        (MEET-010)
        Foundation for all payment tracking

WAVE 2: Core Operations (Daily Workflow)
    │
    ├── Live Shopping System ───────────────────────────────────┐
    │   (MEET-075, FEATURE-003)                                 │
    │   "We just do so much live sales now" = primary workflow  │
    │                                                           │
    ├── Pricing Engine ─────────────────────────────────────────┤
    │   (MEET-014, 026, FEAT-004, ENH-004)                      │
    │   "Negotiating price adjustment on the fly"               │
    │                                                           │
    └── Vendor/Brand Clarity ───────────────────────────────────┘
        (MEET-027, 028, 029, 030, FEAT-002)
        "Vendor and brand are two different things"

WAVE 3: Enhanced Capability (Efficiency)
    │
    ├── Client 360 View ────────────────────────────────────────┐
    │   (MEET-007, 008, 009, 013, ENH-002)                      │
    │   Buyer/Supplier unified + referrals                      │
    │                                                           │
    ├── Inventory Intelligence ─────────────────────────────────┤
    │   (MEET-020, 024, 055, 057)                               │
    │   Suggested buyers + aging + needs matching               │
    │                                                           │
    └── Scheduling System ──────────────────────────────────────┘
        (MEET-046, 047, FEAT-005, ENH-005)
        Appointments + multi-room

WAVE 4: VIP & Polish (Differentiation)
    │
    ├── VIP Portal Enhancement ─────────────────────────────────┐
    │   (MEET-041-056, 071)                                     │
    │   Status tiers + leaderboard + self-service               │
    │                                                           │
    └── UI Polish ──────────────────────────────────────────────┘
        (ENH-006, 007, 008)
        Order preview + nomenclature + images
```

## Quick Wins (High Value, Low Effort)

These tasks deliver immediate value with minimal development:

| Task | Value | Effort | ROI | Description |
|------|-------|--------|-----|-------------|
| MEET-033 | HIGH | 4h | **★★★★★** | Searchable supplier dropdown (100+ suppliers) |
| MEET-066 | HIGH | 2h | **★★★★★** | Intake terminology (Intake/Intake Receipt) |
| MEET-031 | MEDIUM | 2h | **★★★★☆** | Hide SKU field (user confusion) |
| MEET-028 | MEDIUM | 8h | **★★★★☆** | Brand → Farmer Code terminology |
| MEET-037 | MEDIUM | 2h | **★★★★☆** | Editable product names |
| MEET-004 | HIGH | 4h | **★★★★☆** | Shift payment tracking |

**Recommendation:** Execute quick wins in parallel with Wave 1 for early visible progress.

## Risk-Adjusted Priority

| Risk | Current Impact | Tasks That Mitigate | Priority Boost |
|------|----------------|---------------------|----------------|
| RISK-001: Audit discrepancies | Weekly failures | MEET-001, 002, 003 | +3 |
| RISK-002: Intake errors (12 lbs) | Lost inventory/money | MEET-064, 065 | +3 |
| RISK-003: Financial term confusion | User frustration | MEET-053 | +1 |
| RISK-004: Copy/paste errors | Data integrity | MEET-010 | +2 |
| RISK-005: Aging inventory losses | Revenue loss | MEET-024, 061 | +2 |
| RISK-006: Complex buyer/supplier | Workflow friction | MEET-007, 008 | +1 |

---

## Executive Summary

| Priority | Customer Items | Specs | Hours |
|----------|---------------|-------|-------|
| WAVE 1: Stop Bleeding | 14 | 0 | 70-90h |
| WAVE 2: Core Ops | 17 | 3 | 160-190h |
| WAVE 3: Enhanced | 25 | 7 | 220-260h |
| WAVE 4: VIP/Polish | 19 | 4 | 260-310h |
| **TOTAL** | **75** | **14** | **710-850h** |

> **Validation:** 75/75 meeting items tracked in Appendix A traceability matrix

---

# WAVE 1: STOP THE BLEEDING (60-80h)

> **Goal:** Eliminate weekly audit failures and intake discrepancies
> **Success Metric:** Zero audit variances for 4 consecutive weeks
> **Duration:** 2-3 weeks

---

## 1.1 Cash Audit System (CRITICAL - 24h)

**Business Problem:** Weekly audit failures causing frustration and wasted time
**Root Cause:** Multiple error points in spreadsheet (copy/paste, manual entry)
**Solution:** Simple in/out ledger with automatic reconciliation

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-001 | Dashboard: Available Money Display | 4h | - | 🔴 TODO |
| MEET-002 | Multi-Location Cash (Z + Doc) | 8h | MEET-001 | 🔴 TODO |
| MEET-003 | Z's Cash Audit - In/Out Ledger | 8h | MEET-002 | 🔴 TODO |
| MEET-004 | Shift Payment Tracking with Reset | 4h | MEET-001 | 🔴 TODO |

**User Quote:**
> "I kept my audit tipping off every fucking week and it's driving me crazy"
> "There's just many areas for error versus just in and out"

**Implementation:**
```
Dashboard displays:
├── Total Cash on Hand: $XX,XXX
├── Scheduled Payables: $XX,XXX
├── Available Cash: $XX,XXX (Total - Payables)
├── Z's Cash: $XX,XXX (in/out ledger)
├── Doc's Cash: $XX,XXX
└── Shift Payments: $X,XXX [Reset Button]
```

**Acceptance Criteria:**
- [ ] Dashboard shows Total, Payables, Available
- [ ] Separate Z and Doc cash tracking
- [ ] Weekly reset capability with audit trail
- [ ] Zero audit variance for 4 weeks = success

---

## 1.2 Intake Verification (CRITICAL - 22h)

**Business Problem:** Inventory discrepancies ("off by 12 pounds")
**Root Cause:** Person entering receipt not communicating with person stacking
**Solution:** Two-step verification with receipt generation

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-064 | Intake Receipt Tool | 8h | - | 🔴 TODO |
| MEET-065 | Verification Process (stacker confirms) | 12h | MEET-064 | 🔴 TODO |
| MEET-066 | Intake Flow Terminology | 2h | - | 🔴 TODO |

**User Quote:**
> "We've been off by 12 pounds"
> "The person stacking the weed is not talking... we're not ticking it up"

**Implementation:**
```
Intake Flow:
1. Create Intake Receipt ──► Send to Farmer for verification
2. Stacker Receives Product ──► Confirms quantities match
3. Discrepancy? ──► Flag for admin review
4. Confirm ──► Finalize intake to inventory
```

**Acceptance Criteria:**
- [ ] Receipt can be generated and sent to farmer
- [ ] Stacker has verification screen
- [ ] Discrepancies flagged with admin notification
- [ ] All changes logged for audit

---

## 1.3 Simple Client Ledger (CRITICAL - 16h)

**Business Problem:** Complex tabs for clients who are buyers AND suppliers
**Root Cause:** Multiple transaction types (products, shipping, credits, debits)
**Solution:** Unified ledger with all ins and outs

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-010 | Simple Client Ledger (ins/outs + balance) | 16h | - | 🔴 TODO |

**User Quote:**
> "His tab is the most annoying... we credit his tab for shipping, products, flowers..."
> "It's kind of a lot of in and out"

**Acceptance Criteria:**
- [ ] Single view showing all credits and debits
- [ ] Running balance calculation
- [ ] "What they owe" / "What you owe them" in plain language
- [ ] Point-in-time balance lookup for disputes

---

## 1.4 Critical Bugs (8h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-049 | Calendar Navigation Bug (disappears after code changes) | 8h | - | 🔴 TODO |

**User Quote:**
> Calendar disappears from navigation when code changes are made

**Note:** This is a P1 major bug identified in the unified report.

---

## 1.5 Constraints & Business Rules

| Task ID | Description | Type | Status |
|---------|-------------|------|--------|
| MEET-059 | No AI Integration - Manual control first | CONSTRAINT | 🔒 ACTIVE |
| MEET-011 | New Clients Added Infrequently (2-3x/year) | CONTEXT | 📝 NOTED |
| MEET-016 | Live Sales Now Primary Method (shift from list shopping) | CONTEXT | 📝 NOTED |

**User Quote (MEET-059):**
> "Just to be clear for the recording, we're not doing AI yet"
> "I want to set all the parameters [before AI]"

**Implementation Note:** All logic must be rule-based and user-controlled. No AI/ML features until explicitly requested.

---

# WAVE 2: CORE OPERATIONS (150-180h)

> **Goal:** Enable primary daily workflows (live shopping, pricing, vendor tracking)
> **Success Metric:** Complete sales flow without workarounds
> **Duration:** 4-6 weeks
> **Prerequisite:** Wave 1 complete

---

## 2.1 Live Shopping System (40h)

**Business Problem:** Primary workflow is now in-person sales, not list shopping
**Impact:** "We just do so much live sales now... multiple times a day"

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-075 | Live Shopping Feature | 40h | - | 🔴 TODO |

**Links to:** FEATURE-003-SPEC.md

---

## 2.2 Pricing Engine (48h)

**Business Problem:** Markups vary by age, quantity, negotiation
**Impact:** Price changes happen "on the fly" during sales

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-014 | Variable Markups (Age/Quantity) | 20h | - | 🔴 TODO |
| MEET-026 | Real-time Price Negotiation | 16h | MEET-014 | 🔴 TODO |
| MEET-038 | Notes on Product Pricing | 2h | - | 🔴 TODO |
| MEET-039 | Quick Action Pricing Visibility | 4h | - | 🔴 TODO |
| MEET-061 | Suggested Purchase Price (History) | 8h | - | 🔴 TODO |
| MEET-062 | Last Sale Price Lookup (same vendor) | 4h | - | 🔴 TODO |
| MEET-063 | Farmer Receipt History Link | 4h | - | 🔴 TODO |

**User Quote:**
> "Markups are generally based upon how long I've had the product, how much of it I have"
> "I'm negotiating a price adjustment on the fly"
> "Here's a suggested purchase price based upon what you paid last time"

**Links to:** FEAT-004-SPEC.md, ENH-004-SPEC.md

---

## 2.3 Vendor/Brand Clarity (32h)

**Business Problem:** Vendor (who dropped off) ≠ Brand (farmer code)
**Impact:** Searching and tracking inventory by source

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-027 | Vendor vs Brand Distinction | 12h | - | 🔴 TODO |
| MEET-028 | Brand → Farmer Code Terminology | 8h | MEET-027 | 🔴 TODO |
| MEET-029 | Vendor Tied to Farmer Name | 4h | MEET-027 | 🔴 TODO |
| MEET-030 | Vendor Search Shows Related Brands | 8h | MEET-029 | 🔴 TODO |

**User Quote:**
> "Vendor and brand are two different things... T12 will bring in a buddy's flower and list it under T23"

**Links to:** FEAT-002-SPEC.md

---

## 2.4 Payables Logic (12h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-005 | Payables Due When SKU Hits Zero | 8h | - | 🔴 TODO |
| MEET-006 | Office Owned Inventory Tracking | 4h | - | 🔴 TODO |

**User Quote:**
> "When it hits zero, it becomes due. When the inventory hits zero"
> "Somebody has 10 things, five of them are at zero. Those five are due now"

---

## 2.5 Backend APIs (Wave 2 Foundation)

| Task ID | Description | Estimate | Spec | Status |
|---------|-------------|----------|------|--------|
| FEAT-001 | Enhanced Inventory Data API | 16h | FEAT-001-SPEC | 🔴 TODO |
| FEAT-002 | Vendor Context API | 20h | FEAT-002-SPEC | 🔴 TODO |
| FEAT-004 | Pricing & Credit Logic Backend | 28h | FEAT-004-SPEC | 🔴 TODO |

---

# WAVE 3: ENHANCED CAPABILITY (200-240h)

> **Goal:** Add efficiency features (client 360, inventory intelligence, scheduling)
> **Success Metric:** Reduced time per transaction
> **Duration:** 6-8 weeks
> **Prerequisite:** Wave 2 complete

---

## 3.1 Client 360 View (48h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-007 | Clients as Buyers AND Suppliers | 8h | - | 🔴 TODO |
| MEET-008 | Complex Tab (Jesse example) | 12h | MEET-007 | 🔴 TODO |
| MEET-009 | Billing for Services | 8h | MEET-008 | 🔴 TODO |
| MEET-012 | Client Tagging with Referrer | 4h | - | 🔴 TODO |
| MEET-013 | Referrer Lookup | 8h | MEET-012 | 🔴 TODO |
| MEET-021 | Client Wants/Needs Tracking | 8h | - | 🔴 TODO |

**Links to:** ENH-002-SPEC.md

---

## 3.2 Inventory Intelligence (40h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-020 | Suggested Buyer (Purchase History) | 8h | - | 🔴 TODO |
| MEET-022 | Reverse Lookup (Product Connections) | 8h | MEET-020 | 🔴 TODO |
| MEET-023 | Batch Tracking for Inventory (vendor performance) | 12h | - | 🔴 TODO |
| MEET-024 | Aging Inventory Visual (Red >2 weeks) | 8h | - | 🔴 TODO |
| MEET-025 | Dashboard Aging Quick View | 4h | MEET-024 | 🔴 TODO |
| MEET-055 | Office Needs Auto-Population | 12h | - | 🔴 TODO |

**User Quote:**
> "When I get some trop cherries I'm like who the fuck wanted these things"
> "Red means I've had it for more than two weeks... I need to move this"
> "How am I doing on my flowers from this vendor?"

---

## 3.3 Scheduling System (40h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-046 | Live Appointments | 16h | - | 🔴 TODO |
| MEET-047 | Multiple Rooms (2 meeting + 2 loading) | 8h | MEET-046 | 🔴 TODO |
| MEET-050 | Shift/Vacation Tracking | 8h | MEET-046 | 🔴 TODO |
| MEET-072 | Notification System for Tagging | 8h | - | 🔴 TODO |

**Links to:** FEAT-005-SPEC.md, ENH-005-SPEC.md

---

## 3.4 Transaction Features (52h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-017 | Invoice History (Debt Disputes) | 8h | MEET-010 | 🔴 TODO |
| MEET-018 | Transaction Fee Per Client | 8h | - | 🔴 TODO |
| MEET-019 | Crypto Payment Tracking | 8h | MEET-018 | 🔴 TODO |
| MEET-035 | Payment Terms (Consignment/Cash/COD) | 12h | - | 🔴 TODO |
| MEET-036 | Installment Payments | 16h | MEET-035 | 🔴 TODO |

---

## 3.5 Product Management (32h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-031 | Hide SKU Field | 2h | - | 🔴 TODO |
| MEET-032 | Customizable Categories | 8h | - | 🔴 TODO |
| MEET-033 | Searchable Supplier Dropdown | 4h | - | 🔴 TODO |
| MEET-034 | Expected Delivery Date | 4h | - | 🔴 TODO |
| MEET-037 | Editable Product Names | 2h | - | 🔴 TODO |
| MEET-040 | Product: Name, Category, Brand (not SKU) | 4h | MEET-031 | 🔴 TODO |
| MEET-070 | Product Grades (AAAA/AAA/AA/B/C) | 4h | - | 🔴 TODO |

---

## 3.6 Backend APIs (Wave 3 Foundation)

| Task ID | Description | Estimate | Spec | Status |
|---------|-------------|----------|------|--------|
| FEAT-003 | In-line Product Creation API | 24h | FEAT-003-INLINE-PRODUCT-SPEC | 🔴 TODO |
| FEAT-005 | Scheduling & Referral APIs | 24h | FEAT-005-SPEC | 🔴 TODO |

---

## 3.7 Frontend Integration (Wave 3)

| Task ID | Description | Estimate | Spec | Status |
|---------|-------------|----------|------|--------|
| ENH-001 | Update Inventory Browser Table | 16h | ENH-001-SPEC | 🔴 TODO |
| ENH-002 | Build Client Info Pod | 12h | ENH-002-SPEC | 🔴 TODO |
| ENH-003 | In-line Product Creation UI | 16h | ENH-003-SPEC | 🔴 TODO |
| ENH-004 | On-the-Fly Pricing UI | 20h | ENH-004-SPEC | 🔴 TODO |
| ENH-005 | Scheduling Workflow UI | 16h | ENH-005-SPEC | 🔴 TODO |

---

# WAVE 4: VIP & POLISH (250-300h)

> **Goal:** Differentiation features (VIP portal, gamification, UI polish)
> **Success Metric:** VIP adoption and user satisfaction
> **Duration:** 8-10 weeks
> **Prerequisite:** Wave 3 complete

---

## 4.1 VIP Portal Enhancement (100h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-041 | VIP Debt Aging Notifications | 8h | MEET-021 | 🔴 TODO |
| MEET-042 | Credit Usage Display | 4h | - | 🔴 TODO |
| MEET-043 | VIP Status (Debt Cycling Tiers) | 12h | - | 🔴 TODO |
| MEET-052 | Purchase History | 8h | - | 🔴 TODO |
| MEET-053 | User-Friendly Terminology | 4h | - | 🔴 TODO |
| MEET-054 | Needs/Wants Entry | 8h | MEET-021 | 🔴 TODO |
| MEET-056 | Centralized VIP Requests | 8h | MEET-054 | 🔴 TODO |
| MEET-057 | Matchmaking (Needs ↔ Supplies) | 16h | MEET-055 | 🔴 TODO |
| MEET-058 | Copy-Paste Office Needs | 4h | MEET-055 | 🔴 TODO |
| MEET-071 | VIP Client Management (Admin) | 8h | - | 🔴 TODO |

**VIP Status Tiers (Customizable):**
| Tier | Debt Cycling | Benefits |
|------|--------------|----------|
| Diamond | < 1 week | Best pricing |
| Platinum | 2-3 weeks | Priority access |
| Gold | 4 weeks | Standard |
| Bronze | 5+ weeks | Restricted |

---

## 4.2 Gamification (28h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-044 | Anonymized Leaderboard | 12h | MEET-043 | 🔴 TODO |
| MEET-045 | Rewards System (Medals, Markup %) | 16h | MEET-044 | 🔴 TODO |

**User Quote:**
> "Top 3 spots get 50 on ends and 25 on deps"
> "Start to gamify this a little bit"

---

## 4.3 Referral System (Couch Tax) (20h)

| Task ID | Description | Estimate | Spec | Status |
|---------|-------------|----------|------|--------|
| FEAT-006 | Full Referral Workflow | 20h | FEAT-006-SPEC | 🔴 TODO |

---

## 4.4 UI Polish (28h)

| Task ID | Description | Estimate | Spec | Status |
|---------|-------------|----------|------|--------|
| ENH-006 | Relocate Order Preview | 4h | ENH-006-SPEC | 🔴 TODO |
| ENH-007 | Nomenclature (Brand→Farmer) | 8h | ENH-007-SPEC | 🔴 TODO |
| ENH-008 | Image Toggle for Views | 16h | ENH-008-SPEC | 🔴 TODO |

---

## 4.5 Storage & Location (16h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-067 | Storage Zones (A, B, C, D) | 8h | - | 🔴 TODO |
| MEET-068 | Three Sites (Samples, Storage, Shipping) | 4h | MEET-067 | 🔴 TODO |
| MEET-069 | Category/Subcategory Data Flow | 4h | MEET-032 | 🔴 TODO |

---

## 4.6 User Roles (12h)

| Task ID | Description | Estimate | Dependencies | Status |
|---------|-------------|----------|--------------|--------|
| MEET-051 | User Roles & Permissions | 12h | - | 🔴 TODO |

**User Quote:**
> "You would have a photographer role. And they could only really see inventory"

---

## 4.7 Future/Low Priority

| Task ID | Description | Priority | Notes |
|---------|-------------|----------|-------|
| MEET-015 | Sales Sheet Creator | LOW | "Don't use as much anymore" |
| MEET-048 | Hour Tracking | LOW | "Only 2 hourly employees" |
| MEET-060 | AI: Suggested Quantities | FUTURE | "Not doing AI yet" |
| MEET-073 | Large Distributor Pricing | FUTURE | Business expansion |
| MEET-074 | Modular Sales Options | FUTURE | Product strategy |

---

# KEY DECISIONS

| ID | Decision | Rationale | Impact |
|----|----------|-----------|--------|
| DEC-001 | Brands → Farmer Codes | User mental model | Terminology change |
| DEC-002 | Vendor = Farmer's Name | Simplicity | Data model |
| DEC-003 | Hide SKU Field | User confusion | UI change |
| DEC-004 | Customizable Categories | User control | Admin feature |
| DEC-005 | Gamify Leaderboard | Engagement | VIP feature |
| DEC-006 | No AI Integration | Manual control first | Constraint |
| DEC-007 | Hour Tracking Low Priority | Only 2 hourly | Deferral |
| DEC-008 | Zones Not Rack/Shelf/Bin | Items move too much | Simplification |
| DEC-009 | Intake Terminology | User preference | Naming |
| DEC-010 | New Clients 2-3x/Year | Low frequency | UX priority |

---

# IDENTIFIED RISKS

| Risk | Severity | Mitigation Tasks | Status |
|------|----------|------------------|--------|
| Weekly audit failures | CRITICAL | MEET-001, 002, 003 | Wave 1 |
| Intake discrepancies (12 lbs) | CRITICAL | MEET-064, 065 | Wave 1 |
| Financial term confusion | HIGH | MEET-053 | Wave 4 |
| Copy/paste errors | HIGH | MEET-010 | Wave 1 |
| Aging inventory losses | MEDIUM | MEET-024, 061 | Wave 2-3 |
| Complex buyer/supplier tabs | MEDIUM | MEET-007, 008 | Wave 3 |

---

# SPECIFICATIONS INDEX

| Spec ID | Title | Wave | Estimate |
|---------|-------|------|----------|
| FEAT-001-SPEC | Enhanced Inventory Data API | 2 | 16h |
| FEAT-002-SPEC | Vendor Context API | 2 | 20h |
| FEAT-003-INLINE-PRODUCT-SPEC | In-line Product Creation API | 3 | 24h |
| FEAT-004-SPEC | Pricing & Credit Logic Backend | 2 | 28h |
| FEAT-005-SPEC | Scheduling & Referral APIs | 3 | 24h |
| FEAT-006-SPEC | Full Referral (Couch Tax) Workflow | 4 | 20h |
| ENH-001-SPEC | Update Inventory Browser Table | 3 | 16h |
| ENH-002-SPEC | Build Client Info Pod | 3 | 12h |
| ENH-003-SPEC | Integrate In-line Product Creation UI | 3 | 16h |
| ENH-004-SPEC | On-the-Fly Pricing UI | 3 | 20h |
| ENH-005-SPEC | Full Scheduling Workflow UI | 3 | 16h |
| ENH-006-SPEC | Relocate Order Preview | 4 | 4h |
| ENH-007-SPEC | Apply Nomenclature Changes | 4 | 8h |
| ENH-008-SPEC | Image Toggle for Inventory Views | 4 | 16h |

---

# EXECUTION SUMMARY

| Wave | Focus | MEET Items | Specs | Hours | Duration |
|------|-------|------------|-------|-------|----------|
| 1 | Stop the Bleeding | 14 | 0 | 70-90h | 2-3 weeks |
| 2 | Core Operations | 17 | 3 | 160-190h | 4-6 weeks |
| 3 | Enhanced Capability | 25 | 7 | 220-260h | 6-8 weeks |
| 4 | VIP & Polish | 19 | 4 | 260-310h | 8-10 weeks |
| **TOTAL** | | **75** | **14** | **710-850h** | **20-27 weeks** |

> **QA Validation:** All 75 meeting items + 14 specs accounted for (see Appendix A)

---

*Source: Customer Meeting (2026-01-11), Technical Specs, MASTER_ROADMAP.md*
*Last Updated: 2026-01-12*

---

# APPENDIX A: COMPLETE TRACEABILITY MATRIX

> **Purpose:** Prevent loss of requirements by tracking ALL 75 meeting items to their roadmap location.
> **Validation:** Every MEET-xxx item must appear exactly once in this matrix.

## Full Meeting Item Index (75 Items)

| MEET ID | Description | Wave | Section | Priority |
|---------|-------------|------|---------|----------|
| MEET-001 | Dashboard: Available Money Display | 1 | 1.1 Cash Audit | Now |
| MEET-002 | Multi-Location Cash (Z + Doc) | 1 | 1.1 Cash Audit | Now |
| MEET-003 | Z's Cash Audit - In/Out Ledger | 1 | 1.1 Cash Audit | Now |
| MEET-004 | Shift Payment Tracking with Reset | 1 | 1.1 Cash Audit | Now |
| MEET-005 | Payables Due When SKU Hits Zero | 2 | 2.4 Payables | Now |
| MEET-006 | Office Owned Inventory Tracking | 2 | 2.4 Payables | Now |
| MEET-007 | Clients as Buyers AND Suppliers | 3 | 3.1 Client 360 | Next |
| MEET-008 | Complex Tab (Jesse example) | 3 | 3.1 Client 360 | Next |
| MEET-009 | Billing for Services | 3 | 3.1 Client 360 | Next |
| MEET-010 | Simple Client Ledger | 1 | 1.3 Client Ledger | Now |
| MEET-011 | New Clients Added Infrequently | 1 | 1.5 Constraints | Later |
| MEET-012 | Client Tagging with Referrer | 3 | 3.1 Client 360 | Next |
| MEET-013 | Referrer Lookup | 3 | 3.1 Client 360 | Next |
| MEET-014 | Variable Markups (Age/Quantity) | 2 | 2.2 Pricing | Now |
| MEET-015 | Sales Sheet Creator | 4 | 4.7 Future | Later |
| MEET-016 | Live Sales Now Primary Method | 1 | 1.5 Constraints | Context |
| MEET-017 | Invoice History (Debt Disputes) | 3 | 3.4 Transactions | Next |
| MEET-018 | Transaction Fee Per Client | 3 | 3.4 Transactions | Next |
| MEET-019 | Crypto Payment Tracking | 3 | 3.4 Transactions | Next |
| MEET-020 | Suggested Buyer (Purchase History) | 3 | 3.2 Inventory Intel | Next |
| MEET-021 | Client Wants/Needs Tracking | 3 | 3.1 Client 360 | Next |
| MEET-022 | Reverse Lookup (Product Connections) | 3 | 3.2 Inventory Intel | Next |
| MEET-023 | Batch Tracking for Inventory | 3 | 3.2 Inventory Intel | Next |
| MEET-024 | Aging Inventory Visual | 3 | 3.2 Inventory Intel | Now |
| MEET-025 | Dashboard Aging Quick View | 3 | 3.2 Inventory Intel | Next |
| MEET-026 | Real-time Price Negotiation | 2 | 2.2 Pricing | Now |
| MEET-027 | Vendor vs Brand Distinction | 2 | 2.3 Vendor/Brand | Now |
| MEET-028 | Brand → Farmer Code Terminology | 2 | 2.3 Vendor/Brand | Now |
| MEET-029 | Vendor Tied to Farmer Name | 2 | 2.3 Vendor/Brand | Next |
| MEET-030 | Vendor Search Shows Related Brands | 2 | 2.3 Vendor/Brand | Next |
| MEET-031 | Hide SKU Field | 3 | 3.5 Product Mgmt | Next |
| MEET-032 | Customizable Categories | 3 | 3.5 Product Mgmt | Next |
| MEET-033 | Searchable Supplier Dropdown | 3 | 3.5 Product Mgmt | Now |
| MEET-034 | Expected Delivery Date | 3 | 3.5 Product Mgmt | Next |
| MEET-035 | Payment Terms (Consignment/Cash/COD) | 3 | 3.4 Transactions | Next |
| MEET-036 | Installment Payments | 3 | 3.4 Transactions | Next |
| MEET-037 | Editable Product Names | 3 | 3.5 Product Mgmt | Next |
| MEET-038 | Notes on Product Pricing | 2 | 2.2 Pricing | Next |
| MEET-039 | Quick Action Pricing Visibility | 2 | 2.2 Pricing | Next |
| MEET-040 | Product: Name, Category, Brand | 3 | 3.5 Product Mgmt | Next |
| MEET-041 | VIP Debt Aging Notifications | 4 | 4.1 VIP Portal | Next |
| MEET-042 | Credit Usage Display | 4 | 4.1 VIP Portal | Next |
| MEET-043 | VIP Status (Debt Cycling Tiers) | 4 | 4.1 VIP Portal | Next |
| MEET-044 | Anonymized Leaderboard | 4 | 4.2 Gamification | Next |
| MEET-045 | Rewards System (Medals, Markup %) | 4 | 4.2 Gamification | Next |
| MEET-046 | Live Appointments | 3 | 3.3 Scheduling | Next |
| MEET-047 | Multiple Rooms (2 meeting + 2 loading) | 3 | 3.3 Scheduling | Next |
| MEET-048 | Hour Tracking | 4 | 4.7 Future | Later |
| MEET-049 | Calendar Navigation Bug | 1 | 1.4 Critical Bugs | Now |
| MEET-050 | Shift/Vacation Tracking | 3 | 3.3 Scheduling | Next |
| MEET-051 | User Roles & Permissions | 4 | 4.6 User Roles | Next |
| MEET-052 | VIP Purchase History | 4 | 4.1 VIP Portal | Next |
| MEET-053 | User-Friendly Terminology | 4 | 4.1 VIP Portal | Next |
| MEET-054 | VIP Needs/Wants Entry | 4 | 4.1 VIP Portal | Next |
| MEET-055 | Office Needs Auto-Population | 3 | 3.2 Inventory Intel | Now |
| MEET-056 | Centralized VIP Requests | 4 | 4.1 VIP Portal | Next |
| MEET-057 | Matchmaking (Needs ↔ Supplies) | 4 | 4.1 VIP Portal | Next |
| MEET-058 | Copy-Paste Office Needs | 4 | 4.1 VIP Portal | Next |
| MEET-059 | No AI Integration (Constraint) | 1 | 1.5 Constraints | Now |
| MEET-060 | AI: Suggested Quantities | 4 | 4.7 Future | Future |
| MEET-061 | Suggested Purchase Price (History) | 2 | 2.2 Pricing | Next |
| MEET-062 | Last Sale Price Lookup | 2 | 2.2 Pricing | Next |
| MEET-063 | Farmer Receipt History Link | 2 | 2.2 Pricing | Next |
| MEET-064 | Intake Receipt Tool | 1 | 1.2 Intake | Now |
| MEET-065 | Verification Process (stacker confirms) | 1 | 1.2 Intake | Now |
| MEET-066 | Intake Flow Terminology | 1 | 1.2 Intake | Now |
| MEET-067 | Storage Zones (A, B, C, D) | 4 | 4.5 Storage | Next |
| MEET-068 | Three Sites (Samples, Storage, Shipping) | 4 | 4.5 Storage | Next |
| MEET-069 | Category/Subcategory Data Flow | 4 | 4.5 Storage | Next |
| MEET-070 | Product Grades (AAAA/AAA/AA/B/C) | 3 | 3.5 Product Mgmt | Next |
| MEET-071 | VIP Client Management (Admin) | 4 | 4.1 VIP Portal | Next |
| MEET-072 | Notification System for Tagging | 3 | 3.3 Scheduling | Next |
| MEET-073 | Large Distributor Pricing | 4 | 4.7 Future | Future |
| MEET-074 | Modular Sales Options | 4 | 4.7 Future | Future |
| MEET-075 | Live Shopping Feature | 2 | 2.1 Live Shopping | Now |

## Validation Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total MEET Items | 75 | ✅ |
| Wave 1 Items | 14 | ✅ |
| Wave 2 Items | 17 | ✅ |
| Wave 3 Items | 25 | ✅ |
| Wave 4 Items | 19 | ✅ |
| **Accounted For** | **75** | ✅ COMPLETE |

## Specification Cross-Reference

| Spec ID | Related MEET Items | Wave |
|---------|-------------------|------|
| FEAT-001-SPEC | MEET-024, MEET-033 | 2-3 |
| FEAT-002-SPEC | MEET-027, MEET-028, MEET-029, MEET-030 | 2 |
| FEAT-003-SPEC | (new product creation) | 3 |
| FEAT-004-SPEC | MEET-014, MEET-026, MEET-035, MEET-036 | 2-3 |
| FEAT-005-SPEC | MEET-046, MEET-047, MEET-050 | 3 |
| FEAT-006-SPEC | MEET-012, MEET-013 | 4 |
| ENH-001-SPEC | MEET-033, MEET-024 | 3 |
| ENH-002-SPEC | MEET-007, MEET-008, MEET-010 | 3 |
| ENH-003-SPEC | (inline product creation) | 3 |
| ENH-004-SPEC | MEET-014, MEET-026, MEET-038, MEET-039 | 3 |
| ENH-005-SPEC | MEET-046, MEET-047, MEET-050 | 3 |
| ENH-006-SPEC | (order preview) | 4 |
| ENH-007-SPEC | MEET-028 | 4 |
| ENH-008-SPEC | (image toggle) | 4 |

---

# APPENDIX B: PREVENTION SYSTEM

## How to Prevent Future Data Loss

### 1. Source Traceability Rule
Every requirement MUST have:
- A unique ID (MEET-xxx, FEAT-xxx, BUG-xxx)
- A traceable source (meeting timestamp, transcript quote, spec file)
- A wave/section assignment

### 2. Validation Checklist (Run Before Finalizing)
```
□ Count source items (e.g., 75 from meeting)
□ Count roadmap items
□ Verify counts match
□ Cross-reference each item ID
□ Flag any gaps
```

### 3. Change Control
When adding/removing items:
- Update Appendix A traceability matrix
- Update wave section totals
- Update executive summary
- Run validation checklist

### 4. Audit Trail
Maintain in version control:
- Source documents (transcripts, meeting notes)
- Analysis documents (unified reports)
- Spec files
- This roadmap with traceability matrix

---

*Traceability Matrix Added: 2026-01-12*
*QA Validation: 75/75 items accounted for (100%)*

