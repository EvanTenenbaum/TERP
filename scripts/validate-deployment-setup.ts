/**
 * Validate Deployment Setup
 *
 * Checks that everything is configured correctly for auto-deploy with monitoring.
 * Runs automatically at session start to ensure readiness.
 *
 * Exit codes:
 *   0 - Everything is ready
 *   1 - Setup incomplete (with helpful instructions)
 */

import { execSync } from 'child_process';

let allGood = true;

console.log('🔍 Validating deployment setup...\n');

// Check 1: DIGITALOCEAN_TOKEN
if (!process.env.DIGITALOCEAN_TOKEN) {
  console.log('❌ DIGITALOCEAN_TOKEN not set');
  console.log('   Run: tsx scripts/setup-do-token.ts\n');
  allGood = false;
} else {
  console.log('✅ DIGITALOCEAN_TOKEN is set');
}

// Check 2: App discovery
if (allGood) {
  try {
    execSync('tsx scripts/do-auto-discover.ts', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log('✅ Digital Ocean app auto-discovery works');
  } catch (error) {
    console.log('❌ App auto-discovery failed');
    console.log('   Run: tsx scripts/do-auto-discover.ts for details\n');
    allGood = false;
  }
}

// Check 3: Git config
try {
  const appId = execSync('git config --local digitalocean.appid', { encoding: 'utf-8' }).trim();
  if (appId) {
    console.log(`✅ App ID cached: ${appId.substring(0, 20)}...`);
  }
} catch {
  // Not critical, will be discovered on first use
}

// Final status
console.log('');
if (allGood) {
  console.log('🎉 All systems ready for auto-deploy with monitoring!\n');
  console.log('You can now:');
  console.log('  - Ask Claude to deploy changes directly to production');
  console.log('  - Changes will be pushed to main automatically');
  console.log('  - Deployments will be monitored in real-time');
  console.log('  - Failures will be auto-detected and fixed\n');
  process.exit(0);
} else {
  console.log('⚠️  Setup incomplete. Complete the steps above.\n');
  process.exit(1);
}
