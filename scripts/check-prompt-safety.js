const fs = require('fs');
const path = require('path');

const promptsDir = 'docs/prompts';
const dangerousPatterns = [
  { pattern: /rm\s+-rf/i, description: 'rm -rf command' },
  { pattern: /DROP\s+DATABASE/i, description: 'DROP DATABASE command' },
  { pattern: /DELETE\s+FROM.*WHERE\s+1=1/i, description: 'DELETE FROM ... WHERE 1=1' },
  { pattern: /sudo\s+rm/i, description: 'sudo rm command' },
  { pattern: /chmod\s+777/i, description: 'chmod 777 command' },
  { pattern: />\s*\/dev\/sd[a-z]/i, description: 'writing to disk device' },
];

const errors = [];
const promptFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md'));

promptFiles.forEach(file => {
  const promptPath = path.join(promptsDir, file);
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  dangerousPatterns.forEach(({ pattern, description }) => {
    if (pattern.test(prompt)) {
      errors.push(`${file}: Dangerous command detected: ${description}`);
    }
  });
});

if (errors.length > 0) {
  console.error('❌ Prompt safety scan failed:');
  errors.forEach(err => console.error(`  - ${err}`));
  console.error('\n⚠️  Remove dangerous commands from prompts');
  process.exit(1);
} else {
  console.log('✅ No dangerous commands detected in prompts');
}
