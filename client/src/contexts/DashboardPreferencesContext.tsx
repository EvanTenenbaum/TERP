import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { WidgetState } from "@/types/dashboard";
import {
  LAYOUT_PRESETS,
  DEFAULT_LAYOUT_ID,
  WIDGET_METADATA,
} from "@/lib/constants/dashboardPresets";
import { trpc } from "@/lib/trpc";

interface DashboardPreferencesState {
  activeLayoutId: string;
  widgets: WidgetState[];
  isCustomizing: boolean;
}

interface DashboardPreferencesActions {
  setActiveLayout: (layoutId: string) => void;
  toggleWidgetVisibility: (widgetId: string) => void;
  reorderWidgets: (newOrder: string[]) => void;
  moveWidgetUp: (widgetId: string) => void;
  moveWidgetDown: (widgetId: string) => void;
  resetToDefault: () => void;
  setIsCustomizing: (isCustomizing: boolean) => void;
}

type DashboardPreferencesContextType = DashboardPreferencesState &
  DashboardPreferencesActions & {
    isSyncing: boolean;
    isLoading: boolean;
  };

const DashboardPreferencesContext = createContext<
  DashboardPreferencesContextType | undefined
>(undefined);

const STORAGE_KEY = "terp-dashboard-preferences";
const DEBOUNCE_DELAY = 1000; // 1 second debounce for auto-save

function loadPreferencesFromLocalStorage(): DashboardPreferencesState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(
      "Failed to load dashboard preferences from localStorage:",
      error
    );
  }

  // Return default
  return {
    activeLayoutId: DEFAULT_LAYOUT_ID,
    widgets: LAYOUT_PRESETS[DEFAULT_LAYOUT_ID].widgets,
    isCustomizing: false,
  };
}

function savePreferencesToLocalStorage(state: DashboardPreferencesState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error(
      "Failed to save dashboard preferences to localStorage:",
      error
    );
  }
}

/**
 * Convert backend WidgetConfig[] to frontend WidgetState[]
 */
function convertBackendToFrontend(
  widgetConfig: Array<{ id: string; isVisible: boolean; order?: number }>
): WidgetState[] {
  return widgetConfig.map(widget => ({
    id: widget.id,
    isExpanded: false,
    isVisible: widget.isVisible,
    order: widget.order || 0,
  }));
}

/**
 * Convert frontend WidgetState[] to backend WidgetConfig[]
 */
function convertFrontendToBackend(
  widgets: WidgetState[]
): Array<{ id: string; isVisible: boolean; order?: number }> {
  return widgets.map(widget => ({
    id: widget.id,
    isVisible: widget.isVisible,
    order: widget.order,
  }));
}

