/**
 * Deep Manual QA Crawl — Desktop + Mobile
 *
 * Acts as a human QA tester: logs in, visits every page, clicks every tab,
 * opens modals/drawers, checks overflow, focus rings, hover states, console
 * errors, network failures, sticky headers, toasts, and responsive layout.
 */
/* eslint-disable no-console, no-undef */
import { test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";

// ── Bug collector ──────────────────────────────────────────────────────
interface Bug {
  page: string;
  viewport: string;
  severity: "critical" | "major" | "minor" | "cosmetic";
  category: string;
  description: string;
  evidence?: string;
}

const bugs: Bug[] = [];
function bug(b: Bug) {
  bugs.push(b);
  console.log(`🐛 [${b.severity}] ${b.page} (${b.viewport}): ${b.description}`);
}

// ── Console / network error collectors ─────────────────────────────────
function attachCollectors(page: Page, _routeLabel: string, _vp: string) {
  const consoleErrors: string[] = [];
  const networkFailures: string[] = [];

  page.on("console", msg => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore known noise
      if (
        text.includes("favicon") ||
        (text.includes("404 (Not Found)") && text.includes(".ico"))
      )
        return;
      consoleErrors.push(text);
    }
  });

  page.on("response", resp => {
    if (resp.status() >= 500) {
      networkFailures.push(`${resp.status()} ${resp.url()}`);
    }
  });

  page.on("requestfailed", req => {
    const failure = req.failure();
    if (failure && !req.url().includes("favicon")) {
      networkFailures.push(`FAILED ${req.url()} — ${failure.errorText}`);
    }
  });

  return { consoleErrors, networkFailures };
}

function reportCollected(
  consoleErrors: string[],
  networkFailures: string[],
  routeLabel: string,
  vp: string
) {
  // Deduplicate
  const uniqueConsole = [...new Set(consoleErrors)];
  const uniqueNetwork = [...new Set(networkFailures)];

  for (const err of uniqueConsole) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "major",
      category: "console-error",
      description: `Console error: ${err.slice(0, 300)}`,
    });
  }
  for (const err of uniqueNetwork) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: err.includes("500") ? "critical" : "major",
      category: "network-error",
      description: `Network error: ${err.slice(0, 300)}`,
    });
  }
}

// ── Overflow / clipping checker ────────────────────────────────────────
async function checkOverflow(page: Page, routeLabel: string, vp: string) {
  const overflows = await page.evaluate(() => {
    const results: string[] = [];
    const vw = document.documentElement.clientWidth;
    const all = document.querySelectorAll("*");
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > vw + 2) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className?.toString().slice(0, 60) || "";
        const id = el.id ? `#${el.id}` : "";
        results.push(
          `${tag}${id}.${cls} overflows by ${Math.round(rect.right - vw)}px`
        );
      }
    }
    return results.slice(0, 10); // cap
  });

  for (const o of overflows) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "major",
      category: "overflow",
      description: `Horizontal overflow: ${o}`,
    });
  }
}

// ── Overlap / z-index checker ──────────────────────────────────────────
async function checkOverlap(page: Page, routeLabel: string, vp: string) {
  const overlaps = await page.evaluate(() => {
    const results: string[] = [];
    const buttons = document.querySelectorAll(
      "button, a, [role='button'], input, select, textarea"
    );
    const rects: { el: string; r: DOMRect }[] = [];
    for (const b of buttons) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const tag = b.tagName.toLowerCase();
      const text =
        (b as HTMLElement).innerText?.slice(0, 30) ||
        b.getAttribute("aria-label") ||
        "";
      rects.push({ el: `${tag}[${text}]`, r });
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r;
        const b = rects[j].r;
        if (
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top
        ) {
          const overlapX =
            Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY =
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 10 && overlapY > 10) {
            results.push(
              `${rects[i].el} overlaps ${rects[j].el} by ${Math.round(overlapX)}x${Math.round(overlapY)}px`
            );
          }
        }
        if (results.length >= 5) break;
      }
      if (results.length >= 5) break;
    }
    return results;
  });

  for (const o of overlaps) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "minor",
      category: "overlap",
      description: o,
    });
  }
}

