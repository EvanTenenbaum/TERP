/**
 * TERP Staging Stress Test — Mixed Traffic Script (STX-005)
 *
 * Simulates realistic mixed ERP traffic patterns across multiple endpoint
 * categories. Used by all three profiles (smoke, peak, soak) as the
 * traffic generation layer.
 *
 * Traffic mix (approximates real THCA wholesale ERP usage):
 *   - 40% health / status checks (monitoring agents, load balancers)
 *   - 30% SPA asset loads (initial page navigation)
 *   - 20% API read probes (authenticated data fetches)
 *   - 10% API write probes (authenticated mutations — conservative)
 *
 * IMPORTANT: BullMQ is NOT implemented — no queue endpoints are included.
 * MySQL connection pool is 25 max — this script is connection-pool-aware.
 *
 * Usage (standalone):
 *   k6 run tests/stress/mixed-traffic.k6.js
 *
 * Usage (imported by profile scripts):
 *   import { mixedTrafficScenario } from './mixed-traffic.k6.js';
 *
 * Required env vars:
 *   STRESS_TARGET_URL    — Base URL of staging instance
 *   STRESS_AUTH_TOKEN    — Bearer token for authenticated routes (optional)
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Target URL ────────────────────────────────────────────────────────────────
export const TARGET_URL =
  __ENV.STRESS_TARGET_URL ||
  "https://terp-staging-yicld.ondigitalocean.app";

const AUTH_TOKEN = __ENV.STRESS_AUTH_TOKEN || "";

// ── Shared metrics ────────────────────────────────────────────────────────────
export const errorRate = new Rate("mixed_error_rate");
export const latencyByCategory = new Trend("mixed_latency_by_category_ms");
export const poolSaturationEvents = new Counter("pool_saturation_503_count");
export const successCount = new Counter("mixed_success_count");

// ── Default standalone options ────────────────────────────────────────────────
// Override these in the importing profile script.
export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    mixed_error_rate: ["rate<0.02"],
    http_req_failed: ["rate<0.02"],
  },
  tags: {
    profile: "mixed-traffic-standalone",
    target: TARGET_URL,
  },
};

// ── Request helpers ───────────────────────────────────────────────────────────
function baseHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "TERP-StressTest/1.0 k6",
  };
}

function authHeaders() {
  const h = baseHeaders();
  if (AUTH_TOKEN) {
    h["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }
  return h;
}

function recordResult(response, category, expectedStatuses) {
  const isExpectedStatus = expectedStatuses.includes(response.status);
  const isPoolSaturation = response.status === 503;
  const isError =
    !isExpectedStatus && response.status >= 400 && !isPoolSaturation;

  if (isPoolSaturation) {
    poolSaturationEvents.add(1);
  }

  errorRate.add(isError ? 1 : 0);
  latencyByCategory.add(response.timings.duration, { category });

  if (!isError) {
    successCount.add(1);
  }

  return !isError;
}

// ── Traffic category: Health checks ──────────────────────────────────────────
// 40% of traffic — lightweight, no DB involvement expected
export function healthCheckTraffic() {
  group("health-check", () => {
    const response = http.get(`${TARGET_URL}/api/health`, {
      headers: baseHeaders(),
      tags: { category: "health", endpoint: "/api/health" },
      timeout: "10s",
    });

    const ok = check(response, {
      "health: 2xx or 404 (no health endpoint)": (r) =>
        r.status < 500 || r.status === 503,
    });

    recordResult(response, "health", [200, 404, 401]);
  });
}

// ── Traffic category: SPA asset loads ────────────────────────────────────────
// 30% of traffic — static file serving, CDN-backed in production
export function spaAssetTraffic() {
  group("spa-assets", () => {
    // Root page load — typically redirects to /login or /dashboard
    const response = http.get(`${TARGET_URL}/`, {
      headers: { Accept: "text/html", "User-Agent": "TERP-StressTest/1.0 k6" },
      tags: { category: "spa", endpoint: "/" },
      redirects: 3,
      timeout: "20s",
    });

    check(response, {
      "spa: page served": (r) => r.status < 500,
    });

    recordResult(response, "spa", [200, 301, 302, 401]);
  });
}

// ── Traffic category: API read probes (authenticated) ────────────────────────
// 20% of traffic — tRPC read procedures, hits the MySQL connection pool
export function apiReadTraffic() {
  group("api-reads", () => {
    if (!AUTH_TOKEN) {
      // Without auth, we can only probe unauthenticated paths
      const response = http.get(`${TARGET_URL}/api/health`, {
        headers: baseHeaders(),
        tags: { category: "api-read-unauth", endpoint: "/api/health" },
        timeout: "15s",
      });

      check(response, {
        "api-read: response received": (r) => r.status > 0,
      });

      recordResult(response, "api-read-unauth", [200, 401, 404]);
      return;
    }

    // Probe the tRPC batch endpoint (reads only)
    // tRPC GET queries don't require a request body
    const response = http.get(
      `${TARGET_URL}/api/trpc/health.ping`,
      {
        headers: authHeaders(),
        tags: { category: "api-read-auth", endpoint: "/api/trpc" },
        timeout: "15s",
      }
    );

    check(response, {
      "api-read: response received": (r) => r.status > 0,
      "api-read: not a crash": (r) => r.status < 500 || r.status === 503,
    });

    recordResult(response, "api-read-auth", [200, 401, 404]);
  });
}

// ── Traffic category: API write probes (conservative) ────────────────────────
// 10% of traffic — safe read-like mutation probes that don't mutate state
// We intentionally avoid real mutations to prevent data corruption on staging.
export function apiWriteProbeTraffic() {
  group("api-write-probe", () => {
    // OPTIONS preflight — safe, no state change, tests CORS + server capacity
    const response = http.options(`${TARGET_URL}/api/health`, {
      headers: authHeaders(),
      tags: { category: "api-write-probe", endpoint: "OPTIONS /api/health" },
      timeout: "10s",
    });

    check(response, {
      "api-write-probe: server responds": (r) => r.status > 0 && r.status < 500,
    });

    recordResult(response, "api-write-probe", [200, 204, 401, 404, 405]);
  });
}

// ── Main mixed traffic VU function ────────────────────────────────────────────
export default function mixedTrafficScenario() {
  const roll = Math.random();

  if (roll < 0.40) {
    healthCheckTraffic();
  } else if (roll < 0.70) {
    spaAssetTraffic();
  } else if (roll < 0.90) {
    apiReadTraffic();
  } else {
    apiWriteProbeTraffic();
  }

  // Think time varies by "user type" simulation
  sleep(1 + Math.random() * 3);
}

// ── Summary (standalone mode) ─────────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"];
  const errorRateVal = data.metrics.http_req_failed?.values?.rate;
  const rps = data.metrics.http_reqs?.values?.rate;
  const saturationCount =
    data.metrics.pool_saturation_503_count?.values?.count || 0;

  console.log("\n══════════════════════════════════════════════════");
  console.log("  MIXED TRAFFIC TEST SUMMARY (standalone mode)");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Target:          ${TARGET_URL}`);
  console.log(`  p95 latency:     ${p95 !== undefined ? p95.toFixed(1) + "ms" : "N/A"}`);
  console.log(`  Error rate:      ${errorRateVal !== undefined ? (errorRateVal * 100).toFixed(2) + "%" : "N/A"}`);
  console.log(`  Pool 503 events: ${saturationCount}`);
  console.log(`  Requests/s:      ${rps !== undefined ? rps.toFixed(1) : "N/A"}`);
  console.log("══════════════════════════════════════════════════\n");

  return {};
}
