import pkg from "@slack/bolt";
const { App, LogLevel } = pkg;
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  handleQuickCommands,
  loadPendingBugs,
  savePendingBugs,
  addBugToRoadmap,
  commitAndPush,
} from "./slack-bot-qa-handlers";

dotenv.config();
const execAsync = promisify(exec);

// Initialize Gemini 3.5 Pro client (latest model)
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL_NAME = "gemini-3.5-pro";

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

// Load comprehensive agent context (same as any TERP AI agent)
function loadProjectContext(): string {
  const contextParts: string[] = [];
  const cwd = process.cwd();

  // ============================================================================
  // 1. CORE IDENTITY & PROTOCOLS
  // ============================================================================
  contextParts.push("# TERP AI Agent Context\n\n");
  contextParts.push(`You are a TERP AI agent with FULL access to the project. You follow all TERP protocols.
You can help with: roadmap management, task status, code questions, deployments, QA, and infrastructure.
You have the same authority and context as any AI agent working on TERP.\n\n`);

  // Load agent onboarding (core protocols)
  const agentDocs = [
    { path: "AGENT_ONBOARDING.md", name: "Agent Onboarding" },
    {
      path: "UNIVERSAL_AGENT_SYSTEM_PROMPT.md",
      name: "Universal System Prompt",
    },
    { path: "docs/ROADMAP_AGENT_GUIDE.md", name: "Roadmap Agent Guide" },
  ];

  for (const doc of agentDocs) {
    const filePath = path.join(cwd, doc.path);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      contextParts.push(
        `## ${doc.name}\n\n${content.substring(0, 8000)}\n\n---\n\n`
      );
    }
  }

  // ============================================================================
  // 2. STEERING FILES (Full Protocol Stack)
  // ============================================================================
  const steeringDir = path.join(cwd, ".kiro/steering");
  const steeringFiles = [
    "00-core-identity.md",
    "01-development-standards.md",
    "02-workflows.md",
    "03-agent-coordination.md",
    "04-infrastructure.md",
    "99-pre-commit-checklist.md",
    "terp-master-protocol.md",
  ];

  for (const file of steeringFiles) {
    const filePath = path.join(steeringDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      contextParts.push(`## Steering: ${file}\n\n${content}\n\n---\n\n`);
    }
  }

  // ============================================================================
  // 3. CURSOR WORKSPACE RULES
  // ============================================================================
  const cursorRulesPath = path.join(
    cwd,
    ".cursor/rules/terp-agent-rules/RULE.md"
  );
  if (fs.existsSync(cursorRulesPath)) {
    const rules = fs.readFileSync(cursorRulesPath, "utf-8");
    contextParts.push(`## Cursor Workspace Rules\n\n${rules}\n\n---\n\n`);
  }

  // ============================================================================
  // 4. ROADMAP (Full - you're the roadmap manager!)
  // ============================================================================
  const roadmapPath = path.join(cwd, "docs/roadmaps/MASTER_ROADMAP.md");
  if (fs.existsSync(roadmapPath)) {
    const roadmap = fs.readFileSync(roadmapPath, "utf-8");
    // Load more of the roadmap - you need full context
    contextParts.push(
      `## MASTER ROADMAP (Full)\n\n${roadmap.substring(0, 25000)}\n\n---\n\n`
    );
  }

  // ============================================================================
  // 5. ACTIVE WORK & SESSIONS
  // ============================================================================
  const sessionsPath = path.join(cwd, "docs/ACTIVE_SESSIONS.md");
  if (fs.existsSync(sessionsPath)) {
    const sessions = fs.readFileSync(sessionsPath, "utf-8");
    contextParts.push(`## Active Sessions\n\n${sessions}\n\n---\n\n`);
  }

  const initiativePath = path.join(
    cwd,
    "docs/initiatives/BETA-READINESS-2025.md"
  );
  if (fs.existsSync(initiativePath)) {
    const initiative = fs.readFileSync(initiativePath, "utf-8");
    contextParts.push(
      `## Current Initiative\n\n${initiative.substring(0, 5000)}\n\n---\n\n`
    );
  }

  // ============================================================================
  // 6. QA & TESTING PROTOCOLS
  // ============================================================================
  const qaPath = path.join(cwd, "MEGA_QA.md");
  if (fs.existsSync(qaPath)) {
    const qa = fs.readFileSync(qaPath, "utf-8");
    contextParts.push(`## Mega QA Protocol\n\n${qa}\n\n---\n\n`);
  }

  // Load pending bugs
  const pendingBugsPath = path.join(cwd, "qa-results/pending-bugs.json");
  if (fs.existsSync(pendingBugsPath)) {
    try {
      const bugs = JSON.parse(fs.readFileSync(pendingBugsPath, "utf-8"));
      const pending =
        bugs.bugs?.filter(
          (b: { approved?: boolean; dismissed?: boolean }) =>
            !b.approved && !b.dismissed
        ) || [];
      if (pending.length > 0) {
        contextParts.push(`## Pending Bugs (${pending.length})\n\n`);
        for (const bug of pending.slice(0, 10)) {
          contextParts.push(`- ${bug.id}: ${bug.title} (${bug.priority})\n`);
        }
        contextParts.push(`\n---\n\n`);
      }
    } catch {
      // Optional
    }
  }

  // ============================================================================
  // 7. INFRASTRUCTURE INFO
  // ============================================================================
  contextParts.push(`## Infrastructure\n\n`);
  contextParts.push(`- **Platform:** DigitalOcean App Platform\n`);
  contextParts.push(`- **Database:** MySQL (managed)\n`);
  contextParts.push(`- **Deployment:** Auto-deploy on push to main\n`);
  contextParts.push(
    `- **CI/CD:** GitHub Actions (daily-qa.yml, morning-summary.yml, pre-merge.yml)\n`
  );
  contextParts.push(
    `- **Slack Bot:** Running on DigitalOcean (this instance)\n`
  );
  contextParts.push(`- **Model:** Gemini 3.5 Pro\n\n`);

  // ============================================================================
  // 8. PROJECT STATS
  // ============================================================================
  try {
    const roadmap = fs.readFileSync(roadmapPath, "utf-8");
    const complete = (roadmap.match(/\*\*Status:\*\*\s+complete/gi) || [])
      .length;
    const inProgress = (roadmap.match(/\*\*Status:\*\*\s+in-progress/gi) || [])
      .length;
    const ready = (roadmap.match(/\*\*Status:\*\*\s+ready/gi) || []).length;
    const blocked = (roadmap.match(/\*\*Status:\*\*\s+blocked/gi) || []).length;
    const total = complete + inProgress + ready + blocked;
    const progress = total > 0 ? Math.round((complete / total) * 100) : 0;

    contextParts.push(`## Project Stats\n\n`);
    contextParts.push(
      `- **Progress:** ${progress}% (${complete}/${total} tasks)\n`
    );
    contextParts.push(`- **Complete:** ${complete}\n`);
    contextParts.push(`- **In Progress:** ${inProgress}\n`);
    contextParts.push(`- **Ready:** ${ready}\n`);
    contextParts.push(`- **Blocked:** ${blocked}\n\n`);
  } catch {
    // Stats optional
  }

  return contextParts.join("");
}

