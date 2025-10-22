import { AuditEvent } from "@/types/entities";

let auditLog: AuditEvent[] = [];

export interface CreateAuditParams {
  action: string;
  entity_type: string;
  entity_id: string;
  before?: any;
  after?: any;
  ui_context?: string;
  user_id?: string;
  module?: string;
}

/**
 * Create an audit entry
 */
export function createAuditEntry(params: CreateAuditParams): AuditEvent {
  const entry: AuditEvent = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    user_id: params.user_id || "U-001", // Default to current user
    module: params.module || params.entity_type,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    action: params.action,
    before: params.before || null,
    after: params.after || null,
    ui_context: params.ui_context || "",
  };

  auditLog.push(entry);
  console.log("[AUDIT]", entry);
  
  return entry;
}

/**
 * Get all audit entries
 */
export function getAuditLog(): AuditEvent[] {
  return [...auditLog];
}

/**
 * Get audit entries for a specific entity
 */
export function getEntityAuditLog(entityType: string, entityId: string): AuditEvent[] {
  return auditLog.filter(
    (entry) => entry.entity_type === entityType && entry.entity_id === entityId
  );
}

/**
 * Clear audit log (for testing)
 */
export function clearAuditLog(): void {
  auditLog = [];
}
