/**
 * ModuleFlowIntro route mapping tests
 * @vitest-environment jsdom
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModuleFlowIntro } from "./ModuleFlowIntro";

let mockLocation = "/";

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, vi.fn()],
}));

function renderIntro(path: string) {
  mockLocation = path;
  return render(<ModuleFlowIntro />);
}

describe("ModuleFlowIntro", () => {
  beforeEach(() => {
    mockLocation = "/";
  });

  it("shows dashboard explainer on dashboard routes", () => {
    renderIntro("/");
    expect(
      screen.getByRole("heading", { name: "How The Dashboard Works" })
    ).toBeInTheDocument();
  });

  it("shows accounting explainer on nested accounting routes", () => {
    renderIntro("/accounting/invoices");
    expect(
      screen.getByRole("heading", { name: "How Accounting Works" })
    ).toBeInTheDocument();
  });

  it("shows orders explainer on pick-pack routes", () => {
    renderIntro("/pick-pack");
    expect(
      screen.getByRole("heading", { name: "How Orders Work" })
    ).toBeInTheDocument();
  });

  it("shows needs explainer on interest list routes", () => {
    renderIntro("/interest-list");
    expect(
      screen.getByRole("heading", { name: "How Needs & Matching Work" })
    ).toBeInTheDocument();
  });

  it("does not render on unrelated routes", () => {
    const { container } = renderIntro("/settings");
    expect(container.firstChild).toBeNull();
  });
});
