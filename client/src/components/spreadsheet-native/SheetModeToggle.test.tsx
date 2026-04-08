/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { SheetModeToggle } from "./SheetModeToggle";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant,
    ...props
  }: ComponentPropsWithoutRef<"button"> & { variant?: string }) => (
    <button data-variant={variant} type="button" {...props}>
      {children}
    </button>
  ),
}));

describe("SheetModeToggle", () => {
  it("renders a consistent active state for both modes", () => {
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
    expect(
      screen.getByRole("button", { name: "Spreadsheet View" })
    ).toHaveAttribute("data-variant", "default");
    expect(
      screen.getByRole("button", { name: "Spreadsheet View" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Standard View" })
    ).toHaveAttribute("data-variant", "outline");
    expect(
      screen.getByRole("button", { name: "Standard View" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("routes clicks back through the mode-change handler", () => {
    const onSurfaceModeChange = vi.fn();

    render(
      <SheetModeToggle
        enabled
        surfaceMode="classic"
        onSurfaceModeChange={onSurfaceModeChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Spreadsheet View" }));
    fireEvent.click(screen.getByRole("button", { name: "Standard View" }));

    expect(onSurfaceModeChange).toHaveBeenNthCalledWith(1, "sheet-native");
    expect(onSurfaceModeChange).toHaveBeenNthCalledWith(2, "classic");
  });

  it("renders nothing when the toggle is disabled", () => {
    const { container } = render(
      <SheetModeToggle
        enabled={false}
        surfaceMode="classic"
        onSurfaceModeChange={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
