/**
 * UnifiedExportMenu Component
 * Sprint 5.C.4: UX-011 - Fix Two Export Buttons Issue
 *
 * This component provides a standardized export dropdown menu that consolidates
 * multiple export formats into a single button. Use this instead of having
 * separate CSV and Excel/PDF buttons.
 *
 * Usage:
 * <UnifiedExportMenu
 *   onExportCSV={() => handleExport('csv')}
 *   onExportExcel={() => handleExport('excel')}
 *   onExportPDF={() => handleExport('pdf')}
 *   disabled={data.length === 0}
 * />
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Loader2,
  ChevronDown,
} from "lucide-react";

export interface UnifiedExportMenuProps {
  /** Handler for CSV export */
  onExportCSV?: () => Promise<void> | void;
  /** Handler for Excel export */
  onExportExcel?: () => Promise<void> | void;
  /** Handler for PDF export */
  onExportPDF?: () => Promise<void> | void;
  /** Handler for JSON export */
  onExportJSON?: () => Promise<void> | void;
  /** Whether the export button is disabled */
  disabled?: boolean;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
  /** Custom button label (default: "Export") */
  label?: string;
  /** Show dropdown chevron */
  showChevron?: boolean;
}

export function UnifiedExportMenu({
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onExportJSON,
  disabled = false,
  variant = "outline",
  size = "default",
  className,
  label = "Export",
  showChevron = true,
}: UnifiedExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleExport = async (
    format: string,
    handler?: () => Promise<void> | void
  ) => {
    if (!handler) return;

    setIsExporting(true);
    setExportingFormat(format);

    try {
      await handler();
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  // Determine which export options are available
  const hasCSV = Boolean(onExportCSV);
  const hasExcel = Boolean(onExportExcel);
  const hasPDF = Boolean(onExportPDF);
  const hasJSON = Boolean(onExportJSON);
  const hasSpreadsheetOptions = hasCSV || hasExcel;
  const hasDocumentOptions = hasPDF;
  const hasDataOptions = hasJSON;
  const hasMultipleOptions =
    [hasCSV, hasExcel, hasPDF, hasJSON].filter(Boolean).length > 1;

  // If only one option, render a simple button
  if (!hasMultipleOptions) {
    const singleHandler =
      onExportCSV || onExportExcel || onExportPDF || onExportJSON;
    const format = onExportCSV
      ? "csv"
      : onExportExcel
        ? "excel"
        : onExportPDF
          ? "pdf"
          : "json";

    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || isExporting}
        onClick={() => handleExport(format, singleHandler)}
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {label}
          {showChevron && <ChevronDown className="h-4 w-4 ml-1" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {hasSpreadsheetOptions && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Spreadsheet
            </DropdownMenuLabel>
            {hasCSV && (
              <DropdownMenuItem
                onClick={() => handleExport("csv", onExportCSV)}
                disabled={exportingFormat === "csv"}
              >
                <FileText className="h-4 w-4 mr-2" />
                {exportingFormat === "csv" ? "Exporting..." : "CSV (.csv)"}
              </DropdownMenuItem>
            )}
            {hasExcel && (
              <DropdownMenuItem
                onClick={() => handleExport("excel", onExportExcel)}
                disabled={exportingFormat === "excel"}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {exportingFormat === "excel" ? "Exporting..." : "Excel (.xlsx)"}
              </DropdownMenuItem>
            )}
          </>
        )}

        {hasSpreadsheetOptions && hasDocumentOptions && (
          <DropdownMenuSeparator />
        )}

        {hasDocumentOptions && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Document
            </DropdownMenuLabel>
            {hasPDF && (
              <DropdownMenuItem
                onClick={() => handleExport("pdf", onExportPDF)}
                disabled={exportingFormat === "pdf"}
              >
                <FileImage className="h-4 w-4 mr-2" />
                {exportingFormat === "pdf" ? "Exporting..." : "PDF (.pdf)"}
              </DropdownMenuItem>
            )}
          </>
        )}

        {(hasSpreadsheetOptions || hasDocumentOptions) && hasDataOptions && (
          <DropdownMenuSeparator />
        )}

        {hasDataOptions && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Data
            </DropdownMenuLabel>
            {hasJSON && (
              <DropdownMenuItem
                onClick={() => handleExport("json", onExportJSON)}
                disabled={exportingFormat === "json"}
              >
                <FileText className="h-4 w-4 mr-2" />
                {exportingFormat === "json" ? "Exporting..." : "JSON (.json)"}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UnifiedExportMenu;
