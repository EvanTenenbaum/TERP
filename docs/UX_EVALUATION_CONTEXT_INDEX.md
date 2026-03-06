# TERP UX Evaluation — Context Index for AI Reviewer

**Created:** 2026-03-06
**Purpose:** Curated index of all docs an AI should ingest to evaluate the UX of TERP.

---

## How to Use This Document

Feed the documents below (in priority order) as context to the AI evaluating TERP's UX. The files are organized into tiers — Tier 1 is essential, Tier 2 adds depth, Tier 3 is supplemental.

---

## Tier 1: Essential Context (Start Here)

These docs give the AI a complete picture of what TERP is, who uses it, and how it's designed.

| # | File | What It Covers |
|---|------|---------------|
| 1 | `docs/PROJECT_CONTEXT.md` | Full system overview — modules, architecture, user roles, known issues, design philosophy |
| 2 | `docs/TERP_DESIGN_SYSTEM.md` | Design principles, component library choices, navigation architecture, accessibility, responsive strategy |
| 3 | `docs/user-guide/README.md` | User guide index — all modules, navigation, quick actions, keyboard shortcuts |
| 4 | `docs/user-guide/getting-started.md` | First-time user walkthrough |
| 5 | `docs/user-guide/inventory.md` | Inventory features — batch management, intake, stock levels |
| 6 | `docs/user-guide/sales.md` | Sales — orders, quotes, multi-order, referral credits |
| 7 | `docs/user-guide/accounting.md` | Accounting — quick payments, ledger, AR/AP |
| 8 | `docs/user-guide/pick-pack.md` | Warehouse — pick & pack, group bagging, fulfillment |
| 9 | `docs/LINEAR_UIUX_ASSESSMENT_AND_MODULE_MAPPING.md` | How Linear's "calm power" design patterns map to every TERP module — workspace shells, grid surfaces, navigation |
| 10 | `docs/uiux/2026-03-04-terp-uiux-master-plan-priority.md` | Current UX priority plan — 6 high-priority tasks with acceptance criteria, guardrails |

---

## Tier 2: Feature Specs & User Flows (Deep Dive)

These describe specific workflows, business logic, and planned improvements.

### UI/UX Design Docs

| File | What It Covers |
|------|---------------|
| `docs/uiux/2026-03-04-terp-uiux-master-plan-linear-map.md` | Linear pattern → TERP surface mapping detail |
| `docs/uiux/2026-03-04-terp-inventory-delete-redesign-spec.md` | Inventory delete flow redesign — error surfaces, selection mode |
| `docs/uiux/2026-03-04-dashboard-refresh-low-blast-radius-plan.md` | Dashboard refresh plan — widget layout, low-disruption approach |
| `docs/uiux/2026-03-05-dashboard-path-decision.md` | Dashboard direction decision |
| `docs/uiux/2026-03-04-inventory-gemini-priority-ranking.md` | Inventory UX priority ranking |
| `docs/MOBILE_RESPONSIVE_PATTERNS.md` | Breakpoints, responsive grid patterns, mobile-first approach |

### Critical Feature Specs (User-Facing Workflows)

