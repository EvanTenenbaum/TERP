# TERP To-Do List + Universal Comments System
## Complete System Design Specification

**Version**: 2.0  
**Date**: November 3, 2025  
**Status**: Production-Ready Design

---

## Executive Summary

A comprehensive task management and collaboration system for TERP that combines:

1. **To-Do Lists** - Personal and shared task lists with assignments
2. **Universal Comments** - Comment on any entity in TERP
3. **@Mention System** - Tag users to create actionable inbox items
4. **Smart Inbox** - Unified view of all mentions and assignments

**Design Principles**:
- ✅ **Unobtrusive** - Inform, don't interrupt
- ✅ **Mobile-First** - Touch-optimized, responsive
- ✅ **Professional** - Clean, business-focused
- ✅ **Powerful** - Full functionality, zero complexity
- ❌ **No Gamification** - No badges, streaks, or artificial engagement

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Concepts](#core-concepts)
3. [Database Schema](#database-schema)
4. [State Management](#state-management)
5. [Visual Design](#visual-design)
6. [Anti-Clutter Strategy](#anti-clutter-strategy)
7. [Backend Architecture](#backend-architecture)
8. [Frontend Architecture](#frontend-architecture)
9. [User Flows](#user-flows)
10. [Implementation Roadmap](#implementation-roadmap)

---

## 1. System Overview

### 1.1 Three Interconnected Systems

```
┌─────────────────────────────────────────────────────────────┐
│                      TERP COLLABORATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   TO-DO      │  │  UNIVERSAL   │  │    INBOX     │     │
│  │   LISTS      │◄─┤  COMMENTS    │─►│   SYSTEM     │     │
│  │              │  │              │  │              │     │
│  │ • Personal   │  │ • @Mentions  │  │ • Unread     │     │
│  │ • Shared     │  │ • On any     │  │ • Seen       │     │
│  │ • Assigned   │  │   entity     │  │ • Completed  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │  TERP ENTITIES  │                       │
│                   │  (Polymorphic)  │                       │
│                   │                 │                       │
│                   │ • Invoices      │                       │
│                   │ • Batches       │                       │
│                   │ • Clients       │                       │
│                   │ • Orders        │                       │
│                   │ • Bills         │                       │
│                   │ • Quotes        │                       │
│                   │ • Any entity... │                       │
│                   └─────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Features

**To-Do Lists**:
- Create personal and shared lists
- Quick add tasks (keyboard shortcut + inline)
- Assign tasks to users
- Priority levels and due dates
- Drag & drop reordering
- Status tracking (To Do → In Progress → Done)

**Universal Comments**:
- Comment on any entity in TERP (polymorphic)
- @mention users to create inbox tasks
- All comments visible to all users (transparent)
- Rich text formatting
- Timestamps on everything

**Smart Inbox**:
- Unified view of all mentions and assignments
- Three states: Unread → Seen → Completed
- Visual indicators on entities with unresolved items
- Smart filtering and progressive disclosure
- Auto-archiving of old resolved items

---

## 2. Core Concepts

### 2.1 Comment Visibility Model

**Simple Rule**: All comments are visible to all users by default.

**Rationale**:
- Promotes transparency and collaboration
- Eliminates complexity of permission management
- Aligns with ERP best practices (audit trail)
- Users can see full conversation context

**@Mentions**:
- Create actionable inbox items for tagged users
- Don't change comment visibility
- Multiple users can be mentioned in one comment

### 2.2 Inbox Item Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    INBOX ITEM STATES                         │
└─────────────────────────────────────────────────────────────┘

  CREATED                SEEN                 COMPLETED
     │                    │                       │
     │  User hasn't       │  User viewed but      │  User finished
     │  seen mention      │  hasn't acted         │  the task
     │  yet               │  yet                  │
     │                    │                       │
     ▼                    ▼                       ▼
┌─────────┐          ┌─────────┐           ┌─────────┐
│ UNREAD  │─────────►│  SEEN   │──────────►│ DONE    │
│         │  View    │         │  Complete │         │
│ • Bold  │          │ • Normal│           │ • Hidden│
│ • Badge │          │ • Stays │           │ • Archived│
│ • Dot   │          │ • Visible│          │         │
└─────────┘          └─────────┘           └─────────┘
     │                    │                       │
     │                    │                       │
     └────────────────────┴───────────────────────┘
              Can "Mark as Unread" to reset
```

**Key Behaviors**:
- **Unread → Seen**: Automatic when user views the entity or inbox item
- **Seen → Completed**: Manual action by user (checkbox, swipe, button)
- **Completed items**: Hidden by default, can be shown with toggle
- **Mark as Unread**: Reset to Unread state for follow-up

### 2.3 Anti-Clutter Strategy

**Problem**: Comments and mentions can accumulate and create visual noise.

**Solution**: Progressive disclosure + smart filtering + auto-archiving

```
┌─────────────────────────────────────────────────────────────┐
│                   CLUTTER PREVENTION                         │
└─────────────────────────────────────────────────────────────┘

1. PROGRESSIVE DISCLOSURE
   • Show unresolved items by default
   • Collapse resolved items
   • "Show resolved" toggle for history

2. SMART FILTERING
   • "For me" - Only mentions/assignments for current user
   • "Unresolved" - Active items needing attention
   • "Recent" - Last 7 days
   • "All" - Complete history

3. AUTO-ARCHIVING
   • Completed items older than 30 days → archived
   • Archived items hidden from default views
   • Can be accessed via "Show archived" toggle

4. VISUAL HIERARCHY
   • Unresolved: Full visibility, bold text
   • Seen: Normal text, stays visible
   • Resolved: Collapsed, gray text
   • Archived: Hidden by default

5. CONTEXTUAL DISPLAY
   • Show relevant comments based on current view
   • Hide comments from archived entities
   • Group related comments together
```

### 2.4 Non-Annoying Reminders

**Problem**: How to remind users without being annoying?

**Solution**: Contextual, visual aging indicators (no notifications)

```
┌─────────────────────────────────────────────────────────────┐
│                   AGING INDICATORS                           │
└─────────────────────────────────────────────────────────────┘

AGE         VISUAL CUE              BEHAVIOR
────────────────────────────────────────────────────────────────
< 1 day     Normal badge            Standard blue dot
1-3 days    Slightly darker         Darker blue
3-7 days    Orange tint             Orange dot
> 7 days    Red tint                Red dot + "!" icon
> 14 days   Pulsing red             Red dot + "!!" icon

CONTEXTUAL REMINDERS:
• Show reminder when user views the related entity
• Inbox summary at top of dashboard (count only)
• No push notifications, no emails, no interruptions
• User controls when to check inbox
```

**Key Principle**: **Pull, not push**. Users check inbox when they're ready, not when the system decides.

---

## 3. Database Schema

### 3.1 Schema Overview

**7 New Tables**:
1. `todo_lists` - Task list containers
2. `todo_list_members` - Shared list access control
3. `todo_tasks` - Individual tasks
4. `todo_task_activity` - Task change history
5. `comments` - Universal comments (polymorphic)
6. `comment_mentions` - @mention tracking
7. `inbox_items` - Unified inbox for mentions + assignments

### 3.2 Table Definitions

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
  INDEX `idx_owner_id` (`owner_id`),
  INDEX `idx_is_shared` (`is_shared`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Purpose**: Container for organizing tasks into lists/projects

**Key Fields**:
- `is_shared`: Distinguishes personal vs collaborative lists
- `owner_id`: Creator of the list (has full control)

---

#### Table: `todo_list_members`

```sql
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
```

**Purpose**: Access control for shared lists

**Roles**:
- `owner`: Full control (edit, delete, manage members)
- `editor`: Can add/edit/complete tasks
- `viewer`: Read-only access

---

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
```

**Purpose**: Individual task items

**Key Fields**:
- `position`: For drag & drop ordering within list
- `assigned_to`: Single assignee (can be null for unassigned)
- `completed_by`: Track who completed the task
- `status` + `is_completed`: Redundant for flexibility (status for workflow, is_completed for simple filtering)

---

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
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Purpose**: Audit trail for task changes

**Use Cases**:
- Show "who changed what when" in task details
- Activity feed in shared lists
- Compliance and accountability

---

#### Table: `comments` (Universal/Polymorphic)

```sql
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
```

**Purpose**: Universal commenting system (can attach to any entity)

**Polymorphic Fields**:
- `commentable_type`: Entity type (e.g., 'invoice', 'batch', 'client', 'order')
- `commentable_id`: ID of the entity

**Examples**:
- Comment on invoice #123: `commentable_type='invoice'`, `commentable_id=123`
- Comment on batch #456: `commentable_type='batch'`, `commentable_id=456`
- Comment on task #789: `commentable_type='todo_task'`, `commentable_id=789`

**Resolution**:
- `is_resolved`: Mark comment thread as resolved
- Resolved comments are collapsed by default

---

#### Table: `comment_mentions`

```sql
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

**Purpose**: Track @mentions in comments

**Behavior**:
- Automatically created when parsing @mentions from comment content
- Triggers inbox item creation
- One record per mentioned user per comment

---

#### Table: `inbox_items` (Unified Inbox)

```sql
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
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_source` (`source_type`, `source_id`),
  INDEX `idx_reference` (`reference_type`, `reference_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Purpose**: Unified inbox for all actionable items

**Source Types**:
- `mention`: Created from @mention in comment
- `task_assignment`: Created when task is assigned to user
- `task_update`: Created when assigned task is updated

**Reference Fields** (Polymorphic):
- `reference_type`: Type of entity being referenced (e.g., 'invoice', 'batch')
- `reference_id`: ID of the entity

**Example**:
```
User @mentioned in comment on invoice #123:
- source_type: 'mention'
- source_id: [comment_id]
- reference_type: 'invoice'
- reference_id: 123
- title: "John mentioned you on Invoice #123"
- description: [comment content preview]
```

---

### 3.3 Schema Relationships Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   users     │◄────────│  todo_lists      │────────►│ todo_tasks  │
└─────────────┘         └──────────────────┘         └─────────────┘
      ▲                         │                            │
      │                         │                            │
      │                         ▼                            ▼
      │              ┌──────────────────┐         ┌──────────────────┐
      │              │ todo_list_       │         │ todo_task_       │
      │              │   members        │         │   activity       │
      │              └──────────────────┘         └──────────────────┘
      │
      │
      │                 ┌──────────────────┐
      └─────────────────│   comments       │
                        │  (polymorphic)   │
                        └──────────────────┘
                                │
                                ├──────────────┐
                                │              │
                                ▼              ▼
                     ┌──────────────────┐  ┌──────────────────┐
                     │ comment_mentions │  │  inbox_items     │
                     └──────────────────┘  └──────────────────┘
```

---

## 4. State Management

### 4.1 Inbox Item States

**Three States**: Unread → Seen → Completed

```typescript
type InboxItemStatus = 'unread' | 'seen' | 'completed';

interface InboxItem {
  id: number;
  userId: number;
  sourceType: 'mention' | 'task_assignment' | 'task_update';
  sourceId: number;
  referenceType: string; // e.g., 'invoice', 'batch', 'todo_task'
  referenceId: number;
  title: string;
  description: string;
  status: InboxItemStatus;
  seenAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**State Transitions**:

```typescript
// Unread → Seen (automatic on view)
function markAsSeen(inboxItemId: number) {
  update(inboxItemId, {
    status: 'seen',
    seenAt: new Date()
  });
}

// Seen → Completed (manual action)
function markAsCompleted(inboxItemId: number) {
  update(inboxItemId, {
    status: 'completed',
    completedAt: new Date()
  });
}

// Any state → Unread (reset)
function markAsUnread(inboxItemId: number) {
  update(inboxItemId, {
    status: 'unread',
    seenAt: null,
    completedAt: null
  });
}
```

### 4.2 Comment Resolution

```typescript
interface Comment {
  id: number;
  commentableType: string;
  commentableId: number;
  userId: number;
  content: string;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Resolve comment thread
function resolveComment(commentId: number, userId: number) {
  update(commentId, {
    isResolved: true,
    resolvedAt: new Date(),
    resolvedBy: userId
  });
}

// Unresolve comment thread
function unresolveComment(commentId: number) {
  update(commentId, {
    isResolved: false,
    resolvedAt: null,
    resolvedBy: null
  });
}
```

---

## 5. Visual Design

### 5.1 Design Principles

**Mobile-First**:
- Touch targets: 44px minimum
- Thumb-zone optimization
- Swipe gestures for actions
- Bottom sheets for modals
- Progressive enhancement for desktop

**Professional**:
- Clean, minimal design
- Consistent with TERP design system
- No gamification elements
- Business-focused aesthetics

**Unobtrusive**:
- Subtle visual indicators
- No intrusive notifications
- Pull-based (user-initiated)
- Contextual information

### 5.2 Visual Indicators

#### Entity Badges (Unresolved Items)

```
┌─────────────────────────────────────────────────────────────┐
│  ENTITY WITH UNRESOLVED COMMENTS/MENTIONS                    │
└─────────────────────────────────────────────────────────────┘

Desktop:
┌────────────────────────────────────────┐
│  Invoice #12345                    [3] │  ← Badge count
│  $5,000.00                          ●  │  ← Dot indicator
└────────────────────────────────────────┘

Mobile:
┌────────────────────────────────────────┐
│  Invoice #12345                        │
│  $5,000.00                         [3] │  ← Badge on right
│                                     ●  │  ← Colored dot
└────────────────────────────────────────┘

Color Coding:
• Blue dot: Unresolved comments (general)
• Orange dot: Unresolved mention for current user
• Red dot: Overdue mention (>7 days old)
```

#### Inbox Item Display

```
┌─────────────────────────────────────────────────────────────┐
│  INBOX ITEM STATES                                           │
└─────────────────────────────────────────────────────────────┘

UNREAD:
┌────────────────────────────────────────┐
│ ● John mentioned you on Invoice #123  │  ← Blue dot
│   "Can you review this pricing?"       │  ← Bold text
│   2 hours ago                          │  ← Timestamp
└────────────────────────────────────────┘

SEEN:
┌────────────────────────────────────────┐
│   John mentioned you on Invoice #123  │  ← No dot
│   "Can you review this pricing?"       │  ← Normal text
│   2 hours ago                          │  ← Timestamp
└────────────────────────────────────────┘

COMPLETED:
(Hidden by default, shown with "Show completed" toggle)
┌────────────────────────────────────────┐
│ ✓ John mentioned you on Invoice #123  │  ← Checkmark
│   "Can you review this pricing?"       │  ← Gray text
│   2 hours ago · Completed 1 hour ago   │  ← Timestamps
└────────────────────────────────────────┘
```

#### Aging Indicators

```
┌─────────────────────────────────────────────────────────────┐
│  AGING VISUAL CUES (for unresolved items)                   │
└─────────────────────────────────────────────────────────────┘

< 1 day:    ● Normal blue dot
1-3 days:   ● Darker blue
3-7 days:   ● Orange dot
> 7 days:   ● Red dot + "!" icon
> 14 days:  ● Pulsing red + "!!" icon

Example (14 days old):
┌────────────────────────────────────────┐
│ ●!! John mentioned you on Invoice #123│  ← Pulsing red
│     "Can you review this pricing?"     │  ← 14 days ago
│     14 days ago                        │
└────────────────────────────────────────┘
```

### 5.3 Mobile Gestures

```
┌─────────────────────────────────────────────────────────────┐
│  SWIPE ACTIONS (Mobile)                                      │
└─────────────────────────────────────────────────────────────┘

Swipe Right (Primary):
┌────────────────────────────────────────┐
│ ✓ │ John mentioned you on Invoice #123│  → Mark as completed
└────────────────────────────────────────┘

Swipe Left (Secondary):
┌────────────────────────────────────────┐
│ John mentioned you on Invoice #123 │ × │  → Dismiss/Archive
└────────────────────────────────────────┘

Long Press:
• Opens context menu with more options
• Mark as seen/unread
• Go to entity
• Delete
```

### 5.4 Component Layout

#### Header Inbox Button

```
Desktop:
┌────────────────────────────────────────────────────────────┐
│  TERP Logo    [Search]    [Notifications] [Inbox:3] [User] │
│                                              ↑               │
│                                         Badge count          │
└────────────────────────────────────────────────────────────┘

Mobile:
┌────────────────────────────────────────────────────────────┐
│  ☰  TERP Logo                        [Inbox:3] [User]     │
│                                          ↑                  │
│                                     Badge count             │
└────────────────────────────────────────────────────────────┘
```

#### Inbox Panel (Desktop)

```
┌────────────────────────────────────────┐
│  Inbox                            [×]  │  ← Close button
├────────────────────────────────────────┤
│  [For me] [Unresolved] [All]          │  ← Filter tabs
├────────────────────────────────────────┤
│                                        │
│  ● John mentioned you on Invoice #123 │  ← Unread item
│    "Can you review this pricing?"      │
│    2 hours ago                         │
│                                        │
│    Sarah assigned you a task           │  ← Seen item
│    "Update client contact info"        │
│    5 hours ago                         │
│                                        │
│  ● Mike mentioned you on Batch #456   │  ← Unread item
│    "Is this strain available?"         │
│    1 day ago                           │
│                                        │
├────────────────────────────────────────┤
│  [Show completed] [Mark all as seen]  │  ← Actions
└────────────────────────────────────────┘
```

#### Inbox Page (Mobile)

```
┌────────────────────────────────────────┐
│  ← Inbox                               │  ← Back button
├────────────────────────────────────────┤
│  [For me] [Unresolved] [All]          │  ← Filter tabs
├────────────────────────────────────────┤
│                                        │
│  ● John mentioned you                 │  ← Swipeable
│    Invoice #123                        │
│    "Can you review this pricing?"      │
│    2 hours ago                         │
│                                        │
│    Sarah assigned you a task           │  ← Swipeable
│    Update client contact info          │
│    5 hours ago                         │
│                                        │
│  ● Mike mentioned you                 │  ← Swipeable
│    Batch #456                          │
│    "Is this strain available?"         │
│    1 day ago                           │
│                                        │
└────────────────────────────────────────┘
```

---

## 6. Anti-Clutter Strategy

### 6.1 Progressive Disclosure

**Default View**: Show only unresolved items

```typescript
// Default filter
const defaultFilter = {
  status: ['unread', 'seen'], // Exclude 'completed'
  isResolved: false, // Only unresolved comments
  maxAge: null // No age limit
};
```

**Toggles**:
- "Show completed" - Include completed items
- "Show resolved" - Include resolved comments
- "Show archived" - Include items older than 30 days

### 6.2 Smart Filtering

**Filter Options**:

```typescript
type InboxFilter = {
  // Status filter
  status?: ('unread' | 'seen' | 'completed')[];
  
  // Scope filter
  scope?: 'for_me' | 'all'; // 'for_me' = only items for current user
  
  // Resolution filter
  isResolved?: boolean;
  
  // Time filter
  timeRange?: 'today' | 'week' | 'month' | 'all';
  
  // Source filter
  sourceType?: ('mention' | 'task_assignment' | 'task_update')[];
};
```

**Preset Filters**:
1. **For Me** (default): Unresolved items for current user
2. **Unresolved**: All unresolved items (including others' mentions)
3. **Recent**: Last 7 days
4. **All**: Complete history

### 6.3 Auto-Archiving

**Rules**:
- Completed items older than 30 days → archived
- Archived items hidden from default views
- Can be accessed via "Show archived" toggle
- Archived items still searchable

**Implementation**:

```typescript
// Background job (runs daily)
async function archiveOldCompletedItems() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  await db.update(inbox_items)
    .set({ is_archived: true })
    .where(
      and(
        eq(inbox_items.status, 'completed'),
        lt(inbox_items.completed_at, thirtyDaysAgo)
      )
    );
}
```

### 6.4 Contextual Display

**Show relevant comments based on context**:

```typescript
// When viewing an entity (e.g., Invoice #123)
function getEntityComments(entityType: string, entityId: number) {
  return db.select()
    .from(comments)
    .where(
      and(
        eq(comments.commentable_type, entityType),
        eq(comments.commentable_id, entityId)
      )
    )
    .orderBy(desc(comments.created_at));
}

// Default: Show only unresolved
// Toggle: Show all (including resolved)
```

### 6.5 Bulk Actions

**Available Actions**:
- "Mark all as seen" - Mark all unread items as seen
- "Complete all" - Mark all seen items as completed
- "Archive selected" - Archive multiple items at once
- "Resolve all comments" - Resolve all comments on an entity

---

## 7. Backend Architecture

### 7.1 tRPC Router Structure

**Five Main Routers**:

1. `/server/routers/todoLists.ts` - List management
2. `/server/routers/todoTasks.ts` - Task management
3. `/server/routers/comments.ts` - Universal comments
4. `/server/routers/inbox.ts` - Inbox management
5. `/server/routers/todoActivity.ts` - Activity logging

### 7.2 Router: `todoLists.ts`

```typescript
export const todoListsRouter = router({
  // Get all lists for current user (personal + shared)
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await todoListsDb.getUserLists(ctx.userId);
    }),

  // Get list by ID with tasks
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Check permission
      await todoPermissions.canViewList(ctx.userId, input.id);
      return await todoListsDb.getListById(input.id);
    }),

  // Create new list
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      isShared: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      return await todoListsDb.createList(ctx.userId, input);
    }),

  // Update list
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canEditList(ctx.userId, input.id);
      return await todoListsDb.updateList(input.id, input);
    }),

  // Delete list
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canDeleteList(ctx.userId, input.id);
      return await todoListsDb.deleteList(input.id);
    }),

  // Add member to shared list
  addMember: protectedProcedure
    .input(z.object({
      listId: z.number(),
      userId: z.number(),
      role: z.enum(['owner', 'editor', 'viewer']).default('editor'),
    }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canEditList(ctx.userId, input.listId);
      return await todoListsDb.addListMember(
        input.listId,
        input.userId,
        input.role,
        ctx.userId
      );
    }),

  // Remove member from shared list
  removeMember: protectedProcedure
    .input(z.object({
      listId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canEditList(ctx.userId, input.listId);
      return await todoListsDb.removeListMember(input.listId, input.userId);
    }),

  // Get list members
  getMembers: protectedProcedure
    .input(z.object({ listId: z.number() }))
    .query(async ({ input, ctx }) => {
      await todoPermissions.canViewList(ctx.userId, input.listId);
      return await todoListsDb.getListMembers(input.listId);
    }),
});
```

### 7.3 Router: `todoTasks.ts`

```typescript
export const todoTasksRouter = router({
  // Get tasks for a list
  list: protectedProcedure
    .input(z.object({
      listId: z.number(),
      status: z.enum(['todo', 'in_progress', 'done']).optional(),
      assignedTo: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      await todoPermissions.canViewList(ctx.userId, input.listId);
      return await todoTasksDb.getListTasks(input.listId, input);
    }),

  // Get task by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await todoPermissions.canViewTask(ctx.userId, input.id);
      return await todoTasksDb.getTaskById(input.id);
    }),

  // Create task
  create: protectedProcedure
    .input(z.object({
      listId: z.number(),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      dueDate: z.date().optional(),
      assignedTo: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canEditList(ctx.userId, input.listId);
      
      const task = await todoTasksDb.createTask(ctx.userId, input);
      
      // Create inbox item if assigned
      if (input.assignedTo) {
        await inboxDb.createInboxItem({
          userId: input.assignedTo,
          sourceType: 'task_assignment',
          sourceId: task.id,
          referenceType: 'todo_task',
          referenceId: task.id,
          title: `Task assigned: ${input.title}`,
          description: input.description,
        });
      }
      
      return task;
    }),

  // Update task
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(500).optional(),
      description: z.string().optional(),
      status: z.enum(['todo', 'in_progress', 'done']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      dueDate: z.date().optional(),
      assignedTo: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canEditTask(ctx.userId, input.id);
      
      const oldTask = await todoTasksDb.getTaskById(input.id);
      const updatedTask = await todoTasksDb.updateTask(input.id, input);
      
      // Log activity
      await todoActivityDb.logActivity(input.id, ctx.userId, 'updated', {
        changes: input,
      });
      
      // Create inbox item if assignee changed
      if (input.assignedTo && input.assignedTo !== oldTask.assignedTo) {
        await inboxDb.createInboxItem({
          userId: input.assignedTo,
          sourceType: 'task_assignment',
          sourceId: input.id,
          referenceType: 'todo_task',
          referenceId: input.id,
          title: `Task assigned: ${updatedTask.title}`,
          description: updatedTask.description,
        });
      }
      
      return updatedTask;
    }),

  // Complete task
  complete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canEditTask(ctx.userId, input.id);
      
      const task = await todoTasksDb.updateTask(input.id, {
        status: 'done',
        isCompleted: true,
        completedAt: new Date(),
        completedBy: ctx.userId,
      });
      
      // Log activity
      await todoActivityDb.logActivity(input.id, ctx.userId, 'completed', {});
      
      return task;
    }),

  // Delete task
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canEditTask(ctx.userId, input.id);
      return await todoTasksDb.deleteTask(input.id);
    }),

  // Reorder tasks
  reorder: protectedProcedure
    .input(z.object({
      listId: z.number(),
      taskIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      await todoPermissions.canEditList(ctx.userId, input.listId);
      return await todoTasksDb.reorderTasks(input.listId, input.taskIds);
    }),
});
```

### 7.4 Router: `comments.ts`

```typescript
export const commentsRouter = router({
  // Get comments for an entity
  list: protectedProcedure
    .input(z.object({
      commentableType: z.string(),
      commentableId: z.number(),
      includeResolved: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      return await commentsDb.getEntityComments(
        input.commentableType,
        input.commentableId,
        input.includeResolved
      );
    }),

  // Create comment (with @mention parsing)
  create: protectedProcedure
    .input(z.object({
      commentableType: z.string(),
      commentableId: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create comment
      const comment = await commentsDb.createComment(ctx.userId, input);
      
      // Parse @mentions from content
      const mentions = parseMentions(input.content);
      
      // Create mention records and inbox items
      for (const mentionedUserId of mentions) {
        // Create mention record
        await commentsDb.createMention(comment.id, mentionedUserId, ctx.userId);
        
        // Create inbox item
        await inboxDb.createInboxItem({
          userId: mentionedUserId,
          sourceType: 'mention',
          sourceId: comment.id,
          referenceType: input.commentableType,
          referenceId: input.commentableId,
          title: `${ctx.user.name} mentioned you on ${input.commentableType} #${input.commentableId}`,
          description: truncate(input.content, 200),
        });
      }
      
      return comment;
    }),

  // Update comment
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check ownership
      const comment = await commentsDb.getCommentById(input.id);
      if (comment.userId !== ctx.userId) {
        throw new Error('Unauthorized');
      }
      
      return await commentsDb.updateComment(input.id, input.content);
    }),

  // Resolve comment
  resolve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await commentsDb.resolveComment(input.id, ctx.userId);
    }),

  // Unresolve comment
  unresolve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await commentsDb.unresolveComment(input.id);
    }),

  // Delete comment
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Check ownership
      const comment = await commentsDb.getCommentById(input.id);
      if (comment.userId !== ctx.userId) {
        throw new Error('Unauthorized');
      }
      
      return await commentsDb.deleteComment(input.id);
    }),

  // Get unresolved count for entity
  getUnresolvedCount: protectedProcedure
    .input(z.object({
      commentableType: z.string(),
      commentableId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      return await commentsDb.getUnresolvedCount(
        input.commentableType,
        input.commentableId
      );
    }),

  // Get entities with unresolved comments for current user
  getEntitiesWithUnresolvedMentions: protectedProcedure
    .query(async ({ ctx }) => {
      return await commentsDb.getEntitiesWithUnresolvedMentions(ctx.userId);
    }),
});

