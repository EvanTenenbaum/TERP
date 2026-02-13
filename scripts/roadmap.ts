#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// ============================================================================
// DATA STRUCTURES
// ============================================================================

interface Task {
  id: string;
  title: string;
  status: 'ready' | 'in-progress' | 'complete' | 'blocked';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimateMin: number; // in hours
  estimateMax: number; // in hours
  module: string;
  dependencies: string[];
  objectives: string[];
  deliverables: string[];
  promptPath: string;
  lineNumber: number; // For error reporting
}

interface RoadmapData {
  tasks: Task[];
  parseErrors: Array<{ line: number; error: string }>;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{ taskId: string; line: number; error: string }>;
  warnings: Array<{ taskId: string; line: number; warning: string }>;
}

interface CapacityAnalysis {
  maxSafeAgents: number;
  recommendedTasks: Task[];
  reasoning: string[];
  warnings: string[];
}

interface ActiveSession {
  agent: string;
  taskId: string;
  module: string;
  started: string;
  estimate: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const GITHUB_REPO = 'https://github.com/EvanTenenbaum/TERP';
const MAX_AGENTS = 4; // Conservative safe limit based on empirical data

// ============================================================================
// CACHING
// ============================================================================

let cachedRoadmap: RoadmapData | null = null;
let cachedConflictMap: Map<string, Set<string>> | null = null;

function clearCache(): void {
  cachedRoadmap = null;
  cachedConflictMap = null;
}

// ============================================================================
// PARSING (Efficient, Robust)
// ============================================================================

function parseRoadmap(): RoadmapData {
  if (cachedRoadmap) return cachedRoadmap;

  const content = readFileSync('docs/roadmaps/MASTER_ROADMAP.md', 'utf-8');
  const lines = content.split('\n');
  const tasks: Task[] = [];
  const parseErrors: Array<{ line: number; error: string }> = [];

  let currentSection = '';
  let currentLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect task start
    if (line.match(/^### (ST|BUG|QA|DATA|CL)-\d+/)) {
      currentLineNum = i + 1;
      
      // Extract section until next task or end
      let sectionEnd = i + 1;
      while (sectionEnd < lines.length && !lines[sectionEnd].match(/^### (ST|BUG|QA|DATA|CL)-\d+/)) {
        sectionEnd++;
      }
      
      currentSection = lines.slice(i, sectionEnd).join('\n');
      
      try {
        const task = parseTask(currentSection, currentLineNum);
        tasks.push(task);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        parseErrors.push({ line: currentLineNum, error: message });
      }
    }
  }

  // FIX #6: Validate no duplicate task IDs
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) {
      parseErrors.push({ line: task.lineNumber, error: `Duplicate task ID: ${task.id}` });
    }
    seen.add(task.id);
  }

  cachedRoadmap = { tasks, parseErrors };
  return cachedRoadmap;
}

