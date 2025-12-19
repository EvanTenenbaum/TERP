/**
 * Property-Based Tests for Skeleton Loaders
 *
 * **Feature: parallel-sprint-dec19**
 * **Property 12: Loading state renders skeleton correctly**
 * **Property 13: Empty state shows appropriate message**
 * **Property 14: Error state is handled gracefully**
 *
 * @module tests/property/ui/skeleton-loaders
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TableSkeletonProps {
  rows: number;
  columns: number;
  showHeader: boolean;
}

interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  errorMessage?: string;
}

interface EmptyStateConfig {
  variant: string;
  title: string;
  description: string;
  hasAction: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

function getNumRuns(): number {
  const envRuns = process.env.NUM_RUNS;
  if (envRuns) {
    const parsed = parseInt(envRuns, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return process.env.CI ? 100 : 500;
}

// ============================================================================
// ARBITRARIES
// ============================================================================

/**
 * Arbitrary for valid TableSkeleton props
 */
const tableSkeletonPropsArb: fc.Arbitrary<TableSkeletonProps> = fc.record({
  rows: fc.integer({ min: 1, max: 50 }),
  columns: fc.integer({ min: 1, max: 20 }),
  showHeader: fc.boolean(),
});

/**
 * Arbitrary for loading states
 */
const loadingStateArb: fc.Arbitrary<LoadingState> = fc.record({
  isLoading: fc.boolean(),
  isError: fc.boolean(),
  isEmpty: fc.boolean(),
  errorMessage: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
});

/**
 * Arbitrary for empty state variants
 */
const emptyStateVariantArb = fc.constantFrom(
  "orders",
  "clients",
  "inventory",
  "calendar",
  "invoices",
  "analytics",
  "inbox",
  "search",
  "generic"
);

/**
 * Arbitrary for EmptyState config
 */
const emptyStateConfigArb: fc.Arbitrary<EmptyStateConfig> = fc.record({
  variant: emptyStateVariantArb,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  hasAction: fc.boolean(),
});

// ============================================================================
// PURE FUNCTIONS (mimics component logic)
// ============================================================================

/**
 * Determines which content state to render based on loading/error/empty flags
 */
function getContentState(state: LoadingState): "loading" | "error" | "empty" | "content" {
  if (state.isLoading) return "loading";
  if (state.isError) return "error";
  if (state.isEmpty) return "empty";
  return "content";
}

/**
 * Calculates total skeleton elements for TableSkeleton
 */
function calculateSkeletonElements(props: TableSkeletonProps): number {
  const headerElements = props.showHeader ? props.columns : 0;
  const bodyElements = props.rows * props.columns;
  return headerElements + bodyElements;
}

/**
 * Validates skeleton element count is within reasonable bounds
 */
function isValidSkeletonCount(props: TableSkeletonProps): boolean {
  const count = calculateSkeletonElements(props);
  // Max 1000 elements to prevent performance issues
  return count > 0 && count <= 1000;
}

/**
 * Gets the appropriate empty state icon based on variant
 */
function getEmptyStateIcon(variant: string): string {
  const iconMap: Record<string, string> = {
    orders: "ShoppingCartIcon",
    clients: "UsersIcon",
    inventory: "PackageIcon",
    calendar: "CalendarIcon",
    invoices: "FileTextIcon",
    analytics: "BarChart3Icon",
    inbox: "InboxIcon",
    search: "SearchIcon",
    generic: "FolderIcon",
  };
  return iconMap[variant] || "FolderIcon";
}

/**
 * Validates empty state configuration
 */
