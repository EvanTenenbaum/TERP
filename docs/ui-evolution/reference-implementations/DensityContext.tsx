/**
 * DensityContext — UI Density preference management
 * Part of TERP UI Evolution Part B
 *
 * Provides "comfortable" (default) and "compact" density modes.
 * Persists preference in localStorage.
 * Applies CSS class to document root for CSS variable cascade.
 *
 * Pattern mirrors the existing ThemeContext.tsx in the TERP codebase.
 *
 * IMPORTANT: This context should only be active when the "ui-density-toggle"
 * feature flag is enabled. The DensityProvider always mounts (so the CSS
 * variable defaults are available), but the toggle UI in AppHeader should
 * only render when isEnabled("ui-density-toggle") returns true.
 *
 * Usage:
 * ```tsx
 * // In App.tsx, wrap alongside ThemeProvider:
 * <DensityProvider defaultDensity="comfortable">
 *   <App />
 * </DensityProvider>
 *
 * // In any component:
 * const { density, toggleDensity, isCompact } = useDensity();
 * ```
 */
import React, { createContext, useContext, useEffect, useState } from "react";

export type Density = "comfortable" | "compact";

interface DensityContextValue {
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
  isCompact: boolean;
}

const STORAGE_KEY = "terp-density-preference";
const CSS_CLASS = "density-compact";

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

interface DensityProviderProps {
  children: React.ReactNode;
  defaultDensity?: Density;
}

export function DensityProvider({
  children,
  defaultDensity = "comfortable",
}: DensityProviderProps) {
  const [density, setDensityState] = useState<Density>(() => {
    if (typeof window === "undefined") return defaultDensity;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "comfortable" || stored === "compact") return stored;
    return defaultDensity;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (density === "compact") {
      root.classList.add(CSS_CLASS);
    } else {
      root.classList.remove(CSS_CLASS);
    }
  }, [density]);

  const setDensity = (newDensity: Density) => {
    setDensityState(newDensity);
    localStorage.setItem(STORAGE_KEY, newDensity);
  };

  const toggleDensity = () => {
    setDensity(density === "comfortable" ? "compact" : "comfortable");
  };

  return (
    <DensityContext.Provider
      value={{
        density,
        setDensity,
        toggleDensity,
        isCompact: density === "compact",
      }}
    >
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity(): DensityContextValue {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error("useDensity must be used within a DensityProvider");
  }
  return context;
}
