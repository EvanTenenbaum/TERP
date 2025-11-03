import { useState, useCallback } from 'react';
import type { WidgetExpandMode } from '@/types/dashboard';

interface UseWidgetStateOptions {
  defaultExpanded?: boolean;
  expandMode?: WidgetExpandMode;
}

export function useWidgetState(
  widgetId: string,
  options: UseWidgetStateOptions = {}
) {
  const { defaultExpanded = false, expandMode = 'modal' } = options;

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return {
    isExpanded,
    expandMode,
    toggleExpand,
    expand,
    collapse,
    setIsExpanded,
  };
}
