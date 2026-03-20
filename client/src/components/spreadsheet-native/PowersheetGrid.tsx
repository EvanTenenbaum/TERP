import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SpreadsheetPilotGrid } from "./SpreadsheetPilotGrid";
import type { SpreadsheetPilotGridProps } from "./SpreadsheetPilotGrid";
import type {
  PowersheetSelectionSet,
  PowersheetSelectionSummary,
} from "@/lib/powersheet/contracts";

const selectionSurfaceBySurfaceId: Record<
  string,
  PowersheetSelectionSummary["focusedSurface"]
> = {
  "orders-queue": "orders-queue",
  "orders-support-grid": "orders-support-grid",
  "orders-document-grid": "orders-document-grid",
};

export interface PowersheetAffordance {
  label: string;
  available: boolean;
}

interface PowersheetGridProps<
  Row extends object,
> extends SpreadsheetPilotGridProps<Row> {
  surfaceId: string;
  requirementIds: string[];
  releaseGateIds?: string[];
  antiDriftSummary?: ReactNode;
  affordances?: PowersheetAffordance[];
}

export function PowersheetGrid<Row extends object>({
  surfaceId,
  requirementIds,
  releaseGateIds = [],
  antiDriftSummary,
  affordances,
  summary,
  selectionSurface,
  onSelectionSetChange,
  onSelectionSummaryChange,
  ...gridProps
}: PowersheetGridProps<Row>) {
  const [selectionSet, setSelectionSet] =
    useState<PowersheetSelectionSet | null>(null);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  const effectiveSelectionSurface =
    selectionSurface ?? selectionSurfaceBySurfaceId[surfaceId];

  const stableDecorations = useMemo(() => {
    const renderedAffordances =
      affordances && affordances.length > 0 ? (
        <span data-testid={`${surfaceId}-affordances`}>
          {affordances.map((a, i) => (
            <span key={a.label}>
              {i > 0 && " · "}
              <span className={a.available ? "" : "line-through opacity-50"}>
                {a.label}
              </span>
            </span>
          ))}
        </span>
      ) : null;
    const renderedReleaseGates =
      releaseGateIds.length > 0 ? (
        <span data-testid={`${surfaceId}-release-gates`}>
          Release gates: {releaseGateIds.join(", ")}
        </span>
      ) : null;
    const renderedAntiDrift = antiDriftSummary ? (
      <span data-testid={`${surfaceId}-anti-drift-summary`}>
        {antiDriftSummary}
      </span>
    ) : null;
    return { renderedAffordances, renderedReleaseGates, renderedAntiDrift };
  }, [affordances, antiDriftSummary, releaseGateIds, surfaceId]);

  const summaryStack = useMemo(() => {
    const renderedSummary = summary ? <>{summary}</> : null;
    const renderedSelectionSummary = selectionSummary ? (
      <span data-testid={`${surfaceId}-selection-summary`}>
        {selectionSummary.selectedCellCount} selected cells ·{" "}
        {selectionSummary.selectedRowCount} rows in scope
        {selectionSummary.hasDiscontiguousSelection
          ? " · discontiguous selection"
          : ""}
      </span>
    ) : (
      <span data-testid={`${surfaceId}-selection-summary`}>
        Spreadsheet runtime armed for shared selection-state surfacing.
      </span>
    );
    const renderedSelectionState = selectionSet ? (
      <span data-testid={`${surfaceId}-selection-state`}>
        Focused cell:{" "}
        {selectionSet.focusedCell
          ? `${selectionSet.focusedCell.rowIndex}:${selectionSet.focusedCell.columnKey}`
          : "none"}
        {" · "}Ranges: {selectionSet.ranges.length}
      </span>
    ) : null;

    return (
      <div className="flex flex-col gap-1">
        {renderedSummary}
        {renderedSelectionSummary}
        {renderedSelectionState}
        {stableDecorations.renderedAffordances}
        {stableDecorations.renderedReleaseGates}
        {stableDecorations.renderedAntiDrift}
      </div>
    );
  }, [selectionSet, selectionSummary, stableDecorations, summary, surfaceId]);

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
        onSelectionSetChange={nextSelectionSet => {
          setSelectionSet(nextSelectionSet);
          onSelectionSetChange?.(nextSelectionSet);
        }}
        onSelectionSummaryChange={nextSelectionSummary => {
          setSelectionSummary(nextSelectionSummary);
          onSelectionSummaryChange?.(nextSelectionSummary);
        }}
        summary={summaryStack}
      />
    </div>
  );
}

export default PowersheetGrid;
