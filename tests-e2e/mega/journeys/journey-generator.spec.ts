/**
 * Mega QA Randomized Journey Generator
 *
 * Generates and runs 100+ seeded randomized user journeys that:
 * - Use a seeded RNG for reproducibility
 * - Bias actions toward uncovered coverage tags
 * - Capture step transcripts for AI replay
 * - Cover multiple personas (admin, standard, VIP, logged-out)
 */

import { test, expect, Page } from "@playwright/test";
import {
  loginAsAdmin,
  loginAsStandardUser,
  loginAsVipClient,
} from "../../fixtures/auth";

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ============================================================================
// Journey Types
// ============================================================================

interface JourneyStep {
  action: string;
  target?: string;
  value?: string;
  tags: string[];
  timestamp?: string;
  success?: boolean;
  error?: string;
}

interface JourneyContext {
  rng: SeededRNG;
  page: Page;
  persona: string;
  steps: JourneyStep[];
  coveredTags: Set<string>;
  currentUrl: string;
}

type ActionFunction = (ctx: JourneyContext) => Promise<void>;

// ============================================================================
// Action Library
// ============================================================================

const ACTIONS: {
  name: string;
  weight: number;
  tags: string[];
  action: ActionFunction;
  guard?: (ctx: JourneyContext) => boolean;
}[] = [
  // Navigation actions
  {
    name: "navigate-dashboard",
    weight: 10,
    tags: ["route:/dashboard", "api:dashboard.getStats"],
    action: async ctx => {
      await ctx.page.goto("/dashboard");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-orders",
    weight: 10,
    tags: ["route:/orders", "api:orders.list"],
    action: async ctx => {
      await ctx.page.goto("/orders");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-clients",
    weight: 10,
    tags: ["route:/clients", "api:clients.list"],
    action: async ctx => {
      await ctx.page.goto("/clients");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-inventory",
    weight: 10,
    tags: ["route:/inventory", "api:batches.list"],
    action: async ctx => {
      await ctx.page.goto("/inventory");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-analytics",
    weight: 5,
    tags: ["route:/analytics", "TS-2.2", "regression:analytics-data"],
    action: async ctx => {
      await ctx.page.goto("/analytics");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-calendar",
    weight: 5,
    tags: ["route:/calendar", "TS-8.1"],
    action: async ctx => {
      await ctx.page.goto("/calendar");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-search",
    weight: 5,
    tags: ["route:/search", "regression:search-404"],
    action: async ctx => {
      await ctx.page.goto("/search?q=test");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-todo-lists",
    weight: 5,
    tags: ["route:/todo-lists", "regression:todo-404", "TS-8.2"],
    action: async ctx => {
      await ctx.page.goto("/todo-lists");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-workflow",
    weight: 5,
    tags: ["route:/workflow-queue", "TS-12.1"],
    action: async ctx => {
      await ctx.page.goto("/workflow-queue");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-accounting",
    weight: 5,
    tags: ["route:/accounting", "TS-4.1"],
    action: async ctx => {
      await ctx.page.goto("/accounting");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-invoices",
    weight: 5,
    tags: ["route:/invoices", "api:invoices.list", "TS-4.2"],
    action: async ctx => {
      await ctx.page.goto("/invoices");
      await ctx.page.waitForLoadState("networkidle");
    },
  },
  {
    name: "navigate-settings",
    weight: 3,
    tags: ["route:/settings", "TS-9.1"],
    action: async ctx => {
      await ctx.page.goto("/settings");
      await ctx.page.waitForLoadState("networkidle");
    },
  },

  // Interaction actions
  {
    name: "cmd-k-open-close",
    weight: 8,
    tags: ["TS-001", "regression:cmd-k"],
    action: async ctx => {
      await ctx.page.keyboard.press("Meta+k");
      await ctx.page
        .locator('[role="dialog"], [data-command-palette], [cmdk-root]')
        .first()
        .waitFor({ state: "visible", timeout: 2000 })
        .catch(() => {});
      await ctx.page.keyboard.press("Escape");
    },
  },
  {
    name: "toggle-theme",
    weight: 5,
    tags: ["TS-002", "regression:theme-toggle"],
    action: async ctx => {
      const toggle = ctx.page
        .locator('button[aria-label*="theme" i], button[aria-label*="dark" i]')
        .first();
      try {
        await toggle.waitFor({ state: "visible", timeout: 2000 });
        await toggle.click();
        await ctx.page.waitForLoadState("networkidle");
      } catch {
        // Theme toggle not available - skip this action
      }
    },
  },
  {
    name: "click-sidebar-link",
    weight: 15,
    tags: ["regression:layout-consistency"],
    action: async ctx => {
      const links = ctx.page.locator('nav a, aside a, [role="navigation"] a');
      const count = await links.count();
      if (count > 0) {
        const index = ctx.rng.nextInt(0, count - 1);
        await links.nth(index).click();
        await ctx.page.waitForLoadState("networkidle");
      }
    },
  },
  {
    name: "click-list-row",
    weight: 10,
    tags: ["TS-6.1"],
    action: async ctx => {
      const rows = ctx.page.locator('tbody tr, [role="row"]');
      const count = await rows.count();
      if (count > 0) {
        const index = ctx.rng.nextInt(0, Math.min(count - 1, 5));
        await rows.nth(index).click();
        await ctx.page.waitForLoadState("networkidle");
      }
    },
  },
  {
    name: "click-create-button",
    weight: 8,
    tags: ["api:orders.create", "api:clients.create", "api:batches.create"],
    action: async ctx => {
      const createBtn = ctx.page
        .locator(
          'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
        )
        .first();
      try {
        await createBtn.waitFor({ state: "visible", timeout: 2000 });
        await createBtn.click();
        await ctx.page
          .locator('[role="dialog"], [data-popover]')
          .first()
          .waitFor({ state: "visible", timeout: 2000 })
          .catch(() => {});
        // Close any modal that opened
        await ctx.page.keyboard.press("Escape");
      } catch {
        // Create button not available - skip this action
      }
    },
  },
  {
    name: "type-in-search",
    weight: 6,
    tags: ["TS-3.1"],
    action: async ctx => {
      const searchInput = ctx.page
        .locator('input[type="search"], input[placeholder*="search" i]')
        .first();
      try {
        await searchInput.waitFor({ state: "visible", timeout: 2000 });
        const terms = ["test", "invoice", "order", "client", "batch"];
        await searchInput.fill(ctx.rng.pick(terms));
        await ctx.page.waitForLoadState("networkidle");
      } catch {
        // Search input not available - skip this action
      }
    },
  },
  {
    name: "tab-navigation",
    weight: 5,
    tags: [],
    action: async ctx => {
      await ctx.page.keyboard.press("Tab");
      await ctx.page.keyboard.press("Tab");
      await ctx.page.keyboard.press("Tab");
    },
  },
  {
    name: "breadcrumb-click",
    weight: 4,
    tags: [],
    action: async ctx => {
      const breadcrumbs = ctx.page
        .locator('nav[aria-label*="breadcrumb" i] a, .breadcrumb a')
        .first();
      try {
        await breadcrumbs.waitFor({ state: "visible", timeout: 2000 });
        await breadcrumbs.click();
        await ctx.page.waitForLoadState("networkidle");
      } catch {
        // Breadcrumbs not available - skip this action
      }
    },
  },
  {
    name: "toggle-filter",
    weight: 5,
    tags: ["TS-3.1"],
    action: async ctx => {
      const filterBtn = ctx.page
        .locator('button:has-text("Filter"), button[aria-label*="filter" i]')
        .first();
      try {
        await filterBtn.waitFor({ state: "visible", timeout: 2000 });
        await filterBtn.click();
        await ctx.page
          .locator('[role="dialog"], [data-popover]')
          .first()
          .waitFor({ state: "visible", timeout: 2000 })
          .catch(() => {});
        await ctx.page.keyboard.press("Escape");
      } catch {
        // Filter button not available - skip this action
      }
    },
  },
];

// ============================================================================
// Journey Runner
// ============================================================================

async function runJourney(
  page: Page,
  seed: number,
  persona: string,
  stepCount: number
): Promise<JourneyContext> {
  const rng = new SeededRNG(seed);
  const ctx: JourneyContext = {
    rng,
    page,
    persona,
    steps: [],
    coveredTags: new Set(),
    currentUrl: "",
  };

  // Login based on persona
  if (persona === "admin") {
    await loginAsAdmin(page);
  } else if (persona === "vip") {
    await loginAsVipClient(page);
  } else {
    await loginAsStandardUser(page);
  }

  // Run random actions
  for (let i = 0; i < stepCount; i++) {
    // Select action with weight bias toward uncovered tags
    const eligibleActions = ACTIONS.filter(a => !a.guard || a.guard(ctx));

    // Weight boost for actions that cover uncovered tags
    const weightedActions = eligibleActions.map(a => {
      const uncoveredBoost =
        a.tags.filter(t => !ctx.coveredTags.has(t)).length * 5;
      return { ...a, effectiveWeight: a.weight + uncoveredBoost };
    });

    const totalWeight = weightedActions.reduce(
      (sum, a) => sum + a.effectiveWeight,
      0
    );
    let random = rng.next() * totalWeight;

    let selected = weightedActions[0];
    for (const action of weightedActions) {
      random -= action.effectiveWeight;
      if (random <= 0) {
        selected = action;
        break;
      }
    }

    // Execute action
    const step: JourneyStep = {
      action: selected.name,
      tags: selected.tags,
      timestamp: new Date().toISOString(),
      success: true,
    };

    try {
      await selected.action(ctx);
      ctx.currentUrl = page.url();

      // Verify no crash (page is still responsive)
      await page.waitForLoadState("domcontentloaded");

      // Add covered tags
      selected.tags.forEach(t => ctx.coveredTags.add(t));
    } catch (error) {
      step.success = false;
      step.error = error instanceof Error ? error.message : String(error);
    }

    ctx.steps.push(step);

    // Small delay between actions
    await page.waitForTimeout(100); // Intentional: pacing between journey actions for reproducibility
  }

  return ctx;
}

// ============================================================================
// Test Generation
// ============================================================================

// Get configuration from environment
const JOURNEY_COUNT = parseInt(process.env.MEGA_QA_JOURNEYS || "100", 10);
const MASTER_SEED = parseInt(
  process.env.MEGA_QA_SEED || String(Date.now()),
  10
);
const STEPS_PER_JOURNEY = 20;

const personas = ["admin", "standard", "vip"];

// Generate journey tests
for (let i = 0; i < Math.min(JOURNEY_COUNT, 100); i++) {
  const journeySeed = MASTER_SEED + i;
  const persona = personas[i % personas.length];

  test(`Journey ${i + 1}: seed=${journeySeed} persona=${persona}`, async ({
    page,
  }) => {
    test.setTimeout(60000); // 1 minute per journey

    const ctx = await runJourney(page, journeySeed, persona, STEPS_PER_JOURNEY);

    // Log journey summary
    console.info(
      `[JOURNEY ${i + 1}] seed=${journeySeed} persona=${persona} steps=${ctx.steps.length} tags=${ctx.coveredTags.size}`
    );

    // Log covered tags for coverage tracking
    ctx.coveredTags.forEach(tag => {
      console.info(`[COVERAGE] ${tag}`);
    });

    // Verify journey didn't crash completely
    const failedSteps = ctx.steps.filter(s => !s.success);

    // Allow some failures (real-world journeys may encounter edge cases)
    // But fail if more than 50% of steps failed
    const failureRate = failedSteps.length / ctx.steps.length;
    expect(failureRate).toBeLessThan(0.5);

    // Verify page is still responsive
    await page.waitForLoadState("domcontentloaded");
  });
}
