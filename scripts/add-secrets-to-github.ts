#!/usr/bin/env tsx

/**
 * Add secrets to GitHub Secrets from local deployment files
 * 
 * This script reads secrets from current_spec.yaml and deployment_details.json
 * and adds them to GitHub Secrets using the GitHub API.
 * 
 * Usage:
 *   tsx scripts/add-secrets-to-github.ts
 * 
 * Requires:
 *   - GITHUB_TOKEN environment variable (with repo:write and secrets:write permissions)
 *   - Node.js crypto module (built-in)
 */

import { readFileSync, existsSync } from 'fs';
import { createPublicKey, publicEncrypt, constants } from 'crypto';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION
// ============================================================================

const REPO_OWNER = 'EvanTenenbaum';
const REPO_NAME = 'TERP';
const GITHUB_API_BASE = 'https://api.github.com';

// ============================================================================
// TYPES
// ============================================================================

interface Secret {
  key: string;
  value: string;
}

// ============================================================================
// GITHUB API FUNCTIONS
// ============================================================================

function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN environment variable required');
  }
  return token;
}

async function fetchPublicKey(): Promise<{ key_id: string; key: string }> {
  const token = getGitHubToken();
  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/public-key`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch public key: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching public key:', error);
    throw error;
  }
}

function encryptSecret(publicKeyPem: string, secretValue: string): string {
  try {
    const publicKey = createPublicKey(publicKeyPem);
    const encrypted = publicEncrypt(
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(secretValue)
    );
    return encrypted.toString('base64');
  } catch (error) {
    console.error('Error encrypting secret:', error);
    throw error;
  }
}

async function createSecret(secretName: string, encryptedValue: string, keyId: string): Promise<void> {
  const token = getGitHubToken();
  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/${secretName}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        encrypted_value: encryptedValue,
        key_id: keyId
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create secret ${secretName}: ${response.statusText} - ${error}`);
    }
  } catch (error) {
    console.error(`Error creating secret ${secretName}:`, error);
    throw error;
  }
}

// ============================================================================
// SECRET EXTRACTION
// ============================================================================

function extractSecretsFromYaml(filePath: string): Secret[] {
  if (!existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const secrets: Secret[] = [];
  
  // Parse YAML-like structure to extract env vars
  const envSection = content.match(/envs:\s*([\s\S]*?)(?=\n\w|\n$)/);
  if (!envSection) return [];
  
  const lines = envSection[1].split('\n');
  let currentKey: string | null = null;
  
  for (const line of lines) {
    const keyMatch = line.match(/- key:\s*(.+)/);
    const valueMatch = line.match(/value:\s*(.+)/);
    
    if (keyMatch) {
      currentKey = keyMatch[1].trim();
    } else if (valueMatch && currentKey) {
      const value = valueMatch[1].trim().replace(/^["']|["']$/g, '');
      // Skip placeholders and non-sensitive values
      if (!value.startsWith('${') && !value.startsWith('{{') && value) {
        secrets.push({ key: currentKey, value });
      }
      currentKey = null;
    }
  }
  
  return secrets;
}

function extractSecretsFromJson(filePath: string): Secret[] {
  if (!existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  const secrets: Secret[] = [];
  
  // Extract from services
  if (data[0]?.spec?.services) {
    for (const service of data[0].spec.services) {
      if (service.envs) {
        for (const env of service.envs) {
          if (env.value && typeof env.value === 'string') {
            secrets.push({ key: env.key, value: env.value });
          }
        }
      }
    }
  }
  
  // Extract from workers
  if (data[0]?.spec?.workers) {
    for (const worker of data[0].spec.workers) {
      if (worker.envs) {
        for (const env of worker.envs) {
          if (env.value && typeof env.value === 'string') {
            secrets.push({ key: env.key, value: env.value });
          }
        }
      }
    }
  }
  
  return secrets;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔐 Adding secrets to GitHub Secrets...\n');
  
  // Collect all secrets from different sources
  const allSecrets = new Map<string, string>();
  
  // Extract from YAML file
  console.log('📋 Reading secrets from current_spec.yaml...');
  const yamlSecrets = extractSecretsFromYaml('current_spec.yaml');
  for (const secret of yamlSecrets) {
    allSecrets.set(secret.key, secret.value);
  }
  console.log(`   Found ${yamlSecrets.length} secrets`);
  
  // Extract from JSON file
  console.log('📋 Reading secrets from deployment_details.json...');
  const jsonSecrets = extractSecretsFromJson('deployment_details.json');
  for (const secret of jsonSecrets) {
    // JSON file has priority (more complete)
    allSecrets.set(secret.key, secret.value);
  }
  console.log(`   Found ${jsonSecrets.length} additional secrets`);
  
  // Filter out non-sensitive values
  const nonSensitiveKeys = ['VITE_APP_TITLE', 'VITE_APP_ID', 'NODE_ENV', 'QA_MODE'];
  for (const key of nonSensitiveKeys) {
    allSecrets.delete(key);
  }
  
  console.log(`\n📊 Total unique secrets to add: ${allSecrets.size}\n`);
  
  // Get GitHub public key
  console.log('🔑 Fetching GitHub public key...');
  const publicKeyData = await fetchPublicKey();
  console.log(`   Key ID: ${publicKeyData.key_id}`);
  
  // Add each secret
  const secretsToAdd = Array.from(allSecrets.entries());
  let successCount = 0;
  let failCount = 0;
  
  for (const [secretName, secretValue] of secretsToAdd) {
    try {
      console.log(`\n📝 Adding secret: ${secretName}...`);
      
      // Encrypt the secret
      const encrypted = encryptSecret(publicKeyData.key, secretValue);
      
      // Create the secret
      await createSecret(secretName, encrypted, publicKeyData.key_id);
      
      console.log(`   ✅ Successfully added ${secretName}`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed to add ${secretName}:`, error instanceof Error ? error.message : String(error));
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully added: ${successCount} secrets`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} secrets`);
  }
  console.log('='.repeat(60));
  
  console.log('\n💡 Next steps:');
  console.log('   1. Verify secrets in GitHub: Settings > Secrets and variables > Actions');
  console.log('   2. Run GitHub Actions workflow to sync to DigitalOcean:');
  console.log('      gh workflow run "Set Secrets to DigitalOcean"');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

