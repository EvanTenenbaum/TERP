/**
 * Analytics tracking for data card interactions
 * 
 * This module provides event tracking for:
 * - Metric card clicks
 * - Metric customization
 * - Configuration modal interactions
 */

export interface DataCardEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

/**
 * Track a data card event
 * This is a lightweight wrapper that can be integrated with any analytics provider
 * (Google Analytics, Mixpanel, Segment, etc.)
 */
function trackEvent(eventName: string, properties: Record<string, unknown> = {}) {
  const event: DataCardEvent = {
    event: eventName,
    properties: {
      ...properties,
      url: window.location.href,
      userAgent: navigator.userAgent,
    },
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.info('[Analytics]', event);
  }

  // Send to analytics provider (placeholder for future integration)
  // Example integrations:
  // - Google Analytics: gtag('event', eventName, properties)
  // - Mixpanel: mixpanel.track(eventName, properties)
  // - Segment: analytics.track(eventName, properties)
  // - PostHog: posthog.capture(eventName, properties)
  
  // For now, store in sessionStorage for debugging
  try {
    const events = JSON.parse(sessionStorage.getItem('dataCardEvents') || '[]');
    events.push(event);
    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }
    sessionStorage.setItem('dataCardEvents', JSON.stringify(events));
  } catch {
    // Silently fail if sessionStorage is not available
  }
}

/**
 * Track when a user clicks on a data card
 */
export function trackCardClick(moduleId: string, metricId: string, destination: string) {
  trackEvent('data_card_clicked', {
    module_id: moduleId,
    metric_id: metricId,
    destination,
  });
}

/**
 * Track when a user opens the configuration modal
 */
export function trackConfigModalOpened(moduleId: string) {
  trackEvent('data_card_config_opened', {
    module_id: moduleId,
  });
}

/**
 * Track when a user saves metric preferences
 */
export function trackMetricsCustomized(
  moduleId: string,
  selectedMetrics: string[],
  previousMetrics: string[]
) {
  const added = selectedMetrics.filter(m => !previousMetrics.includes(m));
  const removed = previousMetrics.filter(m => !selectedMetrics.includes(m));
  
  trackEvent('data_card_metrics_customized', {
    module_id: moduleId,
    selected_metrics: selectedMetrics,
    metrics_added: added,
    metrics_removed: removed,
    total_selected: selectedMetrics.length,
  });
}

/**
 * Track when a user resets metrics to defaults
 */
export function trackMetricsReset(moduleId: string, defaultMetrics: string[]) {
  trackEvent('data_card_metrics_reset', {
    module_id: moduleId,
    default_metrics: defaultMetrics,
  });
}

/**
 * Track when a user closes the configuration modal without saving
 */
export function trackConfigModalCancelled(moduleId: string) {
  trackEvent('data_card_config_cancelled', {
    module_id: moduleId,
  });
}

/**
 * Track when data cards are viewed (page load)
 */
export function trackCardsViewed(moduleId: string, visibleMetrics: string[]) {
  trackEvent('data_cards_viewed', {
    module_id: moduleId,
    visible_metrics: visibleMetrics,
    card_count: visibleMetrics.length,
  });
}

/**
 * Track when a data card fails to load
 */
export function trackCardError(moduleId: string, metricId: string, error: string) {
  trackEvent('data_card_error', {
    module_id: moduleId,
    metric_id: metricId,
    error_message: error,
  });
}

/**
 * Get all tracked events from sessionStorage (for debugging)
 */
export function getTrackedEvents(): DataCardEvent[] {
  try {
    return JSON.parse(sessionStorage.getItem('dataCardEvents') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear all tracked events from sessionStorage
 */
export function clearTrackedEvents() {
  try {
    sessionStorage.removeItem('dataCardEvents');
  } catch {
    // Silently fail
  }
}

/**
 * Export events as CSV for analysis
 */
export function exportEventsAsCSV(): string {
  const events = getTrackedEvents();
  
  if (events.length === 0) {
    return 'No events to export';
  }
  
  // CSV header
  const headers = ['timestamp', 'event', 'module_id', 'metric_id', 'destination', 'properties'];
  const rows = events.map(event => [
    event.timestamp,
    event.event,
    event.properties.module_id || '',
    event.properties.metric_id || '',
    event.properties.destination || '',
    JSON.stringify(event.properties),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csv;
}

/**
 * Download events as CSV file
 */
export function downloadEventsAsCSV() {
  const csv = exportEventsAsCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `data-card-events-${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
