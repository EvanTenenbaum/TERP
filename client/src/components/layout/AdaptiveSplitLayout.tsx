import { useEffect, useState, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface AdaptiveSplitLayoutProps {
  primary: ReactNode;
  secondary: ReactNode;
  autoSaveId?: string;
  primaryDefaultSize?: number;
  primaryMinSize?: number;
  secondaryDefaultSize?: number;
  secondaryMinSize?: number;
  mobileClassName?: string;
  desktopClassName?: string;
  primaryPanelClassName?: string;
  secondaryPanelClassName?: string;
  handleClassName?: string;
  /**
   * Split direction.
   * - "horizontal": panels arranged side-by-side with a vertical drag handle.
   * - "vertical": panels stacked top/bottom with a horizontal drag handle
   *   that spans the full width (draggable to resize heights).
   * Defaults to "horizontal".
   */
  direction?: "horizontal" | "vertical";
}

export function AdaptiveSplitLayout({
  primary,
  secondary,
  autoSaveId,
  primaryDefaultSize = 64,
  primaryMinSize = 48,
  secondaryDefaultSize,
  secondaryMinSize = 24,
  mobileClassName,
  desktopClassName,
  primaryPanelClassName,
  secondaryPanelClassName,
  handleClassName,
  direction = "horizontal",
}: AdaptiveSplitLayoutProps) {
  const [isDesktopLayout, setIsDesktopLayout] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth >= 1024;
  });
  const resolvedSecondaryDefaultSize =
    secondaryDefaultSize ??
    Math.max(100 - primaryDefaultSize, secondaryMinSize);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncLayout = () => {
      setIsDesktopLayout(window.innerWidth >= 1024);
    };

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  if (!isDesktopLayout) {
    return (
      <div className={cn("space-y-4", mobileClassName)}>
        {primary}
        {secondary}
      </div>
    );
  }

  const isVertical = direction === "vertical";
  const primarySpacingClass = isVertical ? "pb-3" : "pr-3";
  const secondarySpacingClass = isVertical ? "pt-3" : "pl-3";
  const handlePositionClass = isVertical ? "my-1 cursor-row-resize" : "mx-1";
  const handleSizeClass = isVertical ? "after:h-3" : "after:w-3";
  const panelGroupClassName = isVertical
    ? cn("items-stretch", desktopClassName)
    : cn("items-start", desktopClassName);

  return (
    <ResizablePanelGroup
      direction={direction}
      autoSaveId={autoSaveId}
      className={panelGroupClassName}
    >
      <ResizablePanel defaultSize={primaryDefaultSize} minSize={primaryMinSize}>
        <div className={cn(primarySpacingClass, primaryPanelClassName)}>
          {primary}
        </div>
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className={cn(
          "rounded-full bg-border/70 hover:bg-border",
          handlePositionClass,
          handleSizeClass,
          handleClassName
        )}
      />
      <ResizablePanel
        defaultSize={resolvedSecondaryDefaultSize}
        minSize={secondaryMinSize}
      >
        <div className={cn(secondarySpacingClass, secondaryPanelClassName)}>
          {secondary}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default AdaptiveSplitLayout;
