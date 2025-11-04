# TERP To-Do Lists + Universal Comments System - User Guide

## Overview

TERP now includes a comprehensive task management and collaboration system with three major features:

1. **To-Do Lists** - Create, share, and manage tasks
2. **Universal Comments** - Comment on any entity in TERP
3. **Inbox** - Centralized notification system

---

## 📋 To-Do Lists

### Creating a List

1. Navigate to **To-Do Lists** in the sidebar
2. Click **"New List"**
3. Enter a name and optional description
4. Click **"Create List"**

### Managing Tasks

**Add a Task:**
- Click **"Add Task"** in any list
- Enter task title and optional description
- Set priority (Low, Medium, High)
- Assign to a team member (optional)
- Set due date (optional)
- Click **"Create Task"**

**Quick Add (Keyboard Shortcut):**
- Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac) anywhere in TERP
- Enter task title
- Select list
- Press **"Add Task"**

**Complete a Task:**
- Click the checkbox next to any task
- Completed tasks move to the bottom with strikethrough

**Edit a Task:**
- Click on any task to open details
- Update title, description, priority, assignee, or due date
- Changes save automatically

**Delete a Task:**
- Open task details
- Click **"Delete Task"**
- Confirm deletion

### Sharing Lists

1. Open any list
2. Click **"Share List"**
3. Select team members to share with
4. Choose their role:
   - **Viewer** - Can see tasks only
   - **Editor** - Can add and edit tasks
   - **Admin** - Full control including sharing
5. Click **"Share"**

### Task Activity

Every task tracks:
- Creation date and creator
- Status changes (todo → in progress → completed)
- Assignments and reassignments
- Priority changes
- Due date changes
- Comments and @mentions

View activity by opening any task and scrolling to the **Activity** section.

---

## 💬 Universal Comments

### Where You Can Comment

Comments are available on:
- **Dashboard** - Discuss overall business metrics
- **Clients** - Notes about specific clients
- **Inventory Batches** - Track batch-specific information
- **Tasks** - Collaborate on to-do items

More entities will support comments in future updates.

### Adding a Comment

1. Scroll to the **Comments** section on any supported page
2. Type your comment in the text box
3. Use **@username** to mention team members
4. Click **"Post Comment"**

### @Mentions

When you mention someone with `@username`:
- They receive an inbox notification
- The mention is highlighted in the comment
- They can click the notification to jump directly to the comment

### Editing Comments

1. Click the **⋮** menu on your comment
2. Select **"Edit"**
3. Make changes
4. Click **"Save"**

### Deleting Comments

1. Click the **⋮** menu on your comment
2. Select **"Delete"**
3. Confirm deletion

---

## 📬 Inbox

### Accessing Your Inbox

**From Header:**
- Click the **Inbox** icon in the top navigation
- Unread count badge shows new notifications

**From Dashboard:**
- View recent notifications in the **Inbox Widget**
- Click **"View All"** to see full inbox

### Notification Types

- **📋 Task Assigned** - Someone assigned you a task
- **✅ Task Completed** - A task you created was completed
- **💬 Comment Mention** - Someone mentioned you in a comment
- **↩️ Comment Reply** - Someone replied to your comment

### Managing Notifications

**Mark as Read:**
- Click any notification to mark it as seen
- Unread notifications have a blue dot indicator

**Navigate to Source:**
- Click any notification to jump to the related task, comment, or entity

**Clear All:**
- Click **"Mark All as Read"** to clear all notifications

---

## 🎯 Best Practices

### For To-Do Lists

1. **Use Descriptive Names** - Name lists by project, team, or purpose
2. **Set Priorities** - Use High for urgent, Medium for important, Low for nice-to-have
3. **Assign Owners** - Every task should have a clear owner
4. **Set Due Dates** - Helps with planning and accountability
5. **Share Appropriately** - Give Viewer access to stakeholders, Editor to team members

### For Comments

1. **Be Specific** - Reference specific data points or decisions
2. **Use @Mentions** - Tag people who need to see the comment
3. **Keep It Professional** - Comments are visible to all team members with access
4. **Update vs. Comment** - Use comments for discussion, not for changing data

### For Inbox

1. **Check Daily** - Review inbox at start of day
2. **Act on Notifications** - Click through and respond to mentions/assignments
3. **Clear Regularly** - Mark notifications as read to keep inbox clean

---

## 🔧 Troubleshooting

**Q: I can't see a list that was shared with me**
- A: Check your **To-Do Lists** page - shared lists appear in the main list view

**Q: My @mention didn't create a notification**
- A: Ensure you typed `@username` correctly and the user exists in the system

**Q: I deleted a task by accident**
- A: Currently, deleted tasks cannot be recovered. Contact your admin for help.

**Q: Comments aren't showing on a page**
- A: Not all pages support comments yet. Check the list of supported entities above.

**Q: Keyboard shortcut isn't working**
- A: Ensure you're not typing in an input field. The shortcut works globally except in text inputs.

---

## 🚀 Coming Soon

Future enhancements planned:
- Task templates for recurring workflows
- Bulk task operations
- Advanced filtering and search
- Email notifications for mentions
- Comments on more entity types (invoices, orders, etc.)
- Task dependencies and subtasks
- Calendar view for tasks

---

## 📞 Support

For questions or issues:
1. Check this user guide first
2. Ask your team admin
3. Submit feedback via the Help menu

Last updated: Implementation of TERP-INIT-006
