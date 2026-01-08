# Wave Execution Plan - Video Testing Session Tasks

**Created:** January 7, 2026  
**Total Tasks:** 46  
**Estimated Total Hours:** ~200 hours  
**Target Completion:** 3-4 weeks with parallel execution

---

## Executive Summary

This execution plan organizes the 46 tasks identified from the video testing session into 5 waves, prioritizing critical bugs first, then core functionality, followed by UX improvements and polish. Each wave is designed to be completed in approximately 1 week with parallel work streams.

---

## Wave Overview

| Wave | Focus | Tasks | Hours | Duration |
|------|-------|-------|-------|----------|
| **Wave 1** | Critical Bugs & Blockers | 8 | ~56h | Week 1 |
| **Wave 2** | Core Functionality Fixes | 10 | ~48h | Week 2 |
| **Wave 3** | UX/Navigation Improvements | 10 | ~40h | Week 3 |
| **Wave 4** | Feature Enhancements | 12 | ~40h | Week 4 |
| **Wave 5** | Polish & Low Priority | 6 | ~16h | Week 4-5 |

---

## Wave 1: Critical Bugs & Blockers (Week 1)

**Goal:** Fix all critical bugs that block core functionality  
**Estimated Hours:** 56 hours  
**Parallel Streams:** 3

### Stream 1A: Client & Navigation (16-20h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| BUG-070 | Fix Client List Click Handlers | 4-8h | None |
| BUG-071 | Fix Create Client Form Submission | 4-8h | None |
| UX-001 | Reorganize Navigation (Dashboard separate) | 8h | None |

### Stream 1B: Inventory & Data (16-24h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| BUG-072 | Fix Inventory Data Not Loading | 8h | None |
| BUG-074 | Fix Spreadsheet View Empty Grid | 8h | BUG-072 |
| BUG-073 | Fix Live Shopping Not Accessible | 8h | UX-001 |

### Stream 1C: Search & Auth (20-24h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| BUG-076 | Fix Search and Filter Functionality | 16h | None |
| BUG-075 | Fix Settings Users Tab Auth Error | 4-8h | None |

### Wave 1 Deliverables
- [ ] All client list interactions working
- [ ] Client creation functional
- [ ] Inventory data displays correctly
- [ ] Live Shopping accessible from navigation
- [ ] Search returns relevant results
- [ ] Settings accessible without auth errors

### Wave 1 Success Criteria
- Zero critical bugs blocking core workflows
- Users can create and view clients
- Inventory displays in all views
- Navigation is logical and complete

---

## Wave 2: Core Functionality Fixes (Week 2)

**Goal:** Restore full functionality to core features  
**Estimated Hours:** 48 hours  
**Parallel Streams:** 3

### Stream 2A: Client & Tag System (20-24h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| FEAT-001 | Client Form Field Updates | 4-8h | BUG-071 |
| FEAT-002 | Tag System Revamp | 16h | FEAT-001 |

### Stream 2B: Order/Sales Flow (16-20h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| FEAT-006 | Show Product Name Instead of SKU | 2-4h | BUG-072 |
| FEAT-003 | Quick Add Quantity Field | 4-8h | None |
| FEAT-004 | Dollar Amount Discount Option | 4-8h | None |
| FEAT-005 | Merge Draft and Quote Workflows | 8h | None |

### Stream 2C: Notifications & Settings (12-16h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| BUG-077 | Fix Notification System | 8h | None |
| FEAT-018 | Remove Dev Features from User UI | 4-8h | None |

### Wave 2 Deliverables
- [ ] Client form has correct fields (Client code, Signal username)
- [ ] Tag system works for clients and products
- [ ] Order creator shows product names
- [ ] Quick add includes quantity
- [ ] Discounts support both % and $
- [ ] Notifications working
- [ ] Dev features hidden from regular users

### Wave 2 Success Criteria
- Complete client management workflow
- Order creation is intuitive and efficient
- Tag-based organization available
- Notification system operational

---

## Wave 3: UX/Navigation Improvements (Week 3)

**Goal:** Improve user experience and interface consistency  
**Estimated Hours:** 40 hours  
**Parallel Streams:** 3

### Stream 3A: Forms & Validation (16-20h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| UX-002 | Improve Form Validation Messages | 8h | None |
| UX-008 | Quick Add for Related Entities | 8h | None |
| UX-014 | Make Optional Fields Clear | 2-4h | UX-002 |

### Stream 3B: Visual Consistency (12-16h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| UX-003 | Actionable vs Informational Cards | 8h | None |
| UX-004 | Confirmation Dialogs | 4-8h | None |

