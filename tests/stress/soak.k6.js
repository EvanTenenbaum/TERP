/**
 * TERP Staging Stress Test — Soak Profile
 *
 * Sustained load test to detect memory leaks, connection pool leaks,
 * or latency degradation over time.
 *
 * Profile:
 *   - 20 virtual users (ramp-up: 1 minute to reach 20 VU)
 *   - 10 minutes total duration
 *   - Pass: p95 < 1000ms AND error rate < 2% AND latency trend stable
 *
 * IMPORTANT: BullMQ is NOT implemented — no queue endpoints are tested.
 * MySQL connection pool is 25 max — 20 VU is BELOW the pool limit by design.
 * The soak test should NOT trigger pool saturation under normal conditions.
 * If pool saturation occurs during a soak run, that is a bug (leak).
 *
 * Usage:
 *   k6 run tests/stress/soak.k6.js
 *   k6 run --env STRESS_TARGET_URL=https://terp-staging-yicld.ondigitalocean.app tests/stress/soak.k6.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Target URL ────────────────────────────────────────────────────────────────
const TARGET_URL =
  __ENV.STRESS_TARGET_URL ||
  "https://terp-staging-yicld.ondigitalocean.app";

const AUTH_TOKEN = __ENV.STRESS_AUTH_TOKEN || "";

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate("stress_error_rate");
const apiLatency = new Trend("stress_api_latency_ms");
// Track 503s — during soak, these should NOT occur (unlike peak test)
const poolSaturationEvents = new Counter("mysql_pool_saturation_events");

// ── Profile definition ────────────────────────────────────────────────────────
// Gradual ramp-up, sustained load, then ramp-down.
// 20 VU is deliberately below the 25-connection MySQL pool limit.
export const options = {
  stages: [
    { duration: "1m", target: 20 },   // Ramp up over 1 minute
    { duration: "9m", target: 20 },   // Sustain 20 VU for 9 minutes
    { duration: "0s", target: 0 },    // Stop
  ],

  thresholds: {
    // Latency threshold — must stay stable throughout
    http_req_duration: ["p(95)<1000"],
    // Very low error tolerance — soak should be clean
    stress_error_rate: ["rate<0.02"],
    http_req_failed: ["rate<0.02"],
    // Zero pool saturation events expected during soak
    // (soft warning, not a hard fail — but investigate if > 0)
  },

  tags: {
    profile: "soak",
    target: TARGET_URL,
    mysql_pool_limit: "25",
    expected_vu_below_pool: "true",
  },
};

// ── Latency window tracking for trend detection ───────────────────────────────
// We sample latency in windows to detect upward drift.
// An upward trend (>20% increase from start to end) indicates a leak.
const WINDOW_SIZE = 50; // requests per window
let windowSamples = [];
const windowAverages = [];

function recordLatencyWindow(durationMs) {
  windowSamples.push(durationMs);
  if (windowSamples.length >= WINDOW_SIZE) {
    const avg =
      windowSamples.reduce((a, b) => a + b, 0) / windowSamples.length;
    windowAverages.push(avg);
    windowSamples = [];
  }
}

// ── Common headers ────────────────────────────────────────────────────────────
function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

// ── Scenario: Health check ────────────────────────────────────────────────────
function checkHealth() {
  const response = http.get(`${TARGET_URL}/api/health`, {
    headers: getHeaders(),
    tags: { name: "health-check" },
    timeout: "15s",
  });

  const ok = check(response, {
    "health: status 200": (r) => r.status === 200,
    "health: response time < 1000ms": (r) => r.timings.duration < 1000,
  });

  if (response.status === 503) {
    poolSaturationEvents.add(1);
    console.warn(
      `Pool saturation event during SOAK at ${new Date().toISOString()} — this should NOT occur at 20 VU`
    );
  }

  errorRate.add(!ok);
  apiLatency.add(response.timings.duration, { endpoint: "health" });
  recordLatencyWindow(response.timings.duration);
}

// ── Scenario: Root page ───────────────────────────────────────────────────────
function checkRootPage() {
  const response = http.get(`${TARGET_URL}/`, {
    headers: { Accept: "text/html" },
    tags: { name: "root-page" },
    redirects: 5,
    timeout: "20s",
  });

  const ok = check(response, {
    "root: not a 5xx": (r) => r.status < 500,
    "root: response time < 2000ms": (r) => r.timings.duration < 2000,
  });

  errorRate.add(!ok);
  apiLatency.add(response.timings.duration, { endpoint: "root" });
  recordLatencyWindow(response.timings.duration);
}

// ── Scenario: API endpoint probe ──────────────────────────────────────────────
function checkAPIProbe() {
  const response = http.get(`${TARGET_URL}/api/health`, {
    headers: getHeaders(),
    tags: { name: "api-probe" },
    timeout: "10s",
  });

  const ok = check(response, {
    "api: response received": (r) => r.status > 0,
    "api: not a crash": (r) => r.status < 500 || r.status === 503,
  });

  if (response.status === 503) {
    poolSaturationEvents.add(1);
  }

  errorRate.add(response.status >= 500 && response.status !== 503);
  apiLatency.add(response.timings.duration, { endpoint: "api-probe" });
  recordLatencyWindow(response.timings.duration);
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function () {
  const roll = Math.random();

  if (roll < 0.5) {
    // 50% health checks — primary soak indicator
    checkHealth();
  } else if (roll < 0.75) {
    // 25% root page loads
    checkRootPage();
  } else {
    // 25% API probes
    checkAPIProbe();
  }

  // Realistic think time — 20 VU with 2-4s think time = ~5-10 req/s effective
  sleep(2 + Math.random() * 2); // 2-4 second think time
}

// ── Summary ───────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const p50 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values["p(50)"]);
  const p95 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values["p(95)"]);
  const p99 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values["p(99)"]);
  const errorRateVal = (data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.rate);
  const rps = (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.rate);
  const saturationEvents =
    (data.metrics.mysql_pool_saturation_events && data.metrics.mysql_pool_saturation_events.values && data.metrics.mysql_pool_saturation_events.values.count) || 0;
  const totalRequests = (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.count) || 0;

  // Trend analysis — compare first and last window averages
  let trendAnalysis = "insufficient data";
  let trendPassed = true;
  if (windowAverages.length >= 2) {
    const firstAvg = windowAverages[0];
    const lastAvg = windowAverages[windowAverages.length - 1];
    const driftPct = ((lastAvg - firstAvg) / firstAvg) * 100;
    trendAnalysis = `${driftPct >= 0 ? "+" : ""}${driftPct.toFixed(1)}% drift`;
    trendPassed = driftPct < 20; // Fail if >20% latency growth over soak period
  }

  const latencyPassed = p95 !== undefined && p95 < 1000;
  const errorsPassed = errorRateVal !== undefined && errorRateVal < 0.02;
  const passed = latencyPassed && errorsPassed && trendPassed;

  console.log("\n══════════════════════════════════════");
  console.log("  SOAK TEST SUMMARY");
  console.log("══════════════════════════════════════");
  console.log(`  Profile:         soak (20 VU, 10min)`);
  console.log(`  Target:          ${TARGET_URL}`);
  console.log(`  MySQL pool:      25 connections max (VU < pool limit)`);
  console.log(`  Total requests:  ${totalRequests}`);
  console.log(`  p50 latency:     ${p50 !== undefined ? p50.toFixed(1) + "ms" : "N/A"}`);
  console.log(`  p95 latency:     ${p95 !== undefined ? p95.toFixed(1) + "ms" : "N/A"} (threshold: <1000ms)`);
  console.log(`  p99 latency:     ${p99 !== undefined ? p99.toFixed(1) + "ms" : "N/A"}`);
  console.log(`  Latency trend:   ${trendAnalysis} (threshold: <20% drift)`);
  console.log(`  Error rate:      ${errorRateVal !== undefined ? (errorRateVal * 100).toFixed(2) + "%" : "N/A"} (threshold: <2%)`);
  console.log(`  Pool events:     ${saturationEvents} 503s (expected: 0 at 20 VU)`);
  console.log(`  Requests/s:      ${rps !== undefined ? rps.toFixed(1) : "N/A"}`);
  console.log(`  Result:          ${passed ? "PASSED" : "FAILED"}`);
  console.log("══════════════════════════════════════\n");

  if (saturationEvents > 0) {
    console.log(`  WARNING: ${saturationEvents} pool saturation events during soak.`);
    console.log("  At 20 VU (below the 25-connection pool limit), these should NOT occur.");
    console.log("  This may indicate a connection leak. Escalate to Evan.\n");
  }

  if (!trendPassed) {
    console.log("  WARNING: Latency trend indicates possible memory or resource leak.");
    console.log("  Escalate before production promotion.\n");
  }

  return {
    stdout: `Soak test ${passed ? "PASSED" : "FAILED"} — p95: ${(p95 && p95.toFixed)(1)}ms, errors: ${((errorRateVal || 0) * 100).toFixed(2)}%, trend: ${trendAnalysis}, pool events: ${saturationEvents}\n`,
  };
}
