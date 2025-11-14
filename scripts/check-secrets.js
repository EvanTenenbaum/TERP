const fs = require('fs');
const path = require('path');

const promptsDir = 'docs/prompts';
const secretPatterns = [
  /api[_-]?key[\"\s:=]+[a-zA-Z0-9]{20,}/i,
  /secret[\"\s:=]+[a-zA-Z0-9]{20,}/i,
  /password[\"\s:=]+[^\s]{8,}/i,
  /token[\"\s:=]+[a-zA-Z0-9]{20,}/i,
];

const errors = [];
const promptFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md'));

promptFiles.forEach(file => {
  const promptPath = path.join(promptsDir, file);
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  secretPatterns.forEach((pattern, index) => {
    if (pattern.test(prompt)) {
      errors.push(`${file}: Potential secret detected (pattern ${index + 1})`);
    }
  });
});

if (errors.length > 0) {
  console.error('❌ Secret scan failed:');
  errors.forEach(err => console.error(`  - ${err}`));
  console.error('\n⚠️  Remove secrets and use placeholders like YOUR_API_KEY_HERE');
  process.exit(1);
} else {
  console.log('✅ No secrets detected in prompts');
}
