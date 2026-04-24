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
  describe("WAI-ARIA tab semantics (TER-924)", () => {
    it("renders with role=tablist on the container", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tablist", { name: "Surface view mode" })
      ).toBeInTheDocument();
    });

    it("renders each button with role=tab and aria-selected", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      const spreadsheetTab = screen.getByRole("tab", {
        name: "Spreadsheet View",
      });
      const standardTab = screen.getByRole("tab", { name: "Standard View" });

      expect(spreadsheetTab).toHaveAttribute("aria-selected", "true");
      expect(standardTab).toHaveAttribute("aria-selected", "false");
    });

    it("toggles aria-selected when switching modes", () => {
      const { rerender } = render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      ).toHaveAttribute("aria-selected", "true");
      expect(
        screen.getByRole("tab", { name: "Standard View" })
      ).toHaveAttribute("aria-selected", "false");

      rerender(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      ).toHaveAttribute("aria-selected", "false");
      expect(
        screen.getByRole("tab", { name: "Standard View" })
      ).toHaveAttribute("aria-selected", "true");
    });

    it("sets aria-controls on each tab", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      ).toHaveAttribute("aria-controls", "surface-panel");
      expect(
        screen.getByRole("tab", { name: "Standard View" })
      ).toHaveAttribute("aria-controls", "surface-panel");
    });

    it("manages tabIndex correctly (0 for selected, -1 for unselected)", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      ).toHaveAttribute("tabIndex", "0");
      expect(
        screen.getByRole("tab", { name: "Standard View" })
      ).toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("keyboard navigation", () => {
    it("navigates to next tab with ArrowRight", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const spreadsheetTab = screen.getByRole("tab", {
        name: "Spreadsheet View",
      });
      spreadsheetTab.focus();

      fireEvent.keyDown(spreadsheetTab, { key: "ArrowRight" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("classic");
    });

    it("navigates to previous tab with ArrowLeft", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const standardTab = screen.getByRole("tab", { name: "Standard View" });
      standardTab.focus();

      fireEvent.keyDown(standardTab, { key: "ArrowLeft" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("sheet-native");
    });

    it("wraps around when navigating past the last tab", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const standardTab = screen.getByRole("tab", { name: "Standard View" });
      standardTab.focus();

      fireEvent.keyDown(standardTab, { key: "ArrowRight" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("sheet-native");
    });

    it("navigates to first tab with Home", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const standardTab = screen.getByRole("tab", { name: "Standard View" });
      standardTab.focus();

      fireEvent.keyDown(standardTab, { key: "Home" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("sheet-native");
    });

    it("navigates to last tab with End", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const spreadsheetTab = screen.getByRole("tab", {
        name: "Spreadsheet View",
      });
      spreadsheetTab.focus();

      fireEvent.keyDown(spreadsheetTab, { key: "End" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("classic");
    });
  });

  // TER-1364: View-mode toggle is not a primary action. The active tab uses
  // the "secondary" variant (neutral selected state) rather than "default"
  // (filled primary) so it doesn't compete with the real primary "New Order"
  // CTA in the Sales workspace header. The inactive tab stays as "outline".
  it("renders a consistent active state for both modes", () => {
    render(
      <SheetModeToggle
        enabled
        surfaceMode="sheet-native"
        onSurfaceModeChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole("tab", { name: "Spreadsheet View" })
    ).toHaveAttribute("data-variant", "secondary");
    expect(
      screen.getByRole("tab", { name: "Standard View" })
    ).toHaveAttribute("data-variant", "outline");
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

    fireEvent.click(screen.getByRole("tab", { name: "Spreadsheet View" }));
    fireEvent.click(screen.getByRole("tab", { name: "Standard View" }));

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
