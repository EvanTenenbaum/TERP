/**
 * Data Export Button Component
 * ENH-003: Unified export functionality for data tables
 *
 * UX-011: Renamed to DataExportButton to avoid confusion with
 * the leaderboard-specific ExportButton component.
 * Use this for generic data table exports (CSV/Excel).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: unknown) => string;
}

// UX-011: Renamed from ExportButtonProps to DataExportButtonProps for consistency
interface DataExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Export to CSV
 */
function exportToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  // Create header row with labels
  const headerRow = columns.map(col => escapeCSVField(col.label)).join(",");

  // Create data rows using keys and optional formatters
  const dataRows = data.map(row => {
    return columns
      .map(col => {
        const value = row[col.key];
        const formattedValue = col.formatter ? col.formatter(value) : value;
        return escapeCSVField(formattedValue);
      })
      .join(",");
  });

  const csvContent = [headerRow, ...dataRows].join("\n");

  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, `${filename}.csv`);
}

/**
 * Export to Excel (XLSX-like using HTML table format)
 * This creates an XLS file that Excel can open
 */
function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  // Create HTML table
  const headerCells = columns
    .map(
      col =>
        `<th style="background-color:#4472C4;color:white;font-weight:bold;padding:8px;border:1px solid #ccc;">${escapeHTML(col.label)}</th>`
    )
    .join("");

  const dataRows = data
    .map((row, idx) => {
      const cells = columns
        .map(col => {
          const value = row[col.key];
          const formattedValue = col.formatter ? col.formatter(value) : value;
          return `<td style="padding:8px;border:1px solid #ccc;${idx % 2 === 1 ? "background-color:#f8f9fa;" : ""}">${escapeHTML(formattedValue)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

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
          <tbody>${dataRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  downloadFile(blob, `${filename}.xls`);
}

/**
 * Download file
 */
function downloadFile(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape HTML entities
 */
function escapeHTML(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// UX-011: Renamed from ExportButton to DataExportButton for clarity
export function DataExportButton({
  data,
  columns,
  filename,
  disabled,
  variant = "outline",
  size = "default",
  className,
  onExportStart,
  onExportComplete,
}: DataExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "excel") => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);
    onExportStart?.();

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}_${timestamp}`;

      if (format === "csv") {
        exportToCSV(data, columns, fullFilename);
        toast.success(`Exported ${data.length} records to CSV`);
      } else {
        exportToExcel(data, columns, fullFilename);
        toast.success(`Exported ${data.length} records to Excel`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Export failed";
      toast.error(message);
    } finally {
      setIsExporting(false);
      onExportComplete?.();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting || !data || data.length === 0}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple export button (CSV only)
interface SimpleExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

export function CSVExportButton({
  data,
  columns,
  filename,
  disabled,
  variant = "outline",
  size = "default",
  className,
  label = "Export CSV",
}: SimpleExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}_${timestamp}`;
      exportToCSV(data, columns, fullFilename);
      toast.success(`Exported ${data.length} records`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Export failed";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || isExporting || !data || data.length === 0}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}

// UX-011: Backward compatibility alias - prefer DataExportButton for new code
/** @deprecated Use DataExportButton instead to avoid confusion with leaderboard ExportButton */
export const ExportButton = DataExportButton;
