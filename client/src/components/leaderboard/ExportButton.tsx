/**
 * Leaderboard Export Button Component
 * Handles exporting leaderboard data to CSV or JSON
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ExportButtonProps {
  clientType: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";
}

export function ExportButton({ clientType }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportMutation = trpc.leaderboard.export.useMutation({
    onSuccess: (result) => {
      const blob = new Blob(
        [typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)],
        { type: result.format === "csv" ? "text/csv" : "application/json" }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leaderboard-${clientType.toLowerCase()}-${new Date().toISOString().split("T")[0]}.${result.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsExporting(false);
    },
    onError: () => {
      setIsExporting(false);
    },
  });

  const handleExport = (format: "csv" | "json") => {
    setIsExporting(true);
    exportMutation.mutate({
      format,
      clientType,
      includeMetrics: true,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
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
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
