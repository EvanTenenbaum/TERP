import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface LinearWorkspaceTab<T extends string = string> {
  value: T;
  label: string;
}

interface LinearWorkspaceShellProps<T extends string> {
  title: string;
  description: string;
  activeTab: T;
  tabs: readonly LinearWorkspaceTab<T>[];
  onTabChange: (tab: T) => void;
  meta?: Array<{ label: string; value: ReactNode }>;
  commandStrip?: ReactNode;
  children: ReactNode;
  className?: string;
  density?: "default" | "compact";
  /** Navigation section label (e.g. "Sell", "Buy", "Finance") shown as a hierarchy cue */
  section?: string;
}

export function LinearWorkspaceShell<T extends string>({
  title,
  description,
  activeTab,
  tabs,
  onTabChange,
  meta = [],
  commandStrip,
  children,
  className,
  density = "default",
  section,
}: LinearWorkspaceShellProps<T>) {
  const showHeader = Boolean(title || description || section);
  const showMeta = meta.length > 0;
  const showTabs = tabs.length > 1;
  const showTabRow = showTabs || Boolean(commandStrip);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [showTabsOverflowCue, setShowTabsOverflowCue] = useState(false);

  useEffect(() => {
    const container = tabsScrollRef.current;
    if (!container || !showTabs) {
      setShowTabsOverflowCue(false);
      return;
    }

    const updateOverflowCue = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth + 1;
      const isScrolledToEnd =
        container.scrollLeft + container.clientWidth >=
        container.scrollWidth - 1;
      setShowTabsOverflowCue(hasOverflow && !isScrolledToEnd);
    };

    updateOverflowCue();

    container.addEventListener("scroll", updateOverflowCue, { passive: true });
    const resizeObserver = new ResizeObserver(updateOverflowCue);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateOverflowCue);
      resizeObserver.disconnect();
    };
  }, [showTabs, tabs.length]);

  return (
    <section
      className={cn("linear-workspace-shell", className)}
      data-single-tab={!showTabs}
      data-density={density}
    >
      {showHeader && (
        <header className="linear-workspace-header">
          <div className="linear-workspace-title-wrap">
            <p className="linear-workspace-eyebrow">
              {section ? (
                <>
                  <span className="linear-workspace-eyebrow-section">
                    {section}
                  </span>
                  <span className="linear-workspace-eyebrow-sep" aria-hidden>
                    {" "}
                    /{" "}
                  </span>
                </>
              ) : null}
              Workspace
            </p>
            <div>
              <h1 className="linear-workspace-title">{title}</h1>
              {description ? (
                <p className="linear-workspace-description">{description}</p>
              ) : null}
            </div>
          </div>
        </header>
      )}

      {showMeta && (
        <div className="linear-workspace-meta" aria-label="Workspace metadata">
          {meta.map(item => (
            <div key={item.label} className="linear-workspace-meta-item">
              <span className="linear-workspace-meta-label">{item.label}</span>
              <span className="linear-workspace-meta-value">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={value => onTabChange(value as T)}
        className="linear-workspace-tabs"
      >
        {showTabRow ? (
          <div className="linear-workspace-tab-row">
            {showTabs ? (
              <div className="linear-workspace-tabs-stack">
                <div
                  ref={tabsScrollRef}
                  className="linear-workspace-tabs-scroller scrollbar-hide"
                  data-overflowing={showTabsOverflowCue}
                >
                  <TabsList className="linear-workspace-tabs-list">
                    {tabs.map(tab => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="linear-workspace-tabs-trigger"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {showTabsOverflowCue ? (
                  <p className="linear-workspace-tabs-overflow-hint">
                    Swipe for more tabs
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="linear-workspace-tabs-spacer" aria-hidden />
            )}
            <div className="linear-workspace-command-strip">{commandStrip}</div>
          </div>
        ) : null}
        {children}
      </Tabs>
    </section>
  );
}

interface LinearWorkspacePanelProps {
  value: string;
  children: ReactNode;
}

export function LinearWorkspacePanel({
  value,
  children,
}: LinearWorkspacePanelProps) {
  return (
    <TabsContent value={value} className="linear-workspace-content">
      {children}
    </TabsContent>
  );
}

export default LinearWorkspaceShell;
