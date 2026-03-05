import http from "k6/http";
import { check, sleep } from "k6";

// Contract reference: docs/testing/STRESS_TESTING_RUNBOOK.md

const TARGET_URL = __ENV.STRESS_TARGET_URL || "https://terp-staging-yicld.ondigitalocean.app";
const AUTH_TOKEN = __ENV.STRESS_AUTH_TOKEN || "";
const VUS = Number(__ENV.STRESS_VUS || 8);
const DURATION = __ENV.STRESS_DURATION || "30s";
const RAMP = __ENV.STRESS_RAMP || "10s";
const P95_MS = Number(__ENV.STRESS_P95_MS || 500);
const ERROR_RATE = Number(__ENV.STRESS_ERROR_RATE || 0.01);
const ABORT_ON_FAIL = (__ENV.STRESS_ABORT_ON_FAIL || "true") === "true";

export const options = {
  stages: [
    { duration: RAMP, target: VUS },
    { duration: DURATION, target: VUS },
    { duration: "10s", target: 0 }
  ],
  thresholds: {
    http_req_duration: [{ threshold: `p(95)<${P95_MS}`, abortOnFail: ABORT_ON_FAIL }],
    http_req_failed: [{ threshold: `rate<${ERROR_RATE}`, abortOnFail: ABORT_ON_FAIL }]
  },
  discardResponseBodies: true,
  noConnectionReuse: false,
  tags: {
    lane: "api-load",
    profile_vus: String(VUS)
  }
};

function headersJson() {
  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "terp-stress-k6/1.0"
  };
  if (AUTH_TOKEN) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

function expectedStatusesCallback(expectedStatuses) {
  const statuses = Array.from(new Set([...expectedStatuses, 503]));
  return http.expectedStatuses(...statuses);
}

function hit(path, expectedStatuses) {
  const res = http.get(`${TARGET_URL}${path}`, {
    headers: headersJson(),
    timeout: "20s",
    responseCallback: expectedStatusesCallback(expectedStatuses)
  });
  check(res, {
    [`${path} status acceptable`]: r => expectedStatuses.includes(r.status) || r.status === 503
  });
}

export default function () {
  const roll = Math.random();

  // Weighted mix:
  // 35% health/status, 25% inventory, 20% orders/sales, 15% clients/relationships, 5% auth-safe probe
  if (roll < 0.35) {
    hit("/api/health", [200, 401, 404]);
  } else if (roll < 0.60) {
    hit("/inventory", [200, 302, 401, 404]);
  } else if (roll < 0.80) {
    hit("/sales", [200, 302, 401, 404]);
  } else if (roll < 0.95) {
    hit("/relationships", [200, 302, 401, 404]);
  } else {
    // Auth-safe read probe to ensure no write mutation during stress run
    hit("/api/trpc/health.ping", [200, 401, 404]);
  }

  sleep(0.5 + Math.random());
}
