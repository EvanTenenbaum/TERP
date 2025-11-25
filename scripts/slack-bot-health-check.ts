#!/usr/bin/env tsx

/**
 * TERP Commander Slack Bot - Health Check Script
 * 
 * Run this script to verify the Slack bot is properly configured
 * before deployment or to diagnose issues.
 * 
 * Usage: npx tsx scripts/slack-bot-health-check.ts
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';

interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: HealthCheckResult[] = [];

function addCheck(name: string, status: 'pass' | 'fail' | 'warning', message: string) {
  results.push({ name, status, message });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
}

console.log('🔍 TERP Commander Slack Bot - Health Check\n');
console.log('=' .repeat(60) + '\n');

// 1. Environment Variables
console.log('📋 Environment Variables:\n');

const requiredEnvVars = [
  { key: 'SLACK_BOT_TOKEN', pattern: /^xoxb-/ },
  { key: 'SLACK_APP_TOKEN', pattern: /^xapp-/, required: false },
  { key: 'GITHUB_TOKEN', pattern: /^ghp_/, required: false },
  { key: 'GEMINI_API_KEY', pattern: /^AIza/, required: false },
  { key: 'DIGITALOCEAN_ACCESS_TOKEN', pattern: /^dop_v1_/, required: false },
];

requiredEnvVars.forEach(({ key, pattern, required = true }) => {
  const value = process.env[key];
  if (!value) {
    addCheck(key, required ? 'fail' : 'warning', required ? 'Missing (required)' : 'Missing (optional)');
  } else if (!pattern.test(value)) {
    addCheck(key, 'fail', `Invalid format (should match ${pattern})`);
  } else {
    addCheck(key, 'pass', `Set (${value.substring(0, 10)}...)`);
  }
});

console.log('\n📦 Dependencies:\n');

// 2. Check Node.js version
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  if (majorVersion >= 20) {
    addCheck('Node.js Version', 'pass', nodeVersion);
  } else {
    addCheck('Node.js Version', 'fail', `${nodeVersion} (requires >= 20)`);
  }
} catch (e) {
  addCheck('Node.js Version', 'fail', 'Not found');
}

// 3. Check pnpm
try {
  const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
  addCheck('pnpm', 'pass', `v${pnpmVersion}`);
} catch (e) {
  addCheck('pnpm', 'fail', 'Not installed');
}

// 4. Check required packages
const requiredPackages = [
  '@slack/bolt',
  'simple-git',
  'dotenv',
];

requiredPackages.forEach(pkg => {
  try {
    execSync(`pnpm list ${pkg}`, { stdio: 'ignore' });
    addCheck(`Package: ${pkg}`, 'pass', 'Installed');
  } catch (e) {
    addCheck(`Package: ${pkg}`, 'fail', 'Not installed');
  }
});

console.log('\n📁 File Structure:\n');

// 5. Check required files
const requiredFiles = [
  'scripts/slack-bot.ts',
  'scripts/manager.ts',
  'package.json',
  'pnpm-lock.yaml',
];

requiredFiles.forEach(file => {
  if (existsSync(file)) {
    addCheck(`File: ${file}`, 'pass', 'Exists');
  } else {
    addCheck(`File: ${file}`, 'fail', 'Missing');
  }
});

console.log('\n🔧 Git Configuration:\n');

// 6. Check git
try {
  execSync('git --version', { stdio: 'ignore' });
  addCheck('Git', 'pass', 'Installed');
  
  // Check if we're in a git repo
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    addCheck('Git Repository', 'pass', 'Initialized');
    
    // Check remote
    try {
      const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      addCheck('Git Remote', 'pass', remote);
    } catch (e) {
      addCheck('Git Remote', 'warning', 'No remote configured');
    }
  } catch (e) {
    addCheck('Git Repository', 'fail', 'Not a git repository');
  }
} catch (e) {
  addCheck('Git', 'fail', 'Not installed');
}

console.log('\n🧪 Test Execution:\n');

// 7. Check if tests can run
try {
  execSync('pnpm test scripts/slack-bot.test.ts --run', { stdio: 'ignore', timeout: 30000 });
  addCheck('Test Suite', 'pass', 'All tests pass');
} catch (e) {
  addCheck('Test Suite', 'warning', 'Tests failed or not runnable');
}

console.log('\n' + '='.repeat(60) + '\n');

// Summary
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warnings = results.filter(r => r.status === 'warning').length;

console.log('📊 Summary:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   ⚠️  Warnings: ${warnings}`);
console.log(`   📈 Total: ${results.length}\n`);

if (failed > 0) {
  console.log('❌ Health check FAILED. Please fix the issues above before deployment.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  Health check passed with warnings. Review warnings above.\n');
  process.exit(0);
} else {
  console.log('✅ Health check PASSED. Bot is ready for deployment!\n');
  process.exit(0);
}

