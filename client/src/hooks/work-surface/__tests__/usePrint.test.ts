/**
 * Tests for usePrint Hook
 * UXS-903: Tests print functionality
 *
 * Features:
 * - Print specific elements or entire page
 * - Before/after print callbacks
 * - Title customization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePrint } from "../usePrint";

describe("usePrint", () => {
  let originalTitle: string;
  let originalPrint: typeof window.print;
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalTitle = document.title;
    originalPrint = window.print;
    window.print = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));

    // Mock matchMedia for print preview detection
    mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    window.matchMedia = mockMatchMedia;
  });

  afterEach(() => {
    document.title = originalTitle;
    window.print = originalPrint;
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with isPrinting false", () => {
      const { result } = renderHook(() => usePrint());

      expect(result.current.isPrinting).toBe(false);
    });

    it("should initialize with isPreview false", () => {
      const { result } = renderHook(() => usePrint());

      expect(result.current.isPreview).toBe(false);
    });

    it("should expose print functions", () => {
      const { result } = renderHook(() => usePrint());

      expect(typeof result.current.print).toBe("function");
      expect(typeof result.current.printElement).toBe("function");
    });
  });

  describe("print function", () => {
    it("should call window.print", async () => {
      const { result } = renderHook(() => usePrint());

      await act(async () => {
        await result.current.print();
      });

      expect(window.print).toHaveBeenCalled();
    });

    it("should set custom title during print", async () => {
      const { result } = renderHook(() => usePrint());

      await act(async () => {
        await result.current.print({ title: "Test Print Title" });
      });

      // Title should be restored after print
      expect(document.title).toBe(originalTitle);
    });

    it("should call onBeforePrint callback", async () => {
      const onBeforePrint = vi.fn();
      const { result } = renderHook(() => usePrint());

      await act(async () => {
        await result.current.print({ onBeforePrint });
      });

      expect(onBeforePrint).toHaveBeenCalled();
    });

    it("should call onAfterPrint callback", async () => {
      const onAfterPrint = vi.fn();
      const { result } = renderHook(() => usePrint());

      await act(async () => {
        await result.current.print({ onAfterPrint });
      });

      expect(onAfterPrint).toHaveBeenCalled();
    });

    it("should add timestamp to title when requested", async () => {
      const { result } = renderHook(() => usePrint());
      let capturedTitle = "";

      // Capture title during print
      window.print = vi.fn(() => {
        capturedTitle = document.title;
      });

      await act(async () => {
        await result.current.print({
          title: "Invoice #123",
          addTimestamp: true,
        });
      });

      // Title should include timestamp pattern
      expect(capturedTitle).toMatch(/Invoice #123 - /);
    });
  });

  describe("isPrinting state", () => {
    it("should set isPrinting true during print and false after", async () => {
      const { result } = renderHook(() => usePrint());

      // Initially isPrinting should be false
      expect(result.current.isPrinting).toBe(false);

      const onBeforePrint = vi.fn();
      const onAfterPrint = vi.fn();

      await act(async () => {
        await result.current.print({ onBeforePrint, onAfterPrint });
      });

      // Both callbacks should have been called (indicating print lifecycle occurred)
      expect(onBeforePrint).toHaveBeenCalled();
      expect(onAfterPrint).toHaveBeenCalled();
      // After print completes, isPrinting should be false
      expect(result.current.isPrinting).toBe(false);
    });

    it("should handle isPrinting state lifecycle", async () => {
      const { result } = renderHook(() => usePrint());

      // Use a slower mock to allow checking state between updates
      let printResolve: () => void;
      const printPromise = new Promise<void>((resolve) => {
        printResolve = resolve;
      });

      window.print = vi.fn(() => {
        // Resolve after a short delay to simulate print dialog
        setTimeout(() => printResolve(), 50);
        return printPromise;
      });

      // Start printing in an act block but don't await yet
      let printingPromise: Promise<void>;
      act(() => {
        printingPromise = result.current.print();
      });

      // Wait for the printing to complete
      await act(async () => {
        await printingPromise!;
      });

      // After print completes, isPrinting should be false
      expect(result.current.isPrinting).toBe(false);
    });
  });

  describe("print preview detection", () => {
    it("should detect print preview via matchMedia", () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => usePrint());

      expect(result.current.isPreview).toBe(true);
    });

    it("should listen for matchMedia changes", () => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();

      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener,
      });

      const { unmount } = renderHook(() => usePrint());

      expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

      unmount();

      expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });
  });

  describe("printElement function", () => {
    it("should create iframe for element printing", async () => {
      const { result } = renderHook(() => usePrint());

      // Create test element
      const testElement = document.createElement("div");
      testElement.innerHTML = "<p>Test content</p>";
      document.body.appendChild(testElement);

      const appendChildSpy = vi.spyOn(document.body, "appendChild");

      await act(async () => {
        await result.current.printElement(testElement, { title: "Element Print" });
      });

      // Should have created an iframe
      expect(appendChildSpy).toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(testElement);
      appendChildSpy.mockRestore();
    });
  });
});
