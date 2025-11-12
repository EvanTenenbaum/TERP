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
 * Automatically discovers the app ID using auto-discovery.
 */

import https from 'https';
import { execSync } from 'child_process';

const DIGITALOCEAN_TOKEN = process.env.DIGITALOCEAN_TOKEN;

if (!DIGITALOCEAN_TOKEN) {
  console.error('❌ DIGITALOCEAN_TOKEN environment variable is required');
  console.error('   Run: tsx scripts/setup-do-token.ts for setup instructions');
  process.exit(1);
}

// Auto-discover app ID
let APP_ID: string;
try {
  console.log('🔍 Discovering Digital Ocean app...');
  const output = execSync('tsx scripts/do-auto-discover.ts', { encoding: 'utf-8' });
  // Extract the app ID from output (last line)
  const lines = output.trim().split('\n');
  APP_ID = lines[lines.length - 1];

  if (!APP_ID || APP_ID.length < 10) {
    throw new Error('Invalid app ID received from auto-discovery');
  }
} catch (error) {
  console.error('❌ Failed to discover app ID');
  console.error('   Run: tsx scripts/do-auto-discover.ts for details');
  process.exit(1);
}

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
    console.log(`App ID: ${APP_ID}\n`);

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