// Helper function to parse @mentions
function parseMentions(content: string): number[] {
  const mentionRegex = /@\[([^\]]+)\]\((\d+)\)/g;
  const mentions: number[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const userId = parseInt(match[2], 10);
    if (!mentions.includes(userId)) {
      mentions.push(userId);
    }
  }
  
  return mentions;
}
```

### 7.5 Router: `inbox.ts`

```typescript
export const inboxRouter = router({
  // Get inbox items for current user
  list: protectedProcedure
    .input(z.object({
      status: z.array(z.enum(['unread', 'seen', 'completed'])).optional(),
      sourceType: z.array(z.enum(['mention', 'task_assignment', 'task_update'])).optional(),
      limit: z.number().default(50),
      cursor: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return await inboxDb.getUserInboxItems(ctx.userId, input);
    }),

  // Get unread count
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      return await inboxDb.getUnreadCount(ctx.userId);
    }),

  // Mark as seen
  markAsSeen: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await inboxDb.markAsSeen(input.id, ctx.userId);
    }),

  // Mark as completed
  markAsCompleted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await inboxDb.markAsCompleted(input.id, ctx.userId);
    }),

  // Mark as unread
  markAsUnread: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await inboxDb.markAsUnread(input.id, ctx.userId);
    }),

  // Mark all as seen
  markAllAsSeen: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await inboxDb.markAllAsSeen(ctx.userId);
    }),

  // Bulk complete
  bulkComplete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      return await inboxDb.bulkComplete(input.ids, ctx.userId);
    }),

  // Delete inbox item
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await inboxDb.deleteInboxItem(input.id, ctx.userId);
    }),
});
```

### 7.6 Service: `todoPermissions.ts`

```typescript
export async function canViewList(userId: number, listId: number): Promise<boolean> {
  const list = await todoListsDb.getListById(listId);
  
  // Owner can always view
  if (list.ownerId === userId) return true;
  
  // Check if user is a member
  const member = await todoListsDb.getListMember(listId, userId);
  if (member) return true;
  
  throw new Error('Unauthorized: Cannot view this list');
}

