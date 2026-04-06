/**
 * @vitest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCanViewCogs = vi.hoisted(() => ({ value: false }));
const mockOpenInspector = vi.hoisted(() => vi.fn());
const mockCloseInspector = vi.hoisted(() => vi.fn());
const mockHasAnyPermission = vi.hoisted(() => vi.fn(() => false));
const mockOrdersResponse = vi.hoisted(() => ({
  confirmed: { items: [] as unknown[], pagination: { total: 0 } },
  draft: { items: [] as unknown[], pagination: { total: 0 } },
}));

const confirmedOrder = {
  id: 101,
  orderNumber: "S-1001",
  clientId: 1,
  isDraft: false,
  orderType: "SALE",
  fulfillmentStatus: "READY_FOR_PACKING" as const,
  saleStatus: "UNPAID",
  total: "125.00",
  createdAt: "2026-03-01T00:00:00.000Z",
  confirmedAt: "2026-03-01T00:00:00.000Z",
  invoiceId: null,
};

const orderDetailPayload = {
  order: {
    ...confirmedOrder,
    version: 3,
  },
  lineItems: [
    {
      id: 1,
      productDisplayName: "Blue Dream",
      batchSku: "BD-001",
      quantity: "2.0",
      unitPrice: "20.00",
      lineTotal: "40.00",
      cogsPerUnit: "12.50",
      marginPercent: "25.00",
      isSample: false,
    },
  ],
};

const emptyListResponse = { items: [], pagination: { total: 0 } };

vi.mock("wouter", () => ({
  useLocation: () => ["/sales?tab=orders", vi.fn()],
  useSearch: () => "?tab=orders",
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasAnyPermission: mockHasAnyPermission,
  }),
}));

vi.mock("@/hooks/work-surface/useWorkSurfaceKeyboard", () => ({
  useWorkSurfaceKeyboard: () => ({
    keyboardProps: {},
  }),
}));

vi.mock("@/hooks/work-surface/useSaveState", () => ({
  useSaveState: () => ({
    setSaving: vi.fn(),
    setSaved: vi.fn(),
    setError: vi.fn(),
    SaveStateIndicator: () => null,
  }),
}));

vi.mock("@/hooks/work-surface/useConcurrentEditDetection", () => ({
  useConcurrentEditDetection: () => ({
    handleError: vi.fn(),
    ConflictDialog: () => null,
    trackVersion: vi.fn(),
  }),
}));

vi.mock("@/components/orders/OrderCOGSDetails", () => ({
  OrderCOGSDetails: () => <div>COGS detail rows</div>,
}));

vi.mock("@/components/orders", () => ({
  OrderStatusActions: () => <div>Order status actions</div>,
}));

vi.mock("@/components/orders/ProcessReturnModal", () => ({
  ProcessReturnModal: () => null,
}));

vi.mock("@/components/accounting/GLEntriesViewer", () => ({
  GLEntriesViewer: () => <div>GL entries</div>,
}));

vi.mock("@/components/layout/PageHeader", () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("./InspectorPanel", () => ({
  InspectorPanel: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div>{children}</div> : null),
  InspectorSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  InspectorField: ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  useInspectorPanel: () => ({
    isOpen: true,
    open: mockOpenInspector,
    close: mockCloseInspector,
  }),
}));

vi.mock("@/lib/trpc", () => {
  const mutationStub = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  };

  return {
    trpc: {
      useUtils: () => ({
        orders: {
          getAll: {
            setData: vi.fn(),
          },
          getOrderWithLineItems: {
            invalidate: vi.fn(),
          },
          getOrderReturns: {
            invalidate: vi.fn(),
          },
        },
      }),
      organizationSettings: {
        getDisplaySettings: {
          useQuery: () => ({
            data: {
              display: {
                canViewCogsData: mockCanViewCogs.value,
              },
            },
          }),
        },
      },
      clients: {
        list: {
          useQuery: () => ({
            data: {
              items: [{ id: 1, name: "Acme" }],
            },
          }),
        },
      },
      orders: {
        getAll: {
          useQuery: (input: { isDraft?: boolean }) => ({
            data: input.isDraft
              ? mockOrdersResponse.draft
              : mockOrdersResponse.confirmed,
            isLoading: false,
            refetch: vi.fn(),
          }),
        },
        getOrderWithLineItems: {
          useQuery: (input: { orderId: number }) => ({
            data:
              input.orderId === confirmedOrder.id ? orderDetailPayload : null,
          }),
        },
        getOrderReturns: {
          useQuery: () => ({
            data: [],
            refetch: vi.fn(),
          }),
        },
        getVendorReturnOptions: {
          useQuery: () => ({
            data: [],
          }),
        },
        confirmDraftOrder: { useMutation: () => mutationStub },
        delete: { useMutation: () => mutationStub },
        confirmOrder: { useMutation: () => mutationStub },
        shipOrder: { useMutation: () => mutationStub },
        processRestock: { useMutation: () => mutationStub },
        processVendorReturn: { useMutation: () => mutationStub },
        updateOrderStatus: { useMutation: () => mutationStub },
      },
      accounting: {
        invoices: {
          getByReference: {
            useQuery: () => ({
              data: null,
            }),
          },
        },
      },
      invoices: {
        generateFromOrder: { useMutation: () => mutationStub },
        downloadPdf: { useMutation: () => mutationStub },
      },
    },
  };
});

import { OrdersWorkSurface } from "./OrdersWorkSurface";

describe("OrdersWorkSurface wave 5 visibility wiring", () => {
  beforeEach(() => {
    mockCanViewCogs.value = false;
    mockOpenInspector.mockClear();
    mockCloseInspector.mockClear();
    mockHasAnyPermission.mockReset();
    mockHasAnyPermission.mockReturnValue(false);
    mockOrdersResponse.confirmed = {
      items: [confirmedOrder],
      pagination: { total: 1 },
    };
    mockOrdersResponse.draft = emptyListResponse;
  });

  it("keeps the inspector COGS section hidden when display settings deny cost access", () => {
    render(<OrdersWorkSurface />);

    fireEvent.click(screen.getByTestId("order-row-101"));

    expect(mockOpenInspector).toHaveBeenCalled();
    expect(screen.queryByText("COGS Details")).not.toBeInTheDocument();
    expect(screen.queryByText("COGS detail rows")).not.toBeInTheDocument();
  });

  it("shows the inspector COGS section when display settings allow cost access", () => {
    mockCanViewCogs.value = true;

    render(<OrdersWorkSurface />);

    fireEvent.click(screen.getByTestId("order-row-101"));

    expect(screen.getByText("COGS Details")).toBeInTheDocument();
    expect(screen.getByText("COGS detail rows")).toBeInTheDocument();
  });

  it("shows the guided empty state when there are no confirmed orders", () => {
    mockOrdersResponse.confirmed = emptyListResponse;

    render(<OrdersWorkSurface />);

    expect(screen.getByTestId("orders-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No orders found")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View Draft Orders" })
    ).toBeInTheDocument();
  });
});
