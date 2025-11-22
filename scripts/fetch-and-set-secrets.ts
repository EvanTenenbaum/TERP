#!/usr/bin/env tsx

/**
 * Fetch secrets from GitHub Secrets and apply to DigitalOcean App Platform
 * 
 * This script allows agents to programmatically access secrets stored in
 * GitHub Secrets and configure them in DigitalOcean App Platform.
 * 
 * Usage:
 *   tsx scripts/fetch-and-set-secrets.ts
 * 
 * Requires:
 *   - GITHUB_TOKEN environment variable (with repo scope)
 *   - DIGITALOCEAN_TOKEN environment variable
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SPEC_FILE = '.do/app.spec.yaml';
const APP_NAME = 'terp-app';

// ============================================================================
// GITHUB SECRETS API
// ============================================================================

/**
 * Fetch a secret from GitHub Secrets using the API
 * 
 * Note: GitHub Secrets API requires special handling - secrets are encrypted
 * and can only be read by GitHub Actions or via the API with proper permissions.
 * 
 * This is a placeholder for the actual implementation. In practice, you would:
 * 1. Use GitHub Actions to fetch secrets (they're only decryptable there)
 * 2. Or use GitHub CLI with proper authentication
 * 3. Or store secrets in a proper secrets manager (AWS Secrets Manager, etc.)
 */
async function fetchGitHubSecret(secretName: string): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn(`⚠️  GITHUB_TOKEN not set. Cannot fetch secret: ${secretName}`);
    return null;
  }

  try {
    // Note: GitHub Secrets API doesn't support reading secret values directly
    // You can only list secret names, not their values
    // For actual values, you need:
    // 1. GitHub Actions (secrets are auto-injected)
    // 2. GitHub CLI with proper setup
    // 3. Or a proper secrets manager
    
    console.log(`📋 Secret ${secretName} should be fetched from GitHub Secrets`);
    console.log(`   Use GitHub Actions or GitHub CLI to access secret values`);
    return null;
  } catch (error) {
    console.error(`❌ Failed to fetch secret ${secretName}:`, error);
    return null;
  }
}

// ============================================================================
// DIGITALOCEAN API
// ============================================================================

/**
 * Set environment variable in DigitalOcean App Platform
 */
async function setDoEnvVar(appId: string, key: string, value: string, scope: string = 'RUN_AND_BUILD_TIME'): Promise<boolean> {
  const token = process.env.DIGITALOCEAN_TOKEN;
  if (!token) {
    console.warn(`⚠️  DIGITALOCEAN_TOKEN not set. Cannot set env var: ${key}`);
    return false;
  }

  try {
    // Use doctl CLI if available
    const doctlAvailable = execSync('which doctl', { encoding: 'utf-8' }).trim();
    if (doctlAvailable) {
      execSync(`doctl apps spec set-env ${appId} ${key}="${value}" --scope ${scope}`, {
        stdio: 'inherit'
      });
      return true;
    }
    
    // Or use DigitalOcean API directly
    console.log(`📋 Would set env var ${key} in DigitalOcean app ${appId}`);
    return false;
  } catch (error) {
    console.error(`❌ Failed to set env var ${key}:`, error);
    return false;
  }
}

// ============================================================================
// SPEC FILE PARSING
// ============================================================================

/**
 * Parse spec file and extract secret placeholders
 */
function extractSecretReferences(specFile: string): Map<string, string> {
  const content = readFileSync(specFile, 'utf-8');
  const secretRefs = new Map<string, string>();
  
  // Find all {{SECRET:NAME}} placeholders
  const regex = /\{\{SECRET:(\w+)\}\}/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const secretName = match[1];
    secretRefs.set(secretName, match[0]);
  }
  
  return secretRefs;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔐 Fetching and setting secrets from GitHub Secrets...\n');
  
  if (!existsSync(SPEC_FILE)) {
    console.error(`❌ Spec file not found: ${SPEC_FILE}`);
    process.exit(1);
  }
  
  // Extract secret references from spec file
  const secretRefs = extractSecretReferences(SPEC_FILE);
  console.log(`Found ${secretRefs.size} secret reference(s) in ${SPEC_FILE}\n`);
  
  if (secretRefs.size === 0) {
    console.log('✅ No secrets to fetch');
    return;
  }
  
  // Fetch each secret and set it in DigitalOcean
  for (const [secretName, placeholder] of secretRefs) {
    console.log(`📋 Processing secret: ${secretName}`);
    
    // In practice, fetch from GitHub Secrets
    // For now, instruct user to set manually in DO Control Panel
    console.log(`   Placeholder: ${placeholder}`);
    console.log(`   ⚠️  Set this secret manually in DigitalOcean Control Panel`);
    console.log(`   Or configure via GitHub Actions workflow\n`);
  }
  
  console.log('💡 Recommendation:');
  console.log('   Store secrets in GitHub Secrets and use GitHub Actions to set them in DigitalOcean');
  console.log('   See: .github/workflows/set-secrets.yml');
}

if (require.main === module) {
  main().catch(console.error);
}

