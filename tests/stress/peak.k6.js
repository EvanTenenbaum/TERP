/**
 * TERP Staging Stress Test — Peak Profile
 *
 * Maximum load test to find the breaking point under burst traffic.
 * This INTENTIONALLY exceeds the MySQL connection pool (25 connections)
 * to verify that queuing (not crashing) occurs.
 *
 * Profile:
 *   - 50 virtual users (ramp-up: 30s to reach 50 VU)
 *   - 2 minutes total duration
 *   - Pass: p95 < 2000ms AND error rate < 5%
 *
 * IMPORTANT: BullMQ is NOT implemented — no queue endpoints are tested.
 * MySQL connection pool is 25 max — 50 VU WILL trigger connection queuing.
 * This is expected behavior. The test validates graceful degradation,
 * not absence of queuing.
 *
 * Usage:
 *   k6 run tests/stress/peak.k6.js
 *   k6 run --env STRESS_TARGET_URL=https://terp-staging-yicld.ondigitalocean.app tests/stress/peak.k6.js
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
const poolSaturationEvents = new Counter("mysql_pool_saturation_events");

// ── Profile definition ────────────────────────────────────────────────────────
// Ramp up to 50 VU over 30s, sustain for 1m30s, then ramp down.
// Total: 2 minutes with gradual pressure increase.
export const options = {
  stages: [
    { duration: "30s", target: 50 }, // Ramp up to 50 VU
    { duration: "1m30s", target: 50 }, // Sustain peak load
    { duration: "0s", target: 0 }, // Immediate stop (k6 handles cleanup)
  ],

  thresholds: {
    // p95 latency must be under 2000ms (queuing is expected at this load)
    http_req_duration: ["p(95)<2000"],
    // Error rate must be under 5% (some queue overflow is acceptable)
    stress_error_rate: ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },

  tags: {
    profile: "peak",
    target: TARGET_URL,
    mysql_pool_limit: "25",
  },
};

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
    timeout: "10s",
  });

  const ok = check(response, {
    "health: not a server crash": (r) => r.status < 500 || r.status === 503,
    "health: response received": (r) => r.status > 0,
  });

  // Track pool saturation events (503 = connection pool likely exhausted)
  if (response.status === 503) {
    poolSaturationEvents.add(1);
  }

  errorRate.add(response.status >= 500 && response.status !== 503);
  apiLatency.add(response.timings.duration, { endpoint: "health" });
}

// ── Scenario: Root SPA load ───────────────────────────────────────────────────
function checkSPALoad() {
  const response = http.get(`${TARGET_URL}/`, {
    headers: { Accept: "text/html" },
    tags: { name: "spa-root" },
    redirects: 5,
    timeout: "15s",
  });

  const ok = check(response, {
    "spa: not a 5xx": (r) => r.status < 500,
  });

  errorRate.add(!ok);
  apiLatency.add(response.timings.duration, { endpoint: "root" });
}

// ── Scenario: API endpoints ───────────────────────────────────────────────────
function checkAPIEndpoints() {
  const endpoints = ["/api/health", "/health"];

  for (const endpoint of endpoints) {
    const response = http.get(`${TARGET_URL}${endpoint}`, {
      headers: getHeaders(),
      tags: { name: `api-${endpoint.slice(1).replace(/\//g, "-")}` },
      timeout: "10s",
    });

    if (response.status > 0) {
      apiLatency.add(response.timings.duration, { endpoint });

      if (response.status === 503) {
        poolSaturationEvents.add(1);
      }

      // Only count hard failures (not queue-related 503s)
      if (response.status >= 500 && response.status !== 503) {
        errorRate.add(1);
      } else {
        errorRate.add(0);
      }
      return;
    }
  }

  // Connection failure
  errorRate.add(1);
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function () {
  // Mix of request types simulating real user traffic patterns
  const roll = Math.random();

  if (roll < 0.4) {
    // 40% health checks (lightweight, many concurrent)
    checkHealth();
  } else if (roll < 0.7) {
    // 30% SPA loads (static assets, CDN-cached)
    checkSPALoad();
  } else {
    // 30% API endpoint probes
    checkAPIEndpoints();
  }

  // Shorter think time at peak — simulates burst traffic
  sleep(0.5 + Math.random() * 1.5); // 0.5-2s think time
}

// ── Summary ───────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values["p(95)"]);
  const p99 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values["p(99)"]);
  const p50 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values["p(50)"]);
  const errorRateVal = (data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.rate);
  const rps = (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.rate);
  const saturationEvents = (data.metrics.mysql_pool_saturation_events && data.metrics.mysql_pool_saturation_events.values && data.metrics.mysql_pool_saturation_events.values.count) || 0;

  const passed =
    p95 !== undefined &&
    p95 < 2000 &&
    errorRateVal !== undefined &&
    errorRateVal < 0.05;

  // Calculate p99/p50 ratio — high ratio indicates connection pool queuing
  const queueRatio = p50 && p99 ? (p99 / p50).toFixed(1) : "N/A";

  console.log("\n══════════════════════════════════════");
  console.log("  PEAK TEST SUMMARY");
  console.log("══════════════════════════════════════");
  console.log(`  Profile:         peak (50 VU, 2min)`);
  console.log(`  Target:          ${TARGET_URL}`);
  console.log(`  MySQL pool:      25 connections max`);
  console.log(`  p50 latency:     ${p50 !== undefined ? p50.toFixed(1) + "ms" : "N/A"}`);
  console.log(`  p95 latency:     ${p95 !== undefined ? p95.toFixed(1) + "ms" : "N/A"} (threshold: <2000ms)`);
  console.log(`  p99 latency:     ${p99 !== undefined ? p99.toFixed(1) + "ms" : "N/A"}`);
  console.log(`  p99/p50 ratio:   ${queueRatio}x (>3x suggests pool saturation)`);
  console.log(`  Error rate:      ${errorRateVal !== undefined ? (errorRateVal * 100).toFixed(2) + "%" : "N/A"} (threshold: <5%)`);
  console.log(`  Pool events:     ${saturationEvents} 503 responses (expected under 50 VU)`);
  console.log(`  Requests/s:      ${rps !== undefined ? rps.toFixed(1) : "N/A"}`);
  console.log(`  Result:          ${passed ? "PASSED" : "FAILED"}`);
  console.log("══════════════════════════════════════\n");

  if (saturationEvents > 0) {
    console.log(`  NOTE: ${saturationEvents} pool saturation events detected.`);
    console.log("  This is EXPECTED at 50 VU with a 25-connection pool.");
    console.log("  Ensure 503s were transient and recovery occurred.\n");
  }

  return {
    stdout: `Peak test ${passed ? "PASSED" : "FAILED"} — p95: ${(p95 && p95.toFixed)(1)}ms, errors: ${((errorRateVal || 0) * 100).toFixed(2)}%, pool events: ${saturationEvents}\n`,
  };
}
