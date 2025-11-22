#!/usr/bin/env tsx

/**
 * Execute Natural Language Commands
 * 
 * Takes parsed commands JSON and executes them via swarm manager.
 * 
 * Usage:
 *   tsx scripts/execute-natural-commands.ts '[parsed-commands-json]'
 */

import { execSync } from 'child_process';
import { markCommandComplete, parseCommand } from './parse-natural-commands';

interface ParsedCommand {
  original: string;
  type: 'until-phase' | 'until-task' | 'batch' | 'auto' | 'unknown';
  target?: string;
  tasks?: string[];
  confidence: number;
  lineNumber: number;
}

function executeCommand(cmd: ParsedCommand): string {
  const { type, target, tasks, original } = cmd;
  
  console.log(`\n🚀 Executing: ${original}`);
  console.log(`   Type: ${type}`);
  
  try {
    if (type === 'until-phase') {
      console.log(`   Target: ${target}`);
      execSync(`pnpm swarm execute --until-phase="${target}"`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      return 'Success';
      
    } else if (type === 'until-task') {
      console.log(`   Target: ${target}`);
      execSync(`pnpm swarm execute --until-task="${target}"`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      return 'Success';
      
    } else if (type === 'batch') {
      const taskList = tasks?.join(',') || '';
      console.log(`   Tasks: ${taskList}`);
      execSync(`pnpm swarm execute --batch="${taskList}"`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      return 'Success';
      
    } else if (type === 'auto') {
      console.log(`   Mode: Auto`);
      execSync(`pnpm swarm execute --auto`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      return 'Success';
      
    } else {
      console.log(`   ⚠️  Unknown command type: ${type}`);
      return 'Unknown command type';
    }
  } catch (error) {
    console.error(`   ❌ Error executing command:`, error);
    return 'Failed';
  }
}

function main() {
  const parsedJson = process.argv[2];
  
  if (!parsedJson) {
    console.error('Error: No parsed commands JSON provided');
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(parsedJson);
    const commands: ParsedCommand[] = data.commands || [];
    
    if (commands.length === 0) {
      console.log('ℹ️  No commands to execute');
      return;
    }
    
    console.log(`📋 Found ${commands.length} command(s) to execute`);
    
    for (const cmd of commands) {
      const result = executeCommand(cmd);
      markCommandComplete(cmd.lineNumber, result);
      console.log(`   ✅ Command completed: ${result}`);
    }
    
  } catch (error) {
    console.error('Error parsing commands JSON:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { executeCommand };

