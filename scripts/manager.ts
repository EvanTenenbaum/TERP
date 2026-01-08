#!/usr/bin/env tsx

/**
 * TERP Swarm Manager V2
 * 
 * Self-contained orchestrator for parallel agent execution.
 * Resilient to ephemeral terminal sessions and git lock errors.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

// ============================================================================
// SELF-BOOTSTRAPPING: Dependency Check & Installation
// ============================================================================

const REQUIRED_DEPS = [
  'commander',
  'simple-git',
  'dotenv',
  '@google/generative-ai',
  'ora',
  'chalk'
];

function ensureDependencies(): void {
  const nodeModulesPath = join(process.cwd(), 'node_modules');
  
  // Detect package manager (prefer pnpm, fallback to npm)
  let packageManager = 'npm';
  try {
    execSync('which pnpm', { stdio: 'ignore', cwd: process.cwd() });
    packageManager = 'pnpm';
  } catch {
    try {
      execSync('which npm', { stdio: 'ignore', cwd: process.cwd() });
    } catch {
      console.error('❌ Neither npm nor pnpm found in PATH');
      process.exit(1);
    }
  }
  
  if (!existsSync(nodeModulesPath)) {
    console.log('⚠️  node_modules not found. Installing dependencies...');
    try {
      const installCmd = packageManager === 'pnpm' 
        ? `pnpm add ${REQUIRED_DEPS.join(' ')}`
        : `npm install ${REQUIRED_DEPS.join(' ')}`;
      execSync(installCmd, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Dependencies installed successfully');
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error);
      process.exit(1);
    }
  } else {
    // Check if all required packages exist
    const missingDeps = REQUIRED_DEPS.filter(dep => {
      // Handle scoped packages (e.g., @google/generative-ai)
      const depParts = dep.split('/');
      const depPath = depParts.length > 1
        ? join(nodeModulesPath, depParts[0], depParts[1])
        : join(nodeModulesPath, dep);
      return !existsSync(depPath);
    });
    
    if (missingDeps.length > 0) {
      console.log(`⚠️  Missing dependencies: ${missingDeps.join(', ')}. Installing...`);
      try {
        const installCmd = packageManager === 'pnpm'
          ? `pnpm add ${missingDeps.join(' ')}`
          : `npm install ${missingDeps.join(' ')}`;
        execSync(installCmd, {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Missing dependencies installed');
      } catch (error) {
        console.error('❌ Failed to install missing dependencies:', error);
        process.exit(1);
      }
    }
  }
}

// Bootstrap dependencies before importing
ensureDependencies();

// Now safe to import
import { Command } from 'commander';
import simpleGit, { SimpleGit } from 'simple-git';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ora from 'ora';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROADMAP_PATH = 'docs/roadmaps/MASTER_ROADMAP.md';
const GIT_RETRY_ATTEMPTS = 3;
const GIT_RETRY_DELAY = 2000; // 2 seconds
const AI_TIMEOUT_MS = 90000; // 90 seconds
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

// ============================================================================
// TYPES
// ============================================================================

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  lineNumber: number;
}

interface StatusResult {
  phase: string;
  pending: string[];
  recommended: string[];
}

interface ExecuteResult {
  taskId: string;
  status: 'success' | 'timeout' | 'error';
  message: string;
  branch?: string;
}

// ============================================================================
// ROADMAP PARSING
// ============================================================================

function parseRoadmap(): { tasks: Task[]; phase: string } {
  if (!existsSync(ROADMAP_PATH)) {
    throw new Error(`Roadmap file not found: ${ROADMAP_PATH}`);
  }

  const content = readFileSync(ROADMAP_PATH, 'utf-8');
  const lines = content.split('\n');
  const tasks: Task[] = [];
  
  let currentPhase = 'Unknown';
  let lineNumber = 0;

  // Extract current phase from sprint section
  const sprintMatch = content.match(/## 🎯 Current Sprint.*?\n\n(.*?)(?=\n##|\n---|$)/s);
  if (sprintMatch) {
    const phaseMatch = sprintMatch[1].match(/### (.*?)\n/);
    if (phaseMatch) {
      currentPhase = phaseMatch[1].trim();
    }
  }

  // Parse tasks - look for task patterns like "ST-XXX:", "BUG-XXX:", "FEATURE-XXX:", "CL-XXX:", "DATA-XXX:"
  // Also handle task headers with or without colon, and with extended formats like "DATA-002-AUGMENT"
  const taskPattern = /^###?\s*([A-Z]+-\d+(?:-[A-Z]+)?):?\s*(.+)$/;
  const statusPattern = /^\*\*Status:\*\*\s*(.+)$/;
  const priorityPattern = /^\*\*Priority:\*\*\s*(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(taskPattern);
    
    if (taskMatch) {
      const taskId = taskMatch[1];
      const title = taskMatch[2].trim();
      
      // Look ahead for status and priority
      let status = 'Unknown';
      let priority = 'Unknown';
      
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        const statusMatch = lines[j].match(statusPattern);
        const priorityMatch = lines[j].match(priorityPattern);
        
        if (statusMatch) {
          status = statusMatch[1].trim();
        }
        if (priorityMatch) {
          priority = priorityMatch[1].trim();
        }
        
        if (status !== 'Unknown' && priority !== 'Unknown') {
          break;
        }
      }
      
      tasks.push({
        id: taskId,
        title,
        status,
        priority,
        lineNumber: i + 1
      });
    }
  }

  return { tasks, phase: currentPhase };
}

// ============================================================================
// SAFE GIT WRAPPER
// ============================================================================

/**
 * Check if a git lock file is stale (older than 10 minutes)
 */
