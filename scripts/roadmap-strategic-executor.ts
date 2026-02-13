#!/usr/bin/env tsx

/**
 * Strategic Roadmap Executor
 * 
 * Integrates roadmap analysis, prompt generation, and strategic agent execution.
 * 
 * Usage:
 *   tsx scripts/roadmap-strategic-executor.ts generate-prompts --phases="Phase 2.5,Phase 3"
 *   tsx scripts/roadmap-strategic-executor.ts plan --phases="Phase 2.5"
 *   tsx scripts/roadmap-strategic-executor.ts execute --phases="Phase 2.5"
 *   tsx scripts/roadmap-strategic-executor.ts go
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const ROADMAP_PATH = 'docs/roadmaps/MASTER_ROADMAP.md';
const PROMPTS_DIR = 'docs/prompts';
const TEMPLATE_PATH = 'docs/templates/PROMPT_TEMPLATE.md';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  phase?: string;
  lineNumber: number;
  promptPath?: string;
  module?: string;
  estimate?: string;
  objectives?: string[];
  deliverables?: string[];
}

interface ExecutionPlan {
  phases: string[];
  batches: Array<{
    batchNumber: number;
    tasks: Task[];
    canRunInParallel: boolean;
    estimatedTime: string;
  }>;
  totalTasks: number;
  totalEstimatedTime: string;
}

function parseRoadmapTasks(): Task[] {
  if (!existsSync(ROADMAP_PATH)) {
    throw new Error(`Roadmap file not found: ${ROADMAP_PATH}`);
  }

  const content = readFileSync(ROADMAP_PATH, 'utf-8');
  const lines = content.split('\n');
  const tasks: Task[] = [];
  
  let currentPhase = '';
  let inPhase = false;

  // Task pattern: matches BUG-XXX, ST-XXX, RF-XXX, WF-XXX, DATA-XXX, FEATURE-XXX, CL-XXX, INFRA-XXX, QA-XXX, etc.
  const taskPattern = /^###?\s*([A-Z]+-\d+):\s*(.+)$/;
  // Phase pattern: matches "Phase X", "Phase X.Y", "🔴 CRITICAL", etc.
  const phasePattern = /^###\s*(Phase\s+[\d.]+|🔴\s+CRITICAL|🟡\s+MEDIUM|🟢\s+HIGH|Phase\s+[\d.]+:)/;
  // Also match phase headers like "### Phase 2.5: Critical Workflow Fixes"
  const phaseHeaderPattern = /^###\s*(Phase\s+[\d.]+):\s*(.+)$/;
  const statusPattern = /^\*\*Status:\*\*\s*(.+)$/;
  const priorityPattern = /^\*\*Priority:\*\*\s*(.+)$/;
  const promptPattern = /^\*\*Prompt:\*\*\s*`(.+)`/;
  const modulePattern = /^\*\*Module:\*\*\s*(.+)$/;
  const estimatePattern = /^\*\*Estimate:\*\*\s*(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect phase (try both patterns)
    const phaseMatch = line.match(phasePattern) || line.match(phaseHeaderPattern);
    if (phaseMatch) {
      currentPhase = phaseMatch[1].trim();
      inPhase = true;
      continue;
    }
    
    // Detect task
    const taskMatch = line.match(taskPattern);
    if (taskMatch) {
      const taskId = taskMatch[1];
      const title = taskMatch[2].trim();
      
      // Extract metadata
      let status = 'PLANNED';
      let priority = 'MEDIUM';
      let promptPath: string | undefined;
      let module: string | undefined;
      let estimate: string | undefined;
      
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        const metaLine = lines[j];
        
        if (metaLine.match(/^###/)) break; // Next task or section
        
        const statusMatch = metaLine.match(statusPattern);
        const priorityMatch = metaLine.match(priorityPattern);
        const promptMatch = metaLine.match(promptPattern);
        const moduleMatch = metaLine.match(modulePattern);
        const estimateMatch = metaLine.match(estimatePattern);
        
        if (statusMatch) status = statusMatch[1].trim();
        if (priorityMatch) priority = priorityMatch[1].trim();
        if (promptMatch) promptPath = promptMatch[1].trim();
        if (moduleMatch) module = moduleMatch[1].trim();
        if (estimateMatch) estimate = estimateMatch[1].trim();
      }
      
      // Skip completed tasks
      if (status.includes('COMPLETE') || status.includes('Complete')) {
        continue;
      }
      
      tasks.push({
        id: taskId,
        title,
        status,
        priority,
        phase: currentPhase,
        lineNumber: i + 1,
        promptPath,
        module,
        estimate
      });
    }
  }

  return tasks;
}

function getTasksForPhases(phases: string[]): Task[] {
  const allTasks = parseRoadmapTasks();
  
  if (phases.length === 0) {
    return allTasks.filter(t => !t.status.includes('COMPLETE'));
  }
  
  return allTasks.filter(task => {
    if (!task.phase) return false;
    return phases.some(phase => 
      task.phase?.includes(phase) || phase.includes(task.phase || '')
    );
  });
}

function generatePromptForTask(task: Task): void {
  if (!existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found: ${TEMPLATE_PATH}`);
  }
  
  const promptPath = task.promptPath || `docs/prompts/${task.id}.md`;
  
  // Don't overwrite existing prompts
  if (existsSync(promptPath)) {
    console.log(`⏭️  Prompt exists: ${promptPath}`);
    return;
  }
  
  const template = readFileSync(TEMPLATE_PATH, 'utf-8');
  
  // Extract objectives and deliverables from roadmap if available
  const roadmapContent = readFileSync(ROADMAP_PATH, 'utf-8');
  const taskSection = extractTaskSection(roadmapContent, task.id);
  
  const objectives = extractList(taskSection, 'Objectives');
  const deliverables = extractList(taskSection, 'Deliverables');
  
  // Generate prompt
  const prompt = template
    .replace(/\[TASK_ID\]/g, task.id)
    .replace(/\[TASK_TITLE\]/g, task.title)
    .replace(/\[ESTIMATE\]/g, task.estimate || 'TBD')
    .replace(/\[MODULE\]/g, task.module || 'Multiple modules')
    .replace(/\[PRIORITY\]/g, task.priority)
    .replace(/\[BACKGROUND\]/g, extractField(taskSection, 'Problem') || task.title)
    .replace(/\[GOAL\]/g, extractField(taskSection, 'Goal') || `Complete ${task.title}`)
    .replace(/\[OBJECTIVES\]/g, objectives.map(o => `- ${o}`).join('\n') || '- Complete the task')
    .replace(/\[DELIVERABLES\]/g, deliverables.map(d => `- [ ] ${d}`).join('\n') || '- [ ] Task complete');
  
  // Ensure prompts directory exists
  execSync(`mkdir -p ${PROMPTS_DIR}`, { cwd: process.cwd() });
  
  writeFileSync(promptPath, prompt, 'utf-8');
  console.log(`✅ Generated: ${promptPath}`);
}

function extractTaskSection(content: string, taskId: string): string {
  const lines = content.split('\n');
  let startIndex = -1;
  let endIndex = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`${taskId}:`)) {
      startIndex = i;
      break;
    }
  }
  
  if (startIndex === -1) return '';
  
  // Find end of task (next task or section)
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].match(/^###?\s*[A-Z]+-\d+:/) || lines[i].match(/^##/)) {
      endIndex = i;
      break;
    }
  }
  
  return lines.slice(startIndex, endIndex).join('\n');
}

function extractField(section: string, field: string): string | null {
  const pattern = new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+?)(?=\\n\\*\\*|\\n---|$)`, 's');
  const match = section.match(pattern);
  return match ? match[1].trim() : null;
}

function extractList(section: string, field: string): string[] {
  const pattern = new RegExp(`\\*\\*${field}:\\*\\*([\\s\\S]*?)(?=\\n\\*\\*|\\n---|$)`, 's');
  const match = section.match(pattern);
  if (!match) return [];
  
  const lines = match[1].split('\n');
  const items: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      items.push(trimmed.slice(2).trim());
    } else if (trimmed.startsWith('- [ ]')) {
      items.push(trimmed.slice(6).trim());
    }
  }
  
  return items;
}

function analyzeExecutionStrategy(tasks: Task[]): ExecutionPlan {
  // Group by phase
  const byPhase = new Map<string, Task[]>();
  for (const task of tasks) {
    const phase = task.phase || 'Unknown';
    let phaseTasks = byPhase.get(phase);
    if (!phaseTasks) {
      phaseTasks = [];
      byPhase.set(phase, phaseTasks);
    }
    phaseTasks.push(task);
  }
  
  const phases = Array.from(byPhase.keys());
  
  // Create batches based on module conflicts and priority
  const batches: ExecutionPlan['batches'] = [];
  let batchNumber = 1;
  const processed = new Set<string>();
  
  // Sort by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      'P0': 5, 'CRITICAL': 5,
      'P1': 4, 'HIGH': 4,
      'P2': 3, 'MEDIUM': 3,
      'P3': 2, 'LOW': 2
    };
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  });
  
  while (processed.size < sortedTasks.length) {
    const batch: Task[] = [];
    const batchModules = new Set<string>();
    
    for (const task of sortedTasks) {
      if (processed.has(task.id)) continue;

      // Check module conflicts (exact match and partial overlap)
      const taskModule = (task.module || 'unknown').toLowerCase();
      let hasConflict = false;

      // Check for exact match or partial overlap with existing modules
      for (const existingModule of batchModules) {
        const existingLower = existingModule.toLowerCase();
        // Exact match
        if (existingLower === taskModule) {
          hasConflict = true;
          break;
        }
        // Partial overlap: one module is a prefix of the other
        // e.g., 'calendar' and 'calendar-reminders' would conflict
        if (existingLower.startsWith(taskModule + '-') ||
            taskModule.startsWith(existingLower + '-') ||
            existingLower.includes('/' + taskModule) ||
            taskModule.includes('/' + existingLower)) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) continue;

      // Add to batch
      batch.push(task);
      batchModules.add(task.module || 'unknown');
      processed.add(task.id);

      // Limit batch size to 4
      if (batch.length >= 4) break;
    }
    
    if (batch.length > 0) {
      batches.push({
        batchNumber: batchNumber++,
        tasks: batch,
        canRunInParallel: batch.length > 1,
        estimatedTime: calculateBatchTime(batch)
      });
    }
  }
  
  return {
    phases,
    batches,
    totalTasks: tasks.length,
    totalEstimatedTime: calculateTotalTime(tasks)
  };
}

function calculateBatchTime(tasks: Task[]): string {
  // Simple estimate - sum of max estimates
  let total = 0;
  for (const task of tasks) {
    if (task.estimate) {
      const match = task.estimate.match(/(\d+)-(\d+)\s*hours?/);
      if (match) {
        total += parseInt(match[2]);
      }
    }
  }
  return total > 0 ? `${total} hours` : 'TBD';
}

function calculateTotalTime(tasks: Task[]): string {
  return calculateBatchTime(tasks);
}

function generatePromptsForPhases(phases: string[]): void {
  const tasks = getTasksForPhases(phases);
  
  console.log(`📝 Generating prompts for ${tasks.length} tasks...\n`);
  
  for (const task of tasks) {
    try {
      generatePromptForTask(task);
    } catch (error) {
      console.error(`❌ Failed to generate prompt for ${task.id}:`, error);
    }
  }
  
  console.log(`\n✅ Generated prompts for ${tasks.length} tasks`);
}

function createExecutionPlan(phases: string[]): ExecutionPlan {
  const tasks = getTasksForPhases(phases);
  const plan = analyzeExecutionStrategy(tasks);
  
  // Save plan to file
  const planPath = '.github/EXECUTION_PLAN.md';
  let planContent = `# Execution Plan\n\n`;
  planContent += `**Generated:** ${new Date().toISOString()}\n`;
  planContent += `**Phases:** ${phases.join(', ')}\n`;
  planContent += `**Total Tasks:** ${plan.totalTasks}\n`;
  planContent += `**Total Estimated Time:** ${plan.totalEstimatedTime}\n\n`;
  
  planContent += `## Execution Batches\n\n`;
  for (const batch of plan.batches) {
    planContent += `### Batch ${batch.batchNumber}\n\n`;
    planContent += `**Tasks:** ${batch.tasks.map(t => t.id).join(', ')}\n`;
    planContent += `**Parallel:** ${batch.canRunInParallel ? 'Yes' : 'No'}\n`;
    planContent += `**Estimated Time:** ${batch.estimatedTime}\n\n`;
    for (const task of batch.tasks) {
      planContent += `- ${task.id}: ${task.title}\n`;
    }
    planContent += `\n`;
  }
  
  writeFileSync(planPath, planContent, 'utf-8');
  console.log(`\n📋 Execution plan saved to: ${planPath}`);
  
  return plan;
}

function executePlan(phases: string[]): void {
  const plan = createExecutionPlan(phases);
  
  console.log(`\n🚀 Executing ${plan.totalTasks} tasks in ${plan.batches.length} batches...\n`);
  
  for (const batch of plan.batches) {
    console.log(`\n📦 Batch ${batch.batchNumber}: ${batch.tasks.map(t => t.id).join(', ')}`);
    
    const taskIds = batch.tasks.map(t => t.id).join(',');
    
    try {
      execSync(`pnpm swarm execute --batch="${taskIds}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env, GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY || '' }
      });
    } catch (error) {
      console.error(`❌ Batch ${batch.batchNumber} failed:`, error);
    }
    
    // Small delay between batches (use proper async delay instead of blocking execSync)
    if (batch.batchNumber < plan.batches.length) {
      console.log('⏳ Waiting 5 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log(`\n✅ Execution complete!`);
}

function main() {
  const command = process.argv[2];
  const phasesArg = process.argv.find(arg => arg.startsWith('--phases='));
  const phases = phasesArg ? phasesArg.split('=')[1].split(',').map(p => p.trim()) : [];
  
  if (command === 'generate-prompts') {
    generatePromptsForPhases(phases);
    
  } else if (command === 'plan') {
    const plan = createExecutionPlan(phases);
    console.log(`\n📊 Execution Plan:`);
    console.log(`- Phases: ${plan.phases.join(', ')}`);
    console.log(`- Total Tasks: ${plan.totalTasks}`);
    console.log(`- Batches: ${plan.batches.length}`);
    console.log(`- Estimated Time: ${plan.totalEstimatedTime}`);
    
  } else if (command === 'execute') {
    executePlan(phases);
    
  } else if (command === 'go') {
    // Read execution plan if exists
    const planPath = '.github/EXECUTION_PLAN.md';
    if (existsSync(planPath)) {
      const planContent = readFileSync(planPath, 'utf-8');
      const phasesMatch = planContent.match(/\*\*Phases:\*\*\s*(.+)/);
      const targetPhases = phasesMatch ? phasesMatch[1].split(',').map(p => p.trim()) : [];
      executePlan(targetPhases);
    } else {
      console.error('❌ No execution plan found. Run "plan" command first.');
      process.exit(1);
    }
    
  } else {
    console.error('Usage:');
    console.error('  generate-prompts --phases="Phase 2.5,Phase 3"');
    console.error('  plan --phases="Phase 2.5"');
    console.error('  execute --phases="Phase 2.5"');
    console.error('  go  (executes existing plan)');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { parseRoadmapTasks, getTasksForPhases, analyzeExecutionStrategy, generatePromptForTask };

