/**
 * Feature Flags and Configuration for TERP ERP
 * Centralizes configuration toggles and constant values for system modules.
 */

export const features = {
  /**
   * Live Shopping Module Configuration
   * Controls behavior for real-time sales sessions between Staff and VIP Clients.
   */
  liveShopping: {
    /**
     * Master switch to enable/disable the feature globally.
     */
    enabled: (process.env.FEATURE_LIVE_SHOPPING_ENABLED === "true") || false,

    /**
     * Heartbeat interval for SSE connections in milliseconds.
     * Prevents connection timeouts on load balancers.
     */
    heartbeatIntervalMs: 30000,

    /**
     * Maximum number of items allowed in a single active session cart.
     * Performance guardrail.
     */
    maxCartItems: 200,

    /**
     * Time in minutes before an inactive session is automatically marked as closed.
     */
    sessionTimeoutMinutes: 120,

    /**
     * Configuration for the Agora video integration (if applicable in Phase 1).
     */
    videoProvider: {
      provider: "agora",
      appId: process.env.AGORA_APP_ID || "",
    },
    
    /**
     * Rate limiting for socket events per minute per IP.
     */
    rateLimit: {
      eventsPerMinute: 60,
    }
  },
};
