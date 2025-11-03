# TERP To-Do List + Universal Comments System
## Complete Implementation Plan Following The Bible

**Version**: 1.0  
**Date**: November 3, 2025  
**Status**: Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Implementation Checklist](#pre-implementation-checklist)
3. [Phase 1: Database & Backend](#phase-1-database--backend)
4. [Phase 2: Frontend Components](#phase-2-frontend-components)
5. [Phase 3: Integration & Polish](#phase-3-integration--polish)
6. [Phase 4: Testing & Deployment](#phase-4-testing--deployment)
7. [Quality Checkpoints](#quality-checkpoints)
8. [Breaking Change Protocol](#breaking-change-protocol)
9. [Rollback Plan](#rollback-plan)

---

## Overview

### Implementation Strategy

Following **The Bible** (DEVELOPMENT_PROTOCOLS.md), this implementation uses:

✅ **Yolo-Style Roadmap Execution** with integrated QA  
✅ **Holistic System Integration** with change management  
✅ **Self-Healing Checkpoints** at each major phase  
✅ **Zero Placeholders/Stubs** - production-ready only  
✅ **Breaking Change Protocol** for major refactoring  

### Success Criteria

- ✅ Zero TypeScript errors throughout
- ✅ All features fully functional (no TODOs)
- ✅ Complete error handling and loading states
- ✅ Mobile-first responsive design
- ✅ Accessibility compliant (ARIA, keyboard nav)
- ✅ Documentation updated
- ✅ Tests passing

---

## Pre-Implementation Checklist

### 1. Impact Analysis

**Files to be Created** (~40 new files):
```
Backend (Server):
- /server/routers/todoLists.ts
- /server/routers/todoTasks.ts
- /server/routers/comments.ts
- /server/routers/inbox.ts
- /server/routers/todoActivity.ts
- /server/services/todoPermissions.ts
- /server/services/mentionParser.ts
- /server/todoListsDb.ts
- /server/todoTasksDb.ts
- /server/commentsDb.ts
- /server/inboxDb.ts
- /server/todoActivityDb.ts

Database:
- /drizzle/migrations/0022_add_todo_lists.sql
- /drizzle/migrations/0023_add_comments_system.sql
- /drizzle/migrations/0024_add_inbox_system.sql

Frontend (Client):
- /client/src/components/todo/TodoListSelector.tsx
- /client/src/components/todo/TodoTaskItem.tsx
- /client/src/components/todo/TodoTaskList.tsx
- /client/src/components/todo/QuickAddTask.tsx
- /client/src/components/todo/ShareListModal.tsx
- /client/src/components/todo/TaskDetailDrawer.tsx
- /client/src/components/todo/TodoInbox.tsx
- /client/src/components/comments/CommentList.tsx
- /client/src/components/comments/CommentItem.tsx
- /client/src/components/comments/CommentForm.tsx
- /client/src/components/comments/MentionInput.tsx
- /client/src/components/comments/CommentBadge.tsx
- /client/src/components/inbox/InboxPanel.tsx
- /client/src/components/inbox/InboxPage.tsx
- /client/src/components/inbox/InboxItem.tsx
- /client/src/components/inbox/InboxBadge.tsx
- /client/src/hooks/useTodoLists.ts
- /client/src/hooks/useComments.ts
- /client/src/hooks/useInbox.ts
- /client/src/types/todo.ts
- /client/src/types/comments.ts
- /client/src/types/inbox.ts
```

**Files to be Modified** (~10 files):
```
Backend:
- /server/_core/router.ts (add new routers)
- /drizzle/schema.ts (add new tables)

Frontend:
- /client/src/components/layout/Header.tsx (replace scratchpad with inbox)
- /client/src/components/layout/MobileNav.tsx (add inbox link)
- /client/src/pages/DashboardPage.tsx (add inbox summary widget)
- /client/src/pages/InventoryPage.tsx (add comment widgets)
- /client/src/pages/accounting/InvoicesPage.tsx (add comment widgets)
- /client/src/components/clients/ClientDetailPage.tsx (add comment widgets)
- /client/src/App.tsx (add keyboard shortcuts)
```

**Files to be Removed** (~2 files):
```
- /client/src/components/FloatingScratchPad.tsx (replaced by TodoInbox)
- /server/scratchPadDb.ts (replaced by new DB layer)
```

### 2. Dependency Map

**New Dependencies**:
- None! All required packages already installed:
  - `@tanstack/react-query` ✅
  - `@dnd-kit/core` ✅ (for drag & drop)
  - `react-swipeable` ✅ (for mobile gestures)
  - `zod` ✅
  - `react-hook-form` ✅

**Existing Dependencies**:
- tRPC routers → `server/_core/router.ts`
- Drizzle schema → `drizzle/schema.ts`
- UI components → `client/src/components/ui/*`
- Auth context → `server/_core/context.ts`

### 3. Breaking Changes Assessment

**Is this a breaking change?**

✅ **YES** - This meets breaking change criteria:
- Refactoring **2 files** (removing scratchpad)
- Adding **50+ new files**
- Changing **header navigation** (user-facing)
- Adding **7 new database tables**

**Required Actions**:
1. ✅ Report to user with impact analysis (this document)
2. ⏳ Wait for explicit confirmation to proceed
3. ⏳ Create checkpoint before starting
4. ⏳ Implement with full QA at each phase

---

## Phase 1: Database & Backend

### Checkpoint: PHASE_1_START
**Action**: Create git checkpoint before starting Phase 1

### 1.1 Database Migrations

**Task**: Create migration files for new tables

**Files to Create**:
```
/drizzle/migrations/0022_add_todo_lists.sql
/drizzle/migrations/0023_add_comments_system.sql
/drizzle/migrations/0024_add_inbox_system.sql
```

**Migration 0022**: To-Do Lists Tables
```sql
-- todo_lists table
CREATE TABLE `todo_lists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `owner_id` INT NOT NULL,
  `is_shared` BOOLEAN DEFAULT FALSE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_owner_id` (`owner_id`),
  INDEX `idx_is_shared` (`is_shared`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- todo_list_members table
CREATE TABLE `todo_list_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `list_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `role` ENUM('owner', 'editor', 'viewer') DEFAULT 'editor' NOT NULL,
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `added_by` INT NOT NULL,
  FOREIGN KEY (`list_id`) REFERENCES `todo_lists`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_list_member` (`list_id`, `user_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_list_id` (`list_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- todo_tasks table
CREATE TABLE `todo_tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `list_id` INT NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `status` ENUM('todo', 'in_progress', 'done') DEFAULT 'todo' NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  `due_date` TIMESTAMP NULL,
  `assigned_to` INT NULL,
  `created_by` INT NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `is_completed` BOOLEAN DEFAULT FALSE NOT NULL,
  `completed_at` TIMESTAMP NULL,
  `completed_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`list_id`) REFERENCES `todo_lists`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_list_id` (`list_id`),
  INDEX `idx_assigned_to` (`assigned_to`),
  INDEX `idx_status` (`status`),
  INDEX `idx_due_date` (`due_date`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- todo_task_activity table
CREATE TABLE `todo_task_activity` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `action` ENUM('created', 'updated', 'status_changed', 'assigned', 'completed', 'deleted') NOT NULL,
  `field_changed` VARCHAR(100),
  `old_value` TEXT,
  `new_value` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`task_id`) REFERENCES `todo_tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_id` (`task_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration 0023**: Comments System
```sql
-- comments table (polymorphic)
CREATE TABLE `comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `commentable_type` VARCHAR(50) NOT NULL,
  `commentable_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `is_resolved` BOOLEAN DEFAULT FALSE NOT NULL,
  `resolved_at` TIMESTAMP NULL,
  `resolved_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_commentable` (`commentable_type`, `commentable_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_is_resolved` (`is_resolved`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- comment_mentions table
CREATE TABLE `comment_mentions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `comment_id` INT NOT NULL,
  `mentioned_user_id` INT NOT NULL,
  `mentioned_by_user_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`mentioned_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`mentioned_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_mention` (`comment_id`, `mentioned_user_id`),
  INDEX `idx_mentioned_user_id` (`mentioned_user_id`),
  INDEX `idx_comment_id` (`comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration 0024**: Inbox System
```sql
-- inbox_items table
CREATE TABLE `inbox_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `source_type` ENUM('mention', 'task_assignment', 'task_update') NOT NULL,
  `source_id` INT NOT NULL,
  `reference_type` VARCHAR(50) NOT NULL,
  `reference_id` INT NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `status` ENUM('unread', 'seen', 'completed') DEFAULT 'unread' NOT NULL,
  `seen_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `is_archived` BOOLEAN DEFAULT FALSE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_source` (`source_type`, `source_id`),
  INDEX `idx_reference` (`reference_type`, `reference_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_is_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Verification**:
- [ ] Run migrations locally
- [ ] Verify tables created
- [ ] Check indexes exist
- [ ] Test foreign key constraints

### 1.2 Update Drizzle Schema

**File**: `/drizzle/schema.ts`

**Action**: Add new table definitions

**Quality Check**:
- [ ] All fields match migration SQL
- [ ] Relations defined correctly
- [ ] Types exported properly
- [ ] Zero TypeScript errors

### 1.3 Database Access Layer

**Files to Create**:
```
/server/todoListsDb.ts
/server/todoTasksDb.ts
/server/commentsDb.ts
/server/inboxDb.ts
/server/todoActivityDb.ts
```

**Each file must include**:
- ✅ Full CRUD operations
- ✅ Proper error handling
- ✅ Type safety with Drizzle
- ✅ Query optimization (indexes used)
- ✅ Transaction support where needed
- ✅ JSDoc comments

**Quality Check**:
- [ ] All functions fully implemented (no TODOs)
- [ ] Error handling complete
- [ ] Return types correct
- [ ] Queries optimized
- [ ] Zero TypeScript errors

### 1.4 Services Layer

**Files to Create**:
```
/server/services/todoPermissions.ts
/server/services/mentionParser.ts
```

**todoPermissions.ts**:
- `canViewList(userId, listId)`
- `canEditList(userId, listId)`
- `canDeleteList(userId, listId)`
- `canViewTask(userId, taskId)`
- `canEditTask(userId, taskId)`

**mentionParser.ts**:
- `parseMentions(content: string): number[]`
- `formatMention(userName: string, userId: number): string`

**Quality Check**:
- [ ] All permission checks implemented
- [ ] Mention parsing handles edge cases
- [ ] Error messages clear
- [ ] Zero TypeScript errors

### 1.5 tRPC Routers

**Files to Create**:
```
/server/routers/todoLists.ts
/server/routers/todoTasks.ts
/server/routers/comments.ts
/server/routers/inbox.ts
/server/routers/todoActivity.ts
```

**Each router must include**:
- ✅ Input validation with Zod
- ✅ Authentication checks
- ✅ Permission checks
- ✅ Error handling
- ✅ Proper return types
- ✅ JSDoc comments

**Quality Check**:
- [ ] All endpoints fully functional
- [ ] Validation schemas complete
- [ ] Permission checks in place
- [ ] Error handling robust
- [ ] Zero TypeScript errors

### 1.6 Register Routers

**File**: `/server/_core/router.ts`

**Action**: Add new routers to main router

```typescript
import { todoListsRouter } from '../routers/todoLists';
import { todoTasksRouter } from '../routers/todoTasks';
import { commentsRouter } from '../routers/comments';
import { inboxRouter } from '../routers/inbox';
import { todoActivityRouter } from '../routers/todoActivity';

export const appRouter = router({
  // ... existing routers
  todoLists: todoListsRouter,
  todoTasks: todoTasksRouter,
  comments: commentsRouter,
  inbox: inboxRouter,
  todoActivity: todoActivityRouter,
});
```

**Quality Check**:
- [ ] All routers registered
- [ ] No naming conflicts
- [ ] Zero TypeScript errors

### 1.7 Phase 1 Self-Healing Checkpoint

**Run Quality Checks**:
```bash
# 1. TypeScript check
cd /home/ubuntu/TERP
pnpm run check

# 2. Build check
pnpm run build:server

# 3. Test database connections
# (Manual verification)
```

**Checklist**:
- [ ] Zero TypeScript errors
- [ ] Server builds successfully
- [ ] All migrations applied
- [ ] Database tables exist
- [ ] All routers registered
- [ ] No console errors

**If any issues found**:
1. STOP immediately
2. Fix issues before proceeding
3. Re-run quality checks
4. Only proceed when all checks pass

### Checkpoint: PHASE_1_COMPLETE
**Action**: Create git checkpoint after Phase 1 complete

---

## Phase 2: Frontend Components

### Checkpoint: PHASE_2_START
**Action**: Create git checkpoint before starting Phase 2

### 2.1 TypeScript Types

**Files to Create**:
```
/client/src/types/todo.ts
/client/src/types/comments.ts
/client/src/types/inbox.ts
```

**Quality Check**:
- [ ] Types match backend schemas
- [ ] All fields included
- [ ] Proper TypeScript syntax
- [ ] Zero TypeScript errors

### 2.2 Custom Hooks

**Files to Create**:
```
/client/src/hooks/useTodoLists.ts
/client/src/hooks/useComments.ts
/client/src/hooks/useInbox.ts
```

**Each hook must include**:
- ✅ tRPC query/mutation wrappers
- ✅ Loading states
- ✅ Error handling
- ✅ Optimistic updates
- ✅ Cache invalidation

**Quality Check**:
- [ ] All CRUD operations wrapped
- [ ] Loading/error states handled
- [ ] Optimistic updates work
- [ ] Zero TypeScript errors

### 2.3 To-Do Components

**Files to Create**:
```
/client/src/components/todo/TodoListSelector.tsx
/client/src/components/todo/TodoTaskItem.tsx
/client/src/components/todo/TodoTaskList.tsx
/client/src/components/todo/QuickAddTask.tsx
/client/src/components/todo/ShareListModal.tsx
/client/src/components/todo/TaskDetailDrawer.tsx
/client/src/components/todo/TodoInbox.tsx
```

**Each component must include**:
- ✅ Full functionality (no placeholders)
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design (mobile-first)
- ✅ Accessibility (ARIA labels, keyboard nav)
- ✅ Proper TypeScript types

**Quality Check**:
- [ ] All interactions work
- [ ] Loading states visible
- [ ] Error messages clear
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] Zero TypeScript errors

### 2.4 Comment Components

**Files to Create**:
```
/client/src/components/comments/CommentList.tsx
/client/src/components/comments/CommentItem.tsx
/client/src/components/comments/CommentForm.tsx
/client/src/components/comments/MentionInput.tsx
/client/src/components/comments/CommentBadge.tsx
```

**MentionInput Requirements**:
- ✅ @mention autocomplete
- ✅ User search on typing
- ✅ Keyboard navigation (arrow keys, enter)
- ✅ Click to select
- ✅ Format: `@[Name](userId)`

**Quality Check**:
- [ ] All interactions work
- [ ] @mention autocomplete functional
- [ ] Comment submission works
- [ ] Resolve/unresolve works
- [ ] Mobile responsive
- [ ] Zero TypeScript errors

### 2.5 Inbox Components

**Files to Create**:
```
/client/src/components/inbox/InboxPanel.tsx (desktop)
/client/src/components/inbox/InboxPage.tsx (mobile)
/client/src/components/inbox/InboxItem.tsx
/client/src/components/inbox/InboxBadge.tsx
```

**Mobile Gestures**:
- ✅ Swipe right → complete
- ✅ Swipe left → dismiss
- ✅ Long press → context menu

**Quality Check**:
- [ ] Desktop panel works
- [ ] Mobile page works
- [ ] Swipe gestures functional
- [ ] Badge updates in real-time
- [ ] Filtering works
- [ ] Zero TypeScript errors

### 2.6 Phase 2 Self-Healing Checkpoint

**Run Quality Checks**:
```bash
# 1. TypeScript check
cd /home/ubuntu/TERP/client
pnpm run check

# 2. Build check
pnpm run build

# 3. Visual inspection
pnpm run dev
# Open browser and test components
```

**Checklist**:
- [ ] Zero TypeScript errors
- [ ] Client builds successfully
- [ ] All components render
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Interactions work

**If any issues found**:
1. STOP immediately
2. Fix issues before proceeding
3. Re-run quality checks
4. Only proceed when all checks pass

### Checkpoint: PHASE_2_COMPLETE
**Action**: Create git checkpoint after Phase 2 complete

---

## Phase 3: Integration & Polish

### Checkpoint: PHASE_3_START
**Action**: Create git checkpoint before starting Phase 3

### 3.1 Replace Scratchpad with Inbox

**Files to Modify**:
```
/client/src/components/layout/Header.tsx
/client/src/components/layout/MobileNav.tsx
```

**Files to Remove**:
```
/client/src/components/FloatingScratchPad.tsx
/server/scratchPadDb.ts
```

**Actions**:
1. Remove scratchpad button from header
2. Add inbox button with badge
3. Update mobile navigation
4. Remove scratchpad imports
5. Clean up unused code

**Quality Check**:
- [ ] Scratchpad completely removed
- [ ] Inbox button visible
- [ ] Badge shows unread count
- [ ] Click opens inbox panel
- [ ] Mobile navigation updated
- [ ] Zero TypeScript errors

### 3.2 Add Comment Widgets to Entities

**Files to Modify**:
```
/client/src/pages/InventoryPage.tsx
/client/src/pages/accounting/InvoicesPage.tsx
/client/src/pages/accounting/BillsPage.tsx
/client/src/pages/accounting/QuotesPage.tsx
/client/src/components/clients/ClientDetailPage.tsx
```

**For each entity page**:
1. Import `CommentList` component
2. Add comment section to detail view
3. Add `CommentBadge` to list items
4. Pass correct `commentableType` and `commentableId`

**Example**:
```tsx
// In InvoiceDetailPage.tsx
<CommentList
  commentableType="invoice"
  commentableId={invoice.id}
/>

// In InvoiceListItem.tsx
<CommentBadge
  commentableType="invoice"
  commentableId={invoice.id}
/>
```

**Quality Check**:
- [ ] Comments visible on all entities
- [ ] Badges show unresolved count
- [ ] @mentions create inbox items
- [ ] Comments persist correctly
- [ ] Zero TypeScript errors

### 3.3 Add Keyboard Shortcuts

**File**: `/client/src/App.tsx`

**Action**: Add global keyboard listener

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+Shift+T or Cmd+Shift+T
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      setQuickAddOpen(true);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Quality Check**:
- [ ] Keyboard shortcut works
- [ ] Quick add modal opens
- [ ] No conflicts with existing shortcuts
- [ ] Works on Mac and Windows

### 3.4 Add Dashboard Inbox Widget

**File**: `/client/src/pages/DashboardPage.tsx`

**Action**: Add inbox summary widget to dashboard

**Widget shows**:
- Unread count
- Recent mentions
- Quick link to inbox

**Quality Check**:
- [ ] Widget renders correctly
- [ ] Counts are accurate
- [ ] Links work
- [ ] Responsive design

### 3.5 Loading States & Error Handling

**For ALL components**:
- ✅ Show skeleton loaders while fetching
- ✅ Show error messages on failure
- ✅ Retry buttons for failed requests
- ✅ Empty states with helpful messages

**Quality Check**:
- [ ] All loading states implemented
- [ ] All error states handled
- [ ] Empty states helpful
- [ ] No blank screens

### 3.6 Accessibility Audit

**Check ALL components for**:
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus indicators visible
- ✅ Screen reader friendly
- ✅ Color contrast (WCAG AA)

**Quality Check**:
- [ ] All buttons have ARIA labels
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader tested
- [ ] Color contrast passes

### 3.7 Phase 3 Self-Healing Checkpoint

**Run Quality Checks**:
```bash
# 1. Full TypeScript check
cd /home/ubuntu/TERP
pnpm run check

# 2. Full build
pnpm run build

# 3. Manual testing
pnpm run dev
# Test all user flows
```

**Checklist**:
- [ ] Zero TypeScript errors
- [ ] Full build successful
- [ ] All integrations work
- [ ] Comments on all entities
- [ ] Inbox updates correctly
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive
- [ ] Accessible

**If any issues found**:
1. STOP immediately
2. Fix issues before proceeding
3. Re-run quality checks
4. Only proceed when all checks pass

### Checkpoint: PHASE_3_COMPLETE
**Action**: Create git checkpoint after Phase 3 complete

---

## Phase 4: Testing & Deployment

### Checkpoint: PHASE_4_START
**Action**: Create git checkpoint before starting Phase 4

### 4.1 Manual Testing - User Flows

**Test Flow 1: Quick Add Task**
- [ ] Press Ctrl+Shift+T
- [ ] Modal opens
- [ ] Type task title
- [ ] Select list, priority, due date
- [ ] Assign to user
- [ ] Press Enter
- [ ] Task created
- [ ] Assignee receives inbox item

**Test Flow 2: @Mention in Comment**
- [ ] Open entity (e.g., Invoice)
- [ ] Click "Add comment"
- [ ] Type comment with @mention
- [ ] Select user from dropdown
- [ ] Submit comment
- [ ] Comment visible to all users
- [ ] Mentioned user receives inbox item
- [ ] Click inbox item navigates to entity

**Test Flow 3: Inbox Management**
- [ ] See unread badge on inbox
- [ ] Click inbox button
- [ ] Panel opens with items
- [ ] Click item → navigates to entity
- [ ] Item marked as "seen"
- [ ] Complete action
- [ ] Mark as "completed"
- [ ] Item hidden from default view

**Test Flow 4: Shared List Collaboration**
- [ ] Create shared list
- [ ] Add members
- [ ] Create task
- [ ] Assign to member
- [ ] Member sees task in list
- [ ] Member receives inbox item
- [ ] Member completes task
- [ ] Activity logged

**Test Flow 5: Comment Resolution**
- [ ] View entity with comments
- [ ] See unresolved comments
- [ ] Resolve comment
- [ ] Comment collapsed
- [ ] Badge count decreases
- [ ] Toggle "Show resolved"
- [ ] Resolved comments visible

### 4.2 Permission Testing

**Test Permissions**:
- [ ] Non-owner cannot delete list
- [ ] Viewer cannot edit tasks
- [ ] Non-member cannot view private list
- [ ] Cannot edit others' comments
- [ ] Cannot view others' personal lists

### 4.3 Mobile Testing

**Test on Mobile**:
- [ ] Touch targets 44px minimum
- [ ] Swipe right completes item
- [ ] Swipe left dismisses item
- [ ] Bottom sheets work
- [ ] Responsive layouts correct
- [ ] No horizontal scroll

### 4.4 Cross-Browser Testing

**Test on**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### 4.5 Performance Testing

**Check**:
- [ ] Time to create task < 500ms
- [ ] Time to load inbox < 1s
- [ ] Time to load comments < 500ms
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

### 4.6 Documentation Updates

**Update Files**:
```
/docs/CHANGELOG.md
/docs/FEATURES.md
/docs/API_DOCUMENTATION.md
/README.md
```

**Include**:
- Feature description
- User guide
- API endpoints
- Database schema
- Migration notes

**Quality Check**:
- [ ] Changelog updated
- [ ] Features documented
- [ ] API docs complete
- [ ] README updated

### 4.7 Pre-Deployment Checklist

**Final Checks**:
- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] All user flows work
- [ ] Mobile responsive
- [ ] Accessible
- [ ] Documentation updated
- [ ] No console errors
- [ ] No performance issues
- [ ] Database migrations ready

### 4.8 Deployment

**Steps**:
1. Create production build
2. Run migrations on production DB
3. Deploy to DigitalOcean
4. Verify deployment successful
5. Smoke test production
6. Monitor for errors

**Quality Check**:
- [ ] Production build successful
- [ ] Migrations applied
- [ ] Deployment successful
- [ ] Production smoke test passed
- [ ] No errors in logs

### 4.9 Post-Deployment Monitoring

**Monitor for 24 hours**:
- [ ] No error spikes
- [ ] Performance stable
- [ ] Users can access features
- [ ] No database issues
- [ ] No authentication issues

### Checkpoint: PHASE_4_COMPLETE
**Action**: Create git checkpoint after Phase 4 complete

---

## Quality Checkpoints

### Checkpoint Template

**Before Each Phase**:
1. Review phase requirements
2. Identify files to create/modify
3. Create git checkpoint
4. Proceed with implementation

**During Each Phase**:
1. Follow production-ready code standards
2. No placeholders or TODOs
3. Complete error handling
4. Full loading states
5. Proper TypeScript types

**After Each Phase**:
1. Run TypeScript check (`pnpm run check`)
2. Run build (`pnpm run build`)
3. Manual testing of new features
4. Verify zero errors
5. Create git checkpoint
6. Only proceed when all checks pass

### Self-Healing Protocol

**If Issues Found**:
1. STOP immediately
2. Document the issue
3. Fix the issue completely
4. Re-run quality checks
5. Verify fix successful
6. Only then proceed

**Never**:
- Skip quality checks
- Proceed with known issues
- Leave TODOs or placeholders
- Commit broken code

---

## Breaking Change Protocol

### This IS a Breaking Change

**Criteria Met**:
- ✅ Removing 2 files (scratchpad)
- ✅ Adding 50+ new files
- ✅ Changing header navigation
- ✅ Adding 7 database tables

### Required Actions

**Before Implementation**:
1. ✅ Report to user (this document)
2. ⏳ Wait for explicit confirmation
3. ⏳ Create checkpoint before starting

**During Implementation**:
1. Follow all quality checkpoints
2. Create checkpoints after each phase
3. Self-heal any issues immediately

**After Implementation**:
1. Complete testing
2. Update documentation
3. Deploy with monitoring

---

## Rollback Plan

### If Critical Issues Found

**Immediate Actions**:
1. STOP deployment
2. Document the issue
3. Assess severity

**Rollback Steps**:
1. Revert to last checkpoint
2. Restore database if needed
3. Redeploy previous version
4. Notify users if necessary

**Recovery Steps**:
1. Fix issues in development
2. Re-test thoroughly
3. Attempt deployment again

---

## Success Metrics

### Implementation Complete When

- ✅ Zero TypeScript errors
- ✅ All features fully functional
- ✅ All user flows tested
- ✅ Mobile responsive
- ✅ Accessible
- ✅ Documentation updated
- ✅ Deployed to production
- ✅ 24-hour monitoring passed

### User Adoption Targets

**Week 1**:
- 50% of users create at least one task
- 30% of users add at least one comment
- 20% of users use @mentions

**Month 1**:
- 80% of users active on to-do lists
- 60% of users active on comments
- Average 10 tasks per user per week

---

## Ready for Implementation

### Pre-Flight Checklist

- ✅ System design complete
- ✅ Implementation plan complete
- ✅ Impact analysis complete
- ✅ Breaking change protocol acknowledged
- ✅ Quality checkpoints defined
- ✅ Rollback plan ready

### Waiting for User Confirmation

**This is a BREAKING CHANGE that requires explicit user approval.**

**Once confirmed, implementation will proceed in "yolo style" with:**
- Integrated QA at each phase
- Self-healing checkpoints
- Zero placeholders/stubs
- Production-ready code only

**Estimated Timeline**: 4 weeks (1 week per phase)

---

**Document Version**: 1.0  
**Status**: ⏳ AWAITING USER CONFIRMATION  
**Next Action**: Wait for user approval to begin Phase 1