### Stream 3C: Search & Filter UX (12-16h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| UX-006 | Search/Filter UI Integration | 8h | BUG-076 |
| UX-007 | User/Permission Management UI | 8h | BUG-075 |

### Wave 3 Deliverables
- [ ] Clear, specific validation error messages
- [ ] Quick add vendors/clients from forms
- [ ] Visual distinction for clickable elements
- [ ] Confirmation before destructive actions
- [ ] Integrated search/filter experience
- [ ] Clear permission management interface

### Wave 3 Success Criteria
- Forms provide helpful feedback
- Users can quickly add related data
- Interface is visually consistent
- Dangerous actions require confirmation

---

## Wave 4: Feature Enhancements (Week 4)

**Goal:** Add requested features and improvements  
**Estimated Hours:** 40 hours  
**Parallel Streams:** 3

### Stream 4A: Finance & Invoicing (24-32h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| FEAT-007 | Payment Recording Against Invoices | 16h | None |
| FEAT-008 | Invoice Editing from Order View | 8h | FEAT-007 |
| FEAT-015 | Finance Status Customization | 8h | None |

### Stream 4B: Inventory & Products (16-20h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| FEAT-009 | Product Subcategories | 8h | None |
| FEAT-011 | COGS Logic and Sales Flow | 16h | FEAT-007 |
| FEAT-013 | Packaged Unit Type | 4-8h | FEAT-009 |

### Stream 4C: Settings & Notifications (12-16h)
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| FEAT-023 | System vs User Notification Prefs | 8h | BUG-077 |
| FEAT-024 | Inline Notifications | 4-8h | FEAT-023 |
| FEAT-021 | Settings Apply to Team Clarity | 4-8h | None |

### Wave 4 Deliverables
- [ ] Payments can be recorded against invoices
- [ ] Invoices editable from order view
- [ ] Custom finance statuses
- [ ] Product subcategories (smalls, trim, etc.)
- [ ] COGS flows through sales correctly
- [ ] Packaged unit types for products
- [ ] System vs user notification preferences
- [ ] Inline notification panel

### Wave 4 Success Criteria
- Complete finance workflow
- Flexible product categorization
- COGS tracking accurate
- Notification preferences granular

---

## Wave 5: Polish & Low Priority (Week 4-5)

**Goal:** Complete remaining polish items  
**Estimated Hours:** 16 hours  
**Can be done incrementally**

### Polish Tasks
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| UX-005 | Fix Horizontal Scrolling | 4-8h | None |
| UX-009 | Fix Sidebar Animation | 2-4h | UX-001 |
| UX-010 | Account vs Settings Navigation | 2-4h | UX-001 |
| UX-011 | Fix Two Export Buttons | 1-2h | None |
| UX-012 | Fix Period Display Formatting | 1-2h | None |
| UX-013 | Fix Mirrored Elements | 2-4h | None |

### Lower Priority Features
| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| FEAT-010 | Default Warehouse Selection | 2-4h | None |
| FEAT-012 | Grade Field Optional | 4-8h | None |
| FEAT-014 | Remove Expected Delivery | 2-4h | None |
| FEAT-016 | Rename Credits Section | 1-2h | None |
| FEAT-017 | Feature Flags Direct Access | 2-4h | None |
| FEAT-019 | VIP Status and Tiers | 16h | FEAT-002 |
| FEAT-020 | Product Subcategory Matching | 8h | FEAT-009 |
| FEAT-022 | Show Role Names in Permissions | 2-4h | UX-007 |

### Wave 5 Deliverables
- [ ] No horizontal scrolling issues
- [ ] Smooth sidebar animation
- [ ] Clear account/settings navigation
- [ ] Single export button
- [ ] Consistent period formatting
- [ ] All remaining polish items complete

---

## Dependency Graph