| Spec | Feature | Priority |
|------|---------|----------|
| `docs/specs/WS-001-SPEC.md` | Quick Action: Receive Client Payment | CRITICAL |
| `docs/specs/WS-002-SPEC.md` | Quick Action: Pay Supplier | CRITICAL |
| `docs/specs/WS-003-SPEC.md` | Pick & Pack: Group Bagging | CRITICAL |
| `docs/specs/WS-004-SPEC.md` | Multi-Order & Referral Credit | CRITICAL |
| `docs/specs/WS-005-SPEC.md` | No Black Box Audit Trail | CRITICAL |
| `docs/specs/WS-006-SPEC.md` | Tab Screenshot/Receipt | HIGH |
| `docs/specs/WS-007-SPEC.md` | Complex Flower Intake Flow | HIGH |
| `docs/specs/WS-008-SPEC.md` | Low Stock & Needs-Based Alerts | HIGH |
| `docs/specs/WS-009-SPEC.md` | Inventory Movement & Shrinkage Tracking | HIGH |
| `docs/specs/WS-010-SPEC.md` | Photography Module | HIGH |
| `docs/specs/WS-011-SPEC.md` | Quick Customer Creation | MEDIUM |
| `docs/specs/WS-012-SPEC.md` | Customer Preferences & Purchase History | MEDIUM |
| `docs/specs/WS-013-SPEC.md` | Simple Task Management | MEDIUM |
| `docs/specs/WS-014-SPEC.md` | Supplier Harvest Reminders | MEDIUM |
| `docs/specs/FEATURE-003-SPEC.md` | Live Shopping Session | HIGH |
| `docs/specs/FEATURE-006-SPEC.md` | VIP Booking System | MEDIUM |
| `docs/specs/FEATURE-008-SPEC.md` | Advanced Filtering & Search | MEDIUM |
| `docs/specs/FEATURE-011-SPEC.md` | Unified Product Catalogue | HIGH |
| `docs/specs/FEATURE-020-SPEC.md` | Tags System Revamp | MEDIUM |

### Wave 1 "Stop the Bleeding" Specs

| Spec | Feature | Priority |
|------|---------|----------|
| `docs/specs/FEAT-007-CASH-AUDIT-SPEC.md` | Cash Audit System | CRITICAL |
| `docs/specs/FEAT-008-INTAKE-VERIFICATION-SPEC.md` | Intake Verification System | CRITICAL |
| `docs/specs/FEAT-009-CLIENT-LEDGER-SPEC.md` | Simple Client Ledger | CRITICAL |

### Frontend Enhancement Specs (UI Improvements)

| Spec | Feature | Priority |
|------|---------|----------|
| `docs/specs/ENH-001-SPEC.md` | Update Inventory Browser Table | CRITICAL |
| `docs/specs/ENH-002-SPEC.md` | Build Client Info Pod | HIGH |
| `docs/specs/ENH-003-SPEC.md` | Integrate In-line Product Creation UI | HIGH |
| `docs/specs/ENH-004-SPEC.md` | On-the-Fly Pricing UI | HIGH |
| `docs/specs/ENH-005-SPEC.md` | Full Scheduling Workflow UI | MEDIUM |
| `docs/specs/ENH-006-SPEC.md` | Relocate Order Preview | LOW |
| `docs/specs/ENH-007-SPEC.md` | Apply Nomenclature Changes (Brand→Farmer) | LOW |
| `docs/specs/ENH-008-SPEC.md` | Image Toggle for Inventory Views | MEDIUM |

### Backend API Specs (Supporting UX)

| Spec | Feature |
|------|---------|
| `docs/specs/FEAT-001-SPEC.md` | Enhanced Inventory Data API |
| `docs/specs/FEAT-002-SPEC.md` | Supplier Context API |
| `docs/specs/FEAT-003-INLINE-PRODUCT-SPEC.md` | In-line Product Creation API |
| `docs/specs/FEAT-004-SPEC.md` | Pricing & Credit Logic Backend |
| `docs/specs/FEAT-005-SPEC.md` | Scheduling & Referral APIs |
| `docs/specs/FEAT-006-SPEC.md` | Full Referral (Couch Tax) Workflow |

---

## Tier 3: Supplemental Context

### VIP Portal (External-Facing UX)

| File | What It Covers |
|------|---------------|
| `docs/guides/vip-portal/README.md` | VIP portal overview |
| `docs/guides/vip-portal/getting-started.md` | VIP portal setup |
| `docs/guides/vip-portal/dashboard.md` | VIP dashboard features |
| `docs/guides/vip-portal/appointments.md` | Appointment booking |
| `docs/guides/vip-portal/documents.md` | Document management |
| `docs/guides/vip-portal/notifications.md` | Notification system |