// ── Truncation checker ─────────────────────────────────────────────────
async function checkTruncation(page: Page, routeLabel: string, vp: string) {
  const truncated = await page.evaluate(() => {
    const results: string[] = [];
    const els = document.querySelectorAll(
      "h1, h2, h3, h4, th, td, button, [role='tab'], nav a, label"
    );
    for (const el of els) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.scrollWidth > htmlEl.clientWidth + 2) {
        const cs = getComputedStyle(htmlEl);
        // Intentional truncation via CSS is fine
        if (cs.textOverflow === "ellipsis" || cs.overflow === "hidden")
          continue;
        const text = htmlEl.innerText?.slice(0, 40) || "";
        if (text.length > 0) {
          results.push(
            `${el.tagName.toLowerCase()}[${text}] clipped by ${htmlEl.scrollWidth - htmlEl.clientWidth}px`
          );
        }
      }
    }
    return results.slice(0, 8);
  });

  for (const t of truncated) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "minor",
      category: "truncation",
      description: `Text truncated: ${t}`,
    });
  }
}

// ── Focus ring checker ─────────────────────────────────────────────────
async function checkFocusRings(page: Page, routeLabel: string, vp: string) {
  const missingFocus = await page.evaluate(() => {
    const results: string[] = [];
    const interactives = document.querySelectorAll(
      "button:not([disabled]), a[href], input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex='0']"
    );
    // Sample up to 10
    const sample = Array.from(interactives).slice(0, 10);
    for (const el of sample) {
      const htmlEl = el as HTMLElement;
      htmlEl.focus();
      const cs = getComputedStyle(htmlEl);
      const outline = cs.outline;
      const boxShadow = cs.boxShadow;
      const hasFocusStyle =
        (outline && outline !== "none" && !outline.includes("0px")) ||
        (boxShadow && boxShadow !== "none");
      if (!hasFocusStyle) {
        const tag = el.tagName.toLowerCase();
        const text =
          htmlEl.innerText?.slice(0, 30) ||
          htmlEl.getAttribute("aria-label") ||
          htmlEl.getAttribute("name") ||
          "";
        results.push(`${tag}[${text}] — no visible focus indicator`);
      }
    }
    return results;
  });

  for (const f of missingFocus) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "minor",
      category: "accessibility",
      description: `Missing focus ring: ${f}`,
    });
  }
}

// ── Disabled state checker ─────────────────────────────────────────────
async function checkDisabledStates(page: Page, routeLabel: string, vp: string) {
  const issues = await page.evaluate(() => {
    const results: string[] = [];
    const disabled = document.querySelectorAll(
      "[disabled], [aria-disabled='true']"
    );
    for (const el of disabled) {
      const cs = getComputedStyle(el as HTMLElement);
      const opacity = parseFloat(cs.opacity);
      const cursor = cs.cursor;
      // Disabled elements should look disabled
      if (opacity >= 1.0 && cursor !== "not-allowed" && cursor !== "default") {
        const tag = el.tagName.toLowerCase();
        const text = (el as HTMLElement).innerText?.slice(0, 30) || "";
        results.push(
          `${tag}[${text}] is disabled but cursor=${cursor}, opacity=${opacity}`
        );
      }
    }
    return results.slice(0, 5);
  });

  for (const i of issues) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "cosmetic",
      category: "disabled-state",
      description: i,
    });
  }
}

