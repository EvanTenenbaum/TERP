# Wave 4: Complete Operations Lifecycle - Complete Agent Prompt

**Copy this entire prompt to give to a new agent.**
**Prerequisites:** Wave 0 must be complete.

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses. The **Operations Lifecycle** covers:
- Calendar and scheduling
- Task management
- Notifications and reminders
- User preferences

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

---

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
❌ Skip tests before committing
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Verify deployment succeeds
```

---

## 📋 Schema Reference

### Calendar Events Table
```typescript
// ✅ EXIST:
calendarEvents.id, calendarEvents.title
calendarEvents.description, calendarEvents.eventType
calendarEvents.startTime, calendarEvents.endTime
calendarEvents.allDay, calendarEvents.location
calendarEvents.createdBy, calendarEvents.calendarId
```

### Notifications Table
```typescript
// ✅ EXIST:
notifications.id, notifications.userId
notifications.type, notifications.title
notifications.message, notifications.isRead
notifications.createdAt, notifications.metadata
```

### Notification Preferences Table
```typescript
// ✅ EXIST:
notificationPreferences.id, notificationPreferences.userId
notificationPreferences.emailEnabled
notificationPreferences.pushEnabled
notificationPreferences.smsEnabled
```

---

# PART 2: YOUR TASK - WAVE 4 OPERATIONS LIFECYCLE

## 🎯 Mission

Ensure calendar, notifications, and task management work end-to-end.

**Goal:** Calendar events trigger notifications, task assignments work, preferences respected
**Estimated Time:** 8-12 hours
**Dependencies:** Wave 0 complete

---

## 📁 Operations Files

```
client/src/pages/
├── CalendarPage.tsx              # Calendar view (OK)
├── NotificationsPage.tsx         # Notifications (@ts-nocheck - NEEDS FIX)
├── TodoListsPage.tsx             # Task lists (OK)
├── TodoListDetailPage.tsx        # Task details (OK)
├── settings/
│   └── NotificationPreferences.tsx  # Preferences (@ts-nocheck - NEEDS FIX)

server/routers/
├── calendar.ts                   # Calendar API (OK)
├── notifications.ts              # Notifications API (OK)
├── todoTasks.ts                  # Tasks API (OK)
```

---

## 📋 Task Checklist

### Task 1: Fix NotificationsPage (2-3 hours)
**Path:** `client/src/pages/NotificationsPage.tsx`

```bash
# Remove @ts-nocheck and check errors
sed -i '1d' client/src/pages/NotificationsPage.tsx
pnpm check 2>&1 | grep "NotificationsPage"
```

**Likely Issues:**
- Notification type mismatches
- Date formatting
- Read/unread status handling

### Task 2: Fix NotificationPreferences (2-3 hours)
**Path:** `client/src/pages/settings/NotificationPreferences.tsx`

```bash
# Remove @ts-nocheck and check errors
sed -i '1d' client/src/pages/settings/NotificationPreferences.tsx
pnpm check 2>&1 | grep "NotificationPreferences"
```

**Likely Issues:**
- Preference toggle types
- User settings types
- Form submission types

### Task 3: Verify Calendar → Notification Flow (2-3 hours)

Test the complete flow:
1. Create a calendar event with a reminder
2. Wait for reminder time (or mock it)
3. Verify notification is created
4. Verify notification appears in NotificationsPage

**Files to check:**
- `server/routers/calendar.ts`
- `server/routers/notifications.ts`
- Calendar reminder logic

### Task 4: Verify Task → Notification Flow (2-3 hours)

Test the complete flow:
1. Create a task
2. Assign task to a user
3. Verify notification is created for assignee
4. Verify notification appears in their inbox

**Files to check:**
- `server/routers/todoTasks.ts`
- `server/routers/notifications.ts`

---

## 🔧 Common Operations Fixes

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

---

## 🧪 End-to-End Test Script

```typescript
// tests/e2e/operations.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Operations', () => {
  test('calendar event creates notification', async ({ page }) => {
    // Create event with reminder
    await page.goto('/calendar');
    await page.click('[data-testid="new-event"]');
    await page.fill('[data-testid="event-title"]', 'Test Event');
    await page.check('[data-testid="add-reminder"]');
    await page.click('[data-testid="save-event"]');

    // Check notification was created
    await page.goto('/notifications');
    await expect(page.locator('text=Test Event')).toBeVisible();
  });

  test('task assignment creates notification', async ({ page }) => {
    // Create task
    await page.goto('/todo-lists');
    await page.click('[data-testid="new-task"]');
    await page.fill('[data-testid="task-title"]', 'Test Task');
    await page.selectOption('[data-testid="assignee"]', 'user-id');
    await page.click('[data-testid="save-task"]');

    // Login as assignee and check notification
    // ... (would need to switch users)
  });

  test('notification preferences are respected', async ({ page }) => {
    // Disable email notifications
    await page.goto('/settings/notifications');
    await page.uncheck('[data-testid="email-enabled"]');
    await page.click('[data-testid="save-preferences"]');

    // Verify setting persisted
    await page.reload();
    await expect(page.locator('[data-testid="email-enabled"]')).not.toBeChecked();
  });
});
```

---

## ✅ Exit Criteria

Wave 4 is complete when:

- [ ] `NotificationsPage.tsx` has no @ts-nocheck
- [ ] `NotificationPreferences.tsx` has no @ts-nocheck
- [ ] Calendar events trigger notifications
- [ ] Task assignments trigger notifications
- [ ] Notification preferences are respected
- [ ] Reminders are delivered on time
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Deployment verified successful

---

## 🔄 Git Workflow

```bash
# After each task
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

If you encounter issues:
1. Document in `WAVE_4_BLOCKERS.md`
2. Include file, line, error, attempts
3. Move to next task
4. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass

# Start with NotificationsPage
sed -i '1d' client/src/pages/NotificationsPage.tsx
pnpm check 2>&1 | grep "NotificationsPage"
```

**Good luck! Focus on making calendar, tasks, and notifications work together.**
