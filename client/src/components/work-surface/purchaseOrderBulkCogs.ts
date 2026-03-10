export type BulkPoCogsMode = "FIXED" | "RANGE";

export interface BulkCogsFormState {
  cogsMode: BulkPoCogsMode;
  unitCost: string;
  unitCostMin: string;
  unitCostMax: string;
}

export interface BulkCogsUpdates {
  cogsMode: BulkPoCogsMode;
  unitCost: string;
  unitCostMin: string;
  unitCostMax: string;
}

type BulkCogsResolution =
  | {
      ok: true;
      updates: BulkCogsUpdates;
    }
  | {
      ok: false;
      error: string;
    };

export function resolveBulkCogsUpdates(
  state: BulkCogsFormState
): BulkCogsResolution {
  if (state.cogsMode === "FIXED") {
    const parsed = Number(state.unitCost);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return {
        ok: false,
        error: "Bulk unit cost cannot be negative",
      };
    }

    return {
      ok: true,
      updates: {
        cogsMode: "FIXED",
        unitCost: String(parsed),
        unitCostMin: "",
        unitCostMax: "",
      },
    };
  }

  const min = Number(state.unitCostMin);
  const max = Number(state.unitCostMax);

  if (!Number.isFinite(min) || min < 0) {
    return {
      ok: false,
      error: "Bulk min cost cannot be negative",
    };
  }

  if (!Number.isFinite(max) || max < 0) {
    return {
      ok: false,
      error: "Bulk max cost cannot be negative",
    };
  }

  if (max < min) {
    return {
      ok: false,
      error: "Bulk max cost must be greater than or equal to min cost",
    };
  }

  return {
    ok: true,
    updates: {
      cogsMode: "RANGE",
      unitCost: "",
      unitCostMin: String(min),
      unitCostMax: String(max),
    },
  };
}
