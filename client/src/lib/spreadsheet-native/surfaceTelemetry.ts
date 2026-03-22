/**
 * Track when a user falls back from sheet-native to classic.
 * This is the metric that gates default flips: <5% fallback over 2 weeks.
 * Currently logs structured data; wire to analytics endpoint when available.
 */
export function trackFallbackToClassic(module: string, path: string) {
  console.info("[surface-fallback]", {
    module,
    path,
    timestamp: new Date().toISOString(),
  });
}
