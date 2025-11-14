const fs = require('fs');
const path = require('path');

const roadmapPath = 'docs/roadmaps/MASTER_ROADMAP.md';
const roadmap = fs.readFileSync(roadmapPath, 'utf-8');

// Parse tasks
const taskPattern = /### (ST-\d+): (.+?)\n\n\*\*Status:\*\* (\w+)/g;
const tasks = [];
let match;

while ((match = taskPattern.exec(roadmap)) !== null) {
  tasks.push({
    id: match[1],
    title: match[2],
    status: match[3]
  });
}

// Validate
const validStatuses = ['ready', 'in-progress', 'review', 'complete', 'blocked', 'deprecated', 'reverted'];
const errors = [];

tasks.forEach(task => {
  if (!validStatuses.includes(task.status)) {
    errors.push(`${task.id}: Invalid status \"${task.status}\"`);
  }
});

// Check for duplicates
const ids = tasks.map(t => t.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length > 0) {
  errors.push(`Duplicate task IDs: ${duplicates.join(', ')}`);
}

if (errors.length > 0) {
  console.error('❌ Roadmap validation failed:');
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('✅ Roadmap validation passed');
}
