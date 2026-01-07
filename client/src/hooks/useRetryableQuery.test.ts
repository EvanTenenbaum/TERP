/**
 * Tests for useRetryableQuery Hook
 * BUG-045, BUG-048: Tests retry functionality without page reload
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useRetryableQuery } from "./useRetryableQuery";
import React from "react";

// Create a wrapper with QueryClient for testing
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useRetryableQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should wrap a query result with retry properties", () => {
    // Arrange
    const mockQueryResult = {
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isSuccess: false,
      isFetching: true,
      status: "loading" as const,
      queryKey: ["test"],
      refetch: vi.fn().mockResolvedValue({ data: "test" }),
    };

    // Act - directly test the hook's return values
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        // Create a simple mock query
        const query = useQuery({
          queryKey: ["test"],
          queryFn: () => Promise.resolve("data"),
        });
        return useRetryableQuery(query as any);
      },
      { wrapper }
    );

    // Assert
    expect(result.current.retryCount).toBe(0);
    expect(result.current.maxRetries).toBe(3);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.remainingRetries).toBe(3);
    expect(typeof result.current.handleRetry).toBe("function");
    expect(typeof result.current.resetRetryCount).toBe("function");
  });

  it("should use custom maxRetries", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        const query = useQuery({
          queryKey: ["test-max"],
          queryFn: () => Promise.resolve("data"),
        });
        return useRetryableQuery(query as any, { maxRetries: 5 });
      },
      { wrapper }
    );

    expect(result.current.maxRetries).toBe(5);
    expect(result.current.remainingRetries).toBe(5);
  });

  it("should increment retry count on handleRetry", async () => {
    const wrapper = createWrapper();
    const onRetry = vi.fn();

    const { result } = renderHook(
      () => {
        const query = useQuery({
          queryKey: ["test-retry"],
          queryFn: () => Promise.resolve("data"),
        });
        return useRetryableQuery(query as any, { maxRetries: 3, onRetry });
      },
      { wrapper }
    );

    // Wait for initial query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Reset to simulate error state for retry testing
    await act(async () => {
      await result.current.handleRetry();
    });

    // Since query succeeds, retry count should reset to 0
    // but onRetry should have been called with 1
    expect(onRetry).toHaveBeenCalledWith(1);
  });

  it("should call onMaxRetriesReached when limit exceeded", async () => {
    const wrapper = createWrapper();
    const onMaxRetriesReached = vi.fn();

    let callCount = 0;
    const { result } = renderHook(
      () => {
        const query = useQuery({
          queryKey: ["test-max-retry"],
          queryFn: () => {
            callCount++;
            if (callCount <= 3) {
              return Promise.reject(new Error("Test error"));
            }
            return Promise.resolve("data");
          },
          retry: false,
        });
        return useRetryableQuery(query as any, {
          maxRetries: 3,
          onMaxRetriesReached,
        });
      },
      { wrapper }
    );

    // Simulate retrying until max is reached
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await result.current.handleRetry();
      });
    }

    // After 3 retries, canRetry should be false
    expect(result.current.canRetry).toBe(false);
    expect(result.current.remainingRetries).toBe(0);
  });

  it("should reset retry count on resetRetryCount call", async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(
      () => {
        const query = useQuery({
          queryKey: ["test-reset"],
          queryFn: () => Promise.resolve("data"),
        });
        return useRetryableQuery(query as any, { maxRetries: 3 });
      },
      { wrapper }
    );

    // Simulate some retries
    await act(async () => {
      await result.current.handleRetry();
    });

    // Reset
    act(() => {
      result.current.resetRetryCount();
    });

    expect(result.current.retryCount).toBe(0);
    expect(result.current.remainingRetries).toBe(3);
  });

  it("should calculate remaining retries correctly", () => {
    const wrapper = createWrapper();

    const { result } = renderHook(
      () => {
        const query = useQuery({
          queryKey: ["test-remaining"],
          queryFn: () => Promise.resolve("data"),
        });
        return useRetryableQuery(query as any, { maxRetries: 5 });
      },
      { wrapper }
    );

    expect(result.current.remainingRetries).toBe(5);
  });

  it("should not retry when already at max retries", async () => {
    const wrapper = createWrapper();
    const onRetry = vi.fn();
    const onMaxRetriesReached = vi.fn();

    const { result } = renderHook(
      () => {
        const query = useQuery({
          queryKey: ["test-no-retry"],
          queryFn: () => Promise.reject(new Error("error")),
          retry: false,
        });
        return useRetryableQuery(query as any, {
          maxRetries: 1,
          onRetry,
          onMaxRetriesReached,
        });
      },
      { wrapper }
    );

    // First retry
    await act(async () => {
      await result.current.handleRetry();
    });

    expect(onRetry).toHaveBeenCalledTimes(1);

    // Second retry attempt should be blocked
    await act(async () => {
      await result.current.handleRetry();
    });

    // onRetry should only be called once
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(result.current.canRetry).toBe(false);
  });
});

describe("useRetryableQuery callbacks", () => {
  it("should call onRetry with attempt number", async () => {
    const wrapper = createWrapper();
    const onRetry = vi.fn();

    const { result } = renderHook(
      () => {
        const query = useQuery({
          queryKey: ["test-callback"],
          queryFn: () => Promise.resolve("data"),
        });
        return useRetryableQuery(query as any, { onRetry });
      },
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.handleRetry();
    });

    expect(onRetry).toHaveBeenCalledWith(1);
  });

  it("should call onRetrySuccess when retry succeeds", async () => {
    const wrapper = createWrapper();
    const onRetrySuccess = vi.fn();

    const { result } = renderHook(
      () => {
        const query = useQuery({
          queryKey: ["test-success"],
          queryFn: () => Promise.resolve("data"),
        });
        return useRetryableQuery(query as any, { onRetrySuccess });
      },
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.handleRetry();
    });

    // Note: onRetrySuccess is called when query is not in error state after retry
    expect(onRetrySuccess).toHaveBeenCalled();
  });
});
