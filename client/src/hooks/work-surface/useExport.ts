/**
 * useExport Hook (UXS-904)
 *
 * Export functionality for Work Surface data grids.
 * Supports CSV format with row limits to prevent browser freeze.
 *
 * Limits:
 * - Default max rows: 10,000
 * - Chunk processing: 1,000 rows at a time
 * - Progress tracking for large exports
 *
 * @see ATOMIC_UX_STRATEGY.md for export requirements
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface ExportColumn<T = Record<string, unknown>> {
  /** Key in the data object */
  key: keyof T | string;
  /** Display label for header */
  label: string;
  /** Optional formatter function */
  formatter?: (value: unknown, row: T) => string;
  /** Width hint for Excel export */
  width?: number;
}

export interface ExportLimits {
  /** Maximum rows to export */
  maxRows: number;
  /** Rows to process per chunk */
  chunkSize: number;
  /** Maximum file size in MB */
  maxFileSizeMB: number;
}

export interface ExportOptions<T> {
  /** Column definitions */
  columns: ExportColumn<T>[];
  /** File name (without extension) */
  filename: string;
  /** Custom limits */
  limits?: Partial<ExportLimits>;
  /** Include timestamp in filename */
  addTimestamp?: boolean;
  /** Callback on export start */
  onStart?: () => void;
  /** Callback on progress update */
  onProgress?: (progress: number) => void;
  /** Callback on export complete */
  onComplete?: (rowCount: number) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface ExportState {
  /** Whether export is in progress */
  isExporting: boolean;
  /** Export progress (0-100) */
  progress: number;
  /** Current row being processed */
  currentRow: number;
  /** Total rows to export */
  totalRows: number;
  /** Error message if export failed */
  error: string | null;
}

export interface UseExportReturn<T> {
  /** Current export state */
  state: ExportState;
  /** Export data to CSV */
  exportCSV: (data: T[], options: ExportOptions<T>) => Promise<void>;
  /** Export data to Excel (HTML table format) */
  exportExcel: (data: T[], options: ExportOptions<T>) => Promise<void>;
  /** Cancel ongoing export */
  cancel: () => void;
  /** Check if data exceeds limits */
  checkLimits: (rowCount: number) => { exceeds: boolean; message?: string };
  /** Default limits */
  limits: ExportLimits;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_EXPORT_LIMITS: ExportLimits = {
  maxRows: 10000,
  chunkSize: 1000,
  maxFileSizeMB: 50,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape CSV field value
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = String(value);

  // CSV Injection Protection: Prefix formula characters
  if (/^[=+\-@\t]/.test(stringValue)) {
    stringValue = "'" + stringValue;
  }

  // Escape quotes and wrap if needed
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Escape HTML for Excel export
 */
function escapeHTML(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format timestamp for filename
 */
function formatTimestamp(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get nested value from object
 */
function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for exporting data with limits and progress tracking
 *
 * @example
 * ```tsx
 * const { exportCSV, state, checkLimits } = useExport<Order>();
 *
 * const columns = [
 *   { key: 'id', label: 'Order ID' },
 *   { key: 'customer.name', label: 'Customer' },
 *   { key: 'total', label: 'Total', formatter: (v) => `$${v}` },
 * ];
 *
 * // Check limits before export
 * const { exceeds } = checkLimits(orders.length);
 * if (exceeds) {
 *   toast.warning('Too many rows to export');
 * }
 *
 * // Export
 * await exportCSV(orders, {
 *   columns,
 *   filename: 'orders',
 *   addTimestamp: true,
 * });
 * ```
 */
export function useExport<T extends Record<string, unknown>>(
  customLimits?: Partial<ExportLimits>
): UseExportReturn<T> {
  const limits: ExportLimits = useMemo(
    () => ({
      ...DEFAULT_EXPORT_LIMITS,
      ...customLimits,
    }),
    [customLimits]
  );

  const [state, setState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    currentRow: 0,
    totalRows: 0,
    error: null,
  });

  const cancelRef = useRef(false);

  // Check if data exceeds limits
  const checkLimits = useCallback(
    (rowCount: number): { exceeds: boolean; message?: string } => {
      if (rowCount > limits.maxRows) {
        return {
          exceeds: true,
          message: `Export limited to ${limits.maxRows.toLocaleString()} rows. Current selection has ${rowCount.toLocaleString()} rows.`,
        };
      }
      return { exceeds: false };
    },
    [limits.maxRows]
  );

  // Cancel export
  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // Export to CSV
  const exportCSV = useCallback(
    async (data: T[], options: ExportOptions<T>): Promise<void> => {
      const {
        columns,
        filename,
        limits: optionLimits,
        addTimestamp = true,
        onStart,
        onProgress,
        onComplete,
        onError,
      } = options;

      const effectiveLimits = { ...limits, ...optionLimits };

      // Check limits
      const limitCheck = checkLimits(data.length);
      if (limitCheck.exceeds) {
        toast.warning(limitCheck.message!);
        data = data.slice(0, effectiveLimits.maxRows);
      }

      cancelRef.current = false;

      setState({
        isExporting: true,
        progress: 0,
        currentRow: 0,
        totalRows: data.length,
        error: null,
      });

      onStart?.();

      try {
        // Create header row
        const headerRow = columns.map((col) => escapeCSVField(col.label)).join(',');
        const rows: string[] = [headerRow];

        // Process data in chunks
        for (let i = 0; i < data.length; i += effectiveLimits.chunkSize) {
          if (cancelRef.current) {
            throw new Error('Export cancelled');
          }

          const chunk = data.slice(i, i + effectiveLimits.chunkSize);

          for (const row of chunk) {
            const csvRow = columns
              .map((col) => {
                const value = getNestedValue(row, col.key as string);
                const formattedValue = col.formatter
                  ? col.formatter(value, row)
                  : value;
                return escapeCSVField(formattedValue);
              })
              .join(',');
            rows.push(csvRow);
          }

          const progress = Math.round(((i + chunk.length) / data.length) * 100);
          setState((prev) => ({
            ...prev,
            progress,
            currentRow: i + chunk.length,
          }));
          onProgress?.(progress);

          // Yield to UI thread
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Create and download file
        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

        // Check file size
        const fileSizeMB = blob.size / (1024 * 1024);
        if (fileSizeMB > effectiveLimits.maxFileSizeMB) {
          throw new Error(
            `File size (${fileSizeMB.toFixed(1)}MB) exceeds limit (${effectiveLimits.maxFileSizeMB}MB)`
          );
        }

        const fullFilename = addTimestamp
          ? `${filename}_${formatTimestamp()}.csv`
          : `${filename}.csv`;

        downloadBlob(blob, fullFilename);

        toast.success(`Exported ${data.length.toLocaleString()} rows to CSV`);
        onComplete?.(data.length);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        setState((prev) => ({ ...prev, error: message }));
        toast.error(message);
        onError?.(error instanceof Error ? error : new Error(message));
      } finally {
        setState((prev) => ({
          ...prev,
          isExporting: false,
          progress: 100,
        }));
      }
    },
    [limits, checkLimits]
  );

  // Export to Excel (HTML table format)
  const exportExcel = useCallback(
    async (data: T[], options: ExportOptions<T>): Promise<void> => {
      const {
        columns,
        filename,
        limits: optionLimits,
        addTimestamp = true,
        onStart,
        onProgress,
        onComplete,
        onError,
      } = options;

      const effectiveLimits = { ...limits, ...optionLimits };

      // Check limits
      const limitCheck = checkLimits(data.length);
      if (limitCheck.exceeds) {
        toast.warning(limitCheck.message!);
        data = data.slice(0, effectiveLimits.maxRows);
      }

      cancelRef.current = false;

      setState({
        isExporting: true,
        progress: 0,
        currentRow: 0,
        totalRows: data.length,
        error: null,
      });

      onStart?.();

      try {
        // Create header cells
        const headerCells = columns
          .map(
            (col) =>
              `<th style="background-color:#4472C4;color:white;font-weight:bold;padding:8px;border:1px solid #ccc;">${escapeHTML(col.label)}</th>`
          )
          .join('');

        const dataRows: string[] = [];

        // Process data in chunks
        for (let i = 0; i < data.length; i += effectiveLimits.chunkSize) {
          if (cancelRef.current) {
            throw new Error('Export cancelled');
          }

          const chunk = data.slice(i, i + effectiveLimits.chunkSize);

          for (let j = 0; j < chunk.length; j++) {
            const row = chunk[j];
            const rowIndex = i + j;
            const cells = columns
              .map((col) => {
                const value = getNestedValue(row, col.key as string);
                const formattedValue = col.formatter
                  ? col.formatter(value, row)
                  : value;
                return `<td style="padding:8px;border:1px solid #ccc;${rowIndex % 2 === 1 ? 'background-color:#f8f9fa;' : ''}">${escapeHTML(formattedValue)}</td>`;
              })
              .join('');
            dataRows.push(`<tr>${cells}</tr>`);
          }

          const progress = Math.round(((i + chunk.length) / data.length) * 100);
          setState((prev) => ({
            ...prev,
            progress,
            currentRow: i + chunk.length,
          }));
          onProgress?.(progress);

          // Yield to UI thread
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Create HTML document
        const html = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
              <meta charset="utf-8">
              <!--[if gte mso 9]>
              <xml>
                <x:ExcelWorkbook>
                  <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                      <x:Name>Sheet1</x:Name>
                      <x:WorksheetOptions>
                        <x:DisplayGridlines/>
                      </x:WorksheetOptions>
                    </x:ExcelWorksheet>
                  </x:ExcelWorksheets>
                </x:ExcelWorkbook>
              </xml>
              <![endif]-->
              <style>
                table { border-collapse: collapse; font-family: Arial, sans-serif; }
                th, td { white-space: nowrap; }
              </style>
            </head>
            <body>
              <table>
                <thead><tr>${headerCells}</tr></thead>
                <tbody>${dataRows.join('')}</tbody>
              </table>
            </body>
          </html>
        `;

        const blob = new Blob([html], {
          type: 'application/vnd.ms-excel;charset=utf-8;',
        });

        // Check file size
        const fileSizeMB = blob.size / (1024 * 1024);
        if (fileSizeMB > effectiveLimits.maxFileSizeMB) {
          throw new Error(
            `File size (${fileSizeMB.toFixed(1)}MB) exceeds limit (${effectiveLimits.maxFileSizeMB}MB)`
          );
        }

        const fullFilename = addTimestamp
          ? `${filename}_${formatTimestamp()}.xls`
          : `${filename}.xls`;

        downloadBlob(blob, fullFilename);

        toast.success(`Exported ${data.length.toLocaleString()} rows to Excel`);
        onComplete?.(data.length);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        setState((prev) => ({ ...prev, error: message }));
        toast.error(message);
        onError?.(error instanceof Error ? error : new Error(message));
      } finally {
        setState((prev) => ({
          ...prev,
          isExporting: false,
          progress: 100,
        }));
      }
    },
    [limits, checkLimits]
  );

  return {
    state,
    exportCSV,
    exportExcel,
    cancel,
    checkLimits,
    limits,
  };
}

// ============================================================================
// Export Progress Component
// ============================================================================

export interface ExportProgressProps {
  /** Export state */
  state: ExportState;
  /** Cancel callback */
  onCancel?: () => void;
}

export default useExport;
