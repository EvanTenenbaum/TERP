/**
 * Feature flags operator visibility tests
 *
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmbeddedFeatureFlagsPage } from "./FeatureFlagsPage";

const mockToast = vi.fn();
let mockIsSuperAdmin = false;

const mockFlags = [
  {
    id: 1,
    name: "Order Sheets",
    key: "orders.sheets",
    description: "Sheet-native order workflows",
    module: "Orders",
    systemEnabled: true,
    defaultEnabled: true,
    dependsOn: "spreadsheet-view",
  },
  {
    id: 2,
    name: "AR Dashboard",
    key: "finance.ar-dashboard",
    description: "Accounts receivable dashboard",
    module: "Finance",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: null,
  },
];

vi.mock("../../lib/trpc", () => ({
  trpc: {
    featureFlags: {
      getAll: {
        useQuery: () => ({
          data: mockFlags,
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      getAuditHistory: {
        useQuery: () => ({
          data: [
            {
              id: 1,
              flagKey: "orders.sheets",
              action: "SYSTEM_ENABLED",
              actorOpenId: "usr_123",
              createdAt: new Date("2026-03-27T12:00:00Z"),
            },
          ],
          refetch: vi.fn(),
        }),
      },
      toggleSystemEnabled: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      create: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      invalidateAllCaches: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      seedDefaults: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      update: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      getRoleOverrides: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      setUserOverride: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      removeUserOverride: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      setRoleOverride: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      removeRoleOverride: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
    },
    userManagement: {
      listUsers: { useQuery: () => ({ data: [] }) },
    },
    rbacRoles: {
      list: { useQuery: () => ({ data: { roles: [] } }) },
    },
  },
}));

vi.mock("../../hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("../../hooks/usePermissions", () => ({
  usePermissions: () => ({
    isSuperAdmin: mockIsSuperAdmin,
    hasPermission: () => mockIsSuperAdmin,
  }),
}));

describe("EmbeddedFeatureFlagsPage", () => {
  beforeEach(() => {
    mockIsSuperAdmin = false;
    mockToast.mockClear();
  });

  it("groups controls by module and hides raw keys for non-super admins", () => {
    render(<EmbeddedFeatureFlagsPage />);

    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.queryByText("orders.sheets")).not.toBeInTheDocument();
    expect(screen.queryByText("Requires")).not.toBeInTheDocument();
    expect(screen.getByText("Order Sheets")).toBeInTheDocument();
    expect(screen.getByText("AR Dashboard")).toBeInTheDocument();
  });

  it("shows raw keys and dependency column for super admins", () => {
    mockIsSuperAdmin = true;

    render(<EmbeddedFeatureFlagsPage />);

    expect(screen.getByText("orders.sheets")).toBeInTheDocument();
    expect(screen.getAllByText("Requires")).toHaveLength(2);
    expect(screen.getByText("spreadsheet-view")).toBeInTheDocument();
  });
});
