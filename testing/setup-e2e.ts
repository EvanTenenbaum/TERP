import { execSync } from 'child_process';

function isTruthy(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'yes';
}

async function globalSetup() {
  console.log('\nSetting up E2E test environment...');

  const cloudMode =
    isTruthy(process.env.MEGA_QA_CLOUD) ||
    isTruthy(process.env.E2E_CLOUD) ||
    isTruthy(process.env.E2E_USE_LIVE_DB) ||
    isTruthy(process.env.MEGA_QA_USE_LIVE_DB);

  if (cloudMode) {
    // Cloud-first / live DB mode:
    // - Do NOT start Docker
    // - Do NOT reset/seed (potentially destructive on live DB)
    // Just ensure we can connect to the configured DB.
    execSync('pnpm test:db:preflight', { stdio: 'inherit' });
    console.log('✅ E2E environment ready (cloud/live DB mode).\n');
    return;
  }

  // Local dev mode: start Docker test DB and reset seed data.
  execSync('pnpm test:env:up', { stdio: 'inherit' });
  execSync('pnpm test:db:reset:full', { stdio: 'inherit' });

  console.log('✅ E2E test environment ready.\n');
}

export default globalSetup;
