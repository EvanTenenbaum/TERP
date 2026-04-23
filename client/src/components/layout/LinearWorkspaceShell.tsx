import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface LinearWorkspaceTab<T extends string = string> {
  value: T;
  label: string;
}

interface LinearWorkspaceShellProps<T extends string> {
  title: string;
  activeTab: T;
  tabs: readonly LinearWorkspaceTab<T>[];
  onTabChange: (tab: T) => void;
  commandStrip?: ReactNode;
  children: ReactNode;
  className?: string;
  density?: "default" | "compact";
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
    <div
      data-testid="workspace-transition-skeleton"
      className="space-y-4 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm"
      aria-live="polite"
      aria-label="Loading workspace content"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-36 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-muted/80" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-16 animate-pulse rounded-xl bg-muted/80" />
        <div className="h-16 animate-pulse rounded-xl bg-muted/80" />
        <div className="h-16 animate-pulse rounded-xl bg-muted/80" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-muted/70" />
    </div>
  );
}

export function LinearWorkspaceShell<T extends string>({
  title,
  activeTab,
  tabs,
  onTabChange,
  commandStrip,
  children,
  className,
  density = "default",
}: LinearWorkspaceShellProps<T>) {
  const showHeader = Boolean(title);
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
        <header className="linear-workspace-header">
          <div className="linear-workspace-title-wrap">
            <div>
              <h1 className="linear-workspace-title">{title}</h1>
            </div>
          </div>
        </header>
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
