#!/usr/bin/env tsx

/**
 * TERP Visual Dashboard
 * Generates visual overview of all tasks, initiatives, and progress
 */

import fs from "fs";
import path from "path";

interface Task {
  id: string;
  title: string;
  status: "ready" | "in-progress" | "complete" | "blocked";
  priority: "HIGH" | "MEDIUM" | "LOW";
  estimate: string;
  phase?: string;
  initiative?: string;
}

interface Initiative {
  name: string;
  status: string;
  phases: Phase[];
  progress: number;
}

interface Phase {
  name: string;
  status: string;
  tasks: string[];
  progress: number;
}

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function parseRoadmap(): Task[] {
  const roadmapPath = path.join(
    process.cwd(),
    "docs/roadmaps/MASTER_ROADMAP.md"
  );
  const content = fs.readFileSync(roadmapPath, "utf-8");

  const tasks: Task[] = [];
  const taskRegex = /###\s+([A-Z]+-\d+):\s+(.+?)$/gm;

  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    const taskId = match[1];
    const title = match[2];

    // Find the task section
    const taskStart = match.index;
    const nextTaskMatch = taskRegex.exec(content);
    const taskEnd = nextTaskMatch ? nextTaskMatch.index : content.length;
    taskRegex.lastIndex = taskStart + 1; // Reset for next iteration

    const taskSection = content.substring(taskStart, taskEnd);

    // Extract status
    const statusMatch = taskSection.match(/\*\*Status:\*\*\s+(\w+)/);
    const status = (statusMatch?.[1] || "ready") as Task["status"];

    // Extract priority
    const priorityMatch = taskSection.match(/\*\*Priority:\*\*\s+(\w+)/);
    const priority = (priorityMatch?.[1] || "MEDIUM") as Task["priority"];

    // Extract estimate
    const estimateMatch = taskSection.match(/\*\*Estimate:\*\*\s+(.+?)$/m);
    const estimate = estimateMatch?.[1] || "Unknown";

    tasks.push({ id: taskId, title, status, priority, estimate });
  }

  return tasks;
}

function parseInitiatives(): Initiative[] {
  const initiativesDir = path.join(process.cwd(), "docs/initiatives");

  if (!fs.existsSync(initiativesDir)) {
    return [];
  }

  const files = fs.readdirSync(initiativesDir).filter(f => f.endsWith(".md"));
  const initiatives: Initiative[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(initiativesDir, file), "utf-8");
    const nameMatch = content.match(/^#\s+(.+?)$/m);
    const name = nameMatch?.[1] || file.replace(".md", "");

    // Parse phases
    const phases: Phase[] = [];
    const phaseRegex = /###\s+Phase\s+\d+:\s+(.+?)$/gm;
    let phaseMatch;

    while ((phaseMatch = phaseRegex.exec(content)) !== null) {
      phases.push({
        name: phaseMatch[1],
        status: "pending",
        tasks: [],
        progress: 0,
      });
    }

    initiatives.push({
      name,
      status: "active",
      phases,
      progress: 0,
    });
  }

  return initiatives;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "complete":
      return "✅";
    case "in-progress":
      return "🔄";
    case "blocked":
      return "🔴";
    case "ready":
      return "⚪";
    default:
      return "❓";
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "HIGH":
      return COLORS.red;
    case "MEDIUM":
      return COLORS.yellow;
    case "LOW":
      return COLORS.blue;
    default:
      return COLORS.reset;
  }
}

function renderProgressBar(progress: number, width: number = 20): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  let color = COLORS.red;
  if (progress >= 75) color = COLORS.green;
  else if (progress >= 50) color = COLORS.yellow;

  return `${color}${bar}${COLORS.reset} ${progress}%`;
}

function calculateProgress(tasks: Task[]): {
  total: number;
  complete: number;
  inProgress: number;
  ready: number;
  blocked: number;
} {
  return {
    total: tasks.length,
    complete: tasks.filter(t => t.status === "complete").length,
    inProgress: tasks.filter(t => t.status === "in-progress").length,
    ready: tasks.filter(t => t.status === "ready").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
  };
}

