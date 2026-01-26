/**
 * ShrinkageReportPage
 * NAV-018: Full page view for shrinkage report
 *
 * Uses the ShrinkageReport component with full variant
 */

import { ShrinkageReport } from "@/components/inventory/ShrinkageReport";

export default function ShrinkageReportPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <ShrinkageReport variant="full" />
    </div>
  );
}