// Get recent git activity
async function getRecentActivity(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      'git log -5 --pretty=format:"%h - %s (%ar)"'
    );
    return `## Recent Git Activity\n\n${stdout}\n\n`;
  } catch {
    return "";
  }
}

// Chat with Gemini 3.5 Pro
async function chatWithGemini(
  userMessage: string,
  _userId: string
): Promise<string> {
  try {
    const projectContext = loadProjectContext();
    const recentActivity = await getRecentActivity();

    const systemInstruction = `${projectContext}${recentActivity}

# YOUR ROLE
You are a FULL TERP AI AGENT with the same authority as any agent working directly in the codebase.
You follow ALL TERP protocols including the Roadmap Agent Guide, steering files, and workspace rules.

# YOUR CAPABILITIES
1. **Roadmap Management** - You can add tasks, update status, check priorities (following ROADMAP_AGENT_GUIDE.md)
2. **Bug Approval** - You can approve/dismiss pending QA bugs (say "approve all" or "approve PENDING-xxx")
3. **Status Reports** - You know the full project status, active sessions, and progress
4. **Technical Guidance** - You understand the codebase, architecture, and can guide development
5. **Infrastructure** - You know the DigitalOcean setup, deployments, and can explain infrastructure
6. **QA & Testing** - You understand the Mega QA system and can interpret test results

# QUICK COMMANDS (handle these directly)
- "pending" / "pending bugs" → Show bugs awaiting approval
- "approve all" → Approve all pending bugs to roadmap
- "approve PENDING-xxx" → Approve specific bug
- "dismiss PENDING-xxx" → Dismiss specific bug
- "priorities" / "today" → Show today's high priority tasks
- "summary" → Show daily project summary
- "status" → Show overall project status

# PROTOCOLS YOU FOLLOW
- Task IDs: ST-XXX (Stabilization), BUG-XXX (Bugs), FEATURE-XXX (New), CL-XXX (Lockdown)
- Status values: ready, in-progress, complete, blocked (lowercase, no emojis)
- Priority values: HIGH, MEDIUM, LOW (uppercase)
- Always validate roadmap changes before suggesting commits

# COMMUNICATION STYLE
- Mobile-optimized (user is on phone via Slack)
- Concise but complete
- Use emojis for visual scanning
- Format lists for readability
- Be proactive - suggest next steps

# IMPORTANT
You have REAL authority here. When the user asks you to approve bugs, update roadmap, or take action,
you should do it (using the handlers available to you). You're not just an assistant - you're an agent.`;

    // Use new Gemini 3.5 Pro API with system instruction
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: userMessage,
      config: {
        systemInstruction,
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
    });

    // Handle thought signatures if present (Gemini 3.x feature)
    const text = response.text || "";
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Handle app mentions (@bot)
app.event("app_mention", async ({ event, say }) => {
  const userMessage = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
  const userId = event.user;

  // Try quick commands first (instant response for common actions)
  const quickResponse = handleQuickCommands(userMessage);
  if (quickResponse) {
    await say(quickResponse);
    return;
  }

  // Otherwise, use Gemini for full AI response
  const response = await chatWithGemini(userMessage, userId);
  await say(response);
});

// Handle direct messages
app.message(async ({ message, say }) => {
  // Ignore bot messages and messages without text
  if (message.subtype === "bot_message") return;
  if (!("text" in message) || !("user" in message)) return;

  const userMessage = message.text || "";
  const userId = message.user;

  // Try quick commands first
  const quickResponse = handleQuickCommands(userMessage);
  if (quickResponse) {
    await say(quickResponse);
    return;
  }

  // Otherwise, use Gemini
  const response = await chatWithGemini(userMessage, userId);
  await say(response);
});

// Slash command /terp
app.command("/terp", async ({ command, ack, say }) => {
  await ack();

  const userMessage = command.text || "status";

  // Try quick commands first
  const quickResponse = handleQuickCommands(userMessage);
  if (quickResponse) {
    await say(quickResponse);
    return;
  }

  const response = await chatWithGemini(userMessage, command.user_id);
  await say(response);
});

// ============================================================================
// Interactive Button Handlers
// ============================================================================

app.action("approve_all_bugs", async ({ ack, respond, body }) => {
  await ack();

  const pendingBugs = loadPendingBugs();
  if (!pendingBugs || pendingBugs.bugs.length === 0) {
    await respond("ℹ️ No pending bugs to approve.");
    return;
  }

  const unapproved = pendingBugs.bugs.filter(b => !b.approved && !b.dismissed);
  if (unapproved.length === 0) {
    await respond("ℹ️ All bugs have already been processed.");
    return;
  }

  await respond("⏳ Adding bugs to roadmap...");

  const addedBugs: string[] = [];
  for (const bug of unapproved) {
    try {
      const bugId = addBugToRoadmap(bug);
      addedBugs.push(bugId);
      bug.approved = true;
    } catch (e) {
      console.error(`Failed to add bug ${bug.id}:`, e);
    }
  }

  savePendingBugs(pendingBugs);
  const committed = await commitAndPush(
    `chore(qa): add ${addedBugs.length} bugs from nightly QA [skip ci]`
  );

  const userId =
    "user" in body ? (body as { user: { id: string } }).user.id : "unknown";
  await respond({
    text:
      `✅ *${addedBugs.length} bugs added to roadmap!*\n\n` +
      `Added: ${addedBugs.join(", ")}\n` +
      `Approved by: <@${userId}>\n` +
      (committed
        ? "📤 Pushed to GitHub"
        : "⚠️ Git push failed (manual push needed)"),
    replace_original: false,
  });
});

app.action("dismiss_all_bugs", async ({ ack, respond, body }) => {
  await ack();

  const pendingBugs = loadPendingBugs();
  if (!pendingBugs || pendingBugs.bugs.length === 0) {
    await respond("ℹ️ No pending bugs to dismiss.");
    return;
  }

  const unapproved = pendingBugs.bugs.filter(b => !b.approved && !b.dismissed);
  unapproved.forEach(b => (b.dismissed = true));
  savePendingBugs(pendingBugs);

  const userId =
    "user" in body ? (body as { user: { id: string } }).user.id : "unknown";
  await respond({
    text: `❌ *${unapproved.length} bugs dismissed*\n\nDismissed by: <@${userId}>`,
    replace_original: false,
  });
});

app.action("review_bugs", async ({ ack, respond }) => {
  await ack();

  const pendingBugs = loadPendingBugs();
  if (!pendingBugs || pendingBugs.bugs.length === 0) {
    await respond("ℹ️ No pending bugs to review.");
    return;
  }

  let details = "*📋 Pending Bugs Details:*\n\n";

  for (const bug of pendingBugs.bugs.slice(0, 10)) {
    const emoji =
      bug.priority === "HIGH" ? "🔴" : bug.priority === "MEDIUM" ? "🟡" : "🟢";
    details += `${emoji} *${bug.id}*: ${bug.title}\n`;
    details += `   📁 \`${bug.specFile}\`\n`;
    details += `   🔄 \`${bug.replayCommand}\`\n\n`;
  }

  if (pendingBugs.bugs.length > 10) {
    details += `\n_...and ${pendingBugs.bugs.length - 10} more_`;
  }

  details += "\n\n*To approve specific bugs:* `/terp approve PENDING-xxx`";
  details += "\n*To dismiss specific bugs:* `/terp dismiss PENDING-xxx`";

  await respond({ text: details, replace_original: false });
});

// Handle morning summary actions
app.action("show_roadmap", async ({ ack, respond }) => {
  await ack();
  await respond(
    "📋 View the full roadmap at: `docs/roadmaps/MASTER_ROADMAP.md`"
  );
});

app.action("start_chat", async ({ ack, respond }) => {
  await ack();
  await respond(
    "💬 Just type a message and I'll help! Ask me anything about the project."
  );
});

// ============================================================================
// Message Handler
// ============================================================================

app.message(async ({ message, say }) => {
  if (message.subtype === "bot_message") return;
  if (!("text" in message) || !("user" in message)) return;

  const userMessage = message.text;
  const userId = message.user;

  // Check for quick commands first
  const quickResponse = handleQuickCommands(userMessage || "");
  if (quickResponse) {
    await say(quickResponse);
    return;
  }

  // Show typing indicator
  try {
    await app.client.chat.postMessage({
      channel: message.channel,
      text: "💭 Thinking...",
    });
  } catch {
    // Typing indicator optional
  }

  // Get response from Gemini
  const response = await chatWithGemini(userMessage || "", userId);
  await say(response);
});

// ============================================================================
// Start
// ============================================================================

(async () => {
  await app.start();
  console.log("⚡️ TERP AI Assistant is running!");
  console.log("🤖 Natural language interface enabled");
  console.log("📚 All steering files loaded as context");
  console.log("💬 Users can chat naturally via DM or @mention");
  console.log("🐛 QA Bug approval system active");
  console.log("📋 Commands: approve, dismiss, pending, priorities, summary");
})();
