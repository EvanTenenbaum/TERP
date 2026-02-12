import { EventEmitter } from "events";
import { logger } from "../../_core/logger";
// Note: features can be imported when needed
// import { features } from "../../_core/features";

// Event Types - SSE-001: Fixed event naming consistency
export const SSE_EVENTS = {
  // Cart events
  CART_UPDATED: "CART_UPDATED",           // Cart contents changed
  PRICE_CHANGED: "PRICE_CHANGED",         // Override price applied

  // Product events
  HIGHLIGHTED: "HIGHLIGHTED",             // Host highlighted a product (SSE-001: renamed from PRODUCT_HIGHLIGHTED)
  ITEM_STATUS_CHANGED: "ITEM_STATUS_CHANGED", // Item status changed (SSE-001: fixed value)

  // Session events
  SESSION_STATUS: "SESSION_STATUS",       // Session ended/paused
  SESSION_EXTENDED: "SESSION_EXTENDED",   // SSE-001: Session timeout extended
  SESSION_TIMEOUT: "SESSION_TIMEOUT",     // SSE-001: Session timed out
  SESSION_TIMEOUT_WARNING: "SESSION_TIMEOUT_WARNING", // SSE-001: Warning before timeout
  SESSION_CANCELLED: "SESSION_CANCELLED", // SSE-001: Session cancelled by host

  // Connection events
  CONNECTION_PING: "PING",                // Heartbeat

  // Negotiation events
  NEGOTIATION_REQUESTED: "NEGOTIATION_REQUESTED",     // Client requested price negotiation
  NEGOTIATION_RESPONSE: "NEGOTIATION_RESPONSE",       // Host responded to negotiation
  COUNTER_OFFER_ACCEPTED: "COUNTER_OFFER_ACCEPTED",   // Client accepted counter-offer

  // Client events
  CLIENT_CHECKOUT_REQUEST: "CLIENT_CHECKOUT_REQUEST", // SSE-001: Client requested checkout
  NOTES_UPDATED: "NOTES_UPDATED",         // SSE-001: Session notes updated
} as const;

export type SseEventType = keyof typeof SSE_EVENTS;

export interface SsePayload {
  type: SseEventType;
  sessionId: number;
  timestamp: string;
  data: unknown;
}

/**
 * Session Event Manager (Singleton)
 * Handles dispatching server-sent events to active Live Shopping sessions.
 * 
 * Usage:
 * sessionEventManager.emitCartUpdate(sessionId, cartData);
 */
class SessionEventManager extends EventEmitter {
  private static instance: SessionEventManager;

  private constructor() {
    super();
    // Set max listeners higher to accommodate concurrent sessions
    // Typically 1 listener per active HTTP connection if streaming directly, 
    // or 1 global listener if using a pub/sub redis adapter.
    // For Phase 0 (in-memory), we assume this emitter feeds the route handlers.
    this.setMaxListeners(1000); 
  }

  public static getInstance(): SessionEventManager {
    if (!SessionEventManager.instance) {
      SessionEventManager.instance = new SessionEventManager();
    }
    return SessionEventManager.instance;
  }

  /**
   * Generates a room channel ID for internal event routing
   */
  public getRoomId(sessionId: number): string {
    return `session_${sessionId}`;
  }

  /**
   * Emit a generic event to a session room
   */
  private emitToSession(sessionId: number, type: SseEventType, data: unknown) {
    const payload: SsePayload = {
      type,
      sessionId,
      timestamp: new Date().toISOString(),
      data,
    };
    
    const roomId = this.getRoomId(sessionId);
    
    // Emit specifically to the room identifier
    this.emit(roomId, payload);
    
    // Debug log for development
    if (process.env.NODE_ENV === 'development') {
      logger.info({ msg: `SSE Emitted: ${type}`, roomId, payload });
    }
  }

  // ==========================================================================
  // PUBLIC EMITTERS
  // ==========================================================================

  public emitCartUpdate(sessionId: number, cartItems: Array<Record<string, unknown>>) {
    this.emitToSession(sessionId, "CART_UPDATED", { items: cartItems });
  }

  public emitPriceOverride(sessionId: number, productId: number, price: number) {
    this.emitToSession(sessionId, "PRICE_CHANGED", { productId, price });
  }