```
Wave 1 (Critical)
├── BUG-070 (Client Click) ──────────────────────────────┐
├── BUG-071 (Client Create) ─────────────────────────────┼──► FEAT-001 (Client Fields)
├── BUG-072 (Inventory Load) ────────────────────────────┼──► BUG-074 (Spreadsheet)
│                                                        │    └──► FEAT-006 (Product Names)
├── BUG-073 (Live Shopping) ◄────────────────────────────┤
├── BUG-074 (Spreadsheet) ◄──────────────────────────────┤
├── BUG-075 (Settings Auth) ─────────────────────────────┼──► UX-007 (Permission UI)
├── BUG-076 (Search) ────────────────────────────────────┼──► UX-006 (Search/Filter UI)
├── BUG-077 (Notifications) ─────────────────────────────┼──► FEAT-023 (Notification Prefs)
│                                                        │    └──► FEAT-024 (Inline Notif)
└── UX-001 (Navigation) ─────────────────────────────────┼──► UX-009 (Sidebar)
                                                         │    └──► UX-010 (Account Nav)
                                                         │
Wave 2 (Core)                                            │
├── FEAT-001 (Client Fields) ◄───────────────────────────┘
│   └──► FEAT-002 (Tags) ────────────────────────────────┬──► FEAT-019 (VIP Tiers)
├── FEAT-003 (Quick Add Qty)                             │
├── FEAT-004 (Dollar Discount)                           │
├── FEAT-005 (Draft/Quote)                               │
├── FEAT-006 (Product Names) ◄───────────────────────────┤
└── FEAT-018 (Hide Dev Features)                         │
                                                         │
Wave 3 (UX)                                              │
├── UX-002 (Validation) ─────────────────────────────────┼──► UX-014 (Optional Fields)
├── UX-003 (Card Distinction)                            │
├── UX-004 (Confirmations)                               │
├── UX-006 (Search/Filter UI) ◄──────────────────────────┤
├── UX-007 (Permission UI) ◄─────────────────────────────┼──► FEAT-022 (Role Names)
└── UX-008 (Quick Add Entities)                          │
                                                         │
Wave 4 (Features)                                        │
├── FEAT-007 (Payments) ─────────────────────────────────┼──► FEAT-008 (Invoice Edit)
│                                                        │    └──► FEAT-011 (COGS)
├── FEAT-009 (Subcategories) ────────────────────────────┼──► FEAT-013 (Packaged Units)
│                                                        │    └──► FEAT-020 (Matching)
├── FEAT-015 (Finance Status)                            │
├── FEAT-021 (Team Settings)                             │
├── FEAT-023 (Notification Prefs) ◄──────────────────────┤
└── FEAT-024 (Inline Notifications) ◄────────────────────┘
                                                         
Wave 5 (Polish)
├── UX-005 (Horizontal Scroll)
├── UX-009 (Sidebar) ◄───────────────────────────────────
├── UX-010 (Account Nav) ◄───────────────────────────────
├── UX-011 (Export Buttons)
├── UX-012 (Period Format)
├── UX-013 (Mirrored Elements)
├── FEAT-010 (Default Warehouse)
├── FEAT-012 (Grade Optional)
├── FEAT-014 (Remove Expected Delivery)
├── FEAT-016 (Rename Credits)
├── FEAT-017 (Feature Flags Direct)
├── FEAT-019 (VIP Tiers) ◄───────────────────────────────
├── FEAT-020 (Subcategory Matching) ◄────────────────────
└── FEAT-022 (Role Names) ◄──────────────────────────────
```

---

## Resource Allocation

### Recommended Team Structure

| Role | Wave 1 | Wave 2 | Wave 3 | Wave 4 | Wave 5 |
|------|--------|--------|--------|--------|--------|
| **Backend Dev** | BUG-072, BUG-076, BUG-075 | FEAT-002, FEAT-005 | - | FEAT-007, FEAT-011 | - |
| **Frontend Dev** | BUG-070, BUG-071, UX-001 | FEAT-001, FEAT-003, FEAT-004 | UX-002, UX-003, UX-004 | FEAT-008, FEAT-015 | All UX tasks |
| **Full Stack** | BUG-073, BUG-074, BUG-077 | FEAT-006, FEAT-018 | UX-006, UX-007, UX-008 | FEAT-009, FEAT-023, FEAT-024 | All FEAT tasks |

### Daily Standup Focus

**Wave 1:** "Are there any blockers preventing critical bug fixes?"  
**Wave 2:** "Is core functionality being restored on schedule?"  
**Wave 3:** "Are UX improvements consistent across the app?"  
**Wave 4:** "Are new features integrating well with existing code?"  
**Wave 5:** "What polish items can we complete before release?"

---

## Risk Mitigation

### High Risk Items
1. **BUG-076 (Search)** - 16h estimate, complex across multiple modules
   - Mitigation: Start early, allocate senior dev, have fallback plan
   
2. **FEAT-002 (Tags)** - 16h, affects multiple areas
   - Mitigation: Design review before implementation, incremental rollout
   
3. **FEAT-011 (COGS)** - 16h, complex business logic
   - Mitigation: Clear requirements sign-off, extensive testing

