/**
 * @vitest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockPermissions = {
  isSuperAdmin: false,
  hasPermission: (_permission: string) => false,
};

const mockUpdateSettingMutate = vi.fn();
const mockUpdatePreferencesMutate = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => mockPermissions,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    organizationSettings: {
      settings: {
        list: {
          useQuery: () => ({
            data: {
              settingsMap: {
                grade_field_enabled: true,
                grade_field_required: false,
                expected_delivery_enabled: true,
                packaged_unit_enabled: true,
                cogs_display_mode: "VISIBLE",
              },
            },
            refetch: vi.fn(),
          }),
        },
        update: {
          useMutation: () => ({
            mutate: mockUpdateSettingMutate,
            isPending: false,
          }),
        },
      },
      userPreferences: {
        get: {
          useQuery: () => ({
            data: {
              defaultWarehouseId: null,
              showCogsInOrders: true,
              showMarginInOrders: true,
              showGradeField: true,
              hideExpectedDelivery: false,
            },
          }),
        },
        update: {
          useMutation: () => ({
            mutate: mockUpdatePreferencesMutate,
            isPending: false,
          }),
        },
      },
    },
    settings: {
      locations: {
        list: {
          useQuery: () => ({
            data: [{ id: 1, site: "Main Warehouse", zone: "A" }],
          }),
        },
      },
    },
  },
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.ComponentPropsWithoutRef<"input">) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      role="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={event => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-value={value} data-on-change={Boolean(onValueChange)}>
      {onValueChange ? (
        <button type="button" onClick={() => onValueChange("HIDDEN")}>
          mock-select-change
        </button>
      ) : null}
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder ?? "selected"}</span>
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
  }) => <div data-value={value}>{children}</div>,
}));

import {
  GeneralOrgSettings,
  UserPreferencesSettings,
} from "./OrganizationSettings";

describe("OrganizationSettings wave 5 coverage", () => {
  beforeEach(() => {
    mockPermissions = {
      isSuperAdmin: false,
      hasPermission: (_permission: string) => false,
    };
    mockUpdateSettingMutate.mockReset();
    mockUpdatePreferencesMutate.mockReset();
  });

  it("hides COGS display controls from users without finance access", () => {
    render(<GeneralOrgSettings />);

    expect(screen.queryByText("COGS Display Settings")).not.toBeInTheDocument();
  });

  it("shows admin-only COGS controls for authorized users", () => {
    mockPermissions = {
      isSuperAdmin: false,
      hasPermission: permission => permission === "settings:edit",
    };

    render(<GeneralOrgSettings />);

    expect(screen.getByText("COGS Display Settings")).toBeInTheDocument();
    expect(screen.getByText("Admin Only")).toBeInTheDocument();
    expect(screen.queryByText("Visible to All Users")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "mock-select-change" }));

    expect(mockUpdateSettingMutate).toHaveBeenCalledWith({
      key: "cogs_display_mode",
      value: "HIDDEN",
    });
  });

  it("keeps org-level COGS controls hidden when the viewer lacks settings:edit", () => {
    mockPermissions = {
      isSuperAdmin: false,
      hasPermission: permission =>
        permission === "settings:manage" || permission === "cogs:update",
    };

    render(<GeneralOrgSettings />);

    expect(screen.queryByText("COGS Display Settings")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "mock-select-change" })
    ).not.toBeInTheDocument();
  });

  it("replaces COGS preference toggles with a locked notice for unauthorized users", () => {
    render(<UserPreferencesSettings />);

    expect(
      screen.getByText(
        "COGS and margin preferences are hidden because your role does not include COGS access."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Show COGS in Orders")).not.toBeInTheDocument();
    expect(screen.queryByText("Show Margin in Orders")).not.toBeInTheDocument();
  });

  it("shows COGS preference toggles for authorized users and persists changes", () => {
    mockPermissions = {
      isSuperAdmin: true,
      hasPermission: () => true,
    };

    render(<UserPreferencesSettings />);

    expect(screen.getByText("Show COGS in Orders")).toBeInTheDocument();
    expect(screen.getByText("Show Margin in Orders")).toBeInTheDocument();

    const toggles = screen.getAllByRole("checkbox");
    fireEvent.click(toggles[0]);

    expect(mockUpdatePreferencesMutate).toHaveBeenCalledWith({
      showCogsInOrders: false,
    });
  });
});
