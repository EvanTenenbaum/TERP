import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import type { DashboardLayout, WidgetState } from '@/types/dashboard';
import { LAYOUT_PRESETS, DEFAULT_LAYOUT_ID } from '@/lib/constants/dashboardPresets';

interface DashboardPreferencesState {
  activeLayoutId: string;
  widgets: WidgetState[];
  isCustomizing: boolean;
}

interface DashboardPreferencesActions {
  setActiveLayout: (layoutId: string) => void;
  toggleWidgetVisibility: (widgetId: string) => void;
  reorderWidgets: (newOrder: string[]) => void;
  resetToDefault: () => void;
  setIsCustomizing: (isCustomizing: boolean) => void;
}

type DashboardPreferencesContextType = DashboardPreferencesState & DashboardPreferencesActions;

const DashboardPreferencesContext = createContext<DashboardPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'terp-dashboard-preferences';

function loadPreferences(): DashboardPreferencesState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load dashboard preferences:', error);
  }
  
  // Return default
  return {
    activeLayoutId: DEFAULT_LAYOUT_ID,
    widgets: LAYOUT_PRESETS[DEFAULT_LAYOUT_ID].widgets,
    isCustomizing: false,
  };
}

function savePreferences(state: DashboardPreferencesState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save dashboard preferences:', error);
  }
}

export function DashboardPreferencesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardPreferencesState>(loadPreferences);

  // Save to localStorage whenever state changes
  useEffect(() => {
    savePreferences(state);
  }, [state]);

  const setActiveLayout = useCallback((layoutId: string) => {
    const preset = LAYOUT_PRESETS[layoutId];
    if (preset) {
      setState((prev) => ({
        ...prev,
        activeLayoutId: layoutId,
        widgets: preset.widgets,
      }));
    }
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    setState((prev) => {
      const newWidgets = prev.widgets.map((widget) =>
        widget.id === widgetId
          ? { ...widget, isVisible: !widget.isVisible }
          : widget
      );
      
      // If we're modifying a preset, switch to custom
      const newLayoutId = 'custom';
      
      return {
        ...prev,
        activeLayoutId: newLayoutId,
        widgets: newWidgets,
      };
    });
  }, []);

  const reorderWidgets = useCallback((newOrder: string[]) => {
    setState((prev) => {
      const widgetMap = new Map(prev.widgets.map((w) => [w.id, w]));
      const newWidgets = newOrder.map((id) => widgetMap.get(id)!).filter(Boolean);
      
      return {
        ...prev,
        activeLayoutId: 'custom',
        widgets: newWidgets,
      };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setState({
      activeLayoutId: DEFAULT_LAYOUT_ID,
      widgets: LAYOUT_PRESETS[DEFAULT_LAYOUT_ID].widgets,
      isCustomizing: false,
    });
  }, []);

  const setIsCustomizing = useCallback((isCustomizing: boolean) => {
    setState((prev) => ({ ...prev, isCustomizing }));
  }, []);

  const value: DashboardPreferencesContextType = useMemo(() => ({
    ...state,
    setActiveLayout,
    toggleWidgetVisibility,
    reorderWidgets,
    resetToDefault,
    setIsCustomizing,
  }), [state, setActiveLayout, toggleWidgetVisibility, reorderWidgets, resetToDefault, setIsCustomizing]);

  return (
    <DashboardPreferencesContext.Provider value={value}>
      {children}
    </DashboardPreferencesContext.Provider>
  );
}

export function useDashboardPreferences() {
  const context = useContext(DashboardPreferencesContext);
  if (!context) {
    throw new Error('useDashboardPreferences must be used within DashboardPreferencesProvider');
  }
  return context;
}
