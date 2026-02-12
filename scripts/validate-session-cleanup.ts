#!/usr/bin/env tsx
/**
 * Session Cleanup Validation Script
 * 
 * Ensures agents properly clean up their sessions when completing tasks.
 * Validates that:
 * 1. Completed tasks don't have active sessions (stale sessions)
 * 2. No duplicate active sessions exist for the same task
 * 
 * Run manually: pnpm validate:sessions
 * Runs automatically: pre-commit hook
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface ValidationError {
  type: 'stale_session' | 'duplicate_session';
  message: string;
}

function getCompletedTasks(): Set<string> {
  const roadmapPath = join(process.cwd(), 'docs/roadmaps/MASTER_ROADMAP.md');
  const content = readFileSync(roadmapPath, 'utf-8');
  const completedTasks = new Set<string>();
  
  // Match lines with ✅ Complete and extract task IDs
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('✅ Complete')) {
      // Look for task IDs in format: CATEGORY-NNN
      const match = line.match(/\b([A-Z]+-\d{3})\b/);
      if (match) {
        completedTasks.add(match[1]);
      }
    }
  }
  
  return completedTasks;
}

function getActiveSessions(): Map<string, string[]> {
  const activeSessionsPath = join(process.cwd(), 'docs/sessions/active');
  const taskSessions = new Map<string, string[]>();
  
  try {
    const files = readdirSync(activeSessionsPath);
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      // Extract task ID from session filename
      // Format: Session-YYYYMMDD-TASK-ID-*.md
      const match = file.match(/Session-\d{8}-([A-Z]+-\d{3})-/);
      if (match) {
        const taskId = match[1];
        let sessions = taskSessions.get(taskId);
        if (!sessions) {
          sessions = [];
          taskSessions.set(taskId, sessions);
        }
        sessions.push(file);
      }
    }
  } catch (error) {
    // Directory might not exist, that's okay
    console.warn('Warning: docs/sessions/active directory not found');
  }
  
  return taskSessions;
}

function validate(): ValidationError[] {
  const errors: ValidationError[] = [];
  const completedTasks = getCompletedTasks();
  const activeSessions = getActiveSessions();
  
  // Check for stale sessions (completed tasks with active sessions)
  for (const [taskId, sessions] of activeSessions) {
    if (completedTasks.has(taskId)) {
      errors.push({
        type: 'stale_session',
        message: `Task ${taskId} is marked ✅ Complete but has ${sessions.length} active session(s): ${sessions.join(', ')}`
      });
    }
  }
  
  // Check for duplicate sessions (same task with multiple active sessions)
  for (const [taskId, sessions] of activeSessions) {
    if (sessions.length > 1) {
      errors.push({
        type: 'duplicate_session',
        message: `Task ${taskId} has ${sessions.length} active sessions: ${sessions.join(', ')}`
      });
    }
  }
  
  return errors;
}

function main() {
  console.log('🔍 Validating session cleanup...\n');
  
  const errors = validate();
  
  if (errors.length === 0) {
    console.log('✅ All sessions properly managed!');
    process.exit(0);
  }
  
  console.error('❌ Session cleanup validation failed:\n');
  for (const error of errors) {
    console.error(`  ${error.type}: ${error.message}`);
  }
  
  console.error('\n💡 To fix:');
  console.error('  1. Archive completed task sessions to docs/sessions/completed/');
  console.error('  2. Remove archived sessions from docs/ACTIVE_SESSIONS.md');
  console.error('  3. Resolve duplicate sessions (keep one, archive others)');
  
  process.exit(1);
}

main();