function isLockFileStale(lockPath: string, maxAgeMinutes: number = 10): boolean {
  try {
    const stats = require('fs').statSync(lockPath);
    const ageMs = Date.now() - stats.mtimeMs;
    return ageMs > (maxAgeMinutes * 60 * 1000);
  } catch {
    return false;
  }
}

async function safeGit<T>(
  operation: (git: SimpleGit) => Promise<T>,
  retries: number = GIT_RETRY_ATTEMPTS
): Promise<T> {
  const git = simpleGit(process.cwd());

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation(git);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('index.lock') || errorMessage.includes('locked')) {
        if (attempt < retries) {
          console.log(chalk.yellow(`⚠️  Git lock detected (attempt ${attempt}/${retries}). Retrying in ${GIT_RETRY_DELAY}ms...`));
          await new Promise(resolve => setTimeout(resolve, GIT_RETRY_DELAY));
          continue;
        } else {
          // Last attempt - only remove lock file if it's stale (>10 minutes old)
          try {
            const lockPath = join(process.cwd(), '.git', 'index.lock');
            if (existsSync(lockPath) && isLockFileStale(lockPath)) {
              console.log(chalk.yellow('🔓 Removing stale lock file (>10 minutes old)...'));
              execSync(`rm -f "${lockPath}"`, { cwd: process.cwd() });
              return await operation(git);
            } else if (existsSync(lockPath)) {
              console.log(chalk.red('❌ Lock file exists but is recent. Another process may be using git.'));
              throw new Error('Git lock file is actively in use by another process');
            }
          } catch (lockError) {
            if (lockError instanceof Error && lockError.message.includes('actively in use')) {
              throw lockError;
            }
            // Ignore other lock removal errors
          }
        }
      }

      throw error;
    }
  }

  throw new Error('Git operation failed after all retries');
}

// ============================================================================
// DEPLOYMENT VERIFICATION (with Cloud Agent support)
// ============================================================================

/**
 * Check if doctl CLI tool is available
 */
