# To-Do List Feature Research Summary
## Replacing TERP Scratchpad with Collaborative Task Management

**Date**: November 3, 2025  
**Purpose**: Design a simple, lightweight, and super effective to-do list system to replace the current scratchpad feature

---

## 1. Current State Analysis

### Existing Scratchpad Implementation

**Location**: Header button → FloatingScratchPad component

**Current Features**:
- Single-user personal notes (diary-style format)
- Floating/modal modes with draggable positioning
- Auto-save functionality (1-second debounce)
- Basic completion tracking (`isCompleted` boolean)
- Infinite scroll support
- Keyboard shortcut (Ctrl+Shift+N)

**Database Schema** (`scratch_pad_notes` table):
```sql
- id (int, auto-increment, PK)
- userId (int, FK to users)
- content (text)
- isCompleted (boolean, default false)
- createdAt (timestamp)
- updatedAt (timestamp)
- completedAt (timestamp, nullable)
```

**Backend** (`/server/routers/scratchPad.ts`):
- `list` - Get user's notes with pagination
- `create` - Create new note
- `update` - Update note content
- `toggleNoteCompletion` - Toggle completion status
- `delete` - Delete note
- `count` - Get note count

**Current Limitations**:
- ❌ No shared/collaborative lists
- ❌ No user tagging or assignment
- ❌ No list organization (all notes in one stream)
- ❌ No quick-add functionality
- ❌ No priority levels
- ❌ No due dates
- ❌ No comments or activity tracking

---

## 2. Requirements for New To-Do List Feature

### User Requirements

1. **Personal To-Do Lists** - Private lists for individual users
2. **Shared To-Do Lists** - Collaborative lists with other users
3. **User Tagging/Assignment** - Assign tasks to specific users
4. **Quick Add** - Fast, lightweight task creation
5. **Simple & Effective** - Clean UX, minimal friction

### Functional Requirements (Based on Research)

**Core Features**:
- ✅ Create, update, delete tasks
- ✅ Task metadata: title, description, due date, priority, status, tags
- ✅ Personal lists (private to user)
- ✅ Shared lists (collaborative with multiple users)
- ✅ User assignment (single assignee per task)
- ✅ Task status tracking (To Do, In Progress, Done)
- ✅ Quick add with keyboard shortcuts
- ✅ Search and filter tasks
- ✅ Activity log for task changes

**Nice-to-Have** (Future enhancements):
- Subtasks (parent-child relationships)
- Comments on tasks
- File attachments
- Reminders/notifications
- Task templates

---

## 3. Database Schema Design

### Research Insights

Based on industry best practices from **Trello**, **Asana**, **ClickUp**, and **Todoist**:

**Key Entities**:
1. **Lists** (or Projects) - Container for tasks
2. **Tasks** - Individual to-do items
3. **List Members** - Users who have access to a list
4. **Task Assignments** - User assigned to a task
5. **Activity Log** - Track changes and updates

### Proposed Schema

#### Table: `todo_lists`
```sql
CREATE TABLE `todo_lists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `owner_id` INT NOT NULL,
  `is_shared` BOOLEAN DEFAULT FALSE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_owner_id` (`owner_id`)
);
```

#### Table: `todo_list_members`
```sql
CREATE TABLE `todo_list_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `list_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `role` ENUM('owner', 'editor', 'viewer') DEFAULT 'editor' NOT NULL,
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`list_id`) REFERENCES `todo_lists`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_list_member` (`list_id`, `user_id`),
  INDEX `idx_user_id` (`user_id`)
);
```

#### Table: `todo_tasks`
```sql
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
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`list_id`) REFERENCES `todo_lists`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_list_id` (`list_id`),
  INDEX `idx_assigned_to` (`assigned_to`),
  INDEX `idx_status` (`status`),
  INDEX `idx_due_date` (`due_date`)
);
```

#### Table: `todo_task_activity`
```sql
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
  INDEX `idx_created_at` (`created_at`)
);
```

### Schema Design Rationale

**Separation of Concerns**:
- **Lists** separate from **Tasks** allows flexible organization
- **List Members** enables granular access control for shared lists
- **Activity Log** provides audit trail and collaboration transparency

