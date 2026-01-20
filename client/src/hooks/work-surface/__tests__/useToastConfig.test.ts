/**
 * Tests for useToastConfig Hook
 * UXS-902: Tests toast standardization behavior
 *
 * Toast Rules:
 * - Position: bottom-right
 * - Stacking: max 3 visible
 * - Duration: Success 3s, Info 4s, Warning 5s, Error persist
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useToastConfig,
  DEFAULT_TOAST_CONFIG,
  quickToast,
  formToast,
  crudToast,
  bulkToast,
} from "../useToastConfig";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: Object.assign(
    vi.fn((message: string, options?: unknown) => `toast-${Date.now()}`),
    {
      success: vi.fn((message: string, options?: unknown) => `success-${Date.now()}`),
      error: vi.fn((message: string, options?: unknown) => `error-${Date.now()}`),
      warning: vi.fn((message: string, options?: unknown) => `warning-${Date.now()}`),
      info: vi.fn((message: string, options?: unknown) => `info-${Date.now()}`),
      loading: vi.fn((message: string, options?: unknown) => `loading-${Date.now()}`),
      promise: vi.fn(<T,>(promise: Promise<T>, options: unknown) => promise),
      dismiss: vi.fn(),
    }
  ),
}));

import { toast } from "sonner";

describe("useToastConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("default configuration", () => {
    it("should have correct default durations", () => {
      expect(DEFAULT_TOAST_CONFIG.durations.success).toBe(3000);
      expect(DEFAULT_TOAST_CONFIG.durations.info).toBe(4000);
      expect(DEFAULT_TOAST_CONFIG.durations.warning).toBe(5000);
      expect(DEFAULT_TOAST_CONFIG.durations.error).toBe(0); // Persist
    });

    it("should have correct default position", () => {
      expect(DEFAULT_TOAST_CONFIG.position).toBe("bottom-right");
    });

    it("should have correct max visible", () => {
      expect(DEFAULT_TOAST_CONFIG.maxVisible).toBe(3);
    });
  });

  describe("hook initialization", () => {
    it("should return toast functions", () => {
      const { result } = renderHook(() => useToastConfig());

      expect(typeof result.current.success).toBe("function");
      expect(typeof result.current.error).toBe("function");
      expect(typeof result.current.warning).toBe("function");
      expect(typeof result.current.info).toBe("function");
      expect(typeof result.current.loading).toBe("function");
      expect(typeof result.current.dismiss).toBe("function");
      expect(typeof result.current.dismissAll).toBe("function");
      expect(typeof result.current.action).toBe("function");
    });

    it("should expose config", () => {
      const { result } = renderHook(() => useToastConfig());

      expect(result.current.config).toEqual(DEFAULT_TOAST_CONFIG);
    });
  });

  describe("toast methods", () => {
    it("should call toast.success with correct duration", () => {
      const { result } = renderHook(() => useToastConfig());

      act(() => {
        result.current.success("Test success");
      });

      expect(toast.success).toHaveBeenCalledWith("Test success", expect.objectContaining({
        duration: 3000,
        position: "bottom-right",
      }));
    });

    it("should call toast.error with Infinity duration (persist)", () => {
      const { result } = renderHook(() => useToastConfig());

      act(() => {
        result.current.error("Test error");
      });

      expect(toast.error).toHaveBeenCalledWith("Test error", expect.objectContaining({
        duration: Infinity,
        closeButton: true,
      }));
    });

    it("should call toast.warning with correct duration", () => {
      const { result } = renderHook(() => useToastConfig());

      act(() => {
        result.current.warning("Test warning");
      });

      expect(toast.warning).toHaveBeenCalledWith("Test warning", expect.objectContaining({
        duration: 5000,
      }));
    });

    it("should call toast.info with correct duration", () => {
      const { result } = renderHook(() => useToastConfig());

      act(() => {
        result.current.info("Test info");
      });

      expect(toast.info).toHaveBeenCalledWith("Test info", expect.objectContaining({
        duration: 4000,
      }));
    });
  });

  describe("custom configuration", () => {
    it("should allow custom durations", () => {
      const { result } = renderHook(() =>
        useToastConfig({
          durations: { success: 5000, info: 5000, warning: 5000, error: 5000, loading: 5000 },
        })
      );

      expect(result.current.config.durations.success).toBe(5000);
    });

    it("should allow custom position", () => {
      const { result } = renderHook(() =>
        useToastConfig({ position: "top-right" })
      );

      expect(result.current.config.position).toBe("top-right");
    });
  });

  describe("action toast", () => {
    it("should create action toast with undo capability", () => {
      const { result } = renderHook(() => useToastConfig());
      const onAction = vi.fn();

      act(() => {
        result.current.action("Item deleted", "Undo", onAction);
      });

      expect(toast).toHaveBeenCalledWith("Item deleted", expect.objectContaining({
        action: expect.objectContaining({
          label: "Undo",
        }),
      }));
    });
  });

  describe("dismiss functions", () => {
    it("should call toast.dismiss with id", () => {
      const { result } = renderHook(() => useToastConfig());

      act(() => {
        result.current.dismiss("toast-123");
      });

      expect(toast.dismiss).toHaveBeenCalledWith("toast-123");
    });

    it("should call toast.dismiss without id for dismissAll", () => {
      const { result } = renderHook(() => useToastConfig());

      act(() => {
        result.current.dismissAll();
      });

      expect(toast.dismiss).toHaveBeenCalledWith();
    });
  });
});

describe("quickToast utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show success toast", () => {
    quickToast.success("Quick success");
    expect(toast.success).toHaveBeenCalledWith("Quick success", { duration: 3000 });
  });

  it("should show error toast that persists", () => {
    quickToast.error("Quick error");
    expect(toast.error).toHaveBeenCalledWith("Quick error", { duration: Infinity });
  });
});

describe("formToast utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show saved toast", () => {
    formToast.saved("Order");
    expect(toast.success).toHaveBeenCalledWith("Order saved", { duration: 3000 });
  });

  it("should show validation error toast", () => {
    formToast.validationError("Custom validation message");
    expect(toast.warning).toHaveBeenCalledWith("Custom validation message", { duration: 5000 });
  });
});

describe("crudToast utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show created toast", () => {
    crudToast.created("Invoice");
    expect(toast.success).toHaveBeenCalledWith("Invoice created", { duration: 3000 });
  });

  it("should show deleted toast with undo", () => {
    const onUndo = vi.fn();
    crudToast.deleted("Order", onUndo);
    expect(toast).toHaveBeenCalledWith("Order deleted", expect.objectContaining({
      duration: 10000,
      action: expect.objectContaining({ label: "Undo" }),
    }));
  });
});

describe("bulkToast utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show bulk complete toast", () => {
    bulkToast.complete(50, "Updated");
    expect(toast.success).toHaveBeenCalledWith("Updated 50 items", { duration: 3000 });
  });

  it("should show partial failure toast", () => {
    bulkToast.partial(45, 5, "Updated");
    expect(toast.warning).toHaveBeenCalledWith(
      "Updated: 45 succeeded, 5 failed",
      { duration: 5000 }
    );
  });
});
