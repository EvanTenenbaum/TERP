#!/usr/bin/env tsx

/**
 * TERP Commander - Slack Bot
 * 
 * Long-running Slack bot that executes swarm manager commands.
 * Designed to run as a DigitalOcean Worker.
 */

import { App } from '@slack/bolt';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Slack Bot Configuration
// Supports both Socket Mode and HTTP mode
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN; // For Socket Mode
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET; // For HTTP Mode
const PORT = process.env.PORT || 3000;

// Git Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!SLACK_BOT_TOKEN) {
  console.error('❌ SLACK_BOT_TOKEN environment variable is required');
  process.exit(1);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Configure Git for bot operations
 */
function configureGit(): void {
  try {
    // Set git user
    execSync('git config --global user.email "bot@terp.ai"', { stdio: 'ignore' });
    execSync('git config --global user.name "TERP Commander"', { stdio: 'ignore' });
    console.log('✅ Git user configured');
    
    // Update remote URL with token if provided
    if (GITHUB_TOKEN) {
      const remoteUrl = `https://x-access-token:${GITHUB_TOKEN}@github.com/EvanTenenbaum/TERP.git`;
      execSync(`git remote set-url origin ${remoteUrl}`, { stdio: 'ignore' });
      console.log('✅ Git remote URL updated with token');
    } else {
      console.log('⚠️  GITHUB_TOKEN not set, using existing git remote');
    }
  } catch (error) {
    console.error('⚠️  Git configuration warning:', error instanceof Error ? error.message : String(error));
    // Don't exit - git might already be configured
  }
}

/**
 * Execute manager.ts command and return output
 */
function executeManagerCommand(command: string): { stdout: string; stderr: string; success: boolean } {
  try {
    const fullCommand = `npx tsx scripts/manager.ts ${command}`;
    const stdout = execSync(fullCommand, { 
      encoding: 'utf-8',
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });
    
    return {
      stdout: stdout.trim(),
      stderr: '',
      success: true
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Try to extract stderr if available
    let stderr = errorMessage;
    if (error instanceof Error && 'stderr' in error) {
      stderr = String((error as any).stderr);
    }
    
    return {
      stdout: '',
      stderr: stderr,
      success: false
    };
  }
}

// ============================================================================
// SLACK BOT SETUP
// ============================================================================

// Initialize Slack app
// Use Socket Mode if SLACK_APP_TOKEN is provided, otherwise use HTTP mode
const app = SLACK_APP_TOKEN
  ? new App({
      token: SLACK_BOT_TOKEN,
      appToken: SLACK_APP_TOKEN,
      socketMode: true,
    })
  : new App({
      token: SLACK_BOT_TOKEN,
      signingSecret: SLACK_SIGNING_SECRET || '',
    });

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

app.message(async ({ message, say, client }) => {
  // Only respond to messages that mention the bot
  // Check if message is a direct mention or DM
  const text = 'text' in message ? String(message.text || '') : '';
  
  // Skip if no text content
  if (!text) {
    return;
  }
  
  const botUserId = (await client.auth.test()).user_id;
  const botMention = `<@${botUserId}>`;
  
  // Check if bot is mentioned or if it's a DM
  const isMentioned = text.includes(botMention);
  const isDM = 'channel_type' in message && message.channel_type === 'im';
  
  if (!isMentioned && !isDM) {
    return; // Ignore messages that don't mention the bot
  }
  
  // Extract command text (remove bot mention)
  const commandText = text.replace(botMention, '').trim().toLowerCase();
  
  // Immediately acknowledge to prevent timeout
  await say('👀 Acknowledged. Syncing & Executing...');
  
  try {
    // Step 1: Sync with latest roadmap
    try {
      execSync('git pull origin main', { 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      console.log('✅ Synced with origin/main');
    } catch (error) {
      console.error('⚠️  Git pull warning:', error instanceof Error ? error.message : String(error));
      // Continue anyway - might already be up to date
    }
    
    // Step 2: Execute command based on message content
    let result: { stdout: string; stderr: string; success: boolean };
    
    if (commandText.includes('status')) {
      result = executeManagerCommand('status');
    } else if (commandText.includes('execute')) {
      result = executeManagerCommand('execute --auto');
    } else {
      // Default: show status
      result = executeManagerCommand('status');
    }
    
    // Step 3: Send response back to Slack
    if (result.success) {
      // Format output in code block
      const output = result.stdout || 'Command executed successfully (no output)';
      const codeBlock = `\`\`\`\n${output}\n\`\`\``;
      
      // Split long messages (Slack has 4000 char limit per message)
      if (codeBlock.length > 3500) {
        // Send in chunks
        const chunks = output.match(/[\s\S]{1,3000}/g) || [output];
        for (let i = 0; i < chunks.length; i++) {
          await say(`\`\`\`\n${chunks[i]}\n\`\`\`\n*Part ${i + 1}/${chunks.length}*`);
        }
      } else {
        await say(codeBlock);
      }
    } else {
      // Send error message
      const errorMsg = result.stderr || 'Command failed with unknown error';
      await say(`❌ *Error:*\n\`\`\`\n${errorMsg}\n\`\`\``);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await say(`❌ *Unexpected error:*\n\`\`\`\n${errorMessage}\n\`\`\``);
    console.error('Bot error:', error);
  }
});

// ============================================================================
// STARTUP
// ============================================================================

(async () => {
  try {
    // Configure git on startup
    configureGit();
    
    // Start the app
    if (SLACK_APP_TOKEN) {
      // Socket Mode
      await app.start();
      console.log('✅ TERP Commander bot is running in Socket Mode!');
    } else {
      // HTTP Mode - need to start HTTP server
      await app.start(PORT);
      console.log(`✅ TERP Commander bot is running on port ${PORT}!`);
    }
    
    console.log('🤖 Bot ready to receive commands');
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

