# VIP Portal Sprint Specifications (REVISED v2)

**Last Updated:** January 2, 2026
**Status:** REVISED - Added Appointment Scheduling, Removed SSO

---

## Critical Correction

A comprehensive audit of the backend codebase (1,614 lines in `vipPortal.ts` alone) revealed that the VIP Portal backend is **~90% complete**. The issues observed in the live portal are **frontend integration failures**, not missing backend functionality.

### What Already Exists (Backend)

| Component | Status | Lines of Code |
|-----------|--------|---------------|
| Authentication (login, logout, session, register, reset) | ✅ Complete | ~250 |
| Dashboard KPIs | ✅ Complete | ~70 |
| AR/AP (Invoices, Bills) | ✅ Complete | ~110 |
| Transactions History | ✅ Complete | ~60 |
| Marketplace (Needs, Supply) | ✅ Complete | ~260 |
| Leaderboard | ✅ Complete | ~140 |
| Live Catalog (browse, filter, search) | ✅ Complete | ~400 |
| Draft Interests & Interest Lists | ✅ Complete | ~200 |
| Saved Views | ✅ Complete | ~100 |
| Price Alerts | ✅ Complete | ~60 |

### What's Actually Broken (Frontend)

| Issue | Severity | Root Cause |
|-------|----------|------------|
| Dashboard renders only 2 of 7+ KPIs | CRITICAL | Frontend not consuming full API response |
| Catalog shows "No products found" | CRITICAL | Frontend query or rendering bug |
| UI elements are not actionable (0% click-through) | HIGH | No click handlers implemented |
| Mobile navigation is incomplete | HIGH | Responsive design not fully implemented |

---

## Revised Sprint Focus

This sprint focuses on **fixing the frontend** to expose the already-built backend functionality, then adding a new **Appointment Scheduling System**.

| Phase | Focus | Effort | Priority |
|-------|-------|--------|----------|
| Phase 1 | Fix Frontend Rendering (Dashboard, Catalog, AR/AP) | 24h | CRITICAL |
| Phase 2 | Mobile-First UI & Actionability | 48h | HIGH |
| Phase 3 | New Features (Appointment Scheduling, PDF Generation) | 68h | MEDIUM |

**Total Estimate:** 140 hours

---

## Specification Files

| Spec ID | Title | Priority | Status |
|---------|-------|----------|--------|
| VIP-F-001 | Fix Frontend Rendering Issues | CRITICAL | 🔴 Not Started |
| VIP-M-001 | Mobile-First UI Redesign | HIGH | 🔴 Not Started |
| VIP-A-001 | Actionability Implementation | HIGH | 🔴 Not Started |
| VIP-B-001 | PDF Generation for Invoices/Bills | MEDIUM | 🔴 Not Started |
| **VIP-C-001** | **Appointment Scheduling System (Calendly-like)** | **HIGH** | 🔴 Not Started |

---

## New Feature: Appointment Scheduling System (VIP-C-001)

This feature replaces the SSO requirement. It allows VIP Portal clients to schedule appointments for:

1. **Payment Pickup/Drop-off:** Clients can schedule a time to pick up or drop off payments with the accounting team.
2. **Office Visits:** Clients can schedule time in the office for vending, purchasing, or other business.

The system includes:

| Component | Description |
|-----------|-------------|
| **ERP Calendar Management** | Managers create "Calendars" (e.g., "Accounting Payments", "Office Visits") with custom availability, buffer times, and minimum notice. |
| **VIP Portal Booking UI** | Clients see available time slots and submit appointment requests. |
| **Request/Approval Workflow** | Managers receive notifications, can accept/reject/propose new times. |
| **Automatic Calendar Integration** | Confirmed appointments are automatically added to the ERP calendar. |

---

## Business Logic Clarification

**The VIP Portal is NOT an e-commerce platform.**

The correct workflow is:
1. Client browses the Live Catalog
2. Client adds items to a "Draft" (expressing interest)
3. Client submits the draft as an "Interest List"
4. Internal staff reviews the Interest List
5. Staff manually creates a Quote or Order

There is **no online payment** and **no direct purchasing**.

---

## Key Principles

1. **Mobile-First Design:** All new UI must be designed for mobile viewports first, then enhanced for desktop.
2. **Actionability Mandate:** Every data element (KPI, invoice, product) must be clickable with meaningful actions.
3. **Specification Alignment:** All work must align with the VIP Portal V3 specification.
4. **Feature Flags:** Major UI changes must be deployed behind feature flags for safe rollback.

---

## Related Documents

- [VIP Portal Feature Spec V3](../../archive/vip-portal/VIP_CLIENT_PORTAL_FEATURE_SPEC_V3.md)
- [VIP Portal Gap Analysis](../../archive/vip-portal/VIP_PORTAL_GAP_ANALYSIS.md)
- [UX Improvements Sprint](../ux-improvements/README.md)
