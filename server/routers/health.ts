import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { requirePermission } from '../_core/permissionMiddleware';
import {
  performHealthCheck,
  performPublicHealthCheck,
  livenessCheck,
  readinessCheck,
  getHealthMetrics
} from '../_core/healthCheck';

/**
 * Health Router
 * Exposes health check endpoints for monitoring and orchestration
 *
 * SECURITY: Public endpoints return minimal information
 * Detailed information requires authentication
 *
 * Endpoints:
 * - check: Public minimal health status
 * - checkDetailed: Full health check (requires admin auth)
 * - liveness: Simple check if service is running (for k8s/docker liveness probes)
 * - readiness: Check if service can handle requests (for k8s readiness probes)
 * - metrics: Get detailed runtime metrics (requires admin auth)
 */
export const healthRouter = router({
  /**
   * SECURITY: Public health check - returns minimal information only
   * Safe for load balancers and external monitoring
   */
  check: publicProcedure.query(async () => {
    return performPublicHealthCheck();
  }),

  /**
   * Detailed health check (requires admin authentication)
   * Returns full diagnostic information
   */
  checkDetailed: protectedProcedure
    .use(requirePermission("system:health"))
    .query(async () => {
      return performHealthCheck();
    }),

  /**
   * Simple liveness check
   * Returns OK if the server is running - used for container health probes
   */
  liveness: publicProcedure.query(() => {
    return livenessCheck();
  }),

  /**
   * Readiness check
   * Returns OK if the server can handle requests (database connected, memory ok)
   * Used for load balancer health checks
   * SECURITY: Returns minimal information (just status)
   */
  readiness: publicProcedure.query(async () => {
    return readinessCheck();
  }),

  /**
   * Runtime metrics (requires admin authentication)
   * Returns detailed metrics for monitoring dashboards
   * SECURITY: Contains sensitive system information
   */
  metrics: protectedProcedure
    .use(requirePermission("system:metrics"))
    .query(() => {
      return getHealthMetrics();
    }),
});