### Contingency Plans
- If Wave 1 extends: Prioritize BUG-070, BUG-071, BUG-072 (client + inventory)
- If Wave 2 extends: Defer FEAT-002 (tags) to Wave 4
- If Wave 4 extends: Move FEAT-019, FEAT-020 to future sprint

---

## Success Metrics

### Wave 1 Complete When:
- [ ] Zero P0 bugs in production
- [ ] All core navigation working
- [ ] Client CRUD operations functional
- [ ] Inventory displays correctly

### Wave 2 Complete When:
- [ ] Client form matches requirements
- [ ] Order creation workflow smooth
- [ ] Notifications operational
- [ ] No dev features visible to users

### Wave 3 Complete When:
- [ ] Form validation helpful
- [ ] UI visually consistent
- [ ] Search/filter intuitive
- [ ] User management clear

### Wave 4 Complete When:
- [ ] Finance workflow complete
- [ ] Product categorization flexible
- [ ] COGS tracking accurate
- [ ] Notifications granular

### Wave 5 Complete When:
- [ ] No visual polish issues
- [ ] All low-priority items addressed
- [ ] Ready for user acceptance testing

---

## Appendix: Full Task List by Priority

### HIGH Priority (Must Complete)
| ID | Task | Wave | Est. |
|----|------|------|------|
| BUG-070 | Client List Click Handlers | 1 | 4-8h |
| BUG-071 | Create Client Form | 1 | 4-8h |
| BUG-072 | Inventory Data Loading | 1 | 8h |
| BUG-073 | Live Shopping Access | 1 | 8h |
| BUG-074 | Spreadsheet View | 1 | 8h |
| BUG-075 | Settings Auth | 1 | 4-8h |
| BUG-076 | Search and Filter | 1 | 16h |
| BUG-077 | Notification System | 1 | 8h |
| UX-001 | Navigation Reorganization | 1 | 8h |
| FEAT-002 | Tag System Revamp | 2 | 16h |
| FEAT-007 | Payment Recording | 4 | 16h |
| FEAT-011 | COGS Logic | 4 | 16h |

### MEDIUM Priority (Should Complete)
| ID | Task | Wave | Est. |
|----|------|------|------|
| FEAT-001 | Client Form Fields | 2 | 4-8h |
| FEAT-003 | Quick Add Quantity | 2 | 4-8h |
| FEAT-004 | Dollar Discount | 2 | 4-8h |
| FEAT-005 | Draft/Quote Merge | 2 | 8h |
| FEAT-006 | Product Names | 2 | 2-4h |
| FEAT-008 | Invoice Editing | 4 | 8h |
| FEAT-009 | Subcategories | 4 | 8h |
| FEAT-013 | Packaged Units | 4 | 4-8h |
| FEAT-015 | Finance Status | 4 | 8h |
| FEAT-018 | Hide Dev Features | 2 | 4-8h |
| FEAT-019 | VIP Tiers | 5 | 16h |
| FEAT-020 | Subcategory Matching | 5 | 8h |
| FEAT-021 | Team Settings | 4 | 4-8h |
| FEAT-023 | Notification Prefs | 4 | 8h |
| FEAT-024 | Inline Notifications | 4 | 4-8h |
| UX-002 | Validation Messages | 3 | 8h |
| UX-003 | Card Distinction | 3 | 8h |
| UX-004 | Confirmations | 3 | 4-8h |
| UX-005 | Horizontal Scrolling | 5 | 4-8h |
| UX-006 | Search/Filter UI | 3 | 8h |
| UX-007 | Permission UI | 3 | 8h |
| UX-008 | Quick Add Entities | 3 | 8h |

### LOW Priority (Nice to Have)
| ID | Task | Wave | Est. |
|----|------|------|------|
| FEAT-010 | Default Warehouse | 5 | 2-4h |
| FEAT-012 | Grade Optional | 5 | 4-8h |
| FEAT-014 | Remove Expected Delivery | 5 | 2-4h |
| FEAT-016 | Rename Credits | 5 | 1-2h |
| FEAT-017 | Feature Flags Direct | 5 | 2-4h |
| FEAT-022 | Role Names | 5 | 2-4h |
| UX-009 | Sidebar Animation | 5 | 2-4h |
| UX-010 | Account Navigation | 5 | 2-4h |
| UX-011 | Export Buttons | 5 | 1-2h |
| UX-012 | Period Formatting | 5 | 1-2h |
| UX-013 | Mirrored Elements | 5 | 2-4h |
| UX-014 | Optional Fields | 3 | 2-4h |

---

*Document generated from video testing session analysis on January 7, 2026*