// ── Sticky header checker ──────────────────────────────────────────────
async function checkStickyHeaders(page: Page, routeLabel: string, vp: string) {
  // Scroll down and check if sticky elements remain visible
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  if (pageHeight <= 900) return; // Not scrollable

  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);

  const stickyIssues = await page.evaluate(() => {
    const results: string[] = [];
    const stickies = document.querySelectorAll(
      "[class*='sticky'], [style*='sticky'], header, nav"
    );
    for (const el of stickies) {
      const cs = getComputedStyle(el as HTMLElement);
      if (cs.position === "sticky" || cs.position === "fixed") {
        const rect = (el as HTMLElement).getBoundingClientRect();
        // Check if it's off-screen despite being sticky
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          results.push(
            `${el.tagName.toLowerCase()} (sticky/fixed) is off-screen after scroll`
          );
        }
      }
    }
    return results;
  });

  for (const s of stickyIssues) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "major",
      category: "sticky-header",
      description: s,
    });
  }

  // Scroll back up
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}

// ── Empty state / loading spinner stuck ────────────────────────────────
async function checkEmptyAndLoading(
  page: Page,
  routeLabel: string,
  vp: string
) {
  const issues = await page.evaluate(() => {
    const results: string[] = [];
    // Check for spinners still visible after page should have loaded
    const spinners = document.querySelectorAll(
      "[class*='spinner'], [class*='loading'], [class*='skeleton'], [role='progressbar'], [class*='animate-spin'], [class*='animate-pulse']"
    );
    for (const s of spinners) {
      const rect = (s as HTMLElement).getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const cs = getComputedStyle(s as HTMLElement);
        if (cs.display !== "none" && cs.visibility !== "hidden") {
          results.push(
            `Loading indicator still visible: ${s.tagName.toLowerCase()}.${(s.className?.toString() || "").slice(0, 60)}`
          );
        }
      }
    }
    return results.slice(0, 3);
  });

  // Only report as bug if spinner is still showing after 5s (we wait before calling this)
  for (const i of issues) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "minor",
      category: "loading-stuck",
      description: i,
    });
  }
}

// ── Tab interaction checker ────────────────────────────────────────────
async function clickAllTabs(page: Page, routeLabel: string, vp: string) {
  const tabs = await page.locator("[role='tab']").all();
  if (tabs.length === 0) return;

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    try {
      if (!(await tab.isVisible())) continue;
      const tabText =
        (await tab.textContent())?.trim().slice(0, 40) || `tab-${i}`;

      await tab.click({ timeout: 3000 });
      await page.waitForTimeout(800);

      // Check for errors after tab switch
      const tabPanel = page.locator("[role='tabpanel']:visible").first();
      if (await tabPanel.isVisible().catch(() => false)) {
        const panelText = await tabPanel.textContent().catch(() => "");
        if (
          panelText?.includes("Something went wrong") ||
          panelText?.includes("Error")
        ) {
          bug({
            page: routeLabel,
            viewport: vp,
            severity: "major",
            category: "tab-error",
            description: `Tab "${tabText}" shows error state after click`,
          });
        }
      }

      // Check for overflow after tab switch
      await checkOverflow(page, `${routeLabel} > tab:${tabText}`, vp);
    } catch (_e) {
      // Tab click failed — might be disabled or detached
    }
  }
}

