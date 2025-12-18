import pkg from "@slack/bolt";
const { App, LogLevel } = pkg;
import { GoogleGenerativeAI } from "@google/generative-ai";
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

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

// Load all steering files and context
function loadProjectContext(): string {
  const contextParts: string[] = [];
  const steeringDir = path.join(process.cwd(), ".kiro/steering");
  const steeringFiles = [
    "00-core-identity.md",
    "01-development-standards.md",
    "02-workflows.md",
    "03-agent-coordination.md",
    "04-infrastructure.md",
    "99-pre-commit-checklist.md",
    "README.md",
    "terp-master-protocol.md",
  ];

  contextParts.push("# TERP Project Context\n\n");
  contextParts.push(
    "You are the TERP AI assistant, accessible via Slack. You have full context of the project.\n\n"
  );

  for (const file of steeringFiles) {
    const filePath = path.join(steeringDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      contextParts.push(`## Steering File: ${file}\n\n${content}\n\n---\n\n`);
    }
  }

  // Load roadmap summary
  const roadmapPath = path.join(
    process.cwd(),
    "docs/roadmaps/MASTER_ROADMAP.md"
  );
  if (fs.existsSync(roadmapPath)) {
    const roadmap = fs.readFileSync(roadmapPath, "utf-8");
    contextParts.push(
      `## Current Roadmap (Summary)\n\n${roadmap.substring(0, 5000)}...\n\n---\n\n`
    );
  }

  // Load active sessions
  const sessionsPath = path.join(process.cwd(), "docs/ACTIVE_SESSIONS.md");
  if (fs.existsSync(sessionsPath)) {
    const sessions = fs.readFileSync(sessionsPath, "utf-8");
    contextParts.push(`## Active Sessions\n\n${sessions}\n\n---\n\n`);
  }

  // Load beta readiness initiative
  const initiativePath = path.join(
    process.cwd(),
    "docs/initiatives/BETA-READINESS-2025.md"
  );
  if (fs.existsSync(initiativePath)) {
    const initiative = fs.readFileSync(initiativePath, "utf-8");
    contextParts.push(`## Current Initiative\n\n${initiative}\n\n---\n\n`);
  }

  // Add project stats
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

    contextParts.push(`## Current Project Stats\n\n`);
    contextParts.push(`- Progress: ${progress}%\n`);
    contextParts.push(`- Complete: ${complete}\n`);
    contextParts.push(`- In Progress: ${inProgress}\n`);
    contextParts.push(`- Ready: ${ready}\n`);
    contextParts.push(`- Blocked: ${blocked}\n\n`);
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

// Chat with Gemini
async function chatWithGemini(
  userMessage: string,
  _userId: string
): Promise<string> {
  try {
    const projectContext = loadProjectContext();
    const recentActivity = await getRecentActivity();

    const systemInstruction = `${projectContext}${recentActivity}

You are the TERP AI assistant, accessible via Slack. You have complete context of the project including:
- All steering files and protocols
- Current roadmap and task status
- Active sessions and initiatives
- Recent git activity

The user is messaging you from their mobile device via Slack. Provide helpful, concise responses.

Key capabilities:
- Answer questions about the project
- Explain tasks and their status
- Provide guidance on next steps
- Help with technical decisions
- Execute commands when requested

When the user asks you to do something (like "run AUDIT-001" or "update the dashboard"), 
acknowledge it and explain what would happen, but note that actual execution requires 
running commands on the server (which can be set up).

Be conversational, helpful, and concise. Format responses for mobile readability.`;

    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
      systemInstruction,
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Handle app mentions (@bot)
app.event("app_mention", async ({ event, say }) => {
  const userMessage = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
  const userId = event.user;

  const response = await chatWithGemini(userMessage, userId);
  await say(response);
});

// Quick command shortcuts
app.command("/terp", async ({ command, ack, say }) => {
  await ack();

  const userMessage = command.text || "status";
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
