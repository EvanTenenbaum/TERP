const fs = require('fs');
const path = require('path');

const activeSessionsDir = 'docs/sessions/active';
const abandonedSessionsDir = 'docs/sessions/abandoned';

if (!fs.existsSync(activeSessionsDir)) {
  console.log('✅ No active sessions to clean');
  process.exit(0);
}

const sessionFiles = fs.readdirSync(activeSessionsDir).filter(f => f.endsWith('.md'));
const now = new Date();
const staleThresholdHours = 24;
let movedCount = 0;

sessionFiles.forEach(file => {
  const sessionPath = path.join(activeSessionsDir, file);
  const session = fs.readFileSync(sessionPath, 'utf-8');
  
  // Extract last updated
  const lastUpdatedMatch = session.match(/\*\*Last Updated:\*\* (.+)/);
  if (!lastUpdatedMatch) {
    console.warn(`⚠️  ${file}: Missing Last Updated timestamp, skipping`);
    return;
  }
  
  const lastUpdated = new Date(lastUpdatedMatch[1]);
  const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > staleThresholdHours) {
    // Move to abandoned
    const targetPath = path.join(abandonedSessionsDir, file);
    fs.renameSync(sessionPath, targetPath);
    console.log(`📦 Moved stale session: ${file} (${hoursSinceUpdate.toFixed(1)}h old)`);
    movedCount++;
  }
});

if (movedCount > 0) {
  console.log(`✅ Cleaned ${movedCount} stale session(s)`);
} else {
  console.log('✅ No stale sessions found');
}
