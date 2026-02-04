/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InventoryWorkSurface } from "../InventoryWorkSurface";
import { setupDbMock, setupPermissionMock } from "@/test-utils";

type PurchaseModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const purchaseModalSpy = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/inventory", vi.fn()],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      list: {
        useQuery: () => ({
          data: { items: [], hasMore: false },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      updateStatus: {
        useMutation: () => ({ mutate: vi.fn() }),
      },
    },
  },
}));

vi.mock("@/hooks/work-surface/useWorkSurfaceKeyboard", () => ({
  useWorkSurfaceKeyboard: () => ({
    keyboardProps: {},
    focusState: { row: null, col: null, isEditing: false },
    setFocus: vi.fn(),
    startEditing: vi.fn(),
    stopEditing: vi.fn(),
    focusFirst: vi.fn(),
    focusLast: vi.fn(),
    resetFocus: vi.fn(),
  }),
}));

vi.mock("@/hooks/work-surface/useSaveState", () => ({
  useSaveState: () => ({
    setSaving: vi.fn(),
    setSaved: vi.fn(),
    setError: vi.fn(),
    SaveStateIndicator: <div />,
  }),
}));

vi.mock("@/hooks/work-surface/useConcurrentEditDetection", () => ({
  useConcurrentEditDetection: () => ({
    handleError: () => false,
    ConflictDialog: () => null,
    trackVersion: vi.fn(),
  }),
}));

vi.mock("../InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorField: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useInspectorPanel: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock("@/components/inventory/PurchaseModal", () => ({
  PurchaseModal: (props: PurchaseModalProps) => {
    purchaseModalSpy(props);
    return (
      <div
        data-testid="purchase-modal"
        data-open={props.open ? "true" : "false"}
      />
    );
  },
}));

describe("InventoryWorkSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDbMock();
    setupPermissionMock();
  });

  it("opens the purchase modal when Add Batch is clicked", async () => {
    render(<InventoryWorkSurface />);

    expect(screen.getByTestId("purchase-modal")).toHaveAttribute(
      "data-open",
      "false"
    );

    fireEvent.click(screen.getByRole("button", { name: /add batch/i }));

    expect(screen.getByTestId("purchase-modal")).toHaveAttribute(
      "data-open",
      "true"
    );
  });
});
