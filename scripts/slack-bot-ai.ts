#!/usr/bin/env tsx
/**
 * INFRA-012: TERP Commander Slack Bot
 *
 * A Slack bot for managing TERP operations, including:
 * - Slash commands for common operations
 * - Deployment notifications
 * - Status queries and monitoring
 * - Swarm agent orchestration
 *
 * Usage:
 *   tsx scripts/slack-bot-ai.ts
 *
 * Environment Variables:
 *   SLACK_BOT_TOKEN - Slack Bot OAuth token (xoxb-...)
 *   SLACK_APP_TOKEN - Slack App-level token (xapp-...)
 *   SLACK_SIGNING_SECRET - Slack signing secret
 *   ANTHROPIC_API_KEY - Anthropic API key (optional, for AI features)
 *   OPENAI_API_KEY - OpenAI API key (optional, for AI features)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import crypto from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.SLACK_BOT_PORT || '3001', 10);
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// Context file paths
const ROADMAP_PATH = 'docs/roadmaps/MASTER_ROADMAP.md';
const STEERING_DIR = '.kiro/steering';
const SESSIONS_DIR = 'docs/sessions';

// ============================================================================
// TYPES
// ============================================================================

interface SlackCommand {
  command: string;
  text: string;
  user_id: string;
  user_name: string;
  channel_id: string;
  response_url: string;
  trigger_id: string;
}

interface SlackEvent {
  type: string;
  user: string;
  channel: string;
  text: string;
  ts: string;
  event_ts: string;
}

interface SlackPayload {
  type: string;
  challenge?: string;
  event?: SlackEvent;
  command?: string;
}

interface CommandHandler {
  description: string;
  usage: string;
  handler: (args: string[], command: SlackCommand) => Promise<string>;
}

// ============================================================================
// SLACK API UTILITIES
// ============================================================================

function slackApiRequest(method: string, endpoint: string, body?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';

    const options = {
      hostname: 'slack.com',
      port: 443,
      path: `/api/${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error || 'Slack API error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function sendMessage(channel: string, text: string, blocks?: any[]): Promise<void> {
  const body: any = { channel, text };
  if (blocks) body.blocks = blocks;
  await slackApiRequest('POST', 'chat.postMessage', body);
}

async function respondToCommand(responseUrl: string, text: string, isEphemeral: boolean = true): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      response_type: isEphemeral ? 'ephemeral' : 'in_channel',
    });

    const urlObj = new URL(responseUrl);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============================================================================
// CONTEXT LOADING
// ============================================================================

function loadRoadmapStatus(): { phase: string; tasks: { pending: number; completed: number; inProgress: number }; priorities: string[] } {
  try {
    if (!existsSync(ROADMAP_PATH)) {
      return { phase: 'Unknown', tasks: { pending: 0, completed: 0, inProgress: 0 }, priorities: [] };
    }

    const content = readFileSync(ROADMAP_PATH, 'utf-8');

    // Extract phase
    const phaseMatch = content.match(/## Current Phase[:\s]+(.+)/i);
    const phase = phaseMatch ? phaseMatch[1].trim() : 'Unknown';

    // Count tasks by status
    const pendingMatches = content.match(/Status:\*\*\s*(Pending|Not Started|Ready)/gi) || [];
    const completedMatches = content.match(/Status:\*\*\s*(Complete|Done|Finished)/gi) || [];
    const inProgressMatches = content.match(/Status:\*\*\s*(In Progress|Active|Working)/gi) || [];

    // Extract high priority tasks
    const priorityPattern = /###\s+([A-Z]+-\d+).*Priority:\*\*\s*(HIGH|CRITICAL|P0|P1)/gis;
    const priorities: string[] = [];
    let match;
    while ((match = priorityPattern.exec(content)) !== null) {
      priorities.push(match[1]);
    }

    return {
      phase,
      tasks: {
        pending: pendingMatches.length,
        completed: completedMatches.length,
        inProgress: inProgressMatches.length,
      },
      priorities: priorities.slice(0, 5),
    };
  } catch (error) {
    console.error('Error loading roadmap:', error);
    return { phase: 'Error', tasks: { pending: 0, completed: 0, inProgress: 0 }, priorities: [] };
  }
}

function loadRecentCommits(count: number = 5): string[] {
  try {
    const output = execSync(`git log -${count} --format="%h %s" 2>/dev/null`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function loadDeploymentStatus(): { status: string; lastDeploy: string; commitSha: string } {
  try {
    // Check for latest deployment status file
    const statusFiles = execSync('ls -t .deployment-status-*.log 2>/dev/null | head -1', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();

    if (statusFiles) {
      const content = readFileSync(statusFiles, 'utf-8');
      const successMatch = content.includes('succeeded') || content.includes('PASSED');
      const failMatch = content.includes('failed') || content.includes('FAILED');
      const sha = statusFiles.match(/status-([a-f0-9]+)\./)?.[1] || 'unknown';

      return {
        status: successMatch ? 'Healthy' : failMatch ? 'Failed' : 'Unknown',
        lastDeploy: new Date().toISOString(),
        commitSha: sha,
      };
    }
  } catch {
    // Fall through to default
  }

  return { status: 'Unknown', lastDeploy: 'Unknown', commitSha: 'Unknown' };
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

const commands: Record<string, CommandHandler> = {
  status: {
    description: 'Get current TERP project status',
    usage: '/terp status',
    handler: async () => {
      const roadmap = loadRoadmapStatus();
      const commits = loadRecentCommits(3);
      const deploy = loadDeploymentStatus();

      const totalTasks = roadmap.tasks.pending + roadmap.tasks.completed + roadmap.tasks.inProgress;
      const progress = totalTasks > 0 ? Math.round((roadmap.tasks.completed / totalTasks) * 100) : 0;

      let response = `*TERP Project Status*\n\n`;
      response += `*Phase:* ${roadmap.phase}\n`;
      response += `*Progress:* ${progress}% complete\n\n`;
      response += `*Tasks:*\n`;
      response += `  - Completed: ${roadmap.tasks.completed}\n`;
      response += `  - In Progress: ${roadmap.tasks.inProgress}\n`;
      response += `  - Pending: ${roadmap.tasks.pending}\n\n`;

      if (roadmap.priorities.length > 0) {
        response += `*High Priority:* ${roadmap.priorities.join(', ')}\n\n`;
      }

      response += `*Deployment:* ${deploy.status} (${deploy.commitSha})\n\n`;

      if (commits.length > 0) {
        response += `*Recent Commits:*\n`;
        commits.forEach(c => { response += `  - ${c}\n`; });
      }

      return response;
    },
  },

  deploy: {
    description: 'Get deployment information or trigger actions',
    usage: '/terp deploy [status|logs|verify]',
    handler: async (args) => {
      const action = args[0] || 'status';

      switch (action) {
        case 'status': {
          const deploy = loadDeploymentStatus();
          return `*Deployment Status:* ${deploy.status}\n*Last Deploy:* ${deploy.lastDeploy}\n*Commit:* ${deploy.commitSha}`;
        }

        case 'verify': {
          try {
            const result = execSync('pnpm tsx scripts/deployment-enforcement.ts check 2>&1', {
              encoding: 'utf-8',
              timeout: 30000,
            });
            return `*Health Check Result:*\n\`\`\`${result}\`\`\``;
          } catch (error) {
            return `Health check failed: ${error instanceof Error ? error.message : error}`;
          }
        }

        case 'logs': {
          return 'Deployment logs are available in the GitHub Actions workflow runs.';
        }

        default:
          return `Unknown deploy action: ${action}. Use: status, logs, verify`;
      }
    },
  },

  swarm: {
    description: 'Manage swarm agents',
    usage: '/terp swarm [status|start|stop]',
    handler: async (args) => {
      const action = args[0] || 'status';

      switch (action) {
        case 'status': {
          try {
            const result = execSync('pnpm swarm status 2>&1 | head -20', {
              encoding: 'utf-8',
              timeout: 30000,
            });
            return `*Swarm Status:*\n\`\`\`${result}\`\`\``;
          } catch (error) {
            return `Swarm status check failed: ${error instanceof Error ? error.message : error}`;
          }
        }

        case 'start':
          return 'To start swarm agents, trigger the Swarm Manual Start workflow in GitHub Actions.';

        case 'stop':
          return 'Swarm agents stop automatically after completing their batch. No manual stop required.';

        default:
          return `Unknown swarm action: ${action}. Use: status, start, stop`;
      }
    },
  },

  tasks: {
    description: 'List tasks from the roadmap',
    usage: '/terp tasks [pending|completed|priority]',
    handler: async (args) => {
      const filter = args[0] || 'pending';
      const roadmap = loadRoadmapStatus();

      switch (filter) {
        case 'priority':
          if (roadmap.priorities.length === 0) {
            return 'No high priority tasks found.';
          }
          return `*High Priority Tasks:*\n${roadmap.priorities.map(t => `  - ${t}`).join('\n')}`;

        case 'pending':
          return `*Pending Tasks:* ${roadmap.tasks.pending} tasks\n\nUse \`/terp tasks priority\` to see high priority items.`;

        case 'completed':
          return `*Completed Tasks:* ${roadmap.tasks.completed} tasks`;

        default:
          return `Unknown filter: ${filter}. Use: pending, completed, priority`;
      }
    },
  },

  commits: {
    description: 'Show recent commits',
    usage: '/terp commits [count]',
    handler: async (args) => {
      const count = parseInt(args[0] || '5', 10);
      const commits = loadRecentCommits(Math.min(count, 10));

      if (commits.length === 0) {
        return 'No recent commits found.';
      }

      return `*Recent Commits:*\n${commits.map(c => `  - ${c}`).join('\n')}`;
    },
  },

  help: {
    description: 'Show available commands',
    usage: '/terp help',
    handler: async () => {
      let response = '*TERP Commander - Available Commands:*\n\n';

      for (const [name, cmd] of Object.entries(commands)) {
        response += `*${name}* - ${cmd.description}\n`;
        response += `  Usage: \`${cmd.usage}\`\n\n`;
      }

      return response;
    },
  },
};

// ============================================================================
// REQUEST HANDLING
// ============================================================================

function verifySlackSignature(req: IncomingMessage, body: string): boolean {
  if (!SLACK_SIGNING_SECRET) return true; // Skip verification if not configured

  const timestamp = req.headers['x-slack-request-timestamp'] as string;
  const signature = req.headers['x-slack-signature'] as string;

  if (!timestamp || !signature) return false;

  // Check timestamp freshness (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', SLACK_SIGNING_SECRET)
    .update(sigBasestring)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(mySignature)
  );
}

async function handleSlashCommand(command: SlackCommand): Promise<void> {
  const parts = command.text.trim().split(/\s+/);
  const cmdName = parts[0]?.toLowerCase() || 'help';
  const args = parts.slice(1);

  const handler = commands[cmdName];

  if (!handler) {
    await respondToCommand(
      command.response_url,
      `Unknown command: \`${cmdName}\`. Use \`/terp help\` to see available commands.`
    );
    return;
  }

  try {
    const response = await handler.handler(args, command);
    await respondToCommand(command.response_url, response);
  } catch (error) {
    console.error(`Error handling command ${cmdName}:`, error);
    await respondToCommand(
      command.response_url,
      `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'terp-commander' }));
    return;
  }

  // Only handle POST requests to /slack
  if (req.method !== 'POST' || !req.url?.startsWith('/slack')) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  // Read body
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  // Verify signature
  if (!verifySlackSignature(req, body)) {
    res.writeHead(403);
    res.end('Invalid signature');
    return;
  }

  const contentType = req.headers['content-type'] || '';

  try {
    // Handle slash commands (form-urlencoded)
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body);
      const command: SlackCommand = {
        command: params.get('command') || '',
        text: params.get('text') || '',
        user_id: params.get('user_id') || '',
        user_name: params.get('user_name') || '',
        channel_id: params.get('channel_id') || '',
        response_url: params.get('response_url') || '',
        trigger_id: params.get('trigger_id') || '',
      };

      // Acknowledge immediately
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Processing...');

      // Process command asynchronously
      handleSlashCommand(command).catch(console.error);
      return;
    }

    // Handle events (JSON)
    if (contentType.includes('application/json')) {
      const payload: SlackPayload = JSON.parse(body);

      // URL verification challenge
      if (payload.type === 'url_verification' && payload.challenge) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(payload.challenge);
        return;
      }

      // Acknowledge event
      res.writeHead(200);
      res.end();

      // Handle event (if needed in future)
      if (payload.event) {
        console.log('Received event:', payload.event.type);
      }
      return;
    }

    res.writeHead(400);
    res.end('Bad Request');
  } catch (error) {
    console.error('Error handling request:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

function startServer(): void {
  console.log('\n========================================');
  console.log('TERP Commander Slack Bot');
  console.log('========================================\n');

  if (!SLACK_BOT_TOKEN) {
    console.warn('WARNING: SLACK_BOT_TOKEN not set. Bot will start but cannot send messages.');
  }

  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('Unhandled error:', error);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Slack events: http://localhost:${PORT}/slack/events`);
    console.log(`Slack commands: http://localhost:${PORT}/slack/commands`);
    console.log('\nReady to receive Slack commands!\n');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// ============================================================================
// MAIN
// ============================================================================

startServer();
