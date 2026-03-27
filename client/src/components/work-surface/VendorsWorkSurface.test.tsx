/**
 * @vitest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VendorsWorkSurface } from "./VendorsWorkSurface";

const mockSetLocation = vi.fn();
const mockAddClientWizard = vi.fn();
const mockInspector = {
  isOpen: false,
  open: vi.fn(),
  close: vi.fn(),
};

vi.mock("wouter", () => ({
  useLocation: () => ["/relationships?tab=suppliers", mockSetLocation],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      list: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 21,
                name: "Emerald Inputs",
                email: "hello@emerald.test",
                isSeller: true,
                lifetimeValue: "1250.00",
                orderCount: 3,
              },
            ],
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      count: {
        useQuery: () => ({
          data: 1,
        }),
      },
    },
  },
}));

vi.mock("@/hooks/work-surface/useWorkSurfaceKeyboard", () => ({
  useWorkSurfaceKeyboard: () => ({
    keyboardProps: {},
  }),
}));

vi.mock("@/hooks/work-surface/useSaveState", () => ({
  useSaveState: () => ({
    SaveStateIndicator: <div data-testid="save-state-indicator" />,
  }),
}));

vi.mock("./InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorSection: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
  InspectorField: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useInspectorPanel: () => mockInspector,
}));

vi.mock("@/components/layout/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </header>
  ),
}));

vi.mock("@/components/clients/ProfileQuickPanel", () => ({
  ProfileQuickPanel: () => <div data-testid="profile-quick-panel" />,
}));

vi.mock("@/components/clients/AddClientWizard", () => ({
  AddClientWizard: ({
    open,
    defaultRoles,
  }: {
    open: boolean;
    defaultRoles?: { isSeller?: boolean };
  }) => {
    mockAddClientWizard({ open, defaultRoles });

    return (
      <div
        data-testid="add-supplier-wizard"
        data-open={open ? "true" : "false"}
        data-seller-default={defaultRoles?.isSeller ? "true" : "false"}
      />
    );
  },
}));

describe("VendorsWorkSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInspector.isOpen = false;
  });

  it("opens the add supplier wizard from the parent surface action", () => {
    render(<VendorsWorkSurface />);

    const wizard = screen.getByTestId("add-supplier-wizard");
    expect(wizard).toHaveAttribute("data-open", "false");
    expect(wizard).toHaveAttribute("data-seller-default", "true");

    fireEvent.click(screen.getByRole("button", { name: /add supplier/i }));

    expect(screen.getByTestId("add-supplier-wizard")).toHaveAttribute(
      "data-open",
      "true"
    );
    expect(mockAddClientWizard).toHaveBeenLastCalledWith({
      open: true,
      defaultRoles: { isSeller: true },
    });
  });
});
