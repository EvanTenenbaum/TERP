const fs = require('fs');

const roadmapPath = 'docs/roadmaps/MASTER_ROADMAP.md';
const roadmap = fs.readFileSync(roadmapPath, 'utf-8');

// Parse dependencies
const depPattern = /### (ST-\d+):.+?\n\*\*Dependencies:\*\* (.+?)\n/gs;
const graph = {};
let match;

while ((match = depPattern.exec(roadmap)) !== null) {
  const taskId = match[1];
  const deps = match[2] === 'None' ? [] : match[2].split(',').map(s => s.trim());
  graph[taskId] = deps;
}

// DFS to detect cycles
function hasCycle(node, visited, recStack) {
  visited[node] = true;
  recStack[node] = true;
  
  const neighbors = graph[node] || [];
  for (const neighbor of neighbors) {
    if (!visited[neighbor]) {
      if (hasCycle(neighbor, visited, recStack)) {
        return true;
      }
    } else if (recStack[neighbor]) {
      return true;
    }
  }
  
  recStack[node] = false;
  return false;
}

const visited = {};
const recStack = {};
let cycleDetected = false;

for (const node in graph) {
  if (!visited[node]) {
    if (hasCycle(node, visited, recStack)) {
      console.error(`❌ Circular dependency detected involving ${node}`);
      cycleDetected = true;
    }
  }
}

if (cycleDetected) {
  process.exit(1);
} else {
  console.log('✅ No circular dependencies detected');
}
