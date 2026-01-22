# 🟤 Sprint E: Calendar, Vendors & CRM

---

## Agent Identity & Context

You are an AI agent working on TERP, a cannabis ERP system. Your prime directive: **Leave the code better than you found it.**

You are assigned to execute **Sprint E** of the TERP ERP parallel sprint plan. This sprint focuses on Calendar functionality, Vendor Management, and CRM features. You will work in parallel with three other agents (Sprint B, Sprint C, and Sprint D) who are working on different file domains.

---

## Before ANY Work

1. Read `.kiro/steering/00-core-identity.md` and `.kiro/steering/08-adaptive-qa-protocol.md`
2. Pull latest: `git pull origin main`
3. Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
4. Check roadmap: `cat docs/roadmaps/MASTER_ROADMAP.md`
5. Register your session (mandatory)
6. **Verify Sprint A is complete** - Schema must be stable

---

## Critical Rules (NEVER BREAK)

- ❌ **NO `any` types** - Use proper TypeScript types always
- ❌ **NO skipping tests** - TDD is mandatory (write tests BEFORE code)
- ❌ **NO editing files another agent is working on** - Check ACTIVE_SESSIONS.md
- ❌ **NO editing files outside your Sprint E domain** - See File Ownership below
- ❌ **NO marking tasks complete without deployment verification**
- ❌ **NO committing without validation** - Run `pnpm check && pnpm lint && pnpm test`
- ❌ **NO unverified claims** - Follow SAFE/STRICT/RED verification modes

---

## Session Registration (MANDATORY)

Before starting work:

```bash
SESSION_ID="Session-$(date +%Y%m%d)-SPRINT-E-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

---

## Development Standards

### TypeScript

- Explicit return types on all functions
- Use type guards, not assertions
- Handle null/undefined explicitly

### React

- Use `React.memo` for reusable components
- Use `useCallback` for event handlers
- Use `useMemo` for expensive computations

### Testing

- Write tests BEFORE implementation (TDD)
- 80%+ coverage for business logic
- Test behavior, not implementation

### Database

- snake_case for tables/columns
- Index ALL foreign keys
- Use soft deletes (`is_deleted`)

---

## Git Workflow

```bash
git pull origin main                           # Always pull first
git checkout -b sprint-e/calendar-vendors-crm  # Your sprint branch
git commit -m "feat(scope): description"       # Conventional commits
git push origin sprint-e/calendar-vendors-crm  # Push after each phase
```

---

## Deployment

**Platform**: DigitalOcean App Platform
**URL**: https://terp-app-b9s35.ondigitalocean.app

```bash
git push origin main                           # Triggers deployment (after merge)
bash scripts/watch-deploy.sh                   # Monitor
curl https://terp-app-b9s35.ondigitalocean.app/health  # Verify
```

---

## Pre-Commit Checklist

- [ ] `pnpm check` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `pnpm roadmap:validate` - If roadmap changed
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions
- [ ] No files modified outside Sprint E domain

---

## Essential Commands

```bash
pnpm roadmap:validate          # Validate roadmap
pnpm roadmap:capacity          # Check capacity
pnpm test                      # Run tests
pnpm check                     # Check types
pnpm lint                      # Check linting
pnpm generate                  # Regenerate types after schema changes
bash scripts/watch-deploy.sh   # Monitor deployment
```

---

## Essential Files

- `docs/roadmaps/MASTER_ROADMAP.md` - Task tracking
- `docs/roadmaps/PARALLEL_SPRINT_PLAN.md` - Sprint coordination
- `docs/ACTIVE_SESSIONS.md` - Who's working on what
- `.kiro/steering/` - Complete protocols

---

## When Stuck

1. Read `.kiro/steering/00-core-identity.md`
2. Check existing code for patterns
3. Search: `rg "pattern" src/`
4. Check related router files for examples
5. Ask user for clarification

---

**Follow these rules precisely. Your work affects other agents and production.**

**#Terp-Dev #Sprint-E**

---

---

## 🚨 SPRINT E SPECIFIC INSTRUCTIONS

### Prerequisites

1. **Sprint A must be complete** - Verify schema is stable before starting
2. **Pull latest code** - `git pull origin main` to get Sprint A changes
3. **Regenerate types** - `pnpm generate` to update TypeScript types
4. **Create your branch** - `git checkout -b sprint-e/calendar-vendors-crm`

### File Ownership Rules (STRICTLY ENFORCED)

You have **EXCLUSIVE WRITE ACCESS** to these files only:

```
# Backend Routers - Calendar
server/routers/calendar.ts
server/routers/calendarInvitations.ts
server/routers/calendarMeetings.ts
server/routers/calendarParticipants.ts
server/routers/calendarRecurrence.ts
server/routers/calendarReminders.ts
server/routers/calendarViews.ts

