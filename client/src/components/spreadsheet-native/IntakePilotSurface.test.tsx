import React from "react";
/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntakePilotSurface } from "./IntakePilotSurface";

vi.mock("wouter", () => ({
  useLocation: () => ["/operations?tab=intake", vi.fn()],
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock("@/hooks/work-surface/useExport", () => ({
  useExport: () => ({
    exportCSV: vi.fn(),
    state: { isExporting: false, progress: 0 },
  }),
}));

vi.mock("@/hooks/work-surface", () => ({
  useExport: () => ({
    exportCSV: vi.fn(),
    state: { isExporting: false, progress: 0 },
  }),
  usePowersheetSelection: () => ({
    selectedIds: new Set<string>(),
    toggle: vi.fn(),
    toggleAll: vi.fn(),
    clear: vi.fn(),
    reset: vi.fn(),
    selectRange: vi.fn(),
    isSelected: () => false,
    getSelectedArray: () => [],
    restoreFocus: vi.fn(),
    lastFocusRef: { current: null },
  }),
}));

vi.mock("@/hooks/work-surface/useSaveState", () => ({
  useSaveState: () => ({
    saveState: { status: "saved", lastSaved: new Date() },
    setSaving: vi.fn(),
    setSaved: vi.fn(),
    setError: vi.fn(),
    setQueued: vi.fn(),
    reset: vi.fn(),
    SaveStateIndicator: null,
    isDirty: false,
  }),
}));

vi.mock("@/hooks/work-surface/useValidationTiming", () => ({
  useValidationTiming: () => ({
    validationResults: [],
    isValidating: false,
    triggerValidation: vi.fn(),
    getFieldState: () => ({ showError: false, error: null, touched: false }),
    handleChange: vi.fn(),
    handleBlur: vi.fn(),
    validateAll: () => ({ isValid: true, errors: {} }),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/work-surface/useUndo", () => ({
  useUndo: () => ({
    push: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
  }),
}));

const MOCK_CLIENTS_DATA = {
  items: [{ id: 10, name: "North Farm Supply" }],
};
const MOCK_LOCATIONS_DATA = [
  { id: 1, site: "Vault A" },
  { id: 2, site: "Vault B" },
];
const MOCK_PRODUCTS_DATA = {
  items: [
    { id: 1, name: "Indoor Flower", category: "Flower", subcategory: "Indoor" },
  ],
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      list: {
        useQuery: () => ({
          data: MOCK_CLIENTS_DATA,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    locations: {
      getAll: {
        useQuery: () => ({
          data: MOCK_LOCATIONS_DATA,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    productCatalogue: {
      list: {
        useQuery: () => ({
          data: MOCK_PRODUCTS_DATA,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    inventory: {
      intake: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
          isPending: false,
        }),
      },
      uploadMedia: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({}),
          isPending: false,
        }),
      },
      deleteMedia: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({}),
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("@/lib/spreadsheet-native", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/spreadsheet-native")
  >("@/lib/spreadsheet-native");

  return {
    ...actual,
    useSpreadsheetSelectionParam: () => ({
      selectedId: null,
      setSelectedId: vi.fn(),
    }),
  };
});

vi.mock("@/lib/constants/intakeDefaults", () => ({
  INTAKE_DEFAULTS: {
    paymentTerms: "CONSIGNMENT",
    category: "Flower",
    defaultWarehouseMatch: "main",
  },
}));

vi.mock("@/lib/nomenclature", () => ({
  getBrandLabel: () => "Brand",
}));

vi.mock("@/components/work-surface/directIntakeSelection", () => ({
  createDirectIntakeRemovalPlan: vi.fn(() => ({
    rowsToRemove: [],
    removedRowIds: [],
  })),
  submitRowsWithGuaranteedCleanup: vi.fn(),
}));

vi.mock("@/lib/powersheet/contracts", () => ({
  deleteSelectedRows: vi.fn(),
  duplicateSelectedRows: vi.fn(),
  fillDownSelectedRows: vi.fn(),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange: _onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="mock-select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <button type="button" className={className}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
    disabled?: boolean;
  }) => <div data-value={value}>{children}</div>,
}));

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock("./SpreadsheetPilotGrid", () => ({
  SpreadsheetPilotGrid: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({
    children,
    title,
    isOpen,
    footer,
  }: {
    children: React.ReactNode;
    title?: string;
    isOpen?: boolean;
    footer?: React.ReactNode;
  }) => (
    <div>
      {title ? <h3>{title}</h3> : null}
      {isOpen !== false ? children : null}
      {footer ? <>footer={footer}</> : null}
    </div>
  ),
  InspectorSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  InspectorField: () => null,
  InspectorActions: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useInspectorPanel: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    isExpanded: false,
    toggleExpanded: vi.fn(),
  }),
}));

vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({
    right,
  }: {
    left?: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;
  }) => <div data-testid="status-bar">{right}</div>,
}));

vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => (
    <div role="group" aria-label="keyboard shortcuts">
      <span>select row</span>
      <span>extend range</span>
    </div>
  ),
}));

describe("IntakePilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<IntakePilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Direct Intake Session")).toBeInTheDocument();
  });

  it("renders the document grid title", () => {
    render(<IntakePilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Direct Intake Session")).toBeInTheDocument();
  });

  it("renders the Add Row button", () => {
    render(<IntakePilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /add row/i })
    ).toBeInTheDocument();
  });

  it("renders the +5 Rows button", () => {
    render(<IntakePilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /\+5 rows/i })
    ).toBeInTheDocument();
  });

  it("renders the Submit All Pending button", () => {
    render(<IntakePilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /submit all pending/i })
    ).toBeInTheDocument();
  });

  it("renders the Export CSV button", () => {
    render(<IntakePilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /export csv/i })
    ).toBeInTheDocument();
  });

  it("renders the keyboard hint bar", () => {
    render(<IntakePilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
  });
});
