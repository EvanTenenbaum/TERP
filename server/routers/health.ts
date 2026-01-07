import { router, publicProcedure } from '../_core/trpc';
import {
  performHealthCheck,
  livenessCheck,
  readinessCheck,
  getHealthMetrics
} from '../_core/healthCheck';

/**
 * Health Router
 * Exposes health check endpoints for monitoring and orchestration
 *
 * Endpoints:
 * - check: Full health check with database, memory, and external services
 * - liveness: Simple check if service is running (for k8s/docker liveness probes)
 * - readiness: Check if service can handle requests (for k8s readiness probes)
 * - metrics: Get detailed runtime metrics for monitoring
 */
export const healthRouter = router({
  /**
   * Comprehensive health check
   * Checks database, memory, connection pool, and external services
   */
  check: publicProcedure.query(async () => {
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
   */
  readiness: publicProcedure.query(async () => {
    return readinessCheck();
  }),

  /**
   * Runtime metrics
   * Returns detailed metrics for monitoring dashboards
   */
  metrics: publicProcedure.query(() => {
    return getHealthMetrics();
  }),
});
