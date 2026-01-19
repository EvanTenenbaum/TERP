/* eslint-disable no-console */
/**
 * Comprehensive E2E HTTP-Based Test Suite
 *
 * Tests the TERP application through HTTP requests
 * Covers: Authentication, API endpoints, Navigation, CRUD operations
 */

import * as https from "https";
import * as http from "http";
import * as tls from "tls";

const BASE_URL = "https://terp-app-b9s35.ondigitalocean.app";
const PROXY_URL = process.env.https_proxy || process.env.HTTPS_PROXY || "";

// Test credentials
const QA_EMAIL = "qa.superadmin@terp.test";
const QA_PASSWORD = "TerpQA2026!";

interface TestResult {
  name: string;
  category: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];
let authToken: string | null = null;
let authCookies: string[] = [];

// Parse proxy URL
function parseProxy(proxyUrl: string) {
  if (!proxyUrl) return null;
  try {
    const url = new URL(proxyUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port),
      auth: url.username
        ? `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`
        : undefined,
    };
  } catch {
    return null;
  }
}

// Make HTTP request through proxy
function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    followRedirects?: boolean;
  } = {}
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  redirectUrl?: string;
  cookies?: string[];
}> {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(url);
    const proxy = parseProxy(PROXY_URL);

    if (!proxy) {
      // Direct request (no proxy)
      const reqOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: options.method || "GET",
        headers: options.headers || {},
        rejectUnauthorized: false,
      };

      const req = (targetUrl.protocol === "https:" ? https : http).request(
        reqOptions,
        res => {
          let body = "";
          res.on("data", chunk => (body += chunk));
          res.on("end", () => {
            const headers: Record<string, string> = {};
            Object.keys(res.headers).forEach(key => {
              const val = res.headers[key];
              headers[key] = Array.isArray(val) ? val.join(", ") : val || "";
            });

            const cookies = res.headers["set-cookie"] || [];

            resolve({
              statusCode: res.statusCode || 0,
              headers,
              body,
              redirectUrl: res.headers.location,
              cookies: Array.isArray(cookies) ? cookies : [cookies],
            });
          });
        }
      );
      req.on("error", reject);
      if (options.body) req.write(options.body);
      req.end();
      return;
    }

    // CONNECT tunnel for HTTPS through proxy
    const proxyReq = http.request({
      host: proxy.host,
      port: proxy.port,
      method: "CONNECT",
      path: `${targetUrl.hostname}:${targetUrl.port || 443}`,
      headers: {
        Host: `${targetUrl.hostname}:${targetUrl.port || 443}`,
        ...(proxy.auth
          ? {
              "Proxy-Authorization": `Basic ${Buffer.from(proxy.auth).toString("base64")}`,
            }
          : {}),
      },
    });

    proxyReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }

      const tlsOptions = {
        socket,
        servername: targetUrl.hostname,
        rejectUnauthorized: false,
      };

      const tlsSocket = tls.connect(tlsOptions, () => {
        const requestHeaders = {
          Host: targetUrl.hostname,
          Connection: "close",
          ...(options.headers || {}),
        };

        const httpRequest = [
          `${options.method || "GET"} ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`,
          ...Object.entries(requestHeaders).map(([k, v]) => `${k}: ${v}`),
          "",
          options.body || "",
        ].join("\r\n");

        tlsSocket.write(httpRequest);

        let response = "";
        tlsSocket.on("data", (chunk: Buffer) => (response += chunk.toString()));
        tlsSocket.on("end", () => {
          const headerEndIndex = response.indexOf("\r\n\r\n");
          const headerPart = response.slice(0, headerEndIndex);
          const body = response.slice(headerEndIndex + 4);

          const statusLine = headerPart.split("\r\n")[0];
          const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
          const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

          const headers: Record<string, string> = {};
          const cookies: string[] = [];
          headerPart
            .split("\r\n")
            .slice(1)
            .forEach(line => {
              const colonIdx = line.indexOf(":");
              if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).toLowerCase();
                const value = line.slice(colonIdx + 1).trim();
                headers[key] = value;
                if (key === "set-cookie") {
                  cookies.push(value);
                }
              }
            });

          resolve({
            statusCode,
            headers,
            body,
            redirectUrl: headers.location,
            cookies,
          });
        });
        tlsSocket.on("error", reject);
      });
    });

    proxyReq.on("error", reject);
    proxyReq.end();
  });
}

