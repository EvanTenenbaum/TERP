const fs = require('fs');
const path = require('path');

const activeSessionsDir = 'docs/sessions/active';

if (!fs.existsSync(activeSessionsDir)) {
  console.log('✅ No active sessions');
  process.exit(0);
}

const sessionFiles = fs.readdirSync(activeSessionsDir).filter(f => f.endsWith('.md'));
const now = new Date();
const errors = [];
const warnings = [];

sessionFiles.forEach(file => {
  const sessionPath = path.join(activeSessionsDir, file);
  const session = fs.readFileSync(sessionPath, 'utf-8');
  
  // Extract last updated
  const lastUpdatedMatch = session.match(/\*\*Last Updated:\*\* (.+)/);
  if (!lastUpdatedMatch) {
    errors.push(`${file}: Missing Last Updated timestamp`);
    return;
  }
  
  const lastUpdated = new Date(lastUpdatedMatch[1]);
  const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 24) {
    warnings.push(`${file}: Stale session (last updated ${hoursSinceUpdate.toFixed(1)}h ago). Consider moving to abandoned/`);
  }
});

if (errors.length > 0) {
  console.error('❌ Session validation failed:');
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('⚠️  Session warnings:');
  warnings.forEach(warn => console.warn(`  - ${warn}`));
}

console.log('✅ Session validation passed');
