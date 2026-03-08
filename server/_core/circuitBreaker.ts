/**
 * TER-592: Generic Circuit Breaker for External Services
 *
 * Implements the circuit breaker pattern to protect TERP from cascading failures
 * when external services (notification providers, Forge API, etc.) are degraded.
 *
 * States:
 *   CLOSED    — Normal operation. Calls pass through.
 *   OPEN      — Service is failing. Calls are rejected immediately.
 *   HALF_OPEN — Testing recovery. A limited number of calls are allowed through.
 *
 * Transition rules:
 *   CLOSED  → OPEN      when consecutive failures reach failureThreshold
 *   OPEN    → HALF_OPEN after resetTimeout has elapsed since last failure
 *   HALF_OPEN → CLOSED  when a probe call succeeds
 *   HALF_OPEN → OPEN    when a probe call fails
 */

import { logger } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

export const CircuitState = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
} as const;

export type CircuitStateType = (typeof CircuitState)[keyof typeof CircuitState];

export interface CircuitBreakerConfig {
  /**
   * Number of consecutive failures before opening the circuit.
   * Default: 5
   */
  failureThreshold?: number;

  /**
   * Milliseconds to wait in OPEN state before transitioning to HALF_OPEN.
   * Default: 30000 (30 seconds)
   */
  resetTimeout?: number;

  /**
   * Maximum number of probe calls allowed in HALF_OPEN state.
   * Default: 1
   */
  halfOpenMax?: number;

  /**
   * Name of this circuit breaker for logging (e.g., "notification-service").
   */
  name?: string;
}

export interface CircuitBreakerState {
  state: CircuitStateType;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  halfOpenCallsInFlight: number;
}

// ============================================================================
// CIRCUIT BREAKER CLASS
// ============================================================================

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMax: number;
  private readonly name: string;

  private state: CircuitStateType = CircuitState.CLOSED;
  private consecutiveFailures: number = 0;
  private lastFailureTime: number | null = null;
  private halfOpenCallsInFlight: number = 0;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.resetTimeout = config.resetTimeout ?? 30_000;
    this.halfOpenMax = config.halfOpenMax ?? 1;
    this.name = config.name ?? "circuit-breaker";
  }

  /**
   * Execute a function through the circuit breaker.
   * Throws if the circuit is OPEN, or if the underlying call fails.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateStateTransition();

    if (this.state === CircuitState.OPEN) {
      const waitMs = this.lastFailureTime
        ? this.resetTimeout - (Date.now() - this.lastFailureTime)
        : this.resetTimeout;

      logger.warn(
        {
          circuit: this.name,
          state: this.state,
          consecutiveFailures: this.consecutiveFailures,
          retryAfterMs: Math.max(0, waitMs),
        },
        "Circuit breaker OPEN — rejecting call"
      );

      throw new Error(
        `Circuit breaker '${this.name}' is OPEN. Retry after ${Math.max(0, Math.ceil(waitMs / 1000))}s.`
      );
    }

    if (
      this.state === CircuitState.HALF_OPEN &&
      this.halfOpenCallsInFlight >= this.halfOpenMax
    ) {
      logger.warn(
        {
          circuit: this.name,
          state: this.state,
          halfOpenCallsInFlight: this.halfOpenCallsInFlight,
          halfOpenMax: this.halfOpenMax,
        },
        "Circuit breaker HALF_OPEN probe slots exhausted — rejecting call"
      );

      throw new Error(
        `Circuit breaker '${this.name}' is HALF_OPEN and probe slots are full.`
      );
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCallsInFlight++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Return a snapshot of the circuit breaker's current state.
   */
  getState(): CircuitBreakerState {
    this.evaluateStateTransition();
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      halfOpenCallsInFlight: this.halfOpenCallsInFlight,
    };
  }

  /**
   * Manually reset the circuit to CLOSED state.
   * Use sparingly — prefer letting the circuit recover naturally.
   */
  reset(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.halfOpenCallsInFlight = 0;

    logger.info(
      { circuit: this.name, previousState, newState: this.state },
      "Circuit breaker manually reset to CLOSED"
    );
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Check whether enough time has passed to move OPEN → HALF_OPEN.
   */
  private evaluateStateTransition(): void {
    if (
      this.state === CircuitState.OPEN &&
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.resetTimeout
    ) {
      const previousState = this.state;
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenCallsInFlight = 0;

      logger.info(
        {
          circuit: this.name,
          previousState,
          newState: this.state,
          afterMs: Date.now() - this.lastFailureTime,
          resetTimeout: this.resetTimeout,
        },
        "Circuit breaker transitioned OPEN → HALF_OPEN (probe window started)"
      );
    }
  }

  private onSuccess(): void {
    const wasHalfOpen = this.state === CircuitState.HALF_OPEN;

    if (wasHalfOpen) {
      this.halfOpenCallsInFlight = Math.max(0, this.halfOpenCallsInFlight - 1);
    }

    if (wasHalfOpen || this.state === CircuitState.CLOSED) {
      const previousState = this.state;
      this.state = CircuitState.CLOSED;
      this.consecutiveFailures = 0;
      this.lastFailureTime = null;

      if (wasHalfOpen) {
        logger.info(
          {
            circuit: this.name,
            previousState,
            newState: this.state,
          },
          "Circuit breaker transitioned HALF_OPEN → CLOSED (probe succeeded)"
        );
      }
    }
  }

  private onFailure(error: unknown): void {
    const previousState = this.state;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCallsInFlight = Math.max(0, this.halfOpenCallsInFlight - 1);
    }

    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (
      this.state === CircuitState.CLOSED &&
      this.consecutiveFailures >= this.failureThreshold
    ) {
      this.state = CircuitState.OPEN;

      logger.error(
        {
          circuit: this.name,
          previousState,
          newState: this.state,
          consecutiveFailures: this.consecutiveFailures,
          failureThreshold: this.failureThreshold,
          error: error instanceof Error ? error.message : String(error),
        },
        "Circuit breaker transitioned CLOSED → OPEN (failure threshold reached)"
      );
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;

      logger.error(
        {
          circuit: this.name,
          previousState,
          newState: this.state,
          consecutiveFailures: this.consecutiveFailures,
          error: error instanceof Error ? error.message : String(error),
        },
        "Circuit breaker transitioned HALF_OPEN → OPEN (probe failed)"
      );
    } else {
      logger.warn(
        {
          circuit: this.name,
          state: this.state,
          consecutiveFailures: this.consecutiveFailures,
          failureThreshold: this.failureThreshold,
          error: error instanceof Error ? error.message : String(error),
        },
        "Circuit breaker recorded failure"
      );
    }
  }
}

/**
 * Create a named circuit breaker instance with sensible defaults.
 * Intended for use by notification service and other external integrations.
 *
 * @example
 * ```typescript
 * const notificationBreaker = createCircuitBreaker({ name: "notification-service" });
 *
 * async function sendNotification(payload: NotificationPayload) {
 *   return notificationBreaker.execute(() => externalApi.send(payload));
 * }
 * ```
 */
export function createCircuitBreaker(
  config: CircuitBreakerConfig = {}
): CircuitBreaker {
  return new CircuitBreaker(config);
}