  public emitHighlight(sessionId: number, batchId: number) {
    this.emitToSession(sessionId, "HIGHLIGHTED", { batchId }); // SSE-001: Fixed event name
  }

  public emitStatusChange(sessionId: number, status: string) {
    this.emitToSession(sessionId, "SESSION_STATUS", { status });
  }
  
  public emitPing(sessionId: number) {
     this.emitToSession(sessionId, "CONNECTION_PING", { ts: Date.now() });
  }

  public emitItemStatusChange(
    sessionId: number,
    cartItemId: number,
    status: "SAMPLE_REQUEST" | "INTERESTED" | "TO_PURCHASE",
    changedBy: "HOST" | "CLIENT"
  ) {
    this.emitToSession(sessionId, "ITEM_STATUS_CHANGED", {
      cartItemId,
      status,
      changedBy,
    });
  }

  // SSE-001: New session lifecycle event emitters
  public emitSessionExtended(sessionId: number, newEndTime: Date, extendedBy: number) {
    this.emitToSession(sessionId, "SESSION_EXTENDED", {
      newEndTime: newEndTime.toISOString(),
      extendedBy,
    });
  }

  public emitSessionTimeoutWarning(sessionId: number, minutesRemaining: number) {
    this.emitToSession(sessionId, "SESSION_TIMEOUT_WARNING", {
      minutesRemaining,
    });
  }

  public emitSessionTimeout(sessionId: number) {
    this.emitToSession(sessionId, "SESSION_TIMEOUT", {
      endedAt: new Date().toISOString(),
    });
  }

  public emitSessionCancelled(sessionId: number, cancelledBy: number, reason?: string) {
    this.emitToSession(sessionId, "SESSION_CANCELLED", {
      cancelledBy,
      reason,
    });
  }

  public emitClientCheckoutRequest(sessionId: number, clientId: number) {
    this.emitToSession(sessionId, "CLIENT_CHECKOUT_REQUEST", {
      clientId,
      requestedAt: new Date().toISOString(),
    });
  }

  public emitNotesUpdated(sessionId: number, notes: string, updatedBy: number) {
    this.emitToSession(sessionId, "NOTES_UPDATED", {
      notes,
      updatedBy,
    });
  }

  // ==========================================================================
  // PRICE NEGOTIATION EVENTS
  // ==========================================================================

  public emitNegotiationRequested(
    sessionId: number,
    cartItemId: number,
    proposedPrice: number,
    originalPrice: number
  ) {
    this.emitToSession(sessionId, "NEGOTIATION_REQUESTED", {
      cartItemId,
      proposedPrice,
      originalPrice,
    });
  }

  public emitNegotiationResponse(
    sessionId: number,
    cartItemId: number,
    response: "ACCEPT" | "REJECT" | "COUNTER",
    counterPrice?: number
  ) {
    this.emitToSession(sessionId, "NEGOTIATION_RESPONSE", {
      cartItemId,
      response,
      counterPrice,
    });
  }

  public emitCounterOfferAccepted(
    sessionId: number,
    cartItemId: number,
    finalPrice: number
  ) {
    this.emitToSession(sessionId, "COUNTER_OFFER_ACCEPTED", {
      cartItemId,
      finalPrice,
    });
  }

  // ==========================================================================
  // LISTENER MANAGEMENT (for SSE endpoints)
  // ==========================================================================

  /**
   * Subscribe to a session's events
   * Used by SSE endpoints to subscribe to session updates
   */
  public subscribe(sessionId: number, listener: (event: { type: string; data: unknown }) => void): void {
    const roomId = this.getRoomId(sessionId);
    this.on(roomId, (payload: SsePayload) => {
      listener({ type: payload.type, data: payload.data });
    });
  }

  /**
   * Unsubscribe from a session's events
   * Used when SSE connection closes
   */
  public unsubscribe(sessionId: number, listener: (event: { type: string; data: unknown }) => void): void {
    const roomId = this.getRoomId(sessionId);
    this.off(roomId, listener as (payload: SsePayload) => void);
  }
}

export const sessionEventManager = SessionEventManager.getInstance();
