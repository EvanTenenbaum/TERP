import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacePanelSkeleton } from "@/components/ui/operational-states";
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

const TRANSITION_SKELETON_MS = 180;

const LinearWorkspaceTransitionContext = createContext<{
  activeTab: string;
  showTransitionSkeleton: boolean;
}>({
  activeTab: "",
  showTransitionSkeleton: false,
});

function LinearWorkspaceTransitionSkeleton() {
  return (
    <WorkspacePanelSkeleton
      data-testid="workspace-transition-skeleton"
      eyebrow="Loading workspace content"
      title="Refreshing the active workspace surface"
    />
  );
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
  const hasMountedRef = useRef(false);
  const [showTransitionSkeleton, setShowTransitionSkeleton] = useState(false);

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

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    setShowTransitionSkeleton(true);
    const timeoutId = window.setTimeout(() => {
      setShowTransitionSkeleton(false);
    }, TRANSITION_SKELETON_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab]);

  return (
    <section
      className={cn("linear-workspace-shell", className)}
      data-single-tab={!showTabs}
      data-density={density}
    >
      {showHeader && (
        <div className="linear-workspace-strip">
          <header className="linear-workspace-header linear-workspace-strip-main">
            <div className="linear-workspace-heading">
              {section ? (
                <span className="linear-workspace-section-pill">{section}</span>
              ) : null}
              <div className="linear-workspace-heading-copy">
                <div className="linear-workspace-title-line">
                  <p className="linear-workspace-eyebrow">Workspace</p>
                  <h1 className="linear-workspace-title">{title}</h1>
                </div>
                {description ? (
                  <p className="linear-workspace-description">{description}</p>
                ) : null}
              </div>
            </div>
            {showMeta ? (
              <div
                className="linear-workspace-meta linear-workspace-meta-cluster"
                aria-label="Workspace metadata"
              >
                {meta.map(item => (
                  <div key={item.label} className="linear-workspace-meta-item">
                    <span className="linear-workspace-meta-label">
                      {item.label}
                    </span>
                    <span className="linear-workspace-meta-value">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </header>
        </div>
      )}

      <LinearWorkspaceTransitionContext.Provider
        value={{ activeTab, showTransitionSkeleton }}
      >
        <Tabs
          value={activeTab}
          onValueChange={value => onTabChange(value as T)}
          className="linear-workspace-tabs"
        >
          {showTabRow ? (
            <div
              className="linear-workspace-tab-row"
              data-has-context={showHeader || showMeta ? "true" : "false"}
            >
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
              <div className="linear-workspace-command-strip">
                {commandStrip}
              </div>
            </div>
          ) : null}
          {children}
        </Tabs>
      </LinearWorkspaceTransitionContext.Provider>
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
  const { activeTab, showTransitionSkeleton } = useContext(
    LinearWorkspaceTransitionContext
  );

  return (
    <TabsContent value={value} className="linear-workspace-content">
      {showTransitionSkeleton && activeTab === value ? (
        <LinearWorkspaceTransitionSkeleton />
      ) : (
        children
      )}
    </TabsContent>
  );
}

export default LinearWorkspaceShell;
