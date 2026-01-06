import { router, publicProcedure } from '../_core/trpc';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const startTime = Date.now();

export const healthRouter = router({
  check: publicProcedure.query(async () => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Check database connectivity
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - dbStart;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      uptime,
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      memory: {
        usedMB: memoryMB,
        limitMB: 512, // DigitalOcean basic-xs limit
      },
    };
  }),
});
