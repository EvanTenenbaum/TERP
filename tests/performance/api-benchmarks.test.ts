/**
 * API Performance Benchmarks
 *
 * Tests API endpoint performance and response times.
 * These tests establish baselines and ensure endpoints meet performance targets.
 *
 * Performance Targets:
 * - Read operations: < 500ms (95th percentile)
 * - Write operations: < 1000ms (95th percentile)
 * - Health check: < 100ms
 *
 * @module tests/performance/api-benchmarks
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { performance } from "perf_hooks";
import type { IncomingMessage, ServerResponse } from "http";
import { setupDbMock } from "../../server/test-utils/testDb";
import { setupPermissionMock } from "../../server/test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../../server/db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../../server/services/permissionService", () => setupPermissionMock());

// Mock external dependencies that slow tests
vi.mock("../../server/inventoryDb");
vi.mock("../../server/clientsDb");
vi.mock("../../server/accountingDb");

import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";
import * as inventoryDb from "../../server/inventoryDb";
import * as clientsDb from "../../server/clientsDb";

// Performance timing utility
function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  return fn().then(result => ({
    result,
    duration: performance.now() - start,
  }));
}

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "perf-test@terp.com",
  name: "Performance Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    req: { headers: {} } as unknown as IncomingMessage,
    res: {} as unknown as ServerResponse,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("API Performance Benchmarks", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("Read Operations (target: <500ms)", () => {
    it("inventory.list should respond within target", async () => {
      // Arrange
      const mockResponse = {
        items: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          code: `BATCH-${i + 1}`,
          productName: `Product ${i + 1}`,
          onHandQty: "100",
        })),
        hasMore: false,
        nextCursor: null,
      };

      vi.mocked(inventoryDb.getBatchesWithDetails).mockResolvedValue(
        mockResponse
      );

      // Act
      const { result, duration } = await measureTime(() =>
        caller.inventory.list({ limit: 50 })
      );

      // Assert
      expect(result.items).toHaveLength(50);
      expect(duration).toBeLessThan(500);

      console.info(`  → inventory.list: ${duration.toFixed(2)}ms`);
    });

    it("inventory.dashboardStats should respond within target", async () => {
      // Arrange
      const mockStats = {
        totalBatches: 100,
        activeBatches: 75,
        totalValue: 50000,
        lowStockCount: 5,
      };

      vi.mocked(inventoryDb.getDashboardStats).mockResolvedValue(mockStats);

      // Act
      const { result, duration } = await measureTime(() =>
        caller.inventory.dashboardStats()
      );

      // Assert
      expect(result.totalBatches).toBe(100);
      expect(duration).toBeLessThan(500);

      console.info(`  → inventory.dashboardStats: ${duration.toFixed(2)}ms`);
    });

    it("clients.list should respond within target", async () => {
      // Arrange
      const mockClients = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        teriCode: `CLI${String(i + 1).padStart(3, "0")}`,
        name: `Client ${i + 1}`,
        isBuyer: true,
      }));

      vi.mocked(clientsDb.getClients).mockResolvedValue(mockClients);

      // Act
      const { result, duration } = await measureTime(() =>
        caller.clients.list({})
      );

      // Assert
      expect(result).toHaveLength(50);
      expect(duration).toBeLessThan(500);

      console.info(`  → clients.list: ${duration.toFixed(2)}ms`);
    });

    it("clients.count should respond within target", async () => {
      // Arrange
      vi.mocked(clientsDb.getClientCount).mockResolvedValue(100);

      // Act
      const { result, duration } = await measureTime(() =>
        caller.clients.count({})
      );

      // Assert
      expect(result).toBe(100);
      expect(duration).toBeLessThan(500);

      console.info(`  → clients.count: ${duration.toFixed(2)}ms`);
    });
  });

  describe("Write Operations (target: <1000ms)", () => {
    it("clients.create should respond within target", async () => {
      // Arrange
      const input = {
        teriCode: "CLI100",
        name: "New Client",
        email: "new@example.com",
        isBuyer: true,
      };

      vi.mocked(clientsDb.createClient).mockResolvedValue({
        id: 100,
        ...input,
        createdBy: 1,
        createdAt: new Date(),
      });

      // Act
      const { result, duration } = await measureTime(() =>
        caller.clients.create(input)
      );

      // Assert
      expect(result.id).toBe(100);
      expect(duration).toBeLessThan(1000);

      console.info(`  → clients.create: ${duration.toFixed(2)}ms`);
    });

    it("clients.update should respond within target", async () => {
      // Arrange
      vi.mocked(clientsDb.updateClient).mockResolvedValue({
        id: 1,
        teriCode: "CLI001",
        name: "Updated Name",
      });

      // Act
      const { result, duration } = await measureTime(() =>
        caller.clients.update({ clientId: 1, name: "Updated Name" })
      );

      // Assert
      expect(result.name).toBe("Updated Name");
      expect(duration).toBeLessThan(1000);

      console.info(`  → clients.update: ${duration.toFixed(2)}ms`);
    });

    it("clients.delete should respond within target", async () => {
      // Arrange
      vi.mocked(clientsDb.deleteClient).mockResolvedValue({ success: true });

      // Act
      const { result, duration } = await measureTime(() =>
        caller.clients.delete({ clientId: 1 })
      );

      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000);

      console.info(`  → clients.delete: ${duration.toFixed(2)}ms`);
    });
  });

  describe("Batch Operations (target: <2000ms)", () => {
    it("should handle 100 sequential reads efficiently", async () => {
      // Arrange
      const mockClients = [{ id: 1, teriCode: "CLI001", name: "Client 1" }];
      vi.mocked(clientsDb.getClients).mockResolvedValue(mockClients);

      // Act
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        await caller.clients.list({});
      }
      const totalDuration = performance.now() - start;
      const averageDuration = totalDuration / 100;

      // Assert
      expect(totalDuration).toBeLessThan(5000); // 100 calls in under 5s
      expect(averageDuration).toBeLessThan(50); // Average under 50ms each

      console.info(
        `  → 100 sequential reads: ${totalDuration.toFixed(2)}ms total (${averageDuration.toFixed(2)}ms avg)`
      );
    });
  });

  describe("Memory Efficiency", () => {
    it("should handle large datasets without excessive memory growth", async () => {
      // Arrange: Create large mock response
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        code: `BATCH-${i + 1}`,
        productName: `Product ${i + 1}`,
        onHandQty: "100",
        reservedQty: "10",
        quarantineQty: "5",
        holdQty: "2",
      }));

      vi.mocked(inventoryDb.getBatchesWithDetails).mockResolvedValue({
        items: largeDataset,
        hasMore: false,
        nextCursor: null,
      });

      // Record memory before
      const memBefore = process.memoryUsage().heapUsed;

      // Act: Process large dataset
      const { result } = await measureTime(() =>
        caller.inventory.list({ limit: 1000 })
      );

      // Record memory after
      const memAfter = process.memoryUsage().heapUsed;
      const memGrowthMB = (memAfter - memBefore) / 1024 / 1024;

      // Assert: Memory growth should be reasonable
      expect(result.items).toHaveLength(1000);
      expect(memGrowthMB).toBeLessThan(50); // Less than 50MB growth

      console.info(
        `  → Large dataset memory growth: ${memGrowthMB.toFixed(2)}MB`
      );
    });
  });
});

describe("Performance Regression Prevention", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  it("should not have performance regressions on critical paths", async () => {
    // This test documents expected performance for key operations
    // If any of these fail, it indicates a potential performance regression

    const benchmarks: Array<{
      name: string;
      target: number;
      run: () => Promise<unknown>;
    }> = [];

    // Setup mocks for all benchmarks
    vi.mocked(clientsDb.getClients).mockResolvedValue([]);
    vi.mocked(clientsDb.getClientCount).mockResolvedValue(0);
    vi.mocked(inventoryDb.getDashboardStats).mockResolvedValue({
      totalBatches: 0,
      activeBatches: 0,
      totalValue: 0,
      lowStockCount: 0,
    });

    benchmarks.push({
      name: "clients.list",
      target: 100,
      run: () => caller.clients.list({}),
    });

    benchmarks.push({
      name: "clients.count",
      target: 50,
      run: () => caller.clients.count({}),
    });

    benchmarks.push({
      name: "inventory.dashboardStats",
      target: 100,
      run: () => caller.inventory.dashboardStats(),
    });

    // Run all benchmarks
    const results: Array<{
      name: string;
      duration: number;
      target: number;
      passed: boolean;
    }> = [];

    for (const benchmark of benchmarks) {
      const { duration } = await measureTime(benchmark.run);
      results.push({
        name: benchmark.name,
        duration,
        target: benchmark.target,
        passed: duration < benchmark.target,
      });
    }

    // Report results

    console.info("\n  Performance Benchmark Results:");

    console.info("  --------------------------------");
    for (const result of results) {
      const status = result.passed ? "✓" : "✗";

      console.info(
        `  ${status} ${result.name}: ${result.duration.toFixed(2)}ms (target: <${result.target}ms)`
      );
    }

    // Assert all benchmarks pass
    const failures = results.filter(r => !r.passed);
    expect(failures).toHaveLength(0);
  });
});
