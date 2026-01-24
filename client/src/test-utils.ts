/**
 * Test utilities for TERP client tests
 *
 * These are stub implementations for test setup helpers.
 * Tests that use these mocks are setting up their own vi.mock() calls.
 */

import { vi } from "vitest";

/**
 * Setup database mock - called by tests that need DB layer mocking.
 * The actual mocking is typically done via vi.mock('@/lib/trpc')
 */
export function setupDbMock() {
  // No-op - mocking is handled by individual test files
}

/**
 * Setup permission mock - called by tests that need permission checking
 * The actual mocking is typically done via vi.mock('@/lib/trpc')
 */
export function setupPermissionMock() {
  // No-op - mocking is handled by individual test files
}

/**
 * Mock invalidate function for tRPC utils
 */
export const mockInvalidate = vi.fn();
