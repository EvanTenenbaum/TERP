/**
 * ShrinkageReportPage
 * NAV-018: Full page view for shrinkage report
 *
 * Uses the ShrinkageReport component with full variant
 */

import { ShrinkageReport } from "@/components/inventory/ShrinkageReport";
import { BackButton } from "@/components/common/BackButton";
import { TrendingDown } from "lucide-react";

export default function ShrinkageReportPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton to="/inventory" label="Back to Inventory" />
          <div className="flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Shrinkage Report</h1>
          </div>
        </div>
      </div>
      <ShrinkageReport variant="full" />
    </div>
  );
}
