/**
 * Slack Bot QA Handlers
 *
 * Bug approval and QA-related functionality for the Slack bot.
 */

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface PendingBug {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  specFile: string;
  error: string;
  replayCommand: string;
  timestamp: string;
  approved?: boolean;
  dismissed?: boolean;
}

export interface PendingBugsFile {
  generatedAt: string;
  runId: string;
  gitSha: string;
  totalFailures: number;
  bugs: PendingBug[];
}

// ============================================================================
// Constants
// ============================================================================

const PENDING_BUGS_PATH = path.join(
  process.cwd(),
  "qa-results/pending-bugs.json"
);
const ROADMAP_PATH = path.join(
  process.cwd(),
  "docs/roadmaps/MASTER_ROADMAP.md"
);

// ============================================================================
// Bug Management Functions
// ============================================================================

export function loadPendingBugs(): PendingBugsFile | null {
  try {
    if (fs.existsSync(PENDING_BUGS_PATH)) {
      return JSON.parse(fs.readFileSync(PENDING_BUGS_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load pending bugs:", e);
  }
  return null;
}

export function savePendingBugs(data: PendingBugsFile): void {
  fs.writeFileSync(PENDING_BUGS_PATH, JSON.stringify(data, null, 2));
}

export function getNextBugId(): string {
  try {
    const roadmap = fs.readFileSync(ROADMAP_PATH, "utf-8");
    const matches = roadmap.match(/BUG-(\d+)/g) || [];
    const numbers = matches.map(m => parseInt(m.replace("BUG-", "")));
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `BUG-${String(maxNum + 1).padStart(3, "0")}`;
  } catch {
    return `BUG-${Date.now()}`;
  }
}

export function addBugToRoadmap(bug: PendingBug): string {
  const bugId = getNextBugId();

  const bugEntry = `
### ${bugId}: ${bug.title}
- **Status:** ready
- **Priority:** ${bug.priority}
- **Category:** Bug Fix
- **Estimate:** 2-4h
- **Source:** Nightly QA (${bug.timestamp.split("T")[0]})

**Problem:** ${bug.description.substring(0, 200)}...

**Spec File:** \`${bug.specFile}\`

**Replay Command:**
\`\`\`bash
${bug.replayCommand}
\`\`\`

---
`;

  try {
    let roadmap = fs.readFileSync(ROADMAP_PATH, "utf-8");

    const bugSectionMatch = roadmap.match(/## 🐛 Bug Fixes/i);
    if (bugSectionMatch) {
      const insertPos =
        roadmap.indexOf(bugSectionMatch[0]) + bugSectionMatch[0].length;
      roadmap =
        roadmap.slice(0, insertPos) +
        "\n" +
        bugEntry +
        roadmap.slice(insertPos);
    } else {
      roadmap += "\n## 🐛 Bug Fixes\n" + bugEntry;
    }

    fs.writeFileSync(ROADMAP_PATH, roadmap);
    return bugId;
  } catch (e) {
    console.error("Failed to add bug to roadmap:", e);
    throw e;
  }
}

export async function commitAndPush(message: string): Promise<boolean> {
  try {
    await execAsync("git add docs/roadmaps/MASTER_ROADMAP.md qa-results/");
    await execAsync(`git commit -m "${message}" --no-verify`);
    await execAsync("git push");
    return true;
  } catch (e) {
    console.error("Git operation failed:", e);
    return false;
  }
}

// ============================================================================
// Command Handlers
// ============================================================================

export function approveBug(bugId: string): string {
  const pendingBugs = loadPendingBugs();
  if (!pendingBugs) return "❌ No pending bugs file found.";

  const bug = pendingBugs.bugs.find(
    b => b.id === bugId || b.id.endsWith(bugId)
  );
  if (!bug) return `❌ Bug ${bugId} not found in pending bugs.`;
  if (bug.approved) return `ℹ️ Bug ${bugId} was already approved.`;
  if (bug.dismissed) return `ℹ️ Bug ${bugId} was dismissed.`;

  try {
    const newBugId = addBugToRoadmap(bug);
    bug.approved = true;
    savePendingBugs(pendingBugs);
    return `✅ Bug ${bugId} approved and added to roadmap as *${newBugId}*`;
  } catch (e) {
    return `❌ Failed to add bug: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export function dismissBug(bugId: string): string {
  const pendingBugs = loadPendingBugs();
  if (!pendingBugs) return "❌ No pending bugs file found.";

  const bug = pendingBugs.bugs.find(
    b => b.id === bugId || b.id.endsWith(bugId)
  );
  if (!bug) return `❌ Bug ${bugId} not found.`;

  bug.dismissed = true;
  savePendingBugs(pendingBugs);
  return `❌ Bug ${bugId} dismissed.`;
}

export function approveAllBugs(): string {
  const pendingBugs = loadPendingBugs();
  if (!pendingBugs) return "❌ No pending bugs file found.";

  const unapproved = pendingBugs.bugs.filter(b => !b.approved && !b.dismissed);
  if (unapproved.length === 0) return "ℹ️ No pending bugs to approve.";

  const added: string[] = [];
  for (const bug of unapproved) {
    try {
      const id = addBugToRoadmap(bug);
      added.push(id);
      bug.approved = true;
    } catch (e) {
      console.error(e);
    }
  }

  savePendingBugs(pendingBugs);
  return `✅ Approved ${added.length} bugs: ${added.join(", ")}`;
}

export function showPendingBugs(): string {
  const pendingBugs = loadPendingBugs();
  if (!pendingBugs || pendingBugs.bugs.length === 0) {
    return "✅ No pending bugs!";
  }

  const unapproved = pendingBugs.bugs.filter(b => !b.approved && !b.dismissed);
  if (unapproved.length === 0) {
    return "✅ All bugs have been processed!";
  }

  let msg = `*📋 Pending Bugs (${unapproved.length}):*\n\n`;
  for (const bug of unapproved.slice(0, 10)) {
    const emoji =
      bug.priority === "HIGH" ? "🔴" : bug.priority === "MEDIUM" ? "🟡" : "🟢";
    msg += `${emoji} \`${bug.id}\`: ${bug.title}\n`;
  }
  if (unapproved.length > 10) {
    msg += `\n_...and ${unapproved.length - 10} more_`;
  }
  msg += "\n\nSay `approve all` or `approve PENDING-xxx`";
  return msg;
}

export function getTodaysPriorities(): string {
  try {
    const roadmap = fs.readFileSync(ROADMAP_PATH, "utf-8");

    const highPattern =
      /### ([\w-]+):([^\n]+)\n[^#]*\*\*Status:\*\*\s*ready[^#]*\*\*Priority:\*\*\s*HIGH/gi;
    const matches = [...roadmap.matchAll(highPattern)];

    let msg = "*🎯 Today's Priorities:*\n\n";

    if (matches.length > 0) {
      for (const match of matches.slice(0, 5)) {
        msg += `🔴 *${match[1]}*: ${match[2].trim()}\n`;
      }
    } else {
      msg += "_No HIGH priority tasks ready._\n";
    }

    const inProgress = (roadmap.match(/\*\*Status:\*\*\s+in-progress/gi) || [])
      .length;
    msg += `\n📊 *${inProgress}* tasks currently in progress`;

    return msg;
  } catch {
    return "❌ Could not read roadmap.";
  }
}

export function getDailySummary(): string {
  try {
    const roadmap = fs.readFileSync(ROADMAP_PATH, "utf-8");

    const complete = (roadmap.match(/\*\*Status:\*\*\s+complete/gi) || [])
      .length;
    const inProgress = (roadmap.match(/\*\*Status:\*\*\s+in-progress/gi) || [])
      .length;
    const ready = (roadmap.match(/\*\*Status:\*\*\s+ready/gi) || []).length;
    const blocked = (roadmap.match(/\*\*Status:\*\*\s+blocked/gi) || []).length;
    const total = complete + inProgress + ready + blocked;
    const progress = total > 0 ? Math.round((complete / total) * 100) : 0;

    let msg = "*☀️ Daily Summary*\n\n";
    msg += `📊 *Overall Progress:* ${progress}% (${complete}/${total})\n\n`;
    msg += `• ✅ Complete: ${complete}\n`;
    msg += `• 🔄 In Progress: ${inProgress}\n`;
    msg += `• 📋 Ready: ${ready}\n`;
    msg += `• 🚫 Blocked: ${blocked}\n`;

    const pendingBugs = loadPendingBugs();
    if (
      pendingBugs &&
      pendingBugs.bugs.filter(b => !b.approved && !b.dismissed).length > 0
    ) {
      const pending = pendingBugs.bugs.filter(b => !b.approved && !b.dismissed);
      msg += `\n⚠️ *${pending.length} pending bugs* awaiting approval`;
    }

    return msg;
  } catch {
    return "❌ Could not generate summary.";
  }
}

// ============================================================================
// Quick Command Handler
// ============================================================================

export function handleQuickCommands(text: string): string | null {
  const lower = text.toLowerCase().trim();

  if (lower.startsWith("approve ")) {
    const bugId = text.substring(8).trim().toUpperCase();
    return approveBug(bugId);
  }

  if (lower.startsWith("dismiss ")) {
    const bugId = text.substring(8).trim().toUpperCase();
    return dismissBug(bugId);
  }

  if (lower === "approve all" || lower === "approve all bugs") {
    return approveAllBugs();
  }

  if (
    lower === "pending" ||
    lower === "pending bugs" ||
    lower === "show pending"
  ) {
    return showPendingBugs();
  }

  if (
    lower === "priorities" ||
    lower === "today" ||
    lower === "what should i work on"
  ) {
    return getTodaysPriorities();
  }

  if (
    lower === "summary" ||
    lower === "daily summary" ||
    lower === "morning summary"
  ) {
    return getDailySummary();
  }

  return null;
}
