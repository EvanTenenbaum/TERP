#!/usr/bin/env tsx

/**
 * Generate HTML Dashboard for TERP
 * Creates a visual web-based dashboard
 */

import fs from "fs";
import path from "path";

interface Task {
  id: string;
  title: string;
  status: "ready" | "in-progress" | "complete" | "blocked";
  priority: "HIGH" | "MEDIUM" | "LOW";
  estimate: string;
}

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

    const taskStart = match.index;
    const nextTaskMatch = taskRegex.exec(content);
    const taskEnd = nextTaskMatch ? nextTaskMatch.index : content.length;
    taskRegex.lastIndex = taskStart + 1;

    const taskSection = content.substring(taskStart, taskEnd);

    const statusMatch = taskSection.match(/\*\*Status:\*\*\s+(\w+)/);
    const status = (statusMatch?.[1] || "ready") as Task["status"];

    const priorityMatch = taskSection.match(/\*\*Priority:\*\*\s+(\w+)/);
    const priority = (priorityMatch?.[1] || "MEDIUM") as Task["priority"];

    const estimateMatch = taskSection.match(/\*\*Estimate:\*\*\s+(.+?)$/m);
    const estimate = estimateMatch?.[1] || "Unknown";

    tasks.push({ id: taskId, title, status, priority, estimate });
  }

  return tasks;
}

function generateHTML(tasks: Task[]): string {
  const progress = {
    total: tasks.length,
    complete: tasks.filter(t => t.status === "complete").length,
    inProgress: tasks.filter(t => t.status === "in-progress").length,
    ready: tasks.filter(t => t.status === "ready").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
  };

  const progressPercent = Math.round(
    (progress.complete / progress.total) * 100
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TERP Project Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    h1 { color: #667eea; font-size: 2.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: #666; font-size: 1.1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .card h2 { color: #333; font-size: 1.3rem; margin-bottom: 1rem; }
    .progress-bar {
      width: 100%;
      height: 2rem;
      background: #e0e0e0;
      border-radius: 1rem;
      overflow: hidden;
      margin: 1rem 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    .stat { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #eee; }
    .stat:last-child { border-bottom: none; }
    .stat-label { color: #666; }
    .stat-value { font-weight: bold; font-size: 1.2rem; }
    .status-complete { color: #10b981; }
    .status-in-progress { color: #f59e0b; }
    .status-ready { color: #3b82f6; }
    .status-blocked { color: #ef4444; }
    .task-list { list-style: none; }
    .task-item {
      padding: 1rem;
      margin: 0.5rem 0;
      background: #f9fafb;
      border-radius: 0.5rem;
      border-left: 4px solid #667eea;
    }
    .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .task-id { font-weight: bold; color: #667eea; }
    .task-title { color: #333; margin-top: 0.25rem; }
    .task-meta { color: #666; font-size: 0.9rem; margin-top: 0.5rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge-high { background: #fee2e2; color: #dc2626; }
    .badge-medium { background: #fef3c7; color: #d97706; }
    .badge-low { background: #dbeafe; color: #2563eb; }
    .badge-complete { background: #d1fae5; color: #059669; }
    .badge-in-progress { background: #fef3c7; color: #d97706; }
    .badge-ready { background: #dbeafe; color: #2563eb; }
    .badge-blocked { background: #fee2e2; color: #dc2626; }
    .timestamp { text-align: center; color: rgba(255,255,255,0.8); margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 TERP Project Dashboard</h1>
      <p class="subtitle">Visual Overview of All Tasks & Progress</p>
    </div>
    
    <div class="grid">
      <div class="card">
        <h2>📊 Overall Progress</h2>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%">${progressPercent}%</div>
        </div>
        <p style="text-align: center; color: #666; margin-top: 0.5rem;">
          ${progress.complete} of ${progress.total} tasks complete
        </p>
      </div>
      
      <div class="card">
        <h2>📈 Status Breakdown</h2>
        <div class="stat">
          <span class="stat-label">✅ Complete</span>
          <span class="stat-value status-complete">${progress.complete}</span>
        </div>
        <div class="stat">
          <span class="stat-label">🔄 In Progress</span>
          <span class="stat-value status-in-progress">${progress.inProgress}</span>
        </div>
        <div class="stat">
          <span class="stat-label">⚪ Ready</span>
          <span class="stat-value status-ready">${progress.ready}</span>
        </div>
        <div class="stat">
          <span class="stat-label">🔴 Blocked</span>
          <span class="stat-value status-blocked">${progress.blocked}</span>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>🔥 High Priority Tasks</h2>
      <ul class="task-list">
        ${tasks
          .filter(t => t.priority === "HIGH" && t.status !== "complete")
          .slice(0, 10)
          .map(
            task => `
            <li class="task-item">
              <div class="task-header">
                <span class="task-id">${task.id}</span>
                <div>
                  <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                  <span class="badge badge-${task.status}">${task.status}</span>
                </div>
              </div>
              <div class="task-title">${task.title}</div>
              <div class="task-meta">Estimate: ${task.estimate}</div>
            </li>
          `
          )
          .join("")}
      </ul>
    </div>
    
    <p class="timestamp">Last updated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
}

// Generate and save
const tasks = parseRoadmap();
const html = generateHTML(tasks);
const outputPath = path.join(process.cwd(), "dashboard.html");
fs.writeFileSync(outputPath, html);

console.log("✅ Dashboard generated: dashboard.html");
console.log("   Open in browser to view");