# Backend Routers - Vendors
server/routers/vendors.ts
server/routers/vendorSupply.ts
server/routers/vendorReminders.ts

# Backend Routers - CRM/Communications
server/routers/inbox.ts
server/routers/comments.ts
server/routers/freeformNotes.ts
server/routers/clientNeedsEnhanced.ts

# Frontend Pages
client/src/pages/CalendarPage.tsx
client/src/pages/VendorSupplyPage.tsx
client/src/pages/InboxPage.tsx
client/src/pages/NeedsManagementPage.tsx

# Frontend Components
client/src/components/calendar/
client/src/components/vendors/
client/src/components/inbox/
```

**DO NOT MODIFY** any files outside this list. Other agents are working on:

- Sprint B owns: `client/src/components/ui/`, `client/src/pages/Orders.tsx`, `client/src/pages/DashboardPage.tsx`
- Sprint C owns: `server/routers/accounting.ts`, `server/routers/vipPortal*.ts`, `client/src/pages/accounting/`, `client/src/pages/ClientProfilePage.tsx`
- Sprint D owns: `server/routers/salesSheets.ts`, `server/routers/inventory.ts`, `client/src/pages/SalesSheetCreatorPage.tsx`, `tests/`

**⚠️ SPECIAL NOTE:** `server/routers/calendarFinancials.ts` is shared with Sprint C (Accounting). If you need to modify it, coordinate with Sprint C agent first. Prefer READ-ONLY access.

---

## 📋 Sprint Tasks

### Phase 1: Vendor Supply Management (22h)

#### QA-054: Implement Vendor Supply Management Backend (18h)

**Source:** MASTER_ROADMAP.md

**Problem:** Vendor supply management has incomplete backend implementation

**Deliverables:**

- [ ] Implement vendor supply CRUD operations
- [ ] Add vendor supply tracking (quantities, prices, availability)
- [ ] Create vendor supply history/audit log
- [ ] Implement vendor supply alerts (low stock, price changes)
- [ ] Add vendor supply import from CSV
- [ ] Connect frontend VendorSupplyPage to backend

**🔴 REDHAT QA GATE 1.1:**

```
Before marking QA-054 complete:
□ Create new vendor supply entry
□ Read/list vendor supplies with filters
□ Update vendor supply details
□ Delete vendor supply (soft delete)
□ View supply history
□ Test low stock alert triggers
□ Import supplies from CSV
□ Verify all data persists correctly
```

#### VENDOR-001: Vendor Reminders System (4h)

**Source:** Sprint E Plan

**Problem:** No automated reminder system for vendor follow-ups

**Deliverables:**

- [ ] Implement vendor reminder creation
- [ ] Add reminder scheduling (one-time, recurring)
- [ ] Create reminder notification system
- [ ] Add reminder completion tracking

**🔴 REDHAT QA GATE 1.2 (PHASE 1 COMPLETE):**

```
Before proceeding to Phase 2:
□ Vendor supply CRUD fully functional
□ Vendor reminders work
□ Alerts trigger correctly
□ CSV import works
□ Run: pnpm check && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Commit with message: "feat(sprint-e): Phase 1 - Vendor Supply Management [REDHAT QA PASSED]"
□ Push to sprint-e/calendar-vendors-crm branch
```

---

### Phase 2: CRM Communication Features (20h)

#### QA-057: Implement CRM Sub-Features (12h)

**Source:** MASTER_ROADMAP.md

**Problem:** CRM is missing key sub-features for client relationship management

**Deliverables:**

- [ ] Implement client needs tracking system
- [ ] Add client preference management
- [ ] Create client interaction logging
- [ ] Implement client segmentation/tagging
- [ ] Add client notes with timestamps
- [ ] Create client activity timeline view

**🔴 REDHAT QA GATE 2.1:**

```
Before marking QA-057 complete:
□ Add client need - verify saved
□ Track client preferences
□ Log client interaction
□ Add/remove client tags
□ Add client note with timestamp
□ View activity timeline
□ Filter clients by segment/tag
```

#### QA-067: Implement CRM Communication Features (8h)

**Source:** MASTER_ROADMAP.md

**Problem:** CRM is missing communication log, meeting scheduling, and activity timeline

**Deliverables:**

- [ ] Create communication_logs table schema (if not exists)
- [ ] Implement communication log component
- [ ] Add meeting scheduling integration with calendar
- [ ] Create unified activity timeline
- [ ] Add communication templates

**🔴 REDHAT QA GATE 2.2 (PHASE 2 COMPLETE):**

```
Before proceeding to Phase 3:
□ Communication log records calls/emails
□ Meeting scheduling creates calendar event
□ Activity timeline shows all interactions
□ Communication templates work
□ Run: pnpm check && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Commit with message: "feat(sprint-e): Phase 2 - CRM Communication Features [REDHAT QA PASSED]"
□ Push to sprint-e/calendar-vendors-crm branch
```

---

### Phase 3: Calendar Enhancements (16h)

#### CALENDAR-001: Fix Calendar Event Management (8h)

**Source:** Sprint E Plan

**Problem:** Calendar has incomplete event management features

**Deliverables:**

- [ ] Fix event creation flow
- [ ] Implement event editing
- [ ] Add event deletion with confirmation
- [ ] Fix recurring event handling
- [ ] Implement event reminders
- [ ] Add event color coding by type

**🔴 REDHAT QA GATE 3.1:**

```
Before marking CALENDAR-001 complete:
□ Create single event - verify on calendar
□ Create recurring event - verify all instances
□ Edit event - verify changes saved
□ Delete single event
□ Delete recurring event (single vs all)
□ Reminder triggers before event
□ Events show correct colors by type
```

#### CALENDAR-002: Calendar Views & Invitations (8h)

**Source:** Sprint E Plan

**Problem:** Calendar missing multiple views and invitation management

**Deliverables:**

- [ ] Implement day/week/month view switching
- [ ] Add agenda/list view
- [ ] Implement event invitations
- [ ] Add invitation accept/decline
- [ ] Show participant status on events
- [ ] Add calendar sharing/permissions

**🔴 REDHAT QA GATE 3.2 (PHASE 3 COMPLETE):**

```
Before marking sprint complete:
□ Day view works correctly
□ Week view works correctly
□ Month view works correctly
□ Agenda view lists upcoming events
□ Send invitation to participant
□ Accept/decline invitation
□ Participant status shows on event
□ Run: pnpm check && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Full manual regression test
□ Commit with message: "feat(sprint-e): Phase 3 - Calendar Enhancements [REDHAT QA PASSED]"
□ Push to sprint-e/calendar-vendors-crm branch
```

---

## 🔴 FINAL REDHAT QA GATE (SPRINT COMPLETE)

Before submitting your branch for merge:

### Code Quality

- [ ] `pnpm check` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm build` - Zero TypeScript errors
- [ ] No `console.log` statements left in code
- [ ] No commented-out code blocks
- [ ] All new endpoints have proper TypeScript types
- [ ] All new endpoints have error handling
- [ ] No `any` types introduced