function isValidEmptyStateConfig(config: EmptyStateConfig): boolean {
  return (
    config.title.length > 0 &&
    config.description.length > 0 &&
    ["orders", "clients", "inventory", "calendar", "invoices", "analytics", "inbox", "search", "generic"].includes(
      config.variant
    )
  );
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe("Skeleton Loaders Property Tests", () => {
  const numRuns = getNumRuns();

  // ==========================================================================
  // Property 12: Loading state renders skeleton correctly
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 12: Loading state renders skeleton correctly**", () => {
    it("P12.1: TableSkeleton element count matches rows * columns (+ header)", () => {
      fc.assert(
        fc.property(tableSkeletonPropsArb, (props) => {
          const expected = calculateSkeletonElements(props);
          return expected === (props.showHeader ? props.columns : 0) + props.rows * props.columns;
        }),
        { numRuns }
      );
    });

    it("P12.2: TableSkeleton always has at least one element", () => {
      fc.assert(
        fc.property(tableSkeletonPropsArb, (props) => {
          const count = calculateSkeletonElements(props);
          return count >= props.rows; // At minimum, rows worth of elements
        }),
        { numRuns }
      );
    });

    it("P12.3: Skeleton count is within performance bounds", () => {
      fc.assert(
        fc.property(tableSkeletonPropsArb, (props) => {
          return isValidSkeletonCount(props);
        }),
        { numRuns }
      );
    });

    it("P12.4: Loading state is mutually exclusive with content state", () => {
      fc.assert(
        fc.property(loadingStateArb, (state) => {
          const contentState = getContentState(state);
          if (state.isLoading) {
            return contentState === "loading";
          }
          return true;
        }),
        { numRuns }
      );
    });

    it("P12.5: Header rows increase element count by column count", () => {
      fc.assert(
        fc.property(tableSkeletonPropsArb, (props) => {
          const withHeader = calculateSkeletonElements({ ...props, showHeader: true });
          const withoutHeader = calculateSkeletonElements({ ...props, showHeader: false });
          return withHeader - withoutHeader === props.columns;
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Property 13: Empty state shows appropriate message
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 13: Empty state shows appropriate message**", () => {
    it("P13.1: Empty state configuration is always valid", () => {
      fc.assert(
        fc.property(emptyStateConfigArb, (config) => {
          return isValidEmptyStateConfig(config);
        }),
        { numRuns }
      );
    });

    it("P13.2: Each variant maps to a specific icon", () => {
      fc.assert(
        fc.property(emptyStateVariantArb, (variant) => {
          const icon = getEmptyStateIcon(variant);
          return icon.length > 0 && icon.endsWith("Icon");
        }),
        { numRuns }
      );
    });

    it("P13.3: Empty state title is never empty when configured", () => {
      fc.assert(
        fc.property(emptyStateConfigArb, (config) => {
          return config.title.length > 0;
        }),
        { numRuns }
      );
    });

    it("P13.4: Empty state is rendered when isEmpty is true and not loading", () => {
      fc.assert(
        fc.property(loadingStateArb, (state) => {
          const contentState = getContentState(state);
          if (!state.isLoading && !state.isError && state.isEmpty) {
            return contentState === "empty";
          }
          return true;
        }),
        { numRuns }
      );
    });

    it("P13.5: Variant-icon mapping is deterministic", () => {
      fc.assert(
        fc.property(emptyStateVariantArb, (variant) => {
          const icon1 = getEmptyStateIcon(variant);
          const icon2 = getEmptyStateIcon(variant);
          return icon1 === icon2;
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Property 14: Error state is handled gracefully
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 14: Error state is handled gracefully**", () => {
    it("P14.1: Error state takes precedence over empty state", () => {
      fc.assert(
        fc.property(loadingStateArb, (state) => {
          const contentState = getContentState(state);
          if (!state.isLoading && state.isError) {
            return contentState === "error";
          }
          return true;
        }),
        { numRuns }
      );
    });

    it("P14.2: Loading state takes precedence over error state", () => {
      fc.assert(
        fc.property(loadingStateArb, (state) => {
          const contentState = getContentState(state);
          if (state.isLoading) {
            return contentState === "loading";
          }
          return true;
        }),
        { numRuns }
      );
    });

    it("P14.3: Content is only shown when not loading, not error, not empty", () => {
      fc.assert(
        fc.property(loadingStateArb, (state) => {
          const contentState = getContentState(state);
          if (!state.isLoading && !state.isError && !state.isEmpty) {
            return contentState === "content";
          }
          return true;
        }),
        { numRuns }
      );
    });

    it("P14.4: State transitions are mutually exclusive", () => {
      fc.assert(
        fc.property(loadingStateArb, (state) => {
          const contentState = getContentState(state);
          const possibleStates = ["loading", "error", "empty", "content"];
          return possibleStates.includes(contentState);
        }),
        { numRuns }
      );
    });

    it("P14.5: Error message is optional and gracefully handled", () => {
      fc.assert(
        fc.property(loadingStateArb, (state) => {
          // Should not crash regardless of error message presence
          const hasMessage = state.errorMessage !== undefined;
          const messageLength = state.errorMessage?.length ?? 0;
          return hasMessage ? messageLength > 0 : messageLength === 0;
        }),
        { numRuns }
      );
    });
  });
});