**Scalability**:
- Indexed foreign keys for fast queries
- Position field for custom task ordering
- Enum types for constrained values (status, priority, role)

**Flexibility**:
- `is_shared` flag for easy filtering of personal vs shared lists
- `assigned_to` nullable for unassigned tasks
- `role` field in members table for future permission expansion

---

## 4. UX/UI Design Patterns

### Research Findings

#### Quick Add Patterns

**Best Practices** (from Todoist, Asana, Linear):
1. **Global Keyboard Shortcut** - Quick access from anywhere (e.g., `Cmd/Ctrl + K`)
2. **Inline Add** - Add button at top/bottom of list with autofocus
3. **Command Palette** - Search + create in one interface
4. **Smart Parsing** - Parse due dates, priorities from natural language

**Recommended Approach for TERP**:
- **Keyboard Shortcut**: `Ctrl/Cmd + Shift + T` (T for Tasks)
- **Inline Add**: Prominent "+ Add Task" button at top of list
- **Quick Add Modal**: Lightweight overlay with:
  - Task title (required, autofocus)
  - List selector (default to personal list)
  - Optional: due date, priority, assignee
  - Enter to save, Esc to cancel

#### List View Patterns

**Best Practices**:
1. **Grouped by List** - Show tasks organized by list/project
2. **Status Columns** - Kanban-style (To Do | In Progress | Done)
3. **Compact List** - Dense view with checkboxes and inline editing
4. **Filter/Sort Controls** - By status, assignee, due date, priority

**Recommended Approach for TERP**:
- **Default View**: Grouped by list with collapsible sections
- **Task Item**: Checkbox + Title + Metadata badges (due date, priority, assignee)
- **Inline Editing**: Click to edit title, click badges to change metadata
- **Drag & Drop**: Reorder tasks within list

#### Shared List UX

**Best Practices**:
1. **Visual Indicator** - Icon/badge showing list is shared
2. **Member Avatars** - Show who has access
3. **Assignment UI** - Click to assign, show assignee avatar
4. **Activity Feed** - Show recent changes in shared lists

**Recommended Approach for TERP**:
- **List Header**: Show member avatars + "Share" button
- **Task Assignment**: Avatar picker dropdown on task
- **Activity Panel**: Collapsible sidebar showing recent activity
- **Notifications**: Badge count for unread activity (future)

#### Mobile/Responsive Considerations

**Best Practices**:
- Swipe actions for complete/delete
- Bottom sheet for quick add
- Collapsible sections for space efficiency
- Touch-friendly hit targets (44px minimum)

---

## 5. Backend Architecture

### tRPC Router Structure

**Recommended Routers**:

#### `/server/routers/todoLists.ts`
```typescript
- list() - Get all lists for user (personal + shared)
- getById(id) - Get list details with tasks
- create(name, description, isShared) - Create new list
- update(id, data) - Update list details
- delete(id) - Delete list
- addMember(listId, userId, role) - Add user to shared list
- removeMember(listId, userId) - Remove user from shared list
- updateMemberRole(listId, userId, role) - Change member role
```

#### `/server/routers/todoTasks.ts`
```typescript
- list(listId, filters) - Get tasks for a list with filters
- getById(id) - Get task details
- create(listId, title, ...metadata) - Create new task
- update(id, data) - Update task
- delete(id) - Delete task
- updateStatus(id, status) - Change task status
- assign(id, userId) - Assign task to user
- complete(id) - Mark task as complete
- reorder(listId, taskIds) - Reorder tasks
```

#### `/server/routers/todoActivity.ts`
```typescript
- getTaskActivity(taskId) - Get activity log for task
- getListActivity(listId) - Get activity log for list
- logActivity(taskId, action, details) - Log activity (internal)
```

### Service Layer

**Business Logic Services**:

#### `/server/services/todoPermissions.ts`
```typescript
- canViewList(userId, listId) - Check if user can view list
- canEditList(userId, listId) - Check if user can edit list
- canDeleteList(userId, listId) - Check if user is owner
- canEditTask(userId, taskId) - Check if user can edit task
- canAssignTask(userId, taskId) - Check if user can assign task
```

