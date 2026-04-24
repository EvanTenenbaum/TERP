import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReferredBySelector } from "./ReferredBySelector";

interface OrderAdjustmentsBarProps {
  referredByClientId: number | null;
  onReferredByChange: (id: number | null) => void;
  clientId: number | null;
  notes: string;
  onNotesChange: (notes: string) => void;
  activeDraftId: number | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onSaveDraft: () => void;
  onFinalize: () => void;
  saveDraftDisabled?: boolean;
  finalizeDisabled?: boolean;
  isFinalizePending: boolean;
  isSeededFromCatalogue: boolean;
  orderType: "SALE" | "QUOTE";
}

export function OrderAdjustmentsBar({
  referredByClientId,
  onReferredByChange,
  clientId,
  notes,
  onNotesChange,
  activeDraftId,
  isSaving,
  hasUnsavedChanges,
  onSaveDraft,
  onFinalize,
  saveDraftDisabled = false,
  finalizeDisabled = false,
  isFinalizePending,
  isSeededFromCatalogue,
  orderType,
}: OrderAdjustmentsBarProps) {
  return (
    <section className="grid gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 lg:grid-cols-[1.1fr_1.4fr_0.9fr]">
      <div className="bg-background p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Referral
        </p>
        <div className="mt-2">
          {clientId ? (
            <ReferredBySelector
              excludeClientId={clientId}
              selectedReferrerId={referredByClientId}
              onSelect={referrerId => onReferredByChange(referrerId)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a client to choose a referral source.
            </p>
          )}
        </div>
      </div>

      <div className="bg-background p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Whole Order Notes
          </p>
          {isSeededFromCatalogue ? (
            <Badge variant="secondary">Seeded from catalogue</Badge>
          ) : null}
        </div>
        <Textarea
          className="mt-2 min-h-[88px]"
          placeholder="Notes, handling guidance, freight context, terms exceptions..."
          value={notes}
          onChange={event => onNotesChange(event.target.value)}
        />
      </div>

      <div className="bg-background p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Draft Status
            </p>
            <p className="mt-2 text-sm font-medium">
              {activeDraftId ? `Draft #${activeDraftId}` : "Unsaved draft"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={hasUnsavedChanges ? "secondary" : "outline"}>
                {hasUnsavedChanges ? "Unsaved changes" : "Synced"}
              </Badge>
              <Badge variant="outline">
                {orderType === "QUOTE" ? "Quote mode" : "Sales order"}
              </Badge>
            </div>
          </div>
          {isSaving ? <Badge variant="secondary">Saving</Badge> : null}
        </div>

        <div className="mt-4 grid gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={saveDraftDisabled}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            onClick={onFinalize}
            disabled={isFinalizePending || finalizeDisabled}
          >
            {isFinalizePending
              ? orderType === "QUOTE"
                ? "Creating Quote..."
                : "Confirming Order..."
              : orderType === "QUOTE"
                ? "Confirm Quote"
                : "Confirm Order"}
          </Button>
        </div>
      </div>
    </section>
  );
}
