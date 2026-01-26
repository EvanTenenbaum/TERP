/**
 * ShrinkagePage - Inventory shrinkage report page
 * NAV-018: Add Missing /reports/shrinkage Route
 *
 * This page wraps the ShrinkageReport component for use as a standalone page.
 * The component is also used in summary mode on other dashboards.
 */

import { ShrinkageReport } from "@/components/inventory/ShrinkageReport";

export default function ShrinkagePage() {
  return (
    <div className="container mx-auto py-6">
      <ShrinkageReport variant="full" />
    </div>
  );
}
