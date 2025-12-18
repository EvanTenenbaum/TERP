#!/usr/bin/env tsx
/**
 * Send Morning Summary
 *
 * Sends a daily briefing to Slack with:
 * - Today's priorities (HIGH priority ready tasks)
 * - Work in progress
 * - Yesterday's completed work
 * - Pending bugs awaiting approval
 * - Recent commits
 */

import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

interface PendingBug {
  id: string;
  title: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  approved?: boolean;
  dismissed?: boolean;
}

interface PendingBugsFile {
  bugs: PendingBug[];
}

interface TaskInfo {
  id: string;
  title: string;
  priority: string;
  status: string;
}

// Parse roadmap for task info
function parseRoadmap(): {
  priorities: TaskInfo[];
  inProgress: TaskInfo[];
  recentlyCompleted: TaskInfo[];
  stats: {
    complete: number;
    inProgress: number;
    ready: number;
    blocked: number;
    total: number;
  };
} {
  const roadmapPath = join(process.cwd(), "docs/roadmaps/MASTER_ROADMAP.md");
  if (!existsSync(roadmapPath)) {
    return {
      priorities: [],
      inProgress: [],
      recentlyCompleted: [],
      stats: { complete: 0, inProgress: 0, ready: 0, blocked: 0, total: 0 },
    };
  }

  const roadmap = readFileSync(roadmapPath, "utf-8");

  // Extract tasks with their status and priority
  const taskPattern =
    /### ([\w-]+):([^\n]+)\n(?:[^#]*?)\*\*Status:\*\*\s*(\w+)(?:[^#]*?)\*\*Priority:\*\*\s*(\w+)/gi;
  const matches = [...roadmap.matchAll(taskPattern)];

  const allTasks: TaskInfo[] = matches.map(m => ({
    id: m[1],
    title: m[2].trim(),
    status: m[3].toLowerCase(),
    priority: m[4].toUpperCase(),
  }));

  // Filter by status
  const priorities = allTasks
    .filter(t => t.status === "ready" && t.priority === "HIGH")
    .slice(0, 5);

  const inProgress = allTasks
    .filter(t => t.status === "in-progress")
    .slice(0, 5);

  // For "recently completed" we'd need git history, so just get completed tasks
  const recentlyCompleted = allTasks
    .filter(t => t.status === "complete")
    .slice(-5)
    .reverse();

  // Stats
  const complete = allTasks.filter(t => t.status === "complete").length;
  const inProgressCount = allTasks.filter(
    t => t.status === "in-progress"
  ).length;
  const ready = allTasks.filter(t => t.status === "ready").length;
  const blocked = allTasks.filter(t => t.status === "blocked").length;
  const total = allTasks.length;

  return {
    priorities,
    inProgress,
    recentlyCompleted,
    stats: { complete, inProgress: inProgressCount, ready, blocked, total },
  };
}

// Get recent commits
function getRecentCommits(): string[] {
  try {
    const output = execSync(
      'git log --since="24 hours ago" --pretty=format:"%h - %s (%ar)" --max-count=10',
      { encoding: "utf-8" }
    );
    return output.split("\n").filter(line => line.trim());
  } catch {
    return [];
  }
}

// Get pending bugs
function getPendingBugs(): PendingBug[] {
  try {
    const path = join(process.cwd(), "qa-results/pending-bugs.json");
    if (existsSync(path)) {
      const data: PendingBugsFile = JSON.parse(readFileSync(path, "utf-8"));
      return data.bugs.filter(b => !b.approved && !b.dismissed);
    }
  } catch {
    // No pending bugs
  }
  return [];
}

