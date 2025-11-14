const fs = require('fs');
const path = require('path');

const roadmapPath = 'docs/roadmaps/MASTER_ROADMAP.md';
const promptsDir = 'docs/prompts';

const roadmap = fs.readFileSync(roadmapPath, 'utf-8');

// Extract task IDs and titles from roadmap
const taskPattern = /### (ST-\\d+): (.+?)\\n/g;
const roadmapTasks = {};
let match;

while ((match = taskPattern.exec(roadmap)) !== null) {
  roadmapTasks[match[1]] = match[2];
}

// Check each prompt file
const errors = [];
const promptFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md'));

promptFiles.forEach(file => {
  const promptPath = path.join(promptsDir, file);
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  // Extract metadata
  const idMatch = prompt.match(/<!-- TASK_ID: (ST-\\d+) -->/);
  const titleMatch = prompt.match(/<!-- TASK_TITLE: (.+?) -->/);
  
  if (!idMatch) {
    errors.push(`${file}: Missing TASK_ID metadata`);
    return;
  }
  
  if (!titleMatch) {
    errors.push(`${file}: Missing TASK_TITLE metadata`);
    return;
  }
  
  const promptId = idMatch[1];
  const promptTitle = titleMatch[1];
  
  // Verify matches roadmap
  if (!roadmapTasks[promptId]) {
    errors.push(`${file}: Task ${promptId} not found in roadmap`);
  } else if (roadmapTasks[promptId] !== promptTitle) {
    errors.push(`${file}: Title mismatch. Prompt: \"${promptTitle}\", Roadmap: \"${roadmapTasks[promptId]}\"`");
  }
});

if (errors.length > 0) {
  console.error('❌ Prompt validation failed:');
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('✅ All prompts match roadmap');
}
