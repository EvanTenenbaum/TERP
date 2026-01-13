import { useEffect, useState, useRef, useCallback } from "react";

// Types matching the server side services
interface CartItem {
  id: number;
  batchId: number;
  productId: number;
  quantity: string | number;
  unitPrice: string;
  productName: string;
  batchCode: string;
  subtotal: string;
  isHighlighted: boolean;
}

interface CartState {
  items: CartItem[];
  totalValue: string;
  itemCount: number;
}

type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

// MEET-075-FE: Timeout status interface
interface TimeoutState {
  remainingSeconds: number;
  isWarning: boolean;
  isExpired: boolean;
  expiresAt: Date | null;
}

export const useLiveSessionSSE = (sessionId: number) => {
  const [cart, setCart] = useState<CartState | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [highlightedBatchId, setHighlightedBatchId] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("DISCONNECTED");
  // MEET-075-FE: Timeout state
  const [timeoutState, setTimeoutState] = useState<TimeoutState | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const connect = () => {
      setConnectionStatus("CONNECTING");
      
      // Use the standard API route for SSE
      const url = `/api/sse/live-shopping/${sessionId}`;
      const evtSource = new EventSource(url);
      eventSourceRef.current = evtSource;

      evtSource.onopen = () => {
        setConnectionStatus("CONNECTED");
        console.log(`[SSE] Connected to session ${sessionId}`);
      };

      // Handle Generic Message
      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle initial state sync if provided
          if (data.type === "SYNC") {
            if (data.cart) setCart(data.cart);
            if (data.status) setSessionStatus(data.status);
          }
        } catch (e) {
          console.error("[SSE] Parse error", e);
        }
      };

      // Event: Cart Updated
      evtSource.addEventListener("CART_UPDATED", (event) => {
        try {
          const data = JSON.parse(event.data);
          // Structure expected: { items: [], totalValue: "..." }
          // We might need to map it if the payload structure differs from CartState
          // Assuming the router emits the exact shape returned by getCart
          // Re-calculating totals if not provided, but usually service provides it.
          
          // Reconstruct CartState from items list if raw items array sent
          if (Array.isArray(data)) {
             let total = 0;
             data.forEach((item: any) => {
                 total += (parseFloat(item.quantity) * parseFloat(item.unitPrice));
             });
             setCart({
                 items: data,
                 totalValue: total.toFixed(2),
                 itemCount: data.length
             });
          } else {
             // Assume full object
             setCart(data);
          }
        } catch (e) {
          console.error("[SSE] Cart update error", e);
        }
      });

      // Event: Session Status Changed
      evtSource.addEventListener("SESSION_STATUS", (event) => {
        try {
          const data = JSON.parse(event.data);
          setSessionStatus(data.status);
        } catch (e) {
          console.error("[SSE] Status update error", e);
        }
      });

      // Event: Product Highlighted
      evtSource.addEventListener("HIGHLIGHTED", (event) => {
        try {
          const data = JSON.parse(event.data);
          setHighlightedBatchId(data.batchId);

          // Also update local cart state highlighting if applicable
          setCart(prev => {
            if(!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => ({
                    ...item,
                    isHighlighted: item.batchId === data.batchId
                }))
            };
          });
        } catch (e) {
          console.error("[SSE] Highlight error", e);
        }
      });

      // MEET-075-FE: Event: Timeout Warning
      evtSource.addEventListener("TIMEOUT_WARNING", (event) => {
        try {
          const data = JSON.parse(event.data);
          setTimeoutState({
            remainingSeconds: data.remainingSeconds,
            isWarning: true,
            isExpired: false,
            expiresAt: null,
          });
        } catch (e) {
          console.error("[SSE] Timeout warning error", e);
        }
      });

      // MEET-075-FE: Event: Session Timeout
      evtSource.addEventListener("SESSION_TIMEOUT", (event) => {
        try {
          const data = JSON.parse(event.data);
          setSessionStatus(data.status || "ENDED");
          setTimeoutState({
            remainingSeconds: 0,
            isWarning: false,
            isExpired: true,
            expiresAt: null,
          });
        } catch (e) {
          console.error("[SSE] Session timeout error", e);
        }
      });

      // MEET-075-FE: Event: Timeout Extended
      evtSource.addEventListener("TIMEOUT_EXTENDED", (event) => {
        try {
          const data = JSON.parse(event.data);
          const newExpiresAt = data.newExpiresAt ? new Date(data.newExpiresAt) : null;
          const remainingSeconds = newExpiresAt
            ? Math.max(0, Math.floor((newExpiresAt.getTime() - Date.now()) / 1000))
            : -1;
          setTimeoutState({
            remainingSeconds,
            isWarning: remainingSeconds > 0 && remainingSeconds <= 300,
            isExpired: false,
            expiresAt: newExpiresAt,
          });
        } catch (e) {
          console.error("[SSE] Timeout extended error", e);
        }
      });

      // MEET-075-FE: Event: Session Cancelled
      evtSource.addEventListener("SESSION_CANCELLED", (event) => {
        try {
          const data = JSON.parse(event.data);
          setSessionStatus("CANCELLED");
          console.log("[SSE] Session cancelled:", data.reason);
        } catch (e) {
          console.error("[SSE] Session cancelled error", e);
        }
      });

      evtSource.onerror = (err) => {
        console.error("[SSE] Error", err);
        setConnectionStatus("ERROR");
        evtSource.close();
        
        // Auto-reconnect after 3 seconds
        retryTimeoutRef.current = setTimeout(() => {
            connect();
        }, 3000);
      };
    };

    connect();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [sessionId]);

  return {
    cart,
    sessionStatus,
    highlightedBatchId,
    connectionStatus,
    // MEET-075-FE: Timeout state
    timeoutState,
  };
};
