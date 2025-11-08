/**
 * Audit Logs Router
 * API endpoints for querying audit logs
 */

import { z } from "zod";
import { router } from "../_core/trpc";
import * as auditLogger from "../auditLogger";
import { requirePermission } from "../_core/permissionMiddleware";

export const auditLogsRouter = router({
  /**
   * Query audit logs with filters
   */
  query: requirePermission("audit:read")
    .input(
      z.object({
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        userId: z.number().optional(),
        eventType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(1000).optional()
      })
    )
    .query(async ({ input }) => {
      const filters = {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        eventType: input.eventType as any
      };
      
      return await auditLogger.queryAuditLogs(filters);
    }),

  /**
   * Get audit trail for a specific entity
   */
  getEntityTrail: requirePermission("audit:read")
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number()
      })
    )
    .query(async ({ input }) => {
      return await auditLogger.getEntityAuditTrail(
        input.entityType,
        input.entityId
      );
    }),

  /**
   * Export audit logs to JSON
   */
  export: requirePermission("audit:read")
    .input(
      z.object({
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        userId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      })
    )
    .query(async ({ input }) => {
      const filters = {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined
      };
      
      return await auditLogger.exportAuditLogs(filters);
    })
});