export async function canEditList(userId: number, listId: number): Promise<boolean> {
  const list = await todoListsDb.getListById(listId);
  
  // Owner can always edit
  if (list.ownerId === userId) return true;
  
  // Check if user is an editor
  const member = await todoListsDb.getListMember(listId, userId);
  if (member && member.role === 'editor') return true;
  
  throw new Error('Unauthorized: Cannot edit this list');
}

export async function canDeleteList(userId: number, listId: number): Promise<boolean> {
  const list = await todoListsDb.getListById(listId);
  
  // Only owner can delete
  if (list.ownerId === userId) return true;
  
  throw new Error('Unauthorized: Only owner can delete this list');
}

export async function canViewTask(userId: number, taskId: number): Promise<boolean> {
  const task = await todoTasksDb.getTaskById(taskId);
  return await canViewList(userId, task.listId);
}

export async function canEditTask(userId: number, taskId: number): Promise<boolean> {
  const task = await todoTasksDb.getTaskById(taskId);
  return await canEditList(userId, task.listId);
}
```

---

## 8. Frontend Architecture

### 8.1 Component Structure

```
/client/src/components/
├── todo/
│   ├── TodoListSelector.tsx       # Dropdown to select list
│   ├── TodoTaskItem.tsx           # Individual task display
│   ├── TodoTaskList.tsx           # List of tasks
│   ├── QuickAddTask.tsx           # Quick add modal/inline
│   ├── ShareListModal.tsx         # Share list with users
│   ├── TaskDetailDrawer.tsx       # Task details sidebar
│   └── TodoInbox.tsx              # Inbox panel/page
├── comments/
│   ├── CommentList.tsx            # List of comments
│   ├── CommentItem.tsx            # Individual comment
│   ├── CommentForm.tsx            # Add/edit comment
│   ├── MentionInput.tsx           # @mention autocomplete
│   └── CommentBadge.tsx           # Unresolved count badge
└── inbox/
    ├── InboxPanel.tsx             # Desktop inbox panel
    ├── InboxPage.tsx              # Mobile inbox page
    ├── InboxItem.tsx              # Individual inbox item
    └── InboxBadge.tsx             # Unread count badge