function hasDoctl(): boolean {
  try {
    execSync('command -v doctl', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify deployment status using doctl (if available)
 * Gracefully degrades in Cloud Agent environments where doctl is not available
 */
async function verifyDeployment(): Promise<void> {
  if (!hasDoctl()) {
    console.log(chalk.yellow('⚠️  Running in Cloud Mode: doctl not found. Deployment triggered via Git, but cannot verify success. Check Slack for DO notifications.'));
    return;
  }
  
  // If doctl is available, run deployment verification
  // This would typically check deployment status using doctl commands
  // For now, we'll just log that verification would happen here
  // In a full implementation, this would call watch-deploy.sh or similar
  try {
    // Example: execSync('./scripts/watch-deploy.sh', { stdio: 'inherit' });
    console.log(chalk.blue('🔍 Deployment verification would run here (doctl available)'));
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Deployment verification failed: ${error instanceof Error ? error.message : String(error)}`));
    // Don't crash - just log the warning
  }
}

// ============================================================================
// GIT WORKFLOW
// ============================================================================

async function executeGitWorkflow(taskId: string, files: string[]): Promise<string> {
  const branchName = `agent/${taskId}`;
  
  await safeGit(async (git) => {
    // Fetch latest
    await git.fetch(['origin']);
    
    // Checkout main and pull
    await git.checkout('main');
    await git.pull('origin', 'main');
    
    // Create or checkout branch
    const branches = await git.branchLocal();
    if (branches.all.includes(branchName)) {
      await git.checkout(branchName);
      await git.pull('origin', branchName).catch(() => {
        // Branch might not exist on remote yet
      });
    } else {
      await git.checkoutLocalBranch(branchName);
    }
  });
  
  // Stage all changes
  await safeGit(async (git) => {
    await git.add('.');
  });
  
  // Commit
  await safeGit(async (git) => {
    const status = await git.status();
    if (status.files.length > 0) {
      await git.commit(`feat: ${taskId} autonomous implementation`);
    }
  });
  
  // Push (with --force-with-lease for safer force push)
  await safeGit(async (git) => {
    try {
      await git.push('origin', branchName, ['--set-upstream']);
    } catch (error) {
      // If branch exists on remote, use --force-with-lease (safer than --force)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('failed to push') || errorMessage.includes('rejected')) {
        console.log(chalk.yellow(`⚠️  Branch exists on remote. Using --force-with-lease for safe force push...`));
        // --force-with-lease ensures we don't overwrite someone else's changes
        await git.push(['origin', branchName, '--force-with-lease']);
      } else {
        throw error;
      }
    }
  });
  
  // INFRA-007: Merge branch to main after successful push
  // SAFETY: Check if merge is safe before attempting
  await safeGit(async (git) => {
    console.log(chalk.blue(`🔄 Checking merge safety for ${branchName}...`));
    await git.checkout('main');
    await git.pull('origin', 'main');

    // Check for potential merge conflicts before attempting merge
    try {
      // Dry-run merge check using git merge-tree
      const mergeBase = await git.raw(['merge-base', 'main', branchName]);
      const mergeTreeOutput = await git.raw(['merge-tree', mergeBase.trim(), 'main', branchName]);

      // Check if merge-tree output contains conflict markers
      if (mergeTreeOutput.includes('<<<<<<<') || mergeTreeOutput.includes('>>>>>>>')) {
        console.log(chalk.yellow(`⚠️  Potential merge conflicts detected. Skipping auto-merge.`));
        console.log(chalk.yellow(`   Branch ${branchName} pushed. Create a PR for manual review.`));
        await git.checkout(branchName); // Return to feature branch
        return;
      }
    } catch (checkError) {
      // If merge-tree fails, continue with traditional merge attempt
      console.log(chalk.yellow(`⚠️  Could not verify merge safety: ${checkError instanceof Error ? checkError.message : String(checkError)}`));
    }

    console.log(chalk.blue(`🔄 Merging ${branchName} to main...`));
    try {
      await git.merge([branchName, '--no-ff', '-m', `Merge ${branchName}: ${taskId} autonomous implementation`]);
      await git.push('origin', 'main');
      console.log(chalk.green(`✅ Successfully merged ${branchName} to main`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('conflict') || errorMessage.includes('CONFLICT')) {
        console.log(chalk.yellow(`⚠️  Merge conflict detected during merge.`));
        // Abort the merge instead of auto-resolving (safer)
        try {
          await git.raw(['merge', '--abort']);
          console.log(chalk.yellow(`   Merge aborted. Branch ${branchName} pushed but not merged.`));
          console.log(chalk.yellow(`   Please create a PR for manual review and conflict resolution.`));
        } catch (abortError) {
          console.log(chalk.red(`❌ Could not abort merge. Manual cleanup may be required.`));
        }
        // Don't throw - the branch push succeeded, just the merge to main didn't
      } else {
        throw error;
      }
    }
  });
  
  // INFRA-004: Enforce deployment monitoring
  console.log(chalk.blue(`📊 Monitoring deployment...`));
  try {
    const commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    execSync(`bash scripts/monitor-deployment-auto.sh ${commitSha}`, { 
      stdio: 'inherit',
      timeout: 30000 // 30 second timeout for monitoring start
    });
    console.log(chalk.green(`✅ Deployment monitoring started`));
  } catch (error) {
    // Don't fail the workflow if monitoring script fails
    console.log(chalk.yellow(`⚠️  Deployment monitoring failed (non-blocking): ${error instanceof Error ? error.message : String(error)}`));
  }
  
  return branchName;
}

// ============================================================================
// AI AGENT EXECUTION
// ============================================================================

async function executeAgent(taskId: string, task: Task): Promise<ExecuteResult> {
  const spinner = ora(`Executing agent for ${taskId}`).start();
  
  try {
    // Get API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY environment variable not set');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    // Build prompt from roadmap task
    const prompt = buildAgentPrompt(task);
    
    // Execute with timeout
    const result = await Promise.race([
      model.generateContent(prompt).then(response => response.response),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), AI_TIMEOUT_MS)
      )
    ]);
    
    const text = result.text();
    spinner.succeed(`Agent completed for ${taskId}`);
    
    // Parse result and execute git workflow
    const branchName = await executeGitWorkflow(taskId, []);
    
    return {
      taskId,
      status: 'success',
      message: text.substring(0, 200) + '...',
      branch: branchName
    };
    
  } catch (error: unknown) {
    spinner.fail(`Agent failed for ${taskId}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage === 'Timeout') {
      return {
        taskId,
        status: 'timeout',
        message: 'Agent execution exceeded 90 second timeout'
      };
    }
    
    return {
      taskId,
      status: 'error',
      message: errorMessage
    };
  }
}

function buildAgentPrompt(task: Task): string {
  // Read the full task context from roadmap
  const content = readFileSync(ROADMAP_PATH, 'utf-8');
  const lines = content.split('\n');
  
  // Extract task section
  let taskStart = task.lineNumber - 1;
  let taskEnd = taskStart + 1;
  
  // Find the end of this task (next task or section)
  const taskPattern = /^###?\s*[A-Z]+-\d+:/;
  for (let i = taskStart + 1; i < lines.length; i++) {
    if (taskPattern.test(lines[i])) {
      taskEnd = i;
      break;
    }
  }
  
  const taskContent = lines.slice(taskStart, taskEnd).join('\n');
  
  return `You are an autonomous development agent working on task ${task.id}: ${task.title}

TASK CONTEXT:
${taskContent}

YOUR MISSION:
1. Read the task requirements carefully
2. Implement the solution following TERP coding standards
3. Write tests if applicable
4. Update documentation
5. Commit your work to branch agent/${task.id}

Follow the TERP Roadmap Agent Guide at docs/ROADMAP_AGENT_GUIDE.md for complete instructions.

Begin implementation now.`;
}

// ============================================================================
// COMMANDS
// ============================================================================

async function statusCommand(): Promise<void> {
  try {
    const { tasks, phase } = parseRoadmap();
    
    // Filter pending tasks (not complete)
    const pending = tasks
      .filter(t => !t.status.includes('COMPLETE') && !t.status.includes('Complete'))
      .map(t => t.id);
    
    // Recommend high priority pending tasks
    const recommended = tasks
      .filter(t => 
        !t.status.includes('COMPLETE') && 
        !t.status.includes('Complete') &&
        (t.priority.includes('HIGH') || t.priority.includes('CRITICAL') || t.priority.includes('P0'))
      )
      .slice(0, 5)
      .map(t => t.id);
    
    const result: StatusResult = {
      phase,
      pending,
      recommended
    };
    
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error reading roadmap:', error);
    process.exit(1);
  }
}

async function executeCommand(batch?: string, auto?: boolean, untilPhase?: string, untilTask?: string): Promise<void> {
  try {
    const { tasks, phase } = parseRoadmap();
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    let taskIds: string[] = [];
    
    if (untilPhase || untilTask) {
      // Work until target phase or task
      const content = readFileSync(ROADMAP_PATH, 'utf-8');
      const lines = content.split('\n');
      
      let targetReached = false;
      let inTargetPhase = false;
      const pendingTasks: Task[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if we've reached target phase
        if (untilPhase && line.includes(untilPhase)) {
          inTargetPhase = true;
        }
        
        // Check if we've reached target task
        if (untilTask && line.includes(untilTask)) {
          targetReached = true;
          break;
        }
        
        // If in target phase or before target task, collect pending tasks
        if (inTargetPhase || untilTask) {
          const taskMatch = line.match(/^###?\s*([A-Z]+-\d+):/);
          if (taskMatch) {
            const taskId = taskMatch[1];
            const task = tasks.find(t => t.id === taskId);
            if (task && !task.status.includes('COMPLETE') && !task.status.includes('Complete')) {
              pendingTasks.push(task);
            }
          }
        }
        
        // Stop if we've passed target phase (for phase targeting)
        if (untilPhase && inTargetPhase && line.match(/^### Phase \d+/) && !line.includes(untilPhase)) {
          break;
        }
      }
      
      if (untilTask && !targetReached) {
        console.log(chalk.yellow(`⚠️  Target task ${untilTask} not found in roadmap`));
        process.exit(1);
      }
      
      if (untilPhase && !inTargetPhase) {
        console.log(chalk.yellow(`⚠️  Target phase "${untilPhase}" not found in roadmap`));
        process.exit(1);
      }
      
      // Execute tasks in batches until target is reached
      console.log(chalk.blue(`🚀 Working until ${untilPhase || untilTask}...`));
      console.log(chalk.blue(`📋 Found ${pendingTasks.length} pending tasks`));
      
      const batchSize = 3;
      let completed = 0;
      
      for (let i = 0; i < pendingTasks.length; i += batchSize) {
        const batch = pendingTasks.slice(i, i + batchSize);
        const batchIds = batch.map(t => t.id);
        
        console.log(chalk.blue(`\n📦 Executing batch ${Math.floor(i / batchSize) + 1}: ${batchIds.join(', ')}`));
        
        const results = await Promise.allSettled(
          batchIds.map(taskId => {
            const task = taskMap.get(taskId)!;
            return executeAgent(taskId, task);
          })
        );
        
        // Report batch results
        results.forEach((result, index) => {
          const taskId = batchIds[index];
          if (result.status === 'fulfilled') {
            const execResult = result.value;
            const statusColor = 
              execResult.status === 'success' ? chalk.green :
              execResult.status === 'timeout' ? chalk.yellow :
              chalk.red;
            console.log(statusColor(`  ${taskId}: ${execResult.status.toUpperCase()}`));
            if (execResult.status === 'success') completed++;
          }
        });
        
        // Check if target task is reached
        if (untilTask) {
          // Re-parse roadmap to get updated status
          const { tasks: updatedTasks } = parseRoadmap();
          const targetTask = updatedTasks.find(t => t.id === untilTask);
          if (targetTask && (targetTask.status.includes('COMPLETE') || targetTask.status.includes('Complete'))) {
            console.log(chalk.green(`\n✅ Target task ${untilTask} completed!`));
            return;
          }
        }
        
        // Small delay between batches
        if (i + batchSize < pendingTasks.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(chalk.green(`\n✅ Completed ${completed} of ${pendingTasks.length} tasks`));
      return;
      
    } else if (auto) {
      // Auto-select recommended high priority tasks
      taskIds = tasks
        .filter(t => 
          !t.status.includes('COMPLETE') && 
          !t.status.includes('Complete') &&
          (t.priority.includes('HIGH') || t.priority.includes('CRITICAL') || t.priority.includes('P0'))
        )
        .slice(0, 3)
        .map(t => t.id);
      
      if (taskIds.length === 0) {
        console.log(chalk.yellow('⚠️  No recommended tasks found'));
        return;
      }
      
      console.log(chalk.blue(`🤖 Auto-selected tasks: ${taskIds.join(', ')}`));
    } else if (batch) {
      taskIds = batch.split(',').map(id => id.trim());
    } else {
      console.error('Error: Must specify --batch, --auto, --until-phase, or --until-task');
      process.exit(1);
    }
    
    // Validate all task IDs exist
    const invalidIds = taskIds.filter(id => !taskMap.has(id));
    if (invalidIds.length > 0) {
      console.error(`Error: Invalid task IDs: ${invalidIds.join(', ')}`);
      process.exit(1);
    }
    
    // Execute all tasks in parallel with Promise.allSettled
    console.log(chalk.blue(`🚀 Executing ${taskIds.length} agent(s) in parallel...`));
    
    const results = await Promise.allSettled(
      taskIds.map(taskId => {
        const task = taskMap.get(taskId)!;
        return executeAgent(taskId, task);
      })
    );
    
    // Report results
    console.log('\n' + chalk.bold('📊 Execution Results:'));
    console.log('='.repeat(50));
    
    results.forEach((result, index) => {
      const taskId = taskIds[index];
      
      if (result.status === 'fulfilled') {
        const execResult = result.value;
        const statusColor = 
          execResult.status === 'success' ? chalk.green :
          execResult.status === 'timeout' ? chalk.yellow :
          chalk.red;
        
        console.log(statusColor(`\n${taskId}: ${execResult.status.toUpperCase()}`));
        console.log(`  Message: ${execResult.message}`);
        if (execResult.branch) {
          console.log(chalk.blue(`  Branch: ${execResult.branch}`));
        }
      } else {
        console.log(chalk.red(`\n${taskId}: FAILED`));
        console.log(`  Error: ${result.reason}`);
      }
    });
    
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 'success'
    ).length;
    
    console.log('\n' + chalk.bold(`✅ Completed: ${successCount}/${taskIds.length} successful`));
    
  } catch (error) {
    console.error('Error executing agents:', error);
    process.exit(1);
  }
}

// ============================================================================
// CLI SETUP
// ============================================================================

const program = new Command();

program
  .name('swarm-manager')
  .description('TERP Swarm Manager V2 - Orchestrates parallel agent execution')
  .version('2.0.0');

program
  .command('status')
  .description('Get roadmap status summary')
  .action(() => {
    statusCommand().catch(console.error);
  });

program
  .command('execute')
  .description('Execute agents for tasks')
  .option('--batch <ids>', 'Comma-separated task IDs (e.g., ST-001,ST-002)')
  .option('--auto', 'Auto-select recommended high priority tasks')
  .option('--until-phase <phase>', 'Work through tasks until this phase (e.g., "Phase 2.5", "Phase 3")')
  .option('--until-task <task>', 'Work through tasks until this task is complete (e.g., "BUG-007", "WF-004")')
  .action((options) => {
    executeCommand(options.batch, options.auto, options.untilPhase, options.untilTask).catch(console.error);
  });

// Run CLI
program.parse();

