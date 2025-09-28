/**
 * @jest-environment node
 */

describe('QA cron endpoints', () => {
  beforeAll(() => { process.env.ENABLE_QA_CRONS = 'true'; });
  afterAll(() => { delete process.env.ENABLE_QA_CRONS; });

  test('profitability-nightly runs', async () => {
    const mod = require('../src/app/api/qa/profitability-nightly/route.ts');
    const res = await mod.GET(new Request('http://localhost/api/qa/profitability-nightly'));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(typeof j.data.revenue).toBe('number');
    expect(typeof j.data.cogs).toBe('number');
  });

  test('reservations-expiry runs', async () => {
    const mod = require('../src/app/api/qa/reservations-expiry/route.ts');
    const res = await mod.GET(new Request('http://localhost/api/qa/reservations-expiry'));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(typeof j.data.released).toBe('number');
  });

  test('self-heal runs', async () => {
    const mod = require('../src/app/api/qa/self-heal/route.ts');
    const res = await mod.GET(new Request('http://localhost/api/qa/self-heal'));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(Array.isArray(j.data.fixes)).toBe(true);
    expect(Array.isArray(j.data.errors)).toBe(true);
    expect(typeof j.data.postingLocked).toBe('boolean');
  });
});