```

### 8.2 Key Components

#### Component: `TodoInbox.tsx`

```typescript
interface InboxItem {
  id: number;
  sourceType: 'mention' | 'task_assignment' | 'task_update';
  title: string;
  description: string;
  status: 'unread' | 'seen' | 'completed';
  createdAt: Date;
  referenceType: string;
  referenceId: number;
}

export function TodoInbox() {
  const [filter, setFilter] = useState<'for_me' | 'unresolved' | 'all'>('for_me');
  const [showCompleted, setShowCompleted] = useState(false);
  
  const { data: items, isLoading } = trpc.inbox.list.useQuery({
    status: showCompleted ? undefined : ['unread', 'seen'],
  });
  
  const markAsSeenMutation = trpc.inbox.markAsSeen.useMutation();
  const markAsCompletedMutation = trpc.inbox.markAsCompleted.useMutation();
  
  const handleItemClick = (item: InboxItem) => {
    // Mark as seen
    markAsSeenMutation.mutate({ id: item.id });
    
    // Navigate to entity
    navigateToEntity(item.referenceType, item.referenceId);
  };
  
  const handleComplete = (itemId: number) => {
    markAsCompletedMutation.mutate({ id: itemId });
  };
  
  return (
    <div className="inbox-panel">
      <div className="inbox-header">
        <h2>Inbox</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="for_me">For me</TabsTrigger>
          <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="inbox-items">
        {items?.map((item) => (
          <InboxItem
            key={item.id}
            item={item}
            onClick={() => handleItemClick(item)}
            onComplete={() => handleComplete(item.id)}
          />
        ))}
      </div>
      
      <div className="inbox-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted ? 'Hide' : 'Show'} completed
        </Button>
        <Button variant="ghost" size="sm">
          Mark all as seen
        </Button>
      </div>
    </div>
  );
}
```

#### Component: `CommentList.tsx`

```typescript
interface Comment {
  id: number;
  userId: number;
  userName: string;
  content: string;
  isResolved: boolean;
  createdAt: Date;
}

