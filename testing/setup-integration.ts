import { execSync } from 'child_process';

export default async () => {
  console.log('\nSetting up integration test environment...');
  
  // Start the test database container
  execSync('pnpm test:env:up', { stdio: 'inherit' });

  // Reset the database to a clean state
  execSync('pnpm test:db:reset', { stdio: 'inherit' });

  console.log('✅ Integration test environment ready.\n');

  // Teardown function to be called after all tests
  return () => {
    console.log('\nTearing down integration test environment...');
    execSync('pnpm test:env:down', { stdio: 'inherit' });
    console.log('✅ Integration test environment torn down.');
  };
};
