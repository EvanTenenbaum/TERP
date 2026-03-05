/**
 * TERP Staging Stress Test — Smoke Profile
 *
 * Quick validation that staging is healthy before deeper testing.
 *
 * Profile:
 *   - 10 virtual users
 *   - 30 seconds duration
 *   - Pass: p95 < 500ms AND error rate < 1%
 *
 * IMPORTANT: BullMQ is NOT implemented — no queue endpoints are tested.
 * MySQL connection pool is 25 max — 10 VU is well under the limit.
 *
 * Usage:
 *   k6 run tests/stress/smoke.k6.js
 *   k6 run --env STRESS_TARGET_URL=https://terp-staging-yicld.ondigitalocean.app tests/stress/smoke.k6.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Target URL ────────────────────────────────────────────────────────────────
const TARGET_URL =
  __ENV.STRESS_TARGET_URL ||
  "https://terp-staging-yicld.ondigitalocean.app";

const AUTH_TOKEN = __ENV.STRESS_AUTH_TOKEN || "";

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate("stress_error_rate");
const apiLatency = new Trend("stress_api_latency_ms");

// ── Profile definition ────────────────────────────────────────────────────────
export const options = {
  vus: 10,
  duration: "30s",

  thresholds: {
    // p95 latency must be under 500ms
    http_req_duration: ["p(95)<500"],
    // Error rate must be under 1%
    stress_error_rate: ["rate<0.01"],
    // All requests must complete without too many failures
    http_req_failed: ["rate<0.01"],
  },

  // Tag this run for artifact identification
  tags: {
    profile: "smoke",
    target: TARGET_URL,
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
  });

  const ok = check(response, {
    "health: status 200": (r) => r.status === 200,
    "health: response time < 500ms": (r) => r.timings.duration < 500,
  });

  errorRate.add(!ok);
  apiLatency.add(response.timings.duration, { endpoint: "health" });

  return ok;
}

// ── Scenario: Unauthenticated root page ───────────────────────────────────────
function checkRootPage() {
  const response = http.get(`${TARGET_URL}/`, {
    headers: { Accept: "text/html" },
    tags: { name: "root-page" },
    // Follow redirects — auth redirect is expected
    redirects: 5,
  });

  // 200 (SPA served), 302 (auth redirect), or 401 are all acceptable
  const ok = check(response, {
    "root: not a server error": (r) => r.status < 500,
    "root: response time < 1000ms": (r) => r.timings.duration < 1000,
  });

  errorRate.add(!ok);
  apiLatency.add(response.timings.duration, { endpoint: "root" });

  return ok;
}

// ── Scenario: API health (alternative paths) ──────────────────────────────────
function checkApiEndpoints() {
  const paths = ["/api/health", "/health"];

  let anyOk = false;
  for (const path of paths) {
    const response = http.get(`${TARGET_URL}${path}`, {
      headers: getHeaders(),
      tags: { name: `api${path.replace(/\//g, "-")}` },
    });

    if (response.status === 200) {
      anyOk = true;
      apiLatency.add(response.timings.duration, { endpoint: path });
      break;
    }
  }

  errorRate.add(!anyOk);
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function () {
  // Distribute load across different scenario types
  const scenarios = [checkHealth, checkRootPage, checkApiEndpoints];
  const scenarioFn = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenarioFn();

  // Realistic user pacing — not hammering at full speed
  sleep(1 + Math.random() * 2); // 1-3 second think time
}

// ── Summary ───────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values["p(95)"]);
  const errorRateVal = (data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.rate);
  const rps = (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.rate);

  const passed =
    p95 !== undefined &&
    p95 < 500 &&
    errorRateVal !== undefined &&
    errorRateVal < 0.01;

  console.log("\n══════════════════════════════════════");
  console.log("  SMOKE TEST SUMMARY");
  console.log("══════════════════════════════════════");
  console.log(`  Profile:    smoke (10 VU, 30s)`);
  console.log(`  Target:     ${TARGET_URL}`);
  console.log(`  p95 latency: ${p95 !== undefined ? p95.toFixed(1) + "ms" : "N/A"} (threshold: <500ms)`);
  console.log(`  Error rate:  ${errorRateVal !== undefined ? (errorRateVal * 100).toFixed(2) + "%" : "N/A"} (threshold: <1%)`);
  console.log(`  Requests/s:  ${rps !== undefined ? rps.toFixed(1) : "N/A"}`);
  console.log(`  Result:      ${passed ? "PASSED" : "FAILED"}`);
  console.log("══════════════════════════════════════\n");

  return {
    stdout: `Smoke test ${passed ? "PASSED" : "FAILED"} — p95: ${p95 ? p95.toFixed(1) : "N/A"}ms, errors: ${((errorRateVal || 0) * 100).toFixed(2)}%\n`,
  };
}
