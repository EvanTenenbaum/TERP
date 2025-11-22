import { App, LogLevel } from '@slack/bolt';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();
const execAsync = promisify(exec);

// 1. Setup Diagnostic Logger
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true, // <--- CRITICAL: Must be true
  logLevel: LogLevel.DEBUG, // <--- CRITICAL: Turn on debug logs
});

// 2. Global Middleware to catch EVERYTHING
app.use(async ({ logger, body, next }) => {
  logger.info("🔥 Event Received:", JSON.stringify(body, null, 2));
  await next();
});

// 3. Status Command Listener
app.message(/status/i, async ({ say }) => {
  await say("👀 I hear you! Checking status...");
  try {
    await execAsync('git pull origin main'); // Sync code
    const { stdout } = await execAsync('npx tsx scripts/manager.ts status');
    await say(`\`\`\`\n${stdout}\n\`\`\``);
  } catch (error) {
    await say(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// 4. Execution Command Listener
app.message(/execute|fix/i, async ({ say }) => {
  await say("🚀 Starting execution...");
  try {
    await execAsync('git pull origin main');
    // Using --recursive by default as per protocol
    const { stdout } = await execAsync('npx tsx scripts/manager.ts execute --recursive');
    await say(`\`\`\`\n${stdout}\n\`\`\``);
  } catch (error) {
    await say(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

(async () => {
  // 5. Git Auth Setup on Boot
  try {
    console.log("🔧 Configuring Git...");
    const git = simpleGit();
    await git.addConfig('user.email', 'bot@terp.ai');
    await git.addConfig('user.name', 'TERP Commander');
    // Safe remote update
    try {
      await git.removeRemote('origin');
    } catch (e) { /* ignore if missing */ }
    await git.addRemote('origin', `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/EvanTenenbaum/TERP.git`);
    console.log("✅ Git configured.");
  } catch (e) {
    console.error("⚠️ Git Config Error:", e);
  }

  // 6. Start the App
  await app.start();
  console.log('⚡️ TERP Commander is running in Socket Mode!');
  console.log('🔑 Debug - Bot Token starts with:', process.env.SLACK_BOT_TOKEN?.substring(0, 5));
  console.log('🔑 Debug - App Token starts with:', process.env.SLACK_APP_TOKEN?.substring(0, 5));
})();
