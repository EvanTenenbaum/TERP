/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings";

const mockSetLocation = vi.fn();
let mockSearch = "";
let mockUserRole: "admin" | "user" = "user";

vi.mock("wouter", () => ({
  useLocation: () => ["/settings", mockSetLocation],
  useSearch: () => mockSearch,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user:
      mockUserRole === "admin"
        ? { id: 1, role: "admin" }
        : { id: 2, role: "user" },
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    isSuperAdmin: false,
    hasPermission: () => false,
  }),
}));

vi.mock("@/components/common/BackButton", () => ({
  BackButton: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@/components/UserManagement", () => ({
  UserManagement: () => <div>Mock Users Section</div>,
}));

vi.mock("@/components/settings/rbac/UserRoleManagement", () => ({
  UserRoleManagement: () => <div>Mock User Roles Section</div>,
}));

vi.mock("@/components/settings/rbac/RoleManagement", () => ({
  RoleManagement: () => <div>Mock Roles Section</div>,
}));

vi.mock("@/components/settings/rbac/PermissionAssignment", () => ({
  PermissionAssignment: () => <div>Mock Permissions Section</div>,
}));

vi.mock("@/components/settings/VIPImpersonationManager", () => ({
  VIPImpersonationManager: () => <div>Mock VIP Access Section</div>,
}));

vi.mock("@/components/settings/OrganizationSettings", () => ({
  GeneralOrgSettings: () => <div>Mock Organization Settings</div>,
  UserPreferencesSettings: () => <div>Mock User Preferences Settings</div>,
  UnitTypesManager: () => <div>Mock Unit Types Settings</div>,
  FinanceStatusManager: () => <div>Mock Finance Status Settings</div>,
}));

vi.mock("@/components/calendar/CalendarSettings", () => ({
  CalendarSettings: () => <div>Mock Calendar Settings</div>,
}));

vi.mock("@/components/settings/TagManagementSettings", () => ({
  TagManagementSettings: () => <div>Mock Tags Section</div>,
}));

vi.mock("@/components/work-surface/ProductsWorkSurface", () => ({
  default: () => <div>Mock Product Metadata Section</div>,
}));

vi.mock("@/pages/settings/FeatureFlagsPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Mock Feature Flags Manager {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));

describe("Settings", () => {
  beforeEach(() => {
    mockSearch = "";
    mockUserRole = "user";
    mockSetLocation.mockReset();
  });

  it("renders the four TER-571 super-tabs and removes notifications from system settings", () => {
    render(<Settings />);

    expect(
      screen.getByRole("tab", { name: /access control/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /master data/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /^organization$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /developer/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /notifications/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Mock Users Section")).toBeInTheDocument();
  });

  it("maps legacy rbac deep links into the access control user roles section", () => {
    mockSearch = "?tab=rbac";

    render(<Settings />);

    expect(screen.getByText("Mock User Roles Section")).toBeInTheDocument();
  });

  it("redirects legacy notification tab deep links to account", async () => {
    mockSearch = "?tab=notifications";

    render(<Settings />);

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith("/account");
    });
  });

  it("renders product metadata under master data", () => {
    mockSearch = "?tab=product-metadata";

    render(<Settings />);

    expect(
      screen.getByText("Mock Product Metadata Section")
    ).toBeInTheDocument();
  });

  it("renders the embedded feature flags manager for admin users", () => {
    mockSearch = "?tab=feature-flags";
    mockUserRole = "admin";

    render(<Settings />);

    expect(
      screen.getByText("Mock Feature Flags Manager Embedded")
    ).toBeInTheDocument();
  });

  it("hides the feature flags section for non-admin users", () => {
    render(<Settings />);

    expect(
      screen.queryByRole("tab", { name: /feature flags/i })
    ).not.toBeInTheDocument();
  });
});
