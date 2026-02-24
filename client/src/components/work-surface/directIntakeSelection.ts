export interface DirectIntakeRowSnapshot {
  id: string;
  status: "pending" | "submitted" | "error";
}

export interface DirectIntakeRemovalPlan {
  blocked: boolean;
  removedIds: string[];
  nextRows: DirectIntakeRowSnapshot[];
}

export function createDirectIntakeRemovalPlan<
  TRow extends DirectIntakeRowSnapshot,
>(
  rows: TRow[],
  selectedIds: string[]
): {
  blocked: boolean;
  removedIds: string[];
  nextRows: TRow[];
} {
  const selectedIdSet = new Set(selectedIds);
  const pendingRows = rows.filter(row => row.status === "pending");
  const selectedPendingRows = pendingRows.filter(row =>
    selectedIdSet.has(row.id)
  );

  if (selectedPendingRows.length === 0) {
    return {
      blocked: false,
      removedIds: [],
      nextRows: rows,
    };
  }

  if (pendingRows.length <= selectedPendingRows.length) {
    return {
      blocked: true,
      removedIds: [],
      nextRows: rows,
    };
  }

  const removedIds = selectedPendingRows.map(row => row.id);
  const removedIdSet = new Set(removedIds);
  const nextRows = rows.filter(row => !removedIdSet.has(row.id));

  return {
    blocked: false,
    removedIds,
    nextRows,
  };
}

export async function submitRowsWithGuaranteedCleanup<TRow>(
  rows: TRow[],
  submitRow: (row: TRow) => Promise<void>,
  onCleanup: () => void
): Promise<void> {
  try {
    for (const row of rows) {
      await submitRow(row);
    }
  } finally {
    onCleanup();
  }
}