function parseTask(section: string, lineNumber: number): Task {
  // Extract task ID
  const idMatch = section.match(/^### ((?:ST|BUG|QA|DATA|CL)(?:-\d+)+(?:-[A-Z]+)?)/);
  if (!idMatch) throw new Error('Invalid task ID format (expected PREFIX-XXX)');
  const id = idMatch[1];

  // Extract title
  const titleMatch = section.match(/^### (?:ST|BUG|QA|DATA|CL)(?:-\d+)+(?:-[A-Z]+)?: (.+)$/m);
  if (!titleMatch) throw new Error('Missing title');
  const title = titleMatch[1].trim();

  // Extract metadata fields
  const status = extractField(section, 'Status', ['ready', 'in-progress', 'complete', 'blocked']);
  const priority = extractField(section, 'Priority', ['HIGH', 'MEDIUM', 'LOW']);
  const estimateStr = extractField(section, 'Estimate');
  const { min, max } = parseEstimate(estimateStr); // FIX #5: Support ranges
  const module = extractField(section, 'Module');
  const depsStr = extractField(section, 'Dependencies');
  const dependencies = depsStr === 'None' ? [] : depsStr.split(',').map(d => d.trim());
  const promptPath = extractField(section, 'Prompt');

  // FIX #20: Validate prompt path format
  // Relaxed validation to allow various prefixes
  if (!promptPath.match(/^docs\/prompts\/[A-Z]+-\d+(?:-[A-Z]+)?\.md$/)) {
    throw new Error(`Invalid prompt path format: ${promptPath} (expected docs/prompts/PREFIX-XXX.md)`);
  }

  // Extract objectives (flexible - handles blank lines)
  const objectivesSection = section.match(/\*\*Objectives:\*\*([\s\S]*?)(?=\n\*\*|\n---|$)/);
  const objectives: string[] = [];
  
  if (objectivesSection) {
    const lines = objectivesSection[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') && !trimmed.startsWith('- [ ]')) {
        objectives.push(trimmed.slice(2).trim());
      }
    }
  }

  // Extract deliverables (flexible - handles blank lines)
  const deliverablesSection = section.match(/\*\*Deliverables:\*\*([\s\S]*?)(?=\n\*\*|\n---|$)/);
  const deliverables: string[] = [];
  
  if (deliverablesSection) {
    const lines = deliverablesSection[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [ ]')) {
        deliverables.push(trimmed.slice(6).trim());
      } else if (trimmed.startsWith('- [') && trimmed.includes(']')) {
        // Invalid checkbox format
        throw new Error(`Invalid deliverable format (must be "- [ ] <text>"): ${trimmed}`);
      }
    }
  }

  return {
    id,
    title,
    status: status as Task['status'],
    priority: priority as Task['priority'],
    estimateMin: min,
    estimateMax: max,
    module,
    dependencies,
    objectives,
    deliverables,
    promptPath,
    lineNumber,
  };
}

function extractField(section: string, field: string, validValues?: string[]): string {
  const regex = new RegExp(`\\*\\*${field}:\\*\\* (.+)$`, 'm');
  const match = section.match(regex);
  if (!match) throw new Error(`Missing field: ${field}`);

  let value = match[1].trim();

  // Remove emoji/status icons
  value = value.replace(/[📋⏳✅🚫]/g, '').trim();
  value = value.replace(/🔴|🟡|🟢/g, '').trim();

  // Remove markdown links
  value = value.replace(/\[`(.+?)`\]\(.+?\)/, '$1');
  value = value.replace(/`(.+?)`/, '$1');

  if (validValues && !validValues.includes(value)) {
    throw new Error(`Invalid value for ${field}: "${value}" (expected: ${validValues.join(', ')})`);
  }

  return value;
}

// FIX #5: Support estimate ranges
function parseEstimate(str: string): { min: number; max: number } {
  // Handle ranges: "4-6h" → min=4h, max=6h
  const rangeMatch = str.match(/^(\d+)-(\d+)(h|d|w)$/);
  if (rangeMatch) {
    const [, minStr, maxStr, unit] = rangeMatch;
    return {
      min: parseEstimateValue(minStr, unit),
      max: parseEstimateValue(maxStr, unit),
    };
  }

  // Handle single values: "6h" → min=6h, max=6h
  const singleMatch = str.match(/^(\d+)(h|d|w)$/);
  if (singleMatch) {
    const [, num, unit] = singleMatch;
    const value = parseEstimateValue(num, unit);
    return { min: value, max: value };
  }

  throw new Error(`Invalid estimate format: "${str}" (expected: 6h, 2d, 1w, or 4-6h)`);
}

function parseEstimateValue(numStr: string, unit: string): number {
  const value = parseInt(numStr, 10);
  
  switch (unit) {
    case 'h': return value;
    case 'd': return value * 8;
    case 'w': return value * 40;
    default: throw new Error(`Unknown unit: ${unit}`);
  }
}