// Build Slack blocks
function buildMorningSummaryBlocks(): object[] {
  const blocks: object[] = [];
  const { priorities, inProgress, stats } = parseRoadmap();
  const recentCommits = getRecentCommits();
  const pendingBugs = getPendingBugs();

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const progressPercent =
    stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0;

  // Header
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: "☀️ Good Morning! Here's your TERP status",
      emoji: true,
    },
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `📅 ${date} | 📊 Overall Progress: ${progressPercent}%`,
      },
    ],
  });

  blocks.push({ type: "divider" });

  // Pending bugs alert (if any)
  if (pendingBugs.length > 0) {
    const highPriority = pendingBugs.filter(b => b.priority === "HIGH").length;
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `⚠️ *${pendingBugs.length} bugs awaiting approval*` +
          (highPriority > 0 ? ` (${highPriority} HIGH priority)` : "") +
          `\n\nSay \`pending\` to review, or \`approve all\` to add them to the roadmap.`,
      },
    });
    blocks.push({ type: "divider" });
  }

  // Today's Priorities
  if (priorities.length > 0) {
    let priorityText = "*🎯 TODAY'S PRIORITIES:*\n\n";
    for (const task of priorities) {
      priorityText += `🔴 *${task.id}*: ${task.title}\n`;
    }
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: priorityText },
    });
  } else {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*🎯 TODAY'S PRIORITIES:*\n\n_No HIGH priority tasks ready. Check MEDIUM priority tasks._",
      },
    });
  }

  blocks.push({ type: "divider" });

  // In Progress
  if (inProgress.length > 0) {
    let ipText = `*🔄 IN PROGRESS (${stats.inProgress}):*\n\n`;
    for (const task of inProgress) {
      const emoji = task.priority === "HIGH" ? "🔴" : "🟡";
      ipText += `${emoji} *${task.id}*: ${task.title}\n`;
    }
    if (stats.inProgress > 5) {
      ipText += `\n_...and ${stats.inProgress - 5} more_`;
    }
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: ipText },
    });
  }

  // Recent Commits
  if (recentCommits.length > 0) {
    let commitText = "*🔥 RECENT ACTIVITY (Last 24h):*\n\n";
    for (const commit of recentCommits.slice(0, 5)) {
      commitText += `• \`${commit}\`\n`;
    }
    if (recentCommits.length > 5) {
      commitText += `\n_...and ${recentCommits.length - 5} more commits_`;
    }
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: commitText },
    });
  }

  blocks.push({ type: "divider" });

  // Stats
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text:
        `*📊 Project Stats:*\n` +
        `✅ Complete: ${stats.complete} | 🔄 In Progress: ${stats.inProgress} | ` +
        `📋 Ready: ${stats.ready} | 🚫 Blocked: ${stats.blocked}`,
    },
  });

  // Quick actions
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "📋 Show Roadmap", emoji: true },
        action_id: "show_roadmap",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "🐛 Show Pending Bugs", emoji: true },
        action_id: "review_bugs",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "💬 Ask Me Anything", emoji: true },
        action_id: "start_chat",
      },
    ],
  });

  // Footer
  const repoUrl = `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${process.env.GITHUB_REPOSITORY || "terp"}`;
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `<${repoUrl}|View on GitHub> | Reply to this message to chat with me!`,
      },
    ],
  });

  return blocks;
}

// Send to Slack
async function sendToSlack(blocks: object[]): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (botToken && channelId) {
    console.log("📤 Sending morning summary via Bot API...");

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        blocks,
        text: "☀️ Good Morning! Here's your TERP status",
      }),
    });

    const result = (await response.json()) as { ok: boolean; error?: string };
    if (result.ok) {
      console.log("✅ Morning summary sent!");
      return;
    } else {
      console.warn(`⚠️ Slack API error: ${result.error}`);
    }
  }

  // Fallback to webhook
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (webhookUrl) {
    console.log("📤 Falling back to webhook...");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks,
        text: "☀️ Good Morning! Here's your TERP status",
      }),
    });

    if (response.ok) {
      console.log("✅ Morning summary sent via webhook");
    } else {
      console.error(`❌ Webhook failed: ${response.status}`);
    }
    return;
  }

  console.log("⚠️ No Slack credentials configured");
}

async function main(): Promise<void> {
  console.log("☀️ Generating morning summary...\n");

  const blocks = buildMorningSummaryBlocks();
  await sendToSlack(blocks);
}

main().catch(console.error);
