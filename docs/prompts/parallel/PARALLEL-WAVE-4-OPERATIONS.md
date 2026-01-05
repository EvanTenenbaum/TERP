# PARALLEL Wave 4: Operations Lifecycle - Agent Prompt

**⚡ PARALLEL EXECUTION MODE**
You are running in parallel with Wave 1 (Sales) and Wave 3 (Inventory).
DO NOT touch files outside your assigned scope.

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses managing inventory, sales, VIP portal, accounting, and operations.

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express, tRPC |
| **Database** | MySQL (TiDB), Drizzle ORM |

---

## 🚨 CRITICAL CONSTRAINTS

### NEVER DO:
```
❌ Modify drizzle/schema.ts
❌ Run migrations
❌ Use `: any` types
❌ Add @ts-nocheck or @ts-ignore
❌ Touch files outside YOUR SCOPE (see below)
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Commit frequently with clear messages
✅ Verify deployment succeeds
```

---

## 🔒 YOUR EXCLUSIVE FILE SCOPE

**You own these files - ONLY touch these:**

### Client Pages
```
client/src/pages/NotificationsPage.tsx              ← PRIMARY TARGET (@ts-nocheck)
client/src/pages/settings/NotificationPreferences.tsx  ← PRIMARY TARGET (@ts-nocheck)
client/src/pages/CalendarPage.tsx
client/src/pages/TodoListsPage.tsx
client/src/pages/TodoListDetailPage.tsx
```

### Server Routers
```
server/routers/notifications.ts
server/routers/calendar.ts
server/routers/todoTasks.ts
```

### Shared (READ ONLY - coordinate before editing)
```
server/routers/users.ts  ← Shared - READ ONLY
```

**⛔ DO NOT TOUCH (Other agents own these):**
```
# Wave 1 owns:
client/src/pages/UnifiedSalesPortalPage.tsx
server/routers/orders.ts
server/routers/quotes.ts
server/routers/unifiedSalesPortal.ts

# Wave 3 owns:
client/src/pages/PhotographyPage.tsx
server/routers/photography.ts
server/routers/inventory.ts
```

---

## 📋 Schema Reference

### Calendar Events Table
```typescript
calendarEvents.id, calendarEvents.title
calendarEvents.description, calendarEvents.eventType
calendarEvents.startTime, calendarEvents.endTime
calendarEvents.allDay, calendarEvents.location
calendarEvents.createdBy, calendarEvents.calendarId
```

### Notifications Table
```typescript
notifications.id, notifications.userId
notifications.type, notifications.title
notifications.message, notifications.isRead
notifications.createdAt, notifications.metadata
```

### Notification Preferences Table
```typescript
notificationPreferences.id, notificationPreferences.userId
notificationPreferences.emailEnabled
notificationPreferences.pushEnabled
notificationPreferences.smsEnabled
```

### Todo Tasks Table
```typescript
todoTasks.id, todoTasks.title
todoTasks.description, todoTasks.status
todoTasks.priority, todoTasks.dueDate
todoTasks.assignedTo, todoTasks.createdBy
```

---

# PART 2: YOUR TASK - OPERATIONS LIFECYCLE

## 🎯 Mission

Ensure calendar, notifications, and task management work end-to-end.

**Goal:** Calendar → Notifications, Tasks → Notifications, Preferences respected
**Estimated Time:** 8-12 hours

---

## 📋 Task Checklist

### Task 1: Fix NotificationsPage (2-3 hours)
**Path:** `client/src/pages/NotificationsPage.tsx`

```bash
# Check if it has @ts-nocheck
head -3 client/src/pages/NotificationsPage.tsx

# If yes, remove and fix
sed -i '1d' client/src/pages/NotificationsPage.tsx
pnpm check 2>&1 | grep "NotificationsPage"
```

**Likely Issues:**
- Notification type mismatches
- Date formatting (Date vs string)
- Read/unread status handling

### Task 2: Fix NotificationPreferences (2-3 hours)
**Path:** `client/src/pages/settings/NotificationPreferences.tsx`

```bash
head -3 client/src/pages/settings/NotificationPreferences.tsx
# If @ts-nocheck, remove and fix
sed -i '1d' client/src/pages/settings/NotificationPreferences.tsx
pnpm check 2>&1 | grep "NotificationPreferences"
```

**Likely Issues:**
- Preference toggle types (boolean | undefined)
- Form submission types
- User settings types

### Task 3: Verify Calendar → Notification Flow (2-3 hours)

Test:
1. Create a calendar event with reminder
2. Verify notification is created
3. Verify notification appears in NotificationsPage

### Task 4: Verify Task → Notification Flow (2-3 hours)

Test:
1. Create a task
2. Assign task to a user
3. Verify notification is created for assignee

---

## 🔧 Common Fixes

### Fix 1: Notification Type Handling
```typescript
// Before (error - type might be undefined)
const icon = getIconForType(notification.type);

// After (fixed)
const icon = getIconForType(notification.type ?? 'INFO');
```

### Fix 2: Date Formatting
```typescript
// Before (error - createdAt might be string or Date)
const date = notification.createdAt.toLocaleDateString();

// After (fixed)
const date = new Date(notification.createdAt).toLocaleDateString();
```

### Fix 3: Preference Toggles
```typescript
// Before (error - boolean | undefined)
const isEnabled = preferences.emailEnabled;

// After (fixed)
const isEnabled = preferences?.emailEnabled ?? false;
```

### Fix 4: isRead Status
```typescript
// Before (error)
if (notification.isRead) { ... }

// After (fixed - handle null/undefined)
if (notification.isRead === true) { ... }
// or
const isRead = notification.isRead ?? false;
```

---

## ✅ Exit Criteria

Wave 4 is complete when:

- [ ] `NotificationsPage.tsx` has no @ts-nocheck
- [ ] `NotificationPreferences.tsx` has no @ts-nocheck
- [ ] Calendar events trigger notifications
- [ ] Task assignments trigger notifications
- [ ] Notification preferences are saved and respected
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Deployment verified

---

## 🔄 Git Workflow

```bash
# After each fix
pnpm check && pnpm test
git add -A
git commit -m "fix(operations): [description]"
git push origin main

# Verify deployment
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

---

## 🆘 Escalation

If blocked:
1. Document in `WAVE_4_BLOCKERS.md`
2. Move to next task
3. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass (Wave 0 complete)

# Start with NotificationsPage
head -3 client/src/pages/NotificationsPage.tsx
```

**Remember: Stay in your lane - only touch YOUR files!**
