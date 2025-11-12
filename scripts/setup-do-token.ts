/**
 * One-Time Digital Ocean Token Setup
 *
 * Interactive script to help set up DIGITALOCEAN_TOKEN for the first time.
 * Once configured, works forever across all sessions.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('🔐 Digital Ocean Token Setup\n');
console.log('This is a ONE-TIME setup. Once done, it works forever.\n');

// Check if already set
if (process.env.DIGITALOCEAN_TOKEN) {
  console.log('✅ DIGITALOCEAN_TOKEN is already set!');
  console.log('   Token: ' + process.env.DIGITALOCEAN_TOKEN.substring(0, 20) + '...');
  console.log('\n✨ You\'re all set. No further action needed.\n');
  process.exit(0);
}

console.log('❌ DIGITALOCEAN_TOKEN is not set\n');
console.log('📋 Setup Instructions:\n');

console.log('1️⃣  Create a Digital Ocean API token:');
console.log('   → Open: https://cloud.digitalocean.com/account/api/tokens');
console.log('   → Click "Generate New Token"');
console.log('   → Name: "Claude Code Monitor"');
console.log('   → Scopes: READ only (Claude only needs read access)');
console.log('   → Click "Generate Token"');
console.log('   → COPY the token (shown only once!)\n');

console.log('2️⃣  Add to your shell configuration:\n');

// Detect shell
const shell = process.env.SHELL || '';
let shellConfigFile = '~/.bashrc';

if (shell.includes('zsh')) {
  shellConfigFile = '~/.zshrc';
} else if (shell.includes('fish')) {
  shellConfigFile = '~/.config/fish/config.fish';
}

const shellConfigPath = path.join(os.homedir(), shellConfigFile.replace('~/', ''));

console.log(`   Add this line to ${shellConfigFile}:`);
console.log('   ┌─────────────────────────────────────────────────────────────┐');
console.log('   │ export DIGITALOCEAN_TOKEN="dop_v1_YOUR_TOKEN_HERE"        │');
console.log('   └─────────────────────────────────────────────────────────────┘\n');

console.log('   Quick command to add it:');
console.log(`   echo 'export DIGITALOCEAN_TOKEN="dop_v1_YOUR_TOKEN_HERE"' >> ${shellConfigFile}`);
console.log('');

console.log('3️⃣  Reload your shell:');
console.log(`   source ${shellConfigFile}`);
console.log('   OR restart your terminal\n');

console.log('4️⃣  Verify it works:');
console.log('   echo $DIGITALOCEAN_TOKEN');
console.log('   tsx scripts/do-auto-discover.ts\n');

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('🎯 After setup, everything works automatically!');
console.log('   ✅ No app ID needed (auto-discovered)');
console.log('   ✅ No manual configuration (cached in git)');
console.log('   ✅ Works across all Claude Code sessions');
console.log('   ✅ Survives weeks/months between sessions\n');

// Offer to check shell config
if (fs.existsSync(shellConfigPath)) {
  const content = fs.readFileSync(shellConfigPath, 'utf-8');
  if (content.includes('DIGITALOCEAN_TOKEN')) {
    console.log('ℹ️  Found DIGITALOCEAN_TOKEN in your shell config');
    console.log('   If you just added it, reload your shell:');
    console.log(`   source ${shellConfigFile}\n`);
  }
}
