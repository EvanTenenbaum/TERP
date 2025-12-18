#!/usr/bin/env tsx
/**
 * Send Interactive Slack Report
 *
 * Sends a rich Slack message with Block Kit formatting and interactive buttons
 * for approving or dismissing pending bugs.
 */

import { existsSync, readFileSync } from "fs";

interface PendingBug {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  specFile: string;
  error: string;
  replayCommand: string;
  timestamp: string;
}

interface PendingBugsFile {
  generatedAt: string;
  runId: string;
  gitSha: string;
  totalFailures: number;
  bugs: PendingBug[];
}

interface MegaQABundle {
  manifest: {
    runId: string;
    gitSha: string;
    timestamp: string;
    durationMs: number;
    result: "pass" | "fail";
  };
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    coveragePercent: number;
  };
}

// Build Block Kit message
function buildSlackBlocks(
  bundle: MegaQABundle | null,
  pendingBugs: PendingBugsFile
): object[] {
  const blocks: object[] = [];
  const runUrl =
    process.env.GITHUB_SERVER_URL &&
    process.env.GITHUB_REPOSITORY &&
    process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null;

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Header
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `🧪 TERP Nightly QA Report`,
      emoji: true,
    },
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `📅 ${date} | 🔗 Commit: \`${pendingBugs.gitSha.substring(0, 7)}\``,
      },
    ],
  });

  blocks.push({ type: "divider" });

  // Test Results Summary
  if (bundle) {
    const passRate =
      bundle.summary.totalTests > 0
        ? Math.round((bundle.summary.passed / bundle.summary.totalTests) * 100)
        : 0;
    const durationMin = Math.round(bundle.manifest.durationMs / 60000);
    const statusEmoji = bundle.summary.failed === 0 ? "✅" : "⚠️";

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `${statusEmoji} *Test Results*\n\n` +
          `• *Passed:* ${bundle.summary.passed}/${bundle.summary.totalTests} (${passRate}%)\n` +
          `• *Failed:* ${bundle.summary.failed}\n` +
          `• *Skipped:* ${bundle.summary.skipped}\n` +
          `• *Duration:* ${durationMin}m\n` +
          `• *Coverage:* ${bundle.summary.coveragePercent}%`,
      },
    });

    blocks.push({ type: "divider" });
  }

  // Pending Bugs Section
  if (pendingBugs.bugs.length > 0) {
    const highCount = pendingBugs.bugs.filter(
      b => b.priority === "HIGH"
    ).length;
    const mediumCount = pendingBugs.bugs.filter(
      b => b.priority === "MEDIUM"
    ).length;
    const lowCount = pendingBugs.bugs.filter(b => b.priority === "LOW").length;

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `🆕 *NEW BUGS FOUND (${pendingBugs.bugs.length})*\n\n` +
          `🔴 High: ${highCount} | 🟡 Medium: ${mediumCount} | 🟢 Low: ${lowCount}`,
      },
    });

    // List first 5 bugs
    let bugList = "";
    for (let i = 0; i < Math.min(pendingBugs.bugs.length, 5); i++) {
      const bug = pendingBugs.bugs[i];
      const emoji =
        bug.priority === "HIGH"
          ? "🔴"
          : bug.priority === "MEDIUM"
            ? "🟡"
            : "🟢";
      bugList += `${emoji} \`${bug.id}\`: ${bug.title}\n`;
    }
    if (pendingBugs.bugs.length > 5) {
      bugList += `\n_...and ${pendingBugs.bugs.length - 5} more_`;
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: bugList,
      },
    });

    blocks.push({ type: "divider" });

    // Action buttons
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "✅ Approve All",
            emoji: true,
          },
          style: "primary",
          action_id: "approve_all_bugs",
          value: pendingBugs.runId,
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "👀 Review Details",
            emoji: true,
          },
          action_id: "review_bugs",
          value: pendingBugs.runId,
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "❌ Dismiss All",
            emoji: true,
          },
          style: "danger",
          action_id: "dismiss_all_bugs",
          value: pendingBugs.runId,
          confirm: {
            title: {
              type: "plain_text",
              text: "Dismiss all bugs?",
            },
            text: {
              type: "mrkdwn",
              text: "This will mark all pending bugs as dismissed. They won't be added to the roadmap.",
            },
            confirm: {
              type: "plain_text",
              text: "Dismiss",
            },
            deny: {
              type: "plain_text",
              text: "Cancel",
            },
          },
        },
      ],
    });
  } else {
    // All tests passed!
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🎉 *All tests passed!* No new bugs found.",
      },
    });
  }

  // Footer with link
  if (runUrl) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${runUrl}|View Full Report> | Run ID: ${pendingBugs.runId}`,
        },
      ],
    });
  }

  return blocks;
}

async function sendToSlack(blocks: object[]): Promise<void> {
  // Try Bot Token first (for interactive messages)
  const botToken = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (botToken && channelId) {
    console.log("📤 Sending via Slack Bot API...");

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        blocks,
        text: "🧪 TERP Nightly QA Report", // Fallback text
      }),
    });

    const result = (await response.json()) as { ok: boolean; error?: string };
    if (result.ok) {
      console.log("✅ Interactive Slack message sent!");
      return;
    } else {
      console.warn(`⚠️  Slack API error: ${result.error}`);
    }
  }

  // Fallback to webhook (no interactive buttons)
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (webhookUrl) {
    console.log("📤 Falling back to webhook (buttons disabled)...");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks,
        text: "🧪 TERP Nightly QA Report",
      }),
    });

    if (response.ok) {
      console.log("✅ Slack webhook message sent (buttons won't work)");
    } else {
      console.error(`❌ Webhook failed: ${response.status}`);
    }
    return;
  }

  console.log("⚠️  No Slack credentials configured, skipping notification");
}

async function main(): Promise<void> {
  console.log("📨 Preparing interactive Slack report...\n");

  // Load pending bugs
  const pendingBugsPath = "qa-results/pending-bugs.json";
  if (!existsSync(pendingBugsPath)) {
    console.log("ℹ️  No pending bugs file found");
    return;
  }

  const pendingBugs: PendingBugsFile = JSON.parse(
    readFileSync(pendingBugsPath, "utf-8")
  );

  // Try to load Mega QA bundle for full stats
  let bundle: MegaQABundle | null = null;
  const bundlePath = "qa-results/mega-qa/latest/bundle.json";
  if (existsSync(bundlePath)) {
    try {
      bundle = JSON.parse(readFileSync(bundlePath, "utf-8"));
    } catch {
      console.warn("⚠️  Could not parse bundle.json");
    }
  }

  // Build and send message
  const blocks = buildSlackBlocks(bundle, pendingBugs);
  await sendToSlack(blocks);
}

main().catch(console.error);
