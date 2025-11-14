const fs = require('fs');
const path = require('path');

const roadmapPath = 'docs/roadmaps/MASTER_ROADMAP.md';
const promptsDir = 'docs/prompts';

const roadmap = fs.readFileSync(roadmapPath, 'utf-8');

// Extract task IDs and titles from roadmap
const taskPattern = /### (ST-\d+): (.+?)\n/g;
const roadmapTasks = {};
let match;

while ((match = taskPattern.exec(roadmap)) !== null) {
  roadmapTasks[match[1]] = match[2];
}

// Check each prompt file
const errors = [];
const warnings = [];
const promptFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));

promptFiles.forEach(file => {
  const promptPath = path.join(promptsDir, file);
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  // Extract task ID from filename or content
  const filenameMatch = file.match(/(ST-\d+)/);
  const contentMatch = prompt.match(/\*\*Task ID:\*\* (ST-\d+)/);
  
  if (!filenameMatch && !contentMatch) {
    errors.push(`${file}: Cannot determine task ID from filename or content`);
    return;
  }
  
  const promptId = contentMatch ? contentMatch[1] : filenameMatch[1];
  
  // Verify task exists in roadmap
  if (!roadmapTasks[promptId]) {
    warnings.push(`${file}: Task ${promptId} not found in roadmap (may be deprecated)`);
  }
});

if (errors.length > 0) {
  console.error('❌ Prompt validation failed:');
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('⚠️  Prompt warnings:');
  warnings.forEach(warn => console.warn(`  - ${warn}`));
}

console.log('✅ All prompts validated');