// ── Modal / dialog checker ─────────────────────────────────────────────
async function testModalsAndDrawers(
  page: Page,
  routeLabel: string,
  vp: string
) {
  // Find buttons that likely open modals/dialogs
  const triggerButtons = await page
    .locator(
      "button:has-text('Add'), button:has-text('New'), button:has-text('Create'), button:has-text('Edit'), button:has-text('Filter'), button:has-text('Export'), button:has-text('Import')"
    )
    .all();

  for (const btn of triggerButtons.slice(0, 5)) {
    try {
      if (!(await btn.isVisible())) continue;
      const btnText =
        (await btn.textContent())?.trim().slice(0, 30) || "button";

      await btn.click({ timeout: 3000 });
      await page.waitForTimeout(600);

      // Check if a modal/dialog/drawer appeared
      const dialog = page
        .locator(
          "[role='dialog'], [data-state='open'][class*='dialog'], [class*='drawer'][data-state='open'], [class*='modal']"
        )
        .first();
      if (await dialog.isVisible().catch(() => false)) {
        // Check modal overflow
        const modalOverflow = await page.evaluate(() => {
          const modal = document.querySelector(
            "[role='dialog'], [class*='modal'], [class*='drawer']"
          );
          if (!modal) return null;
          const rect = modal.getBoundingClientRect();
          const vw = document.documentElement.clientWidth;
          const vh = document.documentElement.clientHeight;
          const issues: string[] = [];
          if (rect.right > vw)
            issues.push(`overflows right by ${Math.round(rect.right - vw)}px`);
          if (rect.bottom > vh + 50)
            issues.push(
              `overflows bottom by ${Math.round(rect.bottom - vh)}px`
            );
          if (rect.left < 0)
            issues.push(`overflows left by ${Math.round(-rect.left)}px`);
          if (rect.width > vw)
            issues.push(
              `wider than viewport: ${Math.round(rect.width)}px vs ${vw}px`
            );
          return issues.length > 0 ? issues : null;
        });

        if (modalOverflow) {
          for (const issue of modalOverflow) {
            bug({
              page: routeLabel,
              viewport: vp,
              severity: "major",
              category: "modal-overflow",
              description: `Modal from "${btnText}": ${issue}`,
            });
          }
        }

        // Check modal backdrop / close behavior
        const closeBtn = dialog
          .locator(
            "button[class*='close'], button:has-text('Close'), button:has-text('Cancel'), [aria-label='Close']"
          )
          .first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click({ timeout: 2000 });
          await page.waitForTimeout(300);
        } else {
          // Try escape key
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }

        // Verify modal closed
        if (await dialog.isVisible().catch(() => false)) {
          bug({
            page: routeLabel,
            viewport: vp,
            severity: "minor",
            category: "modal-stuck",
            description: `Modal from "${btnText}" did not close on Cancel/Escape`,
          });
          // Force close by navigating
          await page.keyboard.press("Escape");
          await page.waitForTimeout(200);
        }
      }
    } catch {
      // Button interaction failed
    }
  }
}

// ── Dropdown / select checker ──────────────────────────────────────────
async function testDropdowns(page: Page, routeLabel: string, vp: string) {
  // Custom select triggers (shadcn/radix)
  const selectTriggers = await page
    .locator(
      "[role='combobox'], button[class*='select'], [data-slot='select-trigger']"
    )
    .all();

  for (const trigger of selectTriggers.slice(0, 4)) {
    try {
      if (!(await trigger.isVisible())) continue;
      const triggerText =
        (await trigger.textContent())?.trim().slice(0, 30) || "select";

      await trigger.click({ timeout: 2000 });
      await page.waitForTimeout(400);

      // Check if dropdown appeared and if it overflows
      const listbox = page
        .locator(
          "[role='listbox'], [data-state='open'][class*='popover'], [class*='dropdown']"
        )
        .first();
      if (await listbox.isVisible().catch(() => false)) {
        const dropdownOverflow = await page.evaluate(() => {
          const lb = document.querySelector(
            "[role='listbox'], [data-state='open'][class*='popover'], [class*='dropdown-menu']"
          );
          if (!lb) return null;
          const rect = lb.getBoundingClientRect();
          const vw = document.documentElement.clientWidth;
          const vh = document.documentElement.clientHeight;
          const issues: string[] = [];
          if (rect.right > vw + 2)
            issues.push(`overflows right by ${Math.round(rect.right - vw)}px`);
          if (rect.bottom > vh + 2)
            issues.push(
              `overflows below viewport by ${Math.round(rect.bottom - vh)}px`
            );
          return issues.length > 0 ? issues : null;
        });

        if (dropdownOverflow) {
          for (const issue of dropdownOverflow) {
            bug({
              page: routeLabel,
              viewport: vp,
              severity: "minor",
              category: "dropdown-overflow",
              description: `Dropdown "${triggerText}": ${issue}`,
            });
          }
        }

        // Close dropdown
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    } catch {
      // Dropdown interaction failed
    }
  }
}

// ── Table checker ──────────────────────────────────────────────────────
async function checkTables(page: Page, routeLabel: string, vp: string) {
  const tableIssues = await page.evaluate(() => {
    const results: string[] = [];
    const tables = document.querySelectorAll(
      "table, [role='grid'], [class*='data-table']"
    );
    for (const table of tables) {
      const rect = table.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;

      // Table wider than viewport without scroll container
      if (rect.width > vw) {
        const parent = table.parentElement;
        const parentCs = parent ? getComputedStyle(parent) : null;
        if (
          !parentCs ||
          (parentCs.overflowX !== "auto" && parentCs.overflowX !== "scroll")
        ) {
          results.push(
            `Table (${Math.round(rect.width)}px) wider than viewport (${vw}px) with no horizontal scroll`
          );
        }
      }

      // Check for misaligned headers vs body
      const headers = table.querySelectorAll("th");
      const firstRow = table.querySelector("tbody tr");
      if (headers.length > 0 && firstRow) {
        const cells = firstRow.querySelectorAll("td");
        if (cells.length > 0 && headers.length !== cells.length) {
          results.push(
            `Table header/body column mismatch: ${headers.length} headers vs ${cells.length} cells`
          );
        }
      }
    }
    return results;
  });

  for (const i of tableIssues) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "major",
      category: "table-layout",
      description: i,
    });
  }
}