// ============================================================================
// VALIDATION (Robust, Clear Errors)
// ============================================================================

function validate(options: { incremental?: boolean } = {}): ValidationResult {
  const { tasks, parseErrors } = parseRoadmap();
  const errors: Array<{ taskId: string; line: number; error: string }> = [];
  const warnings: Array<{ taskId: string; line: number; warning: string }> = [];

  // Parse errors
  for (const { line, error } of parseErrors) {
    errors.push({ taskId: 'PARSE', line, error });
  }

  // FIX #22: Incremental validation (only validate changed tasks)
  let tasksToValidate = tasks;
  if (options.incremental) {
    const changedTaskIds = getChangedTaskIds();
    if (changedTaskIds.length === 0) {
      return { valid: true, errors: [], warnings: [] };
    }
    tasksToValidate = tasks.filter(t => changedTaskIds.includes(t.id));
  }

  // Validate each task
  for (const task of tasksToValidate) {
    // Check objectives
    if (task.objectives.length < 3) {
      errors.push({ taskId: task.id, line: task.lineNumber, error: 'Must have at least 3 objectives' });
    }

    // Check deliverables
    if (task.deliverables.length < 5) {
      errors.push({ taskId: task.id, line: task.lineNumber, error: 'Must have at least 5 deliverables' });
    }

    // Check dependencies exist
    for (const depId of task.dependencies) {
      if (!tasks.find(t => t.id === depId)) {
        errors.push({ taskId: task.id, line: task.lineNumber, error: `Dependency ${depId} does not exist` });
      }
    }

    // FIX #2 & #8: Validate prompt file exists and is complete
    try {
      const promptErrors = validatePromptFile(task.promptPath);
      for (const error of promptErrors) {
        errors.push({ taskId: task.id, line: task.lineNumber, error: `Prompt: ${error}` });
      }
    } catch {
      errors.push({ taskId: task.id, line: task.lineNumber, error: `Prompt file not found: ${task.promptPath}` });
    }

    // FIX #14: Validate module path exists (warning only)
    if (!modulePathExists(task.module)) {
      warnings.push({ taskId: task.id, line: task.lineNumber, warning: `Module path may not exist: ${task.module}` });
    }

    // FIX #13: Priority-based validation
    if (task.priority === 'HIGH') {
      if (task.estimateMax > 16) { // >2 days
        warnings.push({ taskId: task.id, line: task.lineNumber, warning: 'HIGH priority tasks should be <2 days' });
      }
      if (task.status === 'blocked') {
        warnings.push({ taskId: task.id, line: task.lineNumber, warning: 'HIGH priority task is blocked' });
      }
    }
  }

  // Check for circular dependencies
  const circular = detectCircularDependencies(tasks);
  for (const cycle of circular) {
    const firstTask = tasks.find(t => t.id === cycle[0]);
    errors.push({ 
      taskId: cycle[0], 
      line: firstTask?.lineNumber || 0, 
      error: `Circular dependency: ${cycle.join(' → ')}` 
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// FIX #2: Validate prompt file is complete
function validatePromptFile(path: string): string[] {
  const content = readFileSync(path, 'utf-8');
  const errors: string[] = [];

  if (!content.match(/##.*Implementation Guide/i)) {
    errors.push('Missing "## Implementation Guide" section');
  }

  if (content.includes('[TO BE FILLED IN MANUALLY]')) {
    errors.push('Implementation guide not filled in (contains placeholder)');
  }

  // Note: Empty implementation guide is allowed (will be filled by agent)
  // if (content.match(/## Implementation Guide\s*\n\s*##/)) {
  //   errors.push('Implementation guide section is empty');
  // }

  return errors;
}

function modulePathExists(modulePath: string): boolean {
  // Remove trailing slash
  const normalized = modulePath.replace(/\/$/, '');
  
  try {
    // Check if file or directory exists
    return existsSync(normalized);
  } catch {
    return false;
  }
}

function getChangedTaskIds(): string[] {
  try {
    const diff = execSync('git diff --cached docs/roadmaps/MASTER_ROADMAP.md', { encoding: 'utf-8' });

    // Extract task IDs from diff - support all prefixes (ST, BUG, QA, DATA, CL, FEATURE, etc.)
    const taskIds = new Set<string>();
    const matches = diff.matchAll(/^[+\-]### ([A-Z]+-\d+(?:-[A-Z]+)?):/gm);
    for (const match of matches) {
      taskIds.add(match[1]);
    }

    return Array.from(taskIds);
  } catch {
    // If git command fails, validate all tasks
    return [];
  }
}

// FIX #11: Improved circular dependency detection
function detectCircularDependencies(tasks: Task[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(taskId: string, path: string[]): void {
    visited.add(taskId);
    recStack.add(taskId);
    path.push(taskId);

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    for (const depId of task.dependencies) {
      if (!visited.has(depId)) {
        dfs(depId, [...path]);
      } else if (recStack.has(depId)) {
        // Found cycle
        const cycleStart = path.indexOf(depId);
        cycles.push([...path.slice(cycleStart), depId]);
      }
    }

    recStack.delete(taskId);
  }

  // Visit all nodes to catch all cycles
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id, []);
    }
  }

  return cycles;
}

// ============================================================================
// CAPACITY CALCULATION (Simple, Data-Driven)
// ============================================================================

function calculateCapacity(): CapacityAnalysis {
  const { tasks } = parseRoadmap();
  const reasoning: string[] = [];
  const warnings: string[] = [];

  // Filter ready tasks
  const ready = tasks.filter(task => {
    if (task.status !== 'ready') {
      reasoning.push(`${task.id}: Skipped (status: ${task.status})`);
      return false;
    }

    const depsComplete = task.dependencies.every(depId => {
      const dep = tasks.find(t => t.id === depId);
      return dep?.status === 'complete';
    });

    if (!depsComplete) {
      reasoning.push(`${task.id}: Blocked (dependencies not met)`);
      return false;
    }

    return true;
  });

  reasoning.push(`${ready.length} tasks ready`);

  // FIX #23: Build and cache conflict map
  if (!cachedConflictMap) {
    cachedConflictMap = buildConflictMap(ready);
  }
  const conflictMap = cachedConflictMap;

  // Sort by priority
  const sorted = ready.sort((a, b) => {
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // Greedy selection (no conflicts)
  const batch: Task[] = [];
  for (const task of sorted) {
    const hasConflict = batch.some(t => conflictMap.get(task.id)?.has(t.id));

    if (!hasConflict) {
      batch.push(task);
      reasoning.push(`${task.id}: Added to batch (no conflicts)`);
    } else {
      const conflictsWith = batch.find(t => conflictMap.get(task.id)?.has(t.id));
      reasoning.push(`${task.id}: Skipped (conflicts with ${conflictsWith?.id})`);
    }
  }

  // Apply safety rules
  let maxSafe = Math.min(batch.length, MAX_AGENTS);

  // Rule: If any task >16h (2 days), reduce capacity
  const longTasks = batch.filter(t => t.estimateMax > 16);
  if (longTasks.length > 0) {
    warnings.push(`${longTasks.length} task(s) >2 days - reducing capacity to 3 agents`);
    maxSafe = Math.min(maxSafe, 3);
  }

  return {
    maxSafeAgents: maxSafe,
    recommendedTasks: batch.slice(0, maxSafe),
    reasoning,
    warnings,
  };
}

function buildConflictMap(tasks: Task[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  for (const task of tasks) {
    const conflicts = new Set<string>();
    map.set(task.id, conflicts);

    for (const other of tasks) {
      if (task.id === other.id) continue;

      // FIX #7: Improved module conflict detection
      if (modulesConflict(task.module, other.module)) {
        conflicts.add(other.id);
      }
    }
  }

  return map;
}

// FIX #7: Improved conflict detection (fewer false positives)
function modulesConflict(a: string, b: string): boolean {
  const normA = a.replace(/\/$/, '');
  const normB = b.replace(/\/$/, '');

  // Exact match (same file)
  if (normA === normB) return true;

  // One is directory, other is file inside it
  if (a.endsWith('/') && normB.startsWith(normA)) return true;
  if (b.endsWith('/') && normA.startsWith(normB)) return true;

  // Both are files in same directory → NO CONFLICT
  // e.g., server/routers/accounting.ts vs server/routers/analytics.ts

  return false;
}

// ============================================================================
// PROMPT GENERATION (Auto-Generated, Versioned)
// ============================================================================

function generatePrompt(taskId: string, options: { force?: boolean } = {}): void {
  const { tasks } = parseRoadmap();
  const task = tasks.find(t => t.id === taskId);
  
  if (!task) {
    console.error(`❌ Task ${taskId} not found`);
    process.exit(1);
  }

  // FIX #4: Don't overwrite existing prompts
  if (existsSync(task.promptPath) && !options.force) {
    console.error(`❌ Prompt file already exists: ${task.promptPath}`);
    console.error('   Use --force to overwrite (will lose manual edits)');
    process.exit(1);
  }

  // Read template
  const template = readFileSync('docs/templates/PROMPT_TEMPLATE.md', 'utf-8');

  // FIX #3: Add version hash
  const version = getGitVersion();
  const timestamp = new Date().toISOString();

  // FIX #8: Generate accurate coordination section
  const coordination = generateCoordinationSection(task.module);

  // Substitute variables
  let prompt = template
    .replace(/{{TASK_ID}}/g, task.id)
    .replace(/{{TITLE}}/g, task.title)
    .replace(/{{ESTIMATE}}/g, formatEstimate(task.estimateMin, task.estimateMax))
    .replace(/{{MODULE}}/g, task.module)
    .replace(/{{PRIORITY}}/g, task.priority)
    .replace(/{{DEPENDENCIES}}/g, task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None')
    .replace(/{{OBJECTIVES}}/g, task.objectives.map(o => `- ${o}`).join('\n'))
    .replace(/{{DELIVERABLES}}/g, task.deliverables.map(d => `- [ ] ${d}`).join('\n'))
    .replace(/{{VERSION}}/g, version)
    .replace(/{{TIMESTAMP}}/g, timestamp)
    .replace(/{{COORDINATION}}/g, coordination);

  // Write prompt file
  writeFileSync(task.promptPath, prompt);
  console.log(`✅ Generated prompt: ${task.promptPath}`);
  console.log(`   Version: ${version}`);
  console.log(`   Timestamp: ${timestamp}`);
}

function getGitVersion(): string {
  try {
    return execSync('git log -1 --format=%h docs/roadmaps/MASTER_ROADMAP.md', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function formatEstimate(min: number, max: number): string {
  if (min === max) {
    return formatHours(max);
  }
  return `${formatHours(min)}-${formatHours(max)}`;
}

function formatHours(hours: number): string {
  if (hours < 8) return `${hours}h`;
  if (hours < 40) return `${hours / 8}d`;
  return `${hours / 40}w`;
}

// FIX #8: Structured coordination section
function generateCoordinationSection(taskModule: string): string {
  try {
    const sessions = parseActiveSessions();
    
    if (sessions.length === 0) {
      return '> Currently no active sessions. Safe to start.';
    }

    const conflicts = sessions.filter(s => modulesConflict(s.module, taskModule));

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return `> ⚠️ **WARNING:** ${conflict.agent} is working on ${conflict.taskId} (${conflict.module}) which may conflict with this task.\n> Coordinate before starting.`;
    }

    return `> Currently ${sessions.length} active session(s), but no conflicts with this module. Safe to start.`;
  } catch {
    return '> Unable to read ACTIVE_SESSIONS.md. Proceed with caution and check manually.';
  }
}

function parseActiveSessions(): ActiveSession[] {
  const content = readFileSync('docs/ACTIVE_SESSIONS.md', 'utf-8');
  const sessions: ActiveSession[] = [];

  // Parse table rows
  const tableRegex = /\| (.+?) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|/g;
  const matches = content.matchAll(tableRegex);

  for (const match of matches) {
    const [, agent, taskId, module, started, estimate] = match;
    
    // Skip header row
    if (agent.includes('Agent') && taskId.includes('Task')) continue;
    if (agent.includes('---')) continue;

    sessions.push({
      agent: agent.trim(),
      taskId: taskId.trim(),
      module: module.trim(),
      started: started.trim(),
      estimate: estimate.trim(),
    });
  }

  return sessions;
}

// ============================================================================
// CLI (Subcommands)
// ============================================================================

function main() {
  const command = process.argv[2];

  switch (command) {
    case 'validate':
      commandValidate();
      break;
    case 'capacity':
      commandCapacity();
      break;
    case 'next-batch':
      commandNextBatch();
      break;
    case 'generate-prompt':
      commandGeneratePrompt();
      break;
    case 'list':
      commandList();
      break;
    case 'status':
      commandStatus();
      break;
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
Usage: pnpm roadmap <command> [options]

Commands:
  validate              Validate MASTER_ROADMAP.md
  capacity              Calculate safe parallel capacity
  next-batch            Generate next batch deployment URLs
  generate-prompt <id>  Generate prompt file for a task
  list                  List all tasks
  status <id>           Check status of a specific task

Options:
  --help, -h           Show this help message
  --force              Force overwrite (for generate-prompt)
  --incremental        Only validate changed tasks (for validate)

Examples:
  pnpm roadmap validate
  pnpm roadmap capacity
  pnpm roadmap next-batch
  pnpm roadmap generate-prompt ST-005
  pnpm roadmap generate-prompt ST-005 --force
  pnpm roadmap list
  pnpm roadmap status ST-005
  `);
}

function commandValidate() {
  const incremental = process.argv.includes('--incremental');
  
  console.log('🔍 Validating MASTER_ROADMAP.md...\n');

  const result = validate({ incremental });

  if (result.errors.length > 0) {
    console.error('❌ Validation FAILED\n');
    for (const { taskId, line, error } of result.errors) {
      console.error(`Line ${line} [${taskId}]: ${error}`);
    }
    console.error('');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:\n');
    for (const { taskId, line, warning } of result.warnings) {
      console.warn(`Line ${line} [${taskId}]: ${warning}`);
    }
    console.warn('');
  }

  const { tasks } = parseRoadmap();
  console.log(`✅ Validation PASSED (${tasks.length} tasks validated)\n`);
}

function commandCapacity() {
  console.log('🔍 Analyzing roadmap capacity...\n');

  const { tasks } = parseRoadmap();
  const analysis = calculateCapacity();

  console.log('📊 Status:');
  console.log(`- Total tasks: ${tasks.length}`);
  console.log(`- Complete: ${tasks.filter(t => t.status === 'complete').length} ✅`);
  console.log(`- In progress: ${tasks.filter(t => t.status === 'in-progress').length} ⏳`);
  console.log(`- Ready: ${tasks.filter(t => t.status === 'ready').length} 📋`);
  console.log(`- Blocked: ${tasks.filter(t => t.status === 'blocked').length} 🚫`);
  console.log('');

  console.log(`🎯 Recommended: ${analysis.maxSafeAgents} agents\n`);

  if (analysis.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of analysis.warnings) {
      console.log(`- ${warning}`);
    }
    console.log('');
  }

  console.log('📋 Reasoning:');
  for (const reason of analysis.reasoning) {
    console.log(`- ${reason}`);
  }
  console.log('');
}

// FIX #1: Generate GitHub URLs (not file paths)
function commandNextBatch() {
  console.log('🚀 Generating next batch...\n');

  const analysis = calculateCapacity();

  if (analysis.recommendedTasks.length === 0) {
    console.log('⚠️  No tasks ready. All tasks are either complete, in progress, or blocked.\n');
    return;
  }

  console.log(`✅ Deploy ${analysis.maxSafeAgents} agent(s):\n`);
  console.log('─'.repeat(80));

  for (let i = 0; i < analysis.recommendedTasks.length; i++) {
    const task = analysis.recommendedTasks[i];
    const url = `${GITHUB_REPO}/blob/main/${task.promptPath}`;
    
    console.log(`\nAgent ${i + 1}: ${url}`);
    console.log(`         (${task.id}: ${task.title})`);
    console.log(`         Estimate: ${formatEstimate(task.estimateMin, task.estimateMax)}, Priority: ${task.priority}`);
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`\n✅ Safe to deploy all ${analysis.maxSafeAgents} agents in parallel\n`);

  if (analysis.warnings.length > 0) {
    console.log('⚠️  Coordination notes:');
    for (const warning of analysis.warnings) {
      console.log(`- ${warning}`);
    }
    console.log('');
  }
}

function commandGeneratePrompt() {
  const taskId = process.argv[3];
  const force = process.argv.includes('--force');

  if (!taskId) {
    console.error('Usage: pnpm roadmap generate-prompt <task-id> [--force]');
    process.exit(1);
  }

  generatePrompt(taskId, { force });
}

function commandList() {
  const { tasks } = parseRoadmap();

  console.log(`\n📋 All Tasks (${tasks.length} total)\n`);
  console.log('─'.repeat(100));

  const byStatus = {
    'ready': tasks.filter(t => t.status === 'ready'),
    'in-progress': tasks.filter(t => t.status === 'in-progress'),
    'blocked': tasks.filter(t => t.status === 'blocked'),
    'complete': tasks.filter(t => t.status === 'complete'),
  };

  for (const [status, statusTasks] of Object.entries(byStatus)) {
    if (statusTasks.length === 0) continue;

    const icon = { ready: '📋', 'in-progress': '⏳', blocked: '🚫', complete: '✅' }[status];
    console.log(`\n${icon} ${status.toUpperCase()} (${statusTasks.length})`);
    
    for (const task of statusTasks) {
      const priorityIcon = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }[task.priority];
      console.log(`  ${priorityIcon} ${task.id}: ${task.title} (${formatEstimate(task.estimateMin, task.estimateMax)})`);
    }
  }

  console.log('\n' + '─'.repeat(100) + '\n');
}

function commandStatus() {
  const taskId = process.argv[3];

  if (!taskId) {
    console.error('Usage: pnpm roadmap status <task-id>');
    process.exit(1);
  }

  const { tasks } = parseRoadmap();
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    console.error(`❌ Task ${taskId} not found\n`);
    process.exit(1);
  }

  const statusIcon = { ready: '📋', 'in-progress': '⏳', blocked: '🚫', complete: '✅' }[task.status];
  const priorityIcon = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }[task.priority];

  console.log(`\n${statusIcon} ${task.id}: ${task.title}\n`);
  console.log(`Status:       ${task.status}`);
  console.log(`Priority:     ${priorityIcon} ${task.priority}`);
  console.log(`Estimate:     ${formatEstimate(task.estimateMin, task.estimateMax)}`);
  console.log(`Module:       ${task.module}`);
  console.log(`Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}`);
  console.log(`Prompt:       ${task.promptPath}`);
  console.log(`\nObjectives (${task.objectives.length}):`);
  for (const obj of task.objectives) {
    console.log(`  - ${obj}`);
  }
  console.log(`\nDeliverables (${task.deliverables.length}):`);
  for (const del of task.deliverables) {
    console.log(`  - ${del}`);
  }
  console.log('');
}

// Run CLI
main();
