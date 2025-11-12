/**
 * Digital Ocean Auto-Discovery
 *
 * Automatically discovers the Digital Ocean app ID by name.
 * Caches the result in git config for fast access.
 *
 * Usage:
 *   tsx scripts/do-auto-discover.ts [app-name]
 *
 * If app-name is not provided, reads from .do/app.yaml
 */

import https from 'https';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DIGITALOCEAN_TOKEN = process.env.DIGITALOCEAN_TOKEN;

interface AppsListResponse {
  apps: Array<{
    id: string;
    spec: {
      name: string;
    };
  }>;
  links?: {
    pages?: {
      next?: string;
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
 * Get app ID from git config cache
 */
function getCachedAppId(): string | null {
  try {
    const result = execSync('git config --local digitalocean.appid', { encoding: 'utf-8' });
    return result.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Store app ID in git config cache
 */
function cacheAppId(appId: string, appName: string): void {
  execSync(`git config --local digitalocean.appid "${appId}"`);
  execSync(`git config --local digitalocean.appname "${appName}"`);
  execSync(`git config --local digitalocean.cached-at "${new Date().toISOString()}"`);
}

/**
 * Get app name from .do/app.yaml
 */
function getAppNameFromConfig(): string | null {
  const configPath = path.join(process.cwd(), '.do', 'app.yaml');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const match = content.match(/^name:\s*(.+)$/m);

  return match ? match[1].trim() : null;
}

/**
 * Find app by name using Digital Ocean API
 */
async function findAppByName(appName: string): Promise<string | null> {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await doRequest(`/v2/apps?page=${page}`) as AppsListResponse;

    for (const app of response.apps) {
      if (app.spec.name === appName) {
        return app.id;
      }
    }

    hasMore = !!response.links?.pages?.next;
    page++;
  }

  return null;
}

/**
 * Main execution
 */
async function main() {
  // Check if token is available
  if (!DIGITALOCEAN_TOKEN) {
    console.error('❌ DIGITALOCEAN_TOKEN environment variable is not set');
    console.error('');
    console.error('Set it up once:');
    console.error('  1. Get a token: https://cloud.digitalocean.com/account/api/tokens');
    console.error('  2. Add to your shell config (~/.bashrc, ~/.zshrc, etc.):');
    console.error('     export DIGITALOCEAN_TOKEN="dop_v1_your_token_here"');
    console.error('  3. Restart your terminal or run: source ~/.bashrc');
    process.exit(1);
  }

  // Get app name
  const appName = process.argv[2] || getAppNameFromConfig();

  if (!appName) {
    console.error('❌ Could not determine app name');
    console.error('   Provide it as an argument or ensure .do/app.yaml exists');
    process.exit(1);
  }

  console.log(`🔍 Looking for Digital Ocean app: "${appName}"`);

  // Check cache first
  const cachedId = getCachedAppId();
  if (cachedId) {
    console.log(`✅ Found cached app ID: ${cachedId}`);
    console.log(cachedId); // Output for capture by scripts
    return;
  }

  // Discover from API
  console.log('📡 Querying Digital Ocean API...');
  const appId = await findAppByName(appName);

  if (!appId) {
    console.error(`❌ App "${appName}" not found in your Digital Ocean account`);
    console.error('');
    console.error('Verify:');
    console.error('  1. App exists at: https://cloud.digitalocean.com/apps');
    console.error('  2. App name matches .do/app.yaml');
    console.error('  3. DIGITALOCEAN_TOKEN has access to this app');
    process.exit(1);
  }

  // Cache for future use
  cacheAppId(appId, appName);

  console.log(`✅ Discovered app ID: ${appId}`);
  console.log(`💾 Cached in git config for future sessions`);
  console.log(appId); // Output for capture by scripts
}

main().catch(error => {
  console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
