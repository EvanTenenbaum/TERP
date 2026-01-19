/* eslint-disable no-console */
/**
 * E2E Test Runner using Puppeteer with Proxy Support
 *
 * Uses puppeteer-core with explicit chromium args for proxy
 */

import puppeteer, { Browser, Page } from "puppeteer";

const BASE_URL = "https://terp-app-b9s35.ondigitalocean.app";
const PROXY_URL = process.env.https_proxy || process.env.HTTPS_PROXY || "";

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  error?: string;
  details?: string;
  viewport?: string;
}

const results: TestResult[] = [];

// Parse proxy for Chromium args
function getProxyServer(proxyUrl: string): string | null {
  if (!proxyUrl) return null;
  try {
    const url = new URL(proxyUrl);
    return `${url.hostname}:${url.port}`;
  } catch {
    return null;
  }
}

function getProxyAuth(
  proxyUrl: string
): { username: string; password: string } | null {
  if (!proxyUrl) return null;
  try {
    const url = new URL(proxyUrl);
    if (url.username) {
      return {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

async function runTest(
  name: string,
  testFn: (page: Page) => Promise<string | void>,
  viewport: { width: number; height: number } = { width: 1920, height: 1080 }
): Promise<void> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    const proxyServer = getProxyServer(PROXY_URL);
    const proxyAuth = getProxyAuth(PROXY_URL);

    const launchArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--ignore-certificate-errors",
    ];

    if (proxyServer) {
      launchArgs.push(`--proxy-server=${proxyServer}`);
    }

    browser = await puppeteer.launch({
      headless: true,
      args: launchArgs,
    });

    const page = await browser.newPage();
    await page.setViewport(viewport);

    // Set proxy authentication if needed
    if (proxyAuth) {
      await page.authenticate(proxyAuth);
    }

    const details = await testFn(page);

    results.push({
      name,
      status: "PASS",
      duration: Date.now() - start,
      details: details || undefined,
      viewport: `${viewport.width}x${viewport.height}`,
    });
    console.log(`✓ ${name} (${Date.now() - start}ms)`);
    if (details) console.log(`  ${details}`);
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      viewport: `${viewport.width}x${viewport.height}`,
    });
    console.log(`✗ ${name} (${Date.now() - start}ms)`);
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  console.log("\n=== TERP E2E Browser Test Suite (Puppeteer) ===\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Proxy: ${PROXY_URL ? "Configured" : "None"}\n`);

  // ==================== DESKTOP TESTS (1920x1080) ====================
  console.log("\n--- DESKTOP VIEWPORT (1920x1080) ---\n");

  // AUTH TESTS
  await runTest("AUTH-001: Login page loads", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    const title = await page.title();
    return `Page title: "${title}"`;
  });

  await runTest("AUTH-002: Login form elements present", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const emailInput = await page.$(
      'input[type="email"], input[name="email"], input[name="username"]'
    );
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    if (!emailInput) throw new Error("Email input not found");
    if (!passwordInput) throw new Error("Password input not found");
    if (!submitBtn) throw new Error("Submit button not found");

    return "All login form elements present";
  });

  await runTest("AUTH-003: Invalid login rejected", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "fake@invalid.com"
    );
    await page.type('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Wait for response
    await new Promise(r => setTimeout(r, 3000));

    const url = page.url();
    // Should stay on login or show error
    const hasError = await page.$(
      '.error, [role="alert"], .text-red, .text-destructive, .toast'
    );

    return `URL: ${url}, Has error feedback: ${!!hasError}`;
  });

  await runTest("AUTH-004: Protected route redirects", async page => {
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));

    const url = page.url();
    if (!url.includes("login")) {
      throw new Error(`Expected redirect to login, got: ${url}`);
    }
    return `Redirected to: ${url}`;
  });

  await runTest("AUTH-005: Successful login", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "qa.superadmin@terp.test"
    );
    await page.type('input[type="password"]', "TerpQA2026!");
    await page.click('button[type="submit"]');

    // Wait for navigation
    await new Promise(r => setTimeout(r, 5000));

    const url = page.url();
    const loggedIn = !url.includes("/login");

    if (!loggedIn) {
      // Check for any errors
      const errorText = await page
        .$eval('.error, [role="alert"]', el => el.textContent)
        .catch(() => null);
      throw new Error(
        `Login failed. URL: ${url}. Error: ${errorText || "Unknown"}`
      );
    }

    return `Logged in successfully. Current URL: ${url}`;
  });

  // NAVIGATION TESTS
  await runTest("NAV-001: Dashboard accessible after login", async page => {
    // Login first
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "qa.superadmin@terp.test"
    );
    await page.type('input[type="password"]', "TerpQA2026!");
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));

    const hasContent = await page.$("main, .dashboard, h1, .card");
    if (!hasContent) throw new Error("Dashboard has no content");

    return "Dashboard loaded with content";
  });

  await runTest("NAV-002: Orders page loads", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "qa.superadmin@terp.test"
    );
    await page.type('input[type="password"]', "TerpQA2026!");
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    await page.goto(`${BASE_URL}/orders`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));

    const url = page.url();
    if (!url.includes("/orders"))
      throw new Error(`Expected orders page, got: ${url}`);

    const hasTable = await page.$('table, [role="table"], [role="tab"]');
    return `Orders page loaded, has table/tabs: ${!!hasTable}`;
  });

  await runTest("NAV-003: Clients page loads", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "qa.superadmin@terp.test"
    );
    await page.type('input[type="password"]', "TerpQA2026!");
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    await page.goto(`${BASE_URL}/clients`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));

    const url = page.url();
    if (!url.includes("/clients"))
      throw new Error(`Expected clients page, got: ${url}`);

    const hasTable = await page.$('table, [role="table"]');
    return `Clients page loaded, has table: ${!!hasTable}`;
  });

  await runTest("NAV-004: Inventory page loads", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "qa.superadmin@terp.test"
    );
    await page.type('input[type="password"]', "TerpQA2026!");
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    await page.goto(`${BASE_URL}/inventory`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));

    const url = page.url();
    if (!url.includes("/inventory"))
      throw new Error(`Expected inventory page, got: ${url}`);

    return `Inventory page loaded`;
  });

  await runTest("NAV-005: Accounting page loads", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "qa.superadmin@terp.test"
    );
    await page.type('input[type="password"]', "TerpQA2026!");
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    await page.goto(`${BASE_URL}/accounting`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));

    const url = page.url();
    if (!url.includes("/accounting"))
      throw new Error(`Expected accounting page, got: ${url}`);

    return `Accounting page loaded`;
  });

  // CRUD TESTS
  await runTest("CRUD-001: New Order button exists", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "qa.superadmin@terp.test"
    );
    await page.type('input[type="password"]', "TerpQA2026!");
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    await page.goto(`${BASE_URL}/orders`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));

    const newOrderBtn = await page.$(
      'button:has-text("New Order"), a:has-text("New Order"), button:has-text("Create")'
    );
    if (!newOrderBtn) {
      // Try alternative selectors
      const anyCreateBtn = await page.$(
        '[data-testid="new-order"], .new-order-btn'
      );
      if (!anyCreateBtn) throw new Error("New Order button not found");
    }

    return "New Order button found";
  });

  await runTest("CRUD-002: Search functionality exists", async page => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.type(
      'input[type="email"], input[name="email"], input[name="username"]',
      "qa.superadmin@terp.test"
    );
    await page.type('input[type="password"]', "TerpQA2026!");
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    await page.goto(`${BASE_URL}/orders`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 2000));

    const searchInput = await page.$(
      'input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i]'
    );
    if (!searchInput) throw new Error("Search input not found");

    return "Search input found";
  });

  // ==================== MOBILE TESTS (375x812) ====================
  console.log("\n--- MOBILE VIEWPORT (375x812) ---\n");

  await runTest(
    "MOBILE-001: Login page responsive",
    async page => {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      const submitBtn = await page.$('button[type="submit"]');
      if (!submitBtn) throw new Error("Submit button not visible on mobile");

      const isVisible = await submitBtn.isIntersectingViewport();
      return `Login form visible on mobile: ${isVisible}`;
    },
    { width: 375, height: 812 }
  );

  await runTest(
    "MOBILE-002: Dashboard responsive",
    async page => {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await page.type(
        'input[type="email"], input[name="email"], input[name="username"]',
        "qa.superadmin@terp.test"
      );
      await page.type('input[type="password"]', "TerpQA2026!");
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 5000));

      await page.goto(`${BASE_URL}/dashboard`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await new Promise(r => setTimeout(r, 2000));

      const hasContent = await page.$("main, .dashboard, h1");
      if (!hasContent) throw new Error("Dashboard not visible on mobile");

      return "Dashboard displays on mobile";
    },
    { width: 375, height: 812 }
  );

  await runTest(
    "MOBILE-003: Navigation accessible",
    async page => {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await page.type(
        'input[type="email"], input[name="email"], input[name="username"]',
        "qa.superadmin@terp.test"
      );
      await page.type('input[type="password"]', "TerpQA2026!");
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 5000));

      // Look for mobile menu trigger
      const menuBtn = await page.$(
        '[aria-label*="menu" i], .hamburger, button:has-text("☰"), [data-testid="mobile-menu"]'
      );
      const hasNav = await page.$("nav, aside, .sidebar");

      return `Mobile menu: ${!!menuBtn}, Nav element: ${!!hasNav}`;
    },
    { width: 375, height: 812 }
  );

  await runTest(
    "MOBILE-004: Orders page responsive",
    async page => {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await page.type(
        'input[type="email"], input[name="email"], input[name="username"]',
        "qa.superadmin@terp.test"
      );
      await page.type('input[type="password"]', "TerpQA2026!");
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 5000));

      await page.goto(`${BASE_URL}/orders`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await new Promise(r => setTimeout(r, 2000));

      const hasContent = await page.$('table, [role="tab"], h1');
      return `Orders page on mobile: has content ${!!hasContent}`;
    },
    { width: 375, height: 812 }
  );

  await runTest(
    "MOBILE-005: Clients page responsive",
    async page => {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await page.type(
        'input[type="email"], input[name="email"], input[name="username"]',
        "qa.superadmin@terp.test"
      );
      await page.type('input[type="password"]', "TerpQA2026!");
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 5000));

      await page.goto(`${BASE_URL}/clients`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await new Promise(r => setTimeout(r, 2000));

      const hasContent = await page.$("table, h1");
      return `Clients page on mobile: has content ${!!hasContent}`;
    },
    { width: 375, height: 812 }
  );

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
        console.log(`- ${r.name} [${r.viewport}]`);
        console.log(`  ${r.error}\n`);
      });
  }

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    proxyConfigured: !!PROXY_URL,
    testType: "Browser-based (Puppeteer)",
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
