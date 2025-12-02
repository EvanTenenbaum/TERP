import { App, LogLevel } from '@slack/bolt';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();
const execAsync = promisify(exec);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
  
  // 1. Load all steering files
  const steeringDir = path.join(process.cwd(), '.kiro/steering');
  const steeringFiles = [
    '00-core-identity.md',
    '01-development-standards.md',
    '02-workflows.md',
    '03-agent-coordination.md',
    '04-infrastructure.md',
    '99-pre-commit-checklist.md',
    'README.md',
    'terp-master-protocol.md',
  ];
  
  contextParts.push('# TERP Project Context\n\n');
  contextParts.push('You are the TERP AI assistant, accessible via Slack. You have full context of the project.\n\n');
  
  for (const file of steeringFiles) {
    const filePath = path.join(steeringDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      contextParts.push(`## Steering File: ${file}\n\n${content}\n\n---\n\n`);
    }
  }
  
  // 2. Load roadmap summary
  const roadmapPath = path.join(process.cwd(), 'docs/roadmaps/MASTER_ROADMAP.md');
  if (fs.existsSync(roadmapPath)) {
    const roadmap = fs.readFileSync(roadmapPath, 'utf-8');
    // Get first 5000 chars for context (full roadmap is too large)
    contextParts.push(`## Current Roadmap (Summary)\n\n${roadmap.substring(0, 5000)}...\n\n---\n\n`);
  }
  
  // 3. Load active sessions
  const sessionsPath = path.join(process.cwd(), 'docs/ACTIVE_SESSIONS.md');
  if (fs.existsSync(sessionsPath)) {
    const sessions = fs.readFileSync(sessionsPath, 'utf-8');
    contextParts.push(`## Active Sessions\n\n${sessions}\n\n---\n\n`);
  }
  
  // 4. Load beta readiness initiative
  const initiativePath = path.join(process.cwd(), 'docs/initiatives/BETA-READINESS-2025.md');
  if (fs.existsSync(initiativePath)) {
    const initiative = fs.readFileSync(initiativePath, 'utf-8');
    contextParts.push(`## Current Initiative\n\n${initiative}\n\n---\n\n`);
  }
  
  // 5. Add project stats
  try {
    const roadmap = fs.readFileSync(roadmapPath, 'utf-8');
    const complete = (roadmap.match(/\*\*Status:\*\*\s+complete/gi) || []).length;
    const inProgress = (roadmap.match(/\*\*Status:\*\*\s+in-progress/gi) || []).length;
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
  } catch (error) {
    // Stats optional
  }
  
  return contextParts.join('');
}

// Get recent git activity
async function getRecentActivity(): Promise<string> {
  try {
    const { stdout } = await execAsync('git log -5 --pretty=format:"%h - %s (%ar)"');
    return `## Recent Git Activity\n\n${stdout}\n\n`;
  } catch (error) {
    return '';
  }
}

// Chat with Claude
async function chatWithClaude(userMessage: string, userId: string): Promise<string> {
  try {
    // Load full project context
    const projectContext = loadProjectContext();
    const recentActivity = await getRecentActivity();
    
    // Build system prompt
    const systemPrompt = `${projectContext}${recentActivity}

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

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });
    
    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text');
    return textContent ? textContent.text : 'Sorry, I could not generate a response.';
    
  } catch (error) {
    console.error('Claude API Error:', error);
    return `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Handle direct messages to the bot
app.message(async ({ message, say }) => {
  // Ignore bot messages
  if (message.subtype === 'bot_message') return;
  
  // Type guard
  if (!('text' in message) || !('user' in message)) return;
  
  const userMessage = message.text;
  const userId = message.user;
  
  // Show typing indicator
  try {
    await app.client.chat.postMessage({
      channel: message.channel,
      text: '💭 Thinking...',
    });
  } catch (e) {
    // Typing indicator optional
  }
  
  // Get response from Claude
  const response = await chatWithClaude(userMessage, userId);
  
  // Send response
  await say(response);
});

// Handle app mentions (@bot)
app.event('app_mention', async ({ event, say }) => {
  const userMessage = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
  const userId = event.user;
  
  const response = await chatWithClaude(userMessage, userId);
  await say(response);
});

// Quick command shortcuts (optional, for backwards compatibility)
app.command('/terp', async ({ command, ack, say }) => {
  await ack();
  
  const userMessage = command.text || 'status';
  const response = await chatWithClaude(userMessage, command.user_id);
  
  await say(response);
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ TERP AI Assistant is running!');
  console.log('🤖 Natural language interface enabled');
  console.log('📚 All steering files loaded as context');
  console.log('💬 Users can chat naturally via DM or @mention');
})();
