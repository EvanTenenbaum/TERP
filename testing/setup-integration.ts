import { execSync } from 'child_process';

function isTruthy(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'yes';
}

export default async () => {
  console.log('\nSetting up integration test environment...');

  // Reset the database to a clean state
  execSync('pnpm test:db:fresh', { stdio: 'inherit' });

  console.log('✅ Integration test environment ready.\n');

  // Teardown function to be called after all tests
  return () => {
    if (!isTruthy(process.env.TEST_DB_AUTO_STOP)) {
      console.log(
        '\nLeaving local test database running for reuse. Set TEST_DB_AUTO_STOP=1 to stop it automatically.'
      );
      return;
    }

    console.log('\nTearing down integration test environment...');
    execSync('pnpm test:env:down', { stdio: 'inherit' });
    console.log('✅ Integration test environment torn down.');
  };
};
