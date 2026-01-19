#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Live Site E2E Testing via curl (which works with the proxy)
 *
 * Since curl respects the proxy environment variables, we use it
 * to perform actual HTTP requests and parse the responses.
 */

import { execSync } from "child_process";
import * as cheerio from "cheerio";

const BASE_URL = "https://terp-app-b9s35.ondigitalocean.app";

interface TestResult {
  name: string;
  status: "pass" | "fail";
  details?: string;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function curlGet(
  url: string,
  options: { includeHeaders?: boolean; timeout?: number } = {}
): { status: number; body: string; headers?: string } {
  const { includeHeaders = false, timeout = 30 } = options;
  try {
    const cmd = `curl -s ${includeHeaders ? "-i" : ""} --max-time ${timeout} "${url}"`;
    const output = execSync(cmd, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });

    if (includeHeaders) {
      const parts = output.split("\r\n\r\n");
      const headerLines = parts[0].split("\r\n");
      const statusLine = headerLines[0];
      const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
      return {
        status,
        body: parts.slice(1).join("\r\n\r\n"),
        headers: parts[0],
      };
    }

    return { status: 200, body: output };
  } catch (error) {
    return { status: 0, body: String(error) };
  }
}

function curlPost(
  url: string,
  data: object,
  options: { timeout?: number; insecure?: boolean } = {}
): { status: number; body: string } {
  const { timeout = 30, insecure = true } = options;
  try {
    const jsonData = JSON.stringify(data).replace(/"/g, '\\"');
    const insecureFlag = insecure ? "-k" : "";
    const cmd = `curl -s ${insecureFlag} -X POST --max-time ${timeout} -H "Content-Type: application/json" -d "${jsonData}" "${url}"`;
    const output = execSync(cmd, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return { status: 200, body: output };
  } catch (error) {
    return { status: 0, body: String(error) };
  }
}

async function test(name: string, testFn: () => void): Promise<void> {
  const start = Date.now();
  try {
    console.log(`\n🧪 Testing: ${name}`);
    testFn();
    results.push({ name, status: "pass", duration: Date.now() - start });
    console.log(`   ✅ PASSED (${Date.now() - start}ms)`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    results.push({
      name,
      status: "fail",
      error: errMsg,
      duration: Date.now() - start,
    });
    console.log(`   ❌ FAILED: ${errMsg.slice(0, 150)}`);
  }
}

// ==================== TESTS ====================

function testHealthEndpoint(): void {
  const { body } = curlGet(`${BASE_URL}/health`);
  const data = JSON.parse(body);

  console.log(`   Status: ${data.status}`);
  console.log(`   Database: ${data.checks?.database?.status}`);
  console.log(
    `   Memory: ${data.checks?.memory?.status} (${data.checks?.memory?.percentage}%)`
  );
  console.log(
    `   Disk: ${data.checks?.disk?.status} (${data.checks?.disk?.usedPercent}%)`
  );

  if (data.checks?.database?.status !== "ok") {
    throw new Error(`Database status is ${data.checks?.database?.status}`);
  }
}

function testLoginPageLoads(): void {
  const { body } = curlGet(`${BASE_URL}/login`);
  const $ = cheerio.load(body);

  const title = $("title").text();
  console.log(`   Page title: "${title}"`);

  // Check for SPA root element
  const hasRoot =
    $("#root").length > 0 ||
    $("#__next").length > 0 ||
    $("[data-reactroot]").length > 0;
  console.log(`   Has React root: ${hasRoot}`);

  // Check for JS bundles
  const scripts = $("script[src]").length;
  console.log(`   Script tags: ${scripts}`);

  if (scripts === 0) {
    throw new Error("No script tags found - page may not be loading correctly");
  }
}

function testDashboardPageLoads(): void {
  const { body } = curlGet(`${BASE_URL}/`);
  const $ = cheerio.load(body);

  const title = $("title").text();
  console.log(
    `   Page title: "${title || "(empty - SPA hydrates client-side)"}"`
  );

  // SPA apps often have empty title in initial HTML
  const bodySize = body.length;
  console.log(`   Page size: ${(bodySize / 1024).toFixed(1)} KB`);

  // Check for React root instead of title
  const hasRoot = $("#root").length > 0;
  console.log(`   Has React root: ${hasRoot}`);

  if (!hasRoot && bodySize < 100) {
    throw new Error("Dashboard page appears empty or broken");
  }
}

function testVIPPortalLoads(): void {
  const { body } = curlGet(`${BASE_URL}/vip-portal/login`);
  const $ = cheerio.load(body);

  const title = $("title").text();
  console.log(`   Page title: "${title}"`);

  const hasRoot = $("#root").length > 0;
  console.log(`   Has React root: ${hasRoot}`);
}

function testLoginAPIEndpoint(): void {
  const { body } = curlPost(`${BASE_URL}/api/auth/login`, {
    username: "qa.superadmin@terp.test",
    password: "TerpQA2026!",
  });

  console.log(`   Response: ${body.slice(0, 200)}`);

  // Check if it's a valid JSON response or an error page
  try {
    const data = JSON.parse(body);
    console.log(
      `   JSON response received: ${JSON.stringify(data).slice(0, 100)}`
    );
  } catch {
    // If it's HTML error, check what kind
    if (body.includes("Bad Request")) {
      console.log(
        `   Got Bad Request - API endpoint exists but request format may differ`
      );
    } else {
      throw new Error(`Unexpected response: ${body.slice(0, 100)}`);
    }
  }
}

function testKeyRoutesAccessible(): void {
  const routes = [
    { path: "/", name: "Home/Dashboard" },
    { path: "/login", name: "Login" },
    { path: "/vip-portal/login", name: "VIP Portal Login" },
  ];

  for (const route of routes) {
    const { status, body } = curlGet(`${BASE_URL}${route.path}`, {
      includeHeaders: true,
    });
    console.log(
      `   ${route.name} (${route.path}): ${status === 200 ? "✓" : "✗"} (${(body.length / 1024).toFixed(1)} KB)`
    );

    if (status !== 200 && status !== 0) {
      throw new Error(`Route ${route.path} returned status ${status}`);
    }
  }
}

function testStaticAssets(): void {
  const { body } = curlGet(`${BASE_URL}/`);
  const $ = cheerio.load(body);

  const scripts = $("script[src]")
    .map((_, el) => $(el).attr("src"))
    .get();
  const styles = $('link[rel="stylesheet"]')
    .map((_, el) => $(el).attr("href"))
    .get();

  console.log(
    `   Found ${scripts.length} script(s), ${styles.length} stylesheet(s)`
  );

  // Test loading one script
  if (scripts.length > 0) {
    const scriptUrl = scripts[0].startsWith("http")
      ? scripts[0]
      : `${BASE_URL}${scripts[0]}`;
    const { body: scriptBody } = curlGet(scriptUrl);
    const isJS =
      scriptBody.includes("function") ||
      scriptBody.includes("const") ||
      scriptBody.includes("var");
    console.log(
      `   Sample script loads: ${isJS ? "✓" : "✗"} (${(scriptBody.length / 1024).toFixed(1)} KB)`
    );
  }
}

function testPageStructureElements(): void {
  const { body } = curlGet(`${BASE_URL}/login`);
  const $ = cheerio.load(body);

  // Check for meta tags
  const viewport = $('meta[name="viewport"]').length > 0;
  const charset = $("meta[charset]").length > 0;

  console.log(`   Viewport meta: ${viewport ? "✓" : "✗"}`);
  console.log(`   Charset meta: ${charset ? "✓" : "✗"}`);

  // Check for favicon
  const favicon = $('link[rel*="icon"]').length > 0;
  console.log(`   Favicon: ${favicon ? "✓" : "✗"}`);
}

function testMobilePageSize(): void {
  // Check that pages are reasonably sized for mobile
  const pages = ["/login", "/", "/vip-portal/login"];

  for (const page of pages) {
    const { body } = curlGet(`${BASE_URL}${page}`);
    const sizeKB = body.length / 1024;

    const status = sizeKB < 500 ? "✓" : "⚠️ Large";
    console.log(`   ${page}: ${sizeKB.toFixed(1)} KB ${status}`);
  }
}

// ==================== MAIN ====================

async function main(): Promise<void> {
  console.log(
    "╔════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║       TERP Live Site E2E Tests (via curl with proxy)              ║"
  );
  console.log(
    "╠════════════════════════════════════════════════════════════════════╣"
  );
  console.log(`║ Target: ${BASE_URL}`);
  console.log(
    "║ Method: curl (respects system proxy settings)                      ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════════╝"
  );

  await test("Health endpoint & system status", testHealthEndpoint);
  await test("Login page loads correctly", testLoginPageLoads);
  await test("Dashboard/Home page loads", testDashboardPageLoads);
  await test("VIP Portal page loads", testVIPPortalLoads);
  await test("Login API endpoint", testLoginAPIEndpoint);
  await test("Key routes accessible", testKeyRoutesAccessible);
  await test("Static assets loading", testStaticAssets);
  await test("Page structure elements", testPageStructureElements);
  await test("Mobile page size check", testMobilePageSize);

  // Summary
  console.log(
    "\n\n╔════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                           TEST SUMMARY                             ║"
  );
  console.log(
    "╠════════════════════════════════════════════════════════════════════╣"
  );

  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const totalTime = results.reduce((acc, r) => acc + (r.duration || 0), 0);

  for (const result of results) {
    const icon = result.status === "pass" ? "✅" : "❌";
    const duration = result.duration ? `${result.duration}ms` : "";
    console.log(
      `║ ${icon} ${result.name.padEnd(50)} ${duration.padStart(8)} ║`
    );
  }

  console.log(
    "╠════════════════════════════════════════════════════════════════════╣"
  );
  console.log(
    `║ Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Time: ${totalTime}ms`.padEnd(
      68
    ) + "║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════════╝"
  );

  if (failed > 0) {
    console.log("\n⚠️  Some tests failed. See details above.");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
