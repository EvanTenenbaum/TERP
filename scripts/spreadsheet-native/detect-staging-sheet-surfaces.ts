import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext } from "@playwright/test";
import { QA_PASSWORD } from "../../tests-e2e/fixtures/auth";
import { getEnvOrDefault, loadCodexEnv } from "./qaEnv";

loadCodexEnv();

type PersonaKey = "salesManager" | "inventory";

interface PersonaConfig {
  email: string;
  password: string;
}

interface SurfaceCheckDefinition {
  id: string;
  persona: PersonaKey;
  requestedUrl: string;
  pilotMarkers: string[];
  classicMarkers: string[];
}

type DetectedSurface =
  | "sheet-native-pilot"
  | "classic-oracle"
  | "unauthenticated"
  | "unknown";

interface SurfaceCheckResult {
  id: string;
  persona: PersonaKey;
  requestedUrl: string;
  finalUrl: string;
  detectedSurface: DetectedSurface;
  matchedMarkers: string[];
  bodySnippet: string;
  screenshotPath: string;
  timestamp: string;
}

const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://terp-staging-yicld.ondigitalocean.app";

const outputDir = path.resolve(
  process.cwd(),
  "output/playwright/staging-oracle"
);

const personas: Record<PersonaKey, PersonaConfig> = {
  salesManager: {
    email: getEnvOrDefault(
      "E2E_SALES_MANAGER_USERNAME",
      "qa.salesmanager@terp.test"
    ),
    password: getEnvOrDefault(
      "E2E_SALES_MANAGER_PASSWORD",
      getEnvOrDefault("E2E_PASSWORD", QA_PASSWORD)
    ),
  },
  inventory: {
    email: getEnvOrDefault("E2E_INVENTORY_USERNAME", "qa.inventory@terp.test"),
    password: getEnvOrDefault(
      "E2E_INVENTORY_PASSWORD",
      getEnvOrDefault("E2E_PASSWORD", QA_PASSWORD)
    ),
  },
};

const dateStamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
}).format(new Date());

const surfaceChecks: SurfaceCheckDefinition[] = [
  {
    id: "sales-orders-sheet-pilot",
    persona: "salesManager",
    requestedUrl: `${baseUrl}/sales?tab=orders&surface=sheet-native`,
    pilotMarkers: [
      "Pilot: queue + document + handoffs",
      "Workflow target: focused order",
      "Primary actions stay on-sheet.",
      "Orders Queue",
    ],
    classicMarkers: [
      "Manage sales and drafts",
      "Saved",
      "Drafts:",
      "New Sales Order",
    ],
  },
  {
    id: "inventory-sheet-pilot",
    persona: "inventory",
    requestedUrl: `${baseUrl}/operations?tab=inventory&surface=sheet-native`,
    pilotMarkers: [
      "Pilot: browse + two direct mutations",
      "Inventory pilot active",
      "Inventory Sheet",
      "Load More Rows",
    ],
    classicMarkers: [
      "Manage batches and stock levels",
      "Table",
      "Gallery",
      "Export CSV",
    ],
  },
];

function detectSurface(
  bodyText: string,
  definition: SurfaceCheckDefinition
): Pick<SurfaceCheckResult, "detectedSurface" | "matchedMarkers"> {
  const pilotMatches = definition.pilotMarkers.filter(marker =>
    bodyText.includes(marker)
  );
  if (pilotMatches.length >= 2) {
    return {
      detectedSurface: "sheet-native-pilot",
      matchedMarkers: pilotMatches,
    };
  }

  const classicMatches = definition.classicMarkers.filter(marker =>
    bodyText.includes(marker)
  );
  if (classicMatches.length >= 2) {
    return {
      detectedSurface: "classic-oracle",
      matchedMarkers: classicMatches,
    };
  }

  if (bodyText.includes("Checking authentication")) {
    return {
      detectedSurface: "unauthenticated",
      matchedMarkers: ["Checking authentication"],
    };
  }

  return {
    detectedSurface: "unknown",
    matchedMarkers: [],
  };
}

async function login(context: BrowserContext, persona: PersonaConfig) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    data: {
      username: persona.email,
      password: persona.password,
    },
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok()) {
    throw new Error(
      `Login failed for ${persona.email}: ${response.status()} ${await response.text()}`
    );
  }
}

async function runSurfaceCheck(
  browserContext: BrowserContext,
  definition: SurfaceCheckDefinition
): Promise<SurfaceCheckResult> {
  const page = await browserContext.newPage();
  await page.goto(definition.requestedUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  const screenshotPath = path.join(
    outputDir,
    `${definition.id}-${dateStamp}.png`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const bodyText = await page.locator("body").innerText();
  const detection = detectSurface(bodyText, definition);
  const finalUrl = page.url();

  await page.close();

  return {
    id: definition.id,
    persona: definition.persona,
    requestedUrl: definition.requestedUrl,
    finalUrl,
    detectedSurface: detection.detectedSurface,
    matchedMarkers: detection.matchedMarkers,
    bodySnippet: bodyText.slice(0, 1000),
    screenshotPath,
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results: SurfaceCheckResult[] = [];

  try {
    for (const definition of surfaceChecks) {
      const context = await browser.newContext();
      try {
        await login(context, personas[definition.persona]);
        const result = await runSurfaceCheck(context, definition);
        results.push(result);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(
    outputDir,
    `sheet-native-surface-detection-${dateStamp}.json`
  );
  writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.info(JSON.stringify({ reportPath, results }, null, 2));

  const ambiguous = results.filter(
    result =>
      result.detectedSurface === "unknown" ||
      result.detectedSurface === "unauthenticated"
  );
  if (ambiguous.length > 0) {
    throw new Error(
      `Ambiguous staging surface detection: ${ambiguous
        .map(result => `${result.id}:${result.detectedSurface}`)
        .join(", ")}`
    );
  }

  const livePilot = results.filter(
    result => result.detectedSurface === "sheet-native-pilot"
  );
  if (livePilot.length > 0) {
    console.warn(
      `One or more staging routes are now serving the sheet-native pilot: ${livePilot
        .map(result => result.id)
        .join(", ")}`
    );
  }
}

await main();
