import { EventEmitter } from "events";
// Note: Logger and features can be imported when needed
// import { features } from "../../_core/features";

// Event Types
export const SSE_EVENTS = {
  CART_UPDATED: "CART_UPDATED",           // Cart contents changed
  PRICE_CHANGED: "PRICE_CHANGED",         // Override price applied
  PRODUCT_HIGHLIGHTED: "HIGHLIGHTED",     // Host highlighted a product
  SESSION_STATUS: "SESSION_STATUS",       // Session ended/paused
  CONNECTION_PING: "PING",                // Heartbeat
  ITEM_STATUS_CHANGED: "ITEM_STATUS",     // Item status changed (Sample/Interested/Purchase)
} as const;

export type SseEventType = keyof typeof SSE_EVENTS;

export interface SsePayload {
  type: SseEventType;
  sessionId: number;
  timestamp: string;
  data: any;
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
  private emitToSession(sessionId: number, type: SseEventType, data: any) {
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
      console.log(`SSE Emitted: ${type}`, roomId, payload);
    }
  }

  // ==========================================================================
  // PUBLIC EMITTERS
  // ==========================================================================

  public emitCartUpdate(sessionId: number, cartItems: any[]) {
    this.emitToSession(sessionId, "CART_UPDATED", { items: cartItems });
  }

  public emitPriceOverride(sessionId: number, productId: number, price: number) {
    this.emitToSession(sessionId, "PRICE_CHANGED", { productId, price });
  }

  public emitHighlight(sessionId: number, batchId: number) {
    this.emitToSession(sessionId, "PRODUCT_HIGHLIGHTED", { batchId });
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
}

export const sessionEventManager = SessionEventManager.getInstance();
