import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";

interface UseQueryTabStateOptions<T extends string> {
  defaultTab: T;
  validTabs: readonly T[];
}

export function useQueryTabState<T extends string>({
  defaultTab,
  validTabs,
}: UseQueryTabStateOptions<T>) {
  const [location, setLocation] = useLocation();
  const search = useSearch();

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");

    if (tab && validTabs.includes(tab as T)) {
      return tab as T;
    }

    return defaultTab;
  }, [defaultTab, search, validTabs]);

  const setActiveTab = useCallback(
    (nextTab: T) => {
      const params = new URLSearchParams(search);
      if (nextTab === defaultTab) {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }

      const nextSearch = params.toString();
      setLocation(`${location}${nextSearch ? `?${nextSearch}` : ""}`);
    },
    [defaultTab, location, search, setLocation]
  );

  return { activeTab, setActiveTab };
}
