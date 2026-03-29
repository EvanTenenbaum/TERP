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

  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId={autoSaveId}
      className={cn("items-start", desktopClassName)}
    >
      <ResizablePanel defaultSize={primaryDefaultSize} minSize={primaryMinSize}>
        <div className={cn("pr-3", primaryPanelClassName)}>{primary}</div>
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className={cn(
          "mx-1 rounded-full bg-border/70 after:w-3 hover:bg-border",
          handleClassName
        )}
      />
      <ResizablePanel
        defaultSize={resolvedSecondaryDefaultSize}
        minSize={secondaryMinSize}
      >
        <div className={cn("pl-3", secondaryPanelClassName)}>{secondary}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default AdaptiveSplitLayout;
