import { useMemo } from "react";
import { SpreadsheetPilotGrid } from "./SpreadsheetPilotGrid";
import type { SpreadsheetPilotGridProps } from "./SpreadsheetPilotGrid";

export interface PowersheetAffordance {
  label: string;
  available: boolean;
}

interface PowersheetGridProps<
  Row extends object,
> extends SpreadsheetPilotGridProps<Row> {
  surfaceId: string;
  requirementIds: string[];
  /** @deprecated Internal engineering annotation — accepted but not rendered. */
  releaseGateIds?: string[];
  /** @deprecated Internal engineering annotation — accepted but not rendered. */
  antiDriftSummary?: string;
  /** @deprecated Internal engineering annotation — accepted but not rendered. */
  affordances?: PowersheetAffordance[];
}

export function PowersheetGrid<Row extends object>({
  surfaceId,
  requirementIds,
  releaseGateIds = [],
  antiDriftSummary: _antiDriftSummary,
  affordances: _affordances,
  summary,
  selectionSurface,
  onSelectionSetChange,
  onSelectionSummaryChange,
  ...gridProps
}: PowersheetGridProps<Row>) {
  const effectiveSelectionSurface = selectionSurface ?? surfaceId;

  const summaryStack = useMemo(
    () =>
      summary ? <div className="flex flex-col gap-1">{summary}</div> : null,
    [summary]
  );

  return (
    <div
      data-powersheet-surface-id={surfaceId}
      data-powersheet-requirement-ids={requirementIds.join(",")}
      data-powersheet-release-gates={releaseGateIds.join(",")}
      data-powersheet-selection-surface={effectiveSelectionSurface ?? ""}
    >
      <SpreadsheetPilotGrid
        {...gridProps}
        selectionSurface={effectiveSelectionSurface}
        onSelectionSetChange={onSelectionSetChange}
        onSelectionSummaryChange={onSelectionSummaryChange}
        summary={summaryStack}
      />
    </div>
  );
}

export default PowersheetGrid;
