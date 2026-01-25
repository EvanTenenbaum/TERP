/**
 * VendorsPage - Page wrapper for Vendors Work Surface
 * WS-VEND-001: Updated to use Work Surface pattern
 *
 * This page now uses the VendorsWorkSurface component which follows
 * the standard Work Surface patterns with keyboard navigation,
 * inspector panel, and save state indicators.
 */

import VendorsWorkSurface from "@/components/work-surface/VendorsWorkSurface";

export default function VendorsPage() {
  return <VendorsWorkSurface />;
}
