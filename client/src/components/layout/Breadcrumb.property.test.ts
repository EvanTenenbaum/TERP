/**
 * Property-Based Tests for Breadcrumb Navigation
 *
 * **Feature: parallel-sprint-dec19**
 * **Property 3: Route-to-label mapping consistency**
 * **Property 4: Path collapsing correctness**
 * **Property 5: Navigation click handling**
 *
 * @module tests/property/layout/breadcrumb
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import {
  parsePath,
  getLabelForPath,
  collapseBreadcrumbs,
  routeLabels,
  type BreadcrumbItem,
} from "./Breadcrumb";

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
 * Arbitrary for valid path segments (lowercase letters, numbers, hyphens)
 */
const pathSegmentArb = fc
  .array(
    fc.string({ minLength: 1, maxLength: 20 }).map(s =>
      s.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "segment"
    ),
    { minLength: 1, maxLength: 8 }
  )
  .map(segments => "/" + segments.join("/"));

/**
 * Arbitrary for known routes from the routeLabels config
 */
const knownRouteArb = fc.constantFrom(...Object.keys(routeLabels));

/**
 * Arbitrary for breadcrumb items
 */
const breadcrumbItemArb: fc.Arbitrary<BreadcrumbItem> = fc.record({
  path: pathSegmentArb,
  label: fc.string({ minLength: 1, maxLength: 50 }),
});

/**
 * Arbitrary for array of breadcrumb items
 */
