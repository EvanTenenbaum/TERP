'use client';
import React, {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  /**
   * Array of tabs to render
   */
  tabs: readonly TabItem[];
  /**
   * Controlled active tab id
   */
  activeId?: string;
  /**
   * Default active tab id (uncontrolled)
   */
  defaultActiveId?: string;
  /**
   * Called when active tab changes
   */
  onTabChange?: (id: string) => void;
  /**
   * ARIA label for the tablist container
   */
  ariaLabel?: string;
  /**
   * Optional className for the root container
   */
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  defaultActiveId,
  onTabChange,
  ariaLabel = 'Tabs',
  className,
}) => {
  const isControlled = activeId !== undefined;

  // Find first enabled tab id or fallback to first tab id
  const firstEnabledId = useMemo(() => {
    const enabled = tabs.find((t) => !t.disabled);
    return enabled ? enabled.id : tabs[0]?.id ?? '';
  }, [tabs]);

  const [internalActiveId, setInternalActiveId] = useState<string>(
    () => defaultActiveId && tabs.find((t) => t.id === defaultActiveId && !t.disabled)
      ? defaultActiveId
      : firstEnabledId
  );

  const currentActiveId = isControlled ? activeId! : internalActiveId;

  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus active tab on mount or activeId change
  useEffect(() => {
    const idx = tabs.findIndex((t) => t.id === currentActiveId);
    if (idx >= 0) {
      tabsRef.current[idx]?.focus();
    }
  }, [currentActiveId, tabs]);

  const changeActive = useCallback(
    (id: string) => {
      if (!tabs.find((t) => t.id === id && !t.disabled)) return;
      if (!isControlled) setInternalActiveId(id);
      onTabChange?.(id);
    },
    [isControlled, onTabChange, tabs]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const idx = tabs.findIndex((t) => t.id === currentActiveId);
      if (idx === -1) return;

      let nextIdx = idx;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          e.preventDefault();
          for (let i = 1; i <= tabs.length; i++) {
            const candidate = (idx + i) % tabs.length;
            if (!tabs[candidate].disabled) {
              nextIdx = candidate;
              break;
            }
          }
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          e.preventDefault();
          for (let i = 1; i <= tabs.length; i++) {
            const candidate = (idx - i + tabs.length) % tabs.length;
            if (!tabs[candidate].disabled) {
              nextIdx = candidate;
              break;
            }
          }
          break;
        }
        case 'Home': {
          e.preventDefault();
          nextIdx = tabs.findIndex((t) => !t.disabled);
          break;
        }
        case 'End': {
          e.preventDefault();
          for (let i = tabs.length - 1; i >= 0; i--) {
            if (!tabs[i].disabled) {
              nextIdx = i;
              break;
            }
          }
          break;
        }
        default:
          return;
      }
      if (nextIdx !== idx) {
        changeActive(tabs[nextIdx].id);
        tabsRef.current[nextIdx]?.focus();
      }
    },
    [changeActive, currentActiveId, tabs]
  );

  return (
    <div
      className={`flex flex-col w-full max-w-full ${className ?? ''}`}
      data-erpv3-tabs
      style={{
        backgroundColor: 'var(--c-bg)',
        color: 'var(--c-ink)',
      }}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className="flex border-b border-solid border-[var(--c-border)]"
      >
        {tabs.map(({ id, label, disabled }, i) => {
          const selected = id === currentActiveId;
          return (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`tabpanel-${id}`}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              ref={(el) => (tabsRef.current[i] = el)}
              onClick={() => !disabled && changeActive(id)}
              className={`
                min-h-[44px] min-w-[44px] px-4 flex items-center justify-center
                whitespace-nowrap
                border-b-2
                transition-colors duration-200
                outline-none
                ${
                  disabled
                    ? 'cursor-not-allowed text-[var(--c-mid)]'
                    : selected
                    ? 'border-[var(--c-brand)] text-[var(--c-brand)] font-semibold'
                    : 'border-transparent hover:text-[var(--c-brand)]'
                }
                focus-visible:ring-2 focus-visible:ring-[var(--c-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-bg)]
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
      {tabs.map(({ id, content }) => {
        const selected = id === currentActiveId;
        return (
          <section
            key={id}
            id={`tabpanel-${id}`}
            role="tabpanel"
            aria-labelledby={`tab-${id}`}
            hidden={!selected}
            tabIndex={0}
            className="
              p-4
              min-h-[88px]
              bg-[var(--c-panel)]
              text-[var(--c-ink)]
              focus:outline-none
              rounded-b-md
              select-text
            "
          >
            {selected && content}
          </section>
        );
      })}
    </div>
  );
};