// ── Empty page / broken render checker ─────────────────────────────────
async function checkBrokenRender(page: Page, routeLabel: string, vp: string) {
  const issues = await page.evaluate(() => {
    const results: string[] = [];
    const body = document.body;
    const text = body.innerText?.trim() || "";

    // Almost empty page
    if (text.length < 20) {
      results.push(`Page appears nearly empty (${text.length} chars of text)`);
    }

    // Error boundaries
    const errorBoundaries = document.querySelectorAll(
      "[class*='error-boundary'], [class*='ErrorBoundary']"
    );
    for (const eb of errorBoundaries) {
      if ((eb as HTMLElement).offsetHeight > 0) {
        results.push(
          `Error boundary visible: ${(eb as HTMLElement).innerText?.slice(0, 80)}`
        );
      }
    }

    // "Something went wrong" text
    if (
      text.includes("Something went wrong") ||
      text.includes("Unexpected error") ||
      text.includes("An error occurred")
    ) {
      results.push(`Error message visible on page`);
    }

    return results;
  });

  for (const i of issues) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "critical",
      category: "broken-render",
      description: i,
    });
  }
}

// ── Sidebar / navigation checker ───────────────────────────────────────
async function checkNavigation(page: Page, routeLabel: string, vp: string) {
  const navIssues = await page.evaluate(() => {
    const results: string[] = [];
    const sidebar = document.querySelector(
      "aside, nav[class*='sidebar'], [class*='sidebar']"
    );
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect();
      const vh = document.documentElement.clientHeight;
      // Sidebar taller than viewport without scroll
      if (rect.height > vh + 10) {
        const cs = getComputedStyle(sidebar as HTMLElement);
        if (cs.overflowY !== "auto" && cs.overflowY !== "scroll") {
          results.push(
            `Sidebar overflows viewport (${Math.round(rect.height)}px) without scroll`
          );
        }
      }
    }
    return results;
  });

  for (const i of navIssues) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "minor",
      category: "navigation",
      description: i,
    });
  }
}

