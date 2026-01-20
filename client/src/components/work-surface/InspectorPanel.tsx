/**
 * InspectorPanel - Non-modal side panel for Work Surface detail editing
 * UXS-103: Implements the inspector panel pattern for Work Surfaces
 *
 * Features:
 * - Slide-over from right on desktop, bottom sheet on mobile
 * - Closes on Esc key
 * - Focus trap when open
 * - Does not block interaction with the main grid
 * - Responsive behavior based on viewport
 *
 * Usage:
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const [selectedItem, setSelectedItem] = useState(null);
 *
 * return (
 *   <div className="flex">
 *     <DataGrid onRowSelect={(row) => { setSelectedItem(row); setIsOpen(true); }} />
 *     <InspectorPanel
 *       isOpen={isOpen}
 *       onClose={() => setIsOpen(false)}
 *       title="Edit Item"
 *     >
 *       <ItemForm item={selectedItem} />
 *     </InspectorPanel>
 *   </div>
 * );
 * ```
 *
 * @see ATOMIC_UX_STRATEGY.md - Hybrid editing pattern
 * @see useWorkSurfaceKeyboard.ts - Esc integration
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  createContext,
  useContext,
} from "react";
import { X, ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================================================
// TYPES
// ============================================================================

export interface InspectorPanelProps {
  /** Whether the panel is open (defaults to true if not specified) */
  isOpen?: boolean;
  /** Called when panel should close */
  onClose: () => void;
  /** Panel title */
  title?: string;
  /** Panel subtitle (e.g., item name) */
  subtitle?: string;
  /** Panel content */
  children: React.ReactNode;
  /** Width on desktop (default: 400px) */
  width?: number | string;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Whether to enable focus trap */
  trapFocus?: boolean;
  /** Whether to close on Esc key */
  closeOnEsc?: boolean;
  /** Whether to close when clicking outside */
  closeOnClickOutside?: boolean;
  /** Custom class name */
  className?: string;
  /** Header actions (buttons, etc.) */
  headerActions?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Position on mobile */
  mobilePosition?: "bottom" | "right";
  /** Whether panel can be expanded to full width */
  expandable?: boolean;
  /** Whether panel starts expanded */
  defaultExpanded?: boolean;
  /** Called when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

interface InspectorPanelContextValue {
  isOpen: boolean;
  /** @deprecated Use isOpen instead - this is a no-op function for backward compatibility */
  open: (item?: unknown) => void;
  close: () => void;
  isExpanded: boolean;
  toggleExpanded: () => void;
}

const InspectorPanelContext = createContext<InspectorPanelContextValue | null>(
  null
);

export const useInspectorPanel = () => {
  const context = useContext(InspectorPanelContext);
  if (!context) {
    throw new Error(
      "useInspectorPanel must be used within an InspectorPanel"
    );
  }
  return context;
};

// ============================================================================
// FOCUS TRAP HOOK
// ============================================================================

function useFocusTrap(
  isActive: boolean,
  containerRef: React.RefObject<HTMLElement | null>
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Focus the first interactive element, or the close button
      const firstFocusable = focusableElements[0];
      setTimeout(() => firstFocusable.focus(), 0);
    }

    // Handle Tab key to trap focus
    // eslint-disable-next-line no-undef
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus when trap is deactivated
      if (
        previousActiveElement.current &&
        previousActiveElement.current instanceof HTMLElement
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, containerRef]);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InspectorPanel({
  isOpen = true,
  onClose,
  title,
  subtitle,
  children,
  width = 400,
  showCloseButton = true,
  trapFocus = true,
  closeOnEsc = true,
  closeOnClickOutside = false,
  className,
  headerActions,
  footer,
  mobilePosition = "right",
  expandable = false,
  defaultExpanded = false,
  onExpandedChange,
}: InspectorPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Focus trap
  useFocusTrap(isOpen && trapFocus, panelRef);

  // Handle Esc key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    // eslint-disable-next-line no-undef
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;

    const handleClick = (e: MouseEvent) => {
      // eslint-disable-next-line no-undef
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close on open click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, closeOnClickOutside, onClose]);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandedChange?.(newExpanded);
  }, [isExpanded, onExpandedChange]);

  // Context value
  const contextValue: InspectorPanelContextValue = {
    isOpen,
    open: () => {}, // No-op function for backward compatibility
    close: onClose,
    isExpanded,
    toggleExpanded,
  };

  // Calculate width
  const panelWidth = isExpanded
    ? "100%"
    : typeof width === "number"
      ? `${width}px`
      : width;

  // Mobile bottom sheet vs desktop side panel
  const isMobileBottom = isMobile && mobilePosition === "bottom";

  if (!isOpen) {
    return null;
  }

  return (
    <InspectorPanelContext.Provider value={contextValue}>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={closeOnClickOutside ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        role="complementary"
        aria-label={title || "Inspector panel"}
        className={cn(
          // Base styles
          "flex flex-col bg-white dark:bg-gray-900 shadow-xl z-50",
          // Desktop: side panel
          !isMobile && [
            "fixed top-0 right-0 h-full border-l border-gray-200 dark:border-gray-700",
            "transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "translate-x-full",
          ],
          // Mobile bottom sheet
          isMobileBottom && [
            "fixed bottom-0 left-0 right-0 max-h-[80vh] rounded-t-xl",
            "transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-y-0" : "translate-y-full",
          ],
          // Mobile side panel
          isMobile && !isMobileBottom && [
            "fixed top-0 right-0 h-full w-full max-w-[90vw]",
            "transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "translate-x-full",
          ],
          className
        )}
        style={{
          width: isMobile ? undefined : panelWidth,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="shrink-0 -ml-2"
                aria-label="Close panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {headerActions}
            {expandable && !isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                aria-label={isExpanded ? "Minimize panel" : "Expand panel"}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile drag handle */}
        {isMobileBottom && (
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {footer}
          </div>
        )}
      </div>
    </InspectorPanelContext.Provider>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface InspectorSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** @deprecated Use defaultCollapsed instead (note: inverted logic - defaultOpen=true means defaultCollapsed=false) */
  defaultOpen?: boolean;
}

export function InspectorSection({
  title,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false,
  defaultOpen,
}: InspectorSectionProps) {
  // defaultOpen takes precedence if specified (inverted logic)
  const initialCollapsed = defaultOpen !== undefined ? !defaultOpen : defaultCollapsed;
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div
          className={cn(
            "flex items-center justify-between",
            collapsible && "cursor-pointer"
          )}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        >
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </h3>
          {collapsible && (
            <ChevronLeft
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                isCollapsed ? "-rotate-90" : "rotate-0"
              )}
            />
          )}
        </div>
      )}
      {(!collapsible || !isCollapsed) && children}
    </div>
  );
}

interface InspectorFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function InspectorField({
  label,
  children,
  className,
  error,
  hint,
  required,
}: InspectorFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}

interface InspectorActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center" | "between";
}

export function InspectorActions({
  children,
  className,
  align = "right",
}: InspectorActionsProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        align === "left" && "justify-start",
        align === "right" && "justify-end",
        align === "center" && "justify-center",
        align === "between" && "justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}

export default InspectorPanel;
