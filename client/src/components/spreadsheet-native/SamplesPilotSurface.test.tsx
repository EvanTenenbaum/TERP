import React from "react";
/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SamplesPilotSurface } from "./SamplesPilotSurface";

vi.mock("wouter", () => ({
  useLocation: () => ["/operations?tab=samples", vi.fn()],
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Test User", email: "test@test.com" },
  }),
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
    selectedIds: new Set<number>(),
    toggle: vi.fn(),
    clear: vi.fn(),
    selectRange: vi.fn(),
    isSelected: () => false,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    samples: {
      getAll: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 1,
                clientId: 10,
                sampleRequestStatus: "REQUESTED",
                notes: "Due: 2026-04-01",
                requestDate: "2026-03-01",
                createdAt: "2026-03-01T00:00:00.000Z",
                products: [
                  {
                    productId: 1,
                    quantity: "2",
                  },
                ],
              },
            ],
            pagination: { total: 1, hasMore: false },
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      productOptions: {
        useQuery: () => ({
          data: [{ id: 1, name: "Indoor Flower", category: "Flower" }],
          isLoading: false,
        }),
      },
      createRequest: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      fulfillRequest: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      cancelRequest: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      requestReturn: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      approveReturn: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      completeReturn: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      requestVendorReturn: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      shipToVendor: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      confirmVendorReturn: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      updateLocation: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      setExpirationDate: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    clients: {
      list: {
        useQuery: () => ({
          data: {
            items: [{ id: 10, name: "Summit Dispensary" }],
          },
          isLoading: false,
        }),
      },
    },
    useUtils: () => ({
      samples: {
        getAll: { invalidate: vi.fn() },
      },
    }),
  },
}));

vi.mock("@/lib/spreadsheet-native", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const actual = await vi.importActual<
    typeof import("@/lib/spreadsheet-native")
  >("@/lib/spreadsheet-native");

  return {
    ...actual,
    useSpreadsheetSelectionParam: () => {
      const [selectedId, setSelectedId] = React.useState<number | null>(null);
      return { selectedId, setSelectedId };
    },
  };
});

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    description,
    rows,
    onRowClicked,
  }: {
    title: string;
    description?: string;
    rows?: Array<{ sampleId: number; identity: { rowKey: string } }>;
    onRowClicked?: (event: {
      data: { sampleId: number; identity: { rowKey: string } };
    }) => void;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {rows?.map(row => (
        <button
          key={row.identity.rowKey}
          type="button"
          onClick={() => onRowClicked?.({ data: row })}
        >
          Open sample {row.sampleId}
        </button>
      ))}
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

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({
    children,
    title,
    isOpen,
  }: {
    children: React.ReactNode;
    title?: string;
    isOpen?: boolean;
  }) =>
    isOpen ? (
      <div>
        {title ? <h3>{title}</h3> : null}
        {children}
      </div>
    ) : null,
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

vi.mock("@/components/samples/ExpiringSamplesWidget", () => ({
  ExpiringSamplesWidget: () => <div data-testid="expiring-samples-widget" />,
}));

vi.mock("@/components/samples/SampleForm", () => ({
  SampleForm: () => null,
}));

vi.mock("@/components/samples/SampleReturnDialog", () => ({
  SampleReturnDialog: () => null,
}));

vi.mock("@/components/samples/VendorShipDialog", () => ({
  VendorShipDialog: () => null,
}));

vi.mock("@/components/samples/LocationUpdateDialog", () => ({
  LocationUpdateDialog: () => null,
}));

vi.mock("@/components/samples/SampleList", () => ({
  getSampleOperatorLane: (status: string) => {
    if (["REQUESTED", "ALLOCATED", "FULFILLED"].includes(status)) return "OUT";
    return "RETURN";
  },
  isOperatorVisibleSampleStatus: () => true,
}));

describe("SamplesPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Sample Request Queue")).toBeInTheDocument();
  });

  it("renders the sample request queue grid title", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Sample Request Queue")).toBeInTheDocument();
  });

  it("renders the search input with correct placeholder", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Search client or product...")
    ).toBeInTheDocument();
  });

  it("renders the New Sample button", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /create new sample request/i })
    ).toBeInTheDocument();
  });

  it("renders the Export CSV button", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /export samples to csv/i })
    ).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /refresh samples data/i })
    ).toBeInTheDocument();
  });

  it("renders the sample lane filter tabs", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("tablist", { name: /sample lane filter/i })
    ).toBeInTheDocument();
  });

  it("renders the keyboard hint bar", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
  });

  it("opens the inspector when a sample row is clicked", () => {
    render(<SamplesPilotSurface onOpenClassic={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /open sample 1/i }));

    expect(screen.getByText("Sample #1")).toBeInTheDocument();
    expect(screen.getByText("Request Details")).toBeInTheDocument();
  });
});