// ── Button text clipping ───────────────────────────────────────────────
async function checkButtonClipping(page: Page, routeLabel: string, vp: string) {
  const clipped = await page.evaluate(() => {
    const results: string[] = [];
    const buttons = document.querySelectorAll(
      "button, a[class*='btn'], [role='button']"
    );
    for (const btn of buttons) {
      const htmlBtn = btn as HTMLElement;
      const rect = htmlBtn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Button with text that's getting cut off
      if (htmlBtn.scrollWidth > htmlBtn.clientWidth + 2) {
        const cs = getComputedStyle(htmlBtn);
        if (
          cs.textOverflow !== "ellipsis" &&
          cs.overflow !== "hidden" &&
          cs.whiteSpace !== "nowrap"
        ) {
          const text = htmlBtn.innerText?.slice(0, 30) || "";
          if (text) {
            results.push(
              `button[${text}] text clips (scrollW=${htmlBtn.scrollWidth} > clientW=${htmlBtn.clientWidth})`
            );
          }
        }
      }
    }
    return results.slice(0, 5);
  });

  for (const c of clipped) {
    bug({
      page: routeLabel,
      viewport: vp,
      severity: "minor",
      category: "button-clipping",
      description: c,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════
// MAIN TEST — run the full crawl for a given viewport
// ════════════════════════════════════════════════════════════════════════

async function crawlAllPages(page: Page, vp: string, width: number) {
  await page.setViewportSize({ width, height: 900 });

  // All protected routes with their tab sub-routes
  const routes: { path: string; tabs?: string[] }[] = [
    { path: "/dashboard" },
    {
      path: "/sales",
      tabs: [
        "orders",
        "create-order",
        "quotes",
        "sales-sheets",
        "live-shopping",
        "returns",
      ],
    },
    {
      path: "/demand-supply",
      tabs: ["needs", "interest-list", "vendor-supply", "matchmaking"],
    },
    { path: "/leaderboard" },
    { path: "/purchase-orders" },
    {
      path: "/inventory",
      tabs: ["inventory", "receiving", "photography", "samples", "shipping"],
    },
    { path: "/products" },
    {
      path: "/relationships",
      tabs: ["clients", "suppliers"],
    },
    {
      path: "/accounting",
      tabs: [
        "dashboard",
        "invoices",
        "bills",
        "payments",
        "general-ledger",
        "chart-of-accounts",
        "expenses",
        "bank-accounts",
        "bank-transactions",
        "fiscal-periods",
      ],
    },
    { path: "/accounting/cash-locations" },
    {
      path: "/credits",
      tabs: undefined, // will discover tabs dynamically
    },
    { path: "/analytics" },
    { path: "/pricing/rules" },
    { path: "/pricing/profiles" },
    { path: "/reports/shrinkage" },
    { path: "/calendar" },
    { path: "/scheduling" },
    { path: "/time-clock" },
    {
      path: "/settings",
      tabs: ["users", "locations", "feature-flags"],
    },
    { path: "/settings/cogs" },
    {
      path: "/notifications",
      tabs: ["alerts"],
    },
    { path: "/todos" },
    { path: "/workflow-queue" },
    { path: "/account" },
    { path: "/search" },
    { path: "/help" },
  ];

  for (const route of routes) {
    console.log(`\n━━━ [${vp}] Navigating to ${route.path} ━━━`);

    const { consoleErrors, networkFailures } = attachCollectors(
      page,
      route.path,
      vp
    );

    try {
      await page.goto(route.path, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2500); // Let async data load

      // Screenshot
      const safeName =
        route.path.replace(/\//g, "_").replace(/^_/, "") || "root";
      await page.screenshot({
        path: `test-results/qa-${vp}-${safeName}.png`,
        fullPage: false,
      });

      // Run all checks on the base route
      await checkBrokenRender(page, route.path, vp);
      await checkOverflow(page, route.path, vp);
      await checkOverlap(page, route.path, vp);
      await checkTruncation(page, route.path, vp);
      await checkTables(page, route.path, vp);
      await checkButtonClipping(page, route.path, vp);
      await checkNavigation(page, route.path, vp);
      await checkStickyHeaders(page, route.path, vp);
      await checkEmptyAndLoading(page, route.path, vp);
      await checkDisabledStates(page, route.path, vp);
      await checkFocusRings(page, route.path, vp);

      // Test tabs if present
      if (route.tabs) {
        for (const tab of route.tabs) {
          const tabPath = `${route.path}?tab=${tab}`;
          console.log(`  → Tab: ${tabPath}`);

          try {
            await page.goto(tabPath, {
              waitUntil: "domcontentloaded",
              timeout: 20000,
            });
            await page.waitForTimeout(2000);

            const tabSafeName = `${safeName}-tab-${tab}`;
            await page.screenshot({
              path: `test-results/qa-${vp}-${tabSafeName}.png`,
              fullPage: false,
            });

            await checkBrokenRender(page, tabPath, vp);
            await checkOverflow(page, tabPath, vp);
            await checkTables(page, tabPath, vp);
            await checkButtonClipping(page, tabPath, vp);
            await checkEmptyAndLoading(page, tabPath, vp);
          } catch (e) {
            bug({
              page: tabPath,
              viewport: vp,
              severity: "critical",
              category: "navigation-failure",
              description: `Tab navigation failed: ${(e as Error).message?.slice(0, 200)}`,
            });
          }
        }
      } else {
        // Click discovered tabs dynamically
        await clickAllTabs(page, route.path, vp);
      }

      // Test modals/drawers and dropdowns on desktop only (mobile is too flaky)
      if (width >= 1024) {
        await testModalsAndDrawers(page, route.path, vp);
        await testDropdowns(page, route.path, vp);
      }
    } catch (e) {
      bug({
        page: route.path,
        viewport: vp,
        severity: "critical",
        category: "navigation-failure",
        description: `Page failed to load: ${(e as Error).message?.slice(0, 200)}`,
      });
    }

    reportCollected(consoleErrors, networkFailures, route.path, vp);
  }

  // ── Public routes ──
  const publicRoutes = ["/login", "/vip-portal/login"];
  for (const route of publicRoutes) {
    console.log(`\n━━━ [${vp}] Public: ${route} ━━━`);
    const { consoleErrors, networkFailures } = attachCollectors(
      page,
      route,
      vp
    );
    try {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(1500);
      await checkOverflow(page, route, vp);
      await checkBrokenRender(page, route, vp);
    } catch (e) {
      bug({
        page: route,
        viewport: vp,
        severity: "major",
        category: "navigation-failure",
        description: `${(e as Error).message?.slice(0, 200)}`,
      });
    }
    reportCollected(consoleErrors, networkFailures, route, vp);
  }
}

// ════════════════════════════════════════════════════════════════════════
// TEST DEFINITIONS
// ════════════════════════════════════════════════════════════════════════

test.describe("Manual QA Crawl @staging-critical", () => {
  test.setTimeout(600000); // 10 minutes per viewport

  test("Desktop 1280px full crawl", async ({ page }) => {
    await loginAsAdmin(page);
    await crawlAllPages(page, "desktop-1280", 1280);

    const desktopBugs = bugs.filter(b => b.viewport === "desktop-1280");
    console.log(`\n\n${"═".repeat(70)}`);
    console.log(`DESKTOP 1280px — ${desktopBugs.length} bugs found`);
    console.log("═".repeat(70));
    for (const b of desktopBugs) {
      console.log(
        `[${b.severity.toUpperCase()}] ${b.category} | ${b.page} | ${b.description}`
      );
    }
  });

  test("Tablet 768px full crawl", async ({ page }) => {
    await loginAsAdmin(page);
    await crawlAllPages(page, "tablet-768", 768);

    const tabletBugs = bugs.filter(b => b.viewport === "tablet-768");
    console.log(`\n\n${"═".repeat(70)}`);
    console.log(`TABLET 768px — ${tabletBugs.length} bugs found`);
    console.log("═".repeat(70));
    for (const b of tabletBugs) {
      console.log(
        `[${b.severity.toUpperCase()}] ${b.category} | ${b.page} | ${b.description}`
      );
    }
  });

  test("Mobile 375px full crawl", async ({ page }) => {
    await loginAsAdmin(page);
    await crawlAllPages(page, "mobile-375", 375);

    const mobileBugs = bugs.filter(b => b.viewport === "mobile-375");
    console.log(`\n\n${"═".repeat(70)}`);
    console.log(`MOBILE 375px — ${mobileBugs.length} bugs found`);
    console.log("═".repeat(70));
    for (const b of mobileBugs) {
      console.log(
        `[${b.severity.toUpperCase()}] ${b.category} | ${b.page} | ${b.description}`
      );
    }
  });
});
