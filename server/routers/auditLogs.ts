/**
 * Audit Logs Router
 * API endpoints for querying audit logs
 */

import { z } from "zod";
import {
  router,
  protectedProcedure,
  strictlyProtectedProcedure,
} from "../_core/trpc";
import * as auditLogger from "../auditLogger";
import { requirePermission } from "../_core/permissionMiddleware";

export const auditLogsRouter = router({
  /**
   * Query audit logs with filters
   */
  query: protectedProcedure
    .use(requirePermission("audit:read"))
    .input(
      z.object({
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        userId: z.number().optional(),
        eventType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(1000).optional(),
      })
    )
    .query(async ({ input }) => {
      const filters = {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        eventType: input.eventType as auditLogger.AuditEventType | undefined,
      };

      return await auditLogger.queryAuditLogs(filters);
    }),

  /**
   * Get audit trail for a specific entity
   */
  getEntityTrail: protectedProcedure
    .use(requirePermission("audit:read"))
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
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
  export: protectedProcedure
    .use(requirePermission("audit:read"))
    .input(
      z.object({
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        userId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const filters = {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      };

      return await auditLogger.exportAuditLogs(filters);
    }),

  /**
   * Get user activity history for admin UI (UX-055)
   */
  getUserHistory: strictlyProtectedProcedure
    .use(requirePermission("users:read"))
    .input(
      z.object({
        userId: z.number(),
        action: z.string().nullable().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const logs = await auditLogger.queryAuditLogs({
        entityType: "user",
        entityId: input.userId,
        eventType: input.action as auditLogger.AuditEventType | undefined,
        limit: input.limit,
      });

      // Type assertion for the audit log entries
      interface AuditLogEntry {
        id: number;
        action: string;
        actorId: number | null;
        actorName?: string | null;
        createdAt: Date | null;
        reason: string | null;
        metadata?: Record<string, unknown>;
      }

      return (logs as AuditLogEntry[]).map(log => ({
        id: log.id,
        action: log.action,
        actorId: log.actorId,
        actorName: log.actorName,
        createdAt: log.createdAt,
        reason: log.reason,
        metadata: log.metadata,
      }));
    }),
});