export function DashboardPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<DashboardPreferencesState>(
    loadPreferencesFromLocalStorage
  );
  const [isSyncing, setIsSyncing] = useState(false);
  // Use a ref instead of state for the timeout ID — we don't need to re-render
  // when it changes, and keeping it as state would require adding it to the
  // debounce effect's deps (causing the effect to re-run when we setSaveTimeoutId).
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch preferences from backend
  const { data: serverPreferences, isLoading } =
    trpc.dashboardPreferences.getPreferences.useQuery(undefined, {
      retry: 1,
      refetchOnWindowFocus: false,
    });

  // Mutation for updating preferences
  const updateMutation =
    trpc.dashboardPreferences.updatePreferences.useMutation({
      onMutate: () => {
        setIsSyncing(true);
      },
      onSuccess: () => {
        if (import.meta.env.DEV) {
          console.info("Dashboard preferences synced to server");
        }
      },
      onError: error => {
        console.error("Failed to sync dashboard preferences:", error);
      },
      onSettled: () => {
        setIsSyncing(false);
      },
    });

  // Mutation for resetting preferences
  const resetMutation = trpc.dashboardPreferences.resetPreferences.useMutation({
    onSuccess: () => {
      if (import.meta.env.DEV) {
        console.info("Dashboard preferences reset on server");
      }
      // Reset local state to defaults
      setState({
        activeLayoutId: DEFAULT_LAYOUT_ID,
        widgets: LAYOUT_PRESETS[DEFAULT_LAYOUT_ID].widgets,
        isCustomizing: false,
      });
    },
    onError: error => {
      console.error("Failed to reset dashboard preferences:", error);
    },
  });

  // Load preferences from server on mount
  useEffect(() => {
    if (serverPreferences && serverPreferences.id !== 0) {
      // Server has saved preferences, use them
      const backendWidgets = convertBackendToFrontend(
        serverPreferences.widgetConfig
      );
      setState({
        activeLayoutId: serverPreferences.activeLayout,
        widgets: backendWidgets,
        isCustomizing: false,
      });

      // Also save to localStorage as cache
      savePreferencesToLocalStorage({
        activeLayoutId: serverPreferences.activeLayout,
        widgets: backendWidgets,
        isCustomizing: false,
      });

      if (import.meta.env.DEV) {
        console.info("Loaded dashboard preferences from server");
      }
    } else if (serverPreferences && serverPreferences.id === 0) {
      // No saved preferences on server, use localStorage or defaults
      if (import.meta.env.DEV) {
        console.info(
          "No saved preferences on server, using localStorage/defaults"
        );
      }
    }
  }, [serverPreferences]);

  // Debounced auto-save to server whenever state changes.
  // updateMutation is a stable reference from React Query's useMutation,
  // so including it in deps is safe and correct.
  useEffect(() => {
    // Don't sync if we're still loading from server
    if (isLoading) return;

    // Clear existing timeout (ref doesn't need to be in deps)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    const timeoutId = setTimeout(() => {
      const backendWidgets = convertFrontendToBackend(state.widgets);

      updateMutation.mutate({
        activeLayout: state.activeLayoutId as
          | "executive"
          | "operations"
          | "sales"
          | "custom",
        widgetConfig: backendWidgets,
      });
    }, DEBOUNCE_DELAY);

    saveTimeoutRef.current = timeoutId;

    // Also save to localStorage immediately for instant persistence
    savePreferencesToLocalStorage(state);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [state, isLoading, updateMutation]);

  const setActiveLayout = useCallback((layoutId: string) => {
    const preset = LAYOUT_PRESETS[layoutId];
    if (preset) {
      setState(prev => {
        // Special handling for 'custom' layout: preserve current widgets
        // instead of replacing with empty array
        if (layoutId === "custom") {
          // If current widgets array is empty, initialize with all widgets hidden
          // so users can selectively enable them via Widget Visibility panel
          if (prev.widgets.length === 0) {
            const allWidgetsHidden: WidgetState[] = Object.keys(
              WIDGET_METADATA
            ).map((id, index) => ({
              id,
              isVisible: false,
              isExpanded: false,
              order: index,
            }));
            return {
              ...prev,
              activeLayoutId: layoutId,
              widgets: allWidgetsHidden,
            };
          }
          return {
            ...prev,
            activeLayoutId: layoutId,
            // Keep existing widgets when switching to custom
          };
        }

        // For other presets, use the preset's widget configuration
        return {
          ...prev,
          activeLayoutId: layoutId,
          widgets: preset.widgets,
        };
      });
    }
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    setState(prev => {
      const existingWidget = prev.widgets.find(w => w.id === widgetId);

      let newWidgets: WidgetState[];

      if (existingWidget) {
        // Widget exists, toggle its visibility
        newWidgets = prev.widgets.map(widget =>
          widget.id === widgetId
            ? { ...widget, isVisible: !widget.isVisible }
            : widget
        );
      } else {
        // Widget doesn't exist in array (e.g., custom layout with empty widgets)
        // Add it with visibility set to true
        newWidgets = [
          ...prev.widgets,
          {
            id: widgetId,
            isVisible: true,
            isExpanded: false,
            order: prev.widgets.length,
          },
        ];
      }

      // If we're modifying a preset, switch to custom
      const newLayoutId = "custom";

      return {
        ...prev,
        activeLayoutId: newLayoutId,
        widgets: newWidgets,
      };
    });
  }, []);

  const reorderWidgets = useCallback((newOrder: string[]) => {
    setState(prev => {
      const widgetMap = new Map(prev.widgets.map(w => [w.id, w]));
      const newWidgets = newOrder
        .map(id => widgetMap.get(id))
        .filter((w): w is NonNullable<typeof w> => w !== undefined);

      return {
        ...prev,
        activeLayoutId: "custom",
        widgets: newWidgets,
      };
    });
  }, []);

  const moveWidgetUp = useCallback((widgetId: string) => {
    setState(prev => {
      const index = prev.widgets.findIndex(w => w.id === widgetId);
      if (index <= 0) return prev; // Already at top or not found

      const newWidgets = [...prev.widgets];
      [newWidgets[index - 1], newWidgets[index]] = [
        newWidgets[index],
        newWidgets[index - 1],
      ];

      // Update order property
      newWidgets.forEach((widget, idx) => {
        widget.order = idx;
      });

      return {
        ...prev,
        activeLayoutId: "custom",
        widgets: newWidgets,
      };
    });
  }, []);

  const moveWidgetDown = useCallback((widgetId: string) => {
    setState(prev => {
      const index = prev.widgets.findIndex(w => w.id === widgetId);
      if (index === -1 || index >= prev.widgets.length - 1) return prev; // Already at bottom or not found

      const newWidgets = [...prev.widgets];
      [newWidgets[index], newWidgets[index + 1]] = [
        newWidgets[index + 1],
        newWidgets[index],
      ];

      // Update order property
      newWidgets.forEach((widget, idx) => {
        widget.order = idx;
      });

      return {
        ...prev,
        activeLayoutId: "custom",
        widgets: newWidgets,
      };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    // Reset on server
    resetMutation.mutate();

    // Reset local state immediately (optimistic update)
    setState({
      activeLayoutId: DEFAULT_LAYOUT_ID,
      widgets: LAYOUT_PRESETS[DEFAULT_LAYOUT_ID].widgets,
      isCustomizing: false,
    });
  }, [resetMutation]);

  const setIsCustomizing = useCallback((isCustomizing: boolean) => {
    setState(prev => ({ ...prev, isCustomizing }));
  }, []);

  const value: DashboardPreferencesContextType = useMemo(
    () => ({
      ...state,
      setActiveLayout,
      toggleWidgetVisibility,
      reorderWidgets,
      moveWidgetUp,
      moveWidgetDown,
      resetToDefault,
      setIsCustomizing,
      isSyncing,
      isLoading,
    }),
    [
      state,
      setActiveLayout,
      toggleWidgetVisibility,
      reorderWidgets,
      moveWidgetUp,
      moveWidgetDown,
      resetToDefault,
      setIsCustomizing,
      isSyncing,
      isLoading,
    ]
  );

  return (
    <DashboardPreferencesContext.Provider value={value}>
      {children}
    </DashboardPreferencesContext.Provider>
  );
}

export function useDashboardPreferences() {
  const context = useContext(DashboardPreferencesContext);
  if (!context) {
    throw new Error(
      "useDashboardPreferences must be used within DashboardPreferencesProvider"
    );
  }
  return context;
}
