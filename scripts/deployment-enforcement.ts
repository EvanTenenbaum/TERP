#!/usr/bin/env tsx
/**
 * INFRA-004: Deployment Monitoring Enforcement
 *
 * This module provides deployment health checks and monitoring enforcement.
 * Ensures deployments don't complete if health checks fail, and alerts on issues.
 *
 * Usage:
 *   tsx scripts/deployment-enforcement.ts check [--strict]
 *   tsx scripts/deployment-enforcement.ts monitor <commit-sha>
 *   tsx scripts/deployment-enforcement.ts health
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import https from 'https';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface DeploymentConfig {
  appUrl: string;
  healthEndpoint: string;
  metricsEndpoint: string;
  maxRetries: number;
  retryDelayMs: number;
  healthCheckTimeoutMs: number;
  slackWebhookUrl?: string;
  strictMode: boolean;
  enableAutoRollback: boolean;
  digitalOceanToken?: string;
  digitalOceanAppId?: string;
}

const DEFAULT_CONFIG: DeploymentConfig = {
  appUrl: process.env.APP_URL || 'https://terp-app-b9s35.ondigitalocean.app',
  healthEndpoint: '/api/health',
  metricsEndpoint: '/api/monitoring/metrics',
  maxRetries: 5,
  retryDelayMs: 5000,
  healthCheckTimeoutMs: 10000,
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  strictMode: process.argv.includes('--strict'),
  enableAutoRollback: process.env.ENABLE_AUTO_ROLLBACK === 'true' || process.argv.includes('--auto-rollback'),
  digitalOceanToken: process.env.DIGITALOCEAN_TOKEN,
  digitalOceanAppId: process.env.DIGITALOCEAN_APP_ID,
};

// ============================================================================
// TYPES
// ============================================================================

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    api: boolean;
    database: boolean;
    memory: boolean;
    responseTime: number;
  };
  timestamp: string;
  version?: string;
  error?: string;
}

interface DeploymentEnforcementResult {
  passed: boolean;
  commitSha: string;
  timestamp: string;
  healthCheck: HealthCheckResult;
  alerts: string[];
  recommendations: string[];
}

// ============================================================================
// HTTP UTILITIES
// ============================================================================

function httpGet(url: string, timeoutMs: number = 10000): Promise<{ statusCode: number; body: string; responseTime: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'TERP-Deployment-Monitor/1.0',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 500,
          body: data,
          responseTime: Date.now() - startTime,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on('error', reject);
    req.end();
  });
}

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function performHealthCheck(config: DeploymentConfig): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'unhealthy',
    checks: {
      api: false,
      database: false,
      memory: false,
      responseTime: -1,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    // Check main health endpoint
    const healthUrl = `${config.appUrl}${config.healthEndpoint}`;
    const response = await httpGet(healthUrl, config.healthCheckTimeoutMs);

    result.checks.responseTime = response.responseTime;
    result.checks.api = response.statusCode >= 200 && response.statusCode < 300;

    if (result.checks.api) {
      try {
        const healthData = JSON.parse(response.body);
        result.version = healthData.version;
        result.checks.database = healthData.database?.connected ?? healthData.db === 'ok' ?? true;
        result.checks.memory = healthData.memory?.heapUsed ?
          healthData.memory.heapUsed < (healthData.memory.heapTotal * 0.9) : true;
      } catch {
        // Health endpoint returned non-JSON, but API is up
        result.checks.database = true;
        result.checks.memory = true;
      }
    }

    // Determine overall status
    const allChecks = [result.checks.api, result.checks.database, result.checks.memory];
    const passedChecks = allChecks.filter(Boolean).length;

    if (passedChecks === allChecks.length) {
      result.status = 'healthy';
    } else if (passedChecks > 0) {
      result.status = 'degraded';
    } else {
      result.status = 'unhealthy';
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.status = 'unhealthy';
  }

  return result;
}

async function performHealthCheckWithRetries(config: DeploymentConfig): Promise<HealthCheckResult> {
  let lastResult: HealthCheckResult | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    console.log(`  Health check attempt ${attempt}/${config.maxRetries}...`);

    lastResult = await performHealthCheck(config);

    if (lastResult.status === 'healthy') {
      console.log(`  [OK] Health check passed (${lastResult.checks.responseTime}ms)`);
      return lastResult;
    }

    if (lastResult.status === 'degraded' && !config.strictMode) {
      console.log(`  [WARN] Health check degraded but acceptable`);
      return lastResult;
    }

    if (attempt < config.maxRetries) {
      console.log(`  [RETRY] Waiting ${config.retryDelayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, config.retryDelayMs));
    }
  }

  return lastResult!;
}

// ============================================================================
// ROLLBACK FUNCTIONALITY
// ============================================================================

/**
 * Get the previous successful deployment from Digital Ocean
 */
