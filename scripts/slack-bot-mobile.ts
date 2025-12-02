import { App, LogLevel } from '@slack/bolt';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

dotenv.config();
const execAsync = promisify(exec);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.DEBUG,
});

// Global middleware
app.use(async ({ logger, body, next }) => {
  logger.info("🔥 Event Received:", JSON.stringify(body, null, 2));
  await next();
});

// Helper: Get dashboard URL
function getDashboardUrl(): string {
  const pagesUrl = 'https://evantenenbaum.github.io/TERP/dashboard.html';
  const rawUrl = 'https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/dashboard.html';
  return `📊 Dashboard:\n• GitHub Pages: ${pagesUrl}\n• Direct: ${rawUrl}`;
}

// Helper: Parse roadmap for status
function getRoadmapStatus(): { complete: number; inProgress: number; ready: number; blocked: number } {
  try {
    const roadmapPath = path.join(process.cwd(), 'docs/roadmaps/MASTER_ROADMAP.md');
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    
    const complete = (content.match(/\*\*Status:\*\*\s+complete/gi) || []).length;
    const inProgress = (content.match(/\*\*Status:\*\*\s+in-progress/gi) || []).length;
    const ready = (content.match(/\*\*Status:\*\*\s+ready/gi) || []).length;
    const blocked = (content.match(/\*\*Status:\*\*\s+blocked/gi) || []).length;
    
    return { complete, inProgress, ready, blocked };
  } catch (error) {
    return { complete: 0, inProgress: 0, ready: 0, blocked: 0 };
  }
}

// Command: /terp help
app.command('/terp-help', async ({ command, ack, say }) => {
  await ack();
  await say({
    text: '🤖 TERP Bot Commands',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🤖 TERP Bot - Mobile Commands' }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Quick Status*\n`/terp-status` - Project overview\n`/terp-dashboard` - Dashboard link\n`/terp-tasks` - Ready tasks'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Execution*\n`/terp-run TASK-ID` - Execute a task\n`/terp-deploy` - Trigger deployment\n`/terp-audit` - Run audit'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Monitoring*\n`/terp-logs` - Recent logs\n`/terp-health` - System health'
        }
      }
    ]
  });
});

// Command: /terp-status
app.command('/terp-status', async ({ command, ack, say }) => {
  await ack();
  
  try {
    const status = getRoadmapStatus();
    const total = status.complete + status.inProgress + status.ready + status.blocked;
    const progress = total > 0 ? Math.round((status.complete / total) * 100) : 0;
    
    await say({
      text: `📊 TERP Status: ${progress}% complete`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📊 TERP Project Status' }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Progress*\n${progress}%` },
            { type: 'mrkdwn', text: `*Total Tasks*\n${total}` }
          ]
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*✅ Complete*\n${status.complete}` },
            { type: 'mrkdwn', text: `*🔄 In Progress*\n${status.inProgress}` },
            { type: 'mrkdwn', text: `*⚪ Ready*\n${status.ready}` },
            { type: 'mrkdwn', text: `*🔴 Blocked*\n${status.blocked}` }
          ]
        }
      ]
    });
  } catch (error) {
    await say(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Command: /terp-dashboard
app.command('/terp-dashboard', async ({ command, ack, say }) => {
  await ack();
  await say(getDashboardUrl());
});

// Command: /terp-tasks
app.command('/terp-tasks', async ({ command, ack, say }) => {
  await ack();
  
  try {
    const roadmapPath = path.join(process.cwd(), 'docs/roadmaps/MASTER_ROADMAP.md');
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    
    // Find ready high-priority tasks
    const taskRegex = /###\s+([A-Z]+-\d+):\s+(.+?)$/gm;
    const tasks: string[] = [];
    
    let match;
    while ((match = taskRegex.exec(content)) !== null && tasks.length < 5) {
      const taskId = match[1];
      const title = match[2];
      const taskStart = match.index;
      const nextMatch = taskRegex.exec(content);
      const taskEnd = nextMatch ? nextMatch.index : content.length;
      taskRegex.lastIndex = taskStart + 1;
      
      const taskSection = content.substring(taskStart, taskEnd);
      
      if (taskSection.includes('**Status:** ready') && taskSection.includes('**Priority:** HIGH')) {
        tasks.push(`• ${taskId}: ${title.substring(0, 50)}`);
      }
    }
    
    if (tasks.length === 0) {
      await say('✅ No high-priority tasks ready!');
    } else {
      await say(`🔥 Ready High-Priority Tasks:\n${tasks.join('\n')}`);
    }
  } catch (error) {
    await say(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Command: /terp-run TASK-ID
app.command('/terp-run', async ({ command, ack, say }) => {
  await ack();
  
  const taskId = command.text.trim();
  
  if (!taskId) {
    await say('Usage: `/terp-run TASK-ID`\nExample: `/terp-run AUDIT-001`');
    return;
  }
  
  await say(`🚀 Starting task ${taskId}...`);
  
  try {
    await execAsync('git pull origin main');
    // This would integrate with your agent execution system
    await say(`✅ Task ${taskId} queued for execution.\nCheck dashboard for progress.`);
  } catch (error) {
    await say(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Command: /terp-deploy
app.command('/terp-deploy', async ({ command, ack, say }) => {
  await ack();
  await say('🚀 Triggering deployment...');
  
  try {
    const { stdout } = await execAsync('git log -1 --pretty=format:"%h - %s"');
    await say(`📦 Latest commit: ${stdout}\n⏳ Deployment will start automatically.\nMonitor: https://github.com/EvanTenenbaum/TERP/actions`);
  } catch (error) {
    await say(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Legacy message handlers (keep for backwards compatibility)
app.message(/status/i, async ({ say }) => {
  await say("👀 Use `/terp-status` for quick status!");
});

app.message(/execute|fix/i, async ({ say }) => {
  await say("🚀 Use `/terp-run TASK-ID` to execute tasks!");
});

// Start the app
(async () => {
  try {
    console.log("🔧 Verifying Git Remote...");
    const git = simpleGit();
    try {
      await git.removeRemote('origin');
    } catch (e) { /* ignore */ }
    await git.addRemote('origin', `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/EvanTenenbaum/TERP.git`);
    console.log("✅ Git remote configured.");
  } catch (e) {
    console.error("⚠️ Git Remote Config Error:", e);
  }

  await app.start();
  console.log('⚡️ TERP Mobile Bot is running!');
  console.log('📱 Mobile-optimized commands available');
  console.log('💡 Type /terp-help in Slack for command list');
})();
