import { test, expect } from '@playwright/test';

test('health endpoint responds 200', async ({ request, baseURL }) => {
  const url = (baseURL ?? 'http://localhost:3000') + '/api/health';
  const res = await request.get(url);
  expect(res.ok()).toBeTruthy();
});
