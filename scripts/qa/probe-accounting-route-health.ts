import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { QA_PASSWORD } from "../../tests-e2e/fixtures/auth";
import { getEnvOrDefault } from "../spreadsheet-native/qaEnv";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3010";
const outputDir = path.resolve(
  process.cwd(),
  "output/playwright/accounting-route-health"
);

interface CheckResult {
  name: string;
  pass: boolean;
  url: string;
  detail?: string;
}

function collectLicenseWarnings(messages: Array<{ type: string; text: string }>) {
  return messages.filter(entry =>
    /license key not found|trial|watermark|using_this_\{ag_grid\}/i.test(
      entry.text
    )
  );
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);

  const consoleMessages: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];

  page.on("console", message => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", error => {
    pageErrors.push(String(error));
  });

  const loginResponse = await context.request.post("/api/qa-auth/login", {
    headers: { "content-type": "application/json" },
    data: {
      email: getEnvOrDefault("E2E_ADMIN_USERNAME", "qa.superadmin@terp.test"),
      password: getEnvOrDefault("E2E_ADMIN_PASSWORD", QA_PASSWORD),
    },
  });

  if (!loginResponse.ok()) {
    throw new Error(
      `QA login failed: ${loginResponse.status()} ${await loginResponse.text()}`
    );
  }

  const checks: CheckResult[] = [];

  await page.goto("/accounting", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="accounting-dashboard"]');
  checks.push({
    name: "accounting dashboard mounts",
    pass: true,
    url: page.url(),
  });

  await page.getByRole("button", { name: /Review invoices/i }).click();
  await page.waitForURL("**/accounting?tab=invoices");
  await page.waitForSelector("text=Invoices");
  {
    const currentUrl = new URL(page.url());
    checks.push({
      name: "dashboard review invoices link",
      pass:
        currentUrl.pathname === "/accounting" &&
        currentUrl.searchParams.get("tab") === "invoices",
      url: page.url(),
    });
  }

  await page.goto(
    "/accounting?tab=invoices&id=34&openRecordPayment=true&orderId=34&from=sales",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForSelector("text=Invoices");
  await page.waitForTimeout(2_000);
  {
    const currentUrl = new URL(page.url());
    const handoffBanner = page.locator(
      '[data-testid="invoice-payment-handoff-banner"]'
    );
    const handoffBannerVisible = await handoffBanner.isVisible().catch(() => false);
    const handoffBannerText = handoffBannerVisible
      ? await handoffBanner.textContent()
      : "";
    const recordPaymentActionVisible = await handoffBanner
      .getByRole("button", { name: /^Record Payment$/ })
      .isVisible()
      .catch(() => false);
    checks.push({
      name: "invoice payment handoff normalization",
      pass:
        currentUrl.pathname === "/accounting" &&
        currentUrl.searchParams.get("tab") === "invoices" &&
        currentUrl.searchParams.get("invoiceId") === "34" &&
        !currentUrl.searchParams.has("id") &&
        handoffBannerVisible &&
        /order #34/i.test(handoffBannerText || "") &&
        /inv-000034/i.test(handoffBannerText || "") &&
        recordPaymentActionVisible,
      url: page.url(),
      detail: handoffBannerText || undefined,
    });
  }

  await page.goto("/accounting?tab=payments&orderId=34&from=sales", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("text=Payments");
  await page.waitForTimeout(2_000);
  {
    const salesBanner = page.locator(
      '[data-testid="payments-order-handoff-banner"]'
    );
    const salesBannerVisible = await salesBanner.isVisible().catch(() => false);
    const salesBannerText = salesBannerVisible
      ? await salesBanner.textContent()
      : "";
    checks.push({
      name: "payments sales handoff banner",
      pass:
        salesBannerVisible &&
        /order #34/i.test(salesBannerText || "") &&
        /invoice #34/i.test(salesBannerText || ""),
      url: page.url(),
      detail: salesBannerText || undefined,
    });
  }

  const agGridWarnings = consoleMessages.filter(entry =>
    /ag grid|ag-grid/i.test(entry.text)
  );
  const licenseWarnings = collectLicenseWarnings(consoleMessages);

  const report = {
    baseUrl,
    timestamp: new Date().toISOString(),
    checks,
    licenseWarnings,
    agGridWarnings,
    pageErrors,
    consoleMessages,
  };

  writeFileSync(
    path.join(outputDir, "latest.json"),
    JSON.stringify(report, null, 2)
  );

  const failedChecks = checks.filter(check => !check.pass);

  if (licenseWarnings.length > 0 || pageErrors.length > 0 || failedChecks.length) {
    console.error(
      JSON.stringify(
        {
          result: "FAIL",
          failedChecks,
          licenseWarnings,
          agGridWarnings,
          pageErrors,
        },
        null,
        2
      )
    );
    await browser.close();
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        result: "PASS",
        checks,
        reportPath: path.join(outputDir, "latest.json"),
      },
      null,
      2
    )
  );

  await browser.close();
}

main().catch(error => {
  console.error(
    JSON.stringify(
      {
        result: "ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});
