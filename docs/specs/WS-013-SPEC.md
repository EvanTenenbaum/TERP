# Specification: WS-013 - Simple Task Management

**Status:** Approved  
**Priority:** MEDIUM  
**Estimate:** 12h  
**Module:** Tasks (New Module)  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The business needs to track non-inventory tasks such as maintenance, SOPs, and team meeting topics. Currently, these are tracked outside the system (spreadsheets, notes), leading to missed tasks and lack of accountability. A simple, assignable to-do list within TERP would centralize task management.

## 2. User Stories

1. **As a manager**, I want to create and assign tasks to team members, so that work is tracked and accountable.

2. **As a staff member**, I want to see my assigned tasks, so that I know what needs to be done.

3. **As a manager**, I want to tag tasks as "SOP" or "Team Topic", so that I can generate meeting agendas.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Create task with title and optional description | Must Have |
| FR-02 | Assign task to user | Must Have |
| FR-03 | Set due date | Must Have |
| FR-04 | Mark task as complete | Must Have |
| FR-05 | View my tasks (assigned to me) | Must Have |
| FR-06 | View all tasks (manager view) | Must Have |
| FR-07 | Task tags/categories (SOP, Team Topic, Maintenance) | Should Have |
| FR-08 | Task comments/notes | Should Have |
| FR-09 | Recurring tasks | Nice to Have |
| FR-10 | Task notifications/reminders | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model

```sql
CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED') DEFAULT 'TODO',
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  assigned_to INT REFERENCES users(id),
  due_date DATE,
  completed_at TIMESTAMP,
  completed_by INT REFERENCES users(id),
  tags JSON, -- ['SOP', 'TEAM_TOPIC', 'MAINTENANCE']
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_assigned (assigned_to, status),
  INDEX idx_due_date (due_date, status)
);

CREATE TABLE task_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL REFERENCES tasks(id),
  comment TEXT NOT NULL,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 API Contracts

```typescript
tasks.create = adminProcedure
  .input(z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    assignedTo: z.number().optional(),
    dueDate: z.date().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    tags: z.array(z.string()).optional()
  }))
  .output(z.object({ taskId: z.number() }))
  .mutation(async ({ input, ctx }) => {});

tasks.list = adminProcedure
  .input(z.object({
    assignedTo: z.number().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ALL']).default('ALL'),
    tag: z.string().optional()
  }))
  .output(z.array(z.object({
    id: z.number(),
    title: z.string(),
    status: z.string(),
    priority: z.string(),
    assignedTo: z.string().nullable(),
    dueDate: z.date().nullable(),
    tags: z.array(z.string()),
    isOverdue: z.boolean()
  })))
  .query(async ({ input }) => {});

tasks.complete = adminProcedure
  .input(z.object({ taskId: z.number() }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input, ctx }) => {});
```

## 5. UI/UX Specification

### 5.1 Wireframe: Task List

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Tasks                                      [+ New Task] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: [My Tasks ▼] [All Status ▼] [All Tags ▼]          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☐ Change HVAC filters          Due: Jan 5  @John    │   │
│  │   🏷️ MAINTENANCE                                    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ☐ Update inventory SOP         Due: Jan 3  @Jane    │   │
│  │   🏷️ SOP                                            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ☐ Discuss new pricing strategy  Due: Jan 2 @Team    │   │
│  │   🏷️ TEAM_TOPIC                         🔴 OVERDUE  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria

- [ ] Tasks can be created with just a title
- [ ] Tasks can be assigned to users
- [ ] Tasks can be marked complete
- [ ] Overdue tasks highlighted
- [ ] Filter by assignee, status, tag
- [ ] Tags support SOP, Team Topic, Maintenance

## 6. Testing Requirements

- [ ] Task CRUD operations
- [ ] Assignment and filtering
- [ ] Overdue calculation
- [ ] Tag filtering

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
