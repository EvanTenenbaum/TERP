/**
 * Lists and Tasks Generator
 *
 * Generates realistic todo lists and tasks:
 * - Todo lists (personal, shared, project-based)
 * - Todo tasks with status, priority, due dates
 * - Task activity (status changes, comments)
 * - List members (for shared lists)
 *
 * Generates 50+ lists with 200+ tasks
 */

import { CONFIG } from "./config.js";
import { faker } from "@faker-js/faker";

export interface TodoListData {
  id?: number;
  name: string;
  description?: string;
  ownerId: number;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoTaskData {
  id?: number;
  listId?: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: Date;
  assignedTo?: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoTaskActivityData {
  id?: number;
  taskId?: number;
  userId: number;
  action: string;
  notes?: string;
  createdAt: Date;
}

export interface TodoListMemberData {
  id?: number;
  listId?: number;
  userId: number;
  role: string;
  createdAt: Date;
}

export interface ListsTasksCascadeResult {
  lists: TodoListData[];
  tasks: TodoTaskData[];
  taskActivity: TodoTaskActivityData[];
  listMembers: TodoListMemberData[];
}

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TASK_ACTIONS = [
  "CREATED",
  "STATUS_CHANGED",
  "ASSIGNED",
  "COMMENTED",
  "DUE_DATE_CHANGED",
  "COMPLETED",
];

const LIST_NAMES = [
  "Client Follow-ups",
  "Inventory Management",
  "Weekly Tasks",
  "Order Processing",
  "Vendor Communications",
  "Product Development",
  "Quality Control",
  "Marketing Initiatives",
  "System Improvements",
  "Team Coordination",
];

const TASK_TEMPLATES = [
  "Follow up with client about order",
  "Review inventory levels",
  "Process pending invoices",
  "Update product descriptions",
  "Schedule vendor meeting",
  "Prepare monthly report",
  "Review quality metrics",
  "Update pricing for new products",
  "Coordinate delivery schedule",
  "Respond to customer inquiry",
];

/**
 * Generate todo lists and tasks
 */
export function generateListsTasks(
  startDate: Date = CONFIG.startDate,
  endDate: Date = CONFIG.endDate
): ListsTasksCascadeResult {
  const lists: TodoListData[] = [];
  const tasks: TodoTaskData[] = [];
  const taskActivity: TodoTaskActivityData[] = [];
  const listMembers: TodoListMemberData[] = [];

  // Generate 50-70 lists
  const listCount = 50 + Math.floor(Math.random() * 20);

  for (let i = 0; i < listCount; i++) {
    const listDate = new Date(
      startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime())
    );

    const isShared = Math.random() < 0.3; // 30% shared lists

    const list: TodoListData = {
      name: LIST_NAMES[Math.floor(Math.random() * LIST_NAMES.length)] || faker.lorem.words(2),
      description: Math.random() < 0.5 ? faker.lorem.sentence() : undefined,
      ownerId: 1,
      isShared,
      createdAt: listDate,
      updatedAt: listDate,
    };
    lists.push(list);

    // Add list members for shared lists
    if (isShared) {
      listMembers.push({
        userId: 1,
        role: "OWNER",
        createdAt: listDate,
      });

      // Add 1-2 additional members
      const memberCount = 1 + Math.floor(Math.random() * 2);
      for (let j = 0; j < memberCount; j++) {
        listMembers.push({
          userId: 1, // Using default user for now
          role: "MEMBER",
          createdAt: listDate,
        });
      }
    }

    // Generate 3-8 tasks per list
    const taskCount = 3 + Math.floor(Math.random() * 6);

    for (let j = 0; j < taskCount; j++) {
      const taskDate = new Date(
        listDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000
      ); // Within 30 days of list creation

      // Determine task status
      const statusRoll = Math.random();
      let status: string;
      if (statusRoll < 0.4) {
        status = "COMPLETED";
      } else if (statusRoll < 0.7) {
        status = "TODO";
      } else if (statusRoll < 0.9) {
        status = "IN_PROGRESS";
      } else if (statusRoll < 0.95) {
        status = "BLOCKED";
      } else {
        status = "CANCELLED";
      }

      // Due date (50% of tasks have due dates)
      let dueDate: Date | undefined;
      if (Math.random() < 0.5) {
        dueDate = new Date(
          taskDate.getTime() +
            (3 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000
        ); // 3-14 days from creation
      }

      const priority =
        TASK_PRIORITIES[Math.floor(Math.random() * TASK_PRIORITIES.length)];

      const task: TodoTaskData = {
        title:
          TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)] ||
          faker.lorem.sentence(),
        description: Math.random() < 0.4 ? faker.lorem.sentences(2) : undefined,
        status,
        priority,
        dueDate,
        assignedTo: isShared && Math.random() < 0.6 ? 1 : undefined,
        createdBy: 1,
        createdAt: taskDate,
        updatedAt: taskDate,
      };
      tasks.push(task);

      // Add task activity
      taskActivity.push({
        userId: 1,
        action: "CREATED",
        notes: "Task created",
        createdAt: taskDate,
      });

      // Add status change activity if not TODO
      if (status !== "TODO") {
        const statusChangeDate = new Date(
          taskDate.getTime() +
            Math.random() * 7 * 24 * 60 * 60 * 1000
        );

        taskActivity.push({
          userId: 1,
          action: "STATUS_CHANGED",
          notes: `Status changed to ${status}`,
          createdAt: statusChangeDate,
        });

        task.updatedAt = statusChangeDate;
      }

      // Add assignment activity if assigned
      if (task.assignedTo) {
        const assignDate = new Date(
          taskDate.getTime() +
            Math.random() * 2 * 24 * 60 * 60 * 1000
        );

        taskActivity.push({
          userId: 1,
          action: "ASSIGNED",
          notes: `Assigned to user ${task.assignedTo}`,
          createdAt: assignDate,
        });
      }

      // 30% of tasks have additional comments
      if (Math.random() < 0.3) {
        const commentDate = new Date(
          taskDate.getTime() +
            Math.random() * 10 * 24 * 60 * 60 * 1000
        );

        taskActivity.push({
          userId: 1,
          action: "COMMENTED",
          notes: faker.lorem.sentence(),
          createdAt: commentDate,
        });
      }
    }
  }

  return {
    lists,
    tasks,
    taskActivity,
    listMembers,
  };
}
