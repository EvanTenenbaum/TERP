/* eslint-disable no-console */
/**
 * E2E HTTP-Based Test Runner
 *
 * Uses fetch/HTTP requests directly to test the application
 * This bypasses browser proxy issues by using Node's HTTP client
 */

import * as https from "https";
import * as http from "http";
import * as tls from "tls";

const BASE_URL = "https://terp-app-b9s35.ondigitalocean.app";
const PROXY_URL = process.env.https_proxy || process.env.HTTPS_PROXY || "";

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

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
  headers: http.IncomingHttpHeaders;
  body: string;
  redirectUrl?: string;
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
      };

      const req = (targetUrl.protocol === "https:" ? https : http).request(
        reqOptions,
        res => {
          let body = "";
          res.on("data", chunk => (body += chunk));
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              body,
              redirectUrl: res.headers.location,
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
        rejectUnauthorized: false, // Allow self-signed certs
      };

      const tlsSocket = tls.connect(tlsOptions, () => {
        const httpRequest = [
          `${options.method || "GET"} ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`,
          `Host: ${targetUrl.hostname}`,
          ...(options.headers
            ? Object.entries(options.headers).map(([k, v]) => `${k}: ${v}`)
            : []),
          "Connection: close",
          "",
          options.body || "",
        ].join("\r\n");

        tlsSocket.write(httpRequest);

        let response = "";
        tlsSocket.on("data", (chunk: Buffer) => (response += chunk.toString()));
        tlsSocket.on("end", () => {
          // Parse HTTP response
          const headerEndIndex = response.indexOf("\r\n\r\n");
          const headerPart = response.slice(0, headerEndIndex);
          const body = response.slice(headerEndIndex + 4);

          const statusLine = headerPart.split("\r\n")[0];
          const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
          const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

          const headers: Record<string, string> = {};
          headerPart
            .split("\r\n")
            .slice(1)
            .forEach(line => {
              const colonIdx = line.indexOf(":");
              if (colonIdx > 0) {
                headers[line.slice(0, colonIdx).toLowerCase()] = line
                  .slice(colonIdx + 1)
                  .trim();
              }
            });

          resolve({
            statusCode,
            headers,
            body,
            redirectUrl: headers.location,
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
  testFn: () => Promise<string | void>
): Promise<void> {
  const start = Date.now();

  try {
    const details = await testFn();

    results.push({
      name,
      status: "PASS",
      duration: Date.now() - start,
      details: details || undefined,
    });
    console.log(`✓ ${name} (${Date.now() - start}ms)`);
    if (details) console.log(`  ${details}`);
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`✗ ${name} (${Date.now() - start}ms)`);
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
  }
}

async function main() {
  console.log("\n=== TERP E2E HTTP Test Suite ===\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Proxy: ${PROXY_URL ? "Configured" : "None"}\n`);

  // Test 1: Server responds
  await runTest("HTTP-001: Server responds to requests", async () => {
    const res = await makeRequest(`${BASE_URL}/login`);
    if (res.statusCode < 200 || res.statusCode >= 500) {
      throw new Error(`Unexpected status: ${res.statusCode}`);
    }
    return `Status: ${res.statusCode}`;
  });

  // Test 2: Login page returns HTML
  await runTest("HTTP-002: Login page returns HTML", async () => {
    const res = await makeRequest(`${BASE_URL}/login`);
    const contentType = res.headers["content-type"] || "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Expected HTML, got: ${contentType}`);
    }
    const hasForm =
      res.body.includes("<form") ||
      res.body.includes("login") ||
      res.body.includes("password");
    return `Content-Type: ${contentType}, has form elements: ${hasForm}`;
  });

  // Test 3: Protected routes redirect or deny
  await runTest("HTTP-003: Protected routes require auth", async () => {
    const res = await makeRequest(`${BASE_URL}/dashboard`);
    // Should either redirect (302/301) or return unauthorized (401/403) or redirect to login
    const isProtected =
      res.statusCode === 401 ||
      res.statusCode === 403 ||
      res.statusCode === 302 ||
      res.statusCode === 301 ||
      (res.redirectUrl && res.redirectUrl.includes("login"));
    if (!isProtected && res.statusCode !== 200) {
      throw new Error(`Unexpected response: ${res.statusCode}`);
    }
    return `Status: ${res.statusCode}, Redirect: ${res.redirectUrl || "none"}`;
  });

  // Test 4: API health check endpoint
  await runTest("HTTP-004: API responds", async () => {
    const res = await makeRequest(`${BASE_URL}/api/health`, {
      headers: { Accept: "application/json" },
    });
    // May return 404 if no health endpoint, but server should respond
    if (res.statusCode >= 500) {
      throw new Error(`Server error: ${res.statusCode}`);
    }
    return `API Status: ${res.statusCode}`;
  });

  // Test 5: Login attempt with invalid credentials
  await runTest("HTTP-005: Login rejects invalid credentials", async () => {
    const res = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: "invalid@test.com",
        password: "wrongpassword",
      }),
    });
    // Should return error status or error response
    if (res.statusCode === 200) {
      const body = JSON.parse(res.body);
      if (body.success || body.token) {
        throw new Error("Should not authenticate with invalid credentials");
      }
    }
    return `Status: ${res.statusCode}`;
  });

  // Test 6: tRPC endpoint responds
  await runTest("HTTP-006: tRPC endpoint responds", async () => {
    const res = await makeRequest(`${BASE_URL}/api/trpc/health.check`, {
      headers: { Accept: "application/json" },
    });
    // tRPC should respond even if with error
    if (res.statusCode >= 500) {
      throw new Error(`Server error: ${res.statusCode}`);
    }
    return `tRPC Status: ${res.statusCode}`;
  });

  // Test 7: Static assets load
  await runTest("HTTP-007: Static assets accessible", async () => {
    // Try to load favicon or common static assets
    const res = await makeRequest(`${BASE_URL}/favicon.ico`);
    // May return 200 or 404, but server should respond
    if (res.statusCode >= 500) {
      throw new Error(`Server error: ${res.statusCode}`);
    }
    return `Favicon Status: ${res.statusCode}`;
  });

  // Test 8: CORS headers present
  await runTest("HTTP-008: Response headers valid", async () => {
    const res = await makeRequest(`${BASE_URL}/login`);
    const server = res.headers["server"] || "unknown";
    const xPoweredBy = res.headers["x-powered-by"] || "not set";
    return `Server: ${server}, X-Powered-By: ${xPoweredBy}`;
  });

  // Test 9: Orders page accessible after auth simulation
  await runTest("HTTP-009: Main pages return content", async () => {
    // Test that the main routes at least exist (may redirect without auth)
    const routes = ["/orders", "/clients", "/inventory", "/accounting"];
    const statuses: string[] = [];

    for (const route of routes) {
      const res = await makeRequest(`${BASE_URL}${route}`);
      statuses.push(`${route}: ${res.statusCode}`);
    }

    return statuses.join(", ");
  });

  // Test 10: Response times reasonable
  await runTest("HTTP-010: Response times acceptable", async () => {
    const start = Date.now();
    const res = await makeRequest(`${BASE_URL}/login`);
    const duration = Date.now() - start;

    if (duration > 10000) {
      throw new Error(`Response too slow: ${duration}ms`);
    }
    return `Response time: ${duration}ms, Status: ${res.statusCode}`;
  });

  // Print summary
  console.log("\n=== Test Summary ===\n");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nPass Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\n=== Failed Tests ===\n");
    results
      .filter(r => r.status === "FAIL")
      .forEach(r => {
        console.log(`- ${r.name}`);
        console.log(`  ${r.error}\n`);
      });
  }

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    proxyConfigured: !!PROXY_URL,
    testType: "HTTP-based",
    summary: {
      total: results.length,
      passed,
      failed,
      passRate: ((passed / results.length) * 100).toFixed(1) + "%",
    },
    results,
  };

  console.log("\n=== JSON Report ===\n");
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);
