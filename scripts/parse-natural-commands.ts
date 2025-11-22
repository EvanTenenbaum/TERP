#!/usr/bin/env tsx

/**
 * Natural Language Command Parser
 * 
 * Parses natural language commands and converts them to swarm execute commands.
 * 
 * Usage:
 *   tsx scripts/parse-natural-commands.ts [command-file]
 * 
 * Reads from .github/AGENT_COMMANDS.md by default
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ParsedCommand {
  original: string;
  type: 'until-phase' | 'until-task' | 'batch' | 'auto' | 'go' | 'generate-prompts' | 'execute-phases' | 'unknown';
  target?: string;
  tasks?: string[];
  confidence: number;
}

const COMMANDS_FILE = join(process.cwd(), '.github/AGENT_COMMANDS.md');

function parseCommand(text: string): ParsedCommand {
  const lower = text.toLowerCase().trim();
  
  // Phase patterns
  const phasePatterns = [
    /work\s+(?:through|until|on)\s+(?:all\s+tasks\s+in\s+)?(?:phase\s+)?([\d.]+)/i,
    /complete\s+(?:all\s+tasks\s+in\s+)?(?:phase\s+)?([\d.]+)/i,
    /execute\s+(?:phase\s+)?([\d.]+)/i,
    /(?:phase\s+)?([\d.]+)\s+(?:tasks|work)/i,
  ];
  
  for (const pattern of phasePatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        original: text,
        type: 'until-phase',
        target: `Phase ${match[1]}`,
        confidence: 0.9
      };
    }
  }
  
  // Task patterns
  const taskPatterns = [
    /work\s+until\s+([A-Z]+-\d+)\s+(?:is\s+)?(?:complete|done|finished)/i,
    /complete\s+(?:all\s+tasks\s+)?(?:up\s+to|until)\s+([A-Z]+-\d+)/i,
    /execute\s+until\s+([A-Z]+-\d+)/i,
    /until\s+([A-Z]+-\d+)/i,
  ];
  
  for (const pattern of taskPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        original: text,
        type: 'until-task',
        target: match[1].toUpperCase(),
        confidence: 0.9
      };
    }
  }
  
  // Batch patterns
  const batchPatterns = [
    /(?:run|execute|start)\s+([A-Z]+-\d+(?:\s*,\s*[A-Z]+-\d+)*)/i,
    /(?:run|execute|start)\s+(?:agents?\s+for\s+)?([A-Z]+-\d+(?:\s+and\s+[A-Z]+-\d+)*)/i,
  ];
  
  for (const pattern of batchPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const tasks = match[1]
        .split(/[,\s]+and\s+/i)
        .map(t => t.trim().toUpperCase())
        .filter(t => /^[A-Z]+-\d+$/.test(t));
      
      if (tasks.length > 0) {
        return {
          original: text,
          type: 'batch',
          tasks,
          confidence: 0.85
        };
      }
    }
  }
  
  // Auto patterns
  const autoPatterns = [
    /(?:execute|run|start)\s+(?:recommended|auto[- ]?selected)\s+tasks?/i,
    /auto\s+mode/i,
    /recommended\s+tasks/i,
  ];
  
  for (const pattern of autoPatterns) {
    if (pattern.test(lower)) {
      return {
        original: text,
        type: 'auto',
        confidence: 0.8
      };
    }
  }
  
  // "Go" command - execute existing plan
  const goPatterns = [
    /^(?:go|execute|start|run)$/i,
    /^(?:go|execute|start|run)\s+(?:now|plan|execution)$/i,
  ];
  
  for (const pattern of goPatterns) {
    if (pattern.test(lower)) {
      return {
        original: text,
        type: 'go',
        confidence: 0.95
      };
    }
  }
  
  // Generate prompts and plan patterns
  const generatePatterns = [
    /generate\s+prompts?\s+(?:for\s+)?(?:phase\s+)?([\d.]+(?:\s*,\s*[\d.]+)*)/i,
    /create\s+prompts?\s+(?:for\s+)?(?:phase\s+)?([\d.]+(?:\s*,\s*[\d.]+)*)/i,
  ];
  
  for (const pattern of generatePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const phases = match[1].split(',').map(p => p.trim());
      return {
        original: text,
        type: 'generate-prompts',
        target: phases.join(','),
        confidence: 0.9
      };
    }
  }
  
  // Execute phases pattern - also match "execute X phases" or "execute 2 phases"
  const executePhasesPatterns = [
    /execute\s+(?:phase\s+)?([\d.]+(?:\s*,\s*[\d.]+)*)/i,
    /execute\s+(\d+)\s+phases?/i,
    /run\s+(?:phase\s+)?([\d.]+(?:\s*,\s*[\d.]+)*)/i,
    /work\s+through\s+(?:phase\s+)?([\d.]+(?:\s*,\s*[\d.]+)*)/i,
  ];
  
  for (const pattern of executePhasesPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const phases = match[1].split(',').map(p => p.trim());
      return {
        original: text,
        type: 'execute-phases',
        target: phases.join(','),
        confidence: 0.9
      };
    }
  }
  
  return {
    original: text,
    type: 'unknown',
    confidence: 0
  };
}

function extractPendingCommands(): Array<{ text: string; line: number }> {
  if (!existsSync(COMMANDS_FILE)) {
    return [];
  }
  
  const content = readFileSync(COMMANDS_FILE, 'utf-8');
  const lines = content.split('\n');
  const commands: Array<{ text: string; line: number }> = [];
  
  let inPendingSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're in the pending commands section
    if (line.includes('## 🎯 Pending Commands')) {
      inPendingSection = true;
      continue;
    }
    
    // Stop if we hit another section
    if (inPendingSection && line.match(/^##/)) {
      break;
    }
    
    // Look for pending command pattern (only in pending section)
    if (inPendingSection && line.match(/^-\s+\[\s+\]\s+\*\*Command:\*\*/)) {
      // Extract command text (next line or same line)
      let commandText = '';
      
      // Check if command is on same line
      const sameLineMatch = line.match(/\*\*Command:\*\*\s*(.+)$/);
      if (sameLineMatch) {
        commandText = sameLineMatch[1].trim();
      } else {
        // Command might be on next line
        if (i + 1 < lines.length) {
          commandText = lines[i + 1].trim();
        }
      }
      
      if (commandText && !commandText.startsWith('_') && !commandText.startsWith('<!--')) {
        commands.push({ text: commandText, line: i + 1 });
      }
    }
  }
  
  return commands;
}

