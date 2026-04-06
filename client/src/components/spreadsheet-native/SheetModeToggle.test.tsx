/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SheetModeToggle } from "./SheetModeToggle";

describe("SheetModeToggle", () => {
  it("does not render when sheet-native mode is unavailable", () => {
    const { container } = render(
      <SheetModeToggle
        enabled={false}
        surfaceMode="classic"
        onSurfaceModeChange={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("exposes a grouped toggle with pressed states for the active mode", () => {
    render(
      <SheetModeToggle
        enabled
        surfaceMode="sheet-native"
        onSurfaceModeChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole("group", { name: "Surface mode" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spreadsheet View" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Classic Surface" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls back when the user switches modes", () => {
    const onSurfaceModeChange = vi.fn();
    render(
      <SheetModeToggle
        enabled
        surfaceMode="classic"
        onSurfaceModeChange={onSurfaceModeChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Spreadsheet View" }));

    expect(onSurfaceModeChange).toHaveBeenCalledWith("sheet-native");
  });
});
