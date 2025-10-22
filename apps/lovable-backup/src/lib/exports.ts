import { Export } from "@/types/entities";

let exports: Export[] = [];

export interface CreateExportParams {
  type: string;
  format: "csv" | "pdf";
  data: any;
  user_id?: string;
}

/**
 * Create an export record with 7-day expiry
 */
export function createExport(params: CreateExportParams): Export {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);

  const exportRecord: Export = {
    id: `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: params.user_id || "U-001",
    type: params.type,
    format: params.format,
    file_url: `#download-${params.type}-${params.format}`,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    size_bytes: JSON.stringify(params.data).length,
    status: "ready",
  };

  exports.push(exportRecord);
  return exportRecord;
}

/**
 * Get all exports
 */
export function getExports(): Export[] {
  return [...exports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Get exports for a user
 */
export function getUserExports(userId: string): Export[] {
  return exports.filter((exp) => exp.user_id === userId);
}

/**
 * Clean up expired exports
 */
export function cleanupExpiredExports(): void {
  const now = new Date();
  exports = exports.filter((exp) => new Date(exp.expires_at) > now);
}

/**
 * Generate CSV from data
 */
export function generateCSV(data: any[], columns: string[]): string {
  const header = columns.join(",");
  const rows = data.map((row) => columns.map((col) => row[col] || "").join(","));
  return [header, ...rows].join("\n");
}
