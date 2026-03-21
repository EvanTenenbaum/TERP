/**
 * PurchaseOrdersPilotSurface — placeholder stub (TER-81x)
 *
 * The real implementation is being built on a parallel branch.
 * This stub unblocks the build until that branch merges.
 * Classic surface remains the active default.
 */

interface PurchaseOrdersPilotSurfaceProps {
  onOpenClassic?: (poId?: number | null) => void;
}

export default function PurchaseOrdersPilotSurface({
  onOpenClassic: _onOpenClassic,
}: PurchaseOrdersPilotSurfaceProps) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
      Purchase Orders sheet-native surface coming soon.
    </div>
  );
}
