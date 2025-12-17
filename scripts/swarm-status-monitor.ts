#!/usr/bin/env tsx

/**
 * Swarm Status Monitor
 *
 * Monitors and reports on swarm agent status.
 * Can be run manually or via cron/scheduled task.
 *
 * Usage:
 *   tsx scripts/swarm-status-monitor.ts [--notify]
 *
 * Options:
 *   --notify    Send notifications (Slack, email, etc.)
 *   --json      Output as JSON
 *   --webhook   Send to webhook URL
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

interface AgentStatus {
  taskId: string;
  sessionId: string;
  branch: string;
  status: "active" | "stale" | "completed" | "unknown";
  lastActivity: Date | null;
  age: number; // in hours
  files: string[];
}

interface SwarmStatus {
  timestamp: string;
  activeAgents: AgentStatus[];
  pendingTasks: string[];
  recommendedTasks: string[];
  staleCount: number;
  completedToday: number;
}

const SESSIONS_DIR = join(process.cwd(), "docs/sessions/active");
const _ROADMAP_PATH = join(process.cwd(), "docs/roadmaps/MASTER_ROADMAP.md");
const STALE_THRESHOLD_HOURS = 4;

function getSwarmStatus(): SwarmStatus {
  const timestamp = new Date().toISOString();
  const activeAgents: AgentStatus[] = [];
  let staleCount = 0;
  let completedToday = 0;

  // Read active sessions
  if (existsSync(SESSIONS_DIR)) {
    const sessionFiles = readdirSync(SESSIONS_DIR).filter(f =>
      f.endsWith(".md")
    );

    for (const file of sessionFiles) {
      const filePath = join(SESSIONS_DIR, file);
      const stats = statSync(filePath);
      const lastModified = stats.mtime;
      const age = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60); // hours

      const content = readFileSync(filePath, "utf-8");

      // Extract task ID from filename or content
      const taskMatch = file.match(
        /(BUG|ST|RF|WF|DATA|INFRA|QA|CL|FEATURE)-\d+/i
      );
      const taskId = taskMatch ? taskMatch[0].toUpperCase() : "UNKNOWN";

      // Extract session ID
      const sessionId = file.replace(".md", "");

      // Determine status
      let status: AgentStatus["status"] = "active";
      if (age > STALE_THRESHOLD_HOURS) {
        status = "stale";
        staleCount++;
      }

      // Try to find branch
      let branch = "unknown";
      try {
        const branchMatch = content.match(/\*\*Branch:\*\*\s*(.+)/i);
        if (branchMatch) {
          branch = branchMatch[1].trim();
        } else {
          // Try to find in git
          const gitBranches = execSync("git branch -a", { encoding: "utf-8" });
          const agentBranch = gitBranches
            .split("\n")
            .find(b => b.includes(`agent/${taskId}`));
          if (agentBranch) {
            branch = agentBranch.trim().replace("remotes/origin/", "");
          }
        }
      } catch {
        // Ignore git errors
      }

      activeAgents.push({
        taskId,
        sessionId,
        branch,
        status,
        lastActivity: lastModified,
        age: Math.round(age * 10) / 10,
        files: [file],
      });
    }
  }

  // Get pending and recommended tasks from swarm status
  let pendingTasks: string[] = [];
  let recommendedTasks: string[] = [];

  try {
    const statusOutput = execSync("pnpm swarm status 2>&1", {
      encoding: "utf-8",
    });
    const statusJson = JSON.parse(statusOutput);
    pendingTasks = statusJson.pending || [];
    recommendedTasks = statusJson.recommended || [];
  } catch (error) {
    console.warn("Could not get swarm status:", error);
  }

  // Count completed today
  const completedDir = join(process.cwd(), "docs/sessions/completed");
  if (existsSync(completedDir)) {
    const today = new Date().toISOString().split("T")[0];
    const completedFiles = readdirSync(completedDir).filter(
      f => f.includes(today) && f.endsWith(".md")
    );
    completedToday = completedFiles.length;
  }

  return {
    timestamp,
    activeAgents,
    pendingTasks,
    recommendedTasks,
    staleCount,
    completedToday,
  };
}

function formatStatusReport(
  status: SwarmStatus,
  format: "text" | "json" = "text"
): string {
  if (format === "json") {
    return JSON.stringify(status, null, 2);
  }

  let report = `# 🤖 Swarm Agent Status Report\n\n`;
  report += `**Generated:** ${new Date(status.timestamp).toLocaleString()}\n\n`;
  report += `---\n\n`;

  // Summary
  report += `## 📊 Summary\n\n`;
  report += `- **Active Agents:** ${status.activeAgents.length}\n`;
  report += `- **Stale Agents:** ${status.staleCount}\n`;
  report += `- **Completed Today:** ${status.completedToday}\n`;
  report += `- **Pending Tasks:** ${status.pendingTasks.length}\n`;
  report += `- **Recommended Tasks:** ${status.recommendedTasks.length}\n\n`;

  // Active Agents
  if (status.activeAgents.length > 0) {
    report += `## 🟢 Active Agents\n\n`;
    report += `| Task | Session | Branch | Status | Age (hrs) | Last Activity |\n`;
    report += `|------|---------|--------|--------|-----------|---------------|\n`;

    for (const agent of status.activeAgents) {
      const statusEmoji = agent.status === "stale" ? "⚠️" : "🟢";
      const lastActivity = agent.lastActivity
        ? agent.lastActivity.toLocaleString()
        : "Unknown";
      report += `| ${agent.taskId} | ${agent.sessionId.substring(0, 20)}... | ${agent.branch} | ${statusEmoji} ${agent.status} | ${agent.age} | ${lastActivity} |\n`;
    }
    report += `\n`;
  } else {
    report += `## 🟢 Active Agents\n\n`;
    report += `*No active agents*\n\n`;
  }

  // Pending Tasks
  if (status.pendingTasks.length > 0) {
    report += `## 📋 Pending Tasks\n\n`;
    report += status.pendingTasks.map(t => `- ${t}`).join("\n") + "\n\n";
  }

  // Recommended Tasks
  if (status.recommendedTasks.length > 0) {
    report += `## ⭐ Recommended Tasks (Next Batch)\n\n`;
    report += status.recommendedTasks.map(t => `- ${t}`).join("\n") + "\n\n";
  }

  // Warnings
  if (status.staleCount > 0) {
    report += `## ⚠️ Warnings\n\n`;
    report += `**${status.staleCount} stale agent(s) detected** - Consider investigating:\n\n`;
    const staleAgents = status.activeAgents.filter(a => a.status === "stale");
    for (const agent of staleAgents) {
      report += `- ${agent.taskId} (${agent.sessionId}) - Last activity: ${agent.age} hours ago\n`;
    }
    report += `\n`;
  }

  return report;
}

function sendNotification(report: string, webhookUrl?: string): void {
  if (webhookUrl) {
    try {
      const payload = {
        text: "🤖 Swarm Status Update",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: report,
            },
          },
        ],
      };

      execSync(
        `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' ${webhookUrl}`,
        {
          stdio: "ignore",
        }
      );
      console.log("✅ Notification sent to webhook");
    } catch (error) {
      console.warn("⚠️  Failed to send webhook notification:", error);
    }
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const notify = args.includes("--notify");
  const json = args.includes("--json");
  const webhookIndex = args.indexOf("--webhook");
  const webhookUrl =
    webhookIndex >= 0 && args[webhookIndex + 1]
      ? args[webhookIndex + 1]
      : process.env.SLACK_WEBHOOK_URL;

  const status = getSwarmStatus();
  const report = formatStatusReport(status, json ? "json" : "text");

  console.log(report);

  // Save report to file
  const reportPath = join(process.cwd(), "docs/swarm-status-latest.md");
  require("fs").writeFileSync(reportPath, report, "utf-8");
  console.log(`\n📄 Report saved to: ${reportPath}`);

  if (notify && webhookUrl) {
    sendNotification(report, webhookUrl);
  }
}

if (require.main === module) {
  main();
}

export { getSwarmStatus, formatStatusReport };
