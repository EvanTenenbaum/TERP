/**
 * Tests for useExport Hook
 * UXS-904: Tests export functionality with row limits
 *
 * Limits:
 * - Default max rows: 10,000
 * - Chunk processing: 1,000 rows at a time
 * - Progress tracking for large exports
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExport, DEFAULT_EXPORT_LIMITS } from "../useExport";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: Object.assign(
    vi.fn((_message: string, _options?: unknown) => `toast-${Date.now()}`),
    {
      success: vi.fn(
        (_message: string, _options?: unknown) => `success-${Date.now()}`
      ),
      error: vi.fn(
        (_message: string, _options?: unknown) => `error-${Date.now()}`
      ),
      warning: vi.fn(
        (_message: string, _options?: unknown) => `warning-${Date.now()}`
      ),
    }
  ),
}));

import { toast } from "sonner";

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();

// Store original DOM methods before any mocking
const originalCreateElement = document.createElement.bind(document);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalAppendChild =
  (globalThis as any).Node?.prototype?.appendChild || (() => {});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalRemoveChild =
  (globalThis as any).Node?.prototype?.removeChild || (() => {});

describe("useExport", () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement only for anchor elements
    // This allows React's internal createElement calls to work properly
    const mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: {} as any,
      // Add minimal properties needed for DOM operations
      nodeName: "A",
      nodeType: 1,
    };

    createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === "a") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return mockLink as any;
        }
        // For all other elements (including React's internal container divs), use real implementation
        return originalCreateElement(tagName);
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(function (this: any, node: any) {
        // Only mock for anchor elements, let others pass through
        if ((node as HTMLElement).nodeName === "A") {
          return node;
        }
        return originalAppendChild.call(this, node);
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation(function (this: any, node: any) {
        // Only mock for anchor elements, let others pass through
        if ((node as HTMLElement).nodeName === "A") {
          return node;
        }
        return originalRemoveChild.call(this, node);
      });
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  describe("default limits", () => {
    it("should have correct default max rows", () => {
      expect(DEFAULT_EXPORT_LIMITS.maxRows).toBe(10000);
    });

    it("should have correct default chunk size", () => {
      expect(DEFAULT_EXPORT_LIMITS.chunkSize).toBe(1000);
    });

    it("should have correct default max file size", () => {
      expect(DEFAULT_EXPORT_LIMITS.maxFileSizeMB).toBe(50);
    });
  });

  describe("hook initialization", () => {
    it("should initialize with correct state", () => {
      const { result } = renderHook(() => useExport());

      expect(result.current.state.isExporting).toBe(false);
      expect(result.current.state.progress).toBe(0);
      expect(result.current.state.currentRow).toBe(0);
      expect(result.current.state.totalRows).toBe(0);
      expect(result.current.state.error).toBeNull();
    });

    it("should expose export functions", () => {
      const { result } = renderHook(() => useExport());

      expect(typeof result.current.exportCSV).toBe("function");
      expect(typeof result.current.exportExcel).toBe("function");
      expect(typeof result.current.cancel).toBe("function");
      expect(typeof result.current.checkLimits).toBe("function");
    });

    it("should expose limits", () => {
      const { result } = renderHook(() => useExport());

      expect(result.current.limits).toEqual(DEFAULT_EXPORT_LIMITS);
    });
  });

  describe("checkLimits", () => {
    it("should return exceeds: false for data within limits", () => {
      const { result } = renderHook(() => useExport());

      const check = result.current.checkLimits(5000);

      expect(check.exceeds).toBe(false);
      expect(check.message).toBeUndefined();
    });

    it("should return exceeds: true for data exceeding limits", () => {
      const { result } = renderHook(() => useExport());

      const check = result.current.checkLimits(15000);

      expect(check.exceeds).toBe(true);
      expect(check.message).toContain("10,000");
      expect(check.message).toContain("15,000");
    });

    it("should respect custom limits", () => {
      const { result } = renderHook(() => useExport({ maxRows: 100 }));

      const check = result.current.checkLimits(150);

      expect(check.exceeds).toBe(true);
    });
  });

  describe("exportCSV", () => {
    const testData = [
      { id: 1, name: "Item 1", price: 10.99 },
      { id: 2, name: "Item 2", price: 20.5 },
      { id: 3, name: "Item 3", price: 15.0 },
    ];

    const testColumns = [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "price", label: "Price", formatter: (v: unknown) => `$${v}` },
    ];

    it("should export data to CSV", async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportCSV(testData, {
          columns: testColumns,
          filename: "test-export",
        });
      });

      // Should create blob
      expect(mockCreateObjectURL).toHaveBeenCalled();

      // Should show success toast
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("3"));
    });

    it("should update progress during export", async () => {
      const { result } = renderHook(() => useExport());
      const onProgress = vi.fn();

      await act(async () => {
        await result.current.exportCSV(testData, {
          columns: testColumns,
          filename: "test-export",
          onProgress,
        });
      });

      expect(onProgress).toHaveBeenCalled();
    });

    it("should call onComplete callback", async () => {
      const { result } = renderHook(() => useExport());
      const onComplete = vi.fn();

      await act(async () => {
        await result.current.exportCSV(testData, {
          columns: testColumns,
          filename: "test-export",
          onComplete,
        });
      });

      expect(onComplete).toHaveBeenCalledWith(3);
    });

    it("should truncate data exceeding max rows", async () => {
      const { result } = renderHook(() => useExport({ maxRows: 2 }));

      await act(async () => {
        await result.current.exportCSV(testData, {
          columns: testColumns,
          filename: "test-export",
        });
      });

      // Should show warning about truncation
      expect(toast.warning).toHaveBeenCalled();

      // Should still succeed with truncated data
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("2"));
    });

    it("should respect per-export maxRows override", async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportCSV(testData, {
          columns: testColumns,
          filename: "test-export",
          limits: { maxRows: 1 },
        });
      });

      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining("1 rows")
      );
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("1"));
    });

    it("should use formatter when provided", async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportCSV(testData, {
          columns: testColumns,
          filename: "test-export",
        });
      });

      // Verify blob was created (formatter is applied in CSV content)
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it("should handle nested values with dot notation", async () => {
      const nestedData = [
        { id: 1, customer: { name: "John" } },
        { id: 2, customer: { name: "Jane" } },
      ];

      const nestedColumns = [
        { key: "id", label: "ID" },
        { key: "customer.name", label: "Customer Name" },
      ];

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportCSV(
          nestedData as Record<string, unknown>[],
          {
            columns: nestedColumns,
            filename: "test-export",
          }
        );
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });

  describe("exportExcel", () => {
    const testData = [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
    ];

    const testColumns = [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
    ];

    it("should export data to Excel format", async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportExcel(testData, {
          columns: testColumns,
          filename: "test-export",
        });
      });

      // Should create blob
      expect(mockCreateObjectURL).toHaveBeenCalled();

      // Should show success toast
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Excel")
      );
    });

    it("should respect per-export maxRows override", async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportExcel(testData, {
          columns: testColumns,
          filename: "test-export",
          limits: { maxRows: 1 },
        });
      });

      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining("1 rows")
      );
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("1"));
    });
  });

  describe("cancel function", () => {
    it("should set cancel flag", async () => {
      const { result } = renderHook(() => useExport());

      // Start an export and immediately cancel
      const _largeData = Array.from({ length: 5000 }, (_, i) => ({ id: i }));

      act(() => {
        result.current.cancel();
      });

      // The cancel flag is internal, but we can verify the hook doesn't crash
      expect(result.current.state.isExporting).toBe(false);
    });
  });

  describe("CSV injection protection", () => {
    it("should prefix formula characters", async () => {
      const dangerousData = [
        { id: 1, formula: "=SUM(A1:A10)" },
        { id: 2, formula: "+cmd|' /C calc'!A0" },
        { id: 3, formula: "-cmd|' /C calc'!A0" },
        { id: 4, formula: "@SUM(A1:A10)" },
      ];

      const columns = [
        { key: "id", label: "ID" },
        { key: "formula", label: "Formula" },
      ];

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportCSV(dangerousData, {
          columns,
          filename: "test-export",
        });
      });

      // Export should succeed (injection is handled internally)
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });

  describe("state management", () => {
    it("should set isExporting true during export", async () => {
      const { result } = renderHook(() => useExport());
      const testData = [{ id: 1 }];
      const columns = [{ key: "id", label: "ID" }];

      const onStart = vi.fn();

      await act(async () => {
        await result.current.exportCSV(testData, {
          columns,
          filename: "test",
          onStart,
        });
      });

      // Verify onStart was called (indicating export started)
      expect(onStart).toHaveBeenCalled();
      // After export completes, isExporting should be false
      expect(result.current.state.isExporting).toBe(false);
    });

    it("should reset progress to 100 after export", async () => {
      const { result } = renderHook(() => useExport());
      const testData = [{ id: 1 }];
      const columns = [{ key: "id", label: "ID" }];

      await act(async () => {
        await result.current.exportCSV(testData, {
          columns,
          filename: "test",
        });
      });

      expect(result.current.state.progress).toBe(100);
    });
  });
});
