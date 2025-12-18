import { execSync } from 'child_process';

async function globalSetup() {
  console.log('\nSetting up E2E test environment...');
  
  // Ensure the test database container is running
  execSync('pnpm test:env:up', { stdio: 'inherit' });

  // Reset the database with the 'full' scenario for E2E tests
  execSync('pnpm test:db:reset:full', { stdio: 'inherit' });

  console.log('✅ E2E test environment ready.\n');
}

export default globalSetup;
