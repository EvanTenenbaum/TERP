/**
 * Digital Ocean Deployment Monitor
 *
 * This script monitors a Digital Ocean App Platform deployment and provides
 * real-time status updates. Used by Claude Code to track deployment progress.
 *
 * Usage:
 *   tsx scripts/monitor-deployment.ts <app-id> [deployment-id]
 *
 * Environment Variables:
 *   DIGITALOCEAN_TOKEN - DO API token with read access
 *
 * If deployment-id is not provided, monitors the latest deployment.
 */

import https from 'https';

interface DeploymentResponse {
  deployment: {
    id: string;
    phase: string;
    progress: {
      success_steps: number;
      total_steps: number;
      steps: Array<{
        name: string;
        status: string;
        reason?: {
          message: string;
        };
      }>;
    };
    cause: string;
    created_at: string;
  };
}

interface AppResponse {
  app: {
    id: string;
    active_deployment?: {
      id: string;
    };
    in_progress_deployment?: {
      id: string;
    };
  };
}

const DIGITALOCEAN_TOKEN = process.env.DIGITALOCEAN_TOKEN;

if (!DIGITALOCEAN_TOKEN) {
  console.error('❌ DIGITALOCEAN_TOKEN environment variable is required');
  process.exit(1);
}

const appId = process.argv[2];
let deploymentId = process.argv[3];

if (!appId) {
  console.error('Usage: tsx scripts/monitor-deployment.ts <app-id> [deployment-id]');
  process.exit(1);
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
 * Get the latest deployment ID for an app
 */
async function getLatestDeploymentId(appId: string): Promise<string | null> {
  const response = await doRequest(`/v2/apps/${appId}`) as AppResponse;

  // Check for in-progress deployment first, then active deployment
  if (response.app.in_progress_deployment) {
    return response.app.in_progress_deployment.id;
  }
  if (response.app.active_deployment) {
    return response.app.active_deployment.id;
  }

  return null;
}

/**
 * Get deployment details
 */
async function getDeployment(appId: string, deploymentId: string): Promise<DeploymentResponse> {
  return doRequest(`/v2/apps/${appId}/deployments/${deploymentId}`) as Promise<DeploymentResponse>;
}

/**
 * Get deployment logs
 */
async function getDeploymentLogs(appId: string, deploymentId: string, component: string = 'web'): Promise<string> {
  const response = await doRequest(
    `/v2/apps/${appId}/deployments/${deploymentId}/components/${component}/logs?type=BUILD&follow=false`
  );
  return response.historic_urls?.[0] || '';
}

/**
 * Format phase for display
 */
function formatPhase(phase: string): string {
  const phaseMap: Record<string, string> = {
    'PENDING_BUILD': '⏳ Pending Build',
    'BUILDING': '🔨 Building',
    'PENDING_DEPLOY': '⏳ Pending Deploy',
    'DEPLOYING': '🚀 Deploying',
    'ACTIVE': '✅ Active',
    'SUPERSEDED': '⏭️  Superseded',
    'ERROR': '❌ Error',
    'CANCELED': '🚫 Canceled',
  };

  return phaseMap[phase] || phase;
}

/**
 * Monitor a deployment until completion
 */
async function monitorDeployment(appId: string, deploymentId: string) {
  console.log(`\n📊 Monitoring deployment: ${deploymentId}\n`);

  let lastPhase = '';
  let lastProgress = -1;
  let consecutiveErrors = 0;
  const maxErrors = 3;

  while (true) {
    try {
      const response = await getDeployment(appId, deploymentId);
      const deployment = response.deployment;

      consecutiveErrors = 0; // Reset error count on success

      // Show phase changes
      if (deployment.phase !== lastPhase) {
        console.log(`${formatPhase(deployment.phase)}`);
        lastPhase = deployment.phase;
      }

      // Show progress
      if (deployment.progress) {
        const currentProgress = deployment.progress.success_steps;
        const totalSteps = deployment.progress.total_steps;

        if (currentProgress !== lastProgress) {
          console.log(`  Progress: ${currentProgress}/${totalSteps} steps completed`);
          lastProgress = currentProgress;

          // Show failed steps
          for (const step of deployment.progress.steps) {
            if (step.status === 'ERROR') {
              console.log(`  ❌ Step failed: ${step.name}`);
              if (step.reason?.message) {
                console.log(`     Reason: ${step.reason.message}`);
              }
            }
          }
        }
      }

      // Check for terminal states
      if (deployment.phase === 'ACTIVE') {
        console.log('\n✅ Deployment successful!\n');
        return { success: true, deployment };
      }

      if (deployment.phase === 'ERROR') {
        console.log('\n❌ Deployment failed!\n');
        console.log('Failed steps:');
        for (const step of deployment.progress.steps) {
          if (step.status === 'ERROR') {
            console.log(`  - ${step.name}: ${step.reason?.message || 'Unknown error'}`);
          }
        }
        return { success: false, deployment };
      }

      if (deployment.phase === 'CANCELED') {
        console.log('\n🚫 Deployment was canceled\n');
        return { success: false, deployment };
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds

    } catch (error) {
      consecutiveErrors++;
      console.error(`⚠️  Error fetching deployment status: ${error instanceof Error ? error.message : error}`);

      if (consecutiveErrors >= maxErrors) {
        console.error(`\n❌ Failed to fetch deployment status after ${maxErrors} attempts\n`);
        return { success: false, error };
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get deployment ID if not provided
    if (!deploymentId) {
      console.log('🔍 Finding latest deployment...');
      const latestId = await getLatestDeploymentId(appId);

      if (!latestId) {
        console.error('❌ No deployments found for this app');
        process.exit(1);
      }

      deploymentId = latestId;
      console.log(`Found deployment: ${deploymentId}`);
    }

    // Monitor the deployment
    const result = await monitorDeployment(appId, deploymentId);

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  }
}

main();
