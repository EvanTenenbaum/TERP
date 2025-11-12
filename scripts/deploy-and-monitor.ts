/**
 * Deploy and Monitor Workflow
 *
 * This script provides the complete workflow for:
 * 1. Waiting for a push to trigger DO deployment
 * 2. Finding the new deployment
 * 3. Monitoring it to completion
 * 4. Reporting results
 *
 * Usage:
 *   tsx scripts/deploy-and-monitor.ts
 *
 * This is called by Claude Code after pushing to main.
 */

import https from 'https';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DIGITALOCEAN_TOKEN = process.env.DIGITALOCEAN_TOKEN;

if (!DIGITALOCEAN_TOKEN) {
  console.error('❌ DIGITALOCEAN_TOKEN environment variable is required');
  console.error('   Set it in ~/.config/claude-code/config.json or export it as an env var');
  process.exit(1);
}

// Load app config
const configPath = path.join(process.cwd(), '.do', 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ .do/config.json not found. Please configure your DO app ID.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

if (!config.appId || config.appId === 'YOUR_DO_APP_ID_HERE') {
  console.error('❌ Please set your Digital Ocean App ID in .do/config.json');
  console.error('   Get it from: https://cloud.digitalocean.com/apps');
  process.exit(1);
}

const APP_ID = config.appId;

interface AppResponse {
  app: {
    id: string;
    active_deployment?: {
      id: string;
      created_at: string;
    };
    in_progress_deployment?: {
      id: string;
      created_at: string;
    };
  };
}

/**
 * Make a request to the Digital Ocean API
 */
function doRequest(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.digitalocean.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DIGITALOCEAN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Get the latest deployment
 */
async function getLatestDeployment(): Promise<{ id: string; createdAt: string } | null> {
  const response = await doRequest(`/v2/apps/${APP_ID}`) as AppResponse;

  if (response.app.in_progress_deployment) {
    return {
      id: response.app.in_progress_deployment.id,
      createdAt: response.app.in_progress_deployment.created_at,
    };
  }

  if (response.app.active_deployment) {
    return {
      id: response.app.active_deployment.id,
      createdAt: response.app.active_deployment.created_at,
    };
  }

  return null;
}

/**
 * Wait for a new deployment to be triggered
 */
async function waitForNewDeployment(afterTimestamp: string): Promise<string> {
  console.log('⏳ Waiting for Digital Ocean to start deployment...');
  console.log('   (This usually takes 10-30 seconds after push)');

  const maxWaitTime = 120000; // 2 minutes
  const pollInterval = 5000; // 5 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const deployment = await getLatestDeployment();

    if (deployment && new Date(deployment.createdAt) > new Date(afterTimestamp)) {
      console.log(`\n✅ New deployment detected: ${deployment.id}\n`);
      return deployment.id;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
    process.stdout.write('.');
  }

  throw new Error('Timeout waiting for deployment to start. Check Digital Ocean console.');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Digital Ocean Deployment Workflow\n');
    console.log(`App ID: ${APP_ID}`);
    console.log(`App Name: ${config.appName}\n`);

    // Get current deployment as baseline
    const currentDeployment = await getLatestDeployment();
    const afterTimestamp = currentDeployment?.createdAt || new Date().toISOString();

    // Wait for new deployment to be triggered by the push
    const newDeploymentId = await waitForNewDeployment(afterTimestamp);

    // Monitor the deployment
    console.log('Starting deployment monitor...\n');
    execSync(`tsx scripts/monitor-deployment.ts ${APP_ID} ${newDeploymentId}`, {
      stdio: 'inherit',
    });

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  }
}

main();