interface CommentListProps {
  commentableType: string;
  commentableId: number;
}

export function CommentList({ commentableType, commentableId }: CommentListProps) {
  const [showResolved, setShowResolved] = useState(false);
  
  const { data: comments } = trpc.comments.list.useQuery({
    commentableType,
    commentableId,
    includeResolved: showResolved,
  });
  
  const createMutation = trpc.comments.create.useMutation();
  const resolveMutation = trpc.comments.resolve.useMutation();
  
  const handleSubmit = (content: string) => {
    createMutation.mutate({
      commentableType,
      commentableId,
      content,
    });
  };
  
  const handleResolve = (commentId: number) => {
    resolveMutation.mutate({ id: commentId });
  };
  
  return (
    <div className="comment-list">
      <div className="comment-header">
        <h3>Comments</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowResolved(!showResolved)}
        >
          {showResolved ? 'Hide' : 'Show'} resolved
        </Button>
      </div>
      
      <div className="comments">
        {comments?.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onResolve={() => handleResolve(comment.id)}
          />
        ))}
      </div>
      
      <CommentForm onSubmit={handleSubmit} />
    </div>
  );
}
```

#### Component: `MentionInput.tsx`

```typescript
export function MentionInput({ value, onChange }: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  const { data: users } = trpc.users.search.useQuery(
    { query: mentionQuery },
    { enabled: showSuggestions }
  );
  
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    
    // Detect @ symbol
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const query = textBeforeCursor.slice(lastAtSymbol + 1);
      if (!query.includes(' ')) {
        setMentionQuery(query);
        setShowSuggestions(true);
        return;
      }
    }
    
    setShowSuggestions(false);
  };
  
  const handleSelectUser = (user: User) => {
    // Insert mention in format: @[Name](userId)
    const mention = `@[${user.name}](${user.id})`;
    // Replace @query with mention
    // ... implementation
    setShowSuggestions(false);
  };
  
  return (
    <div className="mention-input">
      <Textarea
        value={value}
        onChange={handleInput}
        placeholder="Add a comment... Use @ to mention someone"
      />
      
      {showSuggestions && (
        <div className="mention-suggestions">
          {users?.map((user) => (
            <div
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="mention-suggestion"
            >
              <Avatar src={user.avatar} />
              <span>{user.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Component: `CommentBadge.tsx`

```typescript
interface CommentBadgeProps {
  commentableType: string;
  commentableId: number;
}

export function CommentBadge({ commentableType, commentableId }: CommentBadgeProps) {
  const { data: count } = trpc.comments.getUnresolvedCount.useQuery({
    commentableType,
    commentableId,
  });
  
  if (!count || count === 0) return null;
  
  return (
    <Badge variant="secondary" className="comment-badge">
      {count}
    </Badge>
  );
}
```

### 8.3 Mobile-First Patterns

**Touch Targets**:
```css
/* Minimum 44px for touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

**Swipe Gestures**:
```typescript
// Using react-swipeable or similar
const handlers = useSwipeable({
  onSwipedRight: () => handleComplete(item.id),
  onSwipedLeft: () => handleDismiss(item.id),
  preventDefaultTouchmoveEvent: true,
  trackMouse: true,
});

return <div {...handlers}>{/* Item content */}</div>;
```

**Bottom Sheets** (Mobile modals):
```typescript
// Use shadcn/ui Drawer for mobile
import { Drawer, DrawerContent } from '@/components/ui/drawer';

export function QuickAddTask() {
  const isMobile = useMobile();
  
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          {/* Task form */}
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Task form */}
    </Dialog>
  );
}
```

---

## 9. User Flows

### 9.1 Quick Add Task Flow

```
1. User presses Ctrl+Shift+T (or clicks + button)
2. Quick add modal opens with autofocus on title field
3. User types task title
4. (Optional) User selects list, priority, due date, assignee
5. User presses Enter (or clicks Save)
6. Task is created and added to list
7. If assigned, inbox item is created for assignee
8. Modal closes
```

### 9.2 @Mention Flow

```
1. User views an entity (e.g., Invoice #123)
2. User clicks "Add comment"
3. User types comment and includes @mention
   - Types "@" to trigger user search
   - Selects user from dropdown
   - Mention is inserted as @[Name](userId)
4. User submits comment
5. Comment is created and visible to all users
6. Inbox item is created for mentioned user
7. Mentioned user sees unread badge on inbox
8. Mentioned user clicks inbox and sees mention
9. Mentioned user clicks mention to view entity
10. Inbox item is marked as "seen" automatically
11. User completes action and marks as "completed"
```

### 9.3 Inbox Management Flow

```
1. User sees unread count badge on inbox button
2. User clicks inbox button
3. Inbox panel opens with "For me" filter active
4. User sees list of unread and seen items
5. User clicks an item to view entity
   - Item is automatically marked as "seen"
   - User is navigated to entity
6. User completes action on entity
7. User returns to inbox
8. User marks item as "completed" (swipe or checkbox)
9. Item is hidden from default view
10. User can toggle "Show completed" to see history
```

### 9.4 Comment Resolution Flow

```
1. User views entity with comments
2. User sees unresolved comments by default
3. User reads comment thread
4. User takes action based on comment
5. User clicks "Resolve" on comment
6. Comment is marked as resolved
7. Comment is collapsed/grayed out
8. Unresolved count badge decreases
9. User can toggle "Show resolved" to see history
```

---

## 10. Implementation Roadmap

### Phase 1: Database & Backend (Week 1)

**Tasks**:
1. ✅ Create database migration files
   - `0022_add_todo_lists.sql`
   - `0023_add_comments_system.sql`
   - `0024_add_inbox_system.sql`
2. ✅ Update Drizzle schema with new tables
3. ✅ Implement database access layer
   - `todoListsDb.ts`
   - `todoTasksDb.ts`
   - `commentsDb.ts`
   - `inboxDb.ts`
   - `todoActivityDb.ts`
4. ✅ Create tRPC routers
   - `todoLists.ts`
   - `todoTasks.ts`
   - `comments.ts`
   - `inbox.ts`
   - `todoActivity.ts`
5. ✅ Implement permission service
   - `todoPermissions.ts`
6. ✅ Add @mention parsing logic
7. ✅ Write tests for critical paths

**Deliverables**:
- Migration SQL files
- Updated schema
- Complete backend API
- Permission system
- Tests

**Success Criteria**:
- Zero TypeScript errors
- All tRPC endpoints functional
- Permission checks working
- Tests passing

---

### Phase 2: Frontend Components (Week 2)

**Tasks**:
1. ✅ Create base UI components
   - `TodoListSelector`
   - `TodoTaskItem`
   - `TodoTaskList`
   - `QuickAddTask`
   - `ShareListModal`
   - `TaskDetailDrawer`
2. ✅ Create comment components
   - `CommentList`
   - `CommentItem`
   - `CommentForm`
   - `MentionInput`
   - `CommentBadge`
3. ✅ Create inbox components
   - `InboxPanel` (desktop)
   - `InboxPage` (mobile)
   - `InboxItem`
   - `InboxBadge`
4. ✅ Implement state management with TanStack Query
5. ✅ Add keyboard shortcuts (Ctrl+Shift+T)
6. ✅ Implement drag & drop for task reordering
7. ✅ Add swipe gestures for mobile
8. ✅ Implement responsive layouts

**Deliverables**:
- Complete component library
- Mobile-first responsive design
- Keyboard shortcuts
- Swipe gestures
- State management

**Success Criteria**:
- All components render correctly
- Mobile and desktop layouts work
- Interactions are smooth
- No visual bugs

---

### Phase 3: Integration & Polish (Week 3)

**Tasks**:
1. ✅ Replace scratchpad button with to-do list button
2. ✅ Add comment widgets to all entities
   - Invoices
   - Batches
   - Clients
   - Orders
   - Bills
   - Quotes
3. ✅ Add comment badges to entity lists
4. ✅ Implement inbox badge in header
5. ✅ Add loading states and error handling
6. ✅ Implement optimistic updates
7. ✅ Add empty states and onboarding
8. ✅ Performance optimization
9. ✅ Accessibility audit (ARIA labels, keyboard nav)
10. ✅ Cross-browser testing

**Deliverables**:
- Integrated system across TERP
- Comment widgets on all entities
- Visual indicators working
- Polished UX
- Accessibility compliant

**Success Criteria**:
- Comments work on all entities
- Inbox updates in real-time
- Visual indicators accurate
- No performance issues
- Accessible to all users

---

### Phase 4: Testing & Deployment (Week 4)

**Tasks**:
1. ✅ Manual testing of all user flows
2. ✅ Test shared list collaboration
3. ✅ Test @mention and inbox creation
4. ✅ Test permission boundaries
5. ✅ Test mobile gestures and responsive design
6. ✅ Verify zero TypeScript errors
7. ✅ Update documentation
   - User guide
   - API documentation
   - Developer notes
8. ✅ Deploy to production
9. ✅ Monitor for issues
10. ✅ Collect user feedback

**Deliverables**:
- Fully tested system
- Updated documentation
- Production deployment
- Monitoring in place

**Success Criteria**:
- All user flows work correctly
- No critical bugs
- Documentation complete
- Production stable
- Users can use the system effectively

---

## 11. Success Metrics

### User Adoption
- % of users who create at least one to-do list
- % of users who add at least one comment
- % of users who use @mentions
- Average tasks per user per week
- Average comments per entity

### Engagement
- Daily active users of to-do feature
- Daily active users of comments
- Inbox check frequency
- Task completion rate
- Comment resolution rate

### Collaboration
- % of lists that are shared
- Average members per shared list
- @mention usage frequency
- Response time to mentions

### System Health
- Time to create task (< 500ms)
- Time to load inbox (< 1s)
- Time to load comments (< 500ms)
- Zero errors in production
- No performance degradation

---

## 12. Future Enhancements

### Phase 2 Features (Post-MVP)
1. **Subtasks** - Break down complex tasks
2. **Rich text comments** - Formatting, links, images
3. **File attachments** - Attach files to comments
4. **Comment threads** - Nested replies
5. **Reminders** - Email/push notifications (opt-in)
6. **Recurring tasks** - Automate repetitive tasks
7. **Task templates** - Reuse common task structures
8. **Custom fields** - Add custom metadata to tasks
9. **Integrations** - Calendar, email, Slack, etc.

### Advanced Features
1. **Task dependencies** - Block tasks until others complete
2. **Time tracking** - Track time spent on tasks
3. **Automation** - Auto-assign, auto-complete based on rules
4. **Analytics** - Productivity insights and reports
5. **Mobile app** - Native iOS/Android apps
6. **Real-time collaboration** - See who's viewing/editing
7. **Version history** - Track changes over time
8. **Export/Import** - Backup and restore data

---

## 13. Conclusion

This comprehensive system design provides a **production-ready** architecture for a powerful yet simple collaboration system in TERP. Key strengths:

✅ **Unobtrusive** - Informs without interrupting  
✅ **Mobile-First** - Touch-optimized, responsive  
✅ **Professional** - Clean, business-focused  
✅ **Powerful** - Full functionality, zero complexity  
✅ **Scalable** - Proper schema, indexed queries  
✅ **Flexible** - Easy to extend with future features  

**No gamification, no nonsense** - just clean, professional tools that help users work effectively.

**Next Steps**: Proceed with Phase 1 implementation following TERP development protocols (The Bible).

---

**Document Version**: 2.0  
**Last Updated**: November 3, 2025  
**Status**: Ready for Implementation
