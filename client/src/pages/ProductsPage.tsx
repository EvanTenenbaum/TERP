/**
 * ProductsPage - Page wrapper for Products Work Surface
 * WS-PROD-001: Updated to use Work Surface pattern
 *
 * This page now uses the ProductsWorkSurface component which follows
 * the standard Work Surface patterns with keyboard navigation,
 * inspector panel, and save state indicators.
 */

import ProductsWorkSurface from "@/components/work-surface/ProductsWorkSurface";

export default function ProductsPage() {
  return <ProductsWorkSurface />;
}
