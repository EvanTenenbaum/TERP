import { useEffect, useState, useRef } from "react";
import { trpc } from "../utils/trpc"; // Adjust import path based on your project structure

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

export const useLiveSessionClient = (roomCode: string, sessionToken: string) => {
  const [cart, setCart] = useState<CartState | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [highlightedBatchId, setHighlightedBatchId] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("DISCONNECTED");
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!roomCode || !sessionToken) return;

    const connect = async () => {
      setConnectionStatus("CONNECTING");

      // SEC-021 Fix: Two-step authentication to avoid exposing token in URL
      // Step 1: Exchange token for short-lived SSE session ID
      try {
        const authResponse = await fetch("/api/sse/vip/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: sessionToken,
            roomCode: roomCode,
          }),
        });

        if (!authResponse.ok) {
          const error = await authResponse.json();
          console.error("[Client SSE] Auth failed:", error);
          setConnectionStatus("ERROR");

          // Retry after 5 seconds if auth fails
          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
          return;
        }

        const { sseSessionId } = await authResponse.json();

        // Step 2: Connect to SSE with SSE session ID (not actual token)
        const url = `/api/sse/vip/live-shopping/${roomCode}?sseSessionId=${encodeURIComponent(sseSessionId)}`;
        const evtSource = new EventSource(url);
        eventSourceRef.current = evtSource;

      evtSource.onopen = () => {
        setConnectionStatus("CONNECTED");
        console.log(`[Client SSE] Connected to room ${roomCode}`);
      };

      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "SYNC") {
            if (data.cart) setCart(data.cart);
            if (data.status) setSessionStatus(data.status);
          }
        } catch (e) {
          console.error("[Client SSE] Parse error", e);
        }
      };

      // Event: Cart Updated
      evtSource.addEventListener("CART_UPDATED", (event) => {
        try {
          const data = JSON.parse(event.data);
          
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
             setCart(data);
          }
        } catch (e) {
          console.error("[Client SSE] Cart update error", e);
        }
      });

      // Event: Session Status Changed
      evtSource.addEventListener("SESSION_STATUS", (event) => {
        try {
          const data = JSON.parse(event.data);
          setSessionStatus(data.status);
        } catch (e) {
          console.error("[Client SSE] Status update error", e);
        }
      });

      // Event: Product Highlighted
      evtSource.addEventListener("HIGHLIGHTED", (event) => {
        try {
          const data = JSON.parse(event.data);
          setHighlightedBatchId(data.batchId);
          
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
          console.error("[Client SSE] Highlight error", e);
        }
      });

        evtSource.onerror = (err) => {
          console.error("[Client SSE] Error", err);
          setConnectionStatus("ERROR");
          evtSource.close();

          // Auto-reconnect after 3 seconds
          retryTimeoutRef.current = setTimeout(() => {
              connect();
          }, 3000);
        };
      } catch (error) {
        console.error("[Client SSE] Connection error:", error);
        setConnectionStatus("ERROR");

        // Retry after 5 seconds on connection error
        retryTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
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
  }, [roomCode, sessionToken]);

  return {
    cart,
    setCart, // Exposed for optimistic updates if needed
    sessionStatus,
    setSessionStatus,
    highlightedBatchId,
    connectionStatus
  };
};
