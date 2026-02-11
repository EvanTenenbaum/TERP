import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardHomePage from "./DashboardHomePage";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

vi.mock("./DashboardV3", () => ({
  default: () => <div>Standard Dashboard</div>,
}));

vi.mock("./OwnerCommandCenterDashboard", () => ({
  default: () => <div>Owner Command Center</div>,
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: vi.fn(),
}));

describe("DashboardHomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders standard dashboard while feature flags are loading", () => {
    vi.mocked(useFeatureFlag).mockReturnValue({
      enabled: false,
      isLoading: true,
      error: null,
    });

    render(<DashboardHomePage />);

    expect(screen.getByText("Standard Dashboard")).toBeInTheDocument();
  });

  it("renders standard dashboard when owner command center flag is disabled", () => {
    vi.mocked(useFeatureFlag).mockReturnValue({
      enabled: false,
      isLoading: false,
      error: null,
    });

    render(<DashboardHomePage />);

    expect(screen.getByText("Standard Dashboard")).toBeInTheDocument();
  });

  it("renders owner command center when the flag is enabled", () => {
    vi.mocked(useFeatureFlag).mockReturnValue({
      enabled: true,
      isLoading: false,
      error: null,
    });

    render(<DashboardHomePage />);

    expect(screen.getByText("Owner Command Center")).toBeInTheDocument();
  });
});