### Functional Verification

- [ ] Vendor supply CRUD works end-to-end
- [ ] Vendor reminders trigger correctly
- [ ] CRM needs tracking works
- [ ] Communication logging works
- [ ] Calendar events CRUD works
- [ ] Calendar views switch correctly
- [ ] Invitations work
- [ ] No regressions in existing functionality

### Integration Verification

- [ ] Calendar events link to CRM activities
- [ ] Vendor reminders appear in calendar
- [ ] Communication logs show in activity timeline
- [ ] No conflicts with other sprint domains

### Documentation

- [ ] Update task status in MASTER_ROADMAP.md
- [ ] Document any deviations from spec
- [ ] Note any technical debt created
- [ ] Update session file

### Git Hygiene

- [ ] All commits have descriptive messages (conventional commits)
- [ ] No merge conflicts with main
- [ ] Branch is rebased on latest main

### Final Commit

```bash
git add .
git commit -m "feat(sprint-e): Complete - Calendar, Vendors & CRM [REDHAT QA PASSED]

Phase 1: Vendor Supply Management (QA-054, VENDOR-001)
Phase 2: CRM Communication Features (QA-057, QA-067)
Phase 3: Calendar Enhancements (CALENDAR-001, CALENDAR-002)

All Redhat QA gates passed.
Ready for integration."

git push origin sprint-e/calendar-vendors-crm
```

---

## Completing Work

1. Archive session: `mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/`
2. Remove from `docs/ACTIVE_SESSIONS.md`
3. Update `docs/roadmaps/MASTER_ROADMAP.md` - Mark Sprint E tasks as `complete`
4. Run `pnpm roadmap:validate`
5. Commit and push
6. Create Pull Request to main
7. Verify deployment succeeded after merge

---

## 🚫 ROLLBACK PROCEDURES

If you introduce a regression or break existing functionality:

### Level 1: Revert Last Commit

