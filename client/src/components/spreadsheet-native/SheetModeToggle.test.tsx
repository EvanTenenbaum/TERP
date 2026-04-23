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
    it("renders with role=tablist on container and role=tab on buttons", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tablist", { name: "Surface mode" })
      ).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(2);
    });

    it("sets aria-selected=true on the active tab and false on the inactive tab", () => {
      const { rerender } = render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      const sheetNativeTab = screen.getByRole("tab", {
        name: "Spreadsheet View",
      });
      const classicTab = screen.getByRole("tab", { name: "Standard View" });

      expect(sheetNativeTab).toHaveAttribute("aria-selected", "true");
      expect(classicTab).toHaveAttribute("aria-selected", "false");

      // Switch mode
      rerender(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(sheetNativeTab).toHaveAttribute("aria-selected", "false");
      expect(classicTab).toHaveAttribute("aria-selected", "true");
    });

    it("sets aria-controls on each tab pointing to the panel ID", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
          sheetNativePanelId="custom-sheet-panel"
          classicPanelId="custom-classic-panel"
        />
      );

      expect(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      ).toHaveAttribute("aria-controls", "custom-sheet-panel");
      expect(
        screen.getByRole("tab", { name: "Standard View" })
      ).toHaveAttribute("aria-controls", "custom-classic-panel");
    });

    it("uses default panel IDs when not provided", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      ).toHaveAttribute("aria-controls", "surface-panel-sheet-native");
      expect(
        screen.getByRole("tab", { name: "Standard View" })
      ).toHaveAttribute("aria-controls", "surface-panel-classic");
    });

    it("sets tabIndex=0 on selected tab and tabIndex=-1 on unselected tab", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      ).toHaveAttribute("tabindex", "0");
      expect(
        screen.getByRole("tab", { name: "Standard View" })
      ).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("Keyboard navigation", () => {
    it("moves to next tab on ArrowRight and activates it", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "ArrowRight" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("classic");
    });

    it("moves to previous tab on ArrowLeft and activates it", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "ArrowLeft" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("sheet-native");
    });

    it("wraps around when navigating past the last tab with ArrowRight", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "ArrowRight" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("sheet-native");
    });

    it("wraps around when navigating before the first tab with ArrowLeft", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "ArrowLeft" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("classic");
    });

    it("supports ArrowDown as an alternative to ArrowRight", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "ArrowDown" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("classic");
    });

    it("supports ArrowUp as an alternative to ArrowLeft", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "ArrowUp" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("sheet-native");
    });

    it("jumps to first tab on Home key", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "Home" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("sheet-native");
    });

    it("jumps to last tab on End key", () => {
      const onSurfaceModeChange = vi.fn();
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      const tablist = screen.getByRole("tablist");
      fireEvent.keyDown(tablist, { key: "End" });

      expect(onSurfaceModeChange).toHaveBeenCalledWith("classic");
    });
  });

  describe("Click interaction", () => {
    it("routes clicks back through the mode-change handler", () => {
      const onSurfaceModeChange = vi.fn();

      render(
        <SheetModeToggle
          enabled
          surfaceMode="classic"
          onSurfaceModeChange={onSurfaceModeChange}
        />
      );

      fireEvent.click(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      );
      fireEvent.click(screen.getByRole("tab", { name: "Standard View" }));

      expect(onSurfaceModeChange).toHaveBeenNthCalledWith(1, "sheet-native");
      expect(onSurfaceModeChange).toHaveBeenNthCalledWith(2, "classic");
    });
  });

  describe("Visual state", () => {
    it("renders the selected tab with default variant and unselected with outline", () => {
      render(
        <SheetModeToggle
          enabled
          surfaceMode="sheet-native"
          onSurfaceModeChange={vi.fn()}
        />
      );

      expect(
        screen.getByRole("tab", { name: "Spreadsheet View" })
      ).toHaveAttribute("data-variant", "default");
      expect(
        screen.getByRole("tab", { name: "Standard View" })
      ).toHaveAttribute("data-variant", "outline");
    });
  });

  describe("Disabled state", () => {
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
});
