import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UX_V2_FLAGS } from "@/components/feature-flags/uxV2Flags";
import { useOptionalFeatureFlag } from "@/contexts/FeatureFlagContext";
import { cn } from "@/lib/utils";

export interface LinearWorkspaceTab<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Grouped presentation of a workspace's tabs. When a workspace passes a
 * `tabGroups` prop and the `ux.v2.workspace-tabs` feature flag is enabled,
 * the shell renders a two-level rail: a top row of group labels and a
 * secondary pill row for the selected group's tabs. When the flag is off
 * (or `tabGroups` is omitted), the shell falls back to the single-row flat
 * `tabs` rail unchanged. See TER-1305.
 */
export interface LinearWorkspaceTabGroup<T extends string = string> {
  label: string;
  tabs: readonly LinearWorkspaceTab<T>[];
}

interface LinearWorkspaceShellProps<T extends string> {
  title: string;
  activeTab: T;
  tabs: readonly LinearWorkspaceTab<T>[];
  onTabChange: (tab: T) => void;
  /**
   * Optional grouped view of `tabs`. Rendered as a two-level rail only when
   * both this prop is provided AND the `ux.v2.workspace-tabs` feature flag
   * is enabled. Tab values referenced here MUST also exist in `tabs`; the
   * flat `tabs` array remains the source of truth for deep-link routing.
   * Introduced by TER-1305.
   */
  tabGroups?: readonly LinearWorkspaceTabGroup<T>[];
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
  tabGroups,
  commandStrip,
  children,
  className,
  density = "default",
}: LinearWorkspaceShellProps<T>) {
  const showHeader = Boolean(title);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [showTabsOverflowCue, setShowTabsOverflowCue] = useState(false);
  const hasMountedRef = useRef(false);
  const [showTransitionSkeleton, setShowTransitionSkeleton] = useState(false);

  // TER-1305: grouped two-level rail, gated by the ux.v2.workspace-tabs
  // flag. When the flag is off (or no provider is mounted) we render the
  // legacy flat rail — this is the safe default for other workspaces and
  // for isolated unit tests that don't mount FeatureFlagProvider.
  const workspaceTabsFlag = useOptionalFeatureFlag(UX_V2_FLAGS.WORKSPACE_TABS);
  const showGroupedRail =
    workspaceTabsFlag && Array.isArray(tabGroups) && tabGroups.length > 0;

  // Which group contains the currently-active tab. We recompute this from
  // `activeTab` rather than tracking a separate "active group" state so that
  // deep links (e.g. ?tab=invoices) land on the right group automatically.
  const activeGroupIndex = useMemo<number>(() => {
    if (!showGroupedRail || !tabGroups) return 0;
    const idx = tabGroups.findIndex(
      (group: LinearWorkspaceTabGroup<T>) =>
        group.tabs.findIndex(
          (tab: LinearWorkspaceTab<T>) => tab.value === activeTab
        ) >= 0
    );
    return idx >= 0 ? idx : 0;
  }, [showGroupedRail, tabGroups, activeTab]);

  const activeGroup: LinearWorkspaceTabGroup<T> | undefined =
    showGroupedRail && tabGroups ? tabGroups[activeGroupIndex] : undefined;

  // When the grouped rail is active the secondary pill row renders only the
  // current group's tabs; otherwise fall back to the flat tab list.
  const renderedTabs: readonly LinearWorkspaceTab<T>[] = activeGroup
    ? activeGroup.tabs
    : tabs;
  const showTabs = renderedTabs.length > 1;
  const showTabRow = showTabs || Boolean(commandStrip);

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
    // When the grouped rail is active the secondary pill row reflects the
    // active group, so we re-measure overflow whenever the rendered-tab set
    // shrinks/grows (e.g. switching from Ledger's 5 tabs to Overview's 1).
  }, [showTabs, tabs.length, renderedTabs.length]);

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
          {showGroupedRail && tabGroups ? (
            <div
              className="linear-workspace-group-row"
              role="tablist"
              aria-label="Tab groups"
              data-slot="linear-workspace-group-row"
            >
              {tabGroups.map((group: LinearWorkspaceTabGroup<T>, idx) => {
                const isActive = idx === activeGroupIndex;
                const firstTabValue = group.tabs[0]?.value;
                return (
                  <button
                    key={group.label}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-state={isActive ? "active" : "inactive"}
                    className="linear-workspace-group-trigger"
                    onClick={() => {
                      if (isActive) return;
                      // Switching groups jumps to that group's first tab so
                      // the secondary rail + panel stay consistent.
                      if (firstTabValue) onTabChange(firstTabValue as T);
                    }}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
          ) : null}
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
                      {renderedTabs.map((tab: LinearWorkspaceTab<T>) => (
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