function renderDashboard() {
  console.clear();

  console.log(
    `${COLORS.bright}${COLORS.cyan}╔════════════════════════════════════════════════════════════════╗${COLORS.reset}`
  );
  console.log(
    `${COLORS.bright}${COLORS.cyan}║           TERP PROJECT DASHBOARD - Visual Overview             ║${COLORS.reset}`
  );
  console.log(
    `${COLORS.bright}${COLORS.cyan}╚════════════════════════════════════════════════════════════════╝${COLORS.reset}`
  );
  console.log();

  // Parse data
  const tasks = parseRoadmap();
  const initiatives = parseInitiatives();
  const progress = calculateProgress(tasks);
  const progressPercent = Math.round(
    (progress.complete / progress.total) * 100
  );

  // Overall Progress
  console.log(`${COLORS.bright}📊 Overall Progress${COLORS.reset}`);
  console.log(`   ${renderProgressBar(progressPercent, 40)}`);
  console.log(`   ${progress.complete}/${progress.total} tasks complete`);
  console.log();

  // Status Breakdown
  console.log(`${COLORS.bright}📈 Status Breakdown${COLORS.reset}`);
  console.log(
    `   ✅ Complete:    ${COLORS.green}${progress.complete.toString().padStart(3)}${COLORS.reset}`
  );
  console.log(
    `   🔄 In Progress: ${COLORS.yellow}${progress.inProgress.toString().padStart(3)}${COLORS.reset}`
  );
  console.log(
    `   ⚪ Ready:       ${COLORS.blue}${progress.ready.toString().padStart(3)}${COLORS.reset}`
  );
  console.log(
    `   🔴 Blocked:     ${COLORS.red}${progress.blocked.toString().padStart(3)}${COLORS.reset}`
  );
  console.log();

  // Initiatives
  if (initiatives.length > 0) {
    console.log(`${COLORS.bright}🎯 Active Initiatives${COLORS.reset}`);
    initiatives.forEach(initiative => {
      console.log(`   ${COLORS.bright}${initiative.name}${COLORS.reset}`);
      console.log(`   Status: ${initiative.status}`);
      console.log(`   Phases: ${initiative.phases.length}`);
      console.log();
    });
  }

  // Tasks by Priority
  console.log(`${COLORS.bright}🔥 High Priority Tasks${COLORS.reset}`);
  const highPriority = tasks
    .filter(t => t.priority === "HIGH" && t.status !== "complete")
    .slice(0, 10);

  if (highPriority.length === 0) {
    console.log(
      `   ${COLORS.green}No high priority tasks remaining!${COLORS.reset}`
    );
  } else {
    highPriority.forEach(task => {
      const statusIcon = getStatusIcon(task.status);
      const priorityColor = getPriorityColor(task.priority);
      console.log(
        `   ${statusIcon} ${priorityColor}${task.id}${COLORS.reset}: ${task.title.substring(0, 50)}`
      );
      console.log(
        `      ${COLORS.gray}Status: ${task.status} | Estimate: ${task.estimate}${COLORS.reset}`
      );
    });
  }
  console.log();

  // Recent Activity
  console.log(`${COLORS.bright}⏱️  Recent Activity${COLORS.reset}`);
  const recentComplete = tasks.filter(t => t.status === "complete").slice(-5);
  if (recentComplete.length > 0) {
    recentComplete.forEach(task => {
      console.log(
        `   ✅ ${COLORS.green}${task.id}${COLORS.reset}: ${task.title.substring(0, 50)}`
      );
    });
  } else {
    console.log(`   ${COLORS.gray}No recently completed tasks${COLORS.reset}`);
  }
  console.log();

  // Next Actions
  console.log(`${COLORS.bright}🎯 Recommended Next Actions${COLORS.reset}`);
  const nextTasks = tasks
    .filter(t => t.status === "ready" && t.priority === "HIGH")
    .slice(0, 3);
  if (nextTasks.length > 0) {
    nextTasks.forEach((task, i) => {
      console.log(
        `   ${i + 1}. ${COLORS.cyan}${task.id}${COLORS.reset}: ${task.title.substring(0, 50)}`
      );
      console.log(
        `      ${COLORS.gray}Estimate: ${task.estimate}${COLORS.reset}`
      );
    });
  } else {
    console.log(
      `   ${COLORS.green}All high priority tasks in progress or complete!${COLORS.reset}`
    );
  }
  console.log();

  console.log(
    `${COLORS.gray}Last updated: ${new Date().toLocaleString()}${COLORS.reset}`
  );
  console.log(
    `${COLORS.gray}Run 'npm run dashboard' to refresh${COLORS.reset}`
  );
}

// Run dashboard
renderDashboard();