#### `/server/services/todoNotifications.ts` (Future)
```typescript
- notifyTaskAssigned(taskId, userId)
- notifyTaskCompleted(taskId)
- notifyListShared(listId, userId)
```

### Database Access Layer

**Pattern**: Follow existing TERP pattern (see `scratchPadDb.ts`)

#### `/server/todoListsDb.ts`
```typescript
- getUserLists(userId) - Get all lists user has access to
- getListById(listId) - Get list details
- createList(userId, data) - Create new list
- updateList(listId, data) - Update list
- deleteList(listId) - Delete list
- addListMember(listId, userId, role) - Add member
- removeListMember(listId, userId) - Remove member
- getListMembers(listId) - Get all members of list
```

#### `/server/todoTasksDb.ts`
```typescript
- getListTasks(listId, filters) - Get tasks with filtering
- getTaskById(taskId) - Get task details
- createTask(listId, userId, data) - Create task
- updateTask(taskId, data) - Update task
- deleteTask(taskId) - Delete task
- reorderTasks(listId, taskIds) - Update task positions
```

#### `/server/todoActivityDb.ts`
```typescript
- logActivity(taskId, userId, action, details) - Log activity
- getTaskActivity(taskId, limit) - Get task activity log
- getListActivity(listId, limit) - Get list activity log
```

---

## 6. Implementation Strategy

### Phase 1: Database & Backend (Foundation)

**Tasks**:
1. ✅ Create database migration files
2. ✅ Update Drizzle schema with new tables
3. ✅ Implement database access layer functions
4. ✅ Create tRPC routers with full CRUD operations
5. ✅ Implement permission checking service
6. ✅ Add activity logging
7. ✅ Write tests for critical paths

**Deliverables**:
- Migration SQL files (0022_add_todo_lists.sql, etc.)
- Updated `/drizzle/schema.ts`
- New files: `todoListsDb.ts`, `todoTasksDb.ts`, `todoActivityDb.ts`
- New routers: `todoLists.ts`, `todoTasks.ts`, `todoActivity.ts`
- Service: `todoPermissions.ts`

### Phase 2: Frontend Components (UI)

**Tasks**:
1. ✅ Create base UI components
   - `TodoListSelector` - Dropdown to select list
   - `TodoTaskItem` - Individual task display
   - `TodoTaskList` - List of tasks with grouping
   - `QuickAddTask` - Quick add modal/inline form
   - `ShareListModal` - Share list with users
   - `TaskDetailDrawer` - Task details sidebar
2. ✅ Implement state management with TanStack Query
3. ✅ Add keyboard shortcuts
4. ✅ Implement drag & drop for reordering
5. ✅ Add responsive mobile views

**Deliverables**:
- New components in `/client/src/components/todo/`
- Updated header with new to-do list button
- New page: `/client/src/pages/TodoPage.tsx` (optional full page view)

### Phase 3: Integration & Polish

**Tasks**:
1. ✅ Replace scratchpad button in header with to-do list
2. ✅ Migrate existing scratchpad data (optional)
3. ✅ Add loading states and error handling
4. ✅ Implement optimistic updates
5. ✅ Add empty states and onboarding
6. ✅ Performance optimization
7. ✅ Accessibility audit (ARIA labels, keyboard navigation)
8. ✅ Cross-browser testing

**Deliverables**:
- Updated `AppHeader.tsx`
- Migration script (if needed)
- Polished, production-ready feature

### Phase 4: Testing & Deployment

**Tasks**:
1. ✅ Manual testing of all user flows
2. ✅ Test shared list collaboration
3. ✅ Test permission boundaries
4. ✅ Verify zero TypeScript errors
5. ✅ Update documentation
6. ✅ Deploy to production
7. ✅ Monitor for issues

**Deliverables**:
- Updated `/docs/` with feature documentation
- Production deployment
- User feedback collection

---

## 7. Key Design Decisions

### Quick Add Implementation

**Decision**: Use **floating modal** + **inline add** hybrid approach

**Rationale**:
- Floating modal (Ctrl+Shift+T) for global quick access
- Inline add button at top of each list for contextual adding
- Autofocus on title field for immediate typing
- Smart defaults (personal list, medium priority, no due date)

