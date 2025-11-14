const fs = require('fs');
const path = require('path');

const activeSessionsDir = 'docs/sessions/active';

if (!fs.existsSync(activeSessionsDir)) {
  console.log('✅ No active sessions');
  process.exit(0);
}

const sessionFiles = fs.readdirSync(activeSessionsDir).filter(f => f.endsWith('.md'));

if (sessionFiles.length === 0) {
  console.log('✅ No active sessions');
  process.exit(0);
}

const now = new Date();
const warnings = [];

sessionFiles.forEach(file => {
  const sessionPath = path.join(activeSessionsDir, file);
  const session = fs.readFileSync(sessionPath, 'utf-8');
  
  // Extract last updated (optional)
  const lastUpdatedMatch = session.match(/\*\*Last Updated:\*\* (.+)/);
  if (!lastUpdatedMatch) {
    // Just warn, don't fail
    warnings.push(`${file}: Missing Last Updated timestamp (recommended to add)`);
    return;
  }
  
  const lastUpdated = new Date(lastUpdatedMatch[1]);
  const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 24) {
    warnings.push(`${file}: Stale session (last updated ${hoursSinceUpdate.toFixed(1)}h ago). Consider moving to abandoned/`);
  }
});

if (warnings.length > 0) {
  console.warn('⚠️  Session warnings:');
  warnings.forEach(warn => console.warn(`  - ${warn}`));
}

console.log('✅ Session validation passed');