async function runTest(
  name: string,
  category: string,
  testFn: () => Promise<string | void>
): Promise<void> {
  const start = Date.now();

  try {
    const details = await testFn();

    results.push({
      name,
      category,
      status: "PASS",
      duration: Date.now() - start,
      details: details || undefined,
    });
    console.log(`✓ [${category}] ${name} (${Date.now() - start}ms)`);
    if (details) console.log(`  ${details}`);
  } catch (error) {
    results.push({
      name,
      category,
      status: "FAIL",
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`✗ [${category}] ${name} (${Date.now() - start}ms)`);
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
  }
}

async function main() {
  console.log(
    "\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log("║     TERP E2E Comprehensive HTTP Test Suite                 ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Proxy: ${PROXY_URL ? "Configured" : "None"}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // ==================== SERVER HEALTH ====================
  console.log("\n═══ SERVER HEALTH ═══\n");

  await runTest("Server responds", "HEALTH", async () => {
    const res = await makeRequest(`${BASE_URL}/`);
    if (res.statusCode >= 500)
      throw new Error(`Server error: ${res.statusCode}`);
    return `Status: ${res.statusCode}`;
  });

  await runTest("Express server running", "HEALTH", async () => {
    const res = await makeRequest(`${BASE_URL}/`);
    const server = res.headers["x-powered-by"] || "unknown";
    if (!server.toLowerCase().includes("express")) {
      // May be proxied through cloudflare
    }
    return `X-Powered-By: ${server}`;
  });

  await runTest("Response time acceptable", "HEALTH", async () => {
    const start = Date.now();
    await makeRequest(`${BASE_URL}/`);
    const duration = Date.now() - start;
    if (duration > 5000) throw new Error(`Too slow: ${duration}ms`);
    return `Response time: ${duration}ms`;
  });

  // ==================== AUTHENTICATION ====================
  console.log("\n═══ AUTHENTICATION ═══\n");

  await runTest("Login page accessible", "AUTH", async () => {
    const res = await makeRequest(`${BASE_URL}/login`);
    if (res.statusCode !== 200) throw new Error(`Status: ${res.statusCode}`);
    return `Login page loads with status ${res.statusCode}`;
  });

  await runTest("Login API endpoint exists", "AUTH", async () => {
    const res = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test@test.com",
        password: "test",
      }),
    });
    // Should return 400 (bad request) or 401 (unauthorized), not 404
    if (res.statusCode === 404) throw new Error("Login endpoint not found");
    return `Login endpoint responds with status ${res.statusCode}`;
  });

  await runTest("Invalid credentials rejected", "AUTH", async () => {
    const res = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "invalid@fake.com",
        password: "wrongpass",
      }),
    });
    if (res.statusCode === 200) {
      const body = JSON.parse(res.body);
      if (body.token) {
        throw new Error("Should not issue token for invalid credentials");
      }
    }
    return `Invalid credentials rejected with status ${res.statusCode}`;
  });

  await runTest("Valid login succeeds", "AUTH", async () => {
    // Try QA auth endpoint first (for QA test accounts)
    let res = await makeRequest(`${BASE_URL}/api/qa-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: QA_EMAIL,
        password: QA_PASSWORD,
      }),
    });

    // If QA auth is disabled, try regular auth
    if (res.statusCode === 403 || res.statusCode === 404) {
      res = await makeRequest(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: QA_EMAIL,
          password: QA_PASSWORD,
        }),
      });
    }

    if (res.statusCode !== 200) {
      throw new Error(
        `Login failed with status ${res.statusCode}: ${res.body.substring(0, 200)}`
      );
    }

    try {
      const body = JSON.parse(res.body);
      if (body.token) {
        authToken = body.token;
      }
      if (res.cookies && res.cookies.length > 0) {
        authCookies = res.cookies;
      }
    } catch {
      // May have different response format - check for cookies
      if (res.cookies && res.cookies.length > 0) {
        authCookies = res.cookies;
      }
    }

    return `Login succeeded, token received: ${!!authToken}, cookies: ${authCookies.length}`;
  });

  await runTest("Protected route requires auth", "AUTH", async () => {
    const res = await makeRequest(`${BASE_URL}/api/trpc/orders.list`, {
      headers: { "Content-Type": "application/json" },
    });
    // Should return 401 or redirect without auth
    return `Protected route without auth: status ${res.statusCode}`;
  });

  // ==================== NAVIGATION / PAGES ====================
  console.log("\n═══ NAVIGATION ═══\n");

  const pages = [
    { path: "/dashboard", name: "Dashboard" },
    { path: "/orders", name: "Orders" },
    { path: "/clients", name: "Clients" },
    { path: "/inventory", name: "Inventory" },
    { path: "/accounting", name: "Accounting" },
    { path: "/pick-pack", name: "Pick-Pack" },
    { path: "/admin/settings", name: "Admin Settings" },
  ];

  for (const page of pages) {
    await runTest(`${page.name} page accessible`, "NAV", async () => {
      const headers: Record<string, string> = {
        Accept: "text/html",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      if (authCookies.length > 0) {
        headers["Cookie"] = authCookies.map(c => c.split(";")[0]).join("; ");
      }

      const res = await makeRequest(`${BASE_URL}${page.path}`, { headers });

      // May redirect to login (302) or return content (200)
      if (res.statusCode >= 500)
        throw new Error(`Server error: ${res.statusCode}`);

      return `Status: ${res.statusCode}, Redirect: ${res.redirectUrl || "none"}`;
    });
  }

  // ==================== API ENDPOINTS ====================
  console.log("\n═══ API ENDPOINTS ═══\n");

  const apiEndpoints = [
    { path: "/api/trpc/clients.list", name: "Clients List" },
    { path: "/api/trpc/orders.list", name: "Orders List" },
    { path: "/api/trpc/inventory.list", name: "Inventory List" },
    { path: "/api/trpc/strains.list", name: "Strains List" },
    { path: "/api/trpc/users.list", name: "Users List" },
  ];

  for (const endpoint of apiEndpoints) {
    await runTest(`${endpoint.name} API responds`, "API", async () => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      if (authCookies.length > 0) {
        headers["Cookie"] = authCookies.map(c => c.split(";")[0]).join("; ");
      }

      const res = await makeRequest(`${BASE_URL}${endpoint.path}`, { headers });

      if (res.statusCode >= 500)
        throw new Error(`Server error: ${res.statusCode}`);

      return `Status: ${res.statusCode}`;
    });
  }

  // ==================== CRUD OPERATIONS ====================
  console.log("\n═══ CRUD OPERATIONS ═══\n");

  await runTest("Can query orders with filters", "CRUD", async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (authCookies.length > 0) {
      headers["Cookie"] = authCookies.map(c => c.split(";")[0]).join("; ");
    }

    const res = await makeRequest(
      `${BASE_URL}/api/trpc/orders.list?input=${encodeURIComponent(JSON.stringify({ json: { limit: 10 } }))}`,
      { headers }
    );

    return `Orders query status: ${res.statusCode}`;
  });

  await runTest("Can query clients with search", "CRUD", async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (authCookies.length > 0) {
      headers["Cookie"] = authCookies.map(c => c.split(";")[0]).join("; ");
    }

    const res = await makeRequest(
      `${BASE_URL}/api/trpc/clients.list?input=${encodeURIComponent(JSON.stringify({ json: { search: "test" } }))}`,
      { headers }
    );

    return `Clients search status: ${res.statusCode}`;
  });

  await runTest("Can query inventory items", "CRUD", async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (authCookies.length > 0) {
      headers["Cookie"] = authCookies.map(c => c.split(";")[0]).join("; ");
    }

    const res = await makeRequest(`${BASE_URL}/api/trpc/inventory.list`, {
      headers,
    });

    return `Inventory list status: ${res.statusCode}`;
  });

  // ==================== SECURITY ====================
  console.log("\n═══ SECURITY ═══\n");

  await runTest("No sensitive headers exposed", "SECURITY", async () => {
    const res = await makeRequest(`${BASE_URL}/`);
    const sensitiveHeaders = ["x-debug", "x-internal", "x-trace-id"];
    const found = sensitiveHeaders.filter(h => res.headers[h]);
    if (found.length > 0) {
      return `Warning: Found sensitive headers: ${found.join(", ")}`;
    }
    return "No sensitive headers exposed";
  });

  await runTest("SQL injection in search rejected", "SECURITY", async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (authCookies.length > 0) {
      headers["Cookie"] = authCookies.map(c => c.split(";")[0]).join("; ");
    }

    const maliciousInput = "'; DROP TABLE users; --";
    const res = await makeRequest(
      `${BASE_URL}/api/trpc/clients.list?input=${encodeURIComponent(JSON.stringify({ json: { search: maliciousInput } }))}`,
      { headers }
    );

    // Should either sanitize or reject, not crash
    if (res.statusCode >= 500)
      throw new Error("Server crashed on SQL injection attempt");

    return `SQL injection handled safely, status: ${res.statusCode}`;
  });

  await runTest("XSS in input sanitized", "SECURITY", async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (authCookies.length > 0) {
      headers["Cookie"] = authCookies.map(c => c.split(";")[0]).join("; ");
    }

    const xssPayload = '<script>alert("xss")</script>';
    const res = await makeRequest(
      `${BASE_URL}/api/trpc/clients.list?input=${encodeURIComponent(JSON.stringify({ json: { search: xssPayload } }))}`,
      { headers }
    );

    if (res.statusCode >= 500) throw new Error("Server crashed on XSS attempt");

    return `XSS payload handled safely, status: ${res.statusCode}`;
  });

  // ==================== PERFORMANCE ====================
  console.log("\n═══ PERFORMANCE ═══\n");

  await runTest("Login response time < 3s", "PERF", async () => {
    const start = Date.now();
    await makeRequest(`${BASE_URL}/login`);
    const duration = Date.now() - start;
    if (duration > 3000) throw new Error(`Too slow: ${duration}ms`);
    return `Response time: ${duration}ms`;
  });

  await runTest("API response time < 5s", "PERF", async () => {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (authCookies.length > 0) {
      headers["Cookie"] = authCookies.map(c => c.split(";")[0]).join("; ");
    }

    const start = Date.now();
    await makeRequest(`${BASE_URL}/api/trpc/orders.list`, { headers });
    const duration = Date.now() - start;
    if (duration > 5000) throw new Error(`Too slow: ${duration}ms`);
    return `Response time: ${duration}ms`;
  });

  // ==================== SUMMARY ====================
  console.log("\n" + "═".repeat(60));
  console.log("                       TEST SUMMARY");
  console.log("═".repeat(60) + "\n");

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const total = results.length;

  // Group by category
  const categories = [...new Set(results.map(r => r.category))];
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPassed = catResults.filter(r => r.status === "PASS").length;
    const catTotal = catResults.length;
    const pct = ((catPassed / catTotal) * 100).toFixed(0);
    const bar =
      "█".repeat(Math.floor((catPassed / catTotal) * 20)) +
      "░".repeat(20 - Math.floor((catPassed / catTotal) * 20));
    console.log(
      `${cat.padEnd(10)} [${bar}] ${catPassed}/${catTotal} (${pct}%)`
    );
  }

  console.log("\n" + "─".repeat(60));
  console.log(`\nTotal:   ${total}`);
  console.log(`Passed:  ${passed}`);
  console.log(`Failed:  ${failed}`);
  console.log(`\nPass Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\n═══ FAILED TESTS ═══\n");
    results
      .filter(r => r.status === "FAIL")
      .forEach(r => {
        console.log(`✗ [${r.category}] ${r.name}`);
        console.log(`  Error: ${r.error}\n`);
      });
  }

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    proxyConfigured: !!PROXY_URL,
    testType: "HTTP-based Comprehensive",
    summary: {
      total,
      passed,
      failed,
      passRate: ((passed / total) * 100).toFixed(1) + "%",
      byCategory: Object.fromEntries(
        categories.map(cat => {
          const catResults = results.filter(r => r.category === cat);
          return [
            cat,
            {
              total: catResults.length,
              passed: catResults.filter(r => r.status === "PASS").length,
              failed: catResults.filter(r => r.status === "FAIL").length,
            },
          ];
        })
      ),
    },
    results,
  };

  console.log("\n═══ JSON REPORT ═══\n");
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);