### List Organization

**Decision**: **Personal list by default** + **explicit sharing**

**Rationale**:
- Most tasks are personal (80/20 rule)
- Sharing is opt-in to avoid clutter
- Clear visual distinction between personal and shared
- Easy to convert personal → shared later

### User Assignment UX

**Decision**: **Single assignee** with **avatar picker**

**Rationale**:
- Simplifies accountability (one owner per task)
- Avatar picker is familiar pattern (Gmail, Asana)
- Shows assignee at a glance in list view
- Can expand to multiple assignees later if needed

### Activity Logging

**Decision**: **Automatic logging** for key actions

**Rationale**:
- Transparency in shared lists
- Audit trail for compliance
- Helps users track progress
- Minimal performance impact with async logging

### Migration Strategy

**Decision**: **Keep scratchpad**, add to-do list as **new feature**

**Rationale**:
- Avoid breaking existing user workflows
- Users can migrate at their own pace
- Scratchpad and to-do list serve different purposes
- Can deprecate scratchpad later based on usage

**Alternative**: Replace scratchpad entirely
- Simpler for users (one tool)
- Cleaner codebase
- Need migration script for existing notes

**Recommendation**: Start with **new feature**, evaluate usage, then decide on deprecation

---

## 8. Success Metrics

### User Adoption
- % of users who create at least one to-do list
- Average tasks per user per week
- % of users using shared lists

### Engagement
- Daily active users of to-do feature
- Average session time in to-do interface
- Task completion rate

### Collaboration
- % of lists that are shared
- Average members per shared list
- Activity log views per shared list

### Performance
- Time to create task (< 500ms)
- Time to load task list (< 1s)
- Zero errors in production

---

## 9. Future Enhancements

### Phase 2 Features (Post-MVP)
1. **Subtasks** - Break down complex tasks
2. **Comments** - Discuss tasks with team
3. **File Attachments** - Attach documents to tasks
4. **Reminders** - Get notified before due dates
5. **Recurring Tasks** - Automate repetitive tasks
6. **Templates** - Reuse common task structures
7. **Integrations** - Connect with calendar, email, etc.

### Advanced Features
1. **Task Dependencies** - Block tasks until others complete
2. **Time Tracking** - Track time spent on tasks
3. **Custom Fields** - Add custom metadata to tasks
4. **Automation** - Auto-assign, auto-complete based on rules
5. **Analytics** - Productivity insights and reports
6. **Mobile App** - Native iOS/Android apps

---

## 10. References & Inspiration

### Tools Analyzed
- **Todoist** - Quick add, natural language parsing
- **Asana** - Shared projects, task assignment
- **Linear** - Keyboard-first UX, command palette
- **Trello** - Kanban boards, drag & drop
- **ClickUp** - Comprehensive task management
- **Microsoft To Do** - Simple, clean UX

### Design Resources
- [AlgoMaster - Task Management System Design](https://algomaster.io/learn/lld/design-task-management-system)
- [Back4app - Database Schema for Task Management](https://www.back4app.com/tutorials/how-to-design-a-database-schema-for-a-task-and-to-do-list-management-app)
- [UI Patterns - Keyboard Shortcuts](https://ui-patterns.com/patterns/keyboard-shortcuts)
- [Medium - Command Palette UX Patterns](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)

### Best Practices
- **Start with verb** in task titles (e.g., "Review PR", not "PR review")
- **One line per task** for scannability
- **Visual hierarchy** with status badges and priority colors
- **Keyboard shortcuts** for power users
- **Optimistic updates** for perceived performance
- **Activity transparency** in shared contexts

---

## Conclusion

This research provides a comprehensive foundation for building a world-class, simple, and effective to-do list feature for TERP. The design balances:

✅ **Simplicity** - Clean UX, minimal friction  
✅ **Power** - Shared lists, assignments, activity tracking  
✅ **Scalability** - Proper schema, indexed queries, permission system  
✅ **Flexibility** - Easy to extend with future features  

**Next Steps**: Proceed with implementation following TERP development protocols (The Bible).