```bash
git revert HEAD
```

### Level 2: Revert to Phase Checkpoint

```bash
git log --oneline  # Find checkpoint commit
git revert <commit_hash>..HEAD
```

### Level 3: Abandon Branch

```bash
git checkout main
git branch -D sprint-e/calendar-vendors-crm
git checkout -b sprint-e/calendar-vendors-crm  # Start fresh
```

---

## 📞 ESCALATION

If you encounter:

- **File conflicts with other sprints** → STOP and report immediately
- **Schema/type errors after Sprint A** → Run `pnpm generate` and retry
- **Blocking bugs in Sprint A code** → Document and escalate
- **Need to modify `calendarFinancials.ts`** → Coordinate with Sprint C agent
- **Need to modify files outside your domain** → Request coordination
- **Unclear requirements** → Check spec files first, then escalate

---

## ⏱️ TIME ESTIMATES

| Phase     | Tasks                      | Estimate | Checkpoint    |
| --------- | -------------------------- | -------- | ------------- |
| Phase 1   | QA-054, VENDOR-001         | 22h      | QA Gate 1.2   |
| Phase 2   | QA-057, QA-067             | 20h      | QA Gate 2.2   |
| Phase 3   | CALENDAR-001, CALENDAR-002 | 16h      | QA Gate 3.2   |
| **Total** |                            | **58h**  | Final QA Gate |

---

## 🎯 SUCCESS CRITERIA

Sprint E is successful when:

1. All 6 tasks completed and verified
2. All Redhat QA gates passed
3. Zero regressions in existing functionality
4. Calendar fully functional
5. Vendor management complete
6. CRM features working
7. Branch ready for merge (no conflicts)
8. Documentation updated
9. Session properly closed

**DO NOT submit your branch until ALL criteria are met.**

---

## 📊 TESTING CHECKLIST

### Vendor Supply Flow

- [ ] Create vendor
- [ ] Add supply entry
- [ ] Update supply quantity
- [ ] Update supply price
- [ ] View supply history
- [ ] Set low stock alert
- [ ] Trigger alert notification
- [ ] Import from CSV
- [ ] Delete supply entry

### Vendor Reminder Flow

- [ ] Create one-time reminder
- [ ] Create recurring reminder
- [ ] Reminder notification triggers
- [ ] Mark reminder complete
- [ ] Edit reminder
- [ ] Delete reminder

### CRM Flow

- [ ] Add client need
- [ ] Update client preferences
- [ ] Log interaction (call/email/meeting)
- [ ] Add client tag
- [ ] Add client note
- [ ] View activity timeline
- [ ] Filter by segment

### Communication Flow

- [ ] Log phone call
- [ ] Log email
- [ ] Schedule meeting (creates calendar event)
- [ ] Use communication template
- [ ] View communication history

### Calendar Flow

- [ ] Create single event
- [ ] Create recurring event
- [ ] Edit event
- [ ] Delete event
- [ ] Switch to day view
- [ ] Switch to week view
- [ ] Switch to month view
- [ ] Switch to agenda view
- [ ] Send invitation
- [ ] Accept invitation
- [ ] Decline invitation
- [ ] View participant status

---

## 🔗 INTEGRATION POINTS

### Calendar ↔ CRM Integration

When a meeting is scheduled via CRM:

1. Create calendar event
2. Add participants
3. Log in communication history
4. Show in activity timeline

### Calendar ↔ Vendor Integration

When a vendor reminder is created:

1. Create calendar event (optional)
2. Set reminder notification
3. Link to vendor record

### Verify Integration Works

- [ ] CRM meeting creates calendar event
- [ ] Calendar event shows in CRM timeline
- [ ] Vendor reminder appears in calendar
- [ ] All links navigate correctly

---

## ⚠️ KNOWN CONSTRAINTS

1. **calendarFinancials.ts** - Shared with Sprint C, READ-ONLY unless coordinated
2. **clients.ts router** - Partially owned by Sprint C (ClientProfilePage), coordinate if needed
3. **Database schema** - Do NOT modify schema; use existing tables from Sprint A

---

## 🔧 ENVIRONMENT NOTES

### Calendar Integration

The calendar system uses:

- `calendar` table for events
- `calendar_participants` table for invitations
- `calendar_reminders` table for notifications

### Vendor System

The vendor system uses:

- `vendors` table for vendor records
- `vendor_supply` table for supply tracking
- `vendor_reminders` table for follow-ups

### CRM System

The CRM system uses:

- `clients` table (shared, be careful)
- `client_needs` table for needs tracking
- `communication_logs` table for interaction history
- `comments` table for notes
