import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { deployments } from "../../drizzle/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";

export const deploymentsRouter = router({
  /**
   * List deployments with optional filters
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        branch: z.string().optional(),
        status: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      const conditions = [];
      if (input.branch) {
        conditions.push(eq(deployments.branch, input.branch));
      }
      if (input.status) {
        conditions.push(eq(deployments.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(deployments.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(deployments.createdAt, new Date(input.endDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(deployments)
        .where(whereClause)
        .orderBy(desc(deployments.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(deployments)
        .where(whereClause);

      return {
        deployments: results,
        total: Number(countResult?.count || 0),
        hasMore: input.offset + results.length < Number(countResult?.count || 0),
      };
    }),

  /**
   * Get a single deployment by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.id, input.id))
        .limit(1);

      if (!deployment) {
        throw new Error("Deployment not found");
      }

      return deployment;
    }),

  /**
   * Get deployment by commit SHA
   */
  getByCommit: protectedProcedure
    .input(z.object({ commitSha: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.commitSha, input.commitSha))
        .orderBy(desc(deployments.createdAt))
        .limit(1);

      if (!deployment) {
        throw new Error("Deployment not found");
      }

      return deployment;
    }),

  /**
   * Get the latest deployment
   */
  latest: protectedProcedure.query(async () => {
    const db = await getDb();
    const [deployment] = await db
      .select()
      .from(deployments)
      .orderBy(desc(deployments.createdAt))
      .limit(1);

    return deployment || null;
  }),

  /**
   * Get deployment statistics
   */
  stats: protectedProcedure.query(async () => {
    const db = await getDb();

    // Total deployments
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deployments);

    // Success count
    const [successResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deployments)
      .where(eq(deployments.status, "success"));

    // Failed count
    const [failedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deployments)
      .where(eq(deployments.status, "failed"));

    // Average duration (only successful deployments)
    const [avgDurationResult] = await db
      .select({ avg: sql<number>`AVG(duration)` })
      .from(deployments)
      .where(and(
        eq(deployments.status, "success"),
        sql`duration IS NOT NULL`
      ));

    // Recent failures (last 5)
    const recentFailures = await db
      .select()
      .from(deployments)
      .where(eq(deployments.status, "failed"))
      .orderBy(desc(deployments.createdAt))
      .limit(5);

    // Deployments in progress
    const [inProgressResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deployments)
      .where(sql`status IN ('pending', 'building', 'deploying')`);

    const total = Number(totalResult?.count || 0);
    const success = Number(successResult?.count || 0);
    const failed = Number(failedResult?.count || 0);
    const avgDuration = Number(avgDurationResult?.avg || 0);
    const inProgress = Number(inProgressResult?.count || 0);

    return {
      totalDeployments: total,
      successfulDeployments: success,
      failedDeployments: failed,
      inProgressDeployments: inProgress,
      successRate: total > 0 ? (success / total) * 100 : 0,
      averageDuration: Math.round(avgDuration), // seconds
      recentFailures,
    };
  }),

  /**
   * Get deployments by status
   */
  byStatus: protectedProcedure
    .input(z.object({ status: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await db
        .select()
        .from(deployments)
        .where(eq(deployments.status, input.status))
        .orderBy(desc(deployments.createdAt))
        .limit(10);

      return results;
    }),

  /**
   * Get current deployment in progress
   */
  current: protectedProcedure.query(async () => {
    const db = await getDb();
    const [deployment] = await db
      .select()
      .from(deployments)
      .where(sql`status IN ('pending', 'building', 'deploying')`)
      .orderBy(desc(deployments.createdAt))
      .limit(1);

    return deployment || null;
  }),
});