function markCommandComplete(lineNumber: number, result: string): void {
  if (!existsSync(COMMANDS_FILE)) {
    return;
  }
  
  const content = readFileSync(COMMANDS_FILE, 'utf-8');
  const lines = content.split('\n');
  
  // Find the command block and mark as complete
  for (let i = 0; i < lines.length; i++) {
    if (i === lineNumber - 1) {
      // Mark checkbox as complete
      lines[i] = lines[i].replace(/^-\s+\[\s+\]/, '- [x]');
      
      // Find status line and update
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes('**Status:**')) {
          lines[j] = `  - **Status:** ✅ Complete - ${result}`;
          break;
        }
      }
      
      // Move to completed section
      const completedIndex = lines.findIndex(l => l.includes('## ✅ Completed Commands'));
      if (completedIndex > 0) {
        // Extract command block
        const commandBlock: string[] = [];
        for (let k = i; k < Math.min(i + 10, lines.length); k++) {
          if (lines[k].trim() === '' && k > i + 2) break;
          commandBlock.push(lines[k]);
        }
        
        // Remove from pending
        lines.splice(i, commandBlock.length);
        
        // Add to completed (after header)
        lines.splice(completedIndex + 1, 0, ...commandBlock, '');
      }
      
      break;
    }
  }
  
  writeFileSync(COMMANDS_FILE, lines.join('\n'), 'utf-8');
}

function main() {
  const commands = extractPendingCommands();
  
  if (commands.length === 0) {
    console.log(JSON.stringify({ commands: [], message: 'No pending commands' }));
    return;
  }
  
  const parsed = commands.map(cmd => ({
    ...parseCommand(cmd.text),
    lineNumber: cmd.line
  }));
  
  console.log(JSON.stringify({ commands: parsed }, null, 2));
}

if (require.main === module) {
  main();
}

export { parseCommand, extractPendingCommands, markCommandComplete };

