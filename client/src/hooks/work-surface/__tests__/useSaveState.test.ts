/**
 * Tests for useSaveState Hook
 * UXS-102: Tests Work Surface save state indicator management
 *
 * Save States (from ATOMIC_UX_STRATEGY.md):
 * - ✅ Saved (green): Persisted to server
 * - 🟡 Saving (yellow): Request in flight
 * - 🔴 Needs attention (red): Validation error or conflict
 * - 🟠 Queued (orange): Offline, pending sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSaveState, SaveStateStatus } from "../useSaveState";

describe("useSaveState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with saved state by default", () => {
      const { result } = renderHook(() => useSaveState());

      expect(result.current.saveState.status).toBe("saved");
      expect(result.current.saveState.lastSaved).toBeInstanceOf(Date);
      expect(result.current.isDirty).toBe(false);
    });

    it("should initialize with custom initial state", () => {
      const { result } = renderHook(() =>
        useSaveState({ initialState: "saving" })
      );

      expect(result.current.saveState.status).toBe("saving");
      expect(result.current.saveState.lastSaved).toBeUndefined();
    });

    it("should expose state transition functions", () => {
      const { result } = renderHook(() => useSaveState());

      expect(typeof result.current.setSaving).toBe("function");
      expect(typeof result.current.setSaved).toBe("function");
      expect(typeof result.current.setError).toBe("function");
      expect(typeof result.current.setQueued).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("should provide SaveStateIndicator component", () => {
      const { result } = renderHook(() => useSaveState());

      expect(result.current.SaveStateIndicator).toBeDefined();
    });
  });

  describe("state transitions", () => {
    describe("setSaving", () => {
      it("should transition to saving state", () => {
        const { result } = renderHook(() => useSaveState());

        act(() => {
          result.current.setSaving();
        });

        expect(result.current.saveState.status).toBe("saving");
        expect(result.current.saveState.message).toBe("Saving changes...");
        expect(result.current.isDirty).toBe(true);
      });

      it("should accept custom message", () => {
        const { result } = renderHook(() => useSaveState());

        act(() => {
          result.current.setSaving("Syncing data...");
        });

        expect(result.current.saveState.message).toBe("Syncing data...");
      });

      it("should clear pending error reset timer", () => {
        const { result } = renderHook(() =>
          useSaveState({ errorResetDelay: 5000 })
        );

        // Set error first
        act(() => {
          result.current.setError("Test error");
        });

        // Before timer fires, set saving
        act(() => {
          result.current.setSaving();
        });

        expect(result.current.saveState.status).toBe("saving");

        // Advance past error reset delay - should NOT reset to saved
        act(() => {
          vi.advanceTimersByTime(6000);
        });

        expect(result.current.saveState.status).toBe("saving");
      });
    });

    describe("setSaved", () => {
      it("should transition to saved state", () => {
        const { result } = renderHook(() =>
          useSaveState({ initialState: "saving" })
        );

        act(() => {
          result.current.setSaved();
        });

        expect(result.current.saveState.status).toBe("saved");
        expect(result.current.saveState.lastSaved).toBeInstanceOf(Date);
        expect(result.current.isDirty).toBe(false);
      });

      it("should update lastSaved timestamp", () => {
        const { result } = renderHook(() => useSaveState());

        const beforeSave = new Date();

        act(() => {
          vi.advanceTimersByTime(1000);
          result.current.setSaved();
        });

        expect(result.current.saveState.lastSaved!.getTime()).toBeGreaterThanOrEqual(
          beforeSave.getTime()
        );
      });
    });

    describe("setError", () => {
      it("should transition to error state with message", () => {
        const { result } = renderHook(() => useSaveState());

        act(() => {
          result.current.setError("Connection failed");
        });

        expect(result.current.saveState.status).toBe("error");
        expect(result.current.saveState.message).toBe("Connection failed");
      });

      it("should store error details for debugging", () => {
        const { result } = renderHook(() => useSaveState());
        const errorDetails = { code: "NETWORK_ERROR", timestamp: Date.now() };

        act(() => {
          result.current.setError("Network error", errorDetails);
        });

        expect(result.current.saveState.errorDetails).toEqual(errorDetails);
      });

      it("should auto-reset to saved after delay", () => {
        const { result } = renderHook(() =>
          useSaveState({ errorResetDelay: 5000 })
        );

        act(() => {
          result.current.setError("Temporary error");
        });

        expect(result.current.saveState.status).toBe("error");

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        expect(result.current.saveState.status).toBe("saved");
        expect(result.current.saveState.message).toBeUndefined();
      });

      it("should not auto-reset if errorResetDelay is 0", () => {
        const { result } = renderHook(() =>
          useSaveState({ errorResetDelay: 0 })
        );

        act(() => {
          result.current.setError("Persistent error");
        });

        act(() => {
          vi.advanceTimersByTime(10000);
        });

        expect(result.current.saveState.status).toBe("error");
      });
    });

    describe("setQueued", () => {
      it("should transition to queued state when offline supported", () => {
        const { result } = renderHook(() =>
          useSaveState({ offlineSupported: true })
        );

        act(() => {
          result.current.setQueued();
        });

        expect(result.current.saveState.status).toBe("queued");
        expect(result.current.saveState.message).toBe("Will sync when online");
      });

      it("should accept custom message", () => {
        const { result } = renderHook(() =>
          useSaveState({ offlineSupported: true })
        );

        act(() => {
          result.current.setQueued("5 changes queued");
        });

        expect(result.current.saveState.message).toBe("5 changes queued");
      });

      it("should warn and not transition if offline not supported", () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { result } = renderHook(() =>
          useSaveState({ offlineSupported: false })
        );

        act(() => {
          result.current.setQueued();
        });

        expect(result.current.saveState.status).toBe("saved"); // Unchanged
        expect(consoleSpy).toHaveBeenCalledWith(
          "useSaveState: Offline queue not enabled. Set offlineSupported: true"
        );

        consoleSpy.mockRestore();
      });
    });

    describe("reset", () => {
      it("should reset to saved state", () => {
        const { result } = renderHook(() => useSaveState());

        act(() => {
          result.current.setError("Some error");
        });

        act(() => {
          result.current.reset();
        });

        expect(result.current.saveState.status).toBe("saved");
        expect(result.current.saveState.lastSaved).toBeInstanceOf(Date);
        expect(result.current.isDirty).toBe(false);
      });

      it("should clear error reset timer", () => {
        const { result } = renderHook(() =>
          useSaveState({ errorResetDelay: 5000 })
        );

        act(() => {
          result.current.setError("Error");
        });

        act(() => {
          result.current.reset();
        });

        // Advance timers - should NOT change state since timer was cleared
        act(() => {
          result.current.setSaving();
          vi.advanceTimersByTime(6000);
        });

        expect(result.current.saveState.status).toBe("saving");
      });
    });
  });

  describe("callbacks", () => {
    it("should call onStateChange when state changes", () => {
      const onStateChange = vi.fn();
      const { result } = renderHook(() =>
        useSaveState({ onStateChange })
      );

      // Initial call on mount
      expect(onStateChange).toHaveBeenCalled();

      act(() => {
        result.current.setSaving();
      });

      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: "saving" })
      );

      act(() => {
        result.current.setSaved();
      });

      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: "saved" })
      );
    });
  });

  describe("isDirty flag", () => {
    it("should be true when saving", () => {
      const { result } = renderHook(() => useSaveState());

      act(() => {
        result.current.setSaving();
      });

      expect(result.current.isDirty).toBe(true);
    });

    it("should be false when saved", () => {
      const { result } = renderHook(() => useSaveState());

      act(() => {
        result.current.setSaving();
      });

      act(() => {
        result.current.setSaved();
      });

      expect(result.current.isDirty).toBe(false);
    });

    it("should be false after reset", () => {
      const { result } = renderHook(() => useSaveState());

      act(() => {
        result.current.setSaving();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should clear timers on unmount", () => {
      const { result, unmount } = renderHook(() =>
        useSaveState({ errorResetDelay: 5000 })
      );

      act(() => {
        result.current.setError("Error");
      });

      // Unmount before timer fires
      unmount();

      // Should not throw or cause issues
      act(() => {
        vi.advanceTimersByTime(6000);
      });
    });
  });
});

describe("SaveStateIndicator component", () => {
  it("should render different states correctly", () => {
    const states: SaveStateStatus[] = ["saved", "saving", "error", "queued"];

    for (const initialState of states) {
      const { result } = renderHook(() => useSaveState({ initialState }));

      // SaveStateIndicator should be a React element
      expect(result.current.SaveStateIndicator).toBeDefined();
    }
  });

  it("should update when state changes", () => {
    const { result } = renderHook(() => useSaveState());

    const initialIndicator = result.current.SaveStateIndicator;

    act(() => {
      result.current.setSaving();
    });

    // Indicator should be different after state change
    expect(result.current.SaveStateIndicator).not.toBe(initialIndicator);
  });
});

describe("integration scenarios", () => {
  it("should handle typical mutation flow: saving -> saved", async () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() => useSaveState({ onStateChange }));

    // Simulate mutation start
    act(() => {
      result.current.setSaving();
    });

    expect(result.current.saveState.status).toBe("saving");
    expect(result.current.isDirty).toBe(true);

    // Simulate mutation success
    act(() => {
      result.current.setSaved();
    });

    expect(result.current.saveState.status).toBe("saved");
    expect(result.current.isDirty).toBe(false);
    expect(result.current.saveState.lastSaved).toBeInstanceOf(Date);
  });

  it("should handle typical mutation flow: saving -> error -> retry -> saved", async () => {
    const { result } = renderHook(() =>
      useSaveState({ errorResetDelay: 0 }) // Disable auto-reset for test
    );

    // First attempt
    act(() => {
      result.current.setSaving();
    });

    // Fails
    act(() => {
      result.current.setError("Network error");
    });

    expect(result.current.saveState.status).toBe("error");

    // Retry
    act(() => {
      result.current.setSaving();
    });

    expect(result.current.saveState.status).toBe("saving");

    // Success
    act(() => {
      result.current.setSaved();
    });

    expect(result.current.saveState.status).toBe("saved");
  });

  it("should handle offline flow: saving -> queued -> online -> saved", async () => {
    const { result } = renderHook(() =>
      useSaveState({ offlineSupported: true })
    );

    // Start save
    act(() => {
      result.current.setSaving();
    });

    // Goes offline - queue the change
    act(() => {
      result.current.setQueued("Will sync when online");
    });

    expect(result.current.saveState.status).toBe("queued");

    // Back online - sync starts
    act(() => {
      result.current.setSaving("Syncing queued changes...");
    });

    // Sync completes
    act(() => {
      result.current.setSaved();
    });

    expect(result.current.saveState.status).toBe("saved");
  });
});
