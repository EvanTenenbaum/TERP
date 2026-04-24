import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardHomePage from "./DashboardHomePage";

vi.mock("./OwnerCommandCenterDashboard", () => ({
  default: () => <div>Owner Command Center</div>,
}));

describe("DashboardHomePage", () => {
  it("renders Owner Command Center Dashboard", () => {
    render(<DashboardHomePage />);

    expect(screen.getByText("Owner Command Center")).toBeInTheDocument();
  });
});