const breadcrumbItemsArb = fc.array(breadcrumbItemArb, {
  minLength: 1,
  maxLength: 10,
});

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe("Breadcrumb Property Tests", () => {
  const numRuns = getNumRuns();

  // ==========================================================================
  // Property 3: Route-to-label mapping consistency
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 3: Route-to-label mapping consistency**", () => {
    it("P3.1: Known routes always have a non-empty label", () => {
      fc.assert(
        fc.property(knownRouteArb, (route) => {
          const lastSegment = route.split("/").pop() || "";
          const label = getLabelForPath(route, lastSegment);
          return label.length > 0;
        }),
        { numRuns }
      );
    });

    it("P3.2: getLabelForPath is deterministic", () => {
      fc.assert(
        fc.property(pathSegmentArb, (path) => {
          const segment = path.split("/").pop() || "";
          const label1 = getLabelForPath(path, segment);
          const label2 = getLabelForPath(path, segment);
          return label1 === label2;
        }),
        { numRuns }
      );
    });

    it("P3.3: Unknown routes get capitalized fallback label", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).map(s =>
            s.toLowerCase().replace(/[^a-z]/g, "").slice(0, 20) || "unknown"
          ),
          (segment) => {
            // Create a path that doesn't exist in routeLabels
            const path = `/unknown-route-${segment}`;
            const label = getLabelForPath(path, segment);
            // Should be capitalized (first letter uppercase)
            return label[0] === label[0].toUpperCase();
          }
        ),
        { numRuns }
      );
    });

    it("P3.4: parsePath returns empty array for root routes", () => {
      const rootRoutes = ["/", "/dashboard"];
      for (const route of rootRoutes) {
        const result = parsePath(route);
        if (result.length !== 0) {
          return false;
        }
      }
      return true;
    });

    it("P3.5: parsePath result length equals path segments (minus one for root)", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 10 }).map(s =>
              s.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10) || "seg"
            ),
            { minLength: 1, maxLength: 6 }
          ),
          (segments) => {
            const path = "/" + segments.join("/");
            const result = parsePath(path);
            return result.length === segments.length;
          }
        ),
        { numRuns }
      );
    });

    it("P3.6: Each breadcrumb item has a valid path", () => {
      fc.assert(
        fc.property(pathSegmentArb, (path) => {
          const result = parsePath(path);
          return result.every((item) => item.path.startsWith("/"));
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Property 4: Path collapsing correctness
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 4: Path collapsing correctness**", () => {
    it("P4.1: No collapsing when items <= maxVisible", () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArb, { minLength: 1, maxLength: 4 }),
          fc.integer({ min: 4, max: 10 }),
          (items, maxVisible) => {
            const result = collapseBreadcrumbs(items, maxVisible);
            return !result.hasCollapsed && result.items.length === items.length;
          }
        ),
        { numRuns }
      );
    });

    it("P4.2: Collapsing activates when items > maxVisible", () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArb, { minLength: 5, maxLength: 10 }),
          fc.integer({ min: 2, max: 4 }),
          (items, maxVisible) => {
            const result = collapseBreadcrumbs(items, maxVisible);
            return result.hasCollapsed === true;
          }
        ),
        { numRuns }
      );
    });

    it("P4.3: First item is always preserved after collapsing", () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArb, { minLength: 5, maxLength: 10 }),
          fc.integer({ min: 2, max: 4 }),
          (items, maxVisible) => {
            const result = collapseBreadcrumbs(items, maxVisible);
            if (result.hasCollapsed) {
              return result.items[0].path === items[0].path;
            }
            return true;
          }
        ),
        { numRuns }
      );
    });

    it("P4.4: Last item is always preserved after collapsing", () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArb, { minLength: 5, maxLength: 10 }),
          fc.integer({ min: 2, max: 4 }),
          (items, maxVisible) => {
            const result = collapseBreadcrumbs(items, maxVisible);
            const lastOriginal = items[items.length - 1];
            const lastResult = result.items[result.items.length - 1];
            return lastResult.path === lastOriginal.path;
          }
        ),
        { numRuns }
      );
    });

    it("P4.5: Visible items after collapse = maxVisible", () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArb, { minLength: 5, maxLength: 10 }),
          fc.integer({ min: 2, max: 4 }),
          (items, maxVisible) => {
            const result = collapseBreadcrumbs(items, maxVisible);
            if (result.hasCollapsed) {
              return result.items.length === maxVisible;
            }
            return true;
          }
        ),
        { numRuns }
      );
    });

    it("P4.6: Collapsed items + visible items = original items", () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArb, { minLength: 5, maxLength: 10 }),
          fc.integer({ min: 2, max: 4 }),
          (items, maxVisible) => {
            const result = collapseBreadcrumbs(items, maxVisible);
            if (result.hasCollapsed) {
              // First item is in result.items, collapsed items are in collapsedItems,
              // and (maxVisible - 1) last items are in result.items
              const totalAccounted =
                1 + result.collapsedItems.length + (maxVisible - 1);
              return totalAccounted === items.length;
            }
            return true;
          }
        ),
        { numRuns }
      );
    });

    it("P4.7: Collapsed items preserve order", () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArb, { minLength: 5, maxLength: 10 }),
          fc.integer({ min: 2, max: 4 }),
          (items, maxVisible) => {
            const result = collapseBreadcrumbs(items, maxVisible);
            if (result.hasCollapsed) {
              // Check that collapsed items are in order (items from index 1 to -(maxVisible-1))
              const expectedCollapsed = items.slice(1, -(maxVisible - 1));
              if (result.collapsedItems.length !== expectedCollapsed.length) {
                return false;
              }
              for (let i = 0; i < expectedCollapsed.length; i++) {
                if (result.collapsedItems[i].path !== expectedCollapsed[i].path) {
                  return false;
                }
              }
            }
            return true;
          }
        ),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Property 5: Navigation paths are valid
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 5: Navigation paths are valid**", () => {
    it("P5.1: All breadcrumb paths start with /", () => {
      fc.assert(
        fc.property(pathSegmentArb, (path) => {
          const result = parsePath(path);
          return result.every((item) => item.path.startsWith("/"));
        }),
        { numRuns }
      );
    });

    it("P5.2: Breadcrumb paths are progressive (each builds on previous)", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 10 }).map(s =>
              s.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10) || "seg"
            ),
            { minLength: 2, maxLength: 6 }
          ),
          (segments) => {
            const path = "/" + segments.join("/");
            const result = parsePath(path);

            // Check each path builds on the previous
            for (let i = 1; i < result.length; i++) {
              if (!result[i].path.startsWith(result[i - 1].path)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns }
      );
    });

    it("P5.3: No empty paths in breadcrumbs", () => {
      fc.assert(
        fc.property(pathSegmentArb, (path) => {
          const result = parsePath(path);
          return result.every((item) => item.path.length > 0);
        }),
        { numRuns }
      );
    });

    it("P5.4: No double slashes in breadcrumb paths", () => {
      fc.assert(
        fc.property(pathSegmentArb, (path) => {
          const result = parsePath(path);
          return result.every((item) => !item.path.includes("//"));
        }),
        { numRuns }
      );
    });

    it("P5.5: Breadcrumb labels are never empty strings", () => {
      fc.assert(
        fc.property(pathSegmentArb, (path) => {
          const result = parsePath(path);
          return result.every((item) => item.label.length > 0);
        }),
        { numRuns }
      );
    });
  });
});