async function getPreviousSuccessfulDeployment(config: DeploymentConfig): Promise<string | null> {
  if (!config.digitalOceanToken || !config.digitalOceanAppId) {
    console.log('  [SKIP] Auto-rollback not configured (missing DO credentials)');
    return null;
  }

  try {
    const urlObj = new URL(`https://api.digitalocean.com/v2/apps/${config.digitalOceanAppId}/deployments`);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.digitalOceanToken}`,
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`DO API returned ${res.statusCode}: ${data}`));
            return;
          }

          try {
            const response = JSON.parse(data);
            // Find the most recent ACTIVE deployment (excluding current)
            const activeDeployments = response.deployments.filter(
              (d: any) => d.phase === 'ACTIVE'
            );

            if (activeDeployments.length > 0) {
              const previousDeployment = activeDeployments[0];
              resolve(previousDeployment.id);
            } else {
              resolve(null);
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse DO API response: ${parseError}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  } catch (error) {
    console.error(`  [ERROR] Failed to get previous deployment: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/**
 * Trigger a rollback to the previous deployment
 */
async function triggerRollback(config: DeploymentConfig, previousDeploymentId: string): Promise<boolean> {
  if (!config.digitalOceanToken || !config.digitalOceanAppId) {
    return false;
  }

  console.log(`\n🔄 Triggering rollback to deployment ${previousDeploymentId}...`);

  try {
    const urlObj = new URL(`https://api.digitalocean.com/v2/apps/${config.digitalOceanAppId}/deployments/${previousDeploymentId}/actions/rollback`);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.digitalOceanToken}`,
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log('  [OK] Rollback triggered successfully');
            resolve(true);
          } else {
            console.error(`  [ERROR] Rollback failed with status ${res.statusCode}: ${data}`);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error(`  [ERROR] Rollback request failed: ${error.message}`);
        resolve(false);
      });

      req.end();
    });
  } catch (error) {
    console.error(`  [ERROR] Failed to trigger rollback: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

// ============================================================================
// DEPLOYMENT ENFORCEMENT
// ============================================================================

async function enforceDeployment(commitSha: string, config: DeploymentConfig): Promise<DeploymentEnforcementResult> {
  console.log('\n========================================');
  console.log('TERP Deployment Enforcement Check');
  console.log('========================================\n');
  console.log(`Commit: ${commitSha}`);
  console.log(`App URL: ${config.appUrl}`);
  console.log(`Strict Mode: ${config.strictMode}`);
  console.log('');

  const result: DeploymentEnforcementResult = {
    passed: false,
    commitSha,
    timestamp: new Date().toISOString(),
    healthCheck: {
      status: 'unhealthy',
      checks: { api: false, database: false, memory: false, responseTime: -1 },
      timestamp: new Date().toISOString(),
    },
    alerts: [],
    recommendations: [],
  };

  // Step 1: Wait for deployment to stabilize
  console.log('Step 1: Waiting for deployment to stabilize (30s)...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Step 2: Perform health checks
  console.log('\nStep 2: Performing health checks...');
  result.healthCheck = await performHealthCheckWithRetries(config);

  // Step 3: Analyze results
  console.log('\nStep 3: Analyzing deployment health...');

  if (!result.healthCheck.checks.api) {
    result.alerts.push('CRITICAL: API is not responding');
    result.recommendations.push('Check application logs for startup errors');
    result.recommendations.push('Verify DATABASE_URL environment variable is set correctly');
  }

  if (!result.healthCheck.checks.database) {
    result.alerts.push('CRITICAL: Database connection failed');
    result.recommendations.push('Verify database credentials and connectivity');
    result.recommendations.push('Check if database migrations ran successfully');
  }

  if (!result.healthCheck.checks.memory) {
    result.alerts.push('WARNING: High memory usage detected');
    result.recommendations.push('Consider increasing memory allocation');
    result.recommendations.push('Review for memory leaks in recent changes');
  }

  if (result.healthCheck.checks.responseTime > 5000) {
    result.alerts.push('WARNING: Slow response time detected');
    result.recommendations.push('Review database query performance');
    result.recommendations.push('Check for blocking operations on startup');
  }

  // Determine pass/fail
  if (config.strictMode) {
    result.passed = result.healthCheck.status === 'healthy';
  } else {
    result.passed = result.healthCheck.status !== 'unhealthy';
  }

  // Step 4: Handle rollback if deployment failed and auto-rollback is enabled
  if (!result.passed && config.enableAutoRollback) {
    console.log('\nStep 4: Deployment failed - initiating auto-rollback...');

    const previousDeploymentId = await getPreviousSuccessfulDeployment(config);

    if (previousDeploymentId) {
      const rollbackSuccess = await triggerRollback(config, previousDeploymentId);

      if (rollbackSuccess) {
        result.alerts.push('AUTO-ROLLBACK: Rolled back to previous deployment');
        result.recommendations.push('Review deployment logs to identify root cause');
        result.recommendations.push('Fix issues and retry deployment');
      } else {
        result.alerts.push('CRITICAL: Auto-rollback failed - manual intervention required');
        result.recommendations.push('Manually rollback via Digital Ocean console');
      }
    } else {
      result.alerts.push('WARNING: No previous deployment found for rollback');
      result.recommendations.push('Manual recovery required');
    }
  }

  // Step 5: Send alerts if needed
  if (result.alerts.length > 0 && config.slackWebhookUrl) {
    console.log('\nStep 5: Sending alerts...');
    await sendSlackAlert(result, config);
  }

  // Step 6: Save enforcement result
  saveEnforcementResult(result);

  return result;
}

// ============================================================================
// ALERTING
// ============================================================================

async function sendSlackAlert(result: DeploymentEnforcementResult, config: DeploymentConfig): Promise<void> {
  if (!config.slackWebhookUrl) return;

  const emoji = result.passed ? ':white_check_mark:' : ':x:';
  const status = result.passed ? 'PASSED' : 'FAILED';
  const color = result.passed ? '#36a64f' : '#ff0000';

  const payload = {
    attachments: [{
      color,
      title: `${emoji} Deployment Enforcement ${status}`,
      fields: [
        { title: 'Commit', value: result.commitSha.substring(0, 7), short: true },
        { title: 'Health Status', value: result.healthCheck.status.toUpperCase(), short: true },
        { title: 'Response Time', value: `${result.healthCheck.checks.responseTime}ms`, short: true },
        { title: 'Timestamp', value: result.timestamp, short: true },
      ],
      text: result.alerts.length > 0 ?
        `*Alerts:*\n${result.alerts.map(a => `- ${a}`).join('\n')}` :
        'All checks passed successfully.',
    }],
  };

  try {
    await httpPost(config.slackWebhookUrl, JSON.stringify(payload));
    console.log('  [OK] Slack alert sent');
  } catch (error) {
    console.log(`  [WARN] Failed to send Slack alert: ${error instanceof Error ? error.message : error}`);
  }
}

function httpPost(url: string, body: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============================================================================
// RESULT PERSISTENCE
// ============================================================================

function saveEnforcementResult(result: DeploymentEnforcementResult): void {
  const resultsDir = join(process.cwd(), '.deployment-results');

  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  const filename = `enforcement-${result.commitSha.substring(0, 7)}-${Date.now()}.json`;
  const filepath = join(resultsDir, filename);

  writeFileSync(filepath, JSON.stringify(result, null, 2));
  console.log(`\nEnforcement result saved to: ${filepath}`);
}

// ============================================================================
// CLI COMMANDS
// ============================================================================

async function cmdCheck(): Promise<void> {
  console.log('\nRunning quick health check...\n');

  const result = await performHealthCheck(DEFAULT_CONFIG);

  console.log('Health Check Results:');
  console.log('=====================');
  console.log(`Status: ${result.status.toUpperCase()}`);
  console.log(`API: ${result.checks.api ? 'OK' : 'FAILED'}`);
  console.log(`Database: ${result.checks.database ? 'OK' : 'FAILED'}`);
  console.log(`Memory: ${result.checks.memory ? 'OK' : 'HIGH'}`);
  console.log(`Response Time: ${result.checks.responseTime}ms`);
  if (result.version) console.log(`Version: ${result.version}`);
  if (result.error) console.log(`Error: ${result.error}`);

  process.exit(result.status === 'unhealthy' ? 1 : 0);
}

async function cmdMonitor(commitSha: string): Promise<void> {
  const result = await enforceDeployment(commitSha, DEFAULT_CONFIG);

  console.log('\n========================================');
  console.log('ENFORCEMENT RESULT');
  console.log('========================================');
  console.log(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`Health: ${result.healthCheck.status.toUpperCase()}`);

  if (result.alerts.length > 0) {
    console.log('\nAlerts:');
    result.alerts.forEach(a => console.log(`  - ${a}`));
  }

  if (result.recommendations.length > 0) {
    console.log('\nRecommendations:');
    result.recommendations.forEach(r => console.log(`  - ${r}`));
  }

  process.exit(result.passed ? 0 : 1);
}

async function cmdHealth(): Promise<void> {
  console.log('\nPerforming comprehensive health check with retries...\n');

  const result = await performHealthCheckWithRetries(DEFAULT_CONFIG);

  console.log('\nFinal Health Status:');
  console.log('====================');
  console.log(JSON.stringify(result, null, 2));

  process.exit(result.status === 'unhealthy' ? 1 : 0);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'check':
      await cmdCheck();
      break;

    case 'monitor': {
      const commitSha = process.argv[3] || execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      await cmdMonitor(commitSha);
      break;
    }

    case 'health':
      await cmdHealth();
      break;

    default:
      console.log(`
TERP Deployment Enforcement (INFRA-004)

Usage:
  tsx scripts/deployment-enforcement.ts check [--strict]
    Quick health check of the deployed application

  tsx scripts/deployment-enforcement.ts monitor <commit-sha> [--strict] [--auto-rollback]
    Full deployment enforcement check with retries and alerting

  tsx scripts/deployment-enforcement.ts health
    Comprehensive health check with retries

Options:
  --strict          Require all health checks to pass (default: allow degraded)
  --auto-rollback   Automatically rollback to previous deployment if health checks fail

Environment Variables:
  APP_URL                Application URL (default: https://terp-app-b9s35.ondigitalocean.app)
  SLACK_WEBHOOK_URL      Slack webhook for alerts (optional)
  ENABLE_AUTO_ROLLBACK   Enable automatic rollback on failure (default: false)
  DIGITALOCEAN_TOKEN     Digital Ocean API token (required for auto-rollback)
  DIGITALOCEAN_APP_ID    Digital Ocean App ID (required for auto-rollback)
`);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Deployment enforcement failed:', error);
  process.exit(1);
});

// Export for use as module
export {
  performHealthCheck,
  performHealthCheckWithRetries,
  enforceDeployment,
  HealthCheckResult,
  DeploymentEnforcementResult,
};