### QA & Golden Flows (Verified User Paths)

| File | What It Covers |
|------|---------------|
| `docs/qa/outputs/golden_flows.md` | Verified critical user flows — Direct Intake→Inventory, Client→Order→Invoice |
| `docs/qa/outputs/business_logic.md` | Business logic validation |
| `docs/pr-golden-flows-batch.md` | Golden flow batch documentation |

### API Reference (How the Backend Supports UX)

| File | What It Covers |
|------|---------------|
| `docs/api/README.md` | tRPC API overview |
| `docs/api/authentication.md` | Auth API |
| `docs/api/clients.md` | Clients API |
| `docs/api/orders.md` | Orders API |
| `docs/api/inventory.md` | Inventory API |
| `docs/api/calendar.md` | Calendar API |
| `docs/api/vip-portal.md` | VIP Portal API |

### Product & Owner Notes

| File | What It Covers |
|------|---------------|
| `docs/notes/user-feedback.md` | Owner's ongoing feedback and product insights |
| `docs/notes/known-issues.md` | Known bugs and technical debt |
| `docs/notes/feature-ideas.md` | Future feature ideas |
| `product-management/USER_GUIDE.md` | Product-level user guide |
| `product-management/SYSTEM_DESIGN.md` | System design overview |

### Architecture (For Understanding Constraints)

| File | What It Covers |
|------|---------------|
| `CLAUDE.md` | System protocol — tech stack, party model, forbidden patterns, key directories |
| `.claude/skills/architecture/SKILL.md` | Deep architecture — auth flow, query patterns, conventions |
| `docs/batch-status-transitions.md` | Batch lifecycle states |

### Roadmaps (What's Planned)

| File | What It Covers |
|------|---------------|
| `docs/roadmaps/MASTER_ROADMAP.md` | Full task roadmap — all planned work with status |
| `docs/specs/README.md` | Specs index — 27 approved, 14 draft specs |
| `docs/specs/FEAT-SIGNAL-001-SPEC.md` | Signal messaging integration (ready for implementation) |

---

## Key Facts for the UX Evaluator

1. **Domain:** THCA wholesale cannabis operations (B2B, not retail)
2. **Primary Users:** Warehouse operators, sales team, accounting, management — all internal staff
3. **External Users:** VIP customers via a separate portal
4. **Design System:** Custom build on Radix UI + Tailwind CSS 4 + shadcn/ui
5. **Design Philosophy:** "Calm power" — Linear-inspired, data-dense but clean, progressive disclosure
6. **Mobile:** Mobile-first responsive design; primary breakpoint at 768px (md)
7. **Key UX Goal:** Faster than spreadsheets, not "glorified spreadsheets"
8. **Owner Preference:** Fast interfaces, no jargon, minimal clicks for common operations
9. **Current UX Priorities:** Inventory delete flow, error surface consolidation, focused selection mode, dashboard refresh
10. **Tech Stack:** React 19 + TypeScript + Tailwind 4 + tRPC — fully client-rendered SPA

---

## Suggested Evaluation Dimensions

For the AI reviewer, consider evaluating across these dimensions:

- **Task Efficiency** — How many clicks/steps for the most common workflows?
- **Information Architecture** — Is the navigation logical? Can users find what they need?
- **Error Handling** — Are errors actionable? Do they guide recovery?
- **Progressive Disclosure** — Is complexity hidden until needed?
- **Consistency** — Do patterns repeat predictably across modules?
- **Data Density** — Is information presented efficiently without overwhelming?
- **Mobile Readiness** — Do critical workflows work on tablets/phones?
- **Onboarding** — Can a new user figure out the system without training?
- **Accessibility** — WCAG 2.1 AA compliance, keyboard navigation, screen readers
- **Visual Hierarchy** — Is the most important information most prominent?
