import { test, expect } from '@playwright/test';

test('health endpoint responds 200', async ({ request, baseURL }) => {
  const url = (baseURL ?? 'http://localhost:3000') + '/api/health';
  let ok = false;
  const start = Date.now();
  while (Date.now() - start < 25000) {
    const res = await request.get(url);
    if (res.ok()) { ok = true; break; }
    await new Promise(r => setTimeout(r, 500));
  }
  expect(ok).toBeTruthy();
});
