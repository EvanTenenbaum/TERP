
/**
 * Health Check Endpoint for Calendar Module
 * Monitors database connectivity and recent event queries
 */
export const calendarHealthRouter = router({
  health: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        return {
          status: "unhealthy",
          message: "Database not available",
          timestamp: new Date().toISOString(),
        };
      }

      // Test query: Get count of events from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(calendarEvents)
        .where(gte(calendarEvents.createdAt, sevenDaysAgo));

      const recentEventsCount = result[0]?.count || 0;

      return {
        status: "healthy",
        message: "Calendar module operational",
        metrics: {
          recentEventsCount,
          databaseConnected: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }),
});